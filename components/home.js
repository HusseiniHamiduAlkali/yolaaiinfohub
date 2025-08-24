

// Gemini model preference
window.useGemini25 = window.useGemini25 || false;

// Home AI prompt for Gemini API


window.HOME_AI_PROMPT = window.HOME_AI_PROMPT || `You are an AI assistant for Yola, Adamawa State, Nigeria.\nRespond to greetings politely, and offer to help the user with any information about Yola, Adamawa State, Nigeria.\nAnswer the user's question using the information provided below, and the internet. If the answer is not present, reply: "Sorry, I do not have that specific information in my local database. Please contact a local authority for further help."\nIf a user clearly requests information on agriculture, education, navigation, community, health, jobs, or environment, refer them to AgroInfo, EduInfo, NaviInfo, CommunityInfo, MediInfo, JobsConnect, or EcoInfo, as the case may be.

Previous conversation history:
{history}
`;

// Chat history management
window.homeChatHistory = [];
window.MAX_HISTORY_LENGTH = 10;

function addToHomeChatHistory(role, content) {
  window.homeChatHistory.push({ role, content });
  if (window.homeChatHistory.length > window.MAX_HISTORY_LENGTH) {
    window.homeChatHistory.shift();
  }
  localStorage.setItem('homeChatHistory', JSON.stringify(window.homeChatHistory));
}

function loadHomeChatHistory() {
  try {
    const savedHistory = localStorage.getItem('homeChatHistory');
    if (savedHistory) {
      window.homeChatHistory = JSON.parse(savedHistory);
      const chat = document.getElementById('home-chat-messages');
      if (chat) {
        chat.innerHTML = window.homeChatHistory.map(msg => `
          <div class='chat-message-group'>
            <div class='${msg.role === 'user' ? 'user-msg' : 'ai-msg'}'>
              ${msg.role === 'user' ? msg.content : formatAIResponse(msg.content)}
            </div>
          </div>
        `).join('');
        chat.scrollTop = chat.scrollHeight;
      }
    }
  } catch (e) {
    console.error('Error loading chat history:', e);
    window.homeChatHistory = [];
  }
}

// Function to toggle between Gemini models
window.toggleGeminiModel = function(section, useGemini25) {
    window.useGemini25 = useGemini25;
    const label = document.querySelector('.model-label');
    if (label) {
        label.textContent = useGemini25 ? 'Using Gemini 2.5 Flash' : 'Using Gemini 1.5 Flash';
    }
    // Store preference
    localStorage.setItem('gemini_model_preference', useGemini25 ? '2.5' : '1.5');
};

// Initialize model preference from storage
if (typeof window.useGemini25 === 'undefined') {
    const storedPreference = localStorage.getItem('gemini_model_preference');
    window.useGemini25 = storedPreference === '2.5';
}

// Global text-to-speech variables and functions
window.currentSpeech = null;

window.stopSpeaking = function() {
  if (window.currentSpeech) {
    speechSynthesis.cancel();
    window.currentSpeech = null;
  }
};

window.speakText = function(text) {
  window.stopSpeaking();
  
  // Remove HTML tags and convert breaks to spaces
  const cleanText = text.replace(/<[^>]*>/g, '').replace(/<br>/g, ' ');
  
  const utterance = new SpeechSynthesisUtterance(cleanText);
  window.currentSpeech = utterance;
  speechSynthesis.speak(utterance);
  
  utterance.onend = () => {
    window.currentSpeech = null;
  };
};

