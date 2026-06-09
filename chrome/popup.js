import {
  buildUserMessage, buildAshbyUserMessage, buildSynthesisMessage, callAI,
  parseAnalysisResponse, extractExperienceFunc, extractLinkedInFromUrl,
  getProjects, createProject, addCandidateToProject,
  getActiveSystemPrompt, ashbyFetch,
} from './shared.js';

// ── Status helpers ────────────────────────────────────────────────────────────
function showError(msg) {
  const area = document.getElementById('status-area');
  area.textContent = '⚠ ' + msg;
  area.className = 'visible error';
}

function clearStatus() {
  const area = document.getElementById('status-area');
  area.textContent = '';
  area.className = '';
}

// ── Main action button state ──────────────────────────────────────────────────
let autoAnalyzeOn   = true;
let currentPageType = 'other'; // 'linkedin' | 'ashby' | 'other'

function setMainAction(state) {
  const btn          = document.getElementById('analyze-btn');
  const reanalyzeRow = document.getElementById('reanalyze-row');
  btn.style.setProperty('--pct', '0%');

  if (state === 'run') {
    btn.textContent            = 'Run Analysis';
    btn.disabled               = false;
    btn.onclick                = () => analyzeCandidate();
    // Only hide on LinkedIn when auto-analyze is on — Ashby always shows the button
    btn.style.display          = (autoAnalyzeOn && currentPageType === 'linkedin') ? 'none' : '';
    reanalyzeRow.style.display = 'none';
  } else if (state === 'analyzing') {
    btn.textContent            = 'Analyzing…';
    btn.disabled               = true;
    btn.style.display          = '';
    reanalyzeRow.style.display = 'none';
  } else if (state === 'add') {
    btn.textContent            = '+ Add to Project';
    btn.disabled               = false;
    btn.onclick                = () => showProjectPanel();
    btn.style.display          = '';
    reanalyzeRow.style.display = autoAnalyzeOn ? 'none' : 'block';
  }
}

// ── Settings + nav buttons ────────────────────────────────────────────────────
document.getElementById('settings-btn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

document.getElementById('projects-btn').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('projects.html') });
});

document.getElementById('ashby-btn')?.addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('ashby.html') });
});

// ── Analyze Candidate ─────────────────────────────────────────────────────────
document.getElementById('full-analysis-btn').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('analysis.html') });
});

document.getElementById('reanalyze-link').addEventListener('click', (e) => {
  e.preventDefault();
  analyzeCandidate();
});

