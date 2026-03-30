// Load common AI utilities first
if (!window.commonAILoaded) {
  const script = document.createElement('script');
  script.src = 'components/commonAI.js';
  script.onload = () => { window.commonAILoaded = true; };
  document.head.appendChild(script);
}

window.HOME_AI_PROMPT = window.HOME_AI_PROMPT || `You are an intelligent AI assistant for Yola, Adamawa State, Nigeria.
Your role is to help users with comprehensive information about Yola including culture, business, events, transportation, and local services.

### Analysis Capabilities:
- **Image Analysis**: When users share images, analyze them to identify locations in Yola, provide context, suggest related services/activities
- **Audio Analysis**: Listen to voice messages and respond helpfully to audio questions
- **Document Analysis**: Review uploaded documents, PDFs, or text files for relevant information

### Response Guidelines:
- IMPORTANT: Only greet if user greets first (e.g., "hello", "hi", "greetings")
- Answer questions directly and helpfully using local database + internet knowledge
- For images: Identify what's shown, provide historical/cultural context if relevant
- For audio: Transcribe intent and provide relevant information
- If info not available: "Sorry, I don't have that specific information. Please contact a local authority for further help."

### Section Referrals:
- Agriculture → AgroInfo | Education → EduInfo | Navigation → NaviInfo
- Community → CommunityInfo | Health → MediInfo | Jobs → JobsConnect | Environment → EcoInfo

### Conversation History:
{history}`;

// Chat history management
// Use shared in-memory chat history helpers
window.initChatHistory && window.initChatHistory('home', 10);
function loadHomeChatHistory() {
  try {
    window.loadChatHistoryToDOM && window.loadChatHistoryToDOM('home', 'home-chat-messages');
  } catch (e) {
    console.error('Error loading chat history:', e);
  }
}
// Robust navbar loader
function ensureNavbarLoaded(cb) {
  // Don't re-render if already rendered, just ensure it exists
  if (document.querySelector('.navbar')) {
    if (cb) cb();
    return;
  }
  // If navbar hasn't loaded yet, don't force it here - it will be rendered by index.html
  if (cb) cb();
}
window.renderSection = function() {
  ensureNavbarLoaded();
  if (!document.getElementById('global-css')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'styles/global.css';
    link.id = 'global-css';
    document.head.appendChild(link);
  }
  
  return fetch('templates/home.html').then(r => r.text()).then(html => {
    document.getElementById('main-content').innerHTML = html;
    
    // Load chat history AFTER template is inserted
    setTimeout(() => {
      window.initAndRestoreSectionHistory && window.initAndRestoreSectionHistory('home', 'home-chat-messages');
      // Ensure auto-scroll observer is attached for this section
      window.observeChatContainers && window.observeChatContainers();
    }, 50);
    
    // Wire model toggle after template is inserted
    const mt = document.getElementById('model-toggle');
    if (mt) mt.onchange = function() { window.toggleGeminiModel('home', this.checked); };

    // Add Enter key handler to chat input - ensures attachments and text are sent together
    const homeInput = document.getElementById('home-chat-input');
    if (homeInput) {
      homeInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          window.sendHomeMessage();
        }
      });
    }
  }).catch(err => {
    console.error('Failed to load home template:', err);
    document.getElementById('main-content').innerHTML = '<p>Failed to load content.</p>';
  });

};

