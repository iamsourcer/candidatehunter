let activeProjectId = null;
let filterText    = '';
let filterVerdict = 'all';

// ── Storage helpers ───────────────────────────────────────────────────────────
async function getProjects() {
  const { projects = [] } = await chrome.storage.local.get('projects');
  return projects;
}

async function saveProjects(projects) {
  await chrome.storage.local.set({ projects });
}

// ── Rendering ─────────────────────────────────────────────────────────────────
function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
      ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch (_) { return iso; }
}

async function renderSidebar() {
  const projects = await getProjects();
  const list = document.getElementById('project-list');

  if (projects.length === 0) {
    list.innerHTML = '<div class="sidebar-empty">No projects yet.</div>';
    renderMain(null, null);
    return;
  }

  list.innerHTML = projects.map(p => `
    <div class="project-item${p.id === activeProjectId ? ' active' : ''}" data-id="${p.id}">
      <span class="project-name">${esc(p.name)}</span>
      <span class="project-count">${p.candidates.length}</span>
    </div>
  `).join('');

  list.querySelectorAll('.project-item').forEach(el => {
    el.addEventListener('click', () => {
      activeProjectId = el.dataset.id;
      filterText    = '';
      filterVerdict = 'all';
      renderAll();
    });
  });

  // Auto-select first project if none active
  if (!activeProjectId || !projects.find(p => p.id === activeProjectId)) {
    activeProjectId = projects[0].id;
    chrome.storage.local.set({ lastActiveProjectId: activeProjectId });
    renderAll();
    return;
  }

  const active = projects.find(p => p.id === activeProjectId);
  renderMain(active, projects);
}

