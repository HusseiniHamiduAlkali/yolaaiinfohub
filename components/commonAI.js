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

// Global handler: any element with class `stop-button` will abort all known section controllers.
// This protects against sections that didn't wire their local stop button correctly.
document.addEventListener('click', function(e) {
  try {
    const el = e.target.closest && e.target.closest('.stop-button');
    if (!el) return;

    // List all known controllers and their section names
    const controllers = {
      home: window.homeAbortController,
      edu: window.eduAbortController,
      agro: window.agroAbortController,
      medi: window.mediAbortController,
      eco: window.ecoAbortController,
      community: window.communityAbortController,
      servi: window.serviAbortController,
      navi: window.naviAbortController
    };

    Object.keys(controllers).forEach(section => {
      const ctrl = controllers[section];
      if (ctrl && typeof ctrl.abort === 'function') {
        try { ctrl.abort(); } catch (err) { /* ignore */ }
      }
    });

    // Update UI: hide generic stop buttons and reset send buttons
    const sendButtons = document.querySelectorAll('.send-button');
    sendButtons.forEach(btn => {
      btn.classList.remove('sending');
      btn.textContent = 'Send';
      btn.style.backgroundColor = '';
      // restore type if it was changed to button
      if (btn.dataset.origType) btn.type = btn.dataset.origType;
    });

    // Show a generic aborted message in any visible chat container
    const chatContainers = document.querySelectorAll('.chat-messages');
    chatContainers.forEach(c => {
      const abortMessage = document.createElement('div');
      abortMessage.className = 'chat-message';
      abortMessage.innerHTML = `<div class="error-message">Request aborted by user</div>`;
      c.appendChild(abortMessage);
      c.scrollTop = c.scrollHeight;
    });
  } catch (err) {
    console.warn('Global stop handler error', err);
  }
});
// commonAI.js
// Shared utility functions for AI sections (Home, Edu, Agro, etc.)

// Gemini model preference
window.useGemini25 = window.useGemini25 || false;

// Chat history management with localStorage persistence
// In-memory storage for chat histories
window.chatHistories = window.chatHistories || {};
window.chatHistoriesMaxMessages = 20; // Max 20 messages per section
window.chatStorageKey = 'chatHistories_v2'; // localStorage key

// Load all chat histories from localStorage on startup
window.loadChatHistoriesFromStorage = function() {
  try {
    const stored = localStorage.getItem(window.chatStorageKey);
    if (stored) {
      window.chatHistories = JSON.parse(stored);
    }
  } catch (e) {
    console.warn('Failed to load chat histories from storage', e);
  }
};

// Save all chat histories to localStorage
window.saveChatHistoriesToStorage = function() {
  try {
    localStorage.setItem(window.chatStorageKey, JSON.stringify(window.chatHistories));
  } catch (e) {
    console.warn('Failed to save chat histories to storage', e);
  }
};

// Initialize chat history for a section
window.initChatHistory = function(section, maxMessages = 20) {
  if (!window.chatHistories[section]) {
    window.chatHistories[section] = [];
  }
  window.chatHistories[section].maxMessages = maxMessages || window.chatHistoriesMaxMessages;
  
  // Create global variables for each section for backward compatibility
  const globalName = section + 'ChatHistory';
  window[globalName] = window.chatHistories[section];
};

// Add a message to chat history with persistent storage
window.addToChatHistory = function(section, role, content) {
  if (!window.chatHistories[section]) {
    window.initChatHistory(section);
  }
  
  // Add message with timestamp and unique ID
  const message = {
    id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    role,
    content,
    timestamp: Date.now(),
    deleted: false // Flag for manually deleted messages
  };
  
  window.chatHistories[section].push(message);
  
  // Keep only the last maxMessages - auto-delete oldest
  const maxMessages = window.chatHistories[section].maxMessages || window.chatHistoriesMaxMessages;
  if (window.chatHistories[section].length > maxMessages) {
    // Remove oldest message
    window.chatHistories[section].shift();
  }
  
  // Update global variable
  const globalName = section + 'ChatHistory';
  window[globalName] = window.chatHistories[section];
  
  // Persist to localStorage
  window.saveChatHistoriesToStorage();
};

