// Common chat handler functions
// NOTE: API keys must not be embedded into frontend code for security.
// Use a backend proxy (/api/gemini) or Netlify function that holds the GEMINI key.
window.GEMINI_API_KEY = window.GEMINI_API_KEY || null;

// Global attachment tracking for each section
// Stores metadata about attached files in the current message
window.sectionAttachments = window.sectionAttachments || {};

// Initialize attachment storage for a section
window.initAttachmentStorage = function(section) {
  if (!window.sectionAttachments[section]) {
    window.sectionAttachments[section] = [];
  }
};

// Add attachment metadata (accepts File or manual object with dataURL)
window.addAttachment = function(section, file) {
  window.initAttachmentStorage(section);
  const attachment = {
    name: file.name || file.filename || 'attachment',
    type: file.type || file.mimeType || '',
    size: file.size || 0,
    timestamp: Date.now(),
    id: Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  };
  if (file.dataURL) {
    attachment.dataURL = file.dataURL;
  }
  window.sectionAttachments[section].push(attachment);
  return attachment;
};

// Get attachments for a section
window.getAttachments = function(section) {
  window.initAttachmentStorage(section);
  return window.sectionAttachments[section];
};

// Clear attachments for a section (after message is sent)
window.clearAttachments = function(section) {
  if (window.sectionAttachments[section]) {
    window.sectionAttachments[section] = [];
  }
};

// Format attachment info for display
window.getAttachmentSummary = function(section) {
  const attachments = window.getAttachments(section);
  if (!attachments || attachments.length === 0) return '';
  
  const summary = attachments.map(att => {
    const typeIcon = att.type.startsWith('image/') ? '🖼️' : 
                     att.type.startsWith('audio/') ? '🎵' :
                     att.type.startsWith('video/') ? '🎥' :
                     att.type === 'application/pdf' ? '📄' : '📎';
    const sizeKB = (att.size / 1024).toFixed(1);
    return `${typeIcon} ${att.name} (${sizeKB}KB)`;
  }).join(' | ');
  
  return `<div class="attachment-metadata" style="font-size:12px; color:#718096; margin-top:6px; padding-top:6px; border-top:1px solid #e2e8f0;">📎 Attachments: ${summary}</div>`;
};

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

// In-memory chat history helpers (cleared on full page reload)
window.initChatHistory = window.initChatHistory || function(section, maxLen = 10) {
  const key = `${section}ChatHistory`;
  window[key] = window[key] || [];
  window[`${section}MAX_HISTORY_LENGTH`] = maxLen;
};

window.addToChatHistory = window.addToChatHistory || function(section, role, content) {
  const key = `${section}ChatHistory`;
  window[key] = window[key] || [];
  window[key].push({ role, content });
  const max = window[`${section}MAX_HISTORY_LENGTH`] || 10;
  if (window[key].length > max) window[key].shift();
};

window.getQAHistoryForSection = window.getQAHistoryForSection || function(section, maxPairs = 5) {
  const key = `${section}ChatHistory`;
  const h = window[key] || [];
  const pairs = [];
  for (let i = 0; i < h.length; i++) {
    if (h[i].role === 'user') {
      const ai = (h[i+1] && h[i+1].role === 'assistant') ? h[i+1].content : '';
      pairs.push({ user: h[i].content, ai });
    }
    if (pairs.length >= maxPairs) break;
  }
  return pairs;
};

window.loadChatHistoryToDOM = window.loadChatHistoryToDOM || function(section, containerId) {
  const id = containerId || `${section}-chat-messages`;
  const chat = document.getElementById(id);
  if (!chat) return;
  const key = `${section}ChatHistory`;
  const hist = window[key] || [];
  chat.innerHTML = hist.map(msg => `\n      <div class='chat-message-group'>\n        <div class='${msg.role === 'user' ? 'user-msg' : 'ai-msg'}'>${msg.role === 'assistant' ? (typeof formatAIResponse === 'function' ? formatAIResponse(msg.content) : msg.content) : msg.content}</div>\n      </div>\n  `).join('');
  chat.scrollTop = chat.scrollHeight;
};