async function analyzeCandidate() {
  const resultArea = document.getElementById('result-area');

  clearStatus();
  resultArea.style.display = 'none';
  setMainAction('analyzing');

  const settings = await chrome.storage.local.get([
    'provider', 'anthropicKey', 'apiKey',
    'openaiBaseUrl', 'openaiKey', 'openaiModel',
    'geminiKey', 'geminiModel',
  ]);
  const activeKey =
    settings.provider === 'gemini'        ? settings.geminiKey  :
    settings.provider === 'openai-compat' ? settings.openaiKey  :
    (settings.anthropicKey || settings.apiKey);
  if (!activeKey) {
    chrome.runtime.openOptionsPage();
    showError('Set your API key in Settings first.');
    setMainAction('run');
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const cleanUrl = tab.url.split('?')[0];
  const isLI    = tab.url.includes('linkedin.com/in/');
  const isAshby = ASHBY_CANDIDATE_RE.test(cleanUrl);

  if (!isLI && !isAshby) {
    showError('Open a LinkedIn or Ashby candidate page first.');
    setMainAction('run');
    return;
  }

  try {
    const btn = document.getElementById('analyze-btn');
    btn.textContent = 'Extracting…';
    btn.style.setProperty('--pct', '15%');

    let userMessage, candidateName, extraStorage = {};
  let ashbyLinkedInUrl = null;

    if (isLI) {
      // ── LinkedIn extraction ──────────────────────────────────────────────
      const [mainRes] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js'],
      });
      const profileData = mainRes.result;
      if (profileData?.error) throw new Error(profileData.error);

      btn.textContent = 'Loading experience…';
      btn.style.setProperty('--pct', '35%');
      const baseUrl = cleanUrl.replace(/\/$/, '');
      const fullExp = await extractFromTab(baseUrl + '/details/experience/', extractExperienceFunc);
      if (fullExp?.length > 0) profileData.experience = fullExp;

      if (!profileData.skills?.length) {
        const seen = new Set();
        for (const exp of (profileData.experience || [])) {
          for (const line of (exp.description || '').split('\n')) {
            const m = line.match(/^(.+?)\s+and\s+\+\d+\s+skills?\b/i);
            if (m) m[1].split(/,\s*/).map(s => s.trim())
              .filter(s => s.length > 1 && s.length < 80).forEach(s => seen.add(s));
          }
        }
        if (seen.size) profileData.skills = [...seen];
      }
      delete profileData._debug;

      userMessage   = buildUserMessage(profileData);
      candidateName = profileData.profile?.name || 'Candidate';

    } else {
      // ── Ashby extraction: selected text + DOM metadata in parallel ────────
      const [selRes, domRes] = await Promise.all([
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func:   () => window.getSelection().toString().trim(),
        }),
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files:  ['ashby_content.js'],
        }),
      ]);

      const selectedText = selRes?.[0]?.result  || '';
      const domData      = domRes?.[0]?.result   || {};

      // Selected text wins as profile content; DOM provides name + LinkedIn URL
      const ashbyData = {
        ...domData,
        profileBlocks: selectedText || domData.profileBlocks || '',
      };

      userMessage      = buildAshbyUserMessage(ashbyData);
      candidateName    = ashbyData.name || 'Candidate';
      ashbyLinkedInUrl = ashbyData.linkedInUrl || null;
      if (ashbyLinkedInUrl) {
        extraStorage[`ashby_li_${tab.id}`] = ashbyLinkedInUrl;
      }
    }

    btn.textContent = 'Analyzing with AI…';
    btn.style.setProperty('--pct', '60%');
    const activeSystemPrompt = await getActiveSystemPrompt();
    const responseText       = await callAI(settings, activeSystemPrompt, userMessage);

    let { matchPct, verdict, summary, fullAnalysis } = parseAnalysisResponse(responseText);

    // ── Cross-platform synthesis (Ashby + LinkedIn) ───────────────────────────
    if (isAshby && ashbyLinkedInUrl) {
      try {
        btn.textContent = 'Loading LinkedIn profile…';
        btn.style.setProperty('--pct', '72%');
        const liData = await extractLinkedInFromUrl(ashbyLinkedInUrl);
        if (liData) {
          btn.textContent = 'Cross-referencing sources…';
          btn.style.setProperty('--pct', '85%');
          const liResponse = await callAI(settings, activeSystemPrompt, buildUserMessage(liData));
          const liResult   = parseAnalysisResponse(liResponse);

          if (liResult.verdict !== verdict || matchPct < 70) {
            const synthResponse = await callAI(settings, activeSystemPrompt,
              buildSynthesisMessage({ matchPct, verdict, summary }, liResult));
            ({ matchPct, verdict, summary, fullAnalysis } = parseAnalysisResponse(synthResponse));
          } else {
            ({ matchPct, verdict, summary, fullAnalysis } = liResult);
          }
          if (liData.profile?.name) candidateName = liData.profile.name;
        }
      } catch (_) { /* si falla la síntesis, usa el resultado Ashby */ }
    }

    await chrome.storage.local.set({
      [`analysis_${tab.id}`]:   { matchPct, verdict, summary, candidateName },
      [`urlcache_${cleanUrl}`]: { matchPct, verdict, summary, candidateName, fullAnalysis, timestamp: Date.now() },
      lastAnalysis:             fullAnalysis,
      lastCandidateName:        candidateName,
      lastVerdict:              verdict,
      lastMatch:                matchPct,
      ...extraStorage,
    });

    showAnalysisResult(matchPct, verdict, summary);
    if (isAshby) await showLinkedInLink(tab.id);

  } catch (err) {
    console.error(err);
    showError(err.message);
    setMainAction('run');
  }
}

function showAnalysisResult(matchPct, verdict, summary) {
  const verdictLine = document.getElementById('verdict-line');
  const isAdvance   = verdict === 'ADVANCE';
  verdictLine.textContent = `${isAdvance ? '🟢' : '🔴'} ${matchPct}% — ${verdict}`;
  verdictLine.className   = isAdvance ? 'green' : 'red';
  document.getElementById('summary-text').textContent = summary;
  document.getElementById('result-area').style.display = 'block';
  setMainAction('add');
  chrome.storage.local.get('ashbyKey', ({ ashbyKey }) => {
    const pushBtn = document.getElementById('push-ashby-btn');
    if (pushBtn) pushBtn.style.display = ashbyKey ? 'block' : 'none';
  });
}

// ── Project panel ─────────────────────────────────────────────────────────────
async function showProjectPanel() {
  const panel = document.getElementById('project-panel');
  panel.classList.toggle('visible');
  if (!panel.classList.contains('visible')) return;

  // Pre-fill candidate name from cached analysis
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const cleanUrl = (tab?.url || '').split('?')[0];
  const byTab = (await chrome.storage.local.get(`analysis_${tab?.id}`))[`analysis_${tab?.id}`];
  const byUrl = (await chrome.storage.local.get(`urlcache_${cleanUrl}`))[`urlcache_${cleanUrl}`];
  const detectedName = (byTab || byUrl)?.candidateName || '';
  const nameInput = document.getElementById('candidate-name-input');
  if (nameInput) nameInput.value = detectedName;

  const projects = await getProjects();
  const sel = document.getElementById('project-select');
  sel.innerHTML = projects.map(p =>
    `<option value="${p.id}">${p.name} (${p.candidates.length})</option>`
  ).join('') + '<option value="__new__">＋ New project…</option>';
  if (projects.length === 0) sel.value = '__new__';
  document.getElementById('new-project-input').style.display =
    sel.value === '__new__' ? 'block' : 'none';
}

