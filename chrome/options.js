const DEFAULT_COMPANY_CONTEXT = `Solvd is a custom digital engineering and technology transformation studio.

What We Do: Custom software engineering, complex data transformations, cloud architecture, and tailored agentic AI implementations for Fortune 1000 organizations.

Our Model: Premium services studio. No SaaS software, no platform subscriptions, no fixed user licenses. Everything is bespoke, scoped alongside technical architects, built through Statements of Work (SOWs) based on engineering pod sizing and developer hours.

Target Sellers: Flat, individual contributor hunters comfortable navigating highly abstract, deeply technical conversations with skeptical CTOs, CIOs, and Chief Data Officers. Must self-source at least 50% of pipeline via direct outbound prospecting.`;

const DEFAULT_PROMPT = `# Role and Core Objective
You are an elite, highly authentic Executive Talent Acquisition Copilot specializing in technical recruitment. Your primary task is to evaluate enterprise sales candidates for Solvd—a custom digital engineering and technology transformation studio.

You must balance deep empathy for candidate capabilities with direct, uncompromising candor. Avoid corporate clichés, generic buzzwords, or rigid academic lecturing. Use clear, simple language, active voice, and focus entirely on practical, actionable insights.

# The Solvd Business Model (The Baseline)
*   **What We Do:** We deploy custom software engineering, complex data transformations, cloud architecture, and tailored agentic AI implementations for Fortune 1000 organizations.
*   **Our Model:** We are a premium services studio. We do not sell pre-packaged SaaS software, platform subscriptions, fixed user licenses, or seat products.
*   **How We Sell:** Everything is bespoke, scoped alongside technical architects, and built through highly complex, unscripted Statements of Work (SOWs) driven by engineering pod sizing and developer hours.
*   **The Target Profile:** We require flat, individual contributor (IC) "hunters" who feel comfortable navigating highly abstract, deeply technical conversations with skeptical CTOs, CIOs, and Chief Data Officers. They must be capable of executing a direct outbound prospecting motion to self-source at least 50% of their pipeline from scratch.
*   **Target Compensation:** Base salary of $175,000 to $220,000 (scaled to experience) with an uncapped commission structure built on an initial $1,000,000 net-new revenue quota.

---

# Task 1: Resume & Profile Match Assessment
When presented with a candidate profile, provide a structured evaluation containing three specific sections:

**Output Format (strict):** Task 1 must contain EXACTLY these three subsections in this exact order — no extra sections, no additional headings, no commentary outside them:
1. **Overall Match Percentage:** — one percentage + one classification sentence
2. **🟢 Why They Look Good on Paper:** — bullet points only
3. **🔴 Why They Are a Mismatch / Need Pressure Testing:** — bullet points only

1.  **Overall Match Percentage:** State a clear percentage and a one-sentence summary classifying their core background (e.g., "Regulated SaaS Seller," "Elite Product Engineering Fit").
2.  **🟢 Why They Look Good on Paper:** Bullet points detailing relevant enterprise experience, technical literacy, hunting metrics, or premium consultancy pedigree.
3.  **🔴 Why They Are a Mismatch / Need Pressure Testing:** Call out critical misalignments. Focus heavily on:
    *   Vending off-the-shelf software packages instead of scoping abstract engineering hours.
    *   Lack of custom SOW creation experience.
    *   Reliance on giant corporate brand names or heavy inbound marketing loops vs. raw outbound hunting.
    *   Niche vertical focus (e.g., public sector or compliance) that does not translate to commercial Fortune 1000 hunting.
    *   Unexplained career gaps or sudden sector pivots.

**Company Type Verification (Mandatory Before Scoring):** Before writing a single bullet point, classify every company in the candidate's experience. Apply these rules strictly:
*   **SaaS / Platform / Subscription software (NOT relevant to Solvd's model):** Any company that sells software licenses, seat subscriptions, or recurring platform access. Examples include but are not limited to: H2O.ai, Databricks, Snowflake, Palantir (commercial platform), UiPath, ServiceNow, Salesforce, HubSpot, Oracle, SAP, Workday, Microsoft, AWS, GCP, Azure. A seller at H2O.ai was selling ML platform subscriptions — NOT custom engineering hours. Treat identically to any other SaaS seller.
*   **Custom Engineering / Professional Services (Directly Relevant):** Companies that bill clients for bespoke engineering work scoped through SOWs. Examples: ThoughtWorks, Accenture, Deloitte Digital, EPAM, Globant, Sapient, Publicis Sapient, McKinsey Engineering, BCG X, Infosys, Wipro, TCS (enterprise services). Candidates from these firms have directly applicable experience.
*   **When Uncertain:** Do not guess. State explicitly: "X is classified as [SaaS/Services/Unknown] because [brief rationale]." Never promote a SaaS seller to services-fit based on the word 'AI' or 'data' in the company name.

**Decision Rule:** End with a definitive recommendation: **ADVANCE** or **ARCHIVE**. If they are a mismatch, generate a polite, direct rejection note explaining the exact operational difference between a SaaS product model and Solvd's custom SOW engineering studio model.

---

# Task 2: Phone Screen Script Generation
If a candidate is a strong fit (80%+ match) and advances to an initial screen, draft a tailored, conversational interview script containing:

1.  **The Intro & Solvd Positioning (Mandatory First Move — Do NOT open with a question):** The recruiter must speak first with a tight 60-second framing that locks the candidate into Solvd's model before they can say anything. Cover: what Solvd is (custom engineering studio, no SaaS, no platform), the Tooploox acquisition, the agentic AI focus, and the exact commercial model (SOW-based, engineering pod hours, abstract scoping). Only after this anchor does the recruiter ask the first question. This prevents an executive candidate from steering the call into a generic leadership pitch.
2.  **Core Proving Questions:** Generate between 3 and 5 questions derived DIRECTLY from the specific red flags and mismatch points you identified in Task 1's "🔴 Why They Are a Mismatch" section. Do NOT use a pre-scripted set of generic axes. For each red flag bullet point you wrote, write at least one question that would validate or refute that specific concern for THIS candidate.

    Rules:
    *   Each question must be direct, operationally specific, and force a concrete verifiable answer — no soft openers.
    *   If a red flag is about deal size or sales complexity: ask them to walk through a specific deal at a specific dollar size.
    *   If a red flag is about SaaS background or product sales: ask them to describe a sale where THEY had to define scope and price abstract services without a pre-built product.
    *   If a red flag is about relying on brand/inbound: ask for specific self-sourced pipeline percentages and how they built it.
    *   If a red flag is about freelance/part-time history: ask them to explain the commercial structure and why they operated that way.
    *   ALWAYS include one final question about the IC reality check regardless of the profile: the role requires operating with zero support structure, $1M net-new quota, flat IC seat.
3.  **Compensation Alignment:** Clear parameters covering the $175k-$220k base, the $1M net-new quota, and the uncapped commission structure.

---

# Writing Restrictions (Strict Enforcement)
*   **Tone:** Highly scannable, direct, professional, and practical. Match the clean, executive energy of the hiring team.
*   **Banned Words:** Never use: delve, embark, enlightening, realm, revolutionize, game-changer, unlock, discover, skyrocket, disruptive, utilizing, dive deep, tapestry, illuminate, unveil, pivotal, intricate, elucidate, hence, furthermore, however, harness, exciting, groundbreaking, cutting-edge, remarkable, navigating, landscape, in summary, in conclusion, moreover, boost.
*   **Formatting:** Use clean markdown, distinct sections separated by horizontal rules (---), bold key phrases judiciously, and use standard bullet points. Never use em-dashes or semicolons. Always present data and exact numbers clearly without extra adjectives.
*   **Sparse Data:** When a role has no description, treat it as a LinkedIn data gap — not a red flag. Use your training knowledge of the company to infer its business model (services vs. product, consulting vs. SaaS). Always state explicitly when you are inferring vs. when you have direct evidence. Never penalize a candidate for an empty role description.
*   **Section Emojis:** In Task 1, "Why They Look Good on Paper" always uses 🟢 and "Why They Are a Mismatch" always uses 🔴. Never swap them.
*   **Language:** Conduct all assessments entirely in English.`;

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
    'systemPrompt', 'companyContext', 'autoAnalyze',
    'ashbyKey', 'roleConfigs',
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
    document.getElementById('system-prompt').value =
      data.systemPrompt !== undefined ? data.systemPrompt : DEFAULT_PROMPT;
    document.getElementById('company-context').value =
      data.companyContext !== undefined ? data.companyContext : DEFAULT_COMPANY_CONTEXT;
    document.getElementById('auto-analyze-toggle').checked = data.autoAnalyze !== false;
    document.getElementById('ashby-key').value = data.ashbyKey || '';

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
    systemPrompt:   document.getElementById('system-prompt').value.trim(),
    companyContext: document.getElementById('company-context').value.trim(),
    autoAnalyze:    document.getElementById('auto-analyze-toggle').checked,
    ashbyKey:       document.getElementById('ashby-key').value.trim(),
  }, () => {
    flash('Saved ✓', '');
  });
});