function renderMain(project, projects) {
  const container = document.getElementById('main-content');

  if (!project) {
    container.innerHTML = '<div class="empty-state">Create a project to start organizing candidates.</div>';
    return;
  }

  const deleteBtn    = `<button id="delete-project-btn">Delete Project</button>`;
  const exportAllBtn = `<button id="export-all-btn">↓ Export All</button>`;

  if (project.candidates.length === 0) {
    container.innerHTML = `
      <div class="main-header">
        <h2>${esc(project.name)}</h2>
        <div class="header-actions">${deleteBtn}</div>
      </div>
      <div class="empty-state">No candidates yet.<br>Add them from the extension popup on a LinkedIn profile.</div>`;
  } else {
    const allCandidates = project.candidates;
    const visible = allCandidates.filter(c =>
      (!filterText || c.name.toLowerCase().includes(filterText.toLowerCase())) &&
      (filterVerdict === 'all' || c.verdict === filterVerdict)
    );

    const rows = visible.map((c) => {
      const realIdx    = allCandidates.indexOf(c);
      const cls        = { 'ADVANCE': 'advance', 'HOLD': 'hold', 'LONG SHOT': 'long-shot', 'DO NOT ADVANCE': 'archive', 'ARCHIVE': 'archive' }[c.verdict] || 'archive';
      const hasAnalysis = !!c.fullAnalysis;
      const screened   = c.postCall || c.phoneScreenTranscripts?.length;
      return `<tr>
        <td><a class="name-link" href="${esc(c.url)}" target="_blank">${esc(c.name)}</a>${screened ? ' <span title="Phone screen done — verdict reflects the call">📞</span>' : ''}</td>
        <td><span class="match-cell ${cls}">${c.matchPct}%</span></td>
        <td><span class="badge ${cls}">${c.verdict}</span></td>
        <td class="date-cell">${formatDate(c.addedAt)}</td>
        <td class="action-cell">
          <button class="view-btn${hasAnalysis ? '' : ' disabled'}" data-idx="${realIdx}" title="${hasAnalysis ? 'View full analysis' : 'No analysis stored'}">View</button>
          <button class="dl-btn" data-idx="${realIdx}" title="Download analysis JSON">↓</button>
          <button class="remove-btn" data-idx="${realIdx}" title="Remove">×</button>
        </td>
      </tr>`;
    }).join('');

    const countText = visible.length < allCandidates.length
      ? `<span id="filter-count" style="font-size:12px;color:#999;margin-left:4px">${visible.length} of ${allCandidates.length}</span>`
      : `<span id="filter-count" style="font-size:12px;color:#999;margin-left:4px">${allCandidates.length} candidate${allCandidates.length !== 1 ? 's' : ''}</span>`;

    container.innerHTML = `
      <div class="main-header">
        <h2>${esc(project.name)}</h2>
        <div class="header-actions">
          ${exportAllBtn}
          ${deleteBtn}
        </div>
      </div>
      <div id="filter-bar" style="display:flex;gap:8px;align-items:center;margin:0 0 12px;flex-wrap:wrap">
        <input id="filter-text" type="text" value="${esc(filterText)}" placeholder="Filter by name…"
          style="flex:1;min-width:140px;padding:6px 10px;border:1px solid #ddd;border-radius:4px;font-size:13px;font-family:inherit">
        <button class="verdict-filter${filterVerdict==='all'?' vf-active':''}" data-v="all">All</button>
        <button class="verdict-filter${filterVerdict==='ADVANCE'?' vf-active':''}" data-v="ADVANCE">ADVANCE</button>
        <button class="verdict-filter${filterVerdict==='HOLD'?' vf-active':''}" data-v="HOLD">HOLD</button>
        <button class="verdict-filter${filterVerdict==='LONG SHOT'?' vf-active':''}" data-v="LONG SHOT">LONG SHOT</button>
        <button class="verdict-filter${filterVerdict==='DO NOT ADVANCE'?' vf-active':''}" data-v="DO NOT ADVANCE">DO NOT ADVANCE</button>
        <button class="verdict-filter${filterVerdict==='ARCHIVE'?' vf-active':''}" data-v="ARCHIVE">ARCHIVE</button>
        ${countText}
      </div>
      <table>
        <thead><tr>
          <th>Candidate</th>
          <th>Match</th>
          <th>Verdict</th>
          <th>Added</th>
          <th></th>
        </tr></thead>
        <tbody>${rows.length ? rows : '<tr><td colspan="5" style="text-align:center;color:#aaa;padding:20px">No candidates match the filter.</td></tr>'}</tbody>
      </table>`;

    // View full analysis
    container.querySelectorAll('.view-btn:not(.disabled)').forEach(btn => {
      btn.addEventListener('click', async () => {
        const idx = parseInt(btn.dataset.idx, 10);
        const all = await getProjects();
        const proj = all.find(p => p.id === activeProjectId);
        if (!proj) return;
        const c = proj.candidates[idx];
        await chrome.storage.local.set({
          lastAnalysis:      c.fullAnalysis,
          lastCandidateName: c.name,
          lastVerdict:       c.verdict,
          lastMatch:         c.matchPct,
        });
        chrome.tabs.create({ url: chrome.runtime.getURL('analysis.html') });
      });
    });

    // Download individual candidate JSON
    container.querySelectorAll('.dl-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const idx = parseInt(btn.dataset.idx, 10);
        const all = await getProjects();
        const proj = all.find(p => p.id === activeProjectId);
        if (!proj) return;
        const c = proj.candidates[idx];
        downloadJSON(c, `${c.name.replace(/\s+/g, '_')}_analysis.json`);
      });
    });

    // Remove candidate
    container.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const idx = parseInt(btn.dataset.idx, 10);
        const all = await getProjects();
        const proj = all.find(p => p.id === activeProjectId);
        if (!proj) return;
        proj.candidates.splice(idx, 1);
        await saveProjects(all);
        renderAll();
      });
    });

    // Filter bar listeners
    let filterDebounce;
    document.getElementById('filter-text')?.addEventListener('input', (e) => {
      clearTimeout(filterDebounce);
      filterDebounce = setTimeout(() => {
        filterText = e.target.value;
        renderMain(project, projects);
      }, 150);
    });
    container.querySelectorAll('.verdict-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        filterVerdict = btn.dataset.v;
        renderMain(project, projects);
      });
    });

    // Export all candidates in project
    document.getElementById('export-all-btn').addEventListener('click', async () => {
      const all = await getProjects();
      const proj = all.find(p => p.id === activeProjectId);
      if (!proj) return;
      downloadJSON(
        { project: proj.name, exportedAt: new Date().toISOString(), candidates: proj.candidates },
        `${proj.name.replace(/\s+/g, '_')}_candidates.json`,
      );
    });
  }

  document.getElementById('delete-project-btn').addEventListener('click', async () => {
    const proj = (await getProjects()).find(p => p.id === activeProjectId);
    if (!proj) return;
    if (!confirm(`Delete project "${proj.name}" and all its candidates?`)) return;
    const all = (await getProjects()).filter(p => p.id !== activeProjectId);
    await saveProjects(all);
    activeProjectId = null;
    renderAll();
  });
}

async function renderAll() {
  const projects = await getProjects();
  const list = document.getElementById('project-list');

  if (projects.length === 0) {
    list.innerHTML = '<div class="sidebar-empty">No projects yet.</div>';
    document.getElementById('main-content').innerHTML =
      '<div class="empty-state">Create a project to start organizing candidates.</div>';
    return;
  }

  if (!activeProjectId || !projects.find(p => p.id === activeProjectId)) {
    activeProjectId = projects[0].id;
    chrome.storage.local.set({ lastActiveProjectId: activeProjectId });
  }

  list.innerHTML = projects.map(p => `
    <div class="project-item${p.id === activeProjectId ? ' active' : ''}" data-id="${p.id}">
      <span class="project-name">${esc(p.name)}</span>
      <span class="project-count">${p.candidates.length}</span>
    </div>
  `).join('');

  list.querySelectorAll('.project-item').forEach(el => {
    el.addEventListener('click', () => {
      activeProjectId = el.dataset.id;
      chrome.storage.local.set({ lastActiveProjectId: activeProjectId });
      filterText    = '';
      filterVerdict = 'all';
      renderAll();
    });
  });

  const active = projects.find(p => p.id === activeProjectId);
  renderMain(active, projects);
}

