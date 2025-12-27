
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


// Global text-to-speech variables and functions
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
    const promptGuide = localStorage.getItem('community_ai_prompt') || COMMUNITY_AI_PROMPT;
    contents.parts.push({
      text: `${promptGuide}\n\n--- LOCAL DATA START ---\n${localData}\n--- LOCAL DATA END ---\n\nUser question: ${msg}`
    });
    const modelVersion = 'gemini-2.5-flash';
    let body = JSON.stringify({ model: modelVersion, contents: [contents] });
    
    const apiUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:3001/api/gemini'
      : '/api/gemini';
      
    let res = await fetch(apiUrl, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body 
    });
    
    let data = await res.json();
    
    if (data.error && window.useGemini25 && !imageData) {
      // fallback to 1.5
      body = JSON.stringify({ model: 'gemini-1.5-flash', contents: [contents] });
      res = await fetch(apiUrl, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body 
      });
      data = await res.json();
    }
    
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't get a response from the AI.";
  } catch (err) {
    console.error("Gemini API error:", err);
    return "Sorry, there was an error contacting the AI service.";
  }
}

// Edit this prompt to instruct the AI on how to answer user messages for CommunityInfo
window.COMMUNITY_AI_PROMPT = window.COMMUNITY_AI_PROMPT || `You are an AI assistant for Yola, Adamawa State, Nigeria.
Help the user with community information in Yola.
Answer the user's question using the information provided below, and the internet. But only those regarding community events, organizations, and services.
If the answer is not present, reply: "Sorry, I do not have that specific information in my local database. Please contact a local community authority for further help."
And if a user clearly requests information on health, education, navigation, environment, jobs, or agriculture, refer them to either of MediInfo, EduInfo, NaviInfo, EcoInfo, JobsConnect, or AgroInfo, as the case may be.`;

window.communityAbortController = window.communityAbortController || null;
// Robust navbar loader


window.renderSection = function() {
  console.log('communityinfo.renderSection running');
  ensureNavbarLoaded();
  if (!document.getElementById('global-css')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'styles/global.css';
    link.id = 'global-css';
    document.head.appendChild(link);
  }
  fetch('templates/community.html').then(r => r.text()).then(html => {
    document.getElementById('main-content').innerHTML = html;
    // Wire model toggle after template is inserted
    const mt = document.getElementById('model-toggle');
    if (mt) mt.onchange = function() { window.toggleGeminiModel('community', this.checked); };
  }).catch(err => {
    console.error('Failed to load home template:', err);
    document.getElementById('main-content').innerHTML = '<p>Failed to load content.</p>';
  });  
};

window.stopCommunityResponse = function() {
  if (window.communityAbortController) {
    window.communityAbortController.abort();
    window.communityAbortController = null;
  }
  const sendBtn = document.querySelector('.send-button');
  if (sendBtn) {
    sendBtn.classList.remove('sending');
    sendBtn.textContent = 'Send';
    sendBtn.style.backgroundColor = '';
  }
};

