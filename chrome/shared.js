// Shared ES module — imported by popup.js and background.js

export function buildAshbyUserMessage(data) {
  const lines = [
    `Name: ${data.name || 'Unknown'}`,
    data.subtitle    ? `Current role: ${data.subtitle}`  : null,
    data.jobTitle    ? `Applied for: ${data.jobTitle}`   : null,
    data.stage       ? `Pipeline stage: ${data.stage}`   : null,
    data.linkedInUrl ? `LinkedIn: ${data.linkedInUrl}`   : null,
    '',
    'Profile information extracted from ATS:',
    data.profileBlocks || '(no additional profile data visible on page)',
  ].filter(l => l !== null).join('\n');

  return [
    'Evaluate this candidate profile (sourced from Ashby ATS — data may be limited).',
    '',
    '<profile>',
    lines,
    '</profile>',
    '',
    'IMPORTANT: For each company mentioned, use your training knowledge to assess:',
    '- Whether they sell custom engineering/services or packaged/SaaS products',
    '- Typical deal size and sales motion',
    'Factor this context into your evaluation even if profile description is sparse.',
    '',
    'Structure your response in exactly two parts separated by ---FULL---:',
    '',
    'PART 1 — Quick summary (one JSON object on a single line, no other text before it):',
    '{"match_pct": <integer 0-100>, "verdict": "ADVANCE" or "HOLD" or "LONG SHOT" or "DO NOT ADVANCE", "summary": "2-3 sentences.", "highlights": {"positive": ["exact phrase 1 from profile", "exact phrase 2"], "negative": ["red flag phrase"]}, "suggest_terms": ["missing skill 1", "missing skill 2"]}',
    'highlights.positive: 3-6 exact phrases from the profile supporting the candidacy. highlights.negative: 1-4 exact red-flag phrases found in the profile. suggest_terms: 3-5 keywords/skills that SHOULD appear in a strong candidate but are ABSENT from this profile.',
    '',
    '---FULL---',
    '',
    'PART 2 — Complete evaluation per OUTPUT 1 (Match Assessment with full scoring breakdown), OUTPUT 2 (Phone Screen Script — only if verdict is ADVANCE), and OUTPUT 3 (Red Flag Summary).',
  ].join('\n');
}

export function buildUserMessage(profile) {
  const p     = profile.profile || {};
  const lines = [
    `Name: ${p.name     || 'Unknown'}`,
    `Title: ${p.title   || 'Not specified'}`,
    `Location: ${p.location || 'Not specified'}`,
    '',
    'About:',
    profile.about || 'Not specified',
    '',
    'Experience:',
  ];

  for (const exp of (profile.experience || [])) {
    const type = exp.employment_type ? ` (${exp.employment_type})` : '';
    lines.push(`- ${exp.title} at ${exp.company}${type} | ${exp.period}`);
    if (exp.location) lines.push(`  Location: ${exp.location}`);
    if (exp.description) {
      const descLines = exp.description.split('\n').slice(0, 8);
      for (const dl of descLines) if (dl.trim()) lines.push(`  ${dl.trim()}`);
    } else {
      lines.push(`  (no description available — use your training knowledge of ${exp.company} to assess fit)`);
    }
    lines.push('');
  }

  lines.push('Education:');
  for (const edu of (profile.education || [])) {
    const deg = edu.degree ? ` — ${edu.degree}` : '';
    const per = edu.period ? ` (${edu.period})`  : '';
    lines.push(`- ${edu.school}${deg}${per}`);
  }

  lines.push('');
  lines.push('Certifications:');
  for (const c of (profile.certifications || []))
    lines.push(`- ${c.name} by ${c.issuer} (${c.date})`);

  lines.push('');
  if ((profile.skills || []).length)
    lines.push(`Skills: ${profile.skills.join(', ')}`);

  const profileText = lines.join('\n');

  return [
    'Evaluate this candidate profile.',
    '',
    '<profile>',
    profileText,
    '</profile>',
    '',
    'IMPORTANT: For each company listed in the experience section, use your training knowledge to assess:',
    '- Whether they sell custom engineering/services or packaged/SaaS products',
    '- Typical deal size and sales complexity (transactional vs. enterprise, SOW-based vs. subscription)',
    '- Type of clients they serve (SMB, mid-market, enterprise)',
    '- Whether the sales motion involves bespoke scoping, long cycles, and technical buyers',
    'Factor this company context into your evaluation — a candidate may have strong signals even if their profile description is sparse.',
    '',
    'Structure your response in exactly two parts separated by the delimiter ---FULL---:',
    '',
    'PART 1 — Quick summary (one JSON object on a single line, no other text before it):',
    '{"match_pct": <integer 0-100>, "verdict": "ADVANCE" or "HOLD" or "LONG SHOT" or "DO NOT ADVANCE", "summary": "2-3 sentences.", "highlights": {"positive": ["exact phrase 1 from profile", "exact phrase 2"], "negative": ["red flag phrase"]}, "suggest_terms": ["missing skill 1", "missing skill 2"]}',
    'highlights.positive: 3-6 exact phrases from the profile supporting the candidacy. highlights.negative: 1-4 exact red-flag phrases found in the profile. suggest_terms: 3-5 keywords/skills that SHOULD appear in a strong candidate but are ABSENT from this profile.',
    '',
    '---FULL---',
    '',
    'PART 2 — Complete evaluation per OUTPUT 1 (Match Assessment with full scoring breakdown), OUTPUT 2 (Phone Screen Script — only if verdict is ADVANCE), and OUTPUT 3 (Red Flag Summary).',
  ].join('\n');
}

