window.GEMINI_API_KEY = "AIzaSyAZ9TgevsUjCvczgJ31FHSUI1yZ25olZ9U";

// Gemini model preference
window.useGemini25 = window.useGemini25 || false;

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
window.currentSpeech = window.currentSpeech || null;

window.stopSpeaking = window.stopSpeaking || function() {
  if (window.currentSpeech) {
    speechSynthesis.cancel();
    window.currentSpeech = null;
  }
};

window.speakText = window.speakText || function(text) {
  window.stopSpeaking();
  
  // Remove HTML tags and convert breaks to spaces
  const cleanText = text.replace(/<[^>]*>/g, '').replace(/<br>/g, ' ');
  
  const utterance = new SpeechSynthesisUtterance(cleanText);
  
  // Set preferred voice (try to use a clear English voice if available)
  const voices = speechSynthesis.getVoices();
  const preferredVoice = voices.find(voice => 
    voice.name.includes('Google') || voice.name.includes('Microsoft') || 
    voice.name.includes('English')
  );
  if (preferredVoice) utterance.voice = preferredVoice;
  
  // Adjust speech parameters for better clarity
  utterance.rate = 1.0;  // Normal speed
  utterance.pitch = 1.0; // Normal pitch
  utterance.volume = 1.0; // Full volume
  
  window.currentSpeech = utterance;
  
  // Visual feedback while speaking
  const speakButton = document.querySelector('.read-aloud-btn');
  if (speakButton) {
    speakButton.style.backgroundColor = '#e2e8f0';
    speakButton.style.transform = 'scale(1.1)';
  }
  
  utterance.onend = () => {
    window.currentSpeech = null;
    if (speakButton) {
      speakButton.style.backgroundColor = '';
      speakButton.style.transform = '';
    }
  };
  
  speechSynthesis.speak(utterance);
};

// Edit this prompt to instruct the AI on how to answer user messages for ServiInfo
window.SERVI_AI_PROMPT = window.SERVI_AI_PROMPT || `You are an AI assistant for Yola, Adamawa State, Nigeria.
Enquire on how to help the user find professional services in Yola.
Answer the user's question using the information provided below, and the internet. But only those regarding professional services and service providers.
If the answer is not present, reply: "Sorry, I do not have that specific information in my local database. Please contact a local service directory for further help."
And if a user clearly requests information on health, education, community, environment, navigation, or agriculture, refer them to either of MediInfo, EduInfo, CommunityInfo, EcoInfo, NaviInfo, or AgroInfo, as the case may be.`;

