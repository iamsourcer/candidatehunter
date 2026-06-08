(() => {
  try {
    const findSection = (kw) =>
      Array.from(document.querySelectorAll('section')).find(s => {
        const h2 = s.querySelector('h2');
        return h2 && h2.innerText.toLowerCase().includes(kw.toLowerCase());
      });

    const spansOf = (el) =>
      Array.from(el.querySelectorAll('span[aria-hidden="true"]'))
        .map(s => s.textContent.trim()).filter(t => t.length > 0);

    const headerSpansOf = (el) =>
      Array.from(el.querySelectorAll('span[aria-hidden="true"]'))
        .filter(span => {
          let node = span.parentElement;
          while (node && node !== el) {
            if (node.tagName === 'LI') return false;
            node = node.parentElement;
          }
          return true;
        })
        .map(s => s.textContent.trim()).filter(t => t.length > 0);

    // ── 1. PROFILE ────────────────────────────────────────────────────────────
    const h1 = document.querySelector('h1');
    let name = h1
      ? h1.innerText.split('\n').map(l => l.trim()).filter(l => l)[0] || ''
      : '';
    if (!name) {
      const m = document.title.match(/^(.+?)\s*[|\-]\s*LinkedIn/);
      if (m) name = m[1].trim();
    }
    if (!name) name = 'LinkedIn Profile';

    let title = '', location = '';

    // Approach A: JSON-LD structured data (server-rendered for SEO — most reliable)
    try {
      for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
        const ld = JSON.parse(script.textContent);
        if (ld?.jobTitle && !title)   title    = ld.jobTitle;
        if (ld?.address?.addressLocality && !location) location = ld.address.addressLocality;
        if (title && location) break;
      }
    } catch(e) {}

    // Approach B: document.title often encodes the headline: "Name - Headline | LinkedIn"
    if (!title) {
      const m = document.title.match(/^.+?\s*[-–]\s*(.+?)\s*[|–]\s*LinkedIn/i);
      if (m && m[1] && m[1].trim() !== name) title = m[1].trim();
    }

    // Approach C: <meta name="description"> — LinkedIn includes headline in description
    if (!title || !location) {
      const desc = document.querySelector('meta[name="description"]')?.content || '';
      if (desc) {
        // Strip trailing boilerplate: "View Jon's profile on LinkedIn..."
        const clean = desc.replace(/View\s+.+?profile\s+on\s+LinkedIn.*/i, '').trim();
        const parts = clean.split(/\s*[|·]\s*/).map(p => p.trim()).filter(p => p.length > 5);
        if (!title) {
          const cand = parts.find(p => p !== name &&
            !/(connection|follower|\d+\+?\s*(connection|follower)|linkedin)/i.test(p));
          if (cand) title = cand;
        }
      }
    }

    // Approach D: parse main.innerText — h1-independent, most resilient strategy
    // Works as long as LinkedIn renders visible text (confirmed: "about" uses same technique)
    if (!title || !location) {
      const mainEl = document.querySelector('main') || document.body;
      const sectionRe = /^(about|acerca de|experience|experiencia|education|educación|skills|aptitudes|certificat|licencias?|activity|actividad|contact info|información)/i;
      const junkRe = /^[·•·]|^(1st|2nd|3rd|open to|premium|follow|connect|message|more|edit|share|report|block|member since|you and|mutual|home|my network|jobs|messaging|notif|view all|add)/i;
      const connRe = /^\d+\+?\s*(connection|follower)/i;
      const mainLines = mainEl.innerText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      const cardLines = [];
      for (const line of mainLines) {
        if (sectionRe.test(line) && cardLines.length > 0) break;
        if (line !== name && line.length > 4 && !junkRe.test(line) && !connRe.test(line))
          cardLines.push(line);
        if (cardLines.length >= 5) break;
      }
      if (!title    && cardLines[0]) title    = cardLines[0];
      if (!location && cardLines[1]) location = cardLines[1].split('·')[0].trim();
    }

    // Approach E: walk aria-hidden spans after h1
    if (h1 && (!title || !location)) {
      let count = 0;
      for (const span of document.querySelectorAll('span[aria-hidden="true"]')) {
        if (!(h1.compareDocumentPosition(span) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
        const t = span.textContent.trim();
        if (t.length < 3 || t === name || /^\d/.test(t) ||
            /(connection|follower|follow|connect|message|contact)/i.test(t)) continue;
        if (!title    && count === 0) { title    = t; count++; }
        else if (!location && count === 1) { location = t.split('·')[0].trim(); break; }
        else if (count > 0) { location = t.split('·')[0].trim(); break; }
      }
    }

    // Approach E: CSS selector fallbacks
    if (!title) {
      for (const sel of [
        '[data-field="headline"]',
        '.text-body-medium.break-words',
        '.text-body-medium',
        '[class*="headline"]',
        '[class*="top-card__headline"]',
      ]) {
        for (const el of document.querySelectorAll(sel)) {
          const t = el.innerText?.trim();
          if (t && t.length > 5 && t !== name && !t.match(/^\d+/) &&
              !/(connection|follower)/i.test(t)) {
            title = t.split('\n')[0].trim(); break;
          }
        }
        if (title) break;
      }
    }
    if (!location) {
      for (const sel of [
        '[data-field="location"]',
        '.text-body-small.inline.t-black--light.break-words',
        '.text-body-small.inline',
        '[class*="top-card-layout__first-subline"]',
        '[class*="top-card__subline"]',
      ]) {
        const el = document.querySelector(sel);
        if (el) { location = el.innerText?.trim().split('·')[0].trim() || ''; if (location) break; }
      }
    }

    // Approach F: sibling-walk from h1 / h1.parentElement
    if (h1 && (!title || !location)) {
      const skipRe = /^[·•\d]|^(1st|2nd|3rd|open to|follow|connect|message|premium|top voice)/i;
      const connRe = /(connection|follower)/i;
      const cands  = [];
      for (const root of [h1, h1.parentElement, h1.parentElement?.parentElement].filter(Boolean)) {
        let el = root.nextElementSibling;
        while (el && cands.length < 6) {
          const lines = (el.innerText || '').split('\n').map(l => l.trim()).filter(Boolean);
          for (const t of lines) {
            if (t.length > 4 && t !== name && !skipRe.test(t) && !connRe.test(t))
              cands.push(t);
            if (cands.length >= 4) break;
          }
          el = el.nextElementSibling;
        }
        if (cands.length >= 2) break;
      }
      if (!title    && cands[0]) title    = cands[0];
      if (!location && cands[1]) location = cands[1].split('·')[0].trim();
    }

    // Approach G: innerText card — walk up from h1 until we find a block with enough lines
    if (h1 && (!title || !location)) {
      let card = h1.parentElement;
      for (let i = 0; i < 8 && card && card !== document.body; i++) {
        if (card.innerText.split('\n').filter(l => l.trim().length > 3).length >= 5) break;
        card = card.parentElement;
      }
      if (card) {
        const junk = /^[·•]|^(1st|2nd|3rd|open to|premium|follow|connect|message|top voice)/i;
        const lines = card.innerText.split('\n').map(l => l.trim())
          .filter(l => l.length > 3 && l !== name && !junk.test(l) &&
                       !/(^\d+\+?\s*(connection|follower))/i.test(l));
        if (!title    && lines[0]) title    = lines[0];
        if (!location && lines[1]) location = lines[1].split('·')[0].trim();
      }
    }

    // Debug: first 12 lines of main.innerText — shows exactly what approach D parses
    const _debug = {
      docTitle:    document.title,
      h1Text:      h1?.innerText?.trim() || null,
      mainFirst12: (() => {
        const mainEl = document.querySelector('main') || document.body;
        return mainEl.innerText.split('\n').map(l => l.trim()).filter(l => l.length > 0).slice(0, 12);
      })(),
    };

    if (!title)    title    = 'Not specified';
    if (!location) location = 'Not found';

    // ── 2. ABOUT ──────────────────────────────────────────────────────────────
    let about = 'Not specified';
    const aboutSec = findSection('about') || findSection('acerca de');
    if (aboutSec) {
      about = aboutSec.innerText
        .replace(/^About\n|^Acerca de\n/i, '')
        .split(/Top skills|Principales aptitudes/i)[0]
        .replace(/…\s*more|ver más/gi, '').trim();
    }

    // ── 3. EXPERIENCE (visible entries as fallback) ───────────────────────────
    // popup.js will replace this with the full list from /details/experience/.
    const noise  = /^experience$|^experiencia$|^show all$|^ver todo$|^ver más$|^… more$|enhance with ai|\slogo$|^show less$/i;
    const isDate = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Ene|Abr|Ago)\w*\s+\d{4}/i;
    const isDur  = /^\d+\s+(yr|year|mo|month)/i;

    const applyAnchor = (lines) => {
      const positions = [];
      for (let i = 2; i < lines.length; i++) {
        if (!isDate.test(lines[i])) continue;
        if (isDur.test(lines[i - 2]) && i >= 3)
          positions.push({ titleIdx: i - 1, companyIdx: i - 3, dateIdx: i });
        else if (!isDate.test(lines[i - 2]))
          positions.push({ titleIdx: i - 2, companyIdx: i - 1, dateIdx: i });
      }
      return positions.reduce((out, pos, j) => {
        const { titleIdx, companyIdx, dateIdx } = pos;
        const parts  = lines[companyIdx].split('·');
        const locIdx = dateIdx + 1;
        const hasLoc = locIdx < lines.length && !isDate.test(lines[locIdx]) &&
                       !isDur.test(lines[locIdx]) && lines[locIdx].length < 80;
        const loc    = hasLoc ? lines[locIdx] : '';
        const descStart = hasLoc ? locIdx + 1 : locIdx;
        const descEnd   = j + 1 < positions.length ? positions[j + 1].titleIdx : lines.length;
        const desc      = lines.slice(descStart, descEnd)
          .filter(l => l.length > 0 && !noise.test(l)).join('\n').trim();
        const e = {
          title:           lines[titleIdx].replace(/\*+/g, '').replace(/\s{2,}/g, ' ').trim(),
          company:         parts[0].trim(),
          employment_type: parts[1] ? parts[1].trim() : '',
          period:          lines[dateIdx].split('·')[0].trim(),
          location:        loc,
          description:     desc,
        };
        if (!out.some(x => x.title === e.title && x.company === e.company)) out.push(e);
        return out;
      }, []);
    };

    let experience = [];
    const expSec = findSection('experience') || findSection('experiencia');
    if (expSec) {
      experience = applyAnchor(spansOf(expSec).filter(l => !noise.test(l)));
      if (experience.length === 0)
        experience = applyAnchor(
          expSec.innerText.split('\n').map(l => l.trim()).filter(l => l && !noise.test(l))
        );
    }

    // ── 4. EDUCATION ──────────────────────────────────────────────────────────
    const isDateStr  = /^\d{4}\s*[–-]|(^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Ene|Abr|Ago)\w*\s+\d{4})/i;
    const isEduNoise = (s) =>
      /^Activities and societies|^Grade:|^Field of study|^Type:/i.test(s) || isDateStr.test(s);
    const isSkillsLine = /\(programming language\)|\+\d+\s+skill/i;

    let education = [];
    const eduSec = findSection('education') || findSection('educación');
    if (eduSec) {
      const topLis = Array.from(eduSec.querySelectorAll('li')).filter(li => {
        let p = li.parentElement;
        while (p && p !== eduSec) { if (p.tagName === 'LI') return false; p = p.parentElement; }
        return true;
      });
      topLis.forEach(li => {
        const spans = headerSpansOf(li);
        if (!spans[0] || isEduNoise(spans[0]) || isSkillsLine.test(spans[0])) return;
        const entry = {
          school: spans[0],
          degree: (spans[1] && !isEduNoise(spans[1]) && !isSkillsLine.test(spans[1]))
            ? spans[1] : '',
          period: spans.find(s => isDateStr.test(s)) || '',
        };
        if (!education.some(e => e.school === entry.school)) education.push(entry);
      });
      if (education.length === 0) {
        eduSec.innerText.split('\n').map(l => l.trim())
          .filter(l => l.length > 3 && !/education|educac|show all/i.test(l) &&
                       !isEduNoise(l) && !isSkillsLine.test(l))
          .forEach((l, i, arr) => {
            if (i % 2 === 0) education.push({ school: l, degree: arr[i + 1] || '', period: '' });
          });
      }
    }

    // ── 5. CERTIFICATIONS ─────────────────────────────────────────────────────
    let certifications = [];
    const certSec =
      findSection('licenses') || findSection('licencias') ||
      findSection('certif')   || findSection('certificaciones');
    if (certSec) {
      const skipC  = /^licenses|^licencias|^certif|^show all|^ver todo|^show credential|^ver credencial|^credential id/i;
      const issued = /^Issued\s+|^Expedida?\s+/i;
      const lines  = certSec.innerText.split('\n').map(l => l.trim())
        .filter(l => l.length > 0 && !skipC.test(l));
      for (let i = 0; i < lines.length; i++) {
        if (issued.test(lines[i])) {
          const entry = {
            name:   i >= 2 ? lines[i - 2] : (lines[i - 1] || ''),
            issuer: i >= 2 ? lines[i - 1] : '',
            date:   lines[i],
          };
          if (entry.name && !certifications.some(c => c.name === entry.name))
            certifications.push(entry);
          i++;
        }
      }
      if (certifications.length === 0) {
        Array.from(certSec.querySelectorAll('li')).filter(li => !li.querySelector('li'))
          .forEach(li => {
            const spans = spansOf(li);
            if (!spans[0] || skipC.test(spans[0])) return;
            const entry = {
              name:   spans[0], issuer: spans[1] || '',
              date:   spans.find(s => /\d{4}|Issued|Expedida/i.test(s)) || '',
            };
            if (!certifications.some(c => c.name === entry.name)) certifications.push(entry);
          });
      }
    }

    // ── 6. SKILLS (visible fallback — popup.js replaces with full list) ───────
    let skills = [];
    const skillsSec = findSection('skills') || findSection('aptitudes');
    if (skillsSec) {
      const skipS    = /^skills$|^aptitudes$|^show all|^ver todo|^\d+\s+(endorse|validac)|^top skills/i;
      const contextS = /\b(university|universidad|college|instituto|school|escuela|inc\.|llc|corp\.|ltd\.?)\b|N[°º]\s*\d/i;
      const passS    = t => t.length > 2 && !skipS.test(t) && !contextS.test(t) && !/\d{4}/.test(t);
      skills = spansOf(skillsSec).filter(passS);
      if (skills.length === 0)
        skills = skillsSec.innerText.split('\n').map(l => l.trim()).filter(passS);
      skills = [...new Set(skills)].slice(0, 25);
    }

    return {
      profile: { name, title, location },
      about,
      experience:     experience.slice(0, 10),
      education:      education.slice(0, 5),
      certifications: certifications.slice(0, 8),
      skills:         skills.slice(0, 25),
      extractedAt:    new Date().toISOString(),
      _debug,
    };
  } catch (err) {
    return { error: err.message };
  }
})();