export async function callAI(settings, systemPrompt, userMessage, opts = {}) {
  const effectivePrompt = systemPrompt;
  switch (settings.provider) {
    case 'gemini':
      return callGemini(
        settings.geminiKey,
        settings.geminiModel || 'gemini-1.5-flash',
        effectivePrompt,
        userMessage,
      );
    case 'openai-compat':
      return callOpenAICompat(
        settings.openaiBaseUrl || 'https://api.deepseek.com',
        settings.openaiKey,
        settings.openaiModel  || 'deepseek-chat',
        effectivePrompt,
        userMessage,
      );
    default: // 'anthropic'
      return callAnthropic(
        settings.anthropicKey || settings.apiKey || '',
        effectivePrompt,
        userMessage,
        settings.anthropicModel || 'claude-sonnet-4-6',
      );
  }
}

export async function callAnthropic(key, systemPrompt, userMessage, model = 'claude-sonnet-4-6') {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key':                                 key,
      'anthropic-version':                         '2023-06-01',
      'content-type':                              'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens:  4096,
      temperature: 0,
      system:      systemPrompt,
      messages:    [{ role: 'user', content: userMessage }],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Anthropic API error ${res.status}`);
  }
  return (await res.json()).content?.[0]?.text || '';
}

export async function callOpenAICompat(baseUrl, key, model, systemPrompt, userMessage) {
  const url = baseUrl.replace(/\/$/, '') + '/v1/chat/completions';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens:  4096,
      temperature: 0,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage  },
      ],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${res.status}`);
  }
  return (await res.json()).choices?.[0]?.message?.content || '';
}