// Get chat history for a section
window.getChatHistory = function(section) {
  if (!window.chatHistories[section]) {
    window.initChatHistory(section);
  }
  return window.chatHistories[section];
};

// Delete a specific message from chat history
window.deleteFromChatHistory = function(section, messageId) {
  if (!window.chatHistories[section]) return;
  
  const index = window.chatHistories[section].findIndex(msg => msg.id === messageId);
  if (index !== -1) {
    window.chatHistories[section].splice(index, 1);
    
    // Update global variable
    const globalName = section + 'ChatHistory';
    window[globalName] = window.chatHistories[section];
    
    // Persist to localStorage
    window.saveChatHistoriesToStorage();
    
    return true;
  }
  return false;
};

// Get active user for chat history tracking
window.getCurrentUser = function() {
  // Check if user is logged in from localStorage or auth state
  try {
    const userStr = localStorage.getItem('userEmail') || localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    return null;
  }
};

// --- MESSAGE RENDERING HELPER ---
// Unified function to create message DOM elements with speak, copy, delete buttons for AI messages
window.createMessageElement = function(message, section, containerId) {
  const msgGroup = document.createElement('div');
  msgGroup.className = 'chat-message-group';
  const mid = message && message.id ? message.id : (Date.now() + '_' + Math.random().toString(36).substr(2,9));
  msgGroup.setAttribute('data-msg-id', mid);
  const isUser = message && message.role === 'user';
  let contentHtml = message && message.content ? message.content : '';
  if (!isUser && contentHtml) {
    // remove any buttons that may have been included in earlier formats
    const tmp = document.createElement('div');
    tmp.innerHTML = contentHtml;
    tmp.querySelectorAll('button').forEach(b => b.remove());
    // also remove any stray action containers (e.g. old flex div wrappers)
    tmp.querySelectorAll('.msg-actions, .ai-response').forEach(el => {
      // keep ai-response container but strip nested buttons
      if (el.classList.contains('ai-response')) return;
      el.remove();
    });
    contentHtml = tmp.innerHTML;
  }

  if (isUser) {
    msgGroup.innerHTML = `
      <div class='user-msg' data-msg-id='${mid}'>
        <span class='msg-text'>${contentHtml}</span>
      </div>
    `;
  } else {
    // AI message: content in ai-msg and actions placed below bubble
    msgGroup.innerHTML = `
      <div class='ai-msg' data-msg-id='${mid}'>
        <span class='ai-msg-text msg-text'>${contentHtml}</span>
      </div>
      <span class='msg-actions' data-msg-id='${mid}'>
        <button class='read-aloud-btn' data-msg-id='${mid}' title='Listen'>🔊</button>
        <button class='copy-btn' data-msg-id='${mid}' title='Copy'>📋</button>
        <button class='delete-msg-btn' data-msg-id='${mid}' title='Delete message'>🗑️</button>
      </span>
    `;

    // Attach event listeners for AI message actions
    // Speak
    const speakBtn = msgGroup.querySelector('.read-aloud-btn');
    if (speakBtn) {
      speakBtn.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        const txt = msgGroup.querySelector('.msg-text') ? msgGroup.querySelector('.msg-text').textContent : '';
        if (txt) window.speakText(txt, speakBtn);
      });
    }
    // Copy
    const copyBtn = msgGroup.querySelector('.copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', async (e) => {
        e.preventDefault(); e.stopPropagation();
        const txt = msgGroup.querySelector('.msg-text') ? msgGroup.querySelector('.msg-text').textContent : '';
        if (!txt) return;
        try {
          await navigator.clipboard.writeText(txt);
          window.showCopyTooltip(copyBtn, 'Message copied!');
        } catch (err) {
          console.warn('Copy failed', err);
        }
      });
    }
    // Delete
    const deleteBtn = msgGroup.querySelector('.delete-msg-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        const msgId = deleteBtn.getAttribute('data-msg-id') || mid;
        window.confirmDeleteMessage(section, containerId, msgId);
      });
    }
  }
  return msgGroup;
};