// ── Reset prompt ──────────────────────────────────────────────────────────────
document.getElementById('reset-btn').addEventListener('click', () => {
  document.getElementById('system-prompt').value = DEFAULT_PROMPT;
  flash('Reset to default (not saved yet)', 'warn');
});

function flash(msg, cls) {
  const fb = document.getElementById('feedback');
  fb.textContent = msg;
  fb.className   = cls;
  setTimeout(() => { fb.textContent = ''; fb.className = ''; }, 2800);
}

function flashGenerate(msg, cls) {
  const fb = document.getElementById('generate-feedback');
  fb.textContent = msg;
  fb.className   = cls;
  setTimeout(() => { fb.textContent = ''; fb.className = ''; }, 4000);
}

// ── Generate System Prompt from JD ───────────────────────────────────────────
function buildGenerationPrompt(companyContext, jd, currentPrompt) {
  const referencePrompt = (currentPrompt && currentPrompt.length > 100) ? currentPrompt : DEFAULT_PROMPT;
  return {
    system: `You are an expert at writing structured recruitment evaluation system prompts.
Generate a new system prompt adapted to the provided company context and job description. Follow ALL rules below exactly:

STRUCTURE — Keep these sections in this exact order:
1. Role & Objective
2. The [Company] Business Model (the baseline for evaluating fit)
3. Task 1: Resume & Profile Match Assessment
4. Task 2: Phone Screen Script Generation
5. Writing Restrictions

TASK 1 REQUIREMENTS:
- Keep the ADVANCE/ARCHIVE decision rule and the 80% threshold
- Keep the three subsections: Overall Match Percentage, Why They Look Good on Paper (🟢), Why They Are a Mismatch (🔴)
- Include a "Company Type Verification" subsection that instructs the evaluator to classify every company in the candidate's history as either (a) the relevant type for this role or (b) a mismatch type — with concrete examples from the target industry drawn from the JD. The evaluator must never infer a company sells custom/complex services just because its name includes a relevant buzzword (AI, data, cloud, etc.).

TASK 2 REQUIREMENTS:
- Keep the 3-part structure: Intro & Positioning, Core Proving Questions, Compensation Alignment
- The Intro section must explicitly instruct the recruiter NOT to open with a question — they must first deliver a 60-second anchor explaining what the company is and is NOT, and the exact commercial model, before the candidate speaks
- The Core Proving Questions must be derived DIRECTLY from the red flags identified in Task 1's mismatch section — not from a fixed set of generic axes. For each red flag, write at least one question that validates or refutes that specific concern for THIS candidate. Rules: no soft openers, each question must force a concrete verifiable answer, always include one final IC reality check question (zero support structure, initial $1M net-new quota, flat IC seat)

WRITING RESTRICTIONS — Keep intact:
- Same tone (scannable, direct, professional)
- Same banned words list
- Same formatting rules (no em-dashes, no semicolons, clean markdown)
- Same sparse-data rule (treat missing descriptions as a data gap, not a red flag)

REPLACE:
- Company name, description, and business model details
- Role requirements and compensation figures
- Fit signals and mismatch signals
- Company Type Verification examples (adapt them to the industry of the new role)

CRITICAL — Output format the generated prompt must enforce:
  Part 1: a single-line JSON — {"match_pct": <integer 0-100>, "verdict": "ADVANCE" or "ARCHIVE", "summary": "<2-3 sentence explanation>"}
  Then on its own line: ---FULL---
  Then Part 2: full Task 1 assessment (and Task 2 Phone Screen Script if verdict is ADVANCE and match_pct >= 80)

Output ONLY the new system prompt. No preamble, no explanation, no markdown fences.`,
    user: `REFERENCE PROMPT (structure and style to follow):
<reference>
${referencePrompt}
</reference>

COMPANY CONTEXT:
<company>
${companyContext}
</company>

JOB DESCRIPTION:
<jd>
${jd}
</jd>`,
  };
}

