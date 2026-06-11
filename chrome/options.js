const PROMPT_TEMPLATE = `# RECRUITMENT EVALUATOR — SYSTEM PROMPT

You are an expert Technical Recruitment Evaluator for **{{COMPANY_NAME}}**.
Your behavior, scoring criteria, and interview questions are derived entirely
from the company context and job description provided below. You do not apply
generic hiring heuristics — every judgment must trace back to these inputs.

---

## SECTION A — COMPANY CONTEXT

{{COMPANY_INFO}}

Before any evaluation, extract and lock the following fields.
If {{COMPANY_INFO}} is missing, vague, or insufficient to extract
two or more fields below, stop immediately and output:

\`[INSUFFICIENT COMPANY DATA] The company information provided does not
contain enough detail to generate a reliable evaluation framework.
Please provide: business model, client type, delivery model, release
cadence, and any culture or pace signals. Evaluation cannot proceed
until this is resolved.\`

Do not proceed to Section B or any candidate evaluation until
Section A is fully resolvable.

Required extractions:

- **Business model** (services / SaaS / product / hybrid)
- **Client type** (enterprise / SMB / startup / mixed)
- **Delivery model** (bespoke SOW / subscription / project-based / retainer)
- **Pace signals** (release cadence, team structure, agile indicators)
- **Culture signals** (autonomy level, collaboration style, fast-paced flags)

State each explicitly:
\`[EXTRACTED] Business model: custom engineering services\`
\`[INFERRED — low confidence] Pace: fast-moving, based on mention of
weekly sprints but no explicit release cadence stated\`

If any single field cannot be extracted or inferred with reasonable
confidence, state:
\`[MISSING] Culture signals: not mentioned in company info provided.
This field will not be used in scoring. Recruiter should supply this
before running candidate evaluations.\`

---

## SECTION B — JOB DESCRIPTION PARSING

{{JOB_DESCRIPTION}}

Parse the JD into four ranked tiers. Every requirement must be slotted
into exactly one tier. Never leave a requirement unclassified.

**Tier 1 — Mandatory (40 points total, distributed equally across items)**
Requirements explicitly marked as required, must-have, or essential.
Each Tier 1 item is worth: 40 / [number of Tier 1 items] points.

**Tier 2 — Strong Preference (30 points total, distributed equally across items)**
Requirements marked as preferred, strongly desired, or nice-to-have
with clear emphasis.
Each Tier 2 item is worth: 30 / [number of Tier 2 items] points.

**Tier 3 — Contextual Fit (20 points total, distributed equally across items)**
Soft requirements: communication, autonomy, delivery pace alignment,
client-facing experience, team dynamics.
Each Tier 3 item is worth: 20 / [number of Tier 3 items] points.

**Tier 4 — Bonus (up to 10 points, distributed equally across items)**
Skills or experience mentioned once without emphasis, framed as a plus,
or implied rather than stated.
Each Tier 4 item is worth: 10 / [number of Tier 4 items] points.
Tier 4 points are additive only — absence never reduces the score.

**Scoring cap: 100 points maximum.**

---

## SECTION C — EMPLOYER CLASSIFICATION PROTOCOL

Classification categories must be derived from Section A, not assumed.
Employer classification is used for **context and interview targeting only**.
It never adjusts the match percentage up or down.

**Step 1 — Define the baseline model from Section A:**
State the company's business model as extracted in Section A.
\`[BASELINE] {{COMPANY_NAME}} operates as a custom engineering services firm.\`
\`[BASELINE] {{COMPANY_NAME}} operates as a B2B SaaS platform company.\`
\`[BASELINE] {{COMPANY_NAME}} operates as an in-house product team at a retail enterprise.\`

**Step 2 — Classify each employer in the candidate's profile:**
For every company in the candidate's work history, assign one of three labels:

- **[ALIGNED]** — Business model closely matches {{COMPANY_NAME}}'s baseline.
  Note what context transfers directly.

- **[ADJACENT]** — Different model type but experience is plausible to transfer.
  Note what is likely transferable and what is worth exploring in the screen.

- **[DIVERGENT]** — Meaningfully different model. Note the difference and flag
  specific topics worth exploring — not as a negative signal, but to give the
  recruiter the right questions to understand transferability.

**Step 3 — Sparse data rule:**
If a role has no description, infer the company's model from training knowledge.
Always label the inference explicitly:
\`[INFERRED] Acme Corp appears to be a SaaS HR platform based on public
knowledge — treating as [ADJACENT] to {{COMPANY_NAME}}'s baseline.\`

If the company is entirely unknown:
\`[UNKNOWN] No public data available. Classifying as neutral.
Will not penalize. Will not assume alignment or misalignment.\`

**Step 4 — Relevance summary:**
After classifying all employers, produce a one-line context note:
\`Employer context: 3 ALIGNED / 1 ADJACENT / 1 DIVERGENT\`
\`Note: DIVERGENT and ADJACENT employers generate targeted questions
in OUTPUT 2 only — they do not affect the candidate's match percentage.\`

---

## SECTION D — CANDIDATE EVALUATION RULES

### INTERNAL CHECKS
Reason through all checks before writing any output. Do NOT print check labels, check numbers, or raw check output in your response. Incorporate all findings naturally into the Task outputs below.

**Check 1 — Tenure gaps:** Scan work history for gaps ≥3 months. For each gap found, weave one natural probing question into Task 2 (do not label it as a "gap question").

**Check 2 — Overqualification signals:** If the candidate's seniority, scope, or compensation signals exceed this role, address it directly in the Task 1 🔴 section and include a probing question in Task 2.

**Check 3 — Profile completeness:** If a Tier 1 requirement cannot be evaluated from the profile, flag it under Hard gaps in Task 1 🔴. Do not penalize the score.

**Check 4 — IC Hunter override:** If the JD calls for a pure individual contributor (IC) hunter seat — own personal quota, self-sourced pipeline, zero direct reports — and the candidate's last 3+ years are exclusively in executive leadership, advisory consulting, or team management (10+ direct reports) with no documented personal quota history, apply a hard score ceiling of 65 regardless of technical fit. State this explicitly as a Hard gap in Task 1 🔴.

---

### SCORING THRESHOLDS (internal only — determine the verdict; do NOT print this table in your response)
80–100 → ADVANCE
65–79  → HOLD — screen with caution, flag gaps
50–64  → LONG SHOT — advance only if pipeline is thin
Below 50 → DO NOT ADVANCE

---

### TASK 1 — MATCH ASSESSMENT

**Task 1: Resume & Profile Match Assessment**

**Overall Match Percentage: [X]% ([one-line reason — the single most decisive factor driving the score this high or low])**

[Lead paragraph: 2-3 sentences of honest, direct narrative. Name the candidate's dominant professional archetype (e.g. "technical executive and strategist", "IC enterprise hunter", "delivery consultant", "advisory architect") and explain plainly why it does or does not translate to this specific seat and company model. Be direct. No hedging. No flattery.]

**🟢 Why They Look Good on Paper**
Each bullet must cite a specific fact, company name, metric, title, or duration from the candidate's actual profile — never a generic trait. Tie each to a concrete JD requirement. Minimum 2 bullets.

**🔴 Why They Are a Mismatch / Need Pressure Testing**

**Hard gaps** (Tier 1 requirements clearly absent or unverifiable):
• [Name the specific Tier 1 requirement + specific evidence of its absence or unverifiability from the profile]

**Pressure test areas** (requirements present but thin, unverified, or employer-model mismatch):
• [What to probe + exactly why it is uncertain or risky based on the profile]

**The Verdict: [ADVANCE / HOLD / LONG SHOT / DO NOT ADVANCE]**
[1-2 direct sentences. For non-ADVANCE: if a screen is required by circumstance, state the one question that would most change the outcome. For ADVANCE: state what the phone screen must confirm before progressing.]

---

### TASK 2 — PHONE SCREEN SCRIPT
Produce for ADVANCE, HOLD, and LONG SHOT verdicts. Omit entirely for DO NOT ADVANCE.

**Task 2: Phone Screen Script (In Case of Intent to Screen)**

**1. The Intro & Solvd Positioning**
Write a full word-for-word recruiter intro (150–250 words) as one flowing paragraph — the recruiter reads this verbatim. In order: greeting with the candidate's first name and {{COMPANY_NAME}}, what the company does and its commercial model in 1-2 tight sentences, ONE concrete hook directly tied to a specific company, role, or metric from this candidate's actual profile (name it, make it traceable), a brief agenda setter. No buzzwords. No filler.

**2. Core Proving Questions**
Write exactly 3 questions. Each question:
- Must be fully scripted — write the complete sentence(s) the recruiter reads aloud, including specific context pulled from the candidate's profile (name their company, title, tenure, team size, or a metric)
- Must target one of the specific 🔴 gaps or pressure test areas from Task 1
- Must be 50–100 words in length
- "Can you walk me through" may appear at most ONCE across all three questions

Format each as:
**Question [N]: [Descriptive title naming the specific gap or risk being tested]**
"[Complete recruiter script the recruiter reads verbatim]"

**3. Compensation Alignment**
"[Full verbatim comp script the recruiter reads aloud. Reference the candidate's background, frame the IC individual contributor seat context, include: base $175k–$220k, $1M net-new services revenue quota, uncapped commission, target OTE $275k–$320k. Natural spoken language — not a bullet list.]"

---

### TASK 3 — NEXT STEPS
Produce only for ADVANCE verdicts. Omit for all other verdicts.

**Task 3: Next Steps to Push Forward**

If [candidate first name] confirms [2-3 specific alignment criteria from the phone screen]:
• **[Round name]** ([format], [duration]): [specific focus — what is evaluated and by whom]
• **[Round name]** ([format], [duration]): [specific focus]
• **[Round name]** ([format], [duration]): [specific focus]

---

## WRITING RESTRICTIONS (STRICTLY ENFORCED)

**Tone:** Direct, professional, scannable. No filler. No flattery.

**Banned words and phrases:**
delve, embark, enlightening, realm, revolutionize, game-changer,
unlock, discover, skyrocket, disruptive, utilizing, dive deep,
tapestry, illuminate, unveil, pivotal, intricate, elucidate, hence,
furthermore, however, harness, exciting, groundbreaking, cutting-edge,
remarkable, navigating, landscape, in summary, in conclusion, moreover,
boost, strong fit, perfect fit.

**Formatting rules:**
- Clean markdown only
- Sections separated by \`---\`
- Bold key phrases sparingly — never mid-sentence
- No em-dashes, no semicolons
- Numbers always exact — no rounding for effect
- 🟢 always = strengths — 🔴 always = gaps and risks — never swap
- All output in English regardless of input language

**No contamination rule:**
Do not carry scoring logic, example outputs, verdicts, or candidate
details from one session into another. Each candidate profile is
evaluated fresh against the locked Section A and Section B context only.
Prior session outputs are not evidence and cannot be referenced.

---

## RESPONSE FORMAT — MANDATORY

Every response to a candidate evaluation MUST follow this exact two-part structure:

**Part 1 — Machine-readable digest (first line, before any other text):**
Output a single JSON object on one line (no line breaks inside):
{"match_pct": <integer 0-100>, "verdict": "ADVANCE" or "HOLD" or "LONG SHOT" or "DO NOT ADVANCE", "summary": "2-3 sentences: candidate's dominant archetype + the decisive fit or misfit reason + the single most important thing the screen must confirm or rule out.", "highlights": {"positive": ["exact phrase from profile"], "negative": ["red flag phrase"]}, "suggest_terms": ["missing skill"]}

- highlights.positive: 3-6 exact phrases copied verbatim from the profile that support the candidacy
- highlights.negative: 1-4 exact phrases copied verbatim from the profile that are red flags
- suggest_terms: 3-5 skills/keywords that SHOULD appear in a strong candidate but are ABSENT from this profile

**Part 2 — Full evaluation:**
On its own line, output the literal text: ---FULL---
Then provide Task 1 (Match Assessment), Task 2 (Phone Screen Script — only if verdict is ADVANCE, HOLD, or LONG SHOT), and Task 3 (Next Steps — only if verdict is ADVANCE).

Do NOT output any text before the JSON line. The JSON digest is required in every response and must appear as the very first line.`;

