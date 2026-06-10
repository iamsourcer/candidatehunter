import { buildUserMessage, buildAshbyUserMessage, buildSynthesisMessage, callAI, parseAnalysisResponse, extractExperienceFunc, extractLinkedInFromUrl, getActiveSystemPrompt } from './shared.js';

const inProgress = new Map();

const ASHBY_CANDIDATE_RE = /app\.ashbyhq\.com\/.*\/candidates\/[^/?#]+/;

// ── Clear badge when navigating away ─────────────────────────────────────────
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    chrome.action.setBadgeText({ tabId, text: '' });
    chrome.storage.local.remove([`analysis_${tabId}`, `analyzing_${tabId}`, `ashby_li_${tabId}`]);
    inProgress.delete(tabId);
  }
});

// ── Shared: load settings + validate API key ──────────────────────────────────
async function loadSettings() {
  return chrome.storage.local.get([
    'provider', 'anthropicKey', 'apiKey',
    'openaiBaseUrl', 'openaiKey', 'openaiModel',
    'geminiKey', 'geminiModel', 'autoAnalyze',
  ]);
}

function getActiveKey(settings) {
  return settings.provider === 'gemini'        ? settings.geminiKey  :
         settings.provider === 'openai-compat' ? settings.openaiKey  :
         (settings.anthropicKey || settings.apiKey);
}

// ── Shared: check cache → settings → run AI → update badge ───────────────────
async function runAnalysis(tabId, cleanUrl, extractAndBuild, postProcess = null) {
  chrome.action.setBadgeText({ tabId, text: '...' });
  chrome.action.setBadgeBackgroundColor({ tabId, color: '#888888' });

  // URL cache (permanent)
  const urlKey = `urlcache_${cleanUrl}`;
  const cached = (await chrome.storage.local.get(urlKey))[urlKey];
  if (cached) {
    await chrome.storage.local.set({ [`analysis_${tabId}`]: cached });
    const cachedColor =
      cached.verdict === 'ADVANCE'        ? '#057642' :
      cached.verdict === 'HOLD'           ? '#c07800' :
      cached.verdict === 'LONG SHOT'      ? '#d4500a' :
      '#c0392b';
    chrome.action.setBadgeText({ tabId, text: `${cached.matchPct}%` });
    chrome.action.setBadgeBackgroundColor({ tabId, color: cachedColor });
    return;
  }

  const settings = await loadSettings();
  if (settings.autoAnalyze === false) {
    chrome.action.setBadgeText({ tabId, text: '' });
    return;
  }
  const activeKey = getActiveKey(settings);
  if (!activeKey) {
    chrome.action.setBadgeText({ tabId, text: '' });
    return;
  }

  await chrome.storage.local.set({ [`analyzing_${tabId}`]: true });

  try {
    const extractResult      = await extractAndBuild(tabId, cleanUrl);
    const { userMessage, extra } = extractResult;
    let   { candidateName, profileData }  = extractResult;
    const activeSystemPrompt = await getActiveSystemPrompt();
    const responseText       = await callAI(settings, activeSystemPrompt, userMessage, { includeHighlights: true });
    let result = parseAnalysisResponse(responseText);

    if (postProcess) {
      const override = await postProcess(result, extractResult, settings, activeSystemPrompt);
      if (override) {
        result        = override.result ?? result;
        candidateName = override.candidateName ?? candidateName;
      }
    }

    const { matchPct, verdict, summary, fullAnalysis, highlights, suggestTerms } = result;
    const tabEntry = { matchPct, verdict, summary, candidateName, highlights, suggestTerms };
    const urlEntry = { ...tabEntry, fullAnalysis, timestamp: Date.now() };

    const toStore = {
      [`analysis_${tabId}`]: tabEntry,
      [urlKey]:              urlEntry,
      lastAnalysis:          fullAnalysis,
      lastCandidateName:     candidateName,
      lastVerdict:           verdict,
      lastMatch:             matchPct,
      lastSuggestTerms:      suggestTerms || [],
      lastHighlights:        highlights   || null,
      lastProfile:           profileData  || null,
    };
    if (extra) Object.assign(toStore, extra);
    await chrome.storage.local.set(toStore);

    const badgeColor =
      verdict === 'ADVANCE'        ? '#057642' :
      verdict === 'HOLD'           ? '#c07800' :
      verdict === 'LONG SHOT'      ? '#d4500a' :
      /* DO NOT ADVANCE / ARCHIVE */ '#c0392b';
    chrome.action.setBadgeText({ tabId, text: `${matchPct}%` });
    chrome.action.setBadgeBackgroundColor({ tabId, color: badgeColor });

  } catch (err) {
    console.error('[bg] analysis error:', err);
    chrome.action.setBadgeText({ tabId, text: 'ERR' });
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#888888' });
  } finally {
    await chrome.storage.local.remove(`analyzing_${tabId}`);
  }
}

