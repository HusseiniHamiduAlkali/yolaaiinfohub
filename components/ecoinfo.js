
// Load common AI utilities first
if (!window.commonAILoaded) {
  const script = document.createElement('script');
  script.src = 'components/commonAI.js';
  script.onload = () => { window.commonAILoaded = true; };
  document.head.appendChild(script);
}

// Dynamically load required scripts if not already loaded
function loadEcoScripts(cb) {
  function loadScript(src, onload) {
    if ([...document.scripts].some(s => s.src.includes(src))) { onload(); return; }
    const script = document.createElement('script');
    script.src = src;
    script.onload = onload;
    document.head.appendChild(script);
  }
  loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.11.0/dist/tf.min.js', () => {
    loadScript('components/ecoClassifier.js', cb || (() => {}));
  });
}

// Call this when the section loads
window.renderSection = function() {
  loadEcoScripts(() => {
    if (typeof window.initEcoFeatures === 'function') window.initEcoFeatures();
  });
};

// Moved logic from window.renderEcoSection into window.renderSection
loadEcoScripts(() => {
  if (typeof window.initEcoFeatures === 'function') window.initEcoFeatures();
});

// Add sendEcoMessage function
window.sendEcoMessage = async function(faqText = '') {
  const input = document.getElementById('eco-chat-input');
  const chat = document.getElementById('chat-messages');
  const preview = document.getElementById('eco-chat-preview');
  const sendBtn = document.querySelector('.send-button');
  const stopBtn = document.querySelector('.stop-button');

  // Get message from input or FAQ
  let msg = faqText || input.value.trim();
  let attach = preview.innerHTML;
  if (!msg && !attach) return;

  // Ensure in-memory history exists for eco
  window.initChatHistory && window.initChatHistory('eco', 10);
  // Reserve slot for user message (AI will be added after response)
  window.addToChatHistory && window.addToChatHistory('eco', 'user', msg);

  // Extract image data if present in preview
  let imageData = null;
  if (preview) {
    const previewImg = preview.querySelector('img');
    if (previewImg) {
      imageData = previewImg.src;
      msg = (msg || '') + "\nPlease analyze this image and provide relevant environmental information or recommendations.";
    }
  }

  // Handle abort controller
  if (window.ecoAbortController) {
    window.ecoAbortController.abort();
  }
  window.ecoAbortController = new AbortController();

  // Update UI state
  if (sendBtn) {
    const originalType = sendBtn.type;
    const stopHandler = (e) => {
      if (e && e.preventDefault) e.preventDefault();
      if (window.ecoAbortController) {
        window.ecoAbortController.abort();
        window.ecoAbortController = null;
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
    // make the active button non-submit to avoid re-submission
    sendBtn.type = 'button';
    sendBtn.addEventListener('click', stopHandler);
  }

  const msgGroup = document.createElement('div');
  msgGroup.className = 'chat-message-group';
  msgGroup.innerHTML = `
    <div class='user-msg'>${msg}${attach ? "<br>" + attach : ""}</div>
    <div class='ai-msg'><span class='ai-msg-text'>Eco AI typing...</span></div>
  `;
  chat.appendChild(msgGroup);
  preview.innerHTML = '';
  if (!faqText) input.value = '';

  let finalAnswer = "";
  try {
    const localData = await fetch('Data/EcoInfo/ecoinfo.txt').then(r => r.text());
    
  // Get chat history context from in-memory helper
  const historyPairs = window.getQAHistoryForSection ? window.getQAHistoryForSection('eco', 5) : [];
  const historyContext = historyPairs.length > 0 ? '\n\nRecent chat history:\n' + historyPairs.map(h => `User: ${h.user}\nAI: ${h.ai}`).join('\n\n') : '';
    
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
    
    const promptGuide = localStorage.getItem('eco_ai_prompt') || ECO_AI_PROMPT;
    contents.parts.push({
      text: `${promptGuide}\n\n--- LOCAL DATA START ---\n${localData}\n--- LOCAL DATA END ---\n${historyContext}\n\nUser question: ${msg}`
    });
    
    const modelVersion = imageData ? 'gemini-pro-vision' : (window.useGemini25 ? 'gemini-2.5-flash' : 'gemini-1.5-flash');
    let body = JSON.stringify({ model: modelVersion, contents: [contents] });
    
    // Determine the server URL based on the environment
    const serverUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? (window.API_BASE || 'http://localhost:4000') + '/api/gemini'
      : 'https://yolainfohub.netlify.app/api/gemini';
      
    let res = await fetch(serverUrl, { 
      method: 'POST', 
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include',
      mode: 'cors',
      body 
    });
    
    let data = await res.json();
    
    if (data.error && window.useGemini25 && !imageData) {
      // fallback to 1.5
      body = JSON.stringify({ model: 'gemini-1.5-flash', contents: [contents] });
      res = await fetch(serverUrl, { 
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        mode: 'cors',
        body 
      });
      data = await res.json();
    }
    
    finalAnswer = (data.candidates && data.candidates[0] && data.candidates[0].content && 
                  data.candidates[0].content.parts && data.candidates[0].content.parts[0] && 
                  data.candidates[0].content.parts[0].text) 
                  ? data.candidates[0].content.parts[0].text 
                  : "Sorry, I couldn't get a response from the AI.";

  // Add AI response to in-memory history
  window.addToChatHistory && window.addToChatHistory('eco', 'assistant', finalAnswer);
  } catch (e) {
    console.error("Error fetching local data or Gemini API call:", e);
    if (e && e.name === 'AbortError') finalAnswer = 'USER ABORTED REQUEST';
    else finalAnswer = "Sorry, I could not access local information or the AI at this time.";
  }

  msgGroup.querySelector('.ai-msg-text').innerHTML = formatAIResponse(finalAnswer);
  chat.scrollTop = chat.scrollHeight;

  if (sendBtn) {
    sendBtn.classList.remove('sending');
    sendBtn.textContent = 'Send';
    sendBtn.style.backgroundColor = '';
  }
  window.ecoAbortController = null;
};

// Add stopEcoResponse function
window.stopEcoResponse = function() {
  if (window.ecoAbortController) {
    window.ecoAbortController.abort();
    window.ecoAbortController = null;
  }
  const sendBtn = document.querySelector('.send-button');
  const stopBtn = document.querySelector('.stop-button');
  if (sendBtn) {
    sendBtn.classList.remove('sending');
    sendBtn.querySelector('.send-text').textContent = 'Send';
    sendBtn.disabled = false;
  }
  if (stopBtn) stopBtn.style.display = 'none';
};

// Existing renderSection logic continues here
if (!document.getElementById('global-css')) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'styles/global.css';
  link.id = 'global-css';
  document.head.appendChild(link);
}

// Initialize classifiers
window.ecoClassifier = null;
window.carbonCalculator = null;

// Handle recycling classification and chat integration
async function handleRecyclingClassification(imageFile) {
    const chatMessages = document.querySelector('.chat-messages');
    const loadingMessage = document.createElement('div');
    loadingMessage.className = 'chat-message system-message';
    loadingMessage.innerHTML = 'Analyzing image...';
    chatMessages.appendChild(loadingMessage);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
        // Create image element for classification
        const img = new Image();
        img.src = URL.createObjectURL(imageFile);
        await new Promise(resolve => img.onload = resolve);

        // Classify the image
        const result = await window.ecoClassifier.classifyImage(img);
        
        // Get recycling instructions
        const instructions = getRecyclingInstructions(result.label);
        
        // Remove loading message
        loadingMessage.remove();

        // Add classification result to chat
        const resultMessage = document.createElement('div');
        resultMessage.className = 'chat-message system-message';
        resultMessage.innerHTML = `
            <div class="recycling-result">
                <img src="${img.src}" style="max-width: 200px; border-radius: 8px; margin: 10px 0;">
                <h4>Classification Result:</h4>
                <p><strong>${result.label}</strong> (${result.confidence}% confidence)</p>
                <h4>Recycling Instructions:</h4>
                <p>${instructions}</p>
            </div>
        `;
        chatMessages.appendChild(resultMessage);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Generate AI response about the classification
        const query = `The image was classified as ${result.label} with ${result.confidence}% confidence. Can you provide more detailed information about how to properly recycle or dispose of this type of item, and its environmental impact?`;
        await sendMessage(query, true);

    } catch (error) {
        console.error('Classification error:', error);
        loadingMessage.innerHTML = 'Sorry, there was an error analyzing the image. Please try again.';
    }
}

