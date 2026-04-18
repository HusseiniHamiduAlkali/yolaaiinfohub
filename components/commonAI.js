// --- API CONFIGURATION ---
// Detect if running on live URL or localhost and set API base accordingly
window.getAPIBase = function() {
  // Check if running on production/live URL
  if (window.location.hostname.includes('netlify.app') || window.location.hostname.includes('yolaaiinfohub')) {
    // Production: use Render backend
    return 'https://yolaaiinfohub-backend.onrender.com';
  }
  // Development: use the current hostname so we don't mix 'localhost' and '127.0.0.1'
  // which cause separate cookie domains and inconsistent session state.
  const host = window.location.hostname || 'localhost';
  return `http://${host}:4000`;
};

window.API_BASE = window.API_BASE || window.getAPIBase();

// --- MULTILINGUAL LANGUAGE DETECTION & SUPPORT ---
/**
 * Supported languages and their codes
 * These match the i18n module languages
 */
window.SUPPORTED_LANGUAGES = {
  'en': 'English',
  'ha': 'Hausa',
  'ar': 'Arabic',
  'fr': 'French',
  'ff': 'Fulfulde',
  'yo': 'Yoruba',
  'ig': 'Igbo',
  'pcm': 'Pidgin'
};

/**
 * Detect the current app language setting from i18n
 * @returns {string} - Language code (en, ha, ar, fr, ff, yo, ig, pcm)
 */
window.getCurrentAppLanguage = function() {
  if (typeof window.i18n !== 'undefined' && window.i18n.getLanguage) {
    return window.i18n.getLanguage();
  }
  // Fallback to localStorage
  try {
    const lang = localStorage.getItem('appLanguage');
    return lang || 'en';
  } catch (e) {
    return 'en';
  }
};

/**
 * Simple language detection for user input text
 * Uses character detection and common words to identify language
 * @param {string} text - User message text
 * @returns {string} - Detected language code or 'en' for unknown
 */
window.detectMessageLanguage = function(text) {
  if (!text || text.length < 2) return window.getCurrentAppLanguage();
  
  const sampleText = text.substring(0, 500).toLowerCase();
  
  // Arabic characters (AR)
  if (/[\u0600-\u06FF]/.test(sampleText)) return 'ar';
  
  // Hausa common words and patterns
  if (/\b(na|ni|yi|shi|ba|uba|wani|tun|sai|ga)\b/i.test(sampleText)) return 'ha';
  
  // French common words (FR)
  if (/\b(bonjour|merci|s'il vous|est|de|le|la|les|vous|nous|avec|pour|que|c'est|je|tu|il|qui)\b/i.test(sampleText)) return 'fr';
  
  // Fulfulde common words (FF)
  if (/\b(ko|ɗo|ngaa|jom|nde|eɗen|laawol|pulaaku|firaande)\b/i.test(sampleText)) return 'ff';
  
  // Yoruba common words and tones (YO)
  if (/[\u0300-\u0301]/.test(sampleText) || /\b(ẹ|ọ|ṣ|e|o|s|a|i|u|n|r)\b/i.test(sampleText) && 
      /\b(o|e|a|wa|ti|fi|ri|ni|si|lo|wo|ye|bo|le|ke|lu|ju|sa|so|mi|ma|mu)\b/i.test(sampleText)) {
    return 'yo';
  }
  
  // Igbo common words (IG)
  if (/\b(ọ|ụ|ị|ebe|mma|ike|chi|eze|okwa|ihe|mmad|nna|nne)\b/i.test(sampleText)) return 'ig';
  
  // Pidgin English patterns (PCM)
  if (/\b(go|come|be|don|no|make|because|for|e|am|na|to|abi|sef|jare)\b/i.test(sampleText)) return 'pcm';
  
  // Default to current app language
  return window.getCurrentAppLanguage();
};

/**
 * Generate a multilingual prompt instruction for Gemini
 * This tells Gemini to understand and respond in the detected language
 * @param {string} userMessage - The user's message
 * @param {string} section - The section/category (home, edu, agro, medi, eco, community, servi, navi)
 * @returns {string} - Enhanced prompt with language instructions
 */
window.generateMultilingualPrompt = function(userMessage, section = 'home') {
  const detectedLanguage = window.detectMessageLanguage(userMessage);
  const appLanguage = window.getCurrentAppLanguage();
  const languageName = window.SUPPORTED_LANGUAGES[detectedLanguage] || 'English';
  
  // Build language-aware prompt
  let multilingualContext = `
You are a helpful AI assistant for the Yola AI Info Hub application.

LANGUAGE INFORMATION:
- User's detected message language: ${languageName} (${detectedLanguage})
- App interface language: ${window.SUPPORTED_LANGUAGES[appLanguage] || 'English'} (${appLanguage})

IMPORTANT LANGUAGE REQUIREMENTS:
1. The user's message is in ${languageName}. Please understand and respond appropriately to their request, EVEN IF IT'S NOT IN ENGLISH.
2. You must be able to understand requests in ALL these languages: English, Hausa, Arabic, French, Fulfulde, Yoruba, Igbo, and Pidgin.
3. Respond to the user in the same language they used in their message (${languageName}).
4. If the user code-switches (mixes languages), respond primarily in the dominant language used.
5. Maintain the context and meaning of Yola, Adamawa State, Nigeria throughout your responses.

SECTION CONTEXT: ${section.toUpperCase()}
Provide information relevant to the ${section} section of the Yola AI Info Hub.
`;

  return multilingualContext;
};