document.getElementById('generate-btn').addEventListener('click', async () => {
  const companyContext = document.getElementById('company-context').value.trim();
  const jd             = document.getElementById('jd-input').value.trim();

  if (!jd) { flashGenerate('Paste a job description first.', 'warn'); return; }

  const provider = document.getElementById('provider-select').value;
  const settings = {
    provider,
    anthropicKey:   document.getElementById('anthropic-key').value.trim(),
    anthropicModel: document.getElementById('anthropic-model').value,
    openaiBaseUrl:  document.getElementById('openai-base-url').value.trim(),
    openaiKey:      document.getElementById('openai-key').value.trim(),
    openaiModel:    document.getElementById('openai-model').value.trim(),
    geminiKey:      document.getElementById('gemini-key').value.trim(),
    geminiModel:    document.getElementById('gemini-model').value.trim() || 'gemini-1.5-flash',
  };

  const activeKey =
    provider === 'gemini'       ? settings.geminiKey  :
    provider === 'openai-compat' ? settings.openaiKey  :
    settings.anthropicKey;

  if (!activeKey) { flashGenerate('Enter your API key first.', 'warn'); return; }

  const btn = document.getElementById('generate-btn');
  btn.disabled    = true;
  btn.textContent = 'Generating…';

  try {
    const currentPrompt = document.getElementById('system-prompt').value.trim();
    const { system, user } = buildGenerationPrompt(companyContext, jd, currentPrompt);
    const result = await callAI(settings, system, user);
    document.getElementById('system-prompt').value = result.trim();
    flashGenerate('Generated ✓ — review and Save.', '');
  } catch (err) {
    flashGenerate('Error: ' + err.message, 'warn');
  } finally {
    btn.disabled    = false;
    btn.textContent = '✨ Generate System Prompt';
  }
});

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
    list.innerHTML = '<p class="role-empty">No roles configured. Use the legacy system prompt below, or add a role.</p>';
    document.getElementById('legacy-prompt-section').style.display = '';
    return;
  }
  document.getElementById('legacy-prompt-section').style.display = 'none';

  list.innerHTML = configs.map(r => `
    <div class="role-item" data-id="${r.id}">
      <span class="role-item-name">${escHtml(r.name)}</span>
      ${r.isActive ? '<span class="role-active-badge">Active</span>' : ''}
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
}

function openRoleEditor(roleId, configs) {
  const role = configs.find(r => r.id === roleId);
  if (!role) return;
  editingRoleId = roleId;
  document.getElementById('role-editor-title').textContent = `Editing: ${role.name}`;
  document.getElementById('editing-role-id').value         = roleId;
  document.getElementById('role-name-input').value         = role.name;
  document.getElementById('role-company-context').value    = role.companyContext || '';
  document.getElementById('role-system-prompt').value      = role.systemPrompt   || '';
  document.getElementById('role-editor').classList.add('visible');
  document.getElementById('role-name-input').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

document.getElementById('add-role-btn').addEventListener('click', () => {
  editingRoleId = null;
  document.getElementById('role-editor-title').textContent = 'New Role';
  document.getElementById('editing-role-id').value         = '';
  document.getElementById('role-name-input').value         = '';
  document.getElementById('role-company-context').value    = '';
  document.getElementById('role-system-prompt').value      = '';
  document.getElementById('role-editor').classList.add('visible');
  document.getElementById('role-name-input').focus();
});

document.getElementById('upgrade-prompt-btn').addEventListener('click', async () => {
  const context = document.getElementById('role-company-context').value.trim();
  const fb      = document.getElementById('role-editor-feedback');
  if (!context) { fb.textContent = 'Add company context first.'; setTimeout(() => { fb.textContent = ''; }, 3000); return; }

  const provider = document.getElementById('provider-select').value;
  const settings = {
    provider,
    anthropicKey:   document.getElementById('anthropic-key').value.trim(),
    anthropicModel: document.getElementById('anthropic-model').value,
    openaiBaseUrl:  document.getElementById('openai-base-url').value.trim(),
    openaiKey:      document.getElementById('openai-key').value.trim(),
    openaiModel:    document.getElementById('openai-model').value.trim(),
    geminiKey:      document.getElementById('gemini-key').value.trim(),
    geminiModel:    document.getElementById('gemini-model').value.trim() || 'gemini-1.5-flash',
  };
  const activeKey =
    provider === 'gemini'        ? settings.geminiKey :
    provider === 'openai-compat' ? settings.openaiKey :
    settings.anthropicKey;
  if (!activeKey) { fb.textContent = 'Enter API key first.'; setTimeout(() => { fb.textContent = ''; }, 3000); return; }

  const btn = document.getElementById('upgrade-prompt-btn');
  btn.disabled    = true;
  btn.textContent = 'Upgrading…';
  try {
    const existingPrompt = document.getElementById('role-system-prompt').value.trim();
    const { system, user } = buildGenerationPrompt(context, '(infer a senior IC enterprise sales hunter role from the company context above)', existingPrompt);
    const result = await callAI(settings, system, user);
    document.getElementById('role-system-prompt').value = result.trim();
    fb.textContent = 'Generated ✓ — review and Save Role.';
    setTimeout(() => { fb.textContent = ''; }, 4000);
  } catch (err) {
    fb.textContent = 'Error: ' + err.message;
    setTimeout(() => { fb.textContent = ''; }, 4000);
  } finally {
    btn.disabled    = false;
    btn.textContent = '↑ Upgrade Prompt';
  }
});

document.getElementById('cancel-role-btn').addEventListener('click', () => {
  document.getElementById('role-editor').classList.remove('visible');
  editingRoleId = null;
});

document.getElementById('save-role-btn').addEventListener('click', async () => {
  const name    = document.getElementById('role-name-input').value.trim();
  const context = document.getElementById('role-company-context').value.trim();
  const prompt  = document.getElementById('role-system-prompt').value.trim();
  const fb      = document.getElementById('role-editor-feedback');

  if (!name) { fb.textContent = 'Name is required.'; return; }

  const { roleConfigs = [] } = await chrome.storage.local.get('roleConfigs');

  if (editingRoleId) {
    const idx = roleConfigs.findIndex(r => r.id === editingRoleId);
    if (idx >= 0) {
      const wasActive = roleConfigs[idx].isActive;
      roleConfigs[idx] = { ...roleConfigs[idx], name, companyContext: context, systemPrompt: prompt };
      if (wasActive) await clearUrlCache();
    }
  } else {
    const isFirst = roleConfigs.length === 0;
    roleConfigs.push({
      id:             `role_${Date.now()}`,
      name,
      companyContext: context,
      systemPrompt:   prompt,
      isActive:       isFirst,
    });
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
  if (updated.length && !updated.some(r => r.isActive)) updated[0].isActive = true;
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
