// eduinfo.js

// API Key and Model Preference
window.GEMINI_API_KEY = "AIzaSyAZ9TgevsUjCvczgJ31FHSUI1yZ25olZ9U";
window.useGemini25 = window.useGemini25 || false;

// Toggle Gemini Model
window.toggleGeminiModel = function(section, useGemini25) {
    window.useGemini25 = useGemini25;
    const label = document.querySelector('.model-label');
    if (label) {
        label.textContent = useGemini25 ? 'Using Gemini 2.5 Flash' : 'Using Gemini 1.5 Flash';
    }
    localStorage.setItem('gemini_model_preference', useGemini25 ? '2.5' : '1.5');
};

// Initialize Model Preference from Storage
if (typeof window.useGemini25 === 'undefined') {
    const storedPreference = localStorage.getItem('gemini_model_preference');
    window.useGemini25 = storedPreference === '2.5';
}

// AI Prompt for EduInfo
window.EDU_AI_PROMPT = `You are an AI assistant for Yola, Adamawa State, Nigeria.
Enquire on how to help the user with medical and health information in Yola.
Answer questions using the available information and focus only on education-related topics.
If specific information is not available, say: "Sorry, I do not have that specific information in my local database. Please contact a local education authority for further help."
For non-education queries about health, navigation, community, environment, jobs, or agriculture, refer users to MediInfo, NaviInfo, CommunityInfo, EcoInfo, JobsConnect, or AgroInfo respectively.`;

// Abort controller for fetch requests
window.eduAbortController = null;

