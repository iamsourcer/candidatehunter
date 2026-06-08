function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
      ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch (_) { return iso; }
}

function render(history) {
  const container = document.getElementById('content');

  if (!history || history.length === 0) {
    container.innerHTML = '<p class="empty-state">No candidates analyzed yet.</p>';
    return;
  }

  const rows = history.map(e => {
    const cls = e.verdict === 'ADVANCE' ? 'advance' : 'archive';
    const safeName = e.name
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeUrl  = e.url
      .replace(/"/g, '%22');
    return `<tr>
      <td><a class="name-link" href="${safeUrl}" target="_blank">${safeName}</a></td>
      <td><span class="match-pct ${cls}">${e.matchPct}%</span></td>
      <td><span class="badge ${cls}">${e.verdict}</span></td>
      <td class="date-cell">${formatDate(e.date)}</td>
    </tr>`;
  }).join('');

  container.innerHTML = `
    <table>
      <thead><tr>
        <th>Candidate</th>
        <th>Match</th>
        <th>Verdict</th>
        <th>Date</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

chrome.storage.local.get('candidateHistory', ({ candidateHistory }) => {
  render(candidateHistory);
});

document.getElementById('clear-btn').addEventListener('click', () => {
  if (!confirm('Clear all candidate history?')) return;
  chrome.storage.local.remove('candidateHistory', () => {
    render([]);
  });
});