// ── Provider section visibility ───────────────────────────────────────────────
function showProviderSection(provider) {
  document.getElementById('section-anthropic').style.display =
    provider === 'anthropic' ? '' : 'none';
  document.getElementById('section-openai').style.display =
    provider === 'openai-compat' ? '' : 'none';
  document.getElementById('section-gemini').style.display =
    provider === 'gemini' ? '' : 'none';
}

// ── Load saved settings ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const keys = [
    'provider',
    'anthropicKey', 'apiKey', 'anthropicModel',
    'openaiBaseUrl', 'openaiKey', 'openaiModel',
    'geminiKey', 'geminiModel',
    'autoAnalyze', 'ashbyKey', 'deepgramKey', 'roleConfigs',
  ];

  chrome.storage.local.get(keys, (data) => {
    const provider = data.provider || 'anthropic';
    document.getElementById('provider-select').value = provider;
    showProviderSection(provider);

    document.getElementById('anthropic-key').value =
      data.anthropicKey || data.apiKey || '';
    document.getElementById('anthropic-model').value =
      data.anthropicModel || 'claude-sonnet-4-6';
    document.getElementById('openai-base-url').value =
      data.openaiBaseUrl || 'https://api.deepseek.com';
    document.getElementById('openai-key').value   = data.openaiKey   || '';
    document.getElementById('openai-model').value = data.openaiModel || 'deepseek-chat';
    document.getElementById('gemini-key').value   = data.geminiKey   || '';
    document.getElementById('gemini-model').value = data.geminiModel || 'gemini-1.5-flash';
    document.getElementById('auto-analyze-toggle').checked = data.autoAnalyze !== false;
    document.getElementById('ashby-key').value    = data.ashbyKey    || '';
    document.getElementById('deepgram-key').value = data.deepgramKey || '';

    highlightActivePreset(data.openaiBaseUrl || '', data.openaiModel || '');
    updateOpenRouterModelsRow(data.openaiBaseUrl || '', data.openaiModel || '');
    renderRoleList(data.roleConfigs || []);

    // Show Quick Start banner if no API key configured
    const hasKey = data.anthropicKey || data.apiKey || data.openaiKey || data.geminiKey;
    if (!hasKey) document.getElementById('quickstart-banner').style.display = '';
  });
});

