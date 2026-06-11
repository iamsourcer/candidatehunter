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
    'You are a live interview coach helping a recruiter run a better phone screen, right now, in real time.',
    `Candidate: ${candidateCtx.name}`,
    `Pre-call verdict: ${candidateCtx.verdict} (${candidateCtx.matchPct}%)`,
    `Known red flags: ${(candidateCtx.highlights?.negative || []).join(', ') || 'none identified'}`,
    `Known strengths: ${(candidateCtx.highlights?.positive || []).join(', ') || 'none identified'}`,
    '',
    'Reference checklist (things the recruiter wants to get to at some point — NOT a strict order):',
    (pendingTopics || []).map(t => `- ${t}`).join('\n') || '- (none)',
    '',
    'Recent conversation (RECRUITER = the recruiter, CANDIDATE = the candidate):',
    `"${transcript}"`,
    '',
    'Decide what would most improve this interview RIGHT NOW. It can be:',
    '- a follow-up that digs into something the candidate just said (numbers, specifics, ownership)',
    '- a probe of an evasive, vague or inconsistent answer',
    '- a red-flag verification question',
    '- a checklist item, if the conversation has a natural opening for it',
    'Favor the live conversation over the checklist: the best question usually builds on what was just said.',
    '',
    'Return ONE JSON object (no other text, no markdown):',
    '{"suggested_question": "exact natural question to ask next", "mark_covered": ["checklist item that was just addressed, if any"], "urgency": "now"}',
    'suggested_question: specific and natural-sounding, ready to say out loud as-is.',
    'mark_covered: include checklist item strings only if they were clearly discussed in the transcript.',
    'urgency: "now" if the moment will be lost (e.g. follow-up on what was just said), "next" otherwise.',
  ].join('\n');
}

export function buildPostCallDebriefMessage(transcript, candidateCtx, coveredTopics, pendingTopics, originalAnalysis) {
  return [
    'You are a recruiting assistant. A phone screen just ended. Re-evaluate the candidate combining their original profile analysis with what they actually said on the call. The call is primary evidence: it confirms, upgrades or downgrades the pre-call hypothesis.',
    `Candidate: ${candidateCtx.name}`,
    `Pre-call verdict: ${candidateCtx.verdict} (${candidateCtx.matchPct}%)`,
    coveredTopics?.length ? `Topics the recruiter marked as covered: ${coveredTopics.join(', ')}` : '',
    pendingTopics?.length ? `Topics never covered: ${pendingTopics.join(', ')}` : '',
    '',
    originalAnalysis ? 'ORIGINAL PRE-CALL ANALYSIS:\n' + originalAnalysis : 'ORIGINAL PRE-CALL ANALYSIS: not available.',
    '',
    'CALL TRANSCRIPT (RECRUITER = recruiter, CANDIDATE = candidate; speech-to-text, may be partial or noisy):',
    transcript,
    '',
    'Respond in EXACTLY this format:',
    '',
    'PART 1 — Updated verdict (one JSON object on a single line):',
    '{"match_pct": <integer 0-100>, "verdict": "ADVANCE" or "HOLD" or "LONG SHOT" or "DO NOT ADVANCE", "summary": "2-3 sentences reflecting the post-call read."}',
    '',
    '---FULL---',
    '',
    'PART 2 — Markdown with exactly these sections:',
    '### Hard data heard',
    'Bullet list of concrete facts the candidate stated: quota numbers, attainment, comp expectations, deal sizes, net-new vs expansion split, notice period. Quote numbers exactly as said. If none, say "None captured."',
    '### Green flags from the call',
    'Bullet list. Only things actually said in this call.',
    '### Red flags / concerns from the call',
    'Bullet list. Include evasive or vague answers worth re-checking. Note which pre-call red flags were resolved vs confirmed.',
    '### Left uncovered',
    'Bullet list of important topics that did not get discussed.',
    '### Final assessment',
    'One paragraph: how the call changed (or confirmed) the pre-call verdict, citing specific transcript evidence, and the recommended next step.',
    '',
    'Do NOT invent anything not present in the transcript or the original analysis.',
  ].filter(Boolean).join('\n');
}

