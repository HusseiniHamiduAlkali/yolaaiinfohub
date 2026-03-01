
// Load common AI utilities first
if (!window.commonAILoaded) {
  const script = document.createElement('script');
  script.src = 'components/commonAI.js';
  script.onload = () => { window.commonAILoaded = true; };
  document.head.appendChild(script);
}
// IMPORTED FROM commonAI.js:

// ✓ window.useGemini25 - Model preference (Gemini 2.5 vs 1.5)
// ✓ window.toggleGeminiModel() - Switch between models
// ✓ window.currentSpeech - Speech synthesis state
// ✓ window.stopSpeaking() - Stop text-to-speech
// ✓ window.speakText() - Convert text to speech
// ✓ window.captureImage() - Camera capture functionality
// ✓ window.recordAudio() - Microphone recording
// ✓ window.uploadFile() - File upload handler
// ✓ window.formatAIResponse() - Format responses with markdown
// ✓ window.ensureNavbarLoaded() - Load navbar safely
// ✓ window.getGeminiAnswer() - Core API integration (can override)

// Gemini model preference
window.useGemini25 = window.useGemini25 || false;

// Initialize model preference from storage
if (typeof window.useGemini25 === 'undefined') {
    const storedPreference = localStorage.getItem('gemini_model_preference');
    window.useGemini25 = storedPreference === '2.5';
}

// Edit this prompt to instruct the AI on how to answer user messages for AgroInfo
window.AGRO_AI_PROMPT = window.AGRO_AI_PROMPT || `You are an AI assistant for Yola, Adamawa State, Nigeria.
Help the user with agricultural information in Yola.
Answer the user's question using the information provided below, and the internet. But only those regarding agriculture and farming.
If the answer is not present, reply: "Sorry, I do not have that specific information in my local database. Please contact a local agricultural authority for further help."
And if a user clearly requests information on education, navigation, community, health, jobs, or environment, refer them to either of EduInfo, NaviInfo, CommunityInfo, MediInfo, JobsConnect, or EcoInfo, as the case may be.`;

window.agroAbortController = window.agroAbortController || null;

// stopAgroResponse is now handled by setupStopButton in commonAI.js

window.renderSection = function() {
  ensureNavbarLoaded();
  if (!document.getElementById('global-css')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'styles/global.css';
    link.id = 'global-css';
    document.head.appendChild(link);
  }
  // Load HTML template from file for separation of concerns
  return fetch('templates/agro.html').then(r => r.text()).then(html => {
    document.getElementById('main-content').innerHTML = html;
    
    // Load chat history AFTER template is inserted
    setTimeout(() => {
      window.initAndRestoreSectionHistory && window.initAndRestoreSectionHistory('agro', 'agro-chat-messages');
    }, 50);
    
    // Wire model toggle after template is inserted
    const mt = document.getElementById('model-toggle');
    if (mt) mt.onchange = function() { window.toggleGeminiModel('home', this.checked); };

    // Add Enter key handler to chat input - ensures attachments and text are sent together
    const agroInput = document.getElementById('agro-chat-input');
    if (agroInput) {
      agroInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          window.sendAgroMessage();
        }
      });
    }
  }).catch(err => {
    console.error('Failed to load home template:', err);
    document.getElementById('main-content').innerHTML = '<p>Failed to load content.</p>';
  });  
};

