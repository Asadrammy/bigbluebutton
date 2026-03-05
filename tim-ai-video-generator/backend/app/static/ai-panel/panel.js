(function () {
  'use strict';

  var API_BASE = '';
  var micBtn = document.getElementById('micBtn');
  var statusEl = document.getElementById('status');
  var resultEl = document.getElementById('result');

  function setStatus(msg, isError) {
    statusEl.textContent = msg;
    statusEl.className = 'status' + (isError ? ' error' : '');
  }

  function setResult(html) {
    resultEl.innerHTML = html;
    resultEl.style.display = 'block';
  }

  function getAuthHeaders() {
    var token = localStorage.getItem('sign_token') || sessionStorage.getItem('sign_token');
    var headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    return headers;
  }

  function blobToBase64(blob) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onloadend = function () {
        var dataUrl = r.result;
        var base64 = dataUrl.indexOf(',') >= 0 ? dataUrl.split(',')[1] : dataUrl;
        resolve(base64);
      };
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  }

  function speechToText(audioBase64) {
    return fetch(API_BASE + '/api/v1/speech-to-text', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        audio_data: audioBase64,
        language: 'de'
      })
    }).then(function (res) {
      if (!res.ok) throw new Error('Speech-to-text failed: ' + res.status);
      return res.json();
    });
  }

  function textToSign(text) {
    return fetch(API_BASE + '/api/v1/text-to-sign', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        text: text,
        source_language: 'de',
        sign_language: 'DGS'
      })
    }).then(function (res) {
      if (!res.ok) throw new Error('Text-to-sign failed: ' + res.status);
      return res.json();
    });
  }

  function showAvatarResponse(data) {
    var html = '<h3>Sign translation</h3>';
    if (data.video_url) {
      html += '<p class="success">Video ready.</p>';
      html += '<video src="' + escapeHtml(data.video_url) + '" controls></video>';
    }
    if (data.animation_data) {
      html += '<p>Animation data received (duration: ' + (data.animation_data.duration || 0) + 's).</p>';
    }
    if (data.resolved_signs && data.resolved_signs.length) {
      html += '<p>Signs: ' + data.resolved_signs.map(function (s) { return s.token; }).join(', ') + '</p>';
    }
    if (!data.video_url && !data.animation_data && (!data.resolved_signs || !data.resolved_signs.length)) {
      html += '<p>No video or animation data in response.</p>';
    }
    setResult(html);
  }

  function escapeHtml(s) {
    if (!s) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  var mediaRecorder = null;
  var chunks = [];

  function startRecording() {
    chunks = [];
    setStatus('Requesting microphone…');
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(function (stream) {
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = function (e) { if (e.data.size) chunks.push(e.data); };
        mediaRecorder.onstop = function () {
          stream.getTracks().forEach(function (t) { t.stop(); });
          var blob = new Blob(chunks, { type: mediaRecorder.mimeType || 'audio/webm' });
          setStatus('Sending audio for transcription…');
          blobToBase64(blob).then(function (base64) {
            return speechToText(base64);
          }).then(function (sttRes) {
            var text = (sttRes && sttRes.text) ? sttRes.text.trim() : '';
            if (!text) {
              setStatus('No speech detected.', true);
              return;
            }
            setStatus('Converting to sign: "' + text.substring(0, 40) + (text.length > 40 ? '…' : '') + '"');
            return textToSign(text);
          }).then(function (ttsRes) {
            if (ttsRes) {
              setStatus('Done.', false);
              showAvatarResponse(ttsRes);
            }
          }).catch(function (err) {
            setStatus('Error: ' + (err && err.message ? err.message : String(err)), true);
          });
        };
        mediaRecorder.start();
        setStatus('Recording… Click Stop when done.');
        micBtn.textContent = 'Stop recording';
        micBtn.classList.add('stop');
        micBtn.onclick = stopRecording;
      })
      .catch(function (err) {
        setStatus('Microphone error: ' + (err && err.message ? err.message : String(err)), true);
      });
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    micBtn.textContent = 'Start Microphone';
    micBtn.classList.remove('stop');
    micBtn.onclick = startRecording;
  }

  micBtn.onclick = startRecording;
})();