// Function to get recycling instructions
function getRecyclingInstructions(label) {
    const instructions = {
        'Recyclable-Paper': 'Clean and dry paper products can be recycled. Remove any plastic windows, staples, or non-paper materials.',
        'Recyclable-Plastic': 'Check the recycling number on the bottom. Rinse containers and remove caps/lids.',
        'Recyclable-Glass': 'Rinse thoroughly. Remove caps and lids. Sort by color if required by your local recycling program.',
        'Recyclable-Metal': 'Rinse cans and containers. Crush if possible to save space.',
        'Non-Recyclable': 'This item should go in regular waste. Consider if there are reusable alternatives.',
        'Compostable': 'Add to your compost bin or green waste collection. Break down larger items for faster composting.'
    };
    return instructions[label] || 'Please check your local recycling guidelines for specific instructions.';
}

// Function to initialize eco features
window.initEcoFeatures = function() {
    if (!window.ecoClassifier) {
        window.ecoClassifier = new EcoClassifier();
    }
    if (!window.carbonCalculator) {
        window.carbonCalculator = new CarbonCalculator();
    }

// Edit this prompt to instruct the AI on how to answer user messages for EcoInfo
window.ECO_AI_PROMPT = window.ECO_AI_PROMPT || `You are an AI assistant for Yola, Adamawa State, Nigeria.
Answer the user's question using the information provided below, and the internet. But only those regarding environment and eco-friendly practices.
If the answer is not present, reply: "Sorry, I do not have that specific information in my local database. Please contact a local environmental authority for further help."
And if a user clearly requests information on health, education, community, navigation, jobs, or agriculture, refer them to either of MediInfo, EduInfo, CommunityInfo, NaviInfo, JobsConnect, or AgroInfo, as the case may be.`;

window.ecoAbortController = window.ecoAbortController || null;

window.renderSection = function() {
  if (!document.getElementById('global-css')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'styles/global.css';
    link.id = 'global-css';
    document.head.appendChild(link);
  }
  // No navbar rendering here; handled globally
  fetch('templates/eco.html').then(r => r.text()).then(html => {
    document.getElementById('main-content').innerHTML = html;
    // Wire model toggle after template is inserted
    const mt = document.getElementById('model-toggle');
    if (mt) mt.onchange = function() { window.toggleGeminiModel('eco', this.checked); };
  }).catch(err => {
    console.error('Failed to load home template:', err);
    document.getElementById('main-content').innerHTML = '<p>Failed to load content.</p>';
  });  
  // Load any in-memory chat history for eco
  setTimeout(() => { window.loadChatHistoryToDOM && window.loadChatHistoryToDOM('eco', 'chat-messages'); }, 50);
};


async function getGeminiAnswer(localData, msg, apiKey, imageData = null) {
  // (Removed duplicate/old getGeminiAnswer function. Only the correct proxy-based version remains.)
  try {
    let contents = { parts: [] };
    if (imageData) {
      contents.parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: imageData.split(',')[1]
        }
      });
    }
    const promptGuide = localStorage.getItem('eco_ai_prompt') || ECO_AI_PROMPT;
    contents.parts.push({
      text: `${promptGuide}\n\n--- LOCAL DATA START ---\n${localData}\n--- LOCAL DATA END ---\n\nUser question: ${msg}`
    });
    const modelVersion = imageData ? 'gemini-pro-vision' : (window.useGemini25 ? 'gemini-2.5-flash' : 'gemini-1.5-flash');
    let body = JSON.stringify({ model: modelVersion, contents: [contents] });
    const url = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? (window.API_BASE || 'http://localhost:4000') + '/api/gemini'
      : '/api/gemini';
    let res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    let data = await res.json();
    if (data.error && window.useGemini25 && !imageData) {
      // fallback to 1.5
      body = JSON.stringify({ model: 'gemini-1.5-flash', contents: [contents] });
      res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      data = await res.json();
    }
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't get a response from the AI.";
  } catch (err) {
    return "Sorry, I could not access local information or the AI at this time. Pls check your internet connection!";
  }
}

  // The following code should be outside the getGeminiAnswer function
  async function handleEcoChatMessage(msg, attach, chat, preview, faqText, input, sendBtn, stopBtn, imageData) {
    const msgGroup = document.createElement('div');
    msgGroup.className = 'chat-message-group';
    msgGroup.innerHTML = `
      <div class='user-msg'>${msg}${attach ? "<br>" + attach : ""}</div>
      <div class='ai-msg'><span class='ai-msg-text'>Eco AI typing...</span></div>
    `;
    chat.appendChild(msgGroup);
    preview.innerHTML = '';
    if (!faqText) input.value = '';
  
    let finalAnswer = "";
    try {
      const localData = await fetch('Data/EcoInfo/ecoinfo.txt').then(r => r.text());
      finalAnswer = await getGeminiAnswer(localData, msg, window.GEMINI_API_KEY, imageData);
    } catch (e) {
      console.error("Error fetching local data or Gemini API call:", e);
      finalAnswer = "Sorry, I could not access local information or the AI at this time. Pls check your internet connection!";
    }
  
    msgGroup.querySelector('.ai-msg-text').innerHTML = formatAIResponse(finalAnswer);
    
    // Add speech button if supported
    if ('speechSynthesis' in window) {
      const speechBtn = document.createElement('button');
      speechBtn.className = 'speech-btn';
      speechBtn.innerHTML = '🔊';
      speechBtn.title = 'Read aloud';
      speechBtn.onclick = () => readAloud(finalAnswer, 'eco');
      msgGroup.querySelector('.ai-msg-text').appendChild(speechBtn);
    }
  
    chat.scrollTop = chat.scrollHeight;
  
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.classList.remove('sending');
      sendBtn.querySelector('.send-text').textContent = 'Send';
    }
    if (stopBtn) stopBtn.style.display = 'none';
    window.ecoAbortController = null;
  }

