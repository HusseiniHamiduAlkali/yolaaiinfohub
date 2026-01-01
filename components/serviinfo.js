
// Load common AI utilities first
if (!window.commonAILoaded) {
  const script = document.createElement('script');
  script.src = 'components/commonAI.js';
  script.onload = () => { window.commonAILoaded = true; };
  document.head.appendChild(script);
}

// Edit this prompt to instruct the AI on how to answer user messages for ServiInfo
window.SERVI_AI_PROMPT = window.SERVI_AI_PROMPT || `You are an AI assistant for Yola, Adamawa State, Nigeria.
Help the user find professional services in Yola.
Answer the user's question using the information provided below, and the internet. But only those regarding professional services and service providers.
If the answer is not present, reply: "Sorry, I do not have that specific information in my local database. Please contact a local service directory for further help."
And if a user clearly requests information on health, education, community, environment, navigation, or agriculture, refer them to either of MediInfo, EduInfo, CommunityInfo, EcoInfo, NaviInfo, or AgroInfo, as the case may be.`;

window.serviAbortController = window.serviAbortController || null;

window.renderSection = function() {
  ensureNavbarLoaded();
  if (!document.getElementById('global-css')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'styles/global.css';
    link.id = 'global-css';
    document.head.appendChild(link);
  }
  
  fetch('templates/servi.html').then(r => r.text()).then(html => {
    document.getElementById('main-content').innerHTML = html;
    // Wire model toggle after template is inserted
    const mt = document.getElementById('model-toggle');
    if (mt) mt.onchange = function() { window.toggleGeminiModel('servi', this.checked); };
  }).catch(err => {
    console.error('Failed to load home template:', err);
    document.getElementById('main-content').innerHTML = '<p>Failed to load content.</p>';
  });  
  // Load in-memory servi history
  setTimeout(() => { window.loadChatHistoryToDOM && window.loadChatHistoryToDOM('servi', 'servi-chat-messages'); }, 50);
};

window.stopServiResponse = function() {
  if (window.serviAbortController) {
    window.serviAbortController.abort();
    window.serviAbortController = null;
  }
  const sendBtn = document.querySelector('.send-button');
  if (sendBtn) {
    sendBtn.classList.remove('sending');
    sendBtn.textContent = 'Send';
    sendBtn.style.backgroundColor = '';
  }
};

// Common helper for Gemini API call
async function getGeminiAnswer(localData, msg, apiKey, imageData = null) {
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
    const promptGuide = localStorage.getItem('servi_ai_prompt') || SERVI_AI_PROMPT;
    contents.parts.push({
      text: `${promptGuide}\n\n--- LOCAL DATA START ---\n${localData}\n--- LOCAL DATA END ---\n\nUser question: ${msg}`
    });
    const modelVersion = 'gemini-2.5-flash';
    let body = JSON.stringify({ model: modelVersion, contents: [contents] });
    
    const serverUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? (window.API_BASE || 'http://localhost:4000') + '/api/gemini'
      : '/api/gemini';
      
    let res = await fetch(serverUrl, { 
      method: 'POST', 
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include',
      mode: 'cors',
      body,
      signal: window.serviAbortController?.signal 
    });

    if (!res.ok) {
      if (res.status === 429) {
        throw new Error('API_RATE_LIMIT');
      } else if (res.status >= 500) {
        throw new Error('API_SERVER_ERROR');
      }
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    let data;
    try {
      data = await res.json();
    } catch (jsonError) {
      console.error('Failed to parse API response:', jsonError);
      throw new Error('INVALID_JSON_RESPONSE');
    }
    
    if (data.error) {
      console.error('Gemini API error:', data.error);
      throw new Error('API_ERROR: ' + (data.error.message || JSON.stringify(data.error)));
    }
    
    return (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) ? data.candidates[0].content.parts[0].text : "Sorry, I couldn't get a response from the AI.";
  } catch (err) {
    console.error('Error getting Gemini answer:', err);
    throw err;
  }
}

