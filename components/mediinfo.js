
// Load common AI utilities first
if (!window.commonAILoaded) {
  const script = document.createElement('script');
  script.src = 'components/commonAI.js';
  script.onload = () => { window.commonAILoaded = true; };
  document.head.appendChild(script);
}

// Edit this prompt to instruct the AI on how to answer user messages for MediInfo
window.MEDI_AI_PROMPT = window.MEDI_AI_PROMPT || `You are an AI assistant for Yola, Adamawa State, Nigeria.
Help the user with medical and health information in Yola.
Answer the user's question using the information provided below, and the internet. But only those regarding medical and health matters.
If the answer is not present, reply: "Sorry, I do not have that specific information in my local database. Please contact a local healthcare provider for further help."
And if a user clearly requests information on education, navigation, community, environment, jobs, or agriculture, refer them to either of EduInfo, NaviInfo, CommunityInfo, EcoInfo, JobsConnect, or AgroInfo, as the case may be.`;

window.mediAbortController = window.mediAbortController || null;

// Robust navbar loader
window.renderSection = function() {
  ensureNavbarLoaded();
  if (!document.getElementById('global-css')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'styles/global.css';
    link.id = 'global-css';
    document.head.appendChild(link);
  }
  
  return fetch('templates/medi.html').then(r => r.text()).then(html => {
      return html;
    }).then(html => {
      document.getElementById('main-content').innerHTML = html;
      
      // Load chat history AFTER template is inserted
      setTimeout(() => {
        window.initAndRestoreSectionHistory && window.initAndRestoreSectionHistory('medi', 'medi-chat-messages');
        // Ensure auto-scroll observer is attached for this section
        window.observeChatContainers && window.observeChatContainers();
      }, 50);
      
      // Wire model toggle after template is inserted
      const mt = document.getElementById('model-toggle');
      if (mt) mt.onchange = function() { window.toggleGeminiModel('medi', this.checked); };

      // Add Enter key handler to chat input - ensures attachments and text are sent together
      const mediInput = document.getElementById('medi-chat-input');
      if (mediInput) {
        mediInput.addEventListener('keydown', function(e) {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            window.sendMediMessage();
          }
        });
      }
    }).catch(err => {
      console.error('Failed to load medi template:', err);
      document.getElementById('main-content').innerHTML = '<p>Failed to load content.</p>';
  });  
};

// stopMediResponse is now handled by setupStopButton in commonAI.js

window.sendMediMessage = async function(faqText = '') {
  const input = document.getElementById('medi-chat-input');
  const chat = document.getElementById('medi-chat-messages');
  const preview = document.getElementById('medi-chat-preview');
  const sendBtn = document.querySelector('#medi-chat-input + .send-button-group .send-button');
  const stopBtn = document.querySelector('#medi-chat-input + .send-button-group .stop-button');

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

  // Setup stop button with commonAI utility (with fallback if not loaded)
  if (typeof window.setupStopButton === 'function') {
    window.setupStopButton({ sendBtn, section: 'medi' });
  }

  const msgGroup = document.createElement('div');
  msgGroup.className = 'chat-message-group';
  // generate a temporary message id now so we can reuse for actions
  const mid = Date.now() + '_' + Math.random().toString(36).substr(2,9);
  msgGroup.setAttribute('data-msg-id', mid);
  msgGroup.innerHTML = `
    <div class='user-msg' data-msg-id='${mid}'>${msg}${attach ? "<br>" + attach : ""}</div>
    <div class='ai-msg' data-msg-id='${mid}'><span class='ai-msg-text'>Medi AI typing...</span></div>
  `;
  chat.appendChild(msgGroup);
  if (typeof window.clearPreviewAndRemoveBtn === 'function') {
    window.clearPreviewAndRemoveBtn(preview);
  } else {
    preview.innerHTML = '';
  }
  if (!faqText) input.value = '';

  // Load existing chat history using commonAI.js
  window.initChatHistory && window.initChatHistory('medi', 10);
  let chatHistory = window.getChatHistory ? window.getChatHistory('medi') : [];


  let finalAnswer = "";
  try {
    // Fetch main local data
    const signal = window.mediAbortController ? window.mediAbortController.signal : null;
    const response = await fetch('Data/MediInfo/mediinfo.txt', signal ? { signal } : {});
    const localData = await response.text();

    // Find local file links in the txt (format: details/Medi/filename.html)
    const linkRegex = /^-\s*(details\/Medi\/[^\s]+\.html)$/gim;
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
    finalAnswer = await getGeminiAnswer(allLocalData, msg, window.GEMINI_API_KEY, mediaData, window.mediAbortController ? window.mediAbortController.signal : null);
    // Store in chat history (keep last 10 messages)
    window.addToChatHistory && window.addToChatHistory('medi', 'user', msg);
    window.addToChatHistory && window.addToChatHistory('medi', 'assistant', finalAnswer);
  } catch (e) {
    if (e && (e.name === 'AbortError' || e.message === 'AbortError')) {
        finalAnswer = "USER ABORTED REQUEST";
    } else {
        console.error("Error fetching local data or Gemini API call:", e);
        finalAnswer = "Sorry, I could not access local information or the AI at this time. Please try again.";
    }
  }

  msgGroup.querySelector('.ai-msg-text').innerHTML = formatAIResponse(finalAnswer);
    if (typeof window.addActionsToMsgGroup === 'function') {
      window.addActionsToMsgGroup(msgGroup, 'medi', 'medi-chat-messages');
    }

  if (sendBtn) {
    sendBtn.classList.remove('sending');
    sendBtn.textContent = 'Send';
    sendBtn.style.backgroundColor = '';
  }
  window.mediAbortController = null;
};

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
    const promptGuide = localStorage.getItem('medi_ai_prompt') || MEDI_AI_PROMPT;
    contents.parts.push({
      text: `${promptGuide}\n\n--- LOCAL DATA START ---\n${localData}\n--- LOCAL DATA END ---\n\nUser question: ${msg}`
    });
    const modelVersion = 'gemini-2.5-flash';
    let body = JSON.stringify({ model: modelVersion, contents: [contents] });
    const url = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? (window.API_BASE || 'http://localhost:4000') + '/api/gemini'
      : '/api/gemini';
    
    const fetchOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    };
    if (signal) {
      fetchOptions.signal = signal;
    }

    let res = await fetch(url, fetchOptions);
    let data = await res.json();
    // Server will automatically handle fallback from 2.5 to 1.5 if needed
    return (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) ? data.candidates[0].content.parts[0].text : "Sorry, I couldn't get a response from the AI.";
  } catch (err) {
    if (err.name === 'AbortError') {
      throw err; // Re-throw abort errors
    }
    return "Sorry, I could not access local information or the AI at this time. Pls check your internet connection!";
  }
}
