// --- SHARED STOP BUTTON ABORT LOGIC ---
/**
 * Shared handler for Stop button abort logic in all AI chat sections.
 * @param {Object} opts - Options object
 * @param {AbortController} opts.abortController - The AbortController instance to abort
 * @param {string} opts.section - Section name (e.g., 'home', 'edu', etc.)
 * @param {string} [opts.chatContainerId] - ID of the chat messages container (e.g., 'home-chat-messages')
 * @param {string} [opts.stopBtnSelector] - Selector for the Stop button (e.g., '.stop-btn' or '.stop-button')
 * @param {string} [opts.abortMsg] - Custom abort message (optional)
 */
window.handleStopButtonAbort = function({ abortController, section, chatContainerId, stopBtnSelector, abortMsg }) {
  if (abortController) {
    abortController.abort();
  }
  // Hide Stop button if selector provided
  if (stopBtnSelector) {
    const stopBtn = document.querySelector(stopBtnSelector);
    if (stopBtn) stopBtn.style.display = 'none';
  }
  // Show user-aborted message in chat
  if (chatContainerId) {
    const chatMessages = document.getElementById(chatContainerId);
    if (chatMessages) {
      const abortMessage = document.createElement('div');
      abortMessage.className = 'chat-message';
      abortMessage.innerHTML = `<div class="error-message">${abortMsg || 'Request aborted by user'}</div>`;
      chatMessages.appendChild(abortMessage);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }
};
// commonAI.js
// Shared utility functions for AI sections (Home, Edu, Agro, etc.)

// Gemini model preference
window.useGemini25 = window.useGemini25 || false;

// Chat history management
// In-memory storage for chat histories
window.chatHistories = window.chatHistories || {};

// Initialize chat history for a section
window.initChatHistory = function(section, maxMessages = 10) {
  if (!window.chatHistories[section]) {
    window.chatHistories[section] = [];
  }
  window.chatHistories[section].maxMessages = maxMessages;
  
  // Create global variables for each section for backward compatibility
  const globalName = section + 'ChatHistory';
  window[globalName] = window.chatHistories[section];
};

// Add a message to chat history
window.addToChatHistory = function(section, role, content) {
  if (!window.chatHistories[section]) {
    window.initChatHistory(section);
  }
  window.chatHistories[section].push({ role, content });
  
  // Keep only the last maxMessages
  const maxMessages = window.chatHistories[section].maxMessages || 10;
  if (window.chatHistories[section].length > maxMessages) {
    window.chatHistories[section].shift();
  }
  
  // Update global variable
  const globalName = section + 'ChatHistory';
  window[globalName] = window.chatHistories[section];
};

// Get chat history for a section
window.getChatHistory = function(section) {
  if (!window.chatHistories[section]) {
    window.initChatHistory(section);
  }
  return window.chatHistories[section];
};


// Load chat history to DOM
window.loadChatHistoryToDOM = function(section, elementId) {
  const element = document.getElementById(elementId);
  if (!element || !window.chatHistories[section]) return;
  // Clear existing messages
  element.innerHTML = '';
  // Load each message
  window.chatHistories[section].forEach(msg => {
    const msgGroup = document.createElement('div');
    msgGroup.className = 'chat-message-group';
    if (msg.role === 'user') {
      msgGroup.innerHTML = `<div class='user-msg'>${msg.content}</div>`;
    } else {
      msgGroup.innerHTML = `<div class='ai-msg'><span class='ai-msg-text'>${msg.content}</span></div>`;
    }
    element.appendChild(msgGroup);
  });
};

// Clear all chat histories (for full app refresh)
window.clearAllChatHistories = function() {
  window.chatHistories = {};
  // Optionally clear global variables for backward compatibility
  ['home', 'edu', 'agro', 'medi', 'navi', 'eco', 'servi', 'community', 'about'].forEach(section => {
    const globalName = section + 'ChatHistory';
    window[globalName] = [];
  });
};

// Initialize chat histories for all sections
['home', 'edu', 'agro', 'medi', 'navi', 'eco', 'servi', 'community', 'about'].forEach(section => {
  window.initChatHistory(section, 10);
});

// Function to toggle between Gemini models
window.toggleGeminiModel = function(section, useGemini25) {
    window.useGemini25 = useGemini25;
    const label = document.querySelector('.model-label');
    if (label) {
        label.textContent = useGemini25 ? 'Using Gemini 2.5 Flash' : 'Using Gemini 1.5 Flash';
    }
    // Store preference
    localStorage.setItem('gemini_model_preference', useGemini25 ? '2.5' : '1.5');
};

// Initialize model preference from storage
if (typeof window.useGemini25 === 'undefined') {
    const storedPreference = localStorage.getItem('gemini_model_preference');
    window.useGemini25 = storedPreference === '2.5';
}

// Global text-to-speech variables and functions
window.currentSpeech = null;

window.stopSpeaking = function() {
  if (window.currentSpeech) {
    speechSynthesis.cancel();
    window.currentSpeech = null;
  }
};

window.speakText = window.speakText || function(text) {
  window.stopSpeaking();
  
  // Remove HTML tags and convert breaks to spaces
  const cleanText = text.replace(/<[^>]*>/g, '').replace(/<br>/g, ' ');
  
  const utterance = new SpeechSynthesisUtterance(cleanText);
  
  // Set preferred voice (try to use a clear English voice if available)
  const voices = speechSynthesis.getVoices();
  const preferredVoice = voices.find(voice => 
    voice.name.includes('Google') || voice.name.includes('Microsoft') || 
    voice.name.includes('English')
  );
  if (preferredVoice) utterance.voice = preferredVoice;
  
  // Adjust speech parameters for better clarity
  utterance.rate = 1.0;  // Normal speed
  utterance.pitch = 1.0; // Normal pitch
  utterance.volume = 1.0; // Full volume
  
  window.currentSpeech = utterance;
  
  // Visual feedback while speaking
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


const isMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

// --- IMAGE CAPTURE ---
window.captureImage = function(section) {
    if (isMobile()) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.setAttribute('capture', 'environment');
        input.onchange = (e) => window.uploadFile(e, section);
        input.click();
    } else {
        const overlay = document.createElement('div');
        overlay.className = 'overlay';
        overlay.innerHTML = `
            <div class="camera-modal">
                <h3 style="margin-top:0">Take a Photo</h3>
                <video id="camera-feed" autoplay playsinline></video>
                <div class="controls">
                    <button id="snap-btn">Capture</button>
                    <button id="close-camera">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const video = document.getElementById('camera-feed');
        let stream;

        navigator.mediaDevices.getUserMedia({ video: true })
            .then(s => {
                stream = s;
                video.srcObject = stream;
            })
            .catch(() => {
                alert("Camera access denied.");
                overlay.remove();
            });

        document.getElementById('snap-btn').onclick = () => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0);
           
            canvas.toBlob((blob) => {
                const file = new File([blob], "photo.png", { type: "image/png" });
                const dt = new DataTransfer();
                dt.items.add(file);
                window.uploadFile({ target: { files: dt.files } }, section);
            }, 'image/png');

            if (stream) stream.getTracks().forEach(t => t.stop());
            overlay.remove();
        };

        document.getElementById('close-camera').onclick = () => {
            if (stream) stream.getTracks().forEach(t => t.stop());
            overlay.remove();
        };
    }
};

// --- AUDIO RECORDING ---
window.recordAudio = function(section) {
    if (isMobile()) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'audio/*';
        input.setAttribute('capture', 'capture');
        input.onchange = (e) => window.uploadFile(e, section);
        input.click();
    } else {
        const overlay = document.createElement('div');
        overlay.className = 'overlay';
        overlay.innerHTML = `
            <div class="audio-modal">
                <div class="recording-status">
                    <div class="pulse"></div>
                    <span id="record-timer">00:00</span>
                </div>
                <p class="recording-audio">Recording audio...</p>
                <div class="controls">
                    <button id="stop-recording">Stop & Save</button>
                    <button id="close-audio">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        let mediaRecorder;
        let audioChunks = [];
        let stream;
        let seconds = 0;
        let timerInterval;

        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(s => {
                stream = s;
                mediaRecorder = new MediaRecorder(stream);
               
                // Start Timer
                timerInterval = setInterval(() => {
                    seconds++;
                    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
                    const secs = (seconds % 60).toString().padStart(2, '0');
                    document.getElementById('record-timer').innerText = `${mins}:${secs}`;
                }, 1000);

                mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
                mediaRecorder.onstop = () => {
                    clearInterval(timerInterval);
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    const file = new File([audioBlob], "voice.webm", { type: "audio/webm" });
                    const dt = new DataTransfer();
                    dt.items.add(file);
                    window.uploadFile({ target: { files: dt.files } }, section);
                    if (stream) stream.getTracks().forEach(t => t.stop());
                    overlay.remove();
                };
                mediaRecorder.start();
            })
            .catch(() => {
                alert("Microphone access denied.");
                overlay.remove();
            });

        document.getElementById('stop-recording').onclick = () => {
            if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
        };
        document.getElementById('close-audio').onclick = () => {
            clearInterval(timerInterval);
            if (stream) stream.getTracks().forEach(t => t.stop());
            overlay.remove();
        };
    }
};

// --- FILE UPLOAD & PREVIEW ---
window.uploadFile = function(e, section) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
        const preview = document.getElementById(section + '-chat-preview');
        let html = '';
        if (file.type.startsWith('image/')) {
            html = `<img src='${ev.target.result}' style='max-width:120px;max-height:80px;border-radius:8px;margin:4px 0;' alt='Capture' />`;
        } else if (file.type.startsWith('audio/')) {
            html = `<audio src='${ev.target.result}' controls style='max-width:160px;margin:4px 0;'></audio>`;
        } else {
            html = `<div style="padding:5px; background:#f1f1f1; border-radius:5px; font-size:11px;">📄 ${file.name}</div>`;
        }
        preview.innerHTML = html;
        // Remove any lingering remove-btn after sending
        const removeBtn = preview.querySelector('.remove-btn');
        if (removeBtn) removeBtn.remove();
    };
    reader.readAsDataURL(file);
};