// Common helper for Gemini API call
async function getGeminiAnswer(localData, msg, apiKey, mediaData = null, signal = null) {
  let modelVersion;
  try {
    const contents = {
      parts: []
    };

    // Handle media data (images, audio, files)
    if (mediaData) {
      // mediaData can be a string (data URL) or an object with { dataUrl, mimeType }
      let dataUrl = mediaData;
      let mimeType = "image/jpeg"; // default for legacy data URLs
      
      if (typeof mediaData === 'object' && mediaData.dataUrl) {
        dataUrl = mediaData.dataUrl;
        mimeType = mediaData.mimeType || "application/octet-stream";
      }
      
      // Detect MIME type from data URL if not explicitly provided
      if (dataUrl.includes('data:')) {
        const match = dataUrl.match(/data:([^;]+)/);
        if (match) {
          mimeType = match[1];
        }
      }
      
      contents.parts.push({
        inlineData: {
          mimeType: mimeType,
          data: dataUrl.split(',')[1] // Remove data URL prefix
        }
      });
    }

    // Format chat history - with null check
    let historyText = '';
    if (window.homeChatHistory && Array.isArray(window.homeChatHistory) && window.homeChatHistory.length > 0) {
      historyText = window.homeChatHistory.map(msg => 
        `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
      ).join('\n');
    }

    // Use the editable prompt from localStorage or fallback
    const promptGuide = (localStorage.getItem('home_ai_prompt') || HOME_AI_PROMPT)
      .replace('{history}', historyText);

    contents.parts.push({
      text: `${promptGuide}\n\n--- LOCAL DATA START ---\n${localData}\n--- LOCAL DATA END ---\n\nUser question: ${msg}`
    });

    // Choose model based on user preference and image presence
    // Use gemini-2.5-flash (available with current API key)
    modelVersion = 'gemini-2.5-flash';

    // Use backend proxy instead of direct Gemini API
    const url = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? (window.API_BASE || 'http://localhost:4000') + '/api/gemini'
      : '/api/gemini';
    const body = JSON.stringify({ model: modelVersion, contents: [contents] });
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
      // Handle specific HTTP errors
      if (res.status === 429) {
        throw new Error('API_RATE_LIMIT');
      } else if (res.status === 400) {
        throw new Error('API_BAD_REQUEST');
      } else if (res.status >= 500) {
        throw new Error('API_SERVER_ERROR');
      }
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    // Parse JSON safely
    let data;
    try {
      data = await res.json();
    } catch (jsonError) {
      console.error('Failed to parse API response as JSON:', jsonError);
      throw new Error('INVALID_JSON_RESPONSE');
    }

    // Check for API errors in the response
    if (data.error) {
      console.error('Gemini API returned error:', data.error);
      const errorMsg = typeof data.error === 'string' ? data.error : (data.error.message || 'Unknown error');
      throw new Error('API_ERROR: ' + errorMsg);
    }
    
    // Check for expected response structure
    if (!data.candidates || data.candidates.length === 0) {
      console.error('No candidates in response:', JSON.stringify(data));
      throw new Error('EMPTY_RESPONSE');
    }
    
    if (!data.candidates[0].content?.parts?.[0]?.text) {
      console.error('Invalid response structure:', JSON.stringify(data.candidates[0]));
      throw new Error('INVALID_RESPONSE_FORMAT');
    }
    
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error; // Re-throw abort errors to be handled by caller
    }
    console.error(`Error with ${modelVersion || 'unknown model'}:`, error);
    throw error;
  }
}

async function tryGeminiAPI(msg, localData, imageData) {
  try {
    return await getGeminiAnswer(localData, msg, window.GEMINI_API_KEY, imageData);
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error; // Re-throw abort errors
    }
    console.error('Gemini 2.5 failed, error:', error);
    // The server.js will handle fallback automatically, so this shouldn't be reached
    // but keep it for safety in case the error is network-related
    return "Sorry, I'm having trouble connecting to the AI at the moment. Please try again later.";
  }
}

window.homeAbortController = window.homeAbortController || null;

window.stopHomeResponse = function() {
  if (window.homeAbortController) {
    window.homeAbortController.abort();
    window.homeAbortController = null;
  }
  const sendBtn = document.querySelector('.send-button');
  if (sendBtn) {
    sendBtn.classList.remove('sending');
    sendBtn.textContent = 'Send';
    sendBtn.style.backgroundColor = '';
  }
};

window.sendHomeMessage = async function sendHomeMessage(faqText = '') {
  const input = document.getElementById('home-chat-input');
  const chat = document.getElementById('home-chat-messages');
  const preview = document.getElementById('home-chat-preview');
  const submitBtn = document.querySelector('#home-chat-input + button[type="submit"]');

  let msg = faqText || input.value.trim();
  let attach = '';
  const container = preview.querySelector('.preview-container');
  if (container) {
    const clone = container.cloneNode(true);
    const btn = clone.querySelector('.remove-btn');
    if (btn) btn.remove();
    attach = clone.outerHTML;
  } else {
    attach = preview.innerHTML;
  }
  if (!msg && !attach) return;

  // Cancel any ongoing request
  // Setup stop button with commonAI utility (with fallback if not loaded)
  if (typeof window.setupStopButton === 'function') {
    window.setupStopButton({ sendBtn: submitBtn, section: 'home' });
  } else {
    // Fallback: ensure commonAI is loaded
    if (!window.commonAILoaded) {
      const script = document.createElement('script');
      script.src = 'components/commonAI.js?v=' + Date.now();
      script.onload = () => { 
        window.commonAILoaded = true;
        if (typeof window.setupStopButton === 'function') {
          window.setupStopButton({ sendBtn: submitBtn, section: 'home' });
        }
      };
      document.head.appendChild(script);
    }
  }

  // Extract media data from preview (image, audio, or file)
  let mediaData = null;
  if (preview && preview.innerHTML) {
    const container = preview.querySelector('.preview-container');
    
    if (container) {
      // Check if container has stored file data (for non-visual files)
      const fileData = container.getAttribute('data-file-data');
      const fileMime = container.getAttribute('data-file-mime');
      
      if (fileData && fileMime) {
        mediaData = {
          dataUrl: fileData,
          mimeType: fileMime,
          fileName: container.getAttribute('data-file-name')
        };
      } else {
        // Fallback to checking for image/audio elements
        const imgElement = container.querySelector('img');
        const audioElement = container.querySelector('audio');
        
        if (imgElement && imgElement.src) {
          mediaData = imgElement.src;
        } else if (audioElement && audioElement.src) {
          mediaData = audioElement.src;
        }
      }
    }
  }

  const msgGroup = document.createElement('div');
  msgGroup.className = 'chat-message-group';
  // generate a temporary message id now so we can reuse for actions
  const mid = Date.now() + '_' + Math.random().toString(36).substr(2,9);
  msgGroup.setAttribute('data-msg-id', mid);
  msgGroup.innerHTML = `
    <div class='user-msg' data-msg-id='${mid}'>${msg}${attach ? "<br>" + attach : ""}</div>
    <div class='ai-msg' data-msg-id='${mid}'><span class='ai-msg-text'>Home AI typing...</span></div>
  `;
  chat.appendChild(msgGroup);
  // Replace direct clearing of preview with the shared function
  window.clearPreviewAndRemoveBtn(preview);
  if (!faqText) input.value = '';

  let finalAnswer = "";
  const stopBtn = document.querySelector('.stop-btn');
  if (stopBtn) stopBtn.style.display = 'inline-block';

  try {
    const signal = window.homeAbortController ? window.homeAbortController.signal : null;

    // Get current language from i18n or localStorage
    const currentLang = (window.i18n && window.i18n.language) || localStorage.getItem('language') || 'En';
    const langCode = currentLang.substring(0, 2).toUpperCase(); // Extract first 2 letters for directory name
    const langDirCode = langCode === 'EN' ? 'En' : langCode === 'AR' ? 'Ar' : langCode === 'FR' ? 'Fr' : 
                        langCode === 'FU' ? 'Fu' : langCode === 'HA' ? 'Ha' : langCode === 'IG' ? 'Ig' : 
                        langCode === 'PI' ? 'Pi' : langCode === 'YO' ? 'Yo' : 'En'; // Default to English

    // List of all available language directories
    const availableLangs = ['En', 'Ar', 'Fr', 'Fu', 'Ha', 'Ig', 'Pi', 'Yo'];
    
    // Prioritize current language, then fall back to English if current not available
    const langDirsToLoad = availableLangs.includes(langDirCode) ? [langDirCode, 'En'] : ['En'];
    
    // Remove duplicates
    const uniqueLangDirs = [...new Set(langDirsToLoad)];

    // Define all known HTML files in details/Home
    const htmlFileNames = [
      'adamawaexecutivecouncil.html', 'fombinakingdom.html', 'yolaadamawa.html'
    ];

    // Fetch HTML content from language directories
    const allHtmlPromises = [];
    for (const langDir of uniqueLangDirs) {
      for (const fileName of htmlFileNames) {
        const filePath = `details/Home/${langDir}/${fileName}`;
        allHtmlPromises.push(
          fetch(filePath, signal ? { signal } : {})
            .then(res => res.ok ? res.text().then(text => `\n--- ${fileName} (${langDir}) ---\n${text}`) : '')
            .catch(() => '')
        );
      }
    }

    const localData = (await Promise.all(allHtmlPromises)).filter(content => content.length > 0).join('\n');

    // Ensure in-memory history exists for home
    window.initChatHistory && window.initChatHistory('home', 10);
    // Reserve slot for user message (AI will be added after response)
    window.addToChatHistory && window.addToChatHistory('home', 'user', msg);

    // Get chat history context from in-memory helper
    const historyPairs = window.getQAHistoryForSection ? window.getQAHistoryForSection('home', 5) : [];
    const historyContext = historyPairs.length > 0 ? '\n\nRecent chat history:\n' + historyPairs.map(h => `User: ${h.user}\nAI: ${h.ai}`).join('\n\n') : '';
    
    // Combine all local data
    const allLocalDataWithHistory = localData + historyContext;

    finalAnswer = await getGeminiAnswer(allLocalDataWithHistory, msg, window.GEMINI_API_KEY, mediaData, signal);
    // Add AI response to in-memory history
    window.addToChatHistory && window.addToChatHistory('home', 'assistant', finalAnswer);
  } catch (e) {
    if (e && e.name === 'AbortError') {
      finalAnswer = "Request cancelled.";
    } else {
      console.error("Error fetching local data or Gemini API call:", e);
      const errorMsg = (e && e.message) ? e.message : '';

      // Map known error types to friendly, non-technical messages
      if (errorMsg.includes('API_RATE_LIMIT')) {
        finalAnswer = "The AI is receiving too many requests right now. Please try again a little later.";
      } else if (errorMsg.includes('API_SERVER_ERROR')) {
        finalAnswer = "The AI service is temporarily unavailable. Please try again later.";
      } else if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
        finalAnswer = "Can't access the AI — please check your internet connection and try again.";
      } else if (errorMsg.includes('API_BAD_REQUEST')) {
        finalAnswer = "I couldn't understand that request. Please try rephrasing your question.";
      } else if (errorMsg.includes('INVALID_JSON_RESPONSE') || errorMsg.includes('INVALID_RESPONSE_FORMAT') || errorMsg.includes('EMPTY_RESPONSE')) {
        finalAnswer = "The AI returned an unexpected response. Please try again or ask something different.";
      } else if (errorMsg.toLowerCase().includes('api key') || errorMsg.toLowerCase().includes('authentication')) {
        finalAnswer = "The AI service is not configured. Please check the app settings.";
      } else {
        finalAnswer = "The AI is currently unavailable. Please try again later.";
      }
    }
  }

  msgGroup.querySelector('.ai-msg-text').innerHTML = formatAIResponse(finalAnswer);
  // add and wire up action buttons now that we have a real response
  if (typeof window.addActionsToMsgGroup === 'function') {
    window.addActionsToMsgGroup(msgGroup, 'home', 'home-chat-messages');
  }
  chat.scrollTop = chat.scrollHeight;

  if (submitBtn) {
    submitBtn.classList.remove('sending');
    submitBtn.textContent = 'Send';
    submitBtn.style.backgroundColor = '';
  }
  
  // Reset abort controller
  abortController = null;
};

// Ensure sendHomeMessage is always attached to window (last line)
if (typeof window.sendHomeMessage !== 'function') {
  window.sendHomeMessage = sendHomeMessage;
}