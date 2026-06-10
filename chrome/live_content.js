// Live Interview Co-Pilot — content script (IIFE, injected into Meet/Voice)
(function () {
  'use strict';

  if (window.__chLiveInjected) return;
  window.__chLiveInjected = true;

  let isActive = false;
  let pendingTopics = [];
  let coveredTopics = [];
  let recognition = null;
  let transcriptBuffer = '';
  let interimBuffer = '';
  let wordCount = 0;
  let candidateCtx = null;
  let sidebar = null;
  let isDragging = false;
  let dragOffX = 0, dragOffY = 0;
  let flushTimer = null;

  const CHUNK_WORDS = 40;
  const FLUSH_INTERVAL_MS = 20000;

  // ── DOM helpers ───────────────────────────────────────────────────────────────

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function injectSidebar() {
    if (sidebar) return;
    sidebar = document.createElement('div');
    sidebar.id = 'ch-live-sidebar';
    sidebar.className = 'ch-collapsed';
    sidebar.innerHTML = `
      <button id="ch-live-toggle" title="CandidateHunter Live">🎙</button>
      <div id="ch-live-body">
        <div id="ch-live-header">
          <span id="ch-live-title">🎙 LIVE</span>
          <button id="ch-live-collapse" title="Minimize">−</button>
        </div>
        <div id="ch-live-candidate"></div>
        <div class="ch-section-label">TO COVER</div>
        <div id="ch-topics-list"></div>
        <div class="ch-sug-label">SUGGESTED</div>
        <div id="ch-suggestion">Start session to get suggestions…</div>
        <div id="ch-live-actions">
          <button id="ch-covered-btn">✓ Covered</button>
          <button id="ch-skip-btn">→ Skip</button>
        </div>
        <div id="ch-live-status"></div>
      </div>
    `;
    document.body.appendChild(sidebar);

    document.getElementById('ch-live-toggle').addEventListener('click', expandSidebar);
    document.getElementById('ch-live-collapse').addEventListener('click', collapseSidebar);
    document.getElementById('ch-live-header').addEventListener('mousedown', startDrag);
    document.getElementById('ch-covered-btn').addEventListener('click', () => {
      if (pendingTopics.length) markCovered(pendingTopics[0]);
    });
    document.getElementById('ch-skip-btn').addEventListener('click', () => {
      if (pendingTopics.length > 1) {
        pendingTopics.push(pendingTopics.shift());
        renderTopics();
      }
    });
  }

  function expandSidebar() { sidebar.classList.remove('ch-collapsed'); }
  function collapseSidebar() { sidebar.classList.add('ch-collapsed'); }

  function startDrag(e) {
    if (e.target.closest('button')) return;
    isDragging = true;
    const rect = sidebar.getBoundingClientRect();
    dragOffX = e.clientX - rect.right;
    dragOffY = e.clientY - rect.top;
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
    e.preventDefault();
  }

  function onDrag(e) {
    if (!isDragging) return;
    const right = window.innerWidth - e.clientX + dragOffX;
    const top = e.clientY - dragOffY;
    sidebar.style.right = Math.max(0, right) + 'px';
    sidebar.style.top = Math.max(0, Math.min(top, window.innerHeight - 80)) + 'px';
    sidebar.style.bottom = 'auto';
  }

  function stopDrag() {
    isDragging = false;
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
  }

  // ── Session control ───────────────────────────────────────────────────────────

  function activateSession(data) {
    candidateCtx = data;
    isActive = true;
    pendingTopics = [...(data.pendingTopics || [])];
    coveredTopics = [];
    transcriptBuffer = '';
    wordCount = 0;

    const audioMode = data.hasTabAudio ? '🎤+📡 Both sides' : '🎤 Recruiter only';
    document.getElementById('ch-live-candidate').textContent = (data.name || '') + ' · ' + audioMode;
    renderTopics();
    setSuggestion('Listening… speak to get suggestions.');
    setStatus('🔴 LIVE', true);
    expandSidebar();
    startRecognition();
    // Fallback: flush whatever we have every 15s even if isFinal never fires
    flushTimer = setInterval(() => {
      const text = (transcriptBuffer + ' ' + interimBuffer).trim();
      if (text) {
        transcriptBuffer = '';
        interimBuffer = '';
        wordCount = 0;
        if (candidateCtx && pendingTopics.length) {
          setStatus('⏳ updating…', true);
          chrome.runtime.sendMessage({
            type: 'LIVE_TRANSCRIPT_CHUNK',
            transcript: text,
            pendingTopics: [...pendingTopics],
            candidateCtx,
          }).catch(e => console.warn('[CH] sendMessage error:', e));
        }
      }
    }, FLUSH_INTERVAL_MS);
  }

  function deactivateSession() {
    isActive = false;
    stopRecognition();
    if (flushTimer) { clearInterval(flushTimer); flushTimer = null; }
    setStatus('', false);
    candidateCtx = null;
    pendingTopics = [];
    coveredTopics = [];
    transcriptBuffer = '';
    interimBuffer = '';
    wordCount = 0;
    collapseSidebar();
  }

  function renderTopics() {
    const list = document.getElementById('ch-topics-list');
    if (!list) return;
    if (!pendingTopics.length) {
      list.innerHTML = '<div class="ch-all-covered">All topics covered ✓</div>';
      return;
    }
    list.innerHTML = pendingTopics.map((t, i) =>
      `<div class="ch-topic${i === 0 ? ' ch-topic-current' : ''}">${i === 0 ? '○' : '·'} ${esc(t)}</div>`
    ).join('');
  }

  function setSuggestion(text) {
    const el = document.getElementById('ch-suggestion');
    if (el) el.textContent = text || '';
  }

  function setStatus(text, isLive) {
    const el = document.getElementById('ch-live-status');
    if (!el) return;
    el.textContent = text;
    el.className = isLive ? 'live' : '';
  }

  function markCovered(topic) {
    coveredTopics.push(topic);
    pendingTopics = pendingTopics.filter(t => t !== topic);
    renderTopics();
  }

  // ── Speech recognition ────────────────────────────────────────────────────────

  function startRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setStatus('⚠ No STT', false); return; }

    recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript + ' ';
        else interim += event.results[i][0].transcript;
      }
      interimBuffer = interim;
      const preview = (transcriptBuffer + final + interim).trim();
      if (preview) setStatus('🎤 ' + preview.split(/\s+/).slice(-5).join(' ') + '…', true);
      if (final) {
        transcriptBuffer += final;
        wordCount += final.trim().split(/\s+/).length;
        interimBuffer = '';
        if (wordCount >= CHUNK_WORDS) flushChunk();
      }
    };

    recognition.onerror = (e) => {
      if (e.error === 'no-speech') return;
      setStatus('⚠ ' + e.error, false);
    };

    recognition.onend = () => {
      if (isActive) {
        try { recognition.start(); } catch (_) {}
      }
    };

    recognition.start();
  }

  function stopRecognition() {
    if (recognition) {
      try { recognition.stop(); } catch (_) {}
      recognition = null;
    }
  }

  function flushChunk() {
    const chunk = transcriptBuffer.trim();
    transcriptBuffer = '';
    wordCount = 0;
    if (!chunk || !candidateCtx || !pendingTopics.length) return;
    setStatus('⏳ updating…', true);
    chrome.runtime.sendMessage({
      type: 'LIVE_TRANSCRIPT_CHUNK',
      transcript: chunk,
      pendingTopics: [...pendingTopics],
      candidateCtx,
    }).catch(e => console.warn('[CH] sendMessage error:', e));
  }

  // ── Message listeners ─────────────────────────────────────────────────────────

  chrome.storage.onChanged.addListener((changes) => {
    const chg = changes.activeLiveCandidate;
    if (!chg) return;
    if (chg.newValue) {
      if (!sidebar) injectSidebar();
      activateSession(chg.newValue);
    } else {
      deactivateSession();
    }
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'LIVE_STATUS') {
      if (msg.status === 'candidate_error') setStatus('⚠ Deepgram: ' + msg.message, false);
      return;
    }
    if (msg.type !== 'LIVE_SUGGESTION') return;
    // mark_covered can be a string or array depending on the model
    const covered = Array.isArray(msg.mark_covered)
      ? msg.mark_covered
      : (msg.mark_covered ? [msg.mark_covered] : []);
    covered.forEach(t => {
      const match = pendingTopics.find(p =>
        p.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(p.toLowerCase())
      );
      if (match) markCovered(match);
    });
    if (msg.suggested_question) setSuggestion('"' + msg.suggested_question + '"');
  });

  // ── Init ──────────────────────────────────────────────────────────────────────

  chrome.storage.local.get('activeLiveCandidate', ({ activeLiveCandidate }) => {
    injectSidebar();
    if (activeLiveCandidate) activateSession(activeLiveCandidate);
  });

})();
