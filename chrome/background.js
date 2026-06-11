import { buildUserMessage, buildAshbyUserMessage, buildSynthesisMessage, callAI, callAnthropic, callOpenAICompat, callGemini, parseAnalysisResponse, extractExperienceFunc, extractLinkedInFromUrl, getActiveSystemPrompt, buildLiveSuggestionMessage, buildPostCallDebriefMessage, buildWriteupMessage, WRITEUP_SYSTEM_PROMPT } from './shared.js';

const inProgress = new Map();

// ── Live session state ────────────────────────────────────────────────────────
let liveSessionTabId = null;
let offscreenCreated = false;
let liveTranscriptBuffer = { recruiter: '', candidate: '' };
let liveSuggestionPending = false;

async function ensureOffscreen() {
  if (offscreenCreated) return;
  const offscreenUrl = chrome.runtime.getURL('offscreen.html');
  const existing = await chrome.offscreen.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [offscreenUrl],
  }).catch(() => []);
  if (!existing.length) {
    await chrome.offscreen.createDocument({
      url: offscreenUrl,
      reasons: ['USER_MEDIA'],
      justification: 'Capture tab audio for live interview transcription',
    }).catch(() => {});
  }
  offscreenCreated = true;
}

async function startLiveSession(tabId, streamId, deepgramKey) {
  liveSessionTabId = tabId;
  liveTranscriptBuffer = { recruiter: '', candidate: '' };
  liveSuggestionPending = false;
  // Persist session state so the transcript survives service worker restarts
  const { activeLiveCandidate } = await chrome.storage.local.get('activeLiveCandidate');
  await chrome.storage.session.set({
    liveLog: [],
    liveCtx: activeLiveCandidate || null,
    liveTabId: tabId,
    liveTopics: { pending: activeLiveCandidate?.pendingTopics || [], covered: [] },
  });
  if (streamId && deepgramKey) {
    await ensureOffscreen();
    chrome.runtime.sendMessage({ type: 'START_TAB_CAPTURE', streamId, deepgramKey }).catch(() => {});
  }
}

async function stopLiveSession() {
  const tabId = liveSessionTabId;
  liveSessionTabId = null;
  offscreenCreated = false;
  liveTranscriptBuffer = { recruiter: '', candidate: '' };
  liveSuggestionPending = false;
  chrome.runtime.sendMessage({ type: 'STOP_TAB_CAPTURE' }).catch(() => {});

  const { liveLog = [], liveCtx, liveTabId, liveTopics } = await chrome.storage.session.get([
    'liveLog', 'liveCtx', 'liveTabId', 'liveTopics',
  ]);
  await chrome.storage.session.remove(['liveLog', 'liveCtx', 'liveTabId', 'liveTopics']);
  generatePostCallSummary(liveLog, liveCtx, tabId || liveTabId, liveTopics).catch(e =>
    console.error('[bg] post-call summary error:', e));
}

async function appendLiveTranscript(speaker, text) {
  liveTranscriptBuffer[speaker] = (liveTranscriptBuffer[speaker] + ' ' + text).trim();
  const { liveLog = [] } = await chrome.storage.session.get('liveLog');
  liveLog.push({ s: speaker, text, t: Date.now() });
  await chrome.storage.session.set({ liveLog });
}

// ── Post-call pipeline: debrief + final verdict + write-up ───────────────────
const MIN_SUMMARY_WORDS = 80;