// Common helper for Gemini API call, supports attachments (image/audio/files)
async function getGeminiAnswer(prompt, msg, section, apiKey, attachments = []) {
  try {
    const contents = { parts: [] };

    // include any attachments as separate parts
    if (attachments && attachments.length) {
      attachments.forEach(att => {
        if (att.dataURL) {
          const mime = att.type || (att.dataURL.match(/:(.*?);/)||[])[1] || '';
          const base64 = att.dataURL.split(',')[1];
          if (mime.startsWith('image/') || mime.startsWith('audio/') || mime.startsWith('video/')) {
            contents.parts.push({
              inlineData: {
                mimeType: mime,
                data: base64
              }
            });
          } else {
            // other file types just describe in text so model can reason
            contents.parts.push({
              text: `Attached file ${att.name} of type ${mime} (data omitted).`
            });
          }
        }
      });
    }

    // Add section-specific context
    const localData = await fetch(`Data/${section}/${section.toLowerCase()}.txt`).then(r => r.text());
    contents.parts.push({
      text: `${prompt}\n\n--- LOCAL DATA ---\n${localData}\n\nUser question: ${msg}`
    });

    // choose model
    let model;
    const hasImage = attachments.some(a => a.type && a.type.startsWith('image/'));
    if (hasImage) {
      // use a vision-capable model if there are images
      model = window.useGemini25 ? 'gemini-2.5-pro' : 'gemini-pro-vision';
    } else {
      model = window.useGemini25 ? 'gemini-2.5-flash' : 'gemini-1.5-flash';
    }

    // Use backend proxy to call Gemini so the key remains on server-side
    const proxyPayload = { model, contents: [contents] };
    try {
      const proxyResp = await window.callGemini(proxyPayload);
      const data = proxyResp;
      return (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) ?
        data.candidates[0].content.parts[0].text : "No answer from AI.";
    } catch (err) {
      console.error('callGemini failed', err);
      return "Sorry, I'm having trouble connecting to the AI at the moment.";
    }
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
      <button id="snap-btn" data-i18n="capture_photo">Capture Photo</button>
      <button id="close-camera" data-i18n="close">Close</button>
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
      alert(window.t ? window.t('capture_camera_error') : "Could not access camera. Please ensure you have a camera and have granted permission.");
      overlay.remove();
    });

  snapBtn.onclick = () => {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageDataURL = canvas.toDataURL('image/png');
    document.getElementById(section + '-chat-preview').innerHTML = `<img src='${imageDataURL}' style='max-width:120px;max-height:80px;border-radius:8px;margin:4px 0;' alt='Captured Image' />`;
    // record as attachment
    window.addAttachment(section, { name: 'camera.png', type: 'image/png', size: 0, dataURL: imageDataURL });
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
      <p data-i18n="recording_text">Recording...</p>
      <button id="stop-recording" data-i18n="stop_recording">Stop Recording</button>
      <button id="close-audio" data-i18n="close">Close</button>
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
        // convert blob to dataURL and add as attachment
        const reader2 = new FileReader();
        reader2.onload = (e) => {
          window.addAttachment(section, { name: 'recording.webm', type: 'audio/webm', size: audioBlob.size, dataURL: e.target.result });
        };
        reader2.readAsDataURL(audioBlob);
        overlay.remove();
        if (stream) stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorder.start();
    })
    .catch(err => {
      console.error("Error accessing audio:", err);
      alert(window.t ? window.t('microphone_error') : "Could not access microphone. Please ensure you have a microphone and have granted permission.");
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
  
  // Track attachment metadata
  window.addAttachment(section, file);
  
  const reader = new FileReader();
  reader.onload = function(ev) {
    const preview = document.getElementById(section + '-chat-preview');
    const container = document.createElement('div');
    container.className = 'preview-container';
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
    container.innerHTML = html + `<button class="remove-btn" onclick="window.removePreview('${section}')" title="Remove">x</button>`;
    preview.innerHTML = '';
    preview.appendChild(container);
    // Save dataURL on last attachment entry
    const attachments = window.getAttachments(section);
    if (attachments && attachments.length) {
      const last = attachments[attachments.length - 1];
      last.dataURL = ev.target.result;
    }
  };
  reader.readAsDataURL(file);
};

// Message handling function
window.sendMessage = async function(section, faqText = '') {
  const input = document.getElementById(`${section}-chat-input`);
  const chat = document.getElementById(`${section}-chat-messages`);
  const preview = document.getElementById(`${section}-chat-preview`);
  const sendBtn = document.querySelector(`#${section}-chat-container .send-button`);
  const stopBtn = document.querySelector(`#${section}-chat-container .stop-button`);
  
  let msg = faqText || input.value.trim();
  let attach = preview.innerHTML;
  if (!msg && !attach) return;

  // Get attachment summary
  const attachmentSummary = window.getAttachmentSummary(section);
  const fullMessage = attachmentSummary ? msg + attachmentSummary : msg;

  // Gather attachments metadata with dataURL
  const attachments = window.getAttachments(section) || [];
  // if a preview image exists keep backwards compatibility
  let imageData = null;
  if (attachments.length) {
    attachments.forEach(att => {
      if (att.dataURL && att.type && att.type.startsWith('image/')) {
        imageData = att.dataURL; // pick first image for old API call
      }
    });
  }
  if (imageData) {
    msg = (msg || '') + "\nPlease analyze this image and provide relevant information.";
  }

  if (window[`${section}AbortController`]) {
    window[`${section}AbortController`].abort();
  }
  window[`${section}AbortController`] = new AbortController();

  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.classList.add('sending');
    sendBtn.textContent = '';
  }
  if (stopBtn) stopBtn.style.display = 'inline-flex';

  const msgGroup = document.createElement('div');
  msgGroup.className = 'chat-message-group';
  msgGroup.innerHTML = `
    <div class='user-msg'>${fullMessage}${attach ? "<br>" + attach : ""}</div>
    <div class='ai-msg'><span class='ai-msg-text'>...</span></div>
  `;
  chat.appendChild(msgGroup);
  
  // Clear preview and attachments using centralized helper so remove button and any state are cleaned
  if (typeof window.clearPreviewAndRemoveBtn === 'function') {
    window.clearPreviewAndRemoveBtn(preview);
  } else {
    preview.innerHTML = '';
  }
  
  // Clear attachments after message is sent
  window.clearAttachments(section);
  
  if (!faqText) input.value = '';

  try {
    const systemPrompt = window[`${section.toUpperCase()}_AI_PROMPT`] || '';
    const localizedPrompt = (window.localizeAIRequest && typeof window.localizeAIRequest === 'function') ? window.localizeAIRequest(systemPrompt) : systemPrompt;
    const finalAnswer = await getGeminiAnswer(
      localizedPrompt,
      msg,
      section,
      window.GEMINI_API_KEY,
      attachments
    );

    msgGroup.querySelector('.ai-msg-text').innerHTML = formatAIResponse(finalAnswer);
    if (typeof window.addActionsToMsgGroup === 'function') {
      window.addActionsToMsgGroup(msgGroup, section, `${section}-chat-messages`);
    }
    chat.scrollTop = chat.scrollHeight;
  } catch (e) {
    console.error(`Error in ${section} chat:`, e);
    msgGroup.querySelector('.ai-msg-text').innerHTML = formatAIResponse("Sorry, I encountered an error while processing your request.");
    if (typeof window.addActionsToMsgGroup === 'function') {
      window.addActionsToMsgGroup(msgGroup, section, `${section}-chat-messages`);
    }
  }

  if (sendBtn) {
    sendBtn.disabled = false;
    sendBtn.classList.remove('sending');
    sendBtn.textContent = 'Send';
  }
  if (stopBtn) stopBtn.style.display = 'none';
  window[`${section}AbortController`] = null;
};
