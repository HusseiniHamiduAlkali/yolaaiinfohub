// eduinfo.js

// Load common AI utilities first
if (!window.commonAILoaded) {
  const script = document.createElement('script');
  script.src = 'components/commonAI.js';
  script.onload = () => { window.commonAILoaded = true; };
  document.head.appendChild(script);
}

// AI Prompt for EduInfo
window.EDU_AI_PROMPT = `You are an AI assistant for Yola, Adamawa State, Nigeria.
Help the user with educational information in Yola.
Answer questions using the available information and focus only on education-related topics.
If specific information is not available, say: "Sorry, I do not have that specific information in my local database. Please contact a local education authority for further help."
For non-education queries about health, navigation, community, environment, jobs, or agriculture, refer users to MediInfo, NaviInfo, CommunityInfo, EcoInfo, JobsConnect, or AgroInfo respectively.`;

// Abort controller for fetch requests
window.eduAbortController = null;
// Initialize EduInfo Section
window.renderSection = function() {
    return fetch('templates/edu.html').then(r => r.text()).then(html => {
        document.getElementById('main-content').innerHTML = html;
        
        // Load chat history AFTER template is inserted
        setTimeout(() => { 
          window.initAndRestoreSectionHistory && window.initAndRestoreSectionHistory('edu', 'eduinfo-chat-messages'); 
        }, 50);
        
        // Wire model toggle after template is inserted
        const mt = document.getElementById('model-toggle');
        if (mt) mt.onchange = function() { window.toggleGeminiModel('edu', this.checked); };

        // Add Enter key handler to chat input - ensures attachments and text are sent together
        const eduInput = document.getElementById('edu-chat-input');
        if (eduInput) {
          eduInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              window.sendEduMessage();
            }
          });
        }
    }).catch(err => {
        console.error('Failed to load home template:', err);
        document.getElementById('main-content').innerHTML = '<p>Failed to load content.</p>';
    });
};

// Register Section Initialization
function ensureEduSectionInit() {
  if (typeof window.registerSectionInit === 'function' && typeof window.initEduInfo === 'function') {
    window.registerSectionInit('eduinfo', window.initEduInfo);
  } else {
    setTimeout(ensureEduSectionInit, 100);
  }
}
ensureEduSectionInit();

// Send Message to AI
window.sendEduMessage = async function(faqText = '') {
    const input = document.getElementById('edu-chat-input');
    const chat = document.getElementById('eduinfo-chat-messages');
    const preview = document.getElementById('eduinfo-chat-preview');
    const sendBtn = document.querySelector('#edu-chat-input + .send-button-group .send-button');
    const stopBtn = document.querySelector('#edu-chat-input + .send-button-group .stop-button');

    let msg = faqText || input.value.trim();
    let attach = preview.innerHTML;
    if (!msg && !attach) return;

    // Setup stop button with commonAI utility (with fallback if not loaded)
    if (typeof window.setupStopButton === 'function') {
      window.setupStopButton({ sendBtn, section: 'edu' });
    }

    const msgGroup = document.createElement('div');
    msgGroup.className = 'chat-message-group';
    // generate a temporary message id now so we can reuse for actions
    const mid = Date.now() + '_' + Math.random().toString(36).substr(2,9);
    msgGroup.setAttribute('data-msg-id', mid);
    msgGroup.innerHTML = `
    <div class='user-msg' data-msg-id='${mid}'>${msg}${attach ? "<br>" + attach : ""}</div>
    <div class='ai-msg' data-msg-id='${mid}'><span class='ai-msg-text'>Edu AI typing...</span></div>
  `;
    chat.appendChild(msgGroup);
    const imageData = preview.querySelector('img') ? preview.querySelector('img').src : null;
    window.clearPreviewAndRemoveBtn(preview);
    if (!faqText) input.value = '';

  // Initialize in-memory history for edu and add user entry
  window.initChatHistory && window.initChatHistory('edu', 10);
  window.addToChatHistory && window.addToChatHistory('edu', 'user', msg);

  // Build history context from in-memory pairs
  const historyPairs = window.getQAHistoryForSection ? window.getQAHistoryForSection('edu', 5) : [];

  let finalAnswer = "";
    try {
        const signal = window.eduAbortController ? window.eduAbortController.signal : null;
        const response = await fetch('Data/EduInfo/eduinfo.txt', signal ? { signal } : {});
        const localData = await response.text();
        
        // Get chat history for this section
        const chatHistory = window.getChatHistory('edu') || [];
        
        // Include chat history in the context
        const historyContext = chatHistory.length > 0 
            ? "\n\nRecent conversation history:\n" + chatHistory.map(h => `${h.role === 'user' ? 'User' : 'AI'}: ${h.content}`).join('\n\n')
            : "";
        
    // Find local file links in the txt (format: - School Name: details/Edu/filename.html)
    const linkRegex = /details\/Edu\/[^\s]+\.html/gim;
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
    const allLocalData = localData + linkedContents + historyContext;
            
  finalAnswer = await getGeminiAnswer(allLocalData, msg, window.GEMINI_API_KEY, imageData, window.eduAbortController ? window.eduAbortController.signal : null);
  // Add user message to history
  window.addToChatHistory && window.addToChatHistory('edu', 'user', msg);
  // Add assistant reply to in-memory history
  window.addToChatHistory && window.addToChatHistory('edu', 'assistant', finalAnswer);
    } catch (e) {
        if (e.name === 'AbortError' || e.message === 'AbortError') {
            finalAnswer = "USER ABORTED REQUEST";
        } else {
            console.error("Error fetching local data or Gemini API call:", e);
            finalAnswer = "Sorry, I could not access local information or the AI at this time. Please try again.";
        }
    }

    msgGroup.querySelector('.ai-msg-text').innerHTML = formatAIResponse(finalAnswer);
    if (typeof window.addActionsToMsgGroup === 'function') {
      window.addActionsToMsgGroup(msgGroup, 'edu', 'eduinfo-chat-messages');
    }
    chat.scrollTop = chat.scrollHeight;

    if (sendBtn) {
        sendBtn.classList.remove('sending');
        sendBtn.textContent = 'Send';
        sendBtn.style.backgroundColor = '';
    }
    window.eduAbortController = null;
};

// Common helper for Gemini API call
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
  const promptGuide = localStorage.getItem('edu_ai_prompt') || EDU_AI_PROMPT;
  contents.parts.push({
    text: `${promptGuide}\n\n--- LOCAL DATA START ---\n${localData}\n--- LOCAL DATA END ---\n\nUser question: ${msg}`
  });
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
    return (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) ? data.candidates[0].content.parts[0].text : "Sorry, I couldn't get a response from the AI.";
  } catch (err) {
    if (err.name === 'AbortError') {
      throw err; // Re-throw abort errors to be handled by caller
    }
    throw new Error("Failed to get response from AI service");
  }
}