window.sendAgroMessage = async function(faqText = '') {
  const input = document.getElementById('agro-chat-input');
  const chat = document.getElementById('agro-chat-messages');
  const preview = document.getElementById('agro-chat-preview');
  const sendBtn = document.querySelector('#agro-chat-input + .send-button-group .send-button');
  const stopBtn = document.querySelector('#agro-chat-input + .send-button-group .stop-button');

  // Always extract attachment from preview before clearing
  let msg = faqText || input.value.trim();
  let attach = preview.innerHTML;
  let imageData = null;
  if (preview) {
    const img = preview.querySelector('img');
    if (img) imageData = img.src;
    // You can add similar logic for audio/video if needed
  }
  if (!msg && !attach) return;

  // Setup stop button with commonAI utility and capture controller (with fallback if not loaded)
  let controller = null;
  if (typeof window.setupStopButton === 'function') {
    controller = window.setupStopButton({ sendBtn, section: 'agro' });
  }

  const msgGroup = document.createElement('div');
  msgGroup.className = 'chat-message-group';
  // generate a temporary message id now so we can reuse for actions
  const mid = Date.now() + '_' + Math.random().toString(36).substr(2,9);
  msgGroup.setAttribute('data-msg-id', mid);
  msgGroup.innerHTML = `
    <div class='user-msg' data-msg-id='${mid}'>${msg}${attach ? "<br>" + attach : ""}</div>
    <div class='ai-msg' data-msg-id='${mid}'><span class='ai-msg-text'>Agro AI typing...</span></div>
  `;
  chat.appendChild(msgGroup);
  if (typeof window.clearPreviewAndRemoveBtn === 'function') {
    window.clearPreviewAndRemoveBtn(preview);
  } else {
    preview.innerHTML = '';
  }
  if (!faqText) input.value = '';

  // Load existing chat history using commonAI.js
  window.initChatHistory && window.initChatHistory('agro', 10);
  let chatHistory = window.getChatHistory ? window.getChatHistory('agro') : [];


  let finalAnswer = "";
  try {
    // Fetch main local data using controller signal when available
    const signal = controller ? controller.signal : (window.agroAbortController ? window.agroAbortController.signal : null);
    const response = await fetch('Data/AgroInfo/agroinfo.txt', signal ? { signal } : {});
    const localData = await response.text();

    // Find local file links in the txt (format: details/Agro/filename.html)
    const linkRegex = /^-\s*(details\/Agro\/[^\s]+\.html)$/gim;
    const links = [];
    let match;
    while ((match = linkRegex.exec(localData)) !== null) {
      links.push(match[1]);
    }

    // Fetch all linked file contents in parallel
    let linkedContents = '';
    if (links.length > 0) {
      const fetches = links.map(link => fetch(link, signal ? { signal } : {}).then(r => r.ok ? r.text() : '').catch(() => ''));
      const results = await Promise.all(fetches);
      linkedContents = results.map((content, i) => `\n---\n[${links[i]}]\n${content}\n`).join('');
    }

    // Include chat history in the context
    const historyContext = chatHistory.length > 0 
        ? "\n\nRecent conversation history:\n" + chatHistory.map(h => `User: ${h.role === 'user' ? h.content : ''}\nAI: ${h.role === 'assistant' ? h.content : ''}`).filter(Boolean).join('\n\n')
        : "";

    // Combine all local data
    const allLocalData = localData + linkedContents + historyContext;
    try {
      finalAnswer = await getGeminiAnswer(allLocalData, msg, window.GEMINI_API_KEY, imageData, signal);
      // Store in chat history (keep last 10 messages)
      window.addToChatHistory && window.addToChatHistory('agro', 'user', msg);
      window.addToChatHistory && window.addToChatHistory('agro', 'assistant', finalAnswer);
    } catch (e) {
      if (e.name === 'AbortError' || e.message === 'AbortError') {
        finalAnswer = "USER ABORTED REQUEST";
      } else {
        console.error("Error in Gemini API call:", e);
        finalAnswer = "Sorry, I could not get a response from the AI at this time. Please try again.";
      }
    }
  } catch (e) {
    console.error("Error fetching local data:", e);
    finalAnswer = "Sorry, I could not access the local information. Please check your connection!";
  }

  msgGroup.querySelector('.ai-msg-text').innerHTML = `
    <div class="ai-response">
      ${finalAnswer.replace(/\*{1,3}([^*]+)\*{1,3}/g, '<b>$1</b>').replace(/\n/g, '<br>')}
    </div>
  `;
  if (typeof window.addActionsToMsgGroup === 'function') {
    window.addActionsToMsgGroup(msgGroup, 'agro', 'agro-chat-messages');
  }
  chat.scrollTop = chat.scrollHeight;

  if (sendBtn) {
    sendBtn.classList.remove('sending');
    sendBtn.textContent = 'Send';
    sendBtn.style.backgroundColor = '';
  }
  window.agroAbortController = null;
};


async function getGeminiAnswer(localData, msg, apiKey, imageData = null, signal = null) {
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
  const promptGuide = localStorage.getItem('agro_ai_prompt') || AGRO_AI_PROMPT;
  contents.parts.push({
    text: `${promptGuide}\n\n--- LOCAL DATA START ---\n${localData}\n--- LOCAL DATA END ---\n\nUser question: ${msg}`
  });
  // Always use gemini-2.5-flash as primary; server will handle fallback to 1.5 if needed
  const modelVersion = 'gemini-2.5-flash';
  let body = JSON.stringify({ model: modelVersion, contents: [contents] });
  const url = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? (window.API_BASE || 'http://localhost:4000') + '/api/gemini'
    : '/api/gemini';

  let response;
  try {
    const fetchOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    };
    if (signal) {
      fetchOptions.signal = signal;
    }

    response = await fetch(url, fetchOptions);
    
    let data = await response.json();
    // Server will automatically handle fallback, so we don't need client-side fallback
    return (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) ? data.candidates[0].content.parts[0].text : "Sorry, I couldn't get a response from the AI.";
  } catch (err) {
    if (err.name === 'AbortError') {
      throw err; // Re-throw abort errors to be handled by caller
    }
    throw new Error("Failed to get response from AI service");
  }
}