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
  
  return fetch('templates/servi.html').then(r => r.text()).then(html => {
    document.getElementById('main-content').innerHTML = html;
    
    // Load chat history AFTER template is inserted
    setTimeout(() => { 
      window.initAndRestoreSectionHistory && window.initAndRestoreSectionHistory('servi', 'servi-chat-messages');
      // Ensure auto-scroll observer is attached for this section
      window.observeChatContainers && window.observeChatContainers();
    }, 50);
    
    // Wire model toggle after template is inserted
    const mt = document.getElementById('model-toggle');
    if (mt) mt.onchange = function() { window.toggleGeminiModel('servi', this.checked); };

    // Add Enter key handler to chat input - ensures attachments and text are sent together
    const serviInput = document.getElementById('servi-chat-input');
    if (serviInput) {
      serviInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          window.sendServiMessage();
        }
      });
    }
  }).catch(err => {
    console.error('Failed to load servi template:', err);
    document.getElementById('main-content').innerHTML = '<p>Failed to load content.</p>';
  });
};

// stopServiResponse is now handled by setupStopButton in commonAI.js

// Common helper for Gemini API call
async function getGeminiAnswer(localData, msg, apiKey, imageData = null, signal = null) {
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
    
    const fetchOptions = { 
      method: 'POST', 
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include',
      mode: 'cors',
      body
    };
    if (signal) {
      fetchOptions.signal = signal;
    }
      
    let res = await fetch(serverUrl, fetchOptions);

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
    if (err.name === 'AbortError') {
      throw err; // Re-throw abort errors to be handled by caller
    }
    console.error('Error getting Gemini answer:', err);
    throw err;
  }
}

window.sendServiMessage = async function(faqText = '') {
  const input = document.getElementById('servi-chat-input');
  const chat = document.getElementById('servi-chat-messages');
  const preview = document.getElementById('servi-chat-preview');
  const sendBtn = document.querySelector('#servi-chat-input + .send-button-group .send-button');
  const stopBtn = document.querySelector('#servi-chat-input + .send-button-group .stop-button');

  // Always extract attachment from preview before clearing
  let msg = faqText || input.value.trim();
  let attach = preview.innerHTML;
  let mediaData = null;
  if (preview) {
    const img = preview.querySelector('img');
    const audio = preview.querySelector('audio');
    if (img && img.src) mediaData = img.src;
    else if (audio && audio.src) mediaData = audio.src;
  }
  if (!msg && !attach) return;

  // Setup stop button with commonAI utility (creates AbortController) - with fallback if not loaded
  if (sendBtn && typeof window.setupStopButton === 'function') {
    window.setupStopButton({ sendBtn, section: 'servi' });
  }

  const msgGroup = document.createElement('div');
  msgGroup.className = 'chat-message-group';
  // generate a temporary message id now so we can reuse for actions
  const mid = Date.now() + '_' + Math.random().toString(36).substr(2,9);
  msgGroup.setAttribute('data-msg-id', mid);
  msgGroup.innerHTML = `
    <div class='user-msg' data-msg-id='${mid}'>${msg}${attach ? "<br>" + attach : ""}</div>
    <div class='ai-msg' data-msg-id='${mid}'><span class='ai-msg-text'>Servi AI typing...</span></div>
  `;
  chat.appendChild(msgGroup);
  window.clearPreviewAndRemoveBtn(preview);
  if (!faqText) input.value = '';

  let finalAnswer = "";
  try {
    const signal = window.serviAbortController ? window.serviAbortController.signal : null;
    const response = await fetch('Data/ServiInfo/serviinfo.txt', signal ? { signal } : {});
    const localData = await response.text();

    // Find local file links in the txt (format: details/Servi/filename.html)
    const linkRegex = /details\/Servi\/[^\s]+\.html/gim;
    const links = [];
    let match;
    while ((match = linkRegex.exec(localData)) !== null) {
      links.push(match[0]);
    }

    // Fetch all linked file contents in parallel
    let linkedContents = '';
    if (links.length > 0) {
      const fetches = links.map(link => fetch(link, signal ? { signal } : {}).then(r => r.ok ? r.text() : '').catch(() => ''));
      const results = await Promise.all(fetches);
      linkedContents = results.map((content, i) => `\n---\n[${links[i]}]\n${content}\n`).join('');
    }

    // Combine all local data
    const allLocalData = localData + linkedContents;
    finalAnswer = await getGeminiAnswer(allLocalData, msg, window.GEMINI_API_KEY, mediaData, signal);
  } catch (e) {
    if (e.name === 'AbortError') {
      finalAnswer = 'USER ABORTED REQUEST';
    } else {
      console.error("Error fetching local data or Gemini API call:", e);
      finalAnswer = "⚠️ Sorry, I could not access local information or the AI at this time. Please check your internet connection.";
    }
  }

  msgGroup.querySelector('.ai-msg-text').innerHTML = formatAIResponse(finalAnswer);
  if (typeof window.addActionsToMsgGroup === 'function') {
    window.addActionsToMsgGroup(msgGroup, 'servi', 'servi-chat-messages');
  }
  chat.scrollTop = chat.scrollHeight;

  if (sendBtn) {
    sendBtn.classList.remove('sending');
    sendBtn.textContent = 'Send';
    sendBtn.style.backgroundColor = '';
  }
  window.serviAbortController = null;
};