// ── Provider selector ─────────────────────────────────────────────────────────
document.getElementById('provider-select').addEventListener('change', (e) => {
  showProviderSection(e.target.value);
});

// ── Quick Start button ────────────────────────────────────────────────────────
document.getElementById('quickstart-groq-btn').addEventListener('click', () => {
  document.getElementById('provider-select').value = 'openai-compat';
  showProviderSection('openai-compat');
  document.getElementById('openai-base-url').value = 'https://api.groq.com/openai';
  document.getElementById('openai-model').value    = 'llama-3.3-70b-versatile';
  highlightActivePreset('https://api.groq.com/openai', 'llama-3.3-70b-versatile');
  document.getElementById('quickstart-banner').style.display = 'none';
  document.getElementById('openai-key').focus();
  document.getElementById('openai-key').scrollIntoView({ behavior: 'smooth', block: 'center' });
});

// ── OpenAI-compatible presets ─────────────────────────────────────────────────
const PRESETS = {
  deepseek:    { url: 'https://api.deepseek.com',    model: 'deepseek-chat' },
  groq:        { url: 'https://api.groq.com/openai', model: 'llama-3.3-70b-versatile' },
  openrouter:  { url: 'https://openrouter.ai/api',   model: 'meta-llama/llama-3.3-70b-instruct:free' },
  openai:      { url: 'https://api.openai.com',      model: 'gpt-4o-mini' },
};

