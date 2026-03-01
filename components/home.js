// Load common AI utilities first
if (!window.commonAILoaded) {
  const script = document.createElement('script');
  script.src = 'components/commonAI.js';
  script.onload = () => { window.commonAILoaded = true; };
  document.head.appendChild(script);
}

window.HOME_AI_PROMPT = window.HOME_AI_PROMPT || `You are an AI assistant for Yola, Adamawa State, Nigeria.
You help users with information about Yola, Adamawa State, Nigeria.
IMPORTANT: Only greet the user if they greet you first (e.g., "hello", "hi", "greetings"). Do NOT add greetings to every response.
Answer the user's questions directly and helpfully using the information provided and the internet.
If the answer is not in your local database, reply: "Sorry, I do not have that specific information in my local database. Please contact a local authority for further help."
If users ask about agriculture, education, navigation, community, health, jobs, or environment, refer them to AgroInfo, EduInfo, NaviInfo, CommunityInfo, MediInfo, JobsConnect, or EcoInfo.

Previous conversation history:
{history}
`;

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
  let attach = preview.innerHTML;
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
    const localData = await fetch('Data/HomeInfo/homeinfo.txt', signal ? { signal } : {}).then(r => r.text()); // Assuming a local data file for HomeInfo
    finalAnswer = await getGeminiAnswer(localData, msg, window.GEMINI_API_KEY, null, signal);
  } catch (e) {
    if (e.name === 'AbortError') {
      finalAnswer = "USER ABORTED REQUEST";
    } else {
      console.error("Error fetching local data or Gemini API call:", e);
      // Provide helpful error messages based on error type
      const errorMsg = e.message || 'Unknown error';
      
      if (errorMsg.includes('API_RATE_LIMIT')) {
        finalAnswer = "⚠️ The AI service is currently receiving too many requests. Please wait a moment and try again.";
      } else if (errorMsg.includes('API_BAD_REQUEST')) {
        finalAnswer = "⚠️ Your request format is incorrect. Please try rephrasing your question.";
      } else if (errorMsg.includes('API_SERVER_ERROR')) {
        finalAnswer = "⚠️ The AI service is temporarily unavailable. Please try again in a few moments.";
      } else if (errorMsg.includes('API_ERROR')) {
        finalAnswer = `⚠️ API Error: ${errorMsg.replace('API_ERROR: ', '')}. Please check your input and try again.`;
      } else if (errorMsg.includes('INVALID_JSON_RESPONSE')) {
        finalAnswer = "⚠️ Received an invalid response from the server. This might be a temporary issue. Please try again.";
      } else if (errorMsg.includes('EMPTY_RESPONSE')) {
        finalAnswer = "⚠️ The AI returned an empty response. This might be due to content policy or API limits. Please try rephrasing.";
      } else if (errorMsg.includes('INVALID_RESPONSE_FORMAT')) {
        finalAnswer = "⚠️ The API response format was unexpected. Please try again.";
      } else if (errorMsg.includes('API key')) {
        finalAnswer = "⚠️ API key is not configured. Please check your environment setup.";
      } else if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
        finalAnswer = "⚠️ Network error. Please check your internet connection and try again.";
      } else {
        finalAnswer = `⚠️ Error: ${errorMsg}`;
      }
    }
  }

  msgGroup.querySelector('.ai-msg-text').innerHTML = formatAIResponse(finalAnswer);
  // add and wire up action buttons now that we have a real response
  if (typeof window.addActionsToMsgGroup === 'function') {
    window.addActionsToMsgGroup(msgGroup, 'home', 'home-chat-messages');
  }
  chat.scrollTop = chat.scrollHeight;

  // Store messages in chat history
  window.addToChatHistory && window.addToChatHistory('home', 'user', msg);
  window.addToChatHistory && window.addToChatHistory('home', 'assistant', finalAnswer);

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