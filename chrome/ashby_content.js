// Injected into Ashby candidate pages via chrome.scripting.executeScript
(function extractAshbyCandidate() {
  // ── Name ──────────────────────────────────────────────────────────────────
  // In Ashby pipeline view, h1 = job title (wrong). Use document.title first.
  // Tab title is typically "Candidate Name | Ashby" or "Candidate Name · Ashby"
  let name = '';

  // 1. Browser tab title — most reliable for candidate name
  const titleRaw = document.title.trim();
  if (titleRaw && !/^ashby$/i.test(titleRaw)) {
    // Take the part before common separators (| · • —)
    const titlePart = titleRaw.split(/\s*[|·•—]\s*/)[0].trim();
    // Only use if it looks like a person name (not a URL or role title with slash)
    if (titlePart.length > 1 && titlePart.length < 80 && !titlePart.includes('/')) {
      name = titlePart;
    }
  }

  // 2. Specific Ashby data-testid or class for candidate name in right panel
  if (!name) {
    const el = (
      document.querySelector('[data-testid="candidate-name"]') ||
      document.querySelector('[data-testid="applicant-name"]') ||
      document.querySelector('[class*="CandidateName"]') ||
      document.querySelector('[class*="candidateName"]') ||
      document.querySelector('[class*="ApplicantName"]') ||
      // Look for name inside the right-side slide panel, NOT the main h1
      document.querySelector('[class*="SlideOver"] h2') ||
      document.querySelector('[class*="slideOver"] h2') ||
      document.querySelector('[class*="Drawer"] h2') ||
      document.querySelector('[class*="Panel"] h2') ||
      document.querySelector('[class*="RightPanel"] h2') ||
      document.querySelector('[class*="SidePanel"] h2')
    );
    if (el) name = el.textContent.trim();
  }

  // 3. Last resort: first h2 on page (avoid h1 which is the job title)
  if (!name) {
    const h2 = document.querySelector('h2');
    if (h2) name = h2.textContent.trim();
  }

  if (!name) name = 'Unknown';

  // ── LinkedIn URL ──────────────────────────────────────────────────────────
  const linkedInUrl = Array.from(document.querySelectorAll('a[href*="linkedin.com/in/"]'))
    .map(a => a.href.split('?')[0])
    .find(href => /linkedin\.com\/in\/[^/]+/.test(href)) || '';

  // ── Applied job (the h1 IS the job title in pipeline view) ───────────────
  const jobTitle = document.querySelector('h1')?.textContent?.trim() || '';

  // ── Pipeline stage ────────────────────────────────────────────────────────
  const stage = (
    document.querySelector('[data-testid="stage-name"]') ||
    document.querySelector('[class*="StageName"]') ||
    document.querySelector('[class*="stageName"]') ||
    document.querySelector('[class*="stage-badge"]') ||
    document.querySelector('[class*="InterviewStage"]')
  )?.textContent?.trim() || '';

  // ── Resume / profile text blocks ──────────────────────────────────────────
  const resumeSelectors = [
    '[data-testid*="resume"]',
    '[class*="Resume"]',
    '[class*="resume"]',
    '[class*="ProfileDetail"]',
    '[class*="WorkHistory"]',
    '[class*="workHistory"]',
    '[class*="Feed"]',
    '[class*="feed"]',
  ];

  const profileLines = [];
  for (const sel of resumeSelectors) {
    document.querySelectorAll(`${sel} p, ${sel} li, ${sel} span`).forEach(el => {
      const text = el.textContent.trim();
      if (text.length > 20 && text.length < 500) profileLines.push(text);
    });
    if (profileLines.length >= 15) break;
  }

  if (profileLines.length < 3) {
    document.querySelectorAll('p, li').forEach(el => {
      const text = el.textContent.trim();
      if (text.length > 30 && text.length < 500 &&
          !el.closest('nav') && !el.closest('header') && !el.closest('footer')) {
        profileLines.push(text);
      }
    });
  }

  const profileBlocks = [...new Set(profileLines)].slice(0, 20).join('\n');

  return { name, linkedInUrl, jobTitle, stage, profileBlocks };
})();