document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const url   = btn.dataset.url;
    const model = btn.dataset.model;
    document.getElementById('openai-base-url').value = url;
    document.getElementById('openai-model').value    = model;
    highlightActivePreset(url, model);
  });
});

function highlightActivePreset(url, model) {
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.classList.toggle(
      'active',
      btn.dataset.url === url && btn.dataset.model === model
    );
  });
  updateOpenRouterModelsRow(url, model);
}

function updateOpenRouterModelsRow(url, model) {
  const row = document.getElementById('openrouter-models');
  if (!row) return;
  const isOR = url.includes('openrouter.ai');
  row.style.display = isOR ? '' : 'none';
  if (isOR) highlightOpenRouterModel(model);
}

function highlightOpenRouterModel(model) {
  document.querySelectorAll('.or-model-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.model === model);
  });
}

document.querySelectorAll('.or-model-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.getElementById('openai-model').value = btn.dataset.model;
    highlightOpenRouterModel(btn.dataset.model);
  });
});

// Keep preset highlight in sync when user edits the URL field
document.getElementById('openai-base-url').addEventListener('input', () => {
  const url   = document.getElementById('openai-base-url').value;
  const model = document.getElementById('openai-model').value;
  highlightActivePreset(url, model);
  updateOpenRouterModelsRow(url, model);
});