window.serviAbortController = window.serviAbortController || null;

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
  document.getElementById('main-content').innerHTML = `
    <section class="info-section">
      <h2>ServiInfo - Find Professionals</h2>
      <p>Ask to connect with electricians, plumbers, teachers, or other professionals in Yola.</p>
      <div class="chat-container">
        <div class="chat-header">
          <span>ServiInfo AI Chat</span>
          <div class="model-switch">
            <label class="switch">
              <input type="checkbox" id="model-toggle" onchange="window.toggleGeminiModel('servi', this.checked)">
              <span class="slider round"></span>
            </label>
            <span class="model-label">Using Gemini 1.5 Flash</span>
          </div>
        </div>
        <div class="chat-messages" id="servi-chat-messages"></div>
        <form class="chat-input-area" onsubmit="event.preventDefault(); window.sendServiMessage();">
          <div id="servi-chat-preview" class="chat-preview"></div>
          <input type="text" id="servi-chat-input" placeholder="Ask for a professional..." required />
          <div class="send-button-group">
            <button type="submit" class="send-button">
              <span class="send-text">Send</span>
              <span class="spinner"></span>
            </button>
            <button type="button" class="stop-button" style="display:none" onclick="window.stopServiResponse()">Stop</button>
          </div>
        </form>
        <div class="input-options">
          <button type="button" onclick="window.captureImage('servi')" title="Capture Image"><span>📷</span></button>
          <button type="button" onclick="window.recordAudio('servi')" title="Record Audio"><span>🎤</span></button>
          <label class="file-upload-btn" title="Upload File">
            <span>📁</span>
            <input type="file" style="display:none" onchange="window.uploadFile(event, 'servi')" />
          </label>
        </div>
        <div class="faq-list">
        <h3>ServiInfo FAQs</h3>
        <ul>
          <li><a class="faq-link" onclick="window.sendServiMessage('How to find a reliable electrician?')">How to find a reliable electrician?</a></li>
          <li><a class="faq-link" onclick="window.sendServiMessage('List of certified plumbers in Yola')">List of certified plumbers in Yola</a></li>
          <li><a class="faq-link" onclick="window.sendServiMessage('Are there private tutors for mathematics?')">Are there private tutors for mathematics?</a></li>
          <li><a class="faq-link" onclick="window.sendServiMessage('Contact information for carpenters')">Contact information for carpenters</a></li>
          <li><a class="faq-link" onclick="window.sendServiMessage('Recommendations for house cleaners')">Recommendations for house cleaners</a></li>
          <li><a class="faq-link" onclick="window.sendServiMessage('Security services available in Yola')">Security services available in Yola</a></li>
        </ul>
      </div>
      </div>

      <div class="section2">
        <h2>Professionals in Yola</h2>
        
        <div class="section3">
          <h3 class="section3-title">Solar And Electricians</h3>
          <div class="section4-container">
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/ServiInfo/electrician1.jpg" alt="Ibrahim Electric Solutions">
              </div>
              <h3>Ibrahim Electric Solutions</h3>
              <p>Expert electrical installations and repairs with 15+ years experience. Available 24/7 for emergencies.</p>
              <a href="details/ibrahim-electric.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/ServiInfo/electrician2.jpg" alt="Yola Solar and Electronics Services">
              </div>
              <h3>Yola Solar and Electronics Services</h3>
              <p>Certified solar and electrical contractors specializing in residential and commercial installations.</p>
              <a href="details/yola-power-services.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/ServiInfo/electrician3.jpg" alt="Modern Electric">
              </div>
              <h3>Modern Electric</h3>
              <p>Professional electrical maintenance and smart home installation services.</p>
              <a href="details/modern-electric.html">Learn more →</a>
            </div>
          </div>
        </div>

        <div class="section3">
          <h3 class="section3-title">Plumbers</h3>
          <div class="section4-container">
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/ServiInfo/plumber1.jpg" alt="Quality Plumbing">
              </div>
              <h3>Quality Plumbing Services</h3>
              <p>Expert plumbing solutions for residential and commercial properties. 24/7 emergency services.</p>
              <a href="details/quality-plumbing.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/ServiInfo/plumber2.jpg" alt="Yola Plumbers">
              </div>
              <h3>Yola Plumbers</h3>
              <p>Professional plumbing repairs and installations with guaranteed satisfaction.</p>
              <a href="details/yola-plumbers.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/ServiInfo/plumber3.jpg" alt="HomeServe Plumbing">
              </div>
              <h3>HomeServe Plumbing</h3>
              <p>Comprehensive plumbing services including maintenance and emergency repairs.</p>
              <a href="details/homeserve-plumbing.html">Learn more →</a>
            </div>
          </div>
        </div>

        <div class="section3">
          <h3 class="section3-title">Carpenters</h3>
          <div class="section4-container">
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/ServiInfo/carpenter1.jpg" alt="Master Woodworks">
              </div>
              <h3>Master Woodworks</h3>
              <p>Custom furniture and carpentry services with attention to detail and quality craftsmanship.</p>
              <a href="details/master-woodworks.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/ServiInfo/carpenter2.jpg" alt="Yola Furniture">
              </div>
              <h3>Yola Furniture</h3>
              <p>Specialized in custom furniture making and wooden interior solutions.</p>
              <a href="details/yola-furniture.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/ServiInfo/carpenter3.jpg" alt="Creative Carpentry">
              </div>
              <h3>Creative Carpentry</h3>
              <p>Modern and traditional carpentry services for homes and offices.</p>
              <a href="details/creative-carpentry.html">Learn more →</a>
            </div>
          </div>
        </div>

        <div class="section3">
          <h3 class="section3-title">Freelance Professionals</h3>
          <div class="section4-container">
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/ServiInfo/freelancer1.jpg" alt="Tech Solutions">
              </div>
              <h3>Tech Solutions Hub</h3>
              <p>IT services, web development, and digital marketing solutions.</p>
              <a href="details/tech-solutions-hub.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/ServiInfo/freelancer2.jpg" alt="Creative Studio">
              </div>
              <h3>Creative Studio</h3>
              <p>Graphic design, content creation, and branding services.</p>
              <a href="details/creative-studio.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/ServiInfo/freelancer3.jpg" alt="Education Experts">
              </div>
              <h3>Education Experts</h3>
            <p>Professional tutoring and educational consultation services.</p>
            <a href="details/education-experts.html">Learn more →</a>
          </div>
        </div>
      </div>
      
        <h2>Concerned Authorities</h2>

        <div class="section3">
          <h3 class="section3-title">Government Agencies/Offices.</h3>
          <div class="section4-container">
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/nde.jpg" alt="National Directorate Of Employment (NDE), Yola Office">
              </div>
              <h3>National Directorate Of Employment (NDE), Yola Office.</h3>
              <p>Government agency responsible for employment generation, skills acquisition, and job creation programs in Yola.</p>
              <a href="details/master-woodworks.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/ServiInfo/carpenter2.jpg" alt="CAC Yola Office">
              </div>
              <h3>Corporate Affairs Commission (CAC), Yola Office</h3>
              <p>Government agency responsible for business registration and corporate regulations in Yola.</p>
              <a href="details/yola-furniture.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/ServiInfo/carpenter3.jpg" alt="NIPOST Yola">
              </div>
              <h3>Nigerian Postal Service (NIPOST), Yola</h3>
              <p>Official postal service provider offering mail and package delivery services in Yola.</p>
              <a href="details/creative-carpentry.html">Learn more →</a>
            </div>
          </div>
        </div>

        <div class="section3">
          <h3 class="section3-title">NGOs And Community Organisations.</h3>
          <div class="section4-container">
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/.jpg" alt="Red Cross Society Yola">
              </div>
              <h3>Red Cross Society Yola Branch</h3>
              <p>International humanitarian organization providing emergency relief, healthcare services, and community support in Yola.</p>
              <a href="details/tech-solutions-hub.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/ServiInfo/freelancer2.jpg" alt="YMCA Yola">
              </div>
              <h3>YMCA Yola Chapter</h3>
              <p>Youth development organization offering educational, recreational, and social programs for young people in Yola.</p>
              <a href="details/creative-studio.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/ServiInfo/freelancer3.jpg" alt="Education Experts">
              </div>
              <h3>Education Experts</h3>
            <p>Professional tutoring and educational consultation services.</p>
            <a href="details/education-experts.html">Learn more →</a>
          </div>
        </div>
      </div>
      
    </section>
  `;
};

