
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
      // Ensure auto-scroll observer is attached for this section
      window.observeChatContainers && window.observeChatContainers();
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
  let mediaData = null;
  if (preview) {
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
        // Fallback to checking for image/audio/video/iframe previews
        const img = container.querySelector('img');
        const audio = container.querySelector('audio');
        const video = container.querySelector('video');
        const iframe = container.querySelector('iframe');
        if (img && img.src) mediaData = img.src;
        else if (audio && audio.src) mediaData = audio.src;
        else if (video && video.src) mediaData = video.src;
        else if (iframe && iframe.src) mediaData = iframe.src;
      }
    }
  }

  const attachments = window.getMessageAttachmentsFromPreview('agro', preview) || [];
  if (attachments.length > 0) {
    const attDesc = attachments.map(att => `${att.name || 'file'} (${att.type || 'unknown'})`).join(', ');
    msg = msg ? `${msg}\n\nAttached files: ${attDesc}` : `Attached files: ${attDesc}`;
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

    // Fetch all .html files in details/Agro directory
    const agroFiles = await fetch('details/Agro/', signal ? { signal } : {}).then(r => r.text());
    const parser = new DOMParser();
    const doc = parser.parseFromString(agroFiles, 'text/html');
    const links = Array.from(doc.querySelectorAll('a[href$=".html"]')).map(link => `details/Agro/${link.getAttribute('href')}`);

    const htmlContents = await Promise.all(
      links.map(async (link) => {
        try {
          const res = await fetch(link, signal ? { signal } : {});
          if (!res.ok) return '';
          return `\n--- ${link} ---\n` + (await res.text());
        } catch {
          return '';
        }
      })
    );

    const allLocalData = htmlContents.join('\n');

    // Include chat history in the context
    const historyContext = chatHistory.length > 0 
        ? "\n\nRecent conversation history:\n" + chatHistory.map(h => `User: ${h.role === 'user' ? h.content : ''}\nAI: ${h.role === 'assistant' ? h.content : ''}`).filter(Boolean).join('\n\n')
        : "";

    // Combine all local data
    const allLocalDataWithHistory = allLocalData + historyContext;
    try {
      finalAnswer = await window.callGeminiAI(allLocalDataWithHistory, msg, window.GEMINI_API_KEY, mediaData, signal, 'agro', attachments);
      // Store in chat history (keep last 10 messages)
      window.addToChatHistory && window.addToChatHistory('agro', 'user', msg);
      window.addToChatHistory && window.addToChatHistory('agro', 'assistant', finalAnswer);
    } catch (e) {
      if (e && (e.name === 'AbortError' || e.message === 'AbortError')) {
        finalAnswer = "Request cancelled.";
      } else if (typeof window.friendlyAIErrorMessage === 'function') {
        finalAnswer = window.friendlyAIErrorMessage(e);
      } else {
        console.error("Error in Gemini API call:", e);
        finalAnswer = "The AI is currently unavailable. Please try again later.";
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