/**
 * Translate a system prompt to match user's language preference
 * @param {string} basePrompt - The base prompt in English
 * @param {string} targetLanguage - Target language code (en, ha, ar, fr, ff, yo, ig, pcm)
 * @returns {string} - Instruction to help Gemini understand language needs
 */
window.getLanguageAdjustedPrompt = function(basePrompt, targetLanguage = 'en') {
  if (targetLanguage === 'en') return basePrompt;
  
  const languageName = window.SUPPORTED_LANGUAGES[targetLanguage] || 'English';
  return `${basePrompt}

IMPORTANT: Please understand that the user may respond in ${languageName}. 
If they do, please comprehend their ${languageName} message and respond appropriately.
You must be fluent in understanding requests in all major Nigerian and regional languages.`;
};

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

/**
 * Setup Stop button functionality for a section with proper abort handling.
 * Call this during message sending to automatically wire up the Stop button.
 * @param {Object} opts - Options object
 * @param {HTMLElement} opts.sendBtn - The Send/Stop button element to wire up
 * @param {string} opts.section - Section name (e.g., 'home', 'edu', 'agro', etc.)
 * @param {string} [opts.controllerName] - Global controller variable name (defaults to `${section}AbortController`)
 * @returns {AbortController} - The abort controller instance
 */
window.setupStopButton = function({ sendBtn, section, controllerName }) {
  if (!sendBtn) return null;
  
  // Determine controller variable name
  const ctrlName = controllerName || (section + 'AbortController');
  
  // Create or reset the abort controller
  if (window[ctrlName]) {
    try { window[ctrlName].abort(); } catch (e) { /* ignore */ }
  }
  window[ctrlName] = new AbortController();
  
  // Set up the button UI and handler
  sendBtn.classList.add('sending');
  sendBtn.textContent = 'Stop';
  sendBtn.style.backgroundColor = '#ff4444';
  
  // Store original type for restoration
  const originalType = sendBtn.type;
  sendBtn.type = 'button'; // Prevent form submission during stop
  
  // Store controller info on the button itself for delegation
  sendBtn.dataset.aborting = 'true';
  sendBtn.dataset.section = section;
  sendBtn.dataset.ctrlName = ctrlName;
  
  // Create stop handler with proper event handling
  const stopHandler = (e) => {
    // Only handle if this is actually being stopped
    if (sendBtn.dataset.aborting !== 'true') return;
    
    if (e) {
      if (typeof e.preventDefault === 'function') {
        e.preventDefault();
      }
      if (typeof e.stopPropagation === 'function') {
        e.stopPropagation();
      }
    }
    
    // Abort the controller
    if (window[ctrlName]) {
      try { 
        window[ctrlName].abort();
      } catch (err) { /* ignore */ }
      window[ctrlName] = null;
    }
    
    // Clean up - mark as not aborting so handler doesn't re-trigger
    sendBtn.dataset.aborting = 'false';
    
    // Reset button UI
    sendBtn.classList.remove('sending');
    sendBtn.textContent = 'Send';
    sendBtn.style.backgroundColor = '';
    sendBtn.type = originalType;
  };
  
  // Add the click handler - will be called every time until removed
  sendBtn.addEventListener('click', stopHandler);
  
  // Return the controller so the calling function can use it
  return window[ctrlName];
};

/**
 * Helper to safely fetch with abort signal, properly handling AbortError.
 * @param {string} url - URL to fetch
 * @param {AbortSignal} [signal] - Abort signal from AbortController
 * @param {Object} [options] - Additional fetch options
 * @returns {Promise<Response>}
 */
window.fetchWithSignal = async function(url, signal, options = {}) {
  const fetchOptions = {
    ...options,
    ...(signal && { signal })
  };
  return fetch(url, fetchOptions);
};