// ── Save ──────────────────────────────────────────────────────────────────────
document.getElementById('save-btn').addEventListener('click', () => {
  const provider = document.getElementById('provider-select').value;

  chrome.storage.local.set({
    provider,
    anthropicKey:   document.getElementById('anthropic-key').value.trim(),
    anthropicModel: document.getElementById('anthropic-model').value,
    openaiBaseUrl:  document.getElementById('openai-base-url').value.trim(),
    openaiKey:      document.getElementById('openai-key').value.trim(),
    openaiModel:    document.getElementById('openai-model').value.trim(),
    geminiKey:      document.getElementById('gemini-key').value.trim(),
    geminiModel:    document.getElementById('gemini-model').value.trim() || 'gemini-1.5-flash',
    autoAnalyze:    document.getElementById('auto-analyze-toggle').checked,
    ashbyKey:       document.getElementById('ashby-key').value.trim(),
    deepgramKey:    document.getElementById('deepgram-key').value.trim(),
  }, () => {
    flash('Saved ✓', '');
  });
});

function flash(msg, cls) {
  const fb = document.getElementById('feedback');
  fb.textContent = msg;
  fb.className   = cls;
  setTimeout(() => { fb.textContent = ''; fb.className = ''; }, 2800);
}

// ── Fill prompt template with role details (instant — no AI call) ─────────────
function fillPromptTemplate(companyName, companyInfo, jd) {
  return PROMPT_TEMPLATE
    .replace(/\{\{COMPANY_NAME\}\}/g, companyName || 'the company')
    .replace(/\{\{COMPANY_INFO\}\}/g, companyInfo || '(no company info provided)')
    .replace(/\{\{JOB_DESCRIPTION\}\}/g, jd || '(no job description provided)');
}

// ── AI provider router (mirrors popup.js) ─────────────────────────────────────
async function callAI(settings, systemPrompt, userMessage) {
  switch (settings.provider) {
    case 'gemini':
      return callGemini(
        settings.geminiKey,
        settings.geminiModel || 'gemini-1.5-flash',
        systemPrompt,
        userMessage,
      );
    case 'openai-compat':
      return callOpenAICompat(
        settings.openaiBaseUrl || 'https://api.deepseek.com',
        settings.openaiKey,
        settings.openaiModel  || 'deepseek-chat',
        systemPrompt,
        userMessage,
      );
    default: // 'anthropic'
      return callAnthropic(
        settings.anthropicKey || '',
        systemPrompt,
        userMessage,
        settings.anthropicModel || 'claude-sonnet-4-6',
      );
  }
}

async function callAnthropic(key, systemPrompt, userMessage, model = 'claude-sonnet-4-6') {
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
      max_tokens: 4096,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: userMessage }],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Anthropic API error ${res.status}`);
  }
  return (await res.json()).content?.[0]?.text || '';
}

async function callOpenAICompat(baseUrl, key, model, systemPrompt, userMessage) {
  const url = baseUrl.replace(/\/$/, '') + '/v1/chat/completions';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
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

async function callGemini(key, model, systemPrompt, userMessage) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents:           [{ parts: [{ text: userMessage }] }],
      generationConfig:   { maxOutputTokens: 4096 },
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini API error ${res.status}`);
  }
  return (await res.json()).candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ── Ashby test connection ─────────────────────────────────────────────────────
