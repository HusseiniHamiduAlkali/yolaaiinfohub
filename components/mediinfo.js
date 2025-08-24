

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

// Edit this prompt to instruct the AI on how to answer user messages for MediInfo
window.MEDI_AI_PROMPT = window.MEDI_AI_PROMPT || `You are an AI assistant for Yola, Adamawa State, Nigeria.
Help the user with medical and health information in Yola.
Answer the user's question using the information provided below, and the internet. But only those regarding medical and health matters.
If the answer is not present, reply: "Sorry, I do not have that specific information in my local database. Please contact a local healthcare provider for further help."
And if a user clearly requests information on education, navigation, community, environment, jobs, or agriculture, refer them to either of EduInfo, NaviInfo, CommunityInfo, EcoInfo, JobsConnect, or AgroInfo, as the case may be.`;

window.mediAbortController = window.mediAbortController || null;

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
      <h2>MediInfo - Medical Help</h2>
      <p>Ask about hospitals, clinics, health services, or medical advice in Yola.</p>
      <div class="chat-container">
        <div class="chat-header">
          <span>MediInfo AI Chat</span>
          <div class="model-switch">
            <label class="switch">
              <input type="checkbox" id="model-toggle" onchange="window.toggleGeminiModel('medi', this.checked)">
              <span class="slider round"></span>
            </label>
            <span class="model-label">Using Gemini 1.5 Flash</span>
          </div>
        </div>
        <div class="chat-messages" id="medi-chat-messages"></div>
        <form class="chat-input-area" onsubmit="event.preventDefault(); window.sendMediMessage();">
          <div id="medi-chat-preview" class="chat-preview"></div>
          <input type="text" id="medi-chat-input" placeholder="Ask about medical info..." required />
          <div class="send-button-group">
            <button type="submit" class="send-button">Send</button>
          </div>
        </form>
        <div class="input-options">
          <button type="button" onclick="window.captureImage('medi')" title="Capture Image"><span>📷</span></button>
          <button type="button" onclick="window.recordAudio('medi')" title="Record Audio"><span>🎤</span></button>
          <label class="file-upload-btn" title="Upload File">
            <span>📁</span>
            <input type="file" style="display:none" onchange="window.uploadFile(event, 'medi')" />
          </label>
        </div>
        <div class="faq-list">
        <h3>MediInfo FAQs</h3>
        <ul>
          <li><a class="faq-link" onclick="window.sendMediMessage('Where is the nearest hospital?')">Where is the nearest hospital?</a></li>
          <li><a class="faq-link" onclick="window.sendMediMessage('What are the symptoms of malaria?')">What are the symptoms of malaria?</a></li>
          <li><a class="faq-link" onclick="window.sendMediMessage('How to find a general practitioner?')">How to find a general practitioner?</a></li>
          <li><a class="faq-link" onclick="window.sendMediMessage('Are there free health clinics?')">Are there free health clinics?</a></li>
          <li><a class="faq-link" onclick="window.sendMediMessage('Information on COVID-19 testing')">Information on COVID-19 testing</a></li>
          <li><a class="faq-link" onclick="window.sendMediMessage('Pediatric services in Yola')">Pediatric services in Yola</a></li>
        </ul>
      </div>
      </div>

      <div class="section2">
        <h2>Medical Institutions in Yola</h2>
        
        <div class="section3">
          <h3 class="section3-title">Primary Healthcare Centers</h3>
          <div class="section4-container">
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/valli.jpg" alt="Jimeta PHC">
              </div>
              <h3>Valli clinic jimeta, Yola.</h3>
              <p>Community health center providing essential healthcare services and preventive care.</p>
              <a href="details/Medi/valli-clinic.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/malamre.png" alt="Yola PHC">
              </div>
              <h3>Malamre PHCC, Yola.</h3>
              <p>Modern facility offering primary healthcare services and maternal care.</p>
              <a href="details/Medi/malamre-clinic.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/dispensary.jpg" alt="Modibbo Adama PHC">
              </div>
              <h3>Yola Central Dispensary.</h3>
              <p>Well-equipped center providing comprehensive primary healthcare services.</p>
              <a href="details/Medi/yola-dispensary.html">Learn more →</a>
            </div>
          </div>
        </div>

        <div class="section3">
          <h3 class="section3-title">Secondary Hospitals</h3>
          <div class="section4-container">

              <div class="section4">
                <div class="img-placeholder">
                  <img src="Data/Images/specialistgate.jpg" alt="Specialist Hospital">
                </div>
                <h3>Specialist Hospital Yola</h3>
                <p>Major secondary healthcare facility with specialized departments and services.</p>
                <a href="details/Medi/specialist-hospital.html">Learn more →</a>
              </div>

              <div class="section4">
                <div class="img-placeholder">
                  <img src="Data/Images/germanlogo.png" alt="Adamawa-German Hospital">
                </div>
                <h3>Adamawa-German Hospital, Yola</h3>
                <p>Public hospital providing comprehensive medical care and emergency services.</p>
                <a href="details/Medi/german-hospital.html">Learn more →</a>
              </div>

              <div class="section4">
                <div class="img-placeholder">
                  <img src="Data/Images/meddylogo.jpg" alt="Meddy Specialists">
                </div>
                <h3>Meddy Specialists' Clinic, Yola</h3>
                <p>Private hospital offering quality healthcare services and specialized treatments.</p>
                <a href="details/Medi/meddy-clinic.html">Learn more →</a>
              </div>

              <div class="section4">
                <div class="img-placeholder">
                  <img src="Data/Images/fortland.jpg" alt="Fortland Bone Hospital Yola">
                </div>
                <h3>Fortland Orthopaedic Hospital, Yola.</h3>
                <p>Specialized hospital focused on orthopedic care, bone treatments, and rehabilitation services in Yola.</p>
                <a href="details/Medi/fortland-hospital.html">Learn more →</a>
              </div>

              <div class="section4">
                <div class="img-placeholder">
                  <img src="Data/Images/boshang.png" alt="New Boshang Clinic, Yola">
                </div>
                <h3>New Boshang Clinic, Yola</h3>
                <p>Modern healthcare facility offering comprehensive medical services and specialized treatments in Yola.</p>
                <a href="details/Medi/newboshang-hospital.html">Learn more →</a>
              </div>

              <div class="section4">
                <div class="img-placeholder">
                  <img src="Data/Images/galbose.png" alt="Meddy Specialists">
                </div>
                <h3>Galbose Specialists' Clinic, Yola</h3>
                <p>Private hospital offering quality healthcare services and specialized treatments.</p>
                <a href="details/Medi/galbose-hospital.html">Learn more →</a>
              </div>

            </div>
        </div>

        <div class="section3">
          <h3 class="section3-title">The Tertiary Hospital in Yola.</h3>
          <div class="section4-container">
          <div class="section4-mau-container">
            <div class="section4" style="width: 1160px; height: 450px;">
              <div class="mauth-placeholder" style="display:flex; flex-direction: row; overflow:hidden; gap:1rem; width:100%;">
                <img class="mauthlogo" src="Data/Images/mauthlogo.png" alt="Teaching Hospital" >
                <img class="mauthgate" src="Data/Images/mauthgate.jpg" alt="Teaching Hospital" >
              </div>
            
              <h3>Modibbo Adama Teaching Hospital (MAUTH), Yola.</h3>
              <p>University teaching hospital providing advanced medical care and training.</p>
              <a href="details/Medi/mauth-yola.html">Learn more →</a>
            
            </div>
            </div>
          </div>

        <div class="section3">
          <h3 class="section3-title">Pharmacies</h3>

          <div class="section4-container">
            
          <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/meddypharmacy.jpg" alt="Meddy Pharmacy">
              </div>
              <h3>Meddy Pharmacy</h3>
              <p>24/7 pharmacy with extensive stock of medicines and medical supplies.</p>
              <a href="details/Medi/meddy-pharmacy.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/shekinahpharmacy.jpg" alt="Shekinah Pharmacy">
              </div>
              <h3>Shekinah Pharmacy</h3>
              <p>Modern pharmacy chain offering quality medications and healthcare products.</p>
              <a href="details/Medi/shekinah-pharmacy.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/kingblaise.png" alt="Community Pharmacy">
              </div>
              <h3>Kingblaise Pharmacy, Yola.</h3>
              <p>Local pharmacy providing affordable medications and healthcare advice.</p>
              <a href="details/Medi/kingblaise-pharmacy.html">Learn more →</a>
            </div>
            
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/alfijr.png" alt="Alfijr Pharmacy, Yola">
              </div>
              <h3>Alfijr Pharmacy, Yola.</h3>
              <p>Reliable pharmacy providing a wide range of medications, healthcare products, and pharmaceutical services to the Yola community.</p>
              <a href="details/Medi/alfijr-pharmacy.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/jds.png" alt="JDS Pharmacy, Yola">
              </div>
              <h3>JDS Pharmacy, Yola.</h3>
              <p>Community pharmacy offering quality medications, health supplies, and professional pharmaceutical care services in Yola.</p>
              <a href="details/Medi/jds-pharmacy.html">Learn more →</a>
            </div>
            
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/mufami.jpg" alt="Mufami Pharmacy Store">
              </div>
              <h3>Mufami Pharmacy Store.</h3>
              <p>Local pharmacy store providing essential medications, healthcare products, and personalized customer service to the Yola community.</p>
              <a href="details/Medi/mufami-pharmacy.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/jasar.png" alt="Jasar Pharmacy, Yola">
              </div>
              <h3>Jasar Pharmacy, Yola.</h3>
              <p>Full-service pharmacy offering prescription medications, healthcare products, and expert pharmaceutical advice in Yola.</p>
              <a href="details/Medi/jasar-pharmacy.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/kerion.png" alt="Kerion Pharmacy, Yola">
              </div>
              <h3>Kerion Pharmacy, Yola.</h3>
              <p>Modern pharmacy facility providing comprehensive pharmaceutical services, health products, and professional healthcare advice in Yola.</p>
              <a href="details/Medi/kerion-pharmacy.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/lekki.jpg" alt="Lekki Pharmacy and Pharmaceuticals, Yola">
              </div>
              <h3>Lekki Pharmacy and Pharmaceuticals, Yola.</h3>
              <p>Premium pharmacy and pharmaceutical service provider offering a wide range of medications, health products, and professional healthcare consultations in Yola.</p>
              <a href="details/Medi/lekki-pharmacy.html">Learn more →</a>
            </div>

          </div>
        </div>
      </div>


      <div class="section3">
        <h3 class="section3-title">Community Health Services</h3>
        
        <div class="section4-container">

        <div class="section4">
            <div class="img-placeholder">
              <img src="Data/Images/polio.jpg" alt="Polio Immunization at Community PHCCs">
            </div>
            <h3>Polio Immunization at Community PHCCs.</h3>
            <p>Regular polio immunization programs conducted at Primary Healthcare Centers to protect children and maintain Yola's polio-free status.</p>
            <a href="details/Medi/polio-immunization.html">Learn more →</a>
          </div>

        <div class="section4">
            <div class="img-placeholder">
              <img src="Data/Images/mosquito.jpg" alt="Mosquito nets distribution to resident of Yola">
            </div>
            <h3>Mosquito nets distribution to resident of Yola.</h3>
            <p>Community health initiative providing free insecticide-treated mosquito nets to Yola residents to prevent malaria and other mosquito-borne diseases.</p>
            <a href="details/Medi/nets-distribution.html">Learn more →</a>
          </div>

        <div class="section4">
            <div class="img-placeholder">
              <img src="Data/Images/redcross.png" alt="Redcross society awareness campaign in Yola">
            </div>
            <h3>Redcross society awareness campaign in Yola.</h3>
            <p>Regular health awareness campaigns conducted by the Red Cross Society to educate Yola residents about emergency preparedness, first aid, and public health.</p>
            <a href="details/Medi/redcross-awareness.html">Learn more →</a>
          </div>

        </div>
      </div>
    </div>

      
    </section>
  `;
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
  
  // Extract image data if present in preview
  let imageData = null;
  const previewImg = preview.querySelector('img');
  if (previewImg) {
    imageData = previewImg.src;
    msg = (msg || '') + "\nPlease analyze this image and provide relevant medical information, identify health-related issues, or suggest healthcare practices.";
  }
  
  let msg = faqText || input.value.trim();
  let attach = preview.innerHTML;
  if (!msg && !attach) return;

  if (window.mediAbortController) {
    window.mediAbortController.abort();
  }
  window.mediAbortController = new AbortController();

  if (sendBtn) {
    sendBtn.classList.add('sending');
    sendBtn.textContent = 'Stop';
    sendBtn.style.backgroundColor = '#ff4444';

    // Add click handler to stop response
    const stopHandler = () => {
      if (window.mediAbortController) {
        window.mediAbortController.abort();
        window.mediAbortController = null;
      }
      sendBtn.removeEventListener('click', stopHandler);
      sendBtn.classList.remove('sending');
      sendBtn.textContent = 'Send';
      sendBtn.style.backgroundColor = '';
    };
    sendBtn.addEventListener('click', stopHandler);
  }

  const msgGroup = document.createElement('div');
  msgGroup.className = 'chat-message-group';
  msgGroup.innerHTML = `
    <div class='user-msg'>${msg}${attach ? "<br>" + attach : ""}</div>
    <div class='ai-msg'><span class='ai-msg-text'>Medi AI typing...</span></div>
  `;
  chat.appendChild(msgGroup);
  preview.innerHTML = '';
  if (!faqText) input.value = '';

  // Load existing chat history
  let chatHistory = JSON.parse(localStorage.getItem('medi_chat_history') || '[]');

  let finalAnswer = "";
  try {
    const localData = await fetch('Data/MediInfo/mediinfo.txt').then(r => r.text());
    
    // Include chat history in the context
    const historyContext = chatHistory.length > 0 
        ? "\n\nRecent conversation history:\n" + chatHistory.map(h => `User: ${h.user}\nAI: ${h.ai}`).join('\n\n')
        : "";
        
    finalAnswer = await getGeminiAnswer(localData + historyContext, msg, window.GEMINI_API_KEY, imageData);
    
    // Store in chat history (keep last 5 messages)
    chatHistory.push({ user: msg, ai: finalAnswer });
    if (chatHistory.length > 5) chatHistory = chatHistory.slice(-5);
    localStorage.setItem('medi_chat_history', JSON.stringify(chatHistory));
  } catch (e) {
    if (e.name === 'AbortError') {
        finalAnswer = "Response stopped by user.";
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
    const promptGuide = localStorage.getItem('medi_ai_prompt') || MEDI_AI_PROMPT;
    contents.parts.push({
      text: `${promptGuide}\n\n--- LOCAL DATA START ---\n${localData}\n--- LOCAL DATA END ---\n\nUser question: ${msg}`
    });
    const modelVersion = imageData ? 'gemini-pro-vision' : (window.useGemini25 ? 'gemini-2.5-flash' : 'gemini-1.5-flash');
    let body = JSON.stringify({ model: modelVersion, contents: [contents] });
    const url = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:4000/api/gemini'
      : '/api/gemini';
    let res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    let data = await res.json();
    if (data.error && window.useGemini25 && !imageData) {
      // fallback to 1.5
      body = JSON.stringify({ model: 'gemini-1.5-flash', contents: [contents] });
      res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      data = await res.json();
    }
    return (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) ? data.candidates[0].content.parts[0].text : "Sorry, I couldn't get a response from the AI.";
  } catch (err) {
    return "Sorry, I could not access local information or the AI at this time. Pls check your internet connection!";
  }
}

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


