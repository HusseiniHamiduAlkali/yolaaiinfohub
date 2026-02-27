
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
      // Wire model toggle after template is inserted
      const mt = document.getElementById('model-toggle');
      if (mt) mt.onchange = function() { window.toggleGeminiModel('medi', this.checked); };
    }).catch(err => {
      console.error('Failed to load medi template:', err);
      document.getElementById('main-content').innerHTML = '<p>Failed to load content.</p>';
  });  
};

window.stopMediResponse = function() {
  if (window.mediAbortController) {
    window.mediAbortController.abort();
    window.mediAbortController = null;
  }
  const sendBtn = document.querySelector('.send-button');
  if (sendBtn) {
    sendBtn.classList.remove('sending');
    sendBtn.textContent = 'Send';
    sendBtn.style.backgroundColor = '';
  }
};

window.sendMediMessage = async function(faqText = '') {
  const input = document.getElementById('medi-chat-input');
  const chat = document.getElementById('medi-chat-messages');
  const preview = document.getElementById('medi-chat-preview');
  const sendBtn = document.querySelector('.send-button');
  const stopBtn = document.querySelector('.stop-button');

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

  if (window.mediAbortController) {
    window.mediAbortController.abort();
  }
  window.mediAbortController = new AbortController();

  if (sendBtn) {
    // preserve original type and onclick so we can restore them
    const originalType = sendBtn.type;
    const originalClickHandler = sendBtn.onclick;

    sendBtn.classList.add('sending');
    sendBtn.textContent = 'Stop';
    sendBtn.style.backgroundColor = '#ff4444';
    // make it a non-submit while stopping to avoid form resubmission
    sendBtn.type = 'button';

    // Add click handler to stop response
    const stopHandler = (e) => {
      if (e && e.preventDefault) e.preventDefault();
      if (window.mediAbortController) {
        window.mediAbortController.abort();
        window.mediAbortController = null;
      }
      // restore original behavior
      sendBtn.onclick = originalClickHandler;
      sendBtn.type = originalType;
      sendBtn.classList.remove('sending');
      sendBtn.textContent = 'Send';
      sendBtn.style.backgroundColor = '';
    };
    sendBtn.onclick = stopHandler;
  }

  const msgGroup = document.createElement('div');
  msgGroup.className = 'chat-message-group';
  msgGroup.innerHTML = `
    <div class='user-msg'>${msg}${attach ? "<br>" + attach : ""}</div>
    <div class='ai-msg'><span class='ai-msg-text'>Medi AI typing...</span></div>
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
    const localData = await fetch('Data/MediInfo/mediinfo.txt', signal ? { signal } : {}).then(r => r.text());

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
    finalAnswer = await getGeminiAnswer(allLocalData, msg, window.GEMINI_API_KEY, imageData, window.mediAbortController ? window.mediAbortController.signal : null);
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
  chat.scrollTop = chat.scrollHeight;

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
    if (data.error && window.useGemini25 && !imageData) {
      // fallback to 1.5
      body = JSON.stringify({ model: 'gemini-1.5-flash', contents: [contents] });
      res = await fetch(url, fetchOptions);
      data = await res.json();
    }
    return (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) ? data.candidates[0].content.parts[0].text : "Sorry, I couldn't get a response from the AI.";
  } catch (err) {
    if (err.name === 'AbortError') {
      throw err; // Re-throw abort errors
    }
    return "Sorry, I could not access local information or the AI at this time. Pls check your internet connection!";
  }
}