window.sendCommunityMessage = async function(faqText = '') {
  const input = document.getElementById('chat-input');
  const chat = document.getElementById('chat-messages');
  const preview = document.getElementById('chat-preview');
  const sendBtn = document.querySelector('.send-button');

  let msg = faqText || input.value.trim();
  let attach = preview.innerHTML;
  if (!msg && !attach) return;

  // Extract image data if present in preview
  let imageData = null;
  const previewImg = preview.querySelector('img');
  if (previewImg) {
    imageData = previewImg.src;
    msg = msg + "\nPlease analyze this image and provide relevant community information or suggestions.";
  }

  // Reset previous abort controller if it exists
  if (window.communityAbortController) {
    window.communityAbortController.abort();
    window.communityAbortController = null;
  }
  
  // Create new abort controller
  window.communityAbortController = new AbortController();

  if (sendBtn) {
    sendBtn.classList.add('sending');
    sendBtn.textContent = 'Stop';
    sendBtn.style.backgroundColor = '#ff4444';

    // Remove any existing click listeners by cloning, then switch to a non-submit button
    const newBtn = sendBtn.cloneNode(true);
    // ensure clicking 'Stop' does not re-submit the form
    newBtn.type = 'button';
    sendBtn.parentNode.replaceChild(newBtn, sendBtn);
    
    // Add click handler to stop response (prevent default form submission)
    const stopHandler = (e) => {
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
      window.stopCommunityResponse();
    };
    newBtn.addEventListener('click', stopHandler);

  const msgGroup = document.createElement('div');
  msgGroup.className = 'chat-message-group';
  msgGroup.innerHTML = `
    <div class='user-msg'>${msg}${attach ? "<br>" + attach : ""}</div>
    <div class='ai-msg'><span class='ai-msg-text'>Community AI typing...</span></div>
  `;
  chat.appendChild(msgGroup);
  preview.innerHTML = '';
  if (!faqText) input.value = '';

  let finalAnswer = "";
  try {
    const localData = await fetch('Data/CommunityInfo/communityinfo.txt').then(r => r.text());
    
    // Get chat history context
    const history = JSON.parse(localStorage.getItem('community_chat_history') || '[]');
    let historyContext = '';
    if (history.length > 0) {
      historyContext = '\n\nRecent chat history:\n' + 
        history.map(h => `User: ${h.user}\nAI: ${h.ai}`).join('\n\n');
    }

    finalAnswer = await getGeminiAnswer(COMMUNITY_AI_PROMPT + "\n\n" + localData + historyContext, msg, window.GEMINI_API_KEY, imageData);

    // Update history with AI response
    history.push({ user: msg, ai: finalAnswer });
    while (history.length > 10) history.shift(); // Keep only last 10 messages
    localStorage.setItem('community_chat_history', JSON.stringify(history));
    
    } catch (e) {
    if (e.name === 'AbortError' || e.message === 'AbortError') {
      finalAnswer = "USER ABORTED REQUEST";
    } else {
      console.error("Error fetching local data or Gemini API call:", e);
      finalAnswer = "Sorry, I could not access local information or the AI at this time. Please check your internet connection!";
    }
  }

  msgGroup.querySelector('.ai-msg-text').innerHTML = formatAIResponse(finalAnswer);
  chat.scrollTop = chat.scrollHeight;

  msgGroup.querySelector('.ai-msg-text').innerHTML = formatAIResponse(finalAnswer);
  chat.scrollTop = chat.scrollHeight;

  // Reset the button state
  const currentBtn = document.querySelector('.send-button');
  if (currentBtn) {
    // Replace to clear listeners
    const restoredBtn = currentBtn.cloneNode(true);
    // restore submit behaviour
    restoredBtn.type = 'submit';
    currentBtn.parentNode.replaceChild(restoredBtn, currentBtn);
    
    // Reset button appearance
    restoredBtn.classList.remove('sending');
    restoredBtn.textContent = 'Send';
    restoredBtn.style.backgroundColor = '';
    
    // Add the send message handler back (prevent default in case it's used as click)
    restoredBtn.addEventListener('click', (e) => { if (e && typeof e.preventDefault === 'function') e.preventDefault(); window.sendCommunityMessage(); });
  }
};


async function getGeminiAnswer(localData, msg, apiKey, imageData = null) {
  if (!window.communityAbortController) {
    window.communityAbortController = new AbortController();
  }

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
    const promptGuide = localStorage.getItem('community_ai_prompt') || COMMUNITY_AI_PROMPT;
    contents.parts.push({
      text: `${promptGuide}\n\n--- LOCAL DATA START ---\n${localData}\n--- LOCAL DATA END ---\n\nUser question: ${msg}`
    });
    const modelVersion = 'gemini-2.5-flash';
    let body = JSON.stringify({ model: modelVersion, contents: [contents] });
    
    const serverUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? (window.API_BASE || 'http://localhost:4000') + '/api/gemini'
      : 'https://yolaaiinfohub.netlify.app/api/gemini';
      
    let res = await fetch(serverUrl, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: window.communityAbortController.signal 
    });
    
    if (!res.ok) {
      throw new Error('Network response was not ok');
    }
    
    let data = await res.json();
    
    if (data.error && window.useGemini25 && !imageData) {
      // fallback to 1.5
      body = JSON.stringify({ model: 'gemini-1.5-flash', contents: [contents] });
      res = await fetch(serverUrl, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: window.communityAbortController.signal
      });
      
      if (!res.ok) {
        throw new Error('Network response was not ok');
      }
      
      data = await res.json();
    }
    
    if (window.communityAbortController.signal.aborted) {
      throw new Error('AbortError');
    }
    
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't get a response from the AI.";
  } catch (err) {
    if (err.name === 'AbortError' || err.message === 'AbortError') {
      throw new Error('AbortError');
    }
    console.error("Gemini API error:", err);
    return "Sorry, I could not access local information or the AI at this time. Please check your internet connection!";
  }
}
}