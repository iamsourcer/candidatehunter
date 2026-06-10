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

function downloadProfile(profile, candidateName) {
  if (!profile) return;
  const p    = profile.profile || {};
  const name = p.name || candidateName || 'Candidate';
  const raw  = s => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const subtitle = [p.title, p.location].filter(Boolean).join(' · ');
  const about    = profile.about || '';
  const exp      = profile.experience || [];
  const edu      = profile.education  || [];
  const skills   = profile.skills     || [];

  let expHtml = '';
  for (const e of exp) {
    const co     = e.company ? ` <span class="exp-co">at ${raw(e.company)}${e.employment_type ? ' · ' + raw(e.employment_type) : ''}</span>` : '';
    const period = e.period   ? ` <span class="exp-period">${raw(e.period)}</span>` : '';
    const loc    = e.location ? ` <span class="exp-loc">${raw(e.location)}</span>` : '';
    expHtml += `<div class="exp-item"><div class="exp-header">${raw(e.title || '')}${co}${period}${loc}</div>${e.description ? `<div class="exp-desc">${raw(e.description)}</div>` : ''}</div>`;
  }

  let eduHtml = '';
  for (const e of edu) {
    const deg = e.degree ? ` — ${raw(e.degree)}` : '';
    const per = e.period ? ` <span class="exp-period">${raw(e.period)}</span>` : '';
    eduHtml += `<div class="exp-item"><div class="exp-header">${raw(e.school || '')}${deg}${per}</div></div>`;
  }

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${raw(name)} — Profile</title>
<style>
  *{box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:740px;margin:0 auto;padding:48px 36px 60px;color:#1a1a1a;font-size:14px;line-height:1.6}
  h1{font-size:26px;font-weight:700;margin:0 0 3px;letter-spacing:-.3px}
  .subtitle{font-size:14px;color:#555;margin:0 0 4px}
  .generated{font-size:11px;color:#bbb;margin-bottom:28px}
  h2{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#aaa;border-bottom:1px solid #e8e8e8;padding-bottom:4px;margin:26px 0 10px}
  .about{font-size:13px;color:#333;white-space:pre-wrap}
  .exp-item{margin-bottom:14px}
  .exp-header{font-size:14px;font-weight:600}
  .exp-co{font-weight:400;color:#444}
  .exp-period{font-size:12px;color:#999;font-weight:400}
  .exp-loc{font-size:12px;color:#bbb;font-weight:400}
  .exp-desc{font-size:13px;color:#555;white-space:pre-wrap;margin-top:4px;line-height:1.55}
  .skills-list{font-size:13px;color:#555}
  @media print{body{padding:20px 24px}}
</style>
</head>
<body>
<h1>${raw(name)}</h1>
${subtitle ? `<div class="subtitle">${raw(subtitle)}</div>` : ''}
<div class="generated">Extracted by CandidateHunter · ${new Date().toLocaleDateString()}</div>
${about    ? `<h2>Summary</h2><div class="about">${raw(about)}</div>` : ''}
${expHtml  ? `<h2>Experience</h2>${expHtml}` : ''}
${eduHtml  ? `<h2>Education</h2>${eduHtml}` : ''}
${skills.length ? `<h2>Skills</h2><div class="skills-list">${raw(skills.join(' · '))}</div>` : ''}
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${name.replace(/[^a-z0-9]/gi, '_')}_profile.html`;
  a.click();
  URL.revokeObjectURL(url);
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

  // Resume header (name, title, location)
  let resumeHeader = '';
  if (profile.profile) {
    const p = profile.profile;
    const subtitle = [p.title, p.location].filter(Boolean).join(' · ');
    resumeHeader = `<div class="prof-resume-header">
      <div class="prof-res-name">${esc(p.name || '')}</div>
      ${subtitle ? `<div class="prof-res-subtitle">${esc(subtitle)}</div>` : ''}
    </div>`;
  }

  let bodyHtml = resumeHeader + pillsHtml;

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
      <div style="display:flex;align-items:center;gap:8px">
        <button id="download-profile-btn">↓ Download</button>
        <span class="profile-toggle-arrow">▼</span>
      </div>
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
      document.getElementById('download-profile-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        downloadProfile(lastProfile, lastCandidateName);
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
