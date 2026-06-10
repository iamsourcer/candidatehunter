function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function markText(rawText, posPhrases, negPhrases) {
  const marks = [];
  const lo = rawText.toLowerCase();
  for (const p of (posPhrases || [])) {
    if (!p || p.length < 3) continue;
    const plo = p.toLowerCase();
    let idx = lo.indexOf(plo);
    while (idx >= 0) { marks.push({ start: idx, end: idx + p.length, cls: 'hl-pos' }); idx = lo.indexOf(plo, idx + 1); }
  }
  for (const p of (negPhrases || [])) {
    if (!p || p.length < 3) continue;
    const plo = p.toLowerCase();
    let idx = lo.indexOf(plo);
    while (idx >= 0) { marks.push({ start: idx, end: idx + p.length, cls: 'hl-neg' }); idx = lo.indexOf(plo, idx + 1); }
  }
  if (!marks.length) return esc(rawText);
  marks.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
  const kept = []; let lastEnd = 0;
  for (const m of marks) { if (m.start >= lastEnd) { kept.push(m); lastEnd = m.end; } }
  let out = '', pos = 0;
  for (const { start, end, cls } of kept) {
    out += esc(rawText.slice(pos, start));
    out += `<mark class="${cls}">${esc(rawText.slice(start, end))}</mark>`;
    pos = end;
  }
  return out + esc(rawText.slice(pos));
}

function renderProfileSection(profile, highlights, suggestTerms) {
  if (!profile) return '';
  const pos  = highlights?.positive || [];
  const neg  = highlights?.negative || [];
  const miss = suggestTerms || [];

  let pillsHtml = '';
  if (pos.length || neg.length || miss.length) {
    pillsHtml = '<div class="hl-pills-block">';
    for (const t of pos)  pillsHtml += `<span class="hl-pill-pos">✓ ${esc(t)}</span>`;
    for (const t of neg)  pillsHtml += `<span class="hl-pill-neg">⚑ ${esc(t)}</span>`;
    for (const t of miss) pillsHtml += `<span class="hl-pill-miss">+ ${esc(t)}</span>`;
    pillsHtml += '</div>';
  }

  let bodyHtml = pillsHtml;

  if (profile.profile) {
    // LinkedIn profile
    const about      = profile.about || '';
    const experience = profile.experience || [];
    const skills     = profile.skills || [];

    if (about) {
      bodyHtml += `<div class="prof-section-label">About</div>`;
      bodyHtml += `<div class="prof-about">${markText(about, pos, neg)}</div>`;
    }
    if (experience.length) {
      bodyHtml += `<div class="prof-section-label">Experience</div>`;
      for (const exp of experience) {
        const type   = exp.employment_type ? ` · ${esc(exp.employment_type)}` : '';
        const period = exp.period ? ` <span class="prof-period">${esc(exp.period)}</span>` : '';
        bodyHtml += `<div class="prof-exp-item">`;
        bodyHtml += `<div class="prof-exp-header">${esc(exp.title || '')} at ${esc(exp.company || '')}${type}${period}</div>`;
        if (exp.description) bodyHtml += `<div class="prof-exp-desc">${markText(exp.description, pos, neg)}</div>`;
        bodyHtml += `</div>`;
      }
    }
    if (skills.length) {
      bodyHtml += `<div class="prof-section-label">Skills</div>`;
      bodyHtml += `<div class="prof-skills">${markText(skills.join(' · '), pos, neg)}</div>`;
    }
  } else if (profile.profileBlocks) {
    // Ashby profile
    bodyHtml += `<div class="prof-about">${markText(profile.profileBlocks, pos, neg)}</div>`;
  } else {
    return '';
  }

  return `<div class="profile-section collapsed" id="profile-section">
    <div class="profile-toggle" id="profile-toggle">
      <span>Candidate Profile</span>
      <span class="profile-toggle-arrow">▼</span>
    </div>
    <div class="profile-body">${bodyHtml}</div>
  </div>`;
}

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
  ['lastAnalysis', 'lastCandidateName', 'lastVerdict', 'lastMatch', 'lastSuggestTerms', 'lastHighlights', 'lastProfile'],
  ({ lastAnalysis, lastCandidateName, lastVerdict, lastMatch, lastSuggestTerms, lastHighlights, lastProfile }) => {
    document.title = lastCandidateName
      ? `Analysis — ${lastCandidateName}`
      : 'Candidate Analysis';

    document.getElementById('candidate-name').textContent =
      lastCandidateName || 'Candidate';

    document.getElementById('match-pct').textContent =
      lastMatch != null ? `${lastMatch}% Match` : '';

    const badge = document.getElementById('verdict-badge');
    badge.textContent = lastVerdict || '';
    const verdictCls = { 'ADVANCE': 'advance', 'HOLD': 'hold', 'LONG SHOT': 'long-shot', 'DO NOT ADVANCE': 'archive', 'ARCHIVE': 'archive' }[lastVerdict] || 'archive';
    badge.className   = 'verdict-badge ' + verdictCls;

    // Profile section (before analysis markdown)
    const profileHtml = renderProfileSection(lastProfile, lastHighlights, lastSuggestTerms);
    if (profileHtml) {
      const profileEl = document.createElement('div');
      profileEl.innerHTML = profileHtml;
      const section = profileEl.firstElementChild;
      document.getElementById('analysis-content').insertAdjacentElement('beforebegin', section);
      document.getElementById('profile-toggle').addEventListener('click', () => {
        document.getElementById('profile-section').classList.toggle('collapsed');
      });
    }

    document.getElementById('analysis-content').innerHTML =
      renderMarkdown(fixEmojis(lastAnalysis || ''));

    const terms = Array.isArray(lastSuggestTerms) ? lastSuggestTerms.filter(Boolean) : [];
    if (terms.length) {
      const section = document.createElement('div');
      section.className = 'suggest-section';
      section.innerHTML =
        '<h3>🔍 Suggested search terms</h3>' +
        '<p class="suggest-desc">Terms typically present in strong candidates for this role — absent in this profile:</p>' +
        '<div class="suggest-pills">' +
          terms.map(t => `<span class="suggest-pill">${t.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</span>`).join('') +
        '</div>';
      document.getElementById('analysis-content').appendChild(section);
    }

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
