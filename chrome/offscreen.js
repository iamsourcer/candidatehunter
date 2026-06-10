// Offscreen document — tab audio capture + Deepgram WebSocket STT

let mediaRecorder = null;
let deepgramWs = null;
let captureStream = null;
let isCapturing = false;

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'START_TAB_CAPTURE') {
    startCapture(msg.streamId, msg.deepgramKey)
      .then(() => sendResponse({ ok: true }))
      .catch(e => sendResponse({ error: e.message }));
    return true;
  }
  if (msg.type === 'STOP_TAB_CAPTURE') {
    stopCapture();
    sendResponse({ ok: true });
    return false;
  }
});

async function startCapture(streamId, deepgramKey) {
  if (isCapturing) stopCapture();

  captureStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId,
      },
    },
    video: false,
  });

  isCapturing = true;

  const params = [
    'encoding=webm-opus',
    'sample_rate=48000',
    'channels=1',
    'language=en-US',
    'interim_results=false',
    'punctuate=true',
  ].join('&');
  const wsUrl = `wss://api.deepgram.com/v1/listen?${params}&token=${encodeURIComponent(deepgramKey)}`;
  deepgramWs = new WebSocket(wsUrl);

  deepgramWs.onopen = () => {
    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';
    mediaRecorder = new MediaRecorder(captureStream, { mimeType: mime });
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0 && deepgramWs?.readyState === WebSocket.OPEN) {
        deepgramWs.send(e.data);
      }
    };
    mediaRecorder.start(250);
  };

  deepgramWs.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      const transcript = data?.channel?.alternatives?.[0]?.transcript;
      const isFinal = data?.is_final;
      if (transcript && isFinal && transcript.trim()) {
        chrome.runtime.sendMessage({
          type: 'CANDIDATE_TRANSCRIPT',
          transcript: transcript.trim(),
        }).catch(() => {});
      }
    } catch (_) {}
  };

  deepgramWs.onerror = () => {
    chrome.runtime.sendMessage({ type: 'CAPTURE_ERROR', error: 'Deepgram connection error' }).catch(() => {});
  };

  deepgramWs.onclose = () => {
    if (isCapturing) {
      chrome.runtime.sendMessage({ type: 'CAPTURE_ERROR', error: 'Deepgram disconnected' }).catch(() => {});
    }
  };
}

function stopCapture() {
  isCapturing = false;
  if (mediaRecorder) {
    try { mediaRecorder.stop(); } catch (_) {}
    mediaRecorder = null;
  }
  if (deepgramWs) {
    try { deepgramWs.close(); } catch (_) {}
    deepgramWs = null;
  }
  if (captureStream) {
    captureStream.getTracks().forEach(t => t.stop());
    captureStream = null;
  }
}
