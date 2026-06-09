let activeProjectId = null;

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
      renderAll();
    });
  });

  // Auto-select first project if none active
  if (!activeProjectId || !projects.find(p => p.id === activeProjectId)) {
    activeProjectId = projects[0].id;
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
    const rows = project.candidates.map((c, i) => {
      const cls        = c.verdict === 'ADVANCE' ? 'advance' : 'archive';
      const hasAnalysis = !!c.fullAnalysis;
      return `<tr>
        <td><a class="name-link" href="${esc(c.url)}" target="_blank">${esc(c.name)}</a></td>
        <td><span class="match-cell ${cls}">${c.matchPct}%</span></td>
        <td><span class="badge ${cls}">${c.verdict}</span></td>
        <td class="date-cell">${formatDate(c.addedAt)}</td>
        <td class="action-cell">
          <button class="view-btn${hasAnalysis ? '' : ' disabled'}" data-idx="${i}" title="${hasAnalysis ? 'View full analysis' : 'No analysis stored'}">View</button>
          <button class="dl-btn" data-idx="${i}" title="Download analysis JSON">↓</button>
          <button class="remove-btn" data-idx="${i}" title="Remove">×</button>
        </td>
      </tr>`;
    }).join('');

    container.innerHTML = `
      <div class="main-header">
        <h2>${esc(project.name)}</h2>
        <div class="header-actions">
          ${exportAllBtn}
          ${deleteBtn}
        </div>
      </div>
      <table>
        <thead><tr>
          <th>Candidate</th>
          <th>Match</th>
          <th>Verdict</th>
          <th>Added</th>
          <th></th>
        </tr></thead>
        <tbody>${rows}</tbody>
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
document.getElementById('backup-btn').addEventListener('click', async () => {
  const projects = await getProjects();
  const { version } = chrome.runtime.getManifest();
  const date = new Date().toISOString().slice(0, 10);
  downloadJSON(
    { candidatehunter_backup: true, version, exportedAt: new Date().toISOString(), projects },
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

  const existing    = await getProjects();
  const existingIds = new Set(existing.map(p => p.id));
  const toAdd       = data.projects.filter(p => p.id && !existingIds.has(p.id));
  const skipped     = data.projects.length - toAdd.length;

  if (toAdd.length === 0) {
    showToast(`Todos los proyectos ya existen${skipped ? ` (${skipped} omitidos)` : ''}`, 'info');
    return;
  }

  await saveProjects([...toAdd, ...existing]);
  if (!activeProjectId) activeProjectId = toAdd[0].id;
  renderAll();

  const added  = `${toAdd.length} proyecto${toAdd.length > 1 ? 's' : ''} importado${toAdd.length > 1 ? 's' : ''}`;
  const skip   = skipped ? `, ${skipped} ya existía${skipped > 1 ? 'n' : ''}` : '';
  showToast(added + skip, 'success');
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