window.uploadFile = function(e, section) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(ev) {
        const preview = document.getElementById(section + '-chat-preview');
       
        // Create a container for the preview and the remove button
        const container = document.createElement('div');
        container.className = 'preview-container';

        let mediaHtml = '';
        if (file.type.startsWith('image/')) {
            mediaHtml = `<img src='${ev.target.result}' style='max-width:120px;max-height:80px;border-radius:8px; display:flex; overflow:hidden; object-fit:fill; width:100%; height:100%;' alt='Preview' />`;
        } else if (file.type.startsWith('audio/')) {
            mediaHtml = `<audio src='${ev.target.result}' controls style='max-width:160px; border-radius:8px; display:flex; overflow:hidden; object-fit:fill; width:100%; height:100%;' alt='Preview'></audio>`;
        } else {
            mediaHtml = `<div style="padding:8px; background:#f1f1f1; border-radius:8px; font-size:11px;">📄 ${file.name}</div>`;
        }

        // Add the media and the "X" button to the container
        container.innerHTML = `
            ${mediaHtml}
            <button class="remove-btn" onclick="this.parentElement.remove()" title="Remove">x</button>
        `;

        // Clear previous preview and add the new one
        preview.innerHTML = '';
        preview.appendChild(container);
    };
   
    reader.readAsDataURL(file);
};