// Robust navbar loader
function ensureNavbarLoaded(cb) {
  if (typeof window.renderNavbar === 'function') {
    window.renderNavbar();
    if (cb) cb();
  } else {
    if (!document.getElementById('navbar-js')) {
      const script = document.createElement('script');
      script.src = 'components/navbar.js';
      script.id = 'navbar-js';
      script.onload = function() {
        if (typeof window.renderNavbar === 'function') window.renderNavbar();
        if (cb) cb();
      };
      document.body.appendChild(script);
    } else {
      let tries = 0;
      (function waitForNavbar() {
        if (typeof window.renderNavbar === 'function') {
          window.renderNavbar();
          if (cb) cb();
        } else if (tries < 30) {
          tries++;
          setTimeout(waitForNavbar, 100);
        }
      })();
    }
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
  document.getElementById('main-content').innerHTML = `
    <section class="info-section">
      <h2>Welcome to Yola Info Hub</h2>
      <p>Ask anything about Yola, Adamawa State, Nigeria.</p>
      <div class="chat-container">
        <div class="chat-header">
          <span>Home AI Chat</span>
          <div class="model-switch">
            <label class="switch">
              <input type="checkbox" id="model-toggle" onchange="window.toggleGeminiModel('home', this.checked)">
              <span class="slider round"></span>
            </label>
            <span class="model-label">Using Gemini 1.5 Flash</span>
          </div>
        </div>
        <div class="chat-messages" id="home-chat-messages"></div>
        <form class="chat-input-area" onsubmit="event.preventDefault(); window.sendHomeMessage();">
          <div id="home-chat-preview" class="chat-preview"></div>
          <input type="text" id="home-chat-input" placeholder="Ask anything..." required />
          <button type="submit" class="send-button">Send</button>
        </form>
        <div class="input-options">
          <button type="button" onclick="window.captureImage('home')" title="Capture Image" ><span>📷</span></button>
          <button type="button" onclick="window.recordAudio('home')" title="Record Audio"><span>🎤</span></button>
          <label class="file-upload-btn" title="Upload File">
            <span>📁</span>
            <input type="file" style="display:none" onchange="window.uploadFile(event, 'home')" />
          </label>
        </div>
        <div class="faq-list">
        <h3>General FAQs</h3>
        <ul>
          <li><a class="faq-link" onclick="window.sendHomeMessage('What is the capital of Adamawa State?')">What is the capital of Adamawa State</a></li>
          <li><a class="faq-link" onclick="window.sendHomeMessage('What is the current time in Yola?')">What is the current time in Yola</a></li>
          <li><a class="faq-link" onclick="window.sendHomeMessage('What are popular places to visit?')">What are popular places to visit</a></li>
          <li><a class="faq-link" onclick="window.sendHomeMessage('How to get around Yola?')">How to get around Yola</a></li>
          <li><a class="faq-link" onclick="window.sendHomeMessage('Current weather in Yola')">Current weather in Yola</a></li>
          <li><a class="faq-link" onclick="window.sendHomeMessage('Emergency services contact information')">Emergency services contact information</a></li>
        </ul>
      </div>
      </div>
      
      <div class="section2" style="">
        <h2 style="margin-bottom: 25px;" >History of Yola</h2>
        <div class="section2-home-image-placeholder" >
          <img class="section2-home-img1" src="Data/Images/palace3.jpg" alt="Yola Palace" >
          <img class="section2-home-img2" src="Data/Images/palace.jpg" alt="Yola Palace" >
        </div>
        <p style="margin-top: 1.5rem; line-height: 1.6; color: #2d3748;">
          Yola, the capital city of Adamawa State, has a rich history dating back to its establishment as the capital of the Fulani state of Adamawa in 1841. 
          Founded by Modibbo Adama, it served as an important center for Islamic learning and trade. The city's strategic location along the Benue River 
          made it a vital commercial hub. Today, Yola continues to be a significant cultural and administrative center, blending its historical heritage 
          with modern development.
        </p>
          <div style="display:flex;">
            <a href="details/Home/yolaadamawa.html" class="section4-home-a">Explore more →</a>
          </div>
        </a>
      </div>

      <div class="section2-home">

        <div class="section4-home-container">
          <div class="section4-home">
            <div class="section4-home-img-container">

              <div class="section4-home-img-placeholder">
                <img src="Data/Images/lamido.png" alt="" >
              </div>

              <div style="display:flex; flex-direction: column;">
                <h4>Explore the mysterious and ground-breaking emirate council and the kingdom of the 12th Lamido Fombina. His royal highness Alh. (Dr.) Muhammad Barkindo Aliyu Musdafa PhD. CFR. The primere ruler of Adamawa and the grand patron of Tabital Pulaaku International.<h4>
                <h4 style="height: auto;">
                  <a  href="details/Home/fombinakingdom.html" >Explore more →</a>
                </h4>
              </div>
              
            </div>
             
          </div>
        </div>

        <div class="section4-home-container">
          <div class="section4-home">

            <div class="section4-home-img-container">

              <div class="section4-home-img-placeholder">
                <img src="Data/Images/fintiri.png" alt="" >
              </div>

              <div style=" display:flex; flex-direction: column;">
                <h4>Meet the cabinet of the Executive governor of Adamawa state, His excellency Rt. Hon. Ahmadu Umaru Fintiri OON. And the state executive council (ADSEC).<h4>
                <h4 style="height: auto;">
                  <a href="details/Home/adamawaexecutivecouncil.html" >Explore more →</a>
                </h4>
              </div>
              
              
            </div>
          </div>
        </div>

      </div>
    </section>
  `;
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

    // Format chat history
    const historyText = window.homeChatHistory.map(msg => 
      `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
    ).join('\n');

    // Use the editable prompt from localStorage or fallback
    const promptGuide = (localStorage.getItem('home_ai_prompt') || HOME_AI_PROMPT)
      .replace('{history}', historyText);

    contents.parts.push({
      text: `${promptGuide}\n\n--- LOCAL DATA START ---\n${localData}\n--- LOCAL DATA END ---\n\nUser question: ${msg}`
    });

    // Choose model based on user preference and image presence
    modelVersion = imageData ? 'gemini-pro-vision' : 
                        (window.useGemini25 ? 'gemini-2.5-flash' : 'gemini-1.5-flash');

    // Use backend proxy instead of direct Gemini API
    const url = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:4000/api/gemini'
      : '/api/gemini';
    const body = JSON.stringify({ model: modelVersion, contents: [contents] });
    let res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    let data = await res.json();
    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      return data.candidates[0].content.parts[0].text;
    }
    throw new Error('Invalid response format');
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

// Common function to format AI responses
function formatAIResponse(text) {
  let formatted = text
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '<b>$1</b>') // Bold
    .replace(/\n/g, '<br>'); // Line breaks
  
  // Add read aloud button
  return `
    <div class="ai-response">
      ${formatted}
      <button onclick="speakText(this.parentElement.textContent)" class="read-aloud-btn" title="Read Aloud">
        🔊
      </button>
    </div>
  `;
}

// Common image capture function
window.captureImage = function(section) {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="camera-modal">
      <video id="camera-feed" autoplay playsinline></video>
      <button id="snap-btn">Capture Photo</button>
      <button id="close-camera">Close</button>
    </div>
  `;
  document.body.appendChild(overlay);

  const video = document.getElementById('camera-feed');
  const snapBtn = document.getElementById('snap-btn');
  const closeBtn = document.getElementById('close-camera');
  let stream;

  navigator.mediaDevices.getUserMedia({ video: true })
    .then(s => {
      stream = s;
      video.srcObject = stream;
    })
    .catch(err => {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please ensure you have a camera and have granted permission.");
      overlay.remove();
    });

  snapBtn.onclick = () => {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageDataURL = canvas.toDataURL('image/png');
    document.getElementById(section + '-chat-preview').innerHTML = `<img src='${imageDataURL}' style='max-width:120px;max-height:80px;border-radius:8px;margin:4px 0;' alt='Captured Image' />`;
    overlay.remove();
    if (stream) stream.getTracks().forEach(t => t.stop());
  };

  closeBtn.onclick = () => {
    overlay.remove();
    if (stream) stream.getTracks().forEach(t => t.stop());
  };
};

// Common audio recording function
window.recordAudio = function(section) {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="audio-modal">
      <p>Recording...</p>
      <button id="stop-recording">Stop Recording</button>
      <button id="close-audio">Close</button>
    </div>
  `;
  document.body.appendChild(overlay);

  const stopBtn = document.getElementById('stop-recording');
  const closeBtn = document.getElementById('close-audio');
  let mediaRecorder;
  let audioChunks = [];
  let stream;

  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(s => {
      stream = s;
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = e => {
        audioChunks.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const audioURL = URL.createObjectURL(audioBlob);
        document.getElementById(section + '-chat-preview').innerHTML = `<audio src='${audioURL}' controls style='max-width:120px;vertical-align:middle;margin:4px 0;'></audio>`;
        overlay.remove();
        if (stream) stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorder.start();
    })
    .catch(err => {
      console.error("Error accessing audio:", err);
      alert("Could not access microphone. Please ensure you have a microphone and have granted permission.");
      overlay.remove();
    });

  stopBtn.onclick = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    if (stream) stream.getTracks().forEach(t => t.stop());
    overlay.remove();
  };
  closeBtn.onclick = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    if (stream) stream.getTracks().forEach(t => t.stop());
    overlay.remove();
  };
};

// Common file upload function
window.uploadFile = function(e, section) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    const preview = document.getElementById(section + '-chat-preview');
    let html = '';
    if (file.type.startsWith('image/')) {
      html = `<img src='${ev.target.result}' style='max-width:120px;max-height:80px;border-radius:8px;margin:4px 0;' alt='Uploaded Image' />`;
    } else if (file.type.startsWith('audio/')) {
      html = `<audio src='${ev.target.result}' controls style='max-width:120px;vertical-align:middle;margin:4px 0;'></audio>`;
    } else if (file.type.startsWith('video/')) {
      html = `<video src='${ev.target.result}' controls style='max-width:120px;max-height:80px;border-radius:8px;margin:4px 0;'></video>`;
    } else if (file.type === 'application/pdf') {
      html = `<iframe src='${ev.target.result}' style='width:120px;height:80px;border-radius:8px;margin:4px 0;'></iframe><p style='font-size:10px;margin:0;'>${file.name}</p>`;
    } else {
      html = `<p style='font-size:12px;margin:4px 0;'>${file.name}</p>`;
    }
    preview.innerHTML = html;
  };
  reader.readAsDataURL(file);
};

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
    const stopHandler = () => {
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
    if (e.name === 'AbortError') {
      finalAnswer = "Request stopped by user.";
    } else {
      console.error("Error fetching local data or Gemini API call:", e);
      finalAnswer = "Sorry, I could not access local information or the AI at this time. Pls check your internet connection!";
    }
  }

  msgGroup.querySelector('.ai-msg-text').innerHTML = formatAIResponse(finalAnswer);
  chat.scrollTop = chat.scrollHeight;

  // Store messages in chat history
  addToHomeChatHistory('user', msg);
  addToHomeChatHistory('assistant', finalAnswer);

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