// Map various internal/network/API errors to friendly, non-technical messages
window.friendlyAIErrorMessage = function(err) {
  try {
    if (!err) return "The AI is currently unavailable. Please try again later.";
    const msg = (err && err.message) ? err.message : '';
    if (msg.includes('API_RATE_LIMIT')) return "The AI is receiving too many requests right now. Please try again a little later.";
    if (msg.includes('API_SERVER_ERROR')) return "The AI service is temporarily unavailable. Please try again later.";
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) return "Can't access the AI — please check your internet connection and try again.";
    if (msg.includes('API_BAD_REQUEST')) return "I couldn't understand that request. Please try rephrasing your question.";
    if (msg.includes('INVALID_JSON_RESPONSE') || msg.includes('INVALID_RESPONSE_FORMAT') || msg.includes('EMPTY_RESPONSE')) return "The AI returned an unexpected response. Please try again or ask something different.";
    if (msg.toLowerCase().includes('api key') || msg.toLowerCase().includes('authentication')) return "The AI service is not configured. Please check the app settings.";
    return "The AI is currently unavailable. Please try again later.";
  } catch (e) {
    return "The AI is currently unavailable. Please try again later.";
  }
};

// commonAI.js
// Shared utility functions for AI sections (Home, Edu, Agro, etc.)

// Gemini model preference
window.useGemini25 = window.useGemini25 || true;

// Chat history management with localStorage persistence
// In-memory storage for chat histories
window.chatHistories = window.chatHistories || {};
window.chatHistoriesMaxMessages = 20; // Max 20 messages per section per user (auto-clear older ones)
window.chatStorageKey = 'chatHistories_v3'; // localStorage key

// Load all chat histories from localStorage on startup
window.loadChatHistoriesFromStorage = function() {
  try {
    const stored = localStorage.getItem(window.chatStorageKey);
    if (stored) {
      window.chatHistories = JSON.parse(stored);
      let totalMessages = 0;
      for (const key in window.chatHistories) {
        if (Array.isArray(window.chatHistories[key])) {
          totalMessages += window.chatHistories[key].length;
        }
      }
      console.log(`%c📂 Loaded from localStorage: ${Object.keys(window.chatHistories).length} sections, ${totalMessages} total messages`, 'color: #8b5cf6; font-weight: bold;');
    } else {
      console.log('%c📂 No previous chat history found in localStorage (fresh start)', 'color: #6b7280;');
    }
  } catch (e) {
    console.error('❌ Failed to load chat histories from storage:', e);
  }
};

// Save all chat histories to localStorage
window.saveChatHistoriesToStorage = function() {
  try {
    const dataToStore = {};
    let totalMessages = 0;
    for (const key in window.chatHistories) {
      if (Array.isArray(window.chatHistories[key])) {
        dataToStore[key] = window.chatHistories[key];
        totalMessages += window.chatHistories[key].length;
      }
    }
    localStorage.setItem(window.chatStorageKey, JSON.stringify(dataToStore));
    console.log(`%c💾 Saved to localStorage: ${Object.keys(dataToStore).length} sections, ${totalMessages} total messages`, 'color: #6366f1; font-weight: bold;');
    
    // Also sync to backend if user is logged in
    window.syncChatHistoriesToBackend();
  } catch (e) {
    console.error('❌ Failed to save chat histories to storage:', e);
  }
};