// Load chat history to DOM
window.loadChatHistoryToDOM = function(section, elementId) {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  // Initialize history if doesn't exist
  if (!window.chatHistories[section]) {
    window.initChatHistory(section);
  }
  
  const history = window.chatHistories[section];
  if (!history || !Array.isArray(history)) return;
  
  // Clear existing messages
  element.innerHTML = '';
  
  // Load each message using unified rendering function
  history.forEach(msg => {
    if (msg && msg.deleted !== true) {
      const msgElement = window.createMessageElement(msg, section, elementId);
      element.appendChild(msgElement);
    }
  });
  
  // Auto-scroll to bottom after loading
  setTimeout(() => {
    window.scrollChatToBottom(elementId, 'auto');
  }, 50);
};

// --- CHAT APPEND & AUTO-SCROLL HELPERS ---
// Append a message to a chat container, optionally persist to history, and auto-scroll.
window.appendChatMessage = function({ section = 'home', containerId, role = 'ai', content = '', persistHistory = true }) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Persist into in-memory chat history first to get the message ID
  let messageId = null;
  if (persistHistory) {
    // Save to history and get the message ID
    if (!window.chatHistories[section]) {
      window.initChatHistory(section);
    }
    
    messageId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const message = {
      id: messageId,
      role,
      content,
      timestamp: Date.now(),
      deleted: false
    };
    
    window.chatHistories[section].push(message);
    
    // Keep only the last maxMessages
    const maxMessages = window.chatHistories[section].maxMessages || window.chatHistoriesMaxMessages;
    if (window.chatHistories[section].length > maxMessages) {
      window.chatHistories[section].shift();
    }
    
    // Update global variable
    const globalName = section + 'ChatHistory';
    window[globalName] = window.chatHistories[section];
    
    // Persist to localStorage
    window.saveChatHistoriesToStorage();
  } else {
    // If not persisting, still create message object for rendering
    messageObj = { id: messageId, role, content };
  }

  // Use unified message rendering function
  const msgElement = window.createMessageElement(messageObj || { id: messageId, role, content, timestamp: Date.now() }, section, containerId);
  container.appendChild(msgElement);

  // Ensure observer is attached and scroll to bottom
  window.scrollChatToBottom(containerId, 'smooth');
};

// Delete message from UI and history
window.deleteMessageFromUI = function(section, containerId, messageId) {
  // Remove from DOM
  const msgElement = document.querySelector(`[data-msg-id="${messageId}"]`);
  if (msgElement) {
    msgElement.style.opacity = '0.5';
    setTimeout(() => {
      msgElement.remove();
    }, 300);
  }
  
  // Remove from history
  window.deleteFromChatHistory(section, messageId);
  
  // Show confirmation (optional visual feedback)
  console.log(`Message deleted from ${section}`);
};

// Smooth scroll a chat container to the bottom
window.scrollChatToBottom = function(containerId, behavior = 'auto') {
  const el = document.getElementById(containerId);
  if (!el) return;
  try {
    // Prefer scrollTo with behavior when available
    if (el.scrollTo) el.scrollTo({ top: el.scrollHeight, behavior });
    el.scrollTop = el.scrollHeight;
  } catch (e) {
    el.scrollTop = el.scrollHeight;
  }
};

// Attach MutationObservers to all elements with class 'chat-messages' so they auto-scroll when new children added
window.observeChatContainers = function() {
  const containers = document.querySelectorAll('.chat-messages');
  containers.forEach(c => {
    if (c.__chatObserverAttached) return;
    const observer = new MutationObserver(muts => {
      // Only react to child list changes (new messages)
      for (const m of muts) {
        if (m.type === 'childList' && m.addedNodes.length) {
          // Scroll after a short delay to allow layout
          setTimeout(() => {
            c.scrollTop = c.scrollHeight;
          }, 40);
          break;
        }
      }
    });
    observer.observe(c, { childList: true });
    c.__chatObserverAttached = true;
  });
};