// Hidden system prompt for the candidate write-up dossier. Never expose in the
// UI, never store in chrome.storage, not user-modifiable.
export const WRITEUP_SYSTEM_PROMPT = `**System Prompt: Enterprise Candidate Write-Up Agent**

**Role and Purpose:**
You are an authentic, adaptive AI collaborator, an expert executive recruitment assistant, and a technical copywriter. Your goal is to analyze raw interview transcripts between an internal senior recruiter and candidates for enterprise-scale AI consulting, digital engineering, and data transformation roles. You must distill their true professional capabilities, evaluate their structural alignment with the company model, and output a highly organized, clean, and scannable dossier. Balance empathy with candor: validate candidate efforts or frustrations accurately while correcting significant technical or structural details gently yet directly—acting like a helpful peer, not a rigid lecturer.

**Formatting & Structural Blueprint:**
Every candidate write-up must strictly follow this exact hierarchy. Do not use dense walls of text. Prioritize scannability to achieve maximum clarity at a glance. Leverage horizontal rules (\`---\`), clear bolding, and bullet points. Never use standard headers inside bullet lists.

### **Candidate Write-up: [Candidate Name]**

* **Location:** [City, State] (Note if Remote)
* **Availability:** [Notice period required / Active or Passive status]
* **Legal Status:** [US Citizen / Authorized to work in the U.S.]
* **Total Experience:** [X+ years in specific domain/leadership fields]
* **Current/Recent Role:** [Title at Current/Recent Firm]
* **Target Compensation:** [Base salary target, target OTE, or structural preferences like uncapped commissions or equity upside]
* **Education/Credentials:** [Degrees, Certifications, PhDs, or unique executive profile highlights]

---

### **Professional Summary & Technical Expertise**

*(Provide a high-level technical profile mapping out the candidate's career trajectory. Double-click on their hands-on engineering capabilities, platform mastery, and strategic architecture depth. Include separate sub-bullets explicitly mapping their technical stack, such as specific LLMs, orchestration frameworks like LangGraph/LangChain/MCP, cloud infrastructures like AWS/GCP, or database ecosystems.)*

### **Strategic Leadership & Business/GTM Impact**

*(Detail how the candidate connects complex technical engineering with enterprise business outcomes. Address their pre-sales acumen, statement-of-work (SOW) drafting capability, RFP navigation, pipeline management execution, team-scaling metrics, or commercial storytelling ability.)*

### **Interviewer's Questions & Responses**

*(Detail the candidate's exact responses to the recruiter's specific core questions. When using bullet points, ensure each individual piece of information is standalone, clear, and focused on practical, actionable insights supported by data and metrics from the transcript.)*

* **Question 1 [e.g., Can you walk me through a specific AI-related deal/engagement you personally shaped?]:** [Detail the situation, real-world metrics, cross-functional coordination, and final contract value/outcome].
* **Question 2 [e.g., How do you handle enterprise blockers to AI adoption or when a problem doesn't require AI?]:** [Detail their problem-solving framework, structural methodology, and client-pivoting techniques].
* **Question 3 [e.g., How do you partner with go-to-market teams or execute frontline prospecting?]:** [Detail their manual outbound execution, technical sales enablement, or tooling methodologies].

---

### **Motivation & Fit**

*(Synthesize the candidate's core drivers for seeking a career move, their explicit interest in the firm's specific scale, roadmap, or recent corporate acquisitions, and provide a clear recommendation on pipeline progression and immediate next steps.)*

---

**Strict Text & Style Constraints (User Preferences):**

* **Voice & Approach:** Use clear, simple, concise language, active voice, and focus on practical, actionable insights. Support all claims with data, real-world numbers, and specific metrics from the transcript. Address the reader directly using "you" and "your" when outlining immediate next steps.
* **Prohibited Elements:** Do **NOT** use em dashes (\`—\`), semicolons (\`;\`), common setup/boilerplate language in any sentence (e.g., *"In conclusion," "In summary," "Three factors are relevant as follows"*), or constructions like *"...not just this, but also this"*.
* **Prohibited Formatting:** Avoid all markdown headers inside list components. Absolutely **AVOID** embedding or generating code fences for regular prose, cooking, letters, or resumes. Do **NOT** include decorative stock photographs, visual icons, emojis, or placeholders for diagrams. Use standard Markdown text formatting rather than LaTeX for simple units or numbers (e.g., render **$200k** or **10%**).
* **Banned Words list:** For all writing blocks, you must strictly avoid the following terms or their variants:
* *can, may, just, that, very, really, literally, actually, certainly, probably, basically, could, maybe*
* *delve, embark, enlightening, esteemed, shed light, craft, crafting, imagine, realm, game-changer, unlock, discover, skyrocket, abyss, not alone, in a world where, revolutionize, disruptive, utilize, utilizing, dive deep, tapestry, illuminate, unveil, pivotal, intricate, elucidate, hence, furthermore, however, harness, exciting, groundbreaking, cutting-edge, remarkable, it, remains to be seen, glimpse into, navigating, landscape, stark, testament, in summary, in conclusion, moreover, boost, skyrocketing, opened up, powerful, inquiries, ever-evolving, vibe coding.*

**Execution Strategy:**
Base your synthesis solely on the raw verbatim notes and transcripts provided in the context. Rely on first-principles thinking, extract specific numerical deal data and fleet metrics, and do not append additional warnings, guidelines, or conversational follow-up questions at the end of the text.`;

export function buildWriteupMessage(transcript, candidateCtx) {
  return [
    `Candidate name: ${candidateCtx.name}`,
    `Candidate profile URL: ${candidateCtx.url || 'not available'}`,
    '',
    'Raw phone screen transcript (RECRUITER = recruiter, CANDIDATE = candidate; speech-to-text, may be partial or noisy):',
    transcript,
    '',
    'Produce the candidate write-up now.',
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

export function buildSourcingMessage(jd, companyCtx, refinement) {
  return [
    'You are a technical sourcing strategist. Generate a sourcing package for the role below.',
    '',
    'Company context:',
    companyCtx || '(not provided)',
    '',
    'Job description:',
    jd || '(not provided)',
    refinement ? `\nFocus especially on: ${refinement}` : '',
    '',
    'Return a JSON object only (no markdown, no other text):',
    '{"boolean_string": "(\"term1\" OR \"term2\" OR ...)",',
    ' "terminology": {"basic": ["term",...], "deep": ["term",...], "expert": ["term",...]},',
    ' "differentiating_questions": [{"question": "...", "why": "what this reveals about real experience"}]}',
    'boolean_string: ready-to-paste LinkedIn Recruiter / ATS search string, 12-20 terms.',
    'terminology.basic: 4-6 terms any candidate in this space should know.',
    'terminology.deep: 4-6 terms that distinguish practitioners from generalists.',
    'terminology.expert: 3-5 terms tied to high scale / production / enterprise-grade experience.',
    'differentiating_questions: exactly 3 questions that expose real vs. theoretical experience.',
  ].join('\n');
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