// Sync chat history for a specific section to backend (optional - fails silently)
window.syncChatHistoryToBackend = async function(section) {
  const user = window.getLoggedInUser();
  if (!user) return; // Only sync for logged-in users
  
  try {
    const key = window.getChatHistoryKey(section);
    const messages = window.chatHistories[key] || [];
    
    const res = await fetch(`${window.API_BASE}/api/chat-history/${section}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ messages }),
      timeout: 2000
    });
    
    // Silently fail if endpoint doesn't exist - localStorage is the primary storage
    if (!res.ok) {
      return;
    }
  } catch (e) {
    // Silently ignore - backend sync is optional
  }
};

// Sync all chat histories to backend (debounced)
window.syncChatHistoriesToBackend = (function() {
  let timeout = null;
  return function() {
    clearTimeout(timeout);
    timeout = setTimeout(async () => {
      const user = window.getLoggedInUser();
      if (!user) return;
      
      // Sync all sections (exclude About which is now Settings-only)
      const sections = ['home', 'edu', 'agro', 'medi', 'navi', 'eco', 'servi', 'community', 'settings'];
      for (const section of sections) {
        window.syncChatHistoryToBackend(section);
      }
    }, 1000); // Debounce: sync 1 second after last message
  };
})();

// Load chat history for a section from backend
// Note: This is optional - falls back to localStorage if backend endpoints don't exist
window.loadChatHistoryFromBackend = async function(section) {
  const user = window.getLoggedInUser();
  if (!user) return null;
  
  try {
    const res = await fetch(`${window.API_BASE}/api/chat-history/${section}`, {
      method: 'GET',
      credentials: 'include',
      timeout: 2000 // Quick timeout
    });
    
    if (!res.ok) {
      // Silently fail for 404 - endpoint doesn't exist yet, use localStorage
      return null;
    }
    
    const data = await res.json();
    return data.messages || [];
  } catch (e) {
    // Silently fail - app works fine with localStorage
    return null;
  }
};

// Initialize chat history from backend on login (optional - fails silently if endpoints don't exist)
window.loadAllChatHistoriesFromBackend = async function() {
  const user = window.getLoggedInUser();
  if (!user) return;
  
  // Silently attempt to load from backend
  // If backend doesn't have endpoints, localStorage will be used instead
  const sections = ['home', 'edu', 'agro', 'medi', 'navi', 'eco', 'servi', 'community', 'settings'];
  let loadedCount = 0;
  
  for (const section of sections) {
    try {
      const backendMessages = await window.loadChatHistoryFromBackend(section);
      if (backendMessages && backendMessages.length > 0) {
        const key = window.getChatHistoryKey(section);
        window.chatHistories[key] = backendMessages;
        loadedCount++;
      }
    } catch (e) {
      // Silently ignore - localStorage will be used
    }
  }
  
  // Only save to localStorage if we actually loaded something from backend
  if (loadedCount > 0) {
    window.saveChatHistoriesToStorage();
  }
};


// Get the current logged-in user
window.getLoggedInUser = function() {
  try {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user && user.username ? user.username : null;
    }
  } catch (e) { /* ignore */ }
  return null;
};

// Generate storage key for a section-user combination
window.getChatHistoryKey = function(section) {
  const user = window.getLoggedInUser();
  if (user) {
    return `${section}_${user}`;
  }
  // For non-logged-in users, use the section name directly
  return section;
};

// Initialize chat history for a section (specific to current user)
window.initChatHistory = function(section, maxMessages = 50) {
  const key = window.getChatHistoryKey(section);
  
  // Skip if already initialized for this section
  if (window.chatHistories[key] && window.chatHistories[key].length > 0) {
    return;
  }
  
  if (!window.chatHistories[key]) {
    // Try to load from localStorage first
    if (window.chatStorageKey) {
      try {
        const stored = localStorage.getItem(window.chatStorageKey);
        if (stored) {
          const histories = JSON.parse(stored);
          if (histories[key]) {
            window.chatHistories[key] = histories[key];
          }
        }
      } catch (e) {
        // If load fails, start fresh
      }
    }
    
    // If still empty, initialize empty array
    if (!window.chatHistories[key]) {
      window.chatHistories[key] = [];
    }
  }
  
  window.chatHistories[key].maxMessages = maxMessages || window.chatHistoriesMaxMessages;
  
  // Create global variables for each section for backward compatibility
  const globalName = section + 'ChatHistory';
  window[globalName] = window.chatHistories[key];
  
  if (window.chatHistories[key].length > 0) {
    console.log(`%c📝 Chat history loaded for ${section} (${key}) - ${window.chatHistories[key].length} messages`, 'color: #10b981; font-weight: bold;');
  }
};

// Initialize chat history AND restore previous messages to DOM
window.initAndRestoreSectionHistory = function(section, elementId) {
  // Initialize the in-memory history
  window.initChatHistory(section);
  
  // Load existing messages from history to the DOM
  window.loadChatHistoryToDOM(section, elementId);
  
  console.log(`%c🔄 Restored ${section} chat history to DOM`, 'color: #f59e0b; font-weight: bold;');
};

// Add a message to chat history with persistent storage
window.addToChatHistory = function(section, role, content) {
  const key = window.getChatHistoryKey(section);
  if (!window.chatHistories[key]) {
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
  
  window.chatHistories[key].push(message);
  console.log(`%c➕ Added to history (${key}): ${role.toUpperCase()} - ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`, 'color: #059669;');
  
  // Keep only the last maxMessages - auto-delete oldest
  const maxMessages = window.chatHistories[key].maxMessages || window.chatHistoriesMaxMessages;
  if (window.chatHistories[key].length > maxMessages) {
    // Remove oldest message
    window.chatHistories[key].shift();
    console.log(`%c🗑️ Auto-deleted oldest message (limit: ${maxMessages})`, 'color: #dc2626;');
  }
  
  // Update global variable
  const globalName = section + 'ChatHistory';
  window[globalName] = window.chatHistories[key];
  
  // Persist to localStorage
  window.saveChatHistoriesToStorage();
};

// Get chat history for a section
window.getChatHistory = function(section) {
  const key = window.getChatHistoryKey(section);
  if (!window.chatHistories[key]) {
    window.initChatHistory(section);
  }
  return window.chatHistories[key];
};

// Get raw chat history array (for API calls)
window.getChatHistoryArray = function(section) {
  const history = window.getChatHistory(section);
  return history && Array.isArray(history) ? history.filter(msg => !msg.deleted) : [];
};

// Delete a specific message from chat history
window.deleteFromChatHistory = function(section, messageId) {
  const key = window.getChatHistoryKey(section);
  if (!window.chatHistories[key]) return;
  
  const index = window.chatHistories[key].findIndex(msg => msg.id === messageId);
  if (index !== -1) {
    window.chatHistories[key].splice(index, 1);
    
    // Update global variable
    const globalName = section + 'ChatHistory';
    window[globalName] = window.chatHistories[key];
    
    // Persist to localStorage
    window.saveChatHistoriesToStorage();
    
    return true;
  }
  return false;
};

// Clear all chat history for a section
window.clearChatHistory = function(section) {
  const key = window.getChatHistoryKey(section);
  window.chatHistories[key] = [];
  
  // Update global variable
  const globalName = section + 'ChatHistory';
  window[globalName] = [];
  
  // Persist to localStorage
  window.saveChatHistoriesToStorage();
  
  console.log(`%c🗑️ Chat history cleared for ${section}`, 'color: #ef4444; font-weight: bold;');
};

// Clear all chat histories for the current user (on logout)
window.clearAllChatHistories = function() {
  const user = window.getLoggedInUser();
  if (user) {
    // Remove all histories for this user
    Object.keys(window.chatHistories).forEach(key => {
      if (key.includes(`_${user}`)) {
        delete window.chatHistories[key];
      }
    });
  } else {
    // Clear all non-user histories
    const sections = ['home', 'edu', 'agro', 'medi', 'eco', 'community', 'servi', 'navi'];
    sections.forEach(section => {
      if (window.chatHistories[section]) {
        delete window.chatHistories[section];
      }
    });
  }
  window.saveChatHistoriesToStorage();
  console.log('%c🗑️ All chat histories cleared', 'color: #ef4444; font-weight: bold;');
};

// --- MESSAGE RENDERING HELPER ---
// Load and render previous chat history for a section
window.loadAndRenderChatHistory = function(section, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  // Initialize history if not already done
  window.initChatHistory(section);
  
  // Get all messages for this section
  const history = window.getChatHistoryArray(section);
  
  console.log(`%c📚 Loading ${history.length} messages for ${section}`, 'color: #8b5cf6; font-weight: bold;');
  
  // Clear the container first
  container.innerHTML = '';
  
  // Render all messages
  history.forEach(message => {
    const msgElement = window.createMessageElement(message, section, containerId);
    if (msgElement) {
      container.appendChild(msgElement);
    }
  });
  
  // Scroll to bottom
  container.scrollTop = container.scrollHeight;
};

// Unified function to create message DOM elements with speak, copy, delete buttons for AI messages
window.createMessageElement = function(message, section, containerId) {
  const msgGroup = document.createElement('div');
  msgGroup.className = 'chat-message-group';
  const mid = message && message.id ? message.id : (Date.now() + '_' + Math.random().toString(36).substr(2,9));
  msgGroup.setAttribute('data-msg-id', mid);
  const isUser = message && message.role === 'user';
  let contentHtml = message && message.content ? message.content : '';
  
  // Check if this is a "typing" message (no action buttons needed)
  const isTypingMessage = contentHtml.includes('typing') || contentHtml.includes('Typing');
  
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
    // AI message: content in ai-msg and actions placed below bubble (but only if NOT typing)
    if (isTypingMessage) {
      // No action buttons for typing messages
      msgGroup.innerHTML = `
        <div class='ai-msg' data-msg-id='${mid}'>
          <span class='ai-msg-text msg-text'>${contentHtml}</span>
        </div>
      `;
    } else {
      // Add action buttons for actual responses
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

  // Show push notification for AI responses if enabled
  if (role === 'ai' && window.NotificationManager && document.hidden) {
    const prefs = window.getNotificationPreferences();
    if (prefs.push) {
      window.NotificationManager.notifyMessageReceived(section, content.substring(0, 100));
    }
  }

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
  const sections = ['home', 'edu', 'agro', 'medi', 'navi', 'community', 'eco', 'servi'];
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
  ['home', 'edu', 'agro', 'medi', 'navi', 'eco', 'servi', 'community'].forEach(section => {
  window.initChatHistory(section, 10);
});

// Shared function to clear preview and remove the remove-btn
// Use this instead of preview.innerHTML = '' in all section files
window.clearPreviewAndRemoveBtn = function(previewElement) {
  if (!previewElement) return;

  try {
    // Remove any preview children and specific remove button
    // First, remove all remove buttons (in case there are multiple)
    const removeButtons = previewElement.querySelectorAll('.remove-btn');
    removeButtons.forEach(btn => {
      try {
        btn.remove();
      } catch (e) {
        // Ignore removal errors
      }
    });
    
    // Remove all preview containers
    const containers = previewElement.querySelectorAll('.preview-container');
    containers.forEach(container => {
      try {
        container.remove();
      } catch (e) {
        // Ignore removal errors
      }
    });

    // Remove all remaining children to ensure complete clearing
    while (previewElement.firstChild) {
      try {
        previewElement.removeChild(previewElement.firstChild);
      } catch (e) {
        // Ignore removal errors
      }
    }

    // Clear all remaining content including any orphaned elements
    previewElement.innerHTML = '';

    // Also clear attachment registry for this section if possible
    try {
      const id = previewElement.id || '';
      const m = id.match(/^(.+)-chat-preview$/);
      if (m && m[1] && typeof window.clearAttachments === 'function') {
        window.clearAttachments(m[1]);
      }
    } catch (e) {
      // ignore if registry clearing fails
    }
    // Observe and remove dynamically added remove buttons
    const observer = new MutationObserver(() => {
      const dynamicRemoveButtons = previewElement.querySelectorAll('.remove-btn');
      dynamicRemoveButtons.forEach(btn => btn.remove());
    });

    observer.observe(previewElement, { childList: true, subtree: true });

    // Disconnect observer after a short delay to avoid memory leaks
    setTimeout(() => observer.disconnect(), 5000);
  } catch (e) {
    // Fallback: force clear all HTML content
    previewElement.innerHTML = '';
  }
};

// Convenience function called by the inline remove button
window.removePreview = function(section) {
  try {
    const preview = document.getElementById(section + '-chat-preview');
    if (preview) window.clearPreviewAndRemoveBtn(preview);
    // Also clear attachments from registry
    window.clearAttachments(section);
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
    window.useGemini25 = storedPreference === '1.5' ? false : true; // Default to 2.5
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
/**
 * Enhanced file upload handler supporting images, audio, video, PDF, and document files
 * Properly converts files to base64 and extracts MIME types for API transmission
 * @param {Event} e - File input change event
 * @param {string} section - Section identifier (home, edu, agro, medi, community, eco, servi, navi)
 */
window.uploadFile = function(e, section) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(ev) {
        const preview = document.getElementById(section + '-chat-preview');
        if (!preview) return;
       
        // Create a container for the preview and the remove button
        const container = document.createElement('div');
        container.className = 'preview-container';
        
        // Extract base64 data from data URL (remove the "data:..." prefix)
        const dataUrl = ev.target.result;
        const base64Data = dataUrl.split(',')[1];
        
        // Store the file data URL, base64, MIME type as data attributes for API transmission
        container.setAttribute('data-file-data', dataUrl);
        container.setAttribute('data-file-base64', base64Data);
        container.setAttribute('data-file-mime', file.type);
        container.setAttribute('data-file-name', file.name);
        container.setAttribute('data-file-size', file.size);

        let mediaHtml = '';
        const fileIcon = window.getFileTypeIcon(file.type);
        
        if (file.type.startsWith('image/')) {
            mediaHtml = `<img src='${dataUrl}' style='max-width:120px;max-height:80px;border-radius:8px; display:flex; overflow:hidden; object-fit:fill; width:100%; height:100%;' alt='Preview' />`;
        } else if (file.type.startsWith('audio/')) {
            mediaHtml = `<audio src='${dataUrl}' controls style='max-width:160px; border-radius:8px; display:flex; overflow:hidden; object-fit:fill; width:100%; height:100%;'></audio>`;
        } else if (file.type.startsWith('video/')) {
            mediaHtml = `<video src='${dataUrl}' controls style='max-width:160px; border-radius:8px; display:flex; overflow:hidden; object-fit:fill; width:100%; height:100%;'></video>`;
        } else if (file.type === 'application/pdf') {
            mediaHtml = `<div style="padding:8px; background:#f1f1f1; border-radius:8px; font-size:12px;"><span>${fileIcon} PDF</span><div style="font-size:10px; color:#666;">${file.name}</div></div>`;
        } else if (file.type.includes('word') || file.type.includes('document') || file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
            mediaHtml = `<div style="padding:8px; background:#f1f1f1; border-radius:8px; font-size:12px;"><span>${fileIcon} Document</span><div style="font-size:10px; color:#666;">${file.name}</div></div>`;
        } else if (file.type.includes('spreadsheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            mediaHtml = `<div style="padding:8px; background:#f1f1f1; border-radius:8px; font-size:12px;"><span>${fileIcon} Spreadsheet</span><div style="font-size:10px; color:#666;">${file.name}</div></div>`;
        } else if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.csv')) {
            mediaHtml = `<div style="padding:8px; background:#f1f1f1; border-radius:8px; font-size:12px;"><span>${fileIcon} Text</span><div style="font-size:10px; color:#666;">${file.name}</div></div>`;
        } else {
            mediaHtml = `<div style="padding:8px; background:#f1f1f1; border-radius:8px; font-size:11px;">📎 ${file.name}</div>`;
        }

        // Add the media and the "X" button to the container
        container.innerHTML = `
          ${mediaHtml}
          <button class="remove-btn" onclick="window.removePreview('${section}')" title="Remove">✕</button>
        `;

        // Clear previous preview and add the new one
        preview.innerHTML = '';
        preview.appendChild(container);
        
        // Track attachment in global storage
        window.addAttachment(section, file);
    };
   
    reader.readAsDataURL(file);
};

/**
 * Get appropriate icon for file type
 * @param {string} mimeType - The MIME type of the file
 * @returns {string} - An emoji or icon string
 */
window.getFileTypeIcon = function(mimeType) {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('text') || mimeType.includes('plain')) return '📄';
    return '📎';
};

// Show copy tooltip notification
window.showCopyTooltip = function(element, message = 'Copied!') {
  const tooltip = document.createElement('div');
  tooltip.className = 'copy-tooltip';
  tooltip.textContent = message;
  tooltip.style.position = 'fixed';
  tooltip.style.backgroundColor = '#111827';
  tooltip.style.color = '#fff';
  tooltip.style.padding = '6px 8px';
  tooltip.style.borderRadius = '6px';
  tooltip.style.fontSize = '12px';
  tooltip.style.zIndex = '9999';
  tooltip.style.pointerEvents = 'none';
  
  document.body.appendChild(tooltip);
  
  // Position near element
  const rect = element.getBoundingClientRect();
  tooltip.style.top = (rect.top - 30) + 'px';
  tooltip.style.left = (rect.left - tooltip.offsetWidth / 2 + element.offsetWidth / 2) + 'px';
  
  setTimeout(() => tooltip.remove(), 2000);
};

// Confirm and delete a message from history
window.confirmDeleteMessage = function(section, containerId, messageId) {
  const ok = confirm('Delete this message? This action cannot be undone.');
  if (!ok) return;
  
  // Remove from DOM with animation
  const msgElement = document.querySelector(`[data-msg-id="${messageId}"]`);
  if (msgElement && msgElement.closest('.chat-message-group')) {
    const msgGroup = msgElement.closest('.chat-message-group');
    msgGroup.style.opacity = '0.5';
    setTimeout(() => msgGroup.remove(), 300);
  }
  
  // Remove from history
  window.deleteFromChatHistory(section, messageId);
};

// Add speak/copy/delete action buttons to an AI message group (called after response arrives)
window.addActionsToMsgGroup = function(msgGroup, section, containerId) {
  if (!msgGroup || msgGroup.querySelector('.msg-actions')) return;
  const mid = msgGroup.getAttribute('data-msg-id') || '';
  const actions = document.createElement('span');
  actions.className = 'msg-actions';
  if (mid) actions.setAttribute('data-msg-id', mid);
  actions.innerHTML = `
    <button class='read-aloud-btn' data-msg-id='${mid}' title='Listen'>🔊</button>
    <button class='copy-btn' data-msg-id='${mid}' title='Copy'>📋</button>
    <button class='delete-msg-btn' data-msg-id='${mid}' title='Delete message'>🗑️</button>
  `;
  msgGroup.appendChild(actions);

  // Send notification if app is in background
  if (window.NotificationManager && window.NotificationManager.notifyMessageReceived) {
    const aiMessage = msgGroup.querySelector('.ai-msg-text');
    const preview = aiMessage ? aiMessage.textContent.substring(0, 100) : 'New response received';
    window.NotificationManager.notifyMessageReceived(section, preview);
  }

  // wire events
  const speakBtn = actions.querySelector('.read-aloud-btn');
  if (speakBtn) {
    speakBtn.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      const txt = msgGroup.querySelector('.ai-msg-text') ? msgGroup.querySelector('.ai-msg-text').textContent : '';
      if (txt) window.speakText(txt, speakBtn);
    });
  }
  const copyBtn = actions.querySelector('.copy-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', async (e) => {
      e.preventDefault(); e.stopPropagation();
      const txt = msgGroup.querySelector('.ai-msg-text') ? msgGroup.querySelector('.ai-msg-text').textContent : '';
      if (!txt) return;
      try {
        await navigator.clipboard.writeText(txt);
        window.showCopyTooltip(copyBtn, 'Message copied!');
      } catch (err) {
        console.warn('Copy failed', err);
      }
    });
  }
  const deleteBtn = actions.querySelector('.delete-msg-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      const msgId = deleteBtn.getAttribute('data-msg-id') || mid;
      window.confirmDeleteMessage(section, containerId, msgId);
    });
  }
};

// Text-to-speech helper
window.speakText = function(text, btnElement) {
  // Remove emoji and special characters from text
  const cleanText = text.replace(/[🔊📋🗑️\s]+$/g, '').trim();
  
  if (!cleanText) return;
  
  // Cancel any ongoing speech
  window.speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;
  
  // Visual feedback
  if (btnElement) {
    btnElement.classList.add('speaking-active');
  }
  
  utterance.onend = () => {
    if (btnElement) {
      btnElement.classList.remove('speaking-active');
    }
  };
  
  utterance.onerror = (event) => {
    console.error('Speech synthesis error:', event);
    if (btnElement) {
      btnElement.classList.remove('speaking-active');
    }
  };
  
  window.speechSynthesis.speak(utterance);
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
async function getGeminiAnswer(localData, msg, apiKey, mediaData = null, signal = null, section = 'home', attachments = []) {
  let modelVersion;
  const MAX_RETRIES = 3;
  const BASE_DELAY = 1000; // 1 second
  
  // Helper function to perform fetch with retry logic for rate limiting
  async function fetchWithRetry(url, fetchOptions, retryCount = 0) {
    try {
      let res = await fetch(url, fetchOptions);
      
      // Handle rate limiting with exponential backoff
      if (res.status === 429) {
        if (retryCount < MAX_RETRIES) {
          const delay = BASE_DELAY * Math.pow(2, retryCount); // Exponential backoff
          console.warn(`Rate limited (429). Retrying in ${delay}ms... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return fetchWithRetry(url, fetchOptions, retryCount + 1);
        } else {
          throw new Error(`HTTP error! status: 429 (Rate limited - max retries exceeded)`);
        }
      }
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      return res;
    } catch (error) {
      // Don't retry on abort
      if (error.name === 'AbortError' || error.message === 'AbortError') {
        throw error;
      }
      // Rethrow other errors
      throw error;
    }
  }
  
  try {
    const contents = {
      parts: []
    };

    // Normalize attachments from shared storage and caller-provided data.
    if (!Array.isArray(attachments)) attachments = [];

    // Attachments from section preview capture/upload (legacy + modern)
    if (Array.isArray(attachments) && attachments.length > 0) {
      attachments.forEach(att => {
        if (att && att.dataURL) {
          const mimeType = att.type || (att.dataURL.match(/data:([^;]+);/) || [])[1] || 'application/octet-stream';
          const dataPart = att.dataURL.split(',')[1] || '';
          if (mimeType.startsWith('image/') || mimeType.startsWith('audio/') || mimeType.startsWith('video/')) {
            contents.parts.push({
              inlineData: { mimeType, data: dataPart }
            });
          } else {
            contents.parts.push({
              text: `Attached file: ${att.name || 'file'} of type ${mimeType}. Please use context, ignore actual binary content.`
            });
          }
        }
      });
    } else if (mediaData) {
      // Legacy single mediaData handling (string data URL / object)
      let dataUrl = mediaData;
      let mimeType = 'application/octet-stream';
      if (typeof mediaData === 'object' && mediaData.dataUrl) {
        dataUrl = mediaData.dataUrl;
        mimeType = mediaData.mimeType || mimeType;
      }
      if (typeof dataUrl === 'string' && dataUrl.startsWith('data:')) {
        const extractedMime = dataUrl.match(/data:([^;]+)/)?.[1];
        if (extractedMime) mimeType = extractedMime;
        const data = dataUrl.split(',')[1] || '';
        contents.parts.push({
          inlineData: { mimeType, data }
        });
      }
    }

    // If the section has a suggestive prompt in localStorage or window variable, use it.
    const savedPrompt = localStorage.getItem(`${section}_ai_prompt`) || window[`${section.toUpperCase()}_AI_PROMPT`] || '';

    // Include section-specific chat history if available for meaning compensation
    let historyText = '';
    if (typeof window.getChatHistory === 'function') {
      const history = window.getChatHistory(section) || [];
      historyText = history.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
    } else if (window[`${section}ChatHistory`] && Array.isArray(window[`${section}ChatHistory`])) {
      historyText = window[`${section}ChatHistory`].map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
    }

    const promptGuide = historyText && savedPrompt.includes('{history}')
      ? savedPrompt.replace('{history}', historyText)
      : savedPrompt;

    // Generate multilingual context that allows AI to understand user requests in all 8 languages
    const multilingualPrompt = window.generateMultilingualPrompt(msg, section);
    
    // Build the complete prompt with multilingual support
    const completePrompt = `${multilingualPrompt}
${promptGuide}

--- LOCAL DATA START ---
${localData || ''}
--- LOCAL DATA END ---

User question: ${msg || ''}`;

    contents.parts.push({
      text: completePrompt
    });

    // Always use gemini-2.5-flash as primary model
    // It handles attachments and context effectively
    modelVersion = 'gemini-2.5-flash';

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
    
    let res = await fetchWithRetry(url, fetchOptions);

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

// Notification preferences helper
window.getNotificationPreferences = function() {
  // Check server settings first if available
  if (window.userSettings) {
    return {
      email: window.userSettings.emailNotifications,
      push: window.userSettings.pushNotifications
    };
  }
  
  // Fallback to localStorage
  const emailEnabled = localStorage.getItem('notification-email') === 'enabled';
  const pushEnabled = localStorage.getItem('notification-push') === 'enabled';
  return { email: emailEnabled, push: pushEnabled };
};

// Alias for backward compatibility and easier calling
window.callGeminiAI = getGeminiAnswer;