document.getElementById('test-ashby-btn').addEventListener('click', async () => {
  const key = document.getElementById('ashby-key').value.trim();
  const fb  = document.getElementById('ashby-feedback');
  if (!key) { fb.textContent = 'Enter an API key first.'; fb.className = 'warn'; return; }

  const btn = document.getElementById('test-ashby-btn');
  btn.disabled    = true;
  btn.textContent = 'Testing…';
  fb.textContent  = '';
  fb.className    = '';

  try {
    const res = await fetch('https://api.ashbyhq.com/job.list', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Basic ${btoa(key + ':')}`,
      },
      body: JSON.stringify({ status: 'Open' }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.errors?.[0] || 'API error');
    const count = (data.results || []).length;
    fb.textContent = `✓ Connected — ${count} open job${count !== 1 ? 's' : ''}`;
    fb.className   = '';
  } catch (err) {
    fb.textContent = `✗ ${err.message}`;
    fb.className   = 'warn';
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Test Connection';
  }
});

// ── Role Configurations ───────────────────────────────────────────────────────
let editingRoleId = null;

function renderRoleList(configs) {
  const list = document.getElementById('role-list');
  if (!configs.length) {
    list.innerHTML = '<p class="role-empty">No roles configured yet. Click <strong>+ Add Role</strong> to create one.</p>';
    return;
  }

  list.innerHTML = configs.map(r => `
    <div class="role-item" data-id="${r.id}">
      <span class="role-item-name">${escHtml(r.name)}</span>
      ${r.isActive ? '<span class="role-active-badge">Active</span><button class="role-item-btn deactivate" data-id="' + r.id + '">Deactivate</button>' : ''}
      ${!r.isActive ? `<button class="role-item-btn set-active" data-id="${r.id}">Set Active</button>` : ''}
      <button class="role-item-btn" data-edit="${r.id}">Edit</button>
      <button class="role-item-btn danger" data-delete="${r.id}">Delete</button>
    </div>
  `).join('');

  list.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => openRoleEditor(btn.dataset.edit, configs));
  });
  list.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => deleteRole(btn.dataset.delete));
  });
  list.querySelectorAll('.set-active').forEach(btn => {
    btn.addEventListener('click', () => setActiveRole(btn.dataset.id));
  });
  list.querySelectorAll('.deactivate').forEach(btn => {
    btn.addEventListener('click', () => deactivateRole());
  });
}

function openRoleEditor(roleId, configs) {
  const role = configs.find(r => r.id === roleId);
  if (!role) return;
  editingRoleId = roleId;
  document.getElementById('role-editor-title').textContent = `Editing: ${role.name}`;
  document.getElementById('editing-role-id').value         = roleId;
  document.getElementById('role-name-input').value         = role.name;
  document.getElementById('role-company-name').value       = role.companyName    || '';
  document.getElementById('role-company-context').value    = role.companyContext || '';
  document.getElementById('role-jd-input').value           = role.jd             || '';
  document.getElementById('role-system-prompt').value      = role.systemPrompt   || '';
  document.getElementById('role-editor').classList.add('visible');
  document.getElementById('role-name-input').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

document.getElementById('add-role-btn').addEventListener('click', () => {
  editingRoleId = null;
  document.getElementById('role-editor-title').textContent = 'New Role';
  document.getElementById('editing-role-id').value         = '';
  document.getElementById('role-name-input').value         = '';
  document.getElementById('role-company-name').value       = '';
  document.getElementById('role-company-context').value    = '';
  document.getElementById('role-jd-input').value           = '';
  document.getElementById('role-system-prompt').value      = '';
  document.getElementById('role-editor').classList.add('visible');
  document.getElementById('role-name-input').focus();
});

document.getElementById('upgrade-prompt-btn').addEventListener('click', () => {
  const companyName = document.getElementById('role-company-name').value.trim();
  const context     = document.getElementById('role-company-context').value.trim();
  const jd          = document.getElementById('role-jd-input').value.trim();
  const fb          = document.getElementById('role-editor-feedback');

  if (!context) {
    fb.textContent = 'Add company context first.';
    setTimeout(() => { fb.textContent = ''; }, 3000);
    return;
  }

  document.getElementById('role-system-prompt').value = fillPromptTemplate(companyName, context, jd);
  fb.textContent = 'Ready ✓ — click Save Role.';
  setTimeout(() => { fb.textContent = ''; }, 3000);
});

document.getElementById('cancel-role-btn').addEventListener('click', () => {
  document.getElementById('role-editor').classList.remove('visible');
  editingRoleId = null;
});

document.getElementById('save-role-btn').addEventListener('click', async () => {
  const name        = document.getElementById('role-name-input').value.trim();
  const companyName = document.getElementById('role-company-name').value.trim();
  const context     = document.getElementById('role-company-context').value.trim();
  const jd          = document.getElementById('role-jd-input').value.trim();
  const prompt      = document.getElementById('role-system-prompt').value.trim();
  const fb          = document.getElementById('role-editor-feedback');

  if (!name)   { fb.textContent = 'Name is required.'; return; }
  if (!prompt) { fb.textContent = 'Click ⚡ Fill Template first.'; return; }

  const { roleConfigs = [] } = await chrome.storage.local.get('roleConfigs');

  if (editingRoleId) {
    const idx = roleConfigs.findIndex(r => r.id === editingRoleId);
    if (idx >= 0) {
      const wasActive = roleConfigs[idx].isActive;
      roleConfigs[idx] = { ...roleConfigs[idx], name, companyName, companyContext: context, jd, systemPrompt: prompt };
      if (wasActive) await clearUrlCache();
    }
  } else {
    const isFirst = roleConfigs.length === 0;
    roleConfigs.push({
      id:             `role_${Date.now()}`,
      name,
      companyName,
      companyContext: context,
      jd,
      systemPrompt:   prompt,
      isActive:       isFirst,
    });
    // Auto-create a project with the same name
    const { projects = [] } = await chrome.storage.local.get('projects');
    if (!projects.some(p => p.name === name)) {
      const newProject = { id: `proj_${Date.now()}`, name, createdAt: new Date().toISOString(), candidates: [] };
      projects.unshift(newProject);
      await chrome.storage.local.set({ projects, lastActiveProjectId: newProject.id });
    }
  }

  await chrome.storage.local.set({ roleConfigs });
  document.getElementById('role-editor').classList.remove('visible');
  editingRoleId = null;
  fb.textContent = '';
  renderRoleList(roleConfigs);
  flash('Role saved ✓', '');
});

async function deleteRole(roleId) {
  const { roleConfigs = [] } = await chrome.storage.local.get('roleConfigs');
  const role = roleConfigs.find(r => r.id === roleId);
  if (!confirm(`Delete role "${role?.name}"?`)) return;
  const updated = roleConfigs.filter(r => r.id !== roleId);
  await chrome.storage.local.set({ roleConfigs: updated });
  renderRoleList(updated);
}

async function setActiveRole(roleId) {
  const { roleConfigs = [] } = await chrome.storage.local.get('roleConfigs');
  roleConfigs.forEach(r => { r.isActive = r.id === roleId; });
  await clearUrlCache();
  await chrome.storage.local.set({ roleConfigs });
  renderRoleList(roleConfigs);
  flash('Active role updated ✓ (analysis cache cleared)', '');
}

async function deactivateRole() {
  const { roleConfigs = [] } = await chrome.storage.local.get('roleConfigs');
  roleConfigs.forEach(r => { r.isActive = false; });
  await clearUrlCache();
  await chrome.storage.local.set({ roleConfigs });
  renderRoleList(roleConfigs);
  flash('Role deactivated ✓', '');
}

async function clearUrlCache() {
  const all  = await chrome.storage.local.get(null);
  const keys = Object.keys(all).filter(k => k.startsWith('urlcache_'));
  if (keys.length) await chrome.storage.local.remove(keys);
  return keys.length;
}

document.getElementById('clear-cache-btn').addEventListener('click', async () => {
  const count = await clearUrlCache();
  flash(count ? `Analysis cache cleared (${count} entries removed)` : 'Cache already empty', '');
});

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Auto-save API keys on blur ────────────────────────────────────────────────
function setupAutoSave(inputId, storageKey) {
  const el = document.getElementById(inputId);
  if (!el) return;
  el.addEventListener('blur', () => {
    const val = el.value.trim();
    if (!val) return;
    chrome.storage.local.set({ [storageKey]: val }, () => {
      const ind = el.parentElement.querySelector('.key-saved-ind') || (() => {
        const s = document.createElement('span');
        s.className = 'key-saved-ind';
        s.style.cssText = 'font-size:11px;color:#057642;margin-left:8px;font-weight:600';
        el.insertAdjacentElement('afterend', s);
        return s;
      })();
      ind.textContent = '✓ saved';
      clearTimeout(ind._t);
      ind._t = setTimeout(() => { ind.textContent = ''; }, 2000);
    });
  });
}

setupAutoSave('anthropic-key', 'anthropicKey');
setupAutoSave('openai-key',    'openaiKey');
setupAutoSave('gemini-key',    'geminiKey');
setupAutoSave('ashby-key',     'ashbyKey');
setupAutoSave('deepgram-key',  'deepgramKey');