document.getElementById('project-select').addEventListener('change', (e) => {
  document.getElementById('new-project-input').style.display =
    e.target.value === '__new__' ? 'block' : 'none';
});

document.getElementById('confirm-add-btn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const cleanUrl = tab.url.split('?')[0];

  let projectId = document.getElementById('project-select').value;

  if (projectId === '__new__') {
    const name = document.getElementById('new-project-input').value.trim();
    if (!name) { document.getElementById('new-project-input').focus(); return; }
    const proj = await createProject(name);
    projectId  = proj.id;
  }

  const byTab = (await chrome.storage.local.get(`analysis_${tab.id}`))[`analysis_${tab.id}`];
  const byUrl = (await chrome.storage.local.get(`urlcache_${cleanUrl}`))[`urlcache_${cleanUrl}`];
  const data  = byTab || byUrl;
  if (!data) return;

  // Use user-edited name if provided, otherwise fall back to auto-detected name
  const editedName = document.getElementById('candidate-name-input')?.value?.trim();
  const finalName  = editedName || data.candidateName || 'Candidate';

  await addCandidateToProject(projectId, {
    name:         finalName,
    url:          cleanUrl,
    matchPct:     data.matchPct,
    verdict:      data.verdict,
    summary:      data.summary,
    fullAnalysis: byUrl?.fullAnalysis || data.fullAnalysis || '',
  });

  document.getElementById('project-panel').classList.remove('visible');
  const btn  = document.getElementById('analyze-btn');
  const prev = btn.textContent;
  btn.textContent = '✓ Added';
  btn.disabled    = true;
  setTimeout(() => { btn.textContent = prev; btn.disabled = false; }, 2000);
});

document.getElementById('cancel-add-btn').addEventListener('click', () => {
  document.getElementById('project-panel').classList.remove('visible');
});

// ── Ashby push panel ──────────────────────────────────────────────────────────
document.getElementById('push-ashby-btn')?.addEventListener('click', async () => {
  const panel = document.getElementById('ashby-push-panel');
  panel.classList.toggle('visible');
  if (!panel.classList.contains('visible')) return;

  const { ashbyKey } = await chrome.storage.local.get('ashbyKey');
  if (!ashbyKey) return;

  const sel = document.getElementById('ashby-job-select');
  sel.innerHTML = '<option value="">Loading jobs…</option>';
  try {
    const jobs = await ashbyFetch(ashbyKey, '/job.list', { status: 'Open' });
    sel.innerHTML = (jobs || []).map(j =>
      `<option value="${j.id}">${j.title}</option>`
    ).join('') || '<option value="">No open jobs found</option>';
  } catch (err) {
    sel.innerHTML = `<option value="">Error: ${err.message}</option>`;
  }
});

document.getElementById('cancel-ashby-btn')?.addEventListener('click', () => {
  document.getElementById('ashby-push-panel').classList.remove('visible');
});

document.getElementById('confirm-ashby-btn')?.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const cleanUrl = tab.url.split('?')[0];
  const { ashbyKey } = await chrome.storage.local.get('ashbyKey');
  if (!ashbyKey) return;

  const byTab = (await chrome.storage.local.get(`analysis_${tab.id}`))[`analysis_${tab.id}`];
  const byUrl = (await chrome.storage.local.get(`urlcache_${cleanUrl}`))[`urlcache_${cleanUrl}`];
  const data  = byTab || byUrl;
  if (!data) return;

  const jobId = document.getElementById('ashby-job-select').value;
  const btn   = document.getElementById('confirm-ashby-btn');
  btn.textContent = 'Pushing…';
  btn.disabled    = true;

  try {
    // Create or find candidate
    const createRes = await ashbyFetch(ashbyKey, '/candidate.create', {
      name:        data.candidateName || 'Candidate',
      linkedInUrl: cleanUrl,
      ...(jobId ? { applicationForJobId: jobId } : {}),
    });
    const candidateId = createRes?.candidate?.id || createRes?.id;

    if (candidateId) {
      const note = `**CandidateHunter** — ${data.verdict} (${data.matchPct}%)\n\n${data.summary}` +
        (byUrl?.fullAnalysis ? `\n\n---\n\n${byUrl.fullAnalysis}` : '');
      await ashbyFetch(ashbyKey, '/candidateNote.create', {
        candidateId,
        noteType: 'Public',
        note,
      });
    }

    document.getElementById('ashby-push-panel').classList.remove('visible');
    btn.textContent = '✓ Pushed';
    setTimeout(() => { btn.textContent = 'Push'; btn.disabled = false; }, 2000);
  } catch (err) {
    showError('Ashby: ' + err.message);
    btn.textContent = 'Push';
    btn.disabled    = false;
  }
});

