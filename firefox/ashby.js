let ashbyKey   = '';
let activeJobId = null;

// ── Ashby API helper ──────────────────────────────────────────────────────────
async function ashbyFetch(endpoint, body = {}) {
  const res = await fetch(`https://api.ashbyhq.com${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Basic ${btoa(ashbyKey + ':')}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Ashby API error ${res.status}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.errors?.[0] || 'Ashby error');
  return data.results;
}

// ── Job list ──────────────────────────────────────────────────────────────────
async function loadJobs() {
  const list = document.getElementById('job-list');
  list.innerHTML = '<div class="sidebar-msg">Loading…</div>';
  try {
    const jobs = await ashbyFetch('/job.list', { status: 'Open' });
    if (!jobs?.length) {
      list.innerHTML = '<div class="sidebar-msg">No open jobs found.</div>';
      return;
    }
    list.innerHTML = jobs.map(j => `
      <div class="job-item${j.id === activeJobId ? ' active' : ''}" data-id="${j.id}" data-title="${esc(j.title)}">
        <div class="job-title">${esc(j.title)}</div>
        ${j.department?.name ? `<div class="job-dept">${esc(j.department.name)}</div>` : ''}
      </div>
    `).join('');

    list.querySelectorAll('.job-item').forEach(el => {
      el.addEventListener('click', () => {
        activeJobId = el.dataset.id;
        document.querySelectorAll('.job-item').forEach(i => i.classList.remove('active'));
        el.classList.add('active');
        loadApplicants(el.dataset.id, el.dataset.title);
      });
    });

    // Auto-select first job
    if (!activeJobId && jobs.length) {
      const first = list.querySelector('.job-item');
      if (first) first.click();
    }
  } catch (err) {
    list.innerHTML = `<div class="sidebar-msg" style="color:#c0392b">Error: ${esc(err.message)}</div>`;
  }
}

// ── Applicants ────────────────────────────────────────────────────────────────
async function loadApplicants(jobId, jobTitle) {
  const container = document.getElementById('main-content');
  container.innerHTML = `
    <div class="main-header"><h2>${esc(jobTitle)}</h2></div>
    <p class="loading-msg">Loading candidates…</p>`;

  try {
    const applications = await ashbyFetch('/application.list', { jobId, status: 'Active' });
    if (!applications?.length) {
      container.innerHTML = `
        <div class="main-header"><h2>${esc(jobTitle)}</h2></div>
        <div class="empty-state">No active candidates for this job.</div>`;
      return;
    }

    // Batch fetch candidate.info in groups of 5
    const candidates = await batchFetch(applications.map(a => a.candidate?.id).filter(Boolean));
    const candidateMap = Object.fromEntries(candidates.map(c => [c.id, c]));

    const rows = applications.map(app => {
      const cand       = candidateMap[app.candidate?.id] || {};
      const liUrl      = cand.linkedInUrl || '';
      const cleanLiUrl = liUrl ? liUrl.split('?')[0] : '';
      const stage      = app.currentInterviewStage?.title || app.status || '—';
      const appliedAt  = app.createdAt
        ? new Date(app.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
        : '—';
      const hasLi      = !!cleanLiUrl;

      return `<tr>
        <td class="candidate-name">${esc(cand.name || app.candidate?.name || 'Unknown')}</td>
        <td><span class="stage-badge">${esc(stage)}</span></td>
        <td class="date-cell">${appliedAt}</td>
        <td class="action-cell">
          <button class="li-btn${hasLi ? '' : ' no-li'}"
            data-li="${esc(cleanLiUrl)}"
            title="${hasLi ? 'Open LinkedIn profile' : 'No LinkedIn URL stored'}">
            ${hasLi ? 'LinkedIn →' : 'No LinkedIn'}
          </button>
        </td>
      </tr>`;
    }).join('');

    container.innerHTML = `
      <div class="main-header"><h2>${esc(jobTitle)}</h2></div>
      <table>
        <thead><tr>
          <th>Candidate</th>
          <th>Stage</th>
          <th>Applied</th>
          <th>Actions</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;

    container.querySelectorAll('.li-btn:not(.no-li)').forEach(btn => {
      btn.addEventListener('click', () => {
        chrome.tabs.create({ url: btn.dataset.li });
      });
    });

  } catch (err) {
    container.innerHTML = `
      <div class="main-header"><h2>${esc(jobTitle)}</h2></div>
      <p class="error-msg">Error loading candidates: ${esc(err.message)}</p>`;
  }
}

// Fetch candidate.info in batches of 5
async function batchFetch(candidateIds) {
  const results = [];
  for (let i = 0; i < candidateIds.length; i += 5) {
    const batch = candidateIds.slice(i, i + 5);
    const fetched = await Promise.all(
      batch.map(id =>
        ashbyFetch('/candidate.info', { id }).catch(() => null)
      )
    );
    results.push(...fetched.filter(Boolean));
  }
  return results;
}

// ── Utility ───────────────────────────────────────────────────────────────────
function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.getElementById('go-settings-btn')?.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

document.getElementById('refresh-btn').addEventListener('click', () => {
  loadJobs();
});

chrome.storage.local.get('ashbyKey', ({ ashbyKey: key }) => {
  if (!key) {
    document.getElementById('no-key-banner').style.display  = '';
    document.getElementById('main-layout').style.display    = 'none';
    return;
  }
  ashbyKey = key;
  document.getElementById('no-key-banner').style.display = 'none';
  document.getElementById('main-layout').style.display   = '';
  loadJobs();
});