// Ensure observers are attached when DOM is ready and when new containers are added
document.addEventListener('DOMContentLoaded', () => {
  // Load chat histories from localStorage on page load
  window.loadChatHistoriesFromStorage();
  
  window.observeChatContainers();
  // Observe the body for dynamically added chat containers
  const bodyObserver = new MutationObserver(() => window.observeChatContainers());
  bodyObserver.observe(document.body, { childList: true, subtree: true });
});

// --- CHAT HISTORY FORMATTING FOR AI ---
// Format chat history for use in AI API calls (to maintain context)
window.formatChatHistoryForAI = function(section, maxMessages = 20) {
  const history = window.getChatHistory(section);
  if (!history || history.length === 0) return '';
  
  // Get last maxMessages from history
  const recentMessages = history.slice(-maxMessages);
  
  // Format as text for context
  return recentMessages.map(msg => {
    const role = msg.role === 'user' ? 'User' : 'Assistant';
    return `${role}: ${msg.content}`;
  }).join('\n');
};

// Get previous messages for system context in Gemini API calls
window.getPreviousMessagesForContext = function(section) {
  const history = window.getChatHistory(section);
  if (!history || history.length === 0) return [];
  
  // Return only the last 10 messages for context (to avoid token limit)
  return history.slice(-10).map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));
};

// Clear all chat histories for a specific section
window.clearChatHistoryForSection = function(section) {
  if (window.chatHistories[section]) {
    window.chatHistories[section] = [];
    const globalName = section + 'ChatHistory';
    window[globalName] = [];
    window.saveChatHistoriesToStorage();
    return true;
  }
  return false;
};

// Clear all chat histories for all sections (on logout or reset)
window.clearAllChatHistories = function() {
  window.chatHistories = {};
  window.saveChatHistoriesToStorage();
  // Clear all section-specific global variables
  const sections = ['home', 'edu', 'agro', 'medi', 'navi', 'community', 'about', 'eco', 'servi'];
  sections.forEach(section => {
    const globalName = section + 'ChatHistory';
    window[globalName] = [];
  });
};

// Get all chat histories grouped by section (for viewing all chats)
window.getAllChatHistories = function() {
  return window.chatHistories;
};

// --- FAQ CACHING ---
// Simple FAQ cache with localStorage persistence and TTL
window.faqCache = (function() {
  const STORAGE_KEY = 'faq_cache_v1';
  const DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours

  let store = { data: {}, ttlMs: DEFAULT_TTL };

  // Load from storage
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.data) store = parsed;
    }
  } catch (e) {
    console.warn('Failed to load FAQ cache', e);
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); } catch (e) { /* ignore */ }
  }

  function get(question) {
    if (!question) return null;
    const key = question.trim().toLowerCase();
    const entry = store.data[key];
    if (!entry) return null;
    if (Date.now() - (entry.ts || 0) > (store.ttlMs || DEFAULT_TTL)) {
      // expired
      delete store.data[key];
      save();
      return null;
    }
    return entry.answer;
  }

  function set(question, answer) {
    if (!question) return;
    const key = question.trim().toLowerCase();
    store.data[key] = { answer, ts: Date.now() };
    save();
  }

  function clear() {
    store = { data: {}, ttlMs: DEFAULT_TTL };
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  }

  function setTTL(ms) { store.ttlMs = ms; save(); }

  // Higher-level helper: get or fetch via provided async fetcher
  async function getOrFetch(question, fetcher) {
    if (!question) return null;
    const cached = get(question);
    if (cached) return cached;
    if (typeof fetcher !== 'function') return null;
    try {
      const answer = await fetcher(question);
      if (answer) set(question, answer);
      return answer;
    } catch (e) {
      console.warn('FAQ fetcher failed', e);
      return null;
    }
  }

  return { get, set, clear, setTTL, getOrFetch };
})();

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

// Shared function to clear preview and remove the remove-btn
// Use this instead of preview.innerHTML = '' in all section files
window.clearPreviewAndRemoveBtn = function(previewElement) {
  if (!previewElement) return;

  // Remove any preview children and specific remove button
  try {
    // If a remove button exists, remove it
    const removeBtn = previewElement.querySelector('.remove-btn');
    if (removeBtn) removeBtn.remove();
    // Clear remaining preview content
    previewElement.innerHTML = '';
  } catch (e) {
    // Fallback to clearing HTML
    previewElement.innerHTML = '';
  }
};