// ── LinkedIn auto-analyze ─────────────────────────────────────────────────────
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (!tab.url) return;

  const cleanUrl = tab.url.split('?')[0];
  if (!/linkedin\.com\/in\/[^/]+\/?$/.test(cleanUrl)) return;
  if (inProgress.get(tabId)) return;
  inProgress.set(tabId, true);

  try {
    await runAnalysis(tabId, cleanUrl, async (tabId, cleanUrl) => {
      await waitForProfileDOM(tabId);

      const expUrl = cleanUrl.replace(/\/$/, '') + '/details/experience/';
      const [profileData, fullExp] = await Promise.all([
        chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] })
          .then(([r]) => {
            if (r.result?.error) throw new Error(r.result.error);
            return r.result;
          }),
        extractFromTab(expUrl, extractExperienceFunc),
      ]);

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

      return {
        userMessage:   buildUserMessage(profileData),
        candidateName: profileData.profile?.name || 'Candidate',
        profileData,
        extra:         null,
      };
    });
  } finally {
    inProgress.delete(tabId);
  }
});

// ── Ashby auto-analyze ────────────────────────────────────────────────────────
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (!tab.url) return;

  const cleanUrl = tab.url.split('?')[0];
  if (!ASHBY_CANDIDATE_RE.test(cleanUrl)) return;
  if (inProgress.get(tabId)) return;
  inProgress.set(tabId, true);

  try {
    await runAnalysis(
      tabId, cleanUrl,
      async (tabId) => {
        await waitForAshbyDOM(tabId);
        const [res] = await chrome.scripting.executeScript({ target: { tabId }, files: ['ashby_content.js'] });
        const ashbyData = res?.result || {};
        // Kick off LinkedIn extraction immediately — runs in parallel with Ashby AI call
        const _liPromise = ashbyData.linkedInUrl
          ? extractLinkedInFromUrl(ashbyData.linkedInUrl)
          : Promise.resolve(null);
        return {
          userMessage:      buildAshbyUserMessage(ashbyData),
          candidateName:    ashbyData.name || 'Candidate',
          profileData:      ashbyData,
          extra:            ashbyData.linkedInUrl ? { [`ashby_li_${tabId}`]: ashbyData.linkedInUrl } : null,
          ashbyLinkedInUrl: ashbyData.linkedInUrl || null,
          _liPromise,
        };
      },
      async (ashbyResult, extractResult, settings, systemPrompt) => {
        const { ashbyLinkedInUrl, candidateName, _liPromise } = extractResult;
        if (!ashbyLinkedInUrl) return null;
        try {
          const liData = await _liPromise;
          if (!liData) return null;
          const liResponse = await callAI(settings, systemPrompt, buildUserMessage(liData), { includeHighlights: true });
          const liResult   = parseAnalysisResponse(liResponse);
          let result;
          if (liResult.verdict !== ashbyResult.verdict || ashbyResult.matchPct < 70) {
            const synthResponse = await callAI(settings, systemPrompt,
              buildSynthesisMessage(ashbyResult, liResult));
            const synthResult = parseAnalysisResponse(synthResponse);
            result = { ...synthResult, highlights: synthResult.highlights || liResult.highlights || null };
          } else {
            result = liResult;
          }
          return { result, candidateName: liData.profile?.name || candidateName };
        } catch (_) { return null; }
      }
    );
  } finally {
    inProgress.delete(tabId);
  }
});

// ── Cleanup on tab close ──────────────────────────────────────────────────────
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.remove([`analysis_${tabId}`, `analyzing_${tabId}`, `ashby_li_${tabId}`]);
});

// ── DOM polling helpers ───────────────────────────────────────────────────────
async function waitForProfileDOM(tabId, maxMs = 8000) {
  const step = 600;
  for (let elapsed = 0; elapsed < maxMs; elapsed += step) {
    await new Promise(r => setTimeout(r, step));
    try {
      const [r] = await chrome.scripting.executeScript({
        target: { tabId },
        func:   () => !!document.querySelector('h1.text-heading-xlarge, .pv-top-card'),
      });
      if (r?.result) return;
    } catch (_) {}
  }
}

async function waitForAshbyDOM(tabId, maxMs = 8000) {
  const step = 600;
  for (let elapsed = 0; elapsed < maxMs; elapsed += step) {
    await new Promise(r => setTimeout(r, step));
    try {
      const [r] = await chrome.scripting.executeScript({
        target: { tabId },
        func:   () => !!document.querySelector('h1') && document.readyState === 'complete',
      });
      if (r?.result) return;
    } catch (_) {}
  }
}

// ── Background tab extractor (LinkedIn experience tab) ───────────────────────
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
        pollAndExtract(newTab.id, extractFn, resolve);
      }

      chrome.tabs.onUpdated.addListener(onUpdated);
    });
  });
}

async function pollAndExtract(tabId, extractFn, resolve) {
  const step = 600;
  const maxMs = 6000;
  for (let elapsed = 0; elapsed < maxMs; elapsed += step) {
    await new Promise(r => setTimeout(r, step));
    try {
      const [r] = await chrome.scripting.executeScript({
        target: { tabId },
        func:   () => !!document.querySelector('main'),
      });
      if (r?.result) break;
    } catch (_) {}
  }
  chrome.scripting.executeScript(
    { target: { tabId }, func: extractFn },
    (results) => {
      chrome.tabs.remove(tabId, () => {});
      resolve(chrome.runtime.lastError ? null : results?.[0]?.result ?? null);
    }
  );
}
