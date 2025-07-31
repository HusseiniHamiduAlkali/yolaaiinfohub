// Common chat handler functions
window.GEMINI_API_KEY = "AIzaSyAZ9TgevsUjCvczgJ31FHSUI1yZ25olZ9U";

// Global text-to-speech variables and functions
window.currentSpeech = window.currentSpeech || null;

window.stopSpeaking = window.stopSpeaking || function() {
  if (window.currentSpeech) {
    speechSynthesis.cancel();
    window.currentSpeech = null;
  }
};

window.speakText = window.speakText || function(text) {
  window.stopSpeaking();
  
  const cleanText = text.replace(/<[^>]*>/g, '').replace(/<br>/g, ' ');
  
  const utterance = new SpeechSynthesisUtterance(cleanText);
  
  // Set preferred voice
  const voices = speechSynthesis.getVoices();
  const preferredVoice = voices.find(voice => 
    voice.name.includes('Google') || voice.name.includes('Microsoft') || 
    voice.name.includes('English')
  );
  if (preferredVoice) utterance.voice = preferredVoice;
  
  // Adjust speech parameters
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  
  window.currentSpeech = utterance;
  
  // Visual feedback
  const speakButton = document.querySelector('.read-aloud-btn');
  if (speakButton) {
    speakButton.style.backgroundColor = '#e2e8f0';
    speakButton.style.transform = 'scale(1.1)';
  }
  
  utterance.onend = () => {
    window.currentSpeech = null;
    if (speakButton) {
      speakButton.style.backgroundColor = '';
      speakButton.style.transform = '';
    }
  };
  
  speechSynthesis.speak(utterance);
};

// Common helper for Gemini API call
async function getGeminiAnswer(prompt, msg, section, apiKey, imageData = null) {
  try {
    const contents = {
      parts: []
    };

    if (imageData) {
      contents.parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: imageData.split(',')[1]
        }
      });
    }

    // Add section-specific context
    const localData = await fetch(`Data/${section}/${section.toLowerCase()}.txt`).then(r => r.text());
    contents.parts.push({
      text: `${prompt}\n\n--- LOCAL DATA ---\n${localData}\n\nUser question: ${msg}`
    });

    const model = imageData ? 'gemini-pro-vision' : 'gemini-1.5-flash';
    const res = await fetch(`https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [contents] })
    });
    const data = await res.json();
    return (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) ?
      data.candidates[0].content.parts[0].text : "No answer from AI.";
  } catch (error) {
    console.error("Gemini API error:", error);
    return "Sorry, I'm having trouble connecting to the AI at the moment.";
  }
}

// Common function to format AI responses
function formatAIResponse(text) {
  let formatted = text
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '<b>$1</b>')
    .replace(/\n/g, '<br>');
  
  return `
    <div class="ai-response">
      ${formatted}
      <button onclick="window.speakText(this.parentElement.textContent)" class="read-aloud-btn" title="Listen to Response">
        🔊 Listen
      </button>
      <style>
        .read-aloud-btn {
          background: transparent;
          border: 1px solid #cbd5e0;
          border-radius: 6px;
          padding: 4px 8px;
          margin-top: 8px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.9em;
        }
        .read-aloud-btn:hover {
          background: #e2e8f0;
          transform: translateY(-1px);
        }
      </style>
    </div>
  `;
}

// Common image capture function
window.captureImage = function(section) {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="camera-modal">
      <video id="camera-feed" autoplay playsinline></video>
      <button id="snap-btn">Capture Photo</button>
      <button id="close-camera">Close</button>
    </div>
  `;
  document.body.appendChild(overlay);

  const video = document.getElementById('camera-feed');
  const snapBtn = document.getElementById('snap-btn');
  const closeBtn = document.getElementById('close-camera');
  let stream;

  navigator.mediaDevices.getUserMedia({ video: true })
    .then(s => {
      stream = s;
      video.srcObject = stream;
    })
    .catch(err => {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please ensure you have a camera and have granted permission.");
      overlay.remove();
    });

  snapBtn.onclick = () => {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageDataURL = canvas.toDataURL('image/png');
    document.getElementById(section + '-chat-preview').innerHTML = `<img src='${imageDataURL}' style='max-width:120px;max-height:80px;border-radius:8px;margin:4px 0;' alt='Captured Image' />`;
    overlay.remove();
    if (stream) stream.getTracks().forEach(t => t.stop());
  };

  closeBtn.onclick = () => {
    overlay.remove();
    if (stream) stream.getTracks().forEach(t => t.stop());
  };
};