// Convenience function called by the inline remove button
window.removePreview = function(section) {
  try {
    const preview = document.getElementById(section + '-chat-preview');
    if (preview) window.clearPreviewAndRemoveBtn(preview);
  } catch (e) {
    console.warn('removePreview error', e);
  }
};

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

// Define isMobile function if not already defined (to prevent redeclaration)
if (typeof window.isMobile === 'undefined') {
  const isMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  window.isMobile = isMobile;
}

// --- IMAGE CAPTURE ---
window.captureImage = function(section) {
    if (window.isMobile()) {
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
    if (window.isMobile()) {
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
      // Create a container with the preview and a remove button
      const container = document.createElement('div');
      container.className = 'preview-container';
      let html = '';
      if (file.type.startsWith('image/')) {
        html = `<img src='${ev.target.result}' style='max-width:120px;max-height:80px;border-radius:8px;margin:4px 0;' alt='Capture' />`;
      } else if (file.type.startsWith('audio/')) {
        html = `<audio src='${ev.target.result}' controls style='max-width:160px;margin:4px 0;'></audio>`;
      } else {
        html = `<div style="padding:5px; background:#f1f1f1; border-radius:5px; font-size:11px;">📄 ${file.name}</div>`;
      }
      container.innerHTML = `${html}<button class="remove-btn" onclick="window.removePreview('${section}')" title="Remove">x</button>`;
      preview.innerHTML = '';
      preview.appendChild(container);
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
          <button class="remove-btn" onclick="window.removePreview('${section}')" title="Remove">x</button>
        `;

        // Clear previous preview and add the new one
        preview.innerHTML = '';
        preview.appendChild(container);
    };
   
    reader.readAsDataURL(file);
};

// Common function to format AI responses
function formatAIResponse(text) {
  let formatted = text
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '<b>$1</b>') // Bold
    .replace(/\n/g, '<br>'); // Line breaks
  
  // only return the formatted content; action buttons will be rendered
  // separately so they can be positioned at the bottom of the bubble.
  return `
    <div class="ai-response">
      ${formatted}
    </div>
  `;
}

// Copy AI response to clipboard
window.copyResponseToClipboard = function(btn) {
  const responseDiv = btn.closest('.ai-response');
  if (!responseDiv) return;
  const text = responseDiv.textContent.replace(/[🔊📋🗑️]/g, '').trim();
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    window.showCopyTooltip(btn, 'Message copied!');
  }).catch(err => console.warn('Copy failed:', err));
};

// Delete AI response message
window.deleteAIResponse = function(btn) {
  const ok = confirm('Delete this message? This action cannot be undone.');
  if (!ok) return;
  const msgGroup = btn.closest('.chat-message-group');
  if (msgGroup) {
    msgGroup.style.opacity = '0.5';
    setTimeout(() => msgGroup.remove(), 300);
  } else {
    // Fallback: remove just the response div
    const responseDiv = btn.closest('.ai-response');
    if (responseDiv) {
      responseDiv.style.opacity = '0.5';
      setTimeout(() => responseDiv.remove(), 300);
    }
  }
};

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
async function getGeminiAnswer(localData, msg, apiKey, imageData = null, signal = null) {
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
    
    // Build fetch options with optional signal for abort support
    const fetchOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    };
    if (signal) {
      fetchOptions.signal = signal;
    }
    
    let res = await fetch(url, fetchOptions);

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    let data = await res.json();
    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      return data.candidates[0].content.parts[0].text;
    }
    throw new Error('Invalid response format');
  } catch (error) {
    // Properly handle and re-throw AbortError
    if (error.name === 'AbortError' || error.message === 'AbortError') {
      console.log('Request aborted by user');
      throw error;
    }
    console.error(`Error with ${modelVersion || 'unknown modelVersion'}:`, error);
    throw error;
  }
}