/*//Wednesday, January 7, 2026 1:39 PM
// REPLACEMENT: Native Image Capture (Camera)
window.captureImage = function(section) {
  // 1. Create a hidden file input dynamically
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.capture = 'environment'; // 'environment' = rear camera, 'user' = selfie
  input.style.display = 'none';

  // 2. Listen for the user completing the action
  input.onchange = function(e) {
    // Pass the result directly to your existing uploadFile function
    window.uploadFile(e, section);
  };

  // 3. Trigger the native OS interface
  document.body.appendChild(input); // Required by some browsers
  input.click();
  document.body.removeChild(input); // Clean up
};

// REPLACEMENT: Native Audio Recording
window.recordAudio = function(section) {
  // 1. Create a hidden file input dynamically
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'audio/*';
  input.capture = true; // Boolean true triggers the default voice recorder
  input.style.display = 'none';

  // 2. Listen for the user completing the action
  input.onchange = function(e) {
    // Pass the result directly to your existing uploadFile function
    window.uploadFile(e, section);
  };

  // 3. Trigger the native OS interface
  document.body.appendChild(input);
  input.click();
  document.body.removeChild(input);
};

// KEEP YOUR EXISTING UPLOAD FUNCTION
// (No changes needed here, included for context)
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
*/

// Common image capture function
/*
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
*/