window.stopServiResponse = function() {
  if (serviAbortController) {
    serviAbortController.abort();
    serviAbortController = null;
  }
  const sendBtn = document.querySelector('.send-button');
  const stopBtn = document.querySelector('.stop-button');
  if (sendBtn) {
    sendBtn.disabled = false;
    sendBtn.classList.remove('sending');
    sendBtn.querySelector('.send-text').textContent = 'Send';
  }
  if (stopBtn) stopBtn.style.display = 'none';
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
    const modelVersion = imageData ? 'gemini-pro-vision' : (window.useGemini25 ? 'gemini-2.5-flash' : 'gemini-1.5-flash');
    let body = JSON.stringify({ model: modelVersion, contents: [contents] });
    
    const serverUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:4000/api/gemini'
      : 'https://yolaaiinfohub.netlify.app/api/gemini';
      
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
      res = await fetch('/api/gemini', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      data = await res.json();
    }
    return (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) ? data.candidates[0].content.parts[0].text : "Sorry, I couldn't get a response from the AI.";
  } catch (err) {
    return "Sorry, I could not access local information or the AI at this time. Pls check your internet connection!";
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
    sendBtn.disabled = true;
    sendBtn.classList.add('sending');
    sendBtn.querySelector('.send-text').textContent = '';
  }
  if (stopBtn) stopBtn.style.display = 'inline-flex';

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
    finalAnswer = "Sorry, I could not access local information or the AI at this time. Pls check your internet connection!";
  }

  msgGroup.querySelector('.ai-msg-text').innerHTML = formatAIResponse(finalAnswer);
  chat.scrollTop = chat.scrollHeight;

  if (sendBtn) {
    sendBtn.disabled = false;
    sendBtn.classList.remove('sending');
    sendBtn.querySelector('.send-text').textContent = 'Send';
  }
  if (stopBtn) stopBtn.style.display = 'none';
  window.serviAbortController = null;
};

// Common function to format AI responses
function formatAIResponse(text) {
  let formatted = text
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '<b>$1</b>') // Bold
    .replace(/\n/g, '<br>'); // Line breaks
  
  return `
    <div class="ai-response">
      ${formatted}
      <button onclick="window.speakText(this.parentElement.textContent)" class="read-aloud-btn" title="Read Aloud">
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

window.sendServiMessage = async function(faqText = '') {
  const input = document.getElementById('servi-chat-input');
  const chat = document.getElementById('servi-chat-messages');
  const preview = document.getElementById('servi-chat-preview');
  const submitBtn = document.querySelector('#servi-chat-input + button[type="submit"]');

  let msg = faqText || input.value.trim();
  let attach = preview.innerHTML;
  if (!msg && !attach) return;

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending...";
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
    const localData = await fetch('Data/ServiInfo/serviinfo.txt').then(r => r.text()); // Assuming a local data file for ServiInfo
    finalAnswer = await getGeminiAnswer(localData, msg, window.GEMINI_API_KEY);
  } catch (e) {
    console.error("Error fetching local data or Gemini API call:", e);
    finalAnswer = "Sorry, I could not access local information or the AI at this time. Pls check your internet connection!";
  }

  msgGroup.querySelector('.ai-msg-text').innerHTML = formatAIResponse(finalAnswer);
  chat.scrollTop = chat.scrollHeight;

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = "Send";
  }
};