// Initialize EduInfo Section
window.renderSection = function() {
  document.getElementById('main-content').innerHTML = `
    <section class="info-section">
      <h2>EduInfo - Education Help</h2>
      <p>Ask about schools, universities, courses, or educational services in Yola.</p>
      <div id="eduinfo-chat-container" class="chat-container">
        <div class="chat-header">
          <span>EduInfo AI Chat</span>
          <div class="model-switch">
            <span class="model-label">Using Gemini 1.5 Flash</span>
            <label class="switch">
              <input type="checkbox" onchange="window.toggleGeminiModel('edu', this.checked)" 
                     ${window.useGemini25 ? 'checked' : ''}>
              <span class="slider round"></span>
            </label>
          </div>
        </div>
        <div id="eduinfo-chat-messages" class="chat-messages"></div>
        <div id="eduinfo-chat-preview" class="chat-preview"></div>
        <form class="chat-input-area" style="flex-direction:column;"  onsubmit="event.preventDefault(); window.sendEduMessage();">
          <div class="chat-input-area">
            <input type="text" id="edu-chat-input" placeholder="Ask about education..." required />
            <div class="send-button-group">
              <button type="submit" class="send-button">
                <span class="send-text">Send</span>
                <span class="spinner"></span>
              </button>
              <button type="button" class="stop-button" style="display:none" onclick="window.eduAbortController?.abort()">Stop</button>
            </div>
          </div>
          <div class="input-options">
            <button type="button" onclick="window.captureImage('edu')" title="Capture Image"><span>📷</span></button>
            <button type="button" onclick="window.recordAudio('edu')" title="Record Audio"><span>🎤</span></button>
            <label class="file-upload-btn" title="Upload File">
              <span>📁</span>
              <input type="file" style="display:none" onchange="window.uploadFile(event, 'edu')" />
            </label>
          </div>
        </form>
        <div class="faq-list">
        <h3>EduInfo FAQs</h3>
        <ul>
          <li><a class="faq-link" onclick="window.sendEduMessage('What are the top universities in Yola?')">What are the top universities in Yola?</a></li>
          <li><a class="faq-link" onclick="window.sendEduMessage('How to apply for scholarships?')">How to apply for scholarships?</a></li>
          <li><a class="faq-link" onclick="window.sendEduMessage('Are there vocational training centers?')">Are there vocational training centers?</a></li>
          <li><a class="faq-link" onclick="window.sendEduMessage('What primary schools are highly rated?')">What primary schools are highly rated?</a></li>
          <li><a class="faq-link" onclick="window.sendEduMessage('How to get JAMB assistance?')">How to get JAMB assistance?</a></li>
          <li><a class="faq-link" onclick="window.sendEduMessage('Adult education programs in Yola')">Adult education programs in Yola</a></li>
        </ul>
      </div>
      </div>

      <div class="section2">
        <h2>Educational Instituitions within Yola and environs.</h2>
        
        <div class="section3">
          <h3 class="section3-title">Universities</h3>
          <div class="section4-container">
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/adsulogo.jpg" alt="Adamawa State University">
              </div>
              <h3>Adamawa State University (ADSU), Mubi</h3>
              <p>A state-owned university offering various undergraduate and postgraduate programs. Located in Mubi, with modern facilities and diverse academic departments.</p>
              <a href="details/Edu/adsu.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/aunlogo.jpg" alt="American University of Nigeria">
              </div>
              <h3>American University of Nigeria (AUN), Main campus Yola</h3>
              <p>Premier private university providing American-style education. Known for its state-of-the-art facilities and international standards.</p>
              <a href="details/Edu/aun.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/maulogo2.jpg" alt="Modibbo Adama University">
              </div>
              <h3>Modibbo Adama University (MAU), Yola.</h3>
              <p>Federal university offering comprehensive programs in science, technology, and humanities. Features modern research facilities.</p>
              <a href="details/Edu/mau.html">Learn more →</a>
            </div>
          </div>
        </div>


        <div class="section3">
          <h3 class="section3-title">Colleges</h3>
          <div class="section4-container">
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/fcelogo.png" alt="Federal College of Education">
              </div>
              <h3>Federal College of Education</h3>
              <p>Leading institution for teacher training and educational development.</p>
              <a href="details/Edu/fce-yola.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/spylogo.jpg" alt="State Polytechnic">
              </div>
              <h3>State Polytechnic</h3>
              <p>Technical institution offering diploma and certificate programs.</p>
              <a href="details/Edu/spy-yola.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/polylogo.jpg" alt="Federal Polytechnic">
              </div>
              <h3>Federal Polytechnic</h3>
              <p>Technical institution offering diploma and certificate programs.</p>
              <a href="details/Edu/fed-poly-yola.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/conmylogo.jpg" alt="School of Nursing">
              </div>
              <h3>School of Nursing</h3>
              <p>Specialized institution for nursing education and healthcare training.</p>
              <a href="details/Edu/nursing-school-yola.html">Learn more →</a>
            </div>
            
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/clslogo.jpg" alt="College For Legal Studies, Yola">
              </div>
              <h3>College For Legal Studies, Yola.</h3>
              <p>Professional institution dedicated to legal education and training for aspiring legal practitioners in Yola.</p>
              <a href="details/Edu/cls-yola.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/centrallogo.jpeg" alt="Central College OF Health Sciences And Technology, Yola">
              </div>
              <h3>Central College OF Health Sciences And Technology, Yola.</h3>
              <p>Leading institution providing comprehensive education in health sciences, medical technology, and allied health professions in Yola.</p>
              <a href="details/Edu/central-college.html">Learn more →</a>
            </div>
          </div>



        <div class="section3">
          <h3 class="section3-title">Elementary And Secondary Schools</h3>
          <div class="section4-container">
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/elkelogo.jpg" alt="El-kenemy College">
              </div>
              <h3>El-kenemy College of Islamic Theology, Yola</h3>
              <p>Premier islamic secondary school known for academic excellence and character development.</p>
              <a href="details/Edu/el-kenemy-college.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/amclogo.jpg" alt="Aliyu Musdafa College">
              </div>
              <h3>Aliyu Musdafa College, (AMC) Yola</h3>
              <p>Historic institution providing quality education to students across the state.</p>
              <a href="details/Edu/amc-yola.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/caalogo.jpg" alt="Chiroma Ahmad Academy">
              </div>
              <h3>Chiroma Ahmad Academy, Yola</h3>
              <p>Modern secondary school offering international curriculum and quality education.</p>
              <a href="details/Edu/chiroma-ahmad-academy.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/gmmclogo.jpeg" alt="General Murtala Muhammad College (GMMC), Yola">
              </div>
              <h3>General Murtala Muhammad College (GMMC), Yola</h3>
              <p>Historic government secondary school known for academic excellence and comprehensive education in science and arts.</p>
              <a href="details/Edu/gmmc-yola.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/adroit.png" alt=" College">
              </div>
              <h3>Adroit International Academy, Yola.</h3>
              <p>Historic institution providing quality education to students across the state.</p>
              <a href="details/adroit-academy.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/.jpg" alt="Government Technical College, Yola">
              </div>
              <h3>Government Technical College, Yola.</h3>
              <p>Public technical college providing hands-on training in various technical and vocational skills to prepare students for technical careers.</p>
              <a href="details/Edu/gtc-yola.html">Learn more →</a>
            </div>
            
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/albayan.png" alt="Al-Bayaan Bilingual Academy, Yola">
              </div>
              <h3>Al-Bayaan Bilingual Academy, Yola.</h3>
              <p>Modern bilingual educational institution providing quality education in both English and Arabic languages with an integrated curriculum.</p>
              <a href="details/Edu/albayaan-academy.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/baitulateeq.png" alt=" ">
              </div>
              <h3>Baitul-Ateeq College, Yola.</h3>
              <p>Historic institution providing quality education to students across the state.</p>
              <a href="details/Edu/baitul-ateeq.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/governmentday.jpg" alt="Government Day Secondary School, Yola">
              </div>
              <h3>Government Day Secondary School, Yola.</h3>
              <p>Public secondary school providing affordable quality education with a focus on academic excellence and character development.</p>
              <a href="details/Edu/gdss-yola.html">Learn more →</a>
            </div>
            
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/ubeclogo.jpg" alt="UBEC Smart School, Yola">
              </div>
              <h3>UBEC Smart School, Yola</h3>
              <p>Modern educational facility incorporating technology and digital learning tools to provide innovative education in Yola.</p>
              <a href="details/Edu/ubec-smart-school.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/sralogo.png" alt=" ">
              </div>
              <h3>Sulaiman Ribadu Academy, Yola.</h3>
              <p>Historic institution providing quality education to students across the state.</p>
              <a href="details/Edu/sra-yola.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/fggclogo.jpeg" alt="">
              </div>
              <h3>Federal Government Girls' College, Yola.</h3>
              <p>Modern secondary school offering international curriculum and quality education.</p>
              <a href="details/Edu/fggc-yola.html">Learn more →</a>
            </div>
            
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/eynacademy.jpeg" alt="EYN Secondary School, Yola">
              </div>
              <h3>EYN Academy, Yola.</h3>
              <p>Faith-based educational institution providing quality secondary education with emphasis on academic excellence and moral values.</p>
              <a href="details/Edu/eyn-secondary.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/binaniacademy.jpg" alt="BINANI Football Academy, Yola">
              </div>
              <h3>BINANI Football Academy, Yola.</h3>
              <p>Specialized sports academy providing football training and education to develop young talented athletes in Yola.</p>
              <a href="details/Edu/binani-academy.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/alnaab.png" alt="Al-Na'ab Academy, Yola">
              </div>
              <h3>Al-Na'ab Academy, Yola.</h3>
              <p>Private Islamic school offering integrated curriculum combining religious education with modern academic subjects.</p>
              <a href="details/Edu/alnaab-academy.html">Learn more →</a>
            </div>
          </div>
        </div>

        
        <div class="section3">
          <h3 class="section3-title">Libraries And Knowledge Centers</h3>
          <div class="section4-container">
            
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/nln.jpg" alt="Public Library">
              </div>
              <h3>National Library Of Nigeria (NLN), Yola Branch.</h3>
              <p>Public library and educational resource center.</p>
              <a href="details/Edu/library.html">Learn more →</a>
            </div>
            
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/bkc.png" alt="Bindir Knowledge Center (BKC), Yola">
              </div>
              <h3>Bindir Knowledge Center (BKC),Yola.</h3>
              <p>Modern knowledge hub providing access to educational resources, research materials, and digital learning facilities.</p>
              <a href="details/Edu/bkc-yola.html">Learn more →</a>
            </div>
            
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/cosmotech.png" alt="Cosmotech Learning center, Yola">
              </div>
              <h3>Cosmotech Learning center, Yola.</h3>
              <p>Technology-focused learning center offering digital skills training, computer education, and modern learning resources.</p>
              <a href="details/Edu/cosmotech-yola.html">Learn more →</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
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
    const sendBtn = document.querySelector('#eduinfo-chat-container .send-button');
    const stopBtn = document.querySelector('#eduinfo-chat-container .stop-button');

    let msg = faqText || input.value.trim();
    let attach = preview.innerHTML;
    if (!msg && !attach) return;

    if (window.eduAbortController) {
        window.eduAbortController.abort();
    }
    window.eduAbortController = new AbortController();

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
    <div class='ai-msg'><span class='ai-msg-text'>Edu AI typing...</span></div>
  `;
    chat.appendChild(msgGroup);
    const imageData = preview.querySelector('img') ? preview.querySelector('img').src : null;
    preview.innerHTML = '';
    if (!faqText) input.value = '';

    let finalAnswer = "";
    try {
        const localData = await fetch('Data/EduInfo/eduinfo.txt').then(r => r.text());
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
    window.eduAbortController = null;
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
    const promptGuide = localStorage.getItem('edu_ai_prompt') || EDU_AI_PROMPT;
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

// Common media functions
window.stopSpeaking = window.stopSpeaking || function() {
  if (window.currentSpeech) {
    speechSynthesis.cancel();
    window.currentSpeech = null;
  }
};

window.speakText = window.speakText || function(text) {
  window.stopSpeaking();
  const cleanText = text.replace(/<[^>]*>/g, '').replace(/<br>/g, ' ');
  const utterance = new SpeechSynthesisUtterance(cleanText);
  window.currentSpeech = utterance;
  speechSynthesis.speak(utterance);
  utterance.onend = () => {
    window.currentSpeech = null;
  };
};

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
    document.getElementById(section + 'info-chat-preview').innerHTML = `<img src='${imageDataURL}' style='max-width:120px;max-height:80px;border-radius:8px;margin:4px 0;' alt='Captured Image' />`;
    overlay.remove();
    if (stream) stream.getTracks().forEach(t => t.stop());
  };

  closeBtn.onclick = () => {
    overlay.remove();
    if (stream) stream.getTracks().forEach(t => t.stop());
  };
};

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
        document.getElementById(section + 'info-chat-preview').innerHTML = `<audio src='${audioURL}' controls style='max-width:120px;vertical-align:middle;margin:4px 0;'></audio>`;
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

window.uploadFile = function(e, section) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    const preview = document.getElementById(section + 'info-chat-preview');
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