async function generatePostCallSummary(liveLog, candidateCtx, tabId, liveTopics) {
  if (!candidateCtx || !liveLog.length) return;
  const transcript = liveLog
    .map(e => (e.s === 'candidate' ? 'CANDIDATE: ' : 'RECRUITER: ') + e.text)
    .join('\n');
  const wordCount = transcript.split(/\s+/).length;
  const notify = (status) => {
    if (tabId) chrome.tabs.sendMessage(tabId, { type: 'LIVE_STATUS', status }).catch(() => {});
  };
  if (wordCount < MIN_SUMMARY_WORDS) { notify('summary_skipped'); return; }

  notify('summary_generating');
  try {
    const settings = await loadSettings();
    if (!getActiveKey(settings)) { notify('summary_skipped'); return; }

    const url = candidateCtx.url;
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

    // Raw transcript is saved first — even if the AI calls below fail
    await updateCandidateRecords(url, (rec) => {
      rec.phoneScreenTranscripts = rec.phoneScreenTranscripts || [];
      rec.phoneScreenTranscripts.push({ date: new Date().toISOString(), text: transcript });
    });

    const originalAnalysis = await getStoredFullAnalysis(url);

    // Call 1 — debrief + updated verdict (reuses the standard response format)
    const debriefResponse = await callAI(settings, '', buildPostCallDebriefMessage(
      transcript, candidateCtx, liveTopics?.covered, liveTopics?.pending, originalAnalysis));
    const debrief = parseAnalysisResponse(debriefResponse);
    // parseAnalysisResponse falls back to defaults on malformed JSON — only
    // trust the verdict if the response really contained one
    const verdictIsReal = /"match_pct"\s*:/.test(debriefResponse);
    const debriefSection = `\n\n---\n\n## 📞 Phone Screen Debrief — ${dateStr}\n\n` +
      (verdictIsReal ? `**Post-call verdict: ${debrief.verdict} (${debrief.matchPct}%)** — ${debrief.summary}\n\n` : '') +
      (debrief.fullAnalysis || '');

    // Call 2 — candidate write-up dossier (hidden system prompt)
    let writeupSection = '';
    try {
      const writeup = await callAI(settings, WRITEUP_SYSTEM_PROMPT, buildWriteupMessage(transcript, candidateCtx));
      writeupSection = `\n\n---\n\n## 📋 Candidate Write-Up — ${dateStr}\n\n${writeup.trim()}`;
    } catch (err) {
      console.error('[bg] write-up error:', err);
    }

    await updateCandidateRecords(url, (rec) => {
      rec.fullAnalysis = (rec.fullAnalysis || '') + debriefSection + writeupSection;
      if (verdictIsReal) {
        rec.matchPct = debrief.matchPct;
        rec.verdict  = debrief.verdict;
        rec.summary  = debrief.summary;
        rec.postCall = true;
      }
    });
    notify('summary_done');
  } catch (err) {
    console.error('[bg] post-call summary error:', err);
    notify('summary_error');
  }
}

async function getStoredFullAnalysis(url) {
  if (!url) return '';
  const cached = (await chrome.storage.local.get(`urlcache_${url}`))[`urlcache_${url}`];
  if (cached?.fullAnalysis) return cached.fullAnalysis;
  const { projects = [] } = await chrome.storage.local.get('projects');
  for (const proj of projects) {
    const cand = (proj.candidates || []).find(c => c.url === url);
    if (cand?.fullAnalysis) return cand.fullAnalysis;
  }
  return '';
}

// Applies a mutation to every record of the candidate: project entries + URL cache
async function updateCandidateRecords(url, mutate) {
  if (!url) return;
  const { projects = [] } = await chrome.storage.local.get('projects');
  let touched = false;
  for (const proj of projects) {
    for (const cand of (proj.candidates || [])) {
      if (cand.url === url) { mutate(cand); touched = true; }
    }
  }
  if (touched) await chrome.storage.local.set({ projects });

  const urlKey = `urlcache_${url}`;
  const cached = (await chrome.storage.local.get(urlKey))[urlKey];
  if (cached) {
    mutate(cached);
    await chrome.storage.local.set({ [urlKey]: cached });
  }
}

async function triggerLiveSuggestion(pendingTopics, candidateCtx, tabId) {
  if (liveSuggestionPending) return;
  liveSuggestionPending = true;
  try {
    const settings = await loadSettings();
    const activeKey = getActiveKey(settings);
    if (!activeKey) return;

    const parts = [];
    if (liveTranscriptBuffer.recruiter) parts.push('RECRUITER: ' + liveTranscriptBuffer.recruiter);
    if (liveTranscriptBuffer.candidate) parts.push('CANDIDATE: ' + liveTranscriptBuffer.candidate);
    const combined = parts.join('\n\n');
    liveTranscriptBuffer = { recruiter: '', candidate: '' };

    const message = buildLiveSuggestionMessage(combined, pendingTopics, candidateCtx);
    let response;
    if (settings.provider === 'gemini') {
      response = await callGemini(settings.geminiKey, settings.geminiModel || 'gemini-1.5-flash', '', message);
    } else if (settings.provider === 'openai-compat') {
      response = await callOpenAICompat(settings.openaiBaseUrl, settings.openaiKey, settings.openaiModel || 'deepseek-chat', '', message);
    } else {
      response = await callAnthropic(settings.anthropicKey || settings.apiKey, '', message, 'claude-haiku-4-5-20251001');
    }

    const jsonMatch = response.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) return;
    const result = JSON.parse(jsonMatch[0]);

    const tid = tabId || liveSessionTabId;
    if (tid) {
      chrome.tabs.sendMessage(tid, {
        type: 'LIVE_SUGGESTION',
        suggested_question: result.suggested_question || '',
        mark_covered: result.mark_covered || [],
        urgency: result.urgency || 'next',
      }).catch(() => {});
    }
  } catch (err) {
    console.error('[bg] live suggestion error:', err);
  } finally {
    liveSuggestionPending = false;
  }
}