// Common function to format AI responses
function formatAIResponse(text) {
  let formatted = text
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '<b>$1</b>') // Bold
    .replace(/\n/g, '<br>'); // Line breaks
  
  // Add read aloud button
  return `
    <div class="ai-response">
      ${formatted}
      <button onclick="window.speakText(this.parentElement.textContent)" class="read-aloud-btn" title="Listen to Response">
        🔊
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

// Robust navbar loader
function ensureNavbarLoaded(cb) {
  if (typeof window.renderNavbar === 'function') {
    window.renderNavbar();
    if (cb) cb();
  } else {
    if (!document.getElementById('navbar-js')) {
      const script = document.createElement('script');
      script.src = 'components/navbar.js';
      script.id = 'navbar-js';
      script.onload = function() {
        if (typeof window.renderNavbar === 'function') window.renderNavbar();
        if (cb) cb();
      };
      document.body.appendChild(script);
    } else {
      let tries = 0;
      (function waitForNavbar() {
        if (typeof window.renderNavbar === 'function') {
          window.renderNavbar();
          if (cb) cb();
        } else if (tries < 30) {
          tries++;
          setTimeout(waitForNavbar, 100);
        }
      })();
    }
  }
}

// Common helper for Gemini API call
async function getGeminiAnswer(localData, msg, apiKey, imageData = null) {
  let modelVersion;
  try {
    const contents = {
      parts: []
    };

    if (imageData) {
      contents.parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: imageData.split(',')[1] // Remove data URL prefix
        }
      });
    }

    // Format chat history
    const historyText = window.homeChatHistory && window.homeChatHistory.map(msg => 
      `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
    ).join('\n');

    // Use the editable prompt from localStorage or fallback
    let promptGuide = '';
    if (historyText) {
      promptGuide = (localStorage.getItem('home_ai_prompt') || window.HOME_AI_PROMPT || '')
        .replace('{history}', historyText);
    } else {
      promptGuide = localStorage.getItem('home_ai_prompt') || window.HOME_AI_PROMPT || '';
    }

    contents.parts.push({
      text: `${promptGuide}\n\n--- LOCAL DATA START ---\n${localData}\n--- LOCAL DATA END ---\n\nUser question: ${msg}`
    });

    // Choose model based on user preference and image presence
    modelVersion = imageData ? 'gemini-pro-vision' : 
                        (window.useGemini25 ? 'gemini-2.5-flash' : 'gemini-1.5-flash');

    // Use backend proxy instead of direct Gemini API
    const url = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? (window.API_BASE || 'http://localhost:4000') + '/api/gemini'
      : '/api/gemini';
    const body = JSON.stringify({ model: modelVersion, contents: [contents] });
    let res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    let data = await res.json();
    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      return data.candidates[0].content.parts[0].text;
    }
    throw new Error('Invalid response format');
  } catch (error) {
    console.error(`Error with ${modelVersion || 'unknown modelVersion'}:`, error);
    throw error;
  }
}