// Common audio recording function
window.recordAudio = function(section) {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="audio-modal">
      <p>Recording...</p>
      <button id="stop-recording">Stop Recording</button>
      <button id="close-audio">Close</button>
    </div>
  `;
  document.body.appendChild(overlay);

  const stopBtn = document.getElementById('stop-recording');
  const closeBtn = document.getElementById('close-audio');
  let mediaRecorder;
  let audioChunks = [];
  let stream;

  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(s => {
      stream = s;
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = e => {
        audioChunks.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const audioURL = URL.createObjectURL(audioBlob);
        document.getElementById(section + '-chat-preview').innerHTML = `<audio src='${audioURL}' controls style='max-width:120px;vertical-align:middle;margin:4px 0;'></audio>`;
        overlay.remove();
        if (stream) stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorder.start();
    })
    .catch(err => {
      console.error("Error accessing audio:", err);
      alert("Could not access microphone. Please ensure you have a microphone and have granted permission.");
      overlay.remove();
    });

  stopBtn.onclick = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    if (stream) stream.getTracks().forEach(t => t.stop());
    overlay.remove();
  };
  closeBtn.onclick = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    if (stream) stream.getTracks().forEach(t => t.stop());
    overlay.remove();
  };
};

// Common file upload function
window.uploadFile = function(e, section) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    const preview = document.getElementById(section + '-chat-preview');
    let html = '';
    if (file.type.startsWith('image/')) {
      html = `<img src='${ev.target.result}' style='max-width:120px;max-height:80px;border-radius:8px;margin:4px 0;' alt='Uploaded Image' />`;
    } else if (file.type.startsWith('audio/')) {
      html = `<audio src='${ev.target.result}' controls style='max-width:120px;vertical-align:middle;margin:4px 0;'></audio>`;
    } else if (file.type.startsWith('video/')) {
      html = `<video src='${ev.target.result}' controls style='max-width:120px;max-height:80px;border-radius:8px;margin:4px 0;'></video>`;
    } else if (file.type === 'application/pdf') {
      html = `<iframe src='${ev.target.result}' style='width:120px;height:80px;border-radius:8px;margin:4px 0;'></iframe><p style='font-size:10px;margin:0;'>${file.name}</p>`;
    } else {
      html = `<p style='font-size:12px;margin:4px 0;'>${file.name}</p>`;
    }
    preview.innerHTML = html;
  };
  reader.readAsDataURL(file);
};

// Message handling function
window.sendMessage = async function(section, faqText = '') {
  const input = document.getElementById(`${section}-chat-input`);
  const chat = document.getElementById(`${section}-chat-messages`);
  const preview = document.getElementById(`${section}-chat-preview`);
  const sendBtn = document.querySelector('.send-button');
  const stopBtn = document.querySelector('.stop-button');
  
  let msg = faqText || input.value.trim();
  let attach = preview.innerHTML;
  if (!msg && !attach) return;

  // Extract image data if present
  let imageData = null;
  const previewImg = preview.querySelector('img');
  if (previewImg) {
    imageData = previewImg.src;
    msg = (msg || '') + "\nPlease analyze this image and provide relevant information.";
  }

  if (window[`${section}AbortController`]) {
    window[`${section}AbortController`].abort();
  }
  window[`${section}AbortController`] = new AbortController();

  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.classList.add('sending');
    sendBtn.querySelector('.send-text').textContent = '';
  }
  if (stopBtn) stopBtn.style.display = 'inline-flex';

  const msgGroup = document.createElement('div');
  msgGroup.className = 'chat-message-group';
  msgGroup.innerHTML = `
    <div class='user-msg'>${msg}${attach ? "<br>" + attach : ""}</div>
    <div class='ai-msg'><span class='ai-msg-text'>...</span></div>
  `;
  chat.appendChild(msgGroup);
  preview.innerHTML = '';
  if (!faqText) input.value = '';

  try {
    const finalAnswer = await getGeminiAnswer(
      window[`${section.toUpperCase()}_AI_PROMPT`],
      msg,
      section,
      window.GEMINI_API_KEY,
      imageData
    );

    msgGroup.querySelector('.ai-msg-text').innerHTML = formatAIResponse(finalAnswer);
    chat.scrollTop = chat.scrollHeight;
  } catch (e) {
    console.error(`Error in ${section} chat:`, e);
    msgGroup.querySelector('.ai-msg-text').innerHTML = formatAIResponse("Sorry, I encountered an error while processing your request.");
  }

  if (sendBtn) {
    sendBtn.disabled = false;
    sendBtn.classList.remove('sending');
    sendBtn.querySelector('.send-text').textContent = 'Send';
  }
  if (stopBtn) stopBtn.style.display = 'none';
  window[`${section}AbortController`] = null;
};