// ── New project form ──────────────────────────────────────────────────────────
document.getElementById('new-project-btn').addEventListener('click', () => {
  const form = document.getElementById('new-project-form');
  form.classList.add('visible');
  document.getElementById('new-project-name').focus();
});

document.getElementById('cancel-project-btn').addEventListener('click', () => {
  document.getElementById('new-project-form').classList.remove('visible');
  document.getElementById('new-project-name').value = '';
});

document.getElementById('create-project-btn').addEventListener('click', async () => {
  const name = document.getElementById('new-project-name').value.trim();
  if (!name) {
    document.getElementById('new-project-name').focus();
    return;
  }
  const projects = await getProjects();
  const project = {
    id:         String(Date.now()),
    name,
    createdAt:  new Date().toISOString(),
    candidates: [],
  };
  projects.unshift(project);
  await saveProjects(projects);
  activeProjectId = project.id;
  document.getElementById('new-project-form').classList.remove('visible');
  document.getElementById('new-project-name').value = '';
  renderAll();
});

document.getElementById('new-project-name').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('create-project-btn').click();
  if (e.key === 'Escape') document.getElementById('cancel-project-btn').click();
});

// ── Backup / restore ──────────────────────────────────────────────────────────
const SETTINGS_KEYS = [
  'provider', 'anthropicModel',
  'openaiBaseUrl', 'openaiModel',
  'geminiModel',
  'systemPrompt', 'companyContext',
  'roleConfigs', 'autoAnalyze', 'highlightEnabled',
  // API keys — exported but only restored when empty on import
  'anthropicKey', 'openaiKey', 'geminiKey', 'ashbyKey',
];
const API_KEY_FIELDS = new Set(['anthropicKey', 'openaiKey', 'geminiKey', 'ashbyKey']);

document.getElementById('backup-btn').addEventListener('click', async () => {
  const projects = await getProjects();
  const rawSettings = await chrome.storage.local.get(SETTINGS_KEYS);
  const settings = Object.fromEntries(
    Object.entries(rawSettings).filter(([, v]) => v !== undefined && v !== null && v !== '')
  );
  const { version } = chrome.runtime.getManifest();
  const date = new Date().toISOString().slice(0, 10);
  downloadJSON(
    { candidatehunter_backup: true, version, exportedAt: new Date().toISOString(), projects, settings },
    `candidatehunter_backup_${date}.json`,
  );
});

document.getElementById('restore-btn').addEventListener('click', () => {
  document.getElementById('backup-file-input').click();
});

document.getElementById('backup-file-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;

  let data;
  try { data = JSON.parse(await file.text()); }
  catch (_) { showToast('Archivo JSON inválido', 'error'); return; }

  if (!data.candidatehunter_backup || !Array.isArray(data.projects)) {
    showToast('No es un backup de CandidateHunter', 'error');
    return;
  }

  // ── Restore projects (merge by ID) ──
  const existing    = await getProjects();
  const existingIds = new Set(existing.map(p => p.id));
  const toAdd       = data.projects.filter(p => p.id && !existingIds.has(p.id));
  const skipped     = data.projects.length - toAdd.length;

  if (toAdd.length > 0) {
    await saveProjects([...toAdd, ...existing]);
    if (!activeProjectId) activeProjectId = toAdd[0].id;
    renderAll();
  }

  // ── Restore settings ──
  let settingsRestored = 0;
  if (data.settings && typeof data.settings === 'object') {
    const current = await chrome.storage.local.get(SETTINGS_KEYS);
    const toRestore = {};
    for (const [k, v] of Object.entries(data.settings)) {
      if (!SETTINGS_KEYS.includes(k)) continue;
      if (API_KEY_FIELDS.has(k)) {
        // Only restore API keys if not already set
        if (!current[k]) { toRestore[k] = v; settingsRestored++; }
      } else {
        toRestore[k] = v;
        settingsRestored++;
      }
    }
    if (Object.keys(toRestore).length > 0)
      await chrome.storage.local.set(toRestore);
  }

  // ── Toast summary ──
  const parts = [];
  if (toAdd.length > 0)
    parts.push(`${toAdd.length} project${toAdd.length > 1 ? 's' : ''} imported${skipped ? ` (${skipped} already existed)` : ''}`);
  else if (skipped > 0)
    parts.push(`Projects already existed`);
  if (settingsRestored > 0)
    parts.push(`settings restored`);
  if (parts.length === 0)
    showToast('Nothing new to import', 'info');
  else
    showToast(parts.join(' · '), 'success');
});

function showToast(msg, type = 'info') {
  let toast = document.getElementById('backup-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'backup-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className   = `backup-toast toast-${type} vis`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('vis'), 3500);
}

// ── Download helper ───────────────────────────────────────────────────────────
function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Utility ───────────────────────────────────────────────────────────────────
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Init ──────────────────────────────────────────────────────────────────────
renderAll();