// ── Live session message handler ──────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'LIVE_TRANSCRIPT_CHUNK') {
    appendLiveTranscript('recruiter', msg.transcript);
    chrome.storage.session.set({
      liveTopics: { pending: msg.pendingTopics || [], covered: msg.coveredTopics || [] },
    }).catch(() => {});
    triggerLiveSuggestion(msg.pendingTopics, msg.candidateCtx, sender.tab?.id);
    return false;
  }
  if (msg.type === 'CANDIDATE_TRANSCRIPT') {
    appendLiveTranscript('candidate', msg.transcript);
    return false;
  }
  if (msg.type === 'START_LIVE_SESSION') {
    startLiveSession(msg.tabId, msg.streamId, msg.deepgramKey)
      .then(() => sendResponse({ ok: true }))
      .catch(e => sendResponse({ error: e.message }));
    return true;
  }
  if (msg.type === 'STOP_LIVE_SESSION') {
    stopLiveSession();
    sendResponse({ ok: true });
    return false;
  }
  if (msg.type === 'CAPTURE_ERROR') {
    if (liveSessionTabId) {
      chrome.tabs.sendMessage(liveSessionTabId, {
        type: 'LIVE_STATUS',
        status: 'candidate_error',
        message: msg.error,
      }).catch(() => {});
    }
    return false;
  }
  if (msg.type === 'ANALYZE_NOW') {
    const { tabId, cleanUrl, userMessage, candidateName, profileData, ashbyLinkedInUrl, isAshby } = msg;
    runAnalysisFromExtracted(tabId, cleanUrl, userMessage, candidateName, profileData, ashbyLinkedInUrl, isAshby)
      .then(() => sendResponse({ ok: true }))
      .catch(e => sendResponse({ error: e.message }));
    return true;
  }
});

const ASHBY_CANDIDATE_RE = /app\.ashbyhq\.com\/.*\/candidates\/[^/?#]+/;

// ── Manual analysis delegated from popup ─────────────────────────────────────
async function runAnalysisFromExtracted(tabId, cleanUrl, userMessage, candidateName, profileData, ashbyLinkedInUrl, isAshby) {
  chrome.action.setBadgeText({ tabId, text: '...' });
  chrome.action.setBadgeBackgroundColor({ tabId, color: '#888888' });
  await chrome.storage.local.set({ [`analyzing_${tabId}`]: true });

  try {
    const settings = await loadSettings();
    if (!getActiveKey(settings)) { chrome.action.setBadgeText({ tabId, text: '' }); return; }

    const urlKey = `urlcache_${cleanUrl}`;
    const activeSystemPrompt = await getActiveSystemPrompt();
    const responseText = await callAI(settings, activeSystemPrompt, userMessage, { includeHighlights: true });
    let result = parseAnalysisResponse(responseText);

    if (isAshby && ashbyLinkedInUrl) {
      try {
        const liData = await extractLinkedInFromUrl(ashbyLinkedInUrl);
        if (liData) {
          const liResponse = await callAI(settings, activeSystemPrompt, buildUserMessage(liData), { includeHighlights: true });
          const liResult = parseAnalysisResponse(liResponse);
          if (liResult.verdict !== result.verdict || result.matchPct < 70) {
            const synthResponse = await callAI(settings, activeSystemPrompt, buildSynthesisMessage(result, liResult));
            const synthResult = parseAnalysisResponse(synthResponse);
            result = { ...synthResult, highlights: synthResult.highlights || liResult.highlights || null };
          } else {
            result = liResult;
          }
          if (liData.profile?.name) candidateName = liData.profile.name;
        }
      } catch (_) {}
    }

    const { matchPct, verdict, summary, fullAnalysis, highlights, suggestTerms } = result;
    const tabEntry = { matchPct, verdict, summary, candidateName, highlights, suggestTerms };
    const toStore = {
      [`analysis_${tabId}`]: tabEntry,
      [urlKey]: { ...tabEntry, fullAnalysis, timestamp: Date.now() },
      lastAnalysis: fullAnalysis, lastCandidateName: candidateName,
      lastVerdict: verdict, lastMatch: matchPct,
      lastSuggestTerms: suggestTerms || [], lastHighlights: highlights || null,
      lastProfile: profileData || null,
    };
    if (ashbyLinkedInUrl) toStore[`ashby_li_${tabId}`] = ashbyLinkedInUrl;
    await chrome.storage.local.set(toStore);

    const badgeColor = verdict === 'ADVANCE' ? '#057642' : verdict === 'HOLD' ? '#c07800' : verdict === 'LONG SHOT' ? '#d4500a' : '#c0392b';
    chrome.action.setBadgeText({ tabId, text: `${matchPct}%` });
    chrome.action.setBadgeBackgroundColor({ tabId, color: badgeColor });
  } catch (err) {
    console.error('[bg] manual analysis error:', err);
    chrome.action.setBadgeText({ tabId, text: 'ERR' });
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#888888' });
    throw err;
  } finally {
    await chrome.storage.local.remove(`analyzing_${tabId}`);
  }
}

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