async function readAloud(text, section) {
  // Cancel previous speech for this section
  if (section === 'eco' && ecoAbortController) {
    ecoAbortController.abort();
  } else if (section === 'edu' && eduAbortController) {
    eduAbortController.abort();
  }
  // Create a new AbortController for this speech
  const abortController = new AbortController();
  const signal = abortController.signal;
  if (section === 'eco') ecoAbortController = abortController;
  else if (section === 'edu') eduAbortController = abortController;

  const utterance = new SpeechSynthesisUtterance(text);
  // Optional: Set language, voice, pitch, rate, volume
  utterance.lang = 'en-US';
  utterance.pitch = 1;
  utterance.rate = 1;
  utterance.volume = 1;

  // Event listeners for speech status
  utterance.onstart = () => {
    console.log('Speech started for ' + section);
  };
  utterance.onend = () => {
    console.log('Speech ended for ' + section);
    if (section === 'eco') ecoAbortController = null;
    else if (section === 'edu') eduAbortController = null;
  };
  utterance.onerror = (event) => {
    if (event.error === 'canceled') {
      console.log('Speech canceled for ' + section);
    } else {
      console.error('Speech synthesis error for ' + section + ':', event.error);
    }
    if (section === 'eco') ecoAbortController = null;
    else if (section === 'edu') eduAbortController = null;
  };

  try {
    await new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => {
        speechSynthesis.cancel();
        reject(new DOMException('Speech aborted', 'AbortError'));
      });
      speechSynthesis.speak(utterance);
      utterance.onend = resolve;
      utterance.onerror = reject;
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Read aloud operation was aborted.');
    } else {
      console.error('Error during read aloud:', error);
    }
  }
}

}