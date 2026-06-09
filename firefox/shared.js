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
    'PART 1 — Quick summary (one JSON object on a single line):',
    '{"match_pct": <integer 0-100>, "verdict": "ADVANCE" or "ARCHIVE", "summary": "<2-3 sentence explanation>"}',
    '',
    '---FULL---',
    '',
    'PART 2 — Complete Task 1 assessment. If verdict is ADVANCE (match_pct >= 80), also include Task 2 Phone Screen Script.',
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
    '{"match_pct": <integer 0-100>, "verdict": "ADVANCE" or "ARCHIVE", "summary": "<2-3 sentence plain-text explanation>"}',
    '',
    '---FULL---',
    '',
    'PART 2 — Complete Task 1 assessment. If verdict is ADVANCE (match_pct >= 80), also include Task 2 Phone Screen Script.',
  ].join('\n');
}

export async function callAI(settings, systemPrompt, userMessage, opts = {}) {
  let effectivePrompt = systemPrompt;
  if (opts.includeHighlights) {
    effectivePrompt += '\n\nIMPORTANT: In your JSON line add a "highlights" key: {"match_pct":...,"verdict":...,"summary":...,"highlights":{"positive":["exact phrase 1","exact phrase 2"],"negative":["red flag 1"]}}. positive: 3-6 exact phrases from the profile supporting candidacy. negative: 1-4 exact red-flag phrases. Use phrases exactly as they appear in the profile.';
  }
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
      max_tokens:  2500,
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
      max_tokens:  2500,
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
      generationConfig:   { maxOutputTokens: 2500, temperature: 0 },
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini API error ${res.status}`);
  }
  return (await res.json()).candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export function parseAnalysisResponse(text) {
  const delimIdx    = text.indexOf('---FULL---');
  const part1       = (delimIdx >= 0 ? text.slice(0, delimIdx) : text).trim();
  const fullAnalysis = delimIdx >= 0 ? text.slice(delimIdx + 10).trim() : text.trim();

  let matchPct = 50, verdict = 'ARCHIVE', summary = 'Analysis complete.', highlights = null;

  try {
    const jsonLine = part1.split('\n').find(l => l.trim().startsWith('{'));
    if (jsonLine) {
      const parsed = JSON.parse(jsonLine.trim());
      if (typeof parsed.match_pct === 'number')
        matchPct = Math.min(100, Math.max(0, Math.round(parsed.match_pct)));
      if (parsed.verdict === 'ADVANCE' || parsed.verdict === 'ARCHIVE')
        verdict = parsed.verdict;
      if (typeof parsed.summary === 'string' && parsed.summary.trim())
        summary = parsed.summary.trim();
      if (parsed.highlights && typeof parsed.highlights === 'object')
        highlights = {
          positive: Array.isArray(parsed.highlights.positive) ? parsed.highlights.positive : [],
          negative: Array.isArray(parsed.highlights.negative) ? parsed.highlights.negative : [],
        };
    }
  } catch (_) {}

  return { matchPct, verdict, summary, fullAnalysis, highlights };
}

export async function getActiveSystemPrompt() {
  const { roleConfigs, systemPrompt } = await chrome.storage.local.get(['roleConfigs', 'systemPrompt']);
  const active = (roleConfigs || []).find(r => r.isActive);
  return active?.systemPrompt || systemPrompt || '';
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
    '{"match_pct": <integer 0-100>, "verdict": "ADVANCE" or "ARCHIVE", "summary": "<2-3 sentence plain-text explanation>"}',
    '',
    '---FULL---',
    '',
    'PART 2 — One paragraph reconciling how you weighted the two sources, then the full Task 1 assessment. If verdict is ADVANCE (match_pct >= 80), also include Task 2 Phone Screen Script.',
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