export async function callGemini(key, model, systemPrompt, userMessage) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents:           [{ parts: [{ text: userMessage }] }],
      generationConfig:   { maxOutputTokens: 4096, temperature: 0 },
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini API error ${res.status}`);
  }
  return (await res.json()).candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export function parseAnalysisResponse(text) {
  const delimIdx   = text.indexOf('---FULL---');
  const part1      = (delimIdx >= 0 ? text.slice(0, delimIdx) : text).trim();
  let fullAnalysis = delimIdx >= 0 ? text.slice(delimIdx + 10).trim() : text.trim();

  console.log('[CH] RAW RESPONSE (first 400 chars):', text.slice(0, 400));
  console.log('[CH] PART1:', part1.slice(0, 300));
  console.log('[CH] delimIdx:', delimIdx);

  const VALID_VERDICTS = ['ADVANCE', 'HOLD', 'LONG SHOT', 'DO NOT ADVANCE', 'ARCHIVE'];
  let matchPct = 50, verdict = 'DO NOT ADVANCE', summary = 'Analysis complete.', highlights = null, suggestTerms = null;

  try {
    const start = part1.indexOf('{');
    let jsonStr = null;
    if (start >= 0) {
      let depth = 0, end = -1;
      for (let i = start; i < part1.length; i++) {
        if (part1[i] === '{') depth++;
        else if (part1[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
      }
      if (end > start) jsonStr = part1.slice(start, end + 1);
    }
    console.log('[CH] jsonStr found:', !!jsonStr, jsonStr?.slice(0, 200));
    if (jsonStr) {
      const parsed = JSON.parse(jsonStr);
      if (typeof parsed.match_pct === 'number')
        matchPct = Math.min(100, Math.max(0, Math.round(parsed.match_pct)));
      if (VALID_VERDICTS.includes(parsed.verdict))
        verdict = parsed.verdict;
      if (typeof parsed.summary === 'string' && parsed.summary.trim())
        summary = parsed.summary.trim();
      if (parsed.highlights && typeof parsed.highlights === 'object')
        highlights = {
          positive: Array.isArray(parsed.highlights.positive) ? parsed.highlights.positive : [],
          negative: Array.isArray(parsed.highlights.negative) ? parsed.highlights.negative : [],
        };
      if (Array.isArray(parsed.suggest_terms))
        suggestTerms = parsed.suggest_terms.map(t => String(t).trim()).filter(Boolean);
      // Strip the JSON block from fullAnalysis (happens when model skips ---FULL--- delimiter)
      const jsonInFull = fullAnalysis.indexOf(jsonStr);
      if (jsonInFull >= 0)
        fullAnalysis = (fullAnalysis.slice(0, jsonInFull) + fullAnalysis.slice(jsonInFull + jsonStr.length)).trim();
      // Strip any orphan label line like "JSON highlights:" left behind
      fullAnalysis = fullAnalysis.replace(/^[^\n]*highlights?[^\n]*\n?/im, '').trim();
    }
  } catch (e) { console.log('[CH] parse error:', e); }

  console.log('[CH] RESULT:', { matchPct, verdict, highlights, suggestTerms: suggestTerms?.length });
  return { matchPct, verdict, summary, fullAnalysis, highlights, suggestTerms };
}

export async function getActiveSystemPrompt() {
  const { roleConfigs } = await chrome.storage.local.get(['roleConfigs']);
  const active = (roleConfigs || []).find(r => r.isActive);
  if (!active) return '';
  let prompt = active.systemPrompt || '';
  if (prompt.includes('{{')) {
    prompt = prompt
      .replace(/\{\{COMPANY_NAME\}\}/g, active.companyName || '')
      .replace(/\{\{COMPANY_INFO\}\}/g, active.companyContext || '')
      .replace(/\{\{JOB_DESCRIPTION\}\}/g, active.jd || '');
  }
  // Safety net: roles saved before the RESPONSE FORMAT section was added to the template
  if (prompt && !prompt.includes('---FULL---')) {
    prompt += '\n\n## RESPONSE FORMAT — MANDATORY\n' +
      'Start your response with a single JSON object on one line (before any other text):\n' +
      '{"match_pct": <integer 0-100>, "verdict": "ADVANCE" or "HOLD" or "LONG SHOT" or "DO NOT ADVANCE", ' +
      '"summary": "2-3 sentences.", "highlights": {"positive": ["exact phrase from profile"], "negative": ["red flag phrase"]}, ' +
      '"suggest_terms": ["missing skill"]}\n' +
      'Then on its own line output the literal text: ---FULL---\n' +
      'Then provide OUTPUT 1 (Match Assessment), OUTPUT 2 (Phone Screen if ADVANCE), OUTPUT 3 (Red Flag Summary).\n' +
      'Do NOT output any text before the JSON line.';
  }
  return prompt;
}

export async function ashbyFetch(apiKey, endpoint, body = {}) {
  const res = await fetch(`https://api.ashbyhq.com${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${btoa(apiKey + ':')}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Ashby API error ${res.status}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.errors?.[0] || 'Ashby error');
  return data.results;
}

export async function getProjects() {
  const { projects = [] } = await chrome.storage.local.get('projects');
  return projects;
}

export async function createProject(name) {
  const projects = await getProjects();
  const project = {
    id:         String(Date.now()),
    name,
    createdAt:  new Date().toISOString(),
    candidates: [],
  };
  projects.unshift(project);
  await chrome.storage.local.set({ projects });
  return project;
}

export async function addCandidateToProject(projectId, candidate) {
  const projects = await getProjects();
  const proj = projects.find(p => p.id === projectId);
  if (!proj) return;
  proj.candidates = proj.candidates.filter(c => c.url !== candidate.url);
  proj.candidates.unshift({ ...candidate, addedAt: new Date().toISOString() });
  await chrome.storage.local.set({ projects });
}

export function buildSynthesisMessage(ashbyResult, linkedinResult) {
  return [
    'You have two independent analyses of the same candidate sourced from different platforms.',
    '',
    'ANALYSIS A — Ashby ATS (data may be limited or sparse):',
    `Match: ${ashbyResult.matchPct}% | Verdict: ${ashbyResult.verdict}`,
    `Summary: ${ashbyResult.summary}`,
    '',
    'ANALYSIS B — LinkedIn profile (full structured data, higher reliability):',
    `Match: ${linkedinResult.matchPct}% | Verdict: ${linkedinResult.verdict}`,
    `Summary: ${linkedinResult.summary}`,
    '',
    'Reconcile these into a single final verdict. Weight Analysis B (LinkedIn) more heavily — it contains richer and more reliable profile data.',
    'If they agree, confirm with added confidence. If they conflict, side with the analysis supported by stronger evidence and explain why.',
    '',
    'Structure your response in exactly two parts separated by ---FULL---:',
    '',
    'PART 1 — Final verdict (one JSON object on a single line):',
    '{"match_pct": <integer 0-100>, "verdict": "ADVANCE" or "HOLD" or "LONG SHOT" or "DO NOT ADVANCE", "summary": "2-3 sentences.", "highlights": {"positive": ["exact phrase from profile"], "negative": ["red flag phrase"]}, "suggest_terms": ["missing skill"]}',
    '',
    '---FULL---',
    '',
    'PART 2 — One paragraph reconciling how you weighted the two sources, then the complete evaluation per OUTPUT 1 (Match Assessment), OUTPUT 2 (Phone Screen Script — only if ADVANCE), and OUTPUT 3 (Red Flag Summary).',
  ].join('\n');
}