window.sendServiMessage = async function(faqText = '') {
  const input = document.getElementById('servi-chat-input');
  const chat = document.getElementById('servi-chat-messages');
  const preview = document.getElementById('servi-chat-preview');
  const sendBtn = document.querySelector('.send-button');
  const stopBtn = document.querySelector('.stop-button');

  // Extract image data if present in preview
  let imageData = null;
  const previewImg = preview.querySelector('img');
  if (previewImg) {
    imageData = previewImg.src;
    msg = (msg || '') + "\nPlease analyze this image and provide relevant service provider information, identify professional services needed, or suggest relevant service providers.";
  }
  
  let msg = faqText || input.value.trim();
  let attach = preview.innerHTML;
  if (!msg && !attach) return;

  if (window.serviAbortController) {
    window.serviAbortController.abort();
  }
  window.serviAbortController = new AbortController();

  if (sendBtn) {
    const originalType = sendBtn.type;
    const stopHandler = (e) => {
      if (e && e.preventDefault) e.preventDefault();
      if (window.serviAbortController) {
        window.serviAbortController.abort();
        window.serviAbortController = null;
      }
      sendBtn.removeEventListener('click', stopHandler);
      sendBtn.type = originalType;
      sendBtn.classList.remove('sending');
      sendBtn.textContent = 'Send';
      sendBtn.style.backgroundColor = '';
    };

    sendBtn.classList.add('sending');
    sendBtn.textContent = 'Stop';
    sendBtn.style.backgroundColor = '#ff4444';
    // prevent form re-submission while stopping
    sendBtn.type = 'button';
    sendBtn.addEventListener('click', stopHandler);
  }

  const msgGroup = document.createElement('div');
  msgGroup.className = 'chat-message-group';
  msgGroup.innerHTML = `
    <div class='user-msg'>${msg}${attach ? "<br>" + attach : ""}</div>
    <div class='ai-msg'><span class='ai-msg-text'>...</span></div>
  `;
  chat.appendChild(msgGroup);
  preview.innerHTML = '';
  if (!faqText) input.value = '';

  let finalAnswer = "";
  try {
    const localData = await fetch('Data/ServiInfo/serviinfo.txt').then(r => r.text());
    finalAnswer = await getGeminiAnswer(localData, msg, window.GEMINI_API_KEY, imageData);
  } catch (e) {
    console.error("Error fetching local data or Gemini API call:", e);
    const errorMsg = e?.message || 'Unknown error';
    
    if (e && e.name === 'AbortError') {
      finalAnswer = 'USER ABORTED REQUEST';
    } else if (errorMsg.includes('API_RATE_LIMIT')) {
      finalAnswer = "⚠️ The AI service is currently receiving too many requests. Please wait a moment and try again.";
    } else if (errorMsg.includes('API_SERVER_ERROR')) {
      finalAnswer = "⚠️ The AI service is temporarily unavailable. Please try again in a few moments.";
    } else if (errorMsg.includes('API_ERROR')) {
      finalAnswer = `⚠️ API Error: ${errorMsg.replace('API_ERROR: ', '')}`;
    } else if (errorMsg.includes('INVALID_JSON_RESPONSE')) {
      finalAnswer = "⚠️ Received an invalid response from the server. Please try again.";
    } else {
      finalAnswer = "⚠️ Sorry, I could not access local information or the AI at this time. Please check your internet connection.";
    }
  }

  msgGroup.querySelector('.ai-msg-text').innerHTML = formatAIResponse(finalAnswer);
  chat.scrollTop = chat.scrollHeight;

  if (sendBtn) {
    sendBtn.classList.remove('sending');
    sendBtn.textContent = 'Send';
    sendBtn.style.backgroundColor = '';
  }
  window.serviAbortController = null;
};

window.sendServiMessage = async function(faqText = '') {
  const input = document.getElementById('servi-chat-input');
  const chat = document.getElementById('servi-chat-messages');
  const preview = document.getElementById('servi-chat-preview');
  const sendBtn = document.querySelector('.send-button');
  
  let msg = faqText || input.value.trim();
  let attach = preview.innerHTML;
  if (!msg && !attach) return;

  // Init in-memory history and add user entry
  window.initChatHistory && window.initChatHistory('servi', 10);
  window.addToChatHistory && window.addToChatHistory('servi', 'user', msg);

  if (window.serviAbortController) {
    window.serviAbortController.abort();
  }
  window.serviAbortController = new AbortController();

  if (sendBtn) {
    sendBtn.classList.add('sending');
    sendBtn.textContent = 'Stop';
    sendBtn.style.backgroundColor = '#ff4444';

    // Add click handler to stop response
    const stopHandler = () => {
      if (window.serviAbortController) {
        window.serviAbortController.abort();
        window.serviAbortController = null;
      }
      sendBtn.removeEventListener('click', stopHandler);
      sendBtn.classList.remove('sending');
      sendBtn.textContent = 'Send';
      sendBtn.style.backgroundColor = '';
    };
    sendBtn.addEventListener('click', stopHandler);
  }

  const msgGroup = document.createElement('div');
  msgGroup.className = 'chat-message-group';
  msgGroup.innerHTML = `
    <div class='user-msg'>${msg}${attach ? "<br>" + attach : ""}</div>
    <div class='ai-msg'><span class='ai-msg-text'>Servi AI typing...</span></div>
  `;
  chat.appendChild(msgGroup);
  preview.innerHTML = '';
  if (!faqText) input.value = '';

  let finalAnswer = "";
  try {
    const localData = await fetch('Data/ServiInfo/serviinfo.txt').then(r => r.text());

  // Get history context from in-memory pairs
  const pairs = window.getQAHistoryForSection ? window.getQAHistoryForSection('servi', 5) : [];
  const historyContext = pairs.length > 0 ? '\n\nRecent chat history:\n' + pairs.map(h => `User: ${h.user}\nAI: ${h.ai}`).join('\n\n') : '';
  finalAnswer = await getGeminiAnswer(localData + historyContext, msg, window.GEMINI_API_KEY);
  // Append assistant reply to in-memory history
  window.addToChatHistory && window.addToChatHistory('servi', 'assistant', finalAnswer);
  } catch (e) {
    console.error("Error fetching local data or Gemini API call:", e);
    finalAnswer = "Sorry, I could not access local information or the AI at this time. Pls check your internet connection!";
  }

  msgGroup.querySelector('.ai-msg-text').innerHTML = formatAIResponse(finalAnswer);
  chat.scrollTop = chat.scrollHeight;

  if (sendBtn) {
    sendBtn.classList.remove('sending');
    sendBtn.textContent = 'Send';
    sendBtn.style.backgroundColor = '';
  }
  window.serviAbortController = null;
};