import { callAI, buildSourcingMessage } from './shared.js';

const SOURCING_SYSTEM_PROMPT = 'You are a sourcing strategist. Return only valid JSON with no markdown.';

let activeRole = null;

async function init() {
  const { roleConfigs } = await chrome.storage.local.get('roleConfigs');
  const active = (roleConfigs || []).find(r => r.isActive);

  activeRole = active || null;

  if (active) {
    document.getElementById('role-badge').textContent        = active.name;
    document.getElementById('role-badge-wrap').style.display = 'block';
    generate();
  } else {
    document.getElementById('ad-hoc-jd').style.display   = 'block';
    document.getElementById('generate-btn').style.display = 'block';
    document.getElementById('generate-btn').addEventListener('click', generate);
    document.getElementById('options-link').addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });
  }

  document.getElementById('regenerate-link').addEventListener('click', (e) => {
    e.preventDefault();
    generate();
  });

  document.getElementById('copy-boolean').addEventListener('click', () => copySection('copy-boolean', document.getElementById('boolean-string').textContent));
  document.getElementById('copy-terms').addEventListener('click', () => copySection('copy-terms', buildTermsText()));
  document.getElementById('copy-questions').addEventListener('click', () => copySection('copy-questions', buildQuestionsText()));
}

async function generate() {
  const btn    = document.getElementById('generate-btn');
  const status = document.getElementById('status');
  if (btn) { btn.disabled = true; btn.textContent = 'Generating…'; }
  status.textContent = 'Generating…';
  status.className   = '';
  document.getElementById('results').style.display = 'none';

  const settings = await chrome.storage.local.get([
    'provider', 'anthropicKey', 'apiKey',
    'openaiBaseUrl', 'openaiKey', 'openaiModel',
    'geminiKey', 'geminiModel',
  ]);
  const activeKey =
    settings.provider === 'gemini'        ? settings.geminiKey :
    settings.provider === 'openai-compat' ? settings.openaiKey :
    (settings.anthropicKey || settings.apiKey);

  if (!activeKey) {
    status.textContent = '⚠ No API key set. Open Options to configure one.';
    status.className   = 'error';
    if (btn) { btn.disabled = false; btn.textContent = 'Generate'; }
    return;
  }

  const jd         = activeRole
    ? (activeRole.jd || '')
    : (document.getElementById('ad-hoc-jd')?.value?.trim() || '');
  const companyCtx = activeRole ? (activeRole.companyContext || '') : '';

  if (!jd && !activeRole) {
    status.textContent = '⚠ Describe the role first.';
    status.className   = 'error';
    if (btn) { btn.disabled = false; btn.textContent = 'Generate'; }
    return;
  }

  const userMessage = buildSourcingMessage(jd, companyCtx, '');

  try {
    const raw    = await callAI(settings, SOURCING_SYSTEM_PROMPT, userMessage);
    const parsed = parseSourcingResponse(raw);
    renderResults(parsed);
    status.textContent = '';
    document.getElementById('results').style.display = 'block';
    document.getElementById('regenerate-link').style.display = 'inline';
  } catch (err) {
    status.textContent = '⚠ ' + err.message;
    status.className   = 'error';
  }

  if (btn) { btn.disabled = false; btn.textContent = 'Generate'; }
}

function parseSourcingResponse(raw) {
  const text  = raw.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
  const start = text.indexOf('{');
  const end   = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON found in response.');
  return JSON.parse(text.slice(start, end + 1));
}

function renderResults(data) {
  document.getElementById('boolean-string').textContent = data.boolean_string || '(none)';

  const terms = data.terminology || {};
  renderPills('terms-basic',  terms.basic  || [], 'basic');
  renderPills('terms-deep',   terms.deep   || [], 'deep');
  renderPills('terms-expert', terms.expert || [], 'expert');

  const questionsEl = document.getElementById('questions');
  questionsEl.innerHTML = (data.differentiating_questions || []).map((q, i) => `
    <div class="question-item">
      <div class="question-text">${i + 1}. ${esc(q.question)}</div>
      ${q.why ? `<div class="question-why">→ ${esc(q.why)}</div>` : ''}
    </div>
  `).join('');
}

function renderPills(containerId, terms, cls) {
  document.getElementById(containerId).innerHTML =
    terms.map(t => `<span class="term-pill ${cls}">${esc(t)}</span>`).join('');
}

function buildTermsText() {
  const terms = {};
  ['basic', 'deep', 'expert'].forEach(level => {
    const pills = document.getElementById(`terms-${level}`);
    terms[level] = Array.from(pills.querySelectorAll('.term-pill')).map(el => el.textContent);
  });
  return [
    'Basic: '  + terms.basic.join(', '),
    'Deep: '   + terms.deep.join(', '),
    'Expert: ' + terms.expert.join(', '),
  ].join('\n');
}

function buildQuestionsText() {
  return Array.from(document.querySelectorAll('.question-item')).map(el => {
    const q = el.querySelector('.question-text')?.textContent || '';
    const w = el.querySelector('.question-why')?.textContent  || '';
    return q + (w ? '\n' + w : '');
  }).join('\n\n');
}

async function copySection(btnId, text) {
  try {
    await navigator.clipboard.writeText(text);
    const btn  = document.getElementById(btnId);
    const prev = btn.textContent;
    btn.textContent = '✓ Copied';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = prev; btn.classList.remove('copied'); }, 2000);
  } catch (_) {}
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

init();
