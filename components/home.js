
// Load common AI utilities first
if (!window.commonAILoaded) {
  const script = document.createElement('script');
  script.src = 'components/commonAI.js';
  script.onload = () => { window.commonAILoaded = true; };
  document.head.appendChild(script);
}

window.HOME_AI_PROMPT = window.HOME_AI_PROMPT || `You are an AI assistant for Yola, Adamawa State, Nigeria.\nRespond to greetings politely, and offer to help the user with any information about Yola, Adamawa State, Nigeria.\nAnswer the user's question using the information provided below, and the internet. If the answer is not present, reply: "Sorry, I do not have that specific information in my local database. Please contact a local authority for further help."\nIf a user clearly requests information on agriculture, education, navigation, community, health, jobs, or environment, refer them to AgroInfo, EduInfo, NaviInfo, CommunityInfo, MediInfo, JobsConnect, or EcoInfo, as the case may be.

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
  
  // Load chat history when section renders
  setTimeout(loadHomeChatHistory, 100); // Small delay to ensure DOM is ready
  
  fetch('templates/home.html').then(r => r.text()).then(html => {
    document.getElementById('main-content').innerHTML = html;
    // Wire model toggle after template is inserted
    const mt = document.getElementById('model-toggle');
    if (mt) mt.onchange = function() { window.toggleGeminiModel('home', this.checked); };
  }).catch(err => {
    console.error('Failed to load home template:', err);
    document.getElementById('main-content').innerHTML = '<p>Failed to load content.</p>';
  });  

};

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
    let res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    let data = await res.json();
    
    // Check for API errors
    if (data.error) {
      console.error('Gemini API returned error:', data.error);
      throw new Error(data.error.message || 'API error: ' + JSON.stringify(data.error));
    }
    
    // Check for expected response structure
    if (!data.candidates || data.candidates.length === 0) {
      console.error('No candidates in response:', JSON.stringify(data));
      throw new Error('No response from AI (empty candidates)');
    }
    
    if (!data.candidates[0].content?.parts?.[0]?.text) {
      console.error('Invalid response structure:', JSON.stringify(data.candidates[0]));
      throw new Error('Invalid response format from API');
    }
    
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error(`Error with ${modelVersion || 'unknown modelVersion'}:`, error);
    throw error;
  }
}

async function tryGeminiAPI(msg, localData, imageData) {
  try {
    return await getGeminiAnswer(localData, msg, window.GEMINI_API_KEY, imageData);
  } catch (error) {
    console.log('Falling back to Gemini 1.5...');
    try {
      return await tryGeminiModel('gemini-1.5-flash');
    } catch (error2) {
      console.error('Both Gemini models failed:', error2);
      return "Sorry, I'm having trouble connecting to the AI at the moment. Please try again later.";
    }
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
  if (window.homeAbortController) {
    window.homeAbortController.abort();
  }
  window.homeAbortController = new AbortController();

  if (submitBtn) {
    submitBtn.classList.add('sending');
    submitBtn.textContent = 'Stop';
    submitBtn.style.backgroundColor = '#ff4444';

    // Add click handler to stop response
    const stopHandler = (e) => {
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
      if (window.homeAbortController) {
        window.homeAbortController.abort();
        window.homeAbortController = null;
      }
      submitBtn.removeEventListener('click', stopHandler);
      submitBtn.classList.remove('sending');
      submitBtn.textContent = 'Send';
      submitBtn.style.backgroundColor = '';
    };
    submitBtn.addEventListener('click', stopHandler);
  }

  const msgGroup = document.createElement('div');
  msgGroup.className = 'chat-message-group';
  msgGroup.innerHTML = `
    <div class='user-msg'>${msg}${attach ? "<br>" + attach : ""}</div>
    <div class='ai-msg'><span class='ai-msg-text'>Home AI typing...</span></div>
  `;
  chat.appendChild(msgGroup);
  preview.innerHTML = '';
  if (!faqText) input.value = '';

  let finalAnswer = "";
  const stopBtn = document.querySelector('.stop-btn');
  if (stopBtn) stopBtn.style.display = 'inline-block';

  try {
    const localData = await fetch('Data/HomeInfo/homeinfo.txt').then(r => r.text()); // Assuming a local data file for HomeInfo
    finalAnswer = await getGeminiAnswer(localData, msg, window.GEMINI_API_KEY);
  } catch (e) {
    if (e.name === 'AbortError' || e.message === 'AbortError') {
      finalAnswer = "USER ABORTED REQUEST";
    } else {
      console.error("Error fetching local data or Gemini API call:", e);
      // Provide helpful error message to user
      const errorMsg = e.message || 'Unknown error';
      if (errorMsg.includes('API key')) {
        finalAnswer = "⚠️ API key is not configured. Please check your environment setup.";
      } else if (errorMsg.includes('empty candidates') || errorMsg.includes('No response')) {
        finalAnswer = "⚠️ The AI returned an empty response. This might be a content policy violation or API issue. Please try rephrasing your question.";
      } else if (errorMsg.includes('Invalid response format')) {
        finalAnswer = "⚠️ Received an unexpected response format from the API. Please try again.";
      } else {
        finalAnswer = `⚠️ Error: ${errorMsg}`;
      }
    }
  }

  msgGroup.querySelector('.ai-msg-text').innerHTML = formatAIResponse(finalAnswer);
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