// ── Background tab extraction ─────────────────────────────────────────────────
function extractFromTab(url, extractFn) {
  return new Promise((resolve) => {
    chrome.tabs.create({ url, active: false }, (newTab) => {
      if (chrome.runtime.lastError) { resolve(null); return; }

      const giveUp = setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(onUpdated);
        chrome.tabs.remove(newTab.id, () => {});
        resolve(null);
      }, 30_000);

      function onUpdated(tabId, info) {
        if (tabId !== newTab.id || info.status !== 'complete') return;
        chrome.tabs.onUpdated.removeListener(onUpdated);
        clearTimeout(giveUp);
        setTimeout(() => {
          chrome.scripting.executeScript(
            { target: { tabId: newTab.id }, func: extractFn },
            (results) => {
              chrome.tabs.remove(newTab.id, () => {});
              resolve(chrome.runtime.lastError ? null : results?.[0]?.result ?? null);
            }
          );
        }, 3000);
      }

      chrome.tabs.onUpdated.addListener(onUpdated);
    });
  });
}

const ASHBY_CANDIDATE_RE = /app\.ashbyhq\.com\/.*\/candidates\/[^/?#]+/;

// ── Init ──────────────────────────────────────────────────────────────────────
(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const { autoAnalyze, roleConfigs, ashbyKey } = await chrome.storage.local.get([
    'autoAnalyze', 'roleConfigs', 'ashbyKey',
  ]);
  autoAnalyzeOn = autoAnalyze !== false;

  // Show active role name
  const activeRole = (roleConfigs || []).find(r => r.isActive);
  const roleEl = document.getElementById('active-role-display');
  if (activeRole && roleEl) roleEl.textContent = activeRole.name;

  // Show Ashby button only if configured
  const ashbyBtn = document.getElementById('ashby-btn');
  if (ashbyBtn) ashbyBtn.style.display = ashbyKey ? '' : 'none';

  const url      = tab?.url || '';
  const cleanUrl = url.split('?')[0];
  const isLI     = url.includes('linkedin.com/in/');
  const isAshby  = ASHBY_CANDIDATE_RE.test(cleanUrl);

  if (!isLI && !isAshby) return;

  // Track page type for setMainAction visibility logic
  currentPageType = isLI ? 'linkedin' : 'ashby';

  setMainAction('run');

  // 1. tabId cache
  const byTab = (await chrome.storage.local.get(`analysis_${tab.id}`))[`analysis_${tab.id}`];
  if (byTab) {
    showAnalysisResult(byTab.matchPct, byTab.verdict, byTab.summary);
    if (isAshby) await showLinkedInLink(tab.id);
    return;
  }

  // 2. URL cache (permanent — no TTL)
  const byUrl = (await chrome.storage.local.get(`urlcache_${cleanUrl}`))[`urlcache_${cleanUrl}`];
  if (byUrl) {
    showAnalysisResult(byUrl.matchPct, byUrl.verdict, byUrl.summary);
    if (isAshby) await showLinkedInLink(tab.id);
    return;
  }

  // 3. In-flight: show spinner
  const inFlight = (await chrome.storage.local.get(`analyzing_${tab.id}`))[`analyzing_${tab.id}`];
  if (inFlight) { showAnalyzingSpinner(tab.id); return; }

  // 4. On Ashby with no result: show usage hint
  if (isAshby) {
    const hint = document.getElementById('ashby-hint');
    if (hint) hint.style.display = 'block';
  }
})();

async function showLinkedInLink(tabId) {
  const key    = `ashby_li_${tabId}`;
  const stored = (await chrome.storage.local.get(key))[key];
  if (!stored) return;
  const btn = document.getElementById('open-linkedin-btn');
  if (!btn) return;
  btn.href         = stored;
  btn.style.display = 'block';
}

function showAnalyzingSpinner(tabId) {
  const area = document.getElementById('status-area');
  area.textContent = '⏳ Analyzing in background...';
  area.className = 'visible';
  setMainAction('analyzing');
  chrome.storage.onChanged.addListener(function listener(changes) {
    if (changes[`analysis_${tabId}`]?.newValue) {
      chrome.storage.onChanged.removeListener(listener);
      area.textContent = '';
      area.className = '';
      const c = changes[`analysis_${tabId}`].newValue;
      showAnalysisResult(c.matchPct, c.verdict, c.summary);
    }
  });
}
