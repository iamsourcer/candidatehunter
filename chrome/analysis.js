function fixEmojis(text) {
  return text.split('\n').map(line =>
    (line.includes('🟢') && /mismatch|pressure.testing/i.test(line))
      ? line.replace(/🟢/g, '🔴')
      : line
  ).join('\n');
}

function renderMarkdown(text) {
  if (!text) return '<p class="empty-state">No analysis available. Run an analysis from the extension popup first.</p>';

  const esc = s => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  function applyInline(s) {
    return s
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*\n]+?)\*/g,  '<em>$1</em>')
      .replace(/`([^`]+?)`/g,       '<code>$1</code>');
  }

  const lines  = text.split('\n');
  let   html   = '';
  let   inUl   = false;
  let   inOl   = false;

  const closeUl = () => { if (inUl) { html += '</ul>\n'; inUl = false; } };
  const closeOl = () => { if (inOl) { html += '</ol>\n'; inOl = false; } };
  const closeLists = () => { closeUl(); closeOl(); };

  for (const raw of lines) {
    const line = raw;

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      closeLists();
      html += '<hr>\n';
      continue;
    }

    // H2 / H3 / H1
    if (/^### /.test(line)) {
      closeLists();
      html += `<h3>${applyInline(esc(line.slice(4).trim()))}</h3>\n`;
      continue;
    }
    if (/^## /.test(line)) {
      closeLists();
      html += `<h2>${applyInline(esc(line.slice(3).trim()))}</h2>\n`;
      continue;
    }
    if (/^# /.test(line)) {
      closeLists();
      html += `<h2>${applyInline(esc(line.slice(2).trim()))}</h2>\n`;
      continue;
    }

    // Unordered bullet: -, *, •, with any leading spaces
    if (/^\s*[\*\-\•]\s+/.test(line)) {
      closeOl();
      if (!inUl) { html += '<ul>\n'; inUl = true; }
      const content = line.replace(/^\s*[\*\-\•]\s+/, '');
      html += `<li>${applyInline(esc(content))}</li>\n`;
      continue;
    }

    // Ordered list: "1.  text"
    if (/^\s*\d+\.\s+/.test(line)) {
      closeUl();
      if (!inOl) { html += '<ol>\n'; inOl = true; }
      const content = line.replace(/^\s*\d+\.\s+/, '');
      html += `<li>${applyInline(esc(content))}</li>\n`;
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      closeLists();
      html += '<br>\n';
      continue;
    }

    // Regular paragraph
    closeLists();
    html += `<p>${applyInline(esc(line))}</p>\n`;
  }

  closeLists();
  return html;
}

chrome.storage.local.get(
  ['lastAnalysis', 'lastCandidateName', 'lastVerdict', 'lastMatch'],
  ({ lastAnalysis, lastCandidateName, lastVerdict, lastMatch }) => {
    document.title = lastCandidateName
      ? `Analysis — ${lastCandidateName}`
      : 'Candidate Analysis';

    document.getElementById('candidate-name').textContent =
      lastCandidateName || 'Candidate';

    document.getElementById('match-pct').textContent =
      lastMatch != null ? `${lastMatch}% Match` : '';

    const badge = document.getElementById('verdict-badge');
    badge.textContent = lastVerdict || '';
    badge.className   = 'verdict-badge ' +
      (lastVerdict === 'ADVANCE' ? 'advance' : 'archive');

    document.getElementById('analysis-content').innerHTML =
      renderMarkdown(fixEmojis(lastAnalysis || ''));

    document.getElementById('copy-btn').addEventListener('click', () => {
      const btn = document.getElementById('copy-btn');
      navigator.clipboard.writeText(lastAnalysis || '').then(() => {
        btn.textContent = 'Copied ✓';
        setTimeout(() => { btn.textContent = 'Copy Analysis'; }, 2000);
      }).catch(() => {
        btn.textContent = 'Copy failed';
        setTimeout(() => { btn.textContent = 'Copy Analysis'; }, 2000);
      });
    });
  }
);