export function buildLiveSuggestionMessage(transcript, pendingTopics, candidateCtx) {
  return [
    'You are a live interview coaching assistant. The recruiter is on a phone screen right now.',
    `Candidate: ${candidateCtx.name}`,
    `Pre-call verdict: ${candidateCtx.verdict} (${candidateCtx.matchPct}%)`,
    `Red flags to probe: ${(candidateCtx.highlights?.negative || []).join(', ') || 'none identified'}`,
    '',
    'Topics still to cover (priority order):',
    (pendingTopics || []).map((t, i) => `${i + 1}. ${t}`).join('\n'),
    '',
    'Recent conversation (RECRUITER = you, CANDIDATE = them):',
    `"${transcript}"`,
    '',
    'Return ONE JSON object (no other text, no markdown):',
    '{"suggested_question": "exact natural question to ask next", "mark_covered": ["topic string that was just addressed, if any"], "urgency": "now"}',
    'suggested_question must be a specific, natural-sounding question that probes the top pending topic or a red flag just revealed in the transcript.',
    'mark_covered: include the exact topic string only if it was clearly discussed in the transcript.',
  ].join('\n');
}

export function extractLinkedInFromUrl(url) {
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
            { target: { tabId: newTab.id }, files: ['content.js'] },
            (results) => {
              chrome.tabs.remove(newTab.id, () => {});
              if (chrome.runtime.lastError) { resolve(null); return; }
              const data = results?.[0]?.result;
              resolve((!data || data.error) ? null : data);
            }
          );
        }, 3000);
      }

      chrome.tabs.onUpdated.addListener(onUpdated);
    });
  });
}

// Injected into LinkedIn experience tab via chrome.scripting — must remain self-contained
export function extractExperienceFunc() {
  const noise  = /^experience$|^experiencia$|^show all$|^ver todo$|^ver más$|^… more$|enhance with ai|\slogo$|^show less$/i;
  const isDate = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Ene|Abr|Ago)\w*\s+\d{4}/i;
  const isDur  = /^\d+\s+(yr|year|mo|month)/i;

  const spansOf = (el) =>
    Array.from(el.querySelectorAll('span[aria-hidden="true"]'))
      .map(s => s.textContent.trim()).filter(t => t.length > 0);

  const src   = document.querySelector('main') || document.body;
  const lines = spansOf(src).filter(l => l.length > 0 && !noise.test(l));

  const positions = [];
  for (let i = 2; i < lines.length; i++) {
    if (!isDate.test(lines[i])) continue;
    if (isDur.test(lines[i - 2]) && i >= 3)
      positions.push({ titleIdx: i - 1, companyIdx: i - 3, dateIdx: i });
    else if (!isDate.test(lines[i - 2]))
      positions.push({ titleIdx: i - 2, companyIdx: i - 1, dateIdx: i });
  }

  return positions.reduce((out, pos, j) => {
    const { titleIdx, companyIdx, dateIdx } = pos;
    const parts  = lines[companyIdx].split('·');
    const locIdx = dateIdx + 1;
    const hasLoc = locIdx < lines.length && !isDate.test(lines[locIdx]) &&
                   !isDur.test(lines[locIdx]) && lines[locIdx].length < 80;
    const loc    = hasLoc ? lines[locIdx] : '';

    const descStart = hasLoc ? locIdx + 1 : locIdx;
    const descEnd   = j + 1 < positions.length ? positions[j + 1].titleIdx : lines.length;
    const desc      = lines.slice(descStart, descEnd)
      .filter(l => l.length > 0 && !noise.test(l)).join('\n').trim();

    const e = {
      title:           lines[titleIdx].replace(/\*+/g, '').replace(/\s{2,}/g, ' ').trim(),
      company:         parts[0].trim(),
      employment_type: parts[1] ? parts[1].trim() : '',
      period:          lines[dateIdx].split('·')[0].trim(),
      location:        loc,
      description:     desc,
    };
    if (!out.some(x => x.title === e.title && x.company === e.company)) out.push(e);
    return out;
  }, []).slice(0, 25);
}
