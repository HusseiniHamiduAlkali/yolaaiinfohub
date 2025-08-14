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

// Edit this prompt to instruct the AI on how to answer user messages for AgroInfo
window.AGRO_AI_PROMPT = window.AGRO_AI_PROMPT || `You are an AI assistant for Yola, Adamawa State, Nigeria.
Respond to greetings politely, and enquire on how to help the user with agricultural information in Yola.
Answer the user's question using the information provided below, and the internet. But only those regarding agriculture and farming.
If the answer is not present, reply: "Sorry, I do not have that specific information in my local database. Please contact a local agricultural authority for further help."
And if a user clearly requests information on education, navigation, community, health, jobs, or environment, refer them to either of EduInfo, NaviInfo, CommunityInfo, MediInfo, JobsConnect, or EcoInfo, as the case may be.`;

window.agroAbortController = window.agroAbortController || null;

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
      <h2>AgroInfo - Agriculture Help</h2>
      <p>Ask about farming, crops, livestock, or agricultural services in Yola.</p>
      <div class="chat-container">
        <div class="chat-header">
          <span>AgroInfo AI Chat</span>
          <div class="model-switch">
            <label class="switch">
              <input type="checkbox" id="model-toggle" onchange="window.toggleGeminiModel('agro', this.checked)">
              <span class="slider round"></span>
            </label>
            <span class="model-label">Using Gemini 1.5</span>
          </div>
        </div>
        <div class="chat-messages" id="agro-chat-messages"></div>
        <form class="chat-input-area" onsubmit="event.preventDefault(); window.sendAgroMessage();">
          <div id="agro-chat-preview" class="chat-preview"></div>
          <input type="text" id="agro-chat-input" placeholder="Ask about agriculture..." required />
          <div class="send-button-group">
            <button type="submit" class="send-button">
              <span class="send-text">Send</span>
              <span class="spinner"></span>
            </button>
            <button type="button" class="stop-button" style="display:none" onclick="window.stopAgroResponse()">Stop</button>
          </div>
        </form>
        <div class="input-options">
          <button type="button" onclick="captureImage()" title="Capture Image"><span>📷</span></button>
          <button type="button" onclick="recordAudio()" title="Record Audio"><span>🎤</span></button>
          <label class="file-upload-btn" title="Upload File">
            <span>📁</span>
            <input type="file" style="display:none" onchange="uploadFile(event, 'agro')" />
          </label>
        </div>
        <div class="faq-list">
        <h3>AgroInfo FAQs</h3>
        <ul>
          <li><a class="faq-link" onclick="window.sendAgroMessage('What are the main crops grown in Yola?')">What are the main crops grown in Yola?</a></li>
          <li><a class="faq-link" onclick="window.sendAgroMessage('Where can I buy farm inputs in Yola?')">Where can I buy farm inputs in Yola?</a></li>
          <li><a class="faq-link" onclick="window.sendAgroMessage('How do I access agricultural extension services?')">How do I access agricultural extension services?</a></li>
          <li><a class="faq-link" onclick="window.sendAgroMessage('What are common livestock diseases in Yola?')">What are common livestock diseases in Yola?</a></li>
          <li><a class="faq-link" onclick="window.sendAgroMessage('Information on irrigation methods suitable for Yola')">Information on irrigation methods suitable for Yola</a></li>
          <li><a class="faq-link" onclick="window.sendAgroMessage('What government programs support farmers in Adamawa State?')">What government programs support farmers in Adamawa State?</a></li>
        </ul>
      </div>
      </div>
      
      <div class="section2">
        <h2>Community Agricultural Services</h2>
        
        <div class="section3">
          <h3 class="section3-title">Community Agricultural Organizations in Yola</h3>
          <div class="section4-container">

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/afanassociation.jpg" alt="">
              </div>
              <h3>All Farmers Association of Nigeria (AFAN)</h3>
              <p></p>
              <a href="details/organisations.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/rifanassociation.jpg" alt="Yola Agro Supplies">
              </div>
              <h3>Rice farmers association of Nigeria Adamawa state chapter, Yola.</h3>
              <p></p>
              <a href="details/yola-agro-supplies.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/swofonassociation.png" alt="">
              </div>
              <h3>Small-scale Women Farmers Organisation in Nigeria (SWOFON), Yola.</h3>
              <p>Specialized in organic farming inputs and sustainable agriculture solutions.</p>
              <a href="details/green-harvest-supplies.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/hyfassociation.jpg" alt="">
              </div>
              <h3>Himma Youth Farmers Association of Nigeria (HYFAN), Yola Chapter.</h3>
              <p></p>
              <a href="details/organisations.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/smallholderassociation.png" alt="Yola Agro Supplies">
              </div>
              <h3>Smallholder farmers association of Nigeria Adamawa state chapter, Yola.</h3>
              <p></p>
              <a href="details/yola-agro-supplies.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/peasantfarmers.jpg" alt="">
              </div>
              <h3>Peasant Farmers Association, Yola.</h3>
              <p>Specialized in organic farming inputs and sustainable agriculture solutions.</p>
              <a href="details/green-harvest-supplies.html">Learn more →</a>
            </div>

          </div>
        </div>

        <div class="section3">
          <h3 class="section3-title">Extension Services</h3>
          <div class="section4-container">
          
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/AgroInfo/extension1.jpg" alt="Agric Extension Office">
              </div>
              <h3>Agricultural Extension Office, Adamawa state secreteriate.</h3>
              <p>Government agricultural extension services and farmer support programs.</p>
              <a href="details/agricultural-extension-office.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/.jpg" alt="Farmers Support">
              </div>
              <h3>Farmers Support Center, Adamawa state ministry of agriculture.</h3>
              <p>Training and technical assistance for local farmers.</p>
              <a href="details/farmers-support-center.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/rmrdc.jpg" alt="Research Station">
              </div>
              <h3>Raw Materials Research And Development Council, Yola.</h3>
              <p>Research and development center for improved farming practices.</p>
              <a href="details/agricultural-research-station.html">Learn more →</a>
            </div>

          </div>
        </div>

        <div class="section3">
          <h3 class="section3-title">Agricultural Input Suppliers</h3>
          <div class="section4-container">

          <div class="section4">
            <div class="img-placeholder">
              <img src="Data/Images/yusashagro.jpg" alt="Animal Feed">
            </div>
            <h3>Yusash Agro Chemicals.</h3>
            <p></p>
            <a href="details/quality-feed-mills.html">Learn more →</a>
          </div>
          <div class="section4">
            <div class="img-placeholder">
              <img src="Data/Images/miaagro.jpg" alt="Livestock Market">
            </div>
            <h3>Mia Agro Chemicals, Yola.</h3>
            <p></p>
            <a href="details/central-livestock-market.html">Learn more →</a>
          </div>
           <div class="section4">
            <div class="img-placeholder">
              <img src="Data/Images/comfortagro.png" alt="Livestock Market">
            </div>
            <h3>Comfort Agro Chemicals, Yola.</h3>
            <p></p>
            <a href="details/central-livestock-market.html">Learn more →</a>
          </div>
          
           <div class="section4">
            <div class="img-placeholder">
              <img src="Data/Images/goldenagro.png" alt="Livestock Market">
            </div>
            <h3>Golden Agro Supply, Yola.</h3>
            <p></p>
            <a href="details/central-livestock-market.html">Learn more →</a>
          </div>
        </div>

         <div class="section3">
          <h3 class="section3-title">Agricultural Commercial Activities.</h3>
            <div class="section4-container">
        
              <div class="section4">
                <div class="img-placeholder">
                  <img src="Data/Images/ngurore.jpg" alt="Livestock Market">
                </div>
                <h3>Ngurore Livestock Market, Yola.</h3>
                <p>Major marketplace for livestock trading and related services.</p>
                <a href="details/central-livestock-market.html">Learn more →</a>
              </div>  

              <div class="section4">
                <div class="img-placeholder">
                  <img src="Data/Images/agricfair.jpg" alt="Value Addition">
                </div>
                <h3>Agricultural Inputs Trade Fair, Yola.</h3>
                <p></p>
                <a href="details/agricultural-value-addition-center.html">Learn more →</a>
                </div>

              <div class="section4">
                <div class="img-placeholder">
                  <img src="Data/Images/AgroInfo/processing3.jpg" alt="Value Addition">
                </div>
                <h3>Adamawa State Agricultural Value Addition Center</h3>
                <p></p>
                <a href="details/agricultural-value-addition-center.html">Learn more →</a>
              </div>
              
              <div class="section4">
                <div class="img-placeholder">
                  <img src="Data/Images/wakili.png" alt="Value Addition">
                </div>
                <h3>Wakili (WK) Poultry Farms, Yola</h3>
                <p></p>
                <a href="details/agricultural-value-addition-center.html">Learn more →</a>
              </div>
              <div class="section4">
                <div class="img-placeholder">
                  <img src="Data/Images/chikun.png" alt="Value Addition">
                </div>
                <h3>Chikun Chicks - Chicken</h3>
                <p></p>
                <a href="details/agricultural-value-addition-center.html">Learn more →</a>
              </div>

            </div>
            </div>

        <div class="section3">
          <h3 class="section3-title">Processing Centers and Storage Facilities</h3>
            <div class="section4-container">

              <div class="section4">
                <div class="img-placeholder">
                  <img src="Data/Images/ricogadoprocessing.jpg" alt="Animal Feed">
                </div>
                <h3>Rico Gado Quality Feed Mills</h3>
                <p>Premium animal feed production and supply services.</p>
                <a href="details/quality-feed-mills.html">Learn more →</a>
              </div>

              <div class="section4">
                <div class="img-placeholder">
                  <img src="Data/Images/shamadprocessing.jpg" alt="Grain Processing">
                </div>
                <h3>Shamad Grain Processing Center, Yola.</h3>
                <p>Modern grain processing and storage Facilities.</p>
                <a href="details/grain-processing-center.html">Learn more →</a>
              </div>
              
              <div class="section4">
                <div class="img-placeholder">
                  <img src="Data/Images/coldhubs.png" alt="Cold Storage">
                </div>
                <h3>ColdHubs Stores, Jambutu Groceries Market, Jimeta, Yola.</h3>
                <p>Temperature-controlled storage for agricultural products.</p>
                <a href="details/cold-storage-facility.html">Learn more →</a>
              </div>
              
            </div>

        <div class="section3">
          <h3 class="section3-title">Agricultural Support Initiatives</h3>
          <div class="section4-container">

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/agro2.png" alt="">
              </div>
              <h3>Distribiution Of Farm Inputs To Residents By The Executive Governor</h3>
              <p></p>
              <a href="details/cold-storage-facility.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/agro1.png" alt="">
              </div>
              <h3>'Every Home A Garden' - Movement By The First Lady.</h3>
              <p></p>
              <a href="details/agricultural-value-addition-center.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/climatesmart.png" alt="">
              </div>
              <h3>Climate-smart Seed Production Training</h3>
              <p></p>
              <a href="details/grain-processing-center.html">Learn more →</a>
            </div>

          </div>
        </div>
        
        <div class="section3">
          <h3 class="section3-title">Medical And Clinical Veterinary Services</h3>
          <div class="section4-container">

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/divinepetvet.jpg" alt="">
              </div>
              <h3>Divine Pet Veterinary Clinic, Yola.</h3>
              <p></p>
              <a href="details/cold-storage-facility.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/hooflinevet.jpg" alt="">
              </div>
              <h3>Hoof - Line Veterinary, Yola.</h3>
              <p></p>
              <a href="details/agricultural-value-addition-center.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/crittersvet.png" alt="">
              </div>
              <h3>Critters veterinary Center.</h3>
              <p></p>
              <a href="details/grain-processing-center.html">Learn more →</a>
            </div>

          </div>
        </div>
      </div>
    </section>
  `;
};

window.sendAgroMessage = async function(faqText = '') {
  const input = document.getElementById('agro-chat-input');
  const chat = document.getElementById('agro-chat-messages');
  const preview = document.getElementById('agro-chat-preview');
  const sendBtn = document.querySelector('.send-button');
  const stopBtn = document.querySelector('.stop-button');

  // Extract image data if present in preview
  let imageData = null;
  if (preview) {
    const previewImg = preview.querySelector('img');
    if (previewImg) {
      imageData = previewImg.src;
      msg = (msg || '') + "\nPlease analyze this image and provide relevant agricultural information, identify crops, farming methods, or suggest similar agricultural practices.";
    }
  }
  
  let msg = faqText || input.value.trim();
  let attach = preview.innerHTML;
  if (!msg && !attach) return;

  if (window.agroAbortController) {
    window.agroAbortController.abort();
  }
  window.agroAbortController = new AbortController();

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
    const localData = await fetch('Data/AgroInfo/agroinfo.txt').then(r => r.text());
    finalAnswer = await getGeminiAnswer(localData, msg, window.GEMINI_API_KEY, imageData);
  } catch (e) {
    console.error("Error fetching local data or Gemini API call:", e);
    finalAnswer = "Sorry, I could not access local information or the AI at this time.";
  }

  msgGroup.querySelector('.ai-msg-text').innerHTML = `
    <div class="ai-response">
      ${finalAnswer.replace(/\*{1,3}([^*]+)\*{1,3}/g, '<b>$1</b>').replace(/\n/g, '<br>')}
      <button onclick="window.speakText(this.parentElement.textContent)" class="read-aloud-btn" title="Listen to Response">
        🔊 Listen
      </button>
    </div>
  `;
  chat.scrollTop = chat.scrollHeight;

  if (sendBtn) {
    sendBtn.disabled = false;
    sendBtn.classList.remove('sending');
    sendBtn.querySelector('.send-text').textContent = 'Send';
  }
  if (stopBtn) stopBtn.style.display = 'none';
  window.agroAbortController = null;
};

window.captureImage = function(section = 'agro') {
  const overlay = document.createElement('div');
  overlay.className = 'camera-overlay';
  overlay.innerHTML = `
    <div class="camera-controls">
      <video id="camera-feed" autoplay playsinline></video>
      <button id="capture-btn">Capture Photo</button>
      <button id="close-camera-btn">Close</button>
    </div>
  `;
  document.body.appendChild(overlay);

  const video = document.getElementById('camera-feed');
  const captureBtn = document.getElementById('capture-btn');
  const closeBtn = document.getElementById('close-camera-btn');
  let stream;

  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then(s => {
      stream = s;
      video.srcObject = stream;
    })
    .catch(err => {
      console.error("Error accessing camera: ", err);
      alert("Could not access camera. Please ensure you have given permission.");
      overlay.remove();
    });

  captureBtn.onclick = () => {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');
    document.getElementById('agro-chat-preview').innerHTML = `<img src='${dataUrl}' style='max-width:120px;max-height:80px;border-radius:8px;margin:4px 0;' alt='Captured Image' />`;
    overlay.remove();
    if (stream) stream.getTracks().forEach(t => t.stop());
  };
  closeBtn.onclick = () => {
    overlay.remove();
    if (stream) stream.getTracks().forEach(t => t.stop());
  };
};

window.recordAudio = function(section = 'agro') {
  const overlay = document.createElement('div');
  overlay.className = 'audio-overlay';
  overlay.innerHTML = `
    <div class="audio-controls">
      <p>Recording audio...</p>
      <button id="stop-record-btn">Stop Recording</button>
      <button id="close-audio-btn">Close</button>
    </div>
  `;
  document.body.appendChild(overlay);

  const stopBtn = document.getElementById('stop-record-btn');
  const closeBtn = document.getElementById('close-audio-btn');
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
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        document.getElementById('agro-chat-preview').innerHTML = `<audio src='${audioUrl}' controls style='max-width:120px;vertical-align:middle;margin:4px 0;'></audio>`;
        overlay.remove();
        if (stream) stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorder.start();
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
}

function uploadFile(e, section = 'agro') {
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
    } else {
      html = `<p style='font-size:0.8em;color:#555;'>${file.name}</p>`;
    }
    preview.innerHTML = html;
  };
  reader.readAsDataURL(file);
}

function formatAIResponse(text) {
  let formatted = text
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '<b>$1</b>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^(<br>)+/, '')
    .replace(/(<br>)+$/, '');
  return `<p>${formatted}</p>`;
}

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
    const promptGuide = localStorage.getItem('agro_ai_prompt') || AGRO_AI_PROMPT;
    contents.parts.push({
      text: `${promptGuide}\n\n--- LOCAL DATA START ---\n${localData}\n--- LOCAL DATA END ---\n\nUser question: ${msg}`
    });
    const modelVersion = imageData ? 'gemini-pro-vision' : (window.useGemini25 ? 'gemini-2.5-flash' : 'gemini-1.5-flash');
    let body = JSON.stringify({ model: modelVersion, contents: [contents] });
    let res = await fetch('/api/gemini', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    let data = await res.json();
    if (data.error && window.useGemini25 && !imageData) {
      // fallback to 1.5
      body = JSON.stringify({ model: 'gemini-1.5-flash', contents: [contents] });
      res = await fetch('/api/gemini', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      data = await res.json();
    }
    return (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) ? data.candidates[0].content.parts[0].text : "Sorry, I couldn't get a response from the AI.";
  } catch (err) {
    return "Sorry, there was an error contacting the AI service.";
  }
}
