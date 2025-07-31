window.GEMINI_API_KEY = "AIzaSyAZ9TgevsUjCvczgJ31FHSUI1yZ25olZ9U";

// Gemini model preference
window.useGemini25 = window.useGemini25 || false;

// Function to toggle between Gemini models
window.toggleGeminiModel = function(section, useGemini25) {
    window.useGemini25 = useGemini25;
    const label = document.querySelector('.model-label');
    if (label) {
        label.textContent = useGemini25 ? 'Using Gemini 2.5' : 'Using Gemini 1.5';
    }
    // Store preference
    localStorage.setItem('gemini_model_preference', useGemini25 ? '2.5' : '1.5');
};

// Initialize model preference from storage
if (typeof window.useGemini25 === 'undefined') {
    const storedPreference = localStorage.getItem('gemini_model_preference');
    window.useGemini25 = storedPreference === '2.5';
}

window.EDU_AI_PROMPT = `You are an AI assistant for Yola, Adamawa State, Nigeria.
Respond to greetings politely, and enquire on how to help the user with information on education in Yola.
Answer the user's question using the information provided below, and the internet. But only those regarding education.
If the answer is not present, reply: "Sorry, I do not have that specific information in my local database. Please contact a local education authority for further help."
And if a user clearly requests information on health, navigation, community, environment, jobs, or agriculture, refer them to either of MediInfo, NaviInfo, CommunityInfo, EcoInfo, JobsConnect, or AgroInfo, as the case may be.`;

window.eduAbortController = null;

async function getGeminiAnswer(localData, msg, apiKey, imageData = null) {
  // Removed stray try { that caused syntax error
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

    // Use the editable prompt from localStorage or fallback
    const promptGuide = localStorage.getItem('edu_ai_prompt') || EDU_AI_PROMPT;
    contents.parts.push({
      text: `${promptGuide}\n\n--- LOCAL DATA START ---\n${localData}\n--- LOCAL DATA END ---\n\nUser question: ${msg}`
    });

    // Choose model based on user preference and image presence
    const modelVersion = imageData ? 'gemini-pro-vision' : 
                        (window.useGemini25 ? 'gemini-2.5-flash' : 'gemini-1.5-flash');
    
    let url = `https://generativelanguage.googleapis.com/v1/models/${modelVersion}:generateContent?key=${apiKey}`;
    let body = JSON.stringify({ contents: [contents] });
    
    let res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    let data = await res.json();
    
    // If 2.5 fails, fallback to 1.5
    if (data.error && window.useGemini25 && !imageData) {
      console.log('Falling back to Gemini 1.5');
      url = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=' + apiKey;
      res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      data = await res.json();
    }
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Given the following local information: ${localData}\n\nAnswer the user's question: ${msg}` }] }]
        })
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      }
      throw new Error('Invalid response format');
    } catch (error) {
      console.error(`Error with ${modelVersion}:`, error);
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
  window.currentSpeech = utterance;
  speechSynthesis.speak(utterance);
  
  utterance.onend = () => {
    window.currentSpeech = null;
  };
};

// Edit this prompt to instruct the AI on how to answer user messages for EduInfo
window.EDU_AI_PROMPT = window.EDU_AI_PROMPT || `You are an AI assistant for Yola, Adamawa State, Nigeria.
Respond to greetings politely, and enquire on how to help the user with information on education in Yola.
Answer the user's question using the information provided below, and the internet. But only those regarding education.
If the answer is not present, reply: "Sorry, I do not have that specific information in my local database. Please contact a local education authority for further help."
And if a user clearly requests information on health, navigation, community, environment, jobs, or agriculture, refer them to either of MediInfo, NaviInfo, CommunityInfo, EcoInfo, JobsConnect, or AgroInfo, as the case may be.`;

window.eduAbortController = window.eduAbortController || null;

window.renderSection = function() {
  if (!document.getElementById('global-css')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'styles/global.css';
    link.id = 'global-css';
    document.head.appendChild(link);
  }

  if (!document.getElementById('chat-handler-js')) {
    const script = document.createElement('script');
    script.src = 'components/chatHandler.js';
    script.id = 'chat-handler-js';
    document.body.appendChild(script);
  }

  document.getElementById('main-content').innerHTML = `
    <section class="info-section">
      <h2>EduInfo - Education Help</h2>
      <p>Ask about schools, universities, courses, or educational services in Yola.</p>
      <div class="chat-container">
        <div class="chat-header">EduInfo AI Chat</div>
        <div class="chat-messages" id="edu-chat-messages"></div>
        <form class="chat-input-area" onsubmit="event.preventDefault(); window.sendMessage('edu');">
          <div id="edu-chat-preview" class="chat-preview"></div>
          <input type="text" id="edu-chat-input" placeholder="Ask about education..." required />
          <div class="send-button-group">
            <button type="submit" class="send-button">
              <span class="send-text">Send</span>
              <span class="spinner"></span>
            </button>
            <button type="button" class="stop-button" style="display:none" onclick="window.eduAbortController?.abort()">Stop</button>
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
        <div class="input-options">
          <button type="button" onclick="window.captureImage('edu')" title="Capture Image"><span>📷</span></button>
          <button type="button" onclick="window.recordAudio('edu')" title="Record Audio"><span>🎤</span></button>
          <label class="file-upload-btn" title="Upload File">
            <span>📁</span>
            <input type="file" style="display:none" onchange="window.uploadFile(event, 'edu')" />
          </label>
        </div>
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
        <h2>Schools within Yola and environs.</h2>
        
        <div class="section3">
          <h3 class="section3-title">Universities</h3>
          <div class="section4-container">
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/adsugate.png" alt="Adamawa State University">
              </div>
              <h3>Adamawa State University (ADSU), Mubi</h3>
              <p>A state-owned university offering various undergraduate and postgraduate programs. Located in Mubi, with modern facilities and diverse academic departments.</p>
              <a href="details/adsu.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/aungate.png" alt="American University of Nigeria">
              </div>
              <h3>American University of Nigeria (AUN), Main campus Yola</h3>
              <p>Premier private university providing American-style education. Known for its state-of-the-art facilities and international standards.</p>
              <a href="details/aun.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/maugate.jpg" alt="Modibbo Adama University">
              </div>
              <h3>Modibbo Adama University (MAU), Yola.</h3>
              <p>Federal university offering comprehensive programs in science, technology, and humanities. Features modern research facilities.</p>
              <a href="details/mau.html">Learn more →</a>
            </div>
          </div>
        </div>

        <div class="section3">
          <h3 class="section3-title">Secondary Schools</h3>
          <div class="section4-container">
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/elkelogo.jpg" alt="El-kenemy College">
              </div>
              <h3>El-kenemy College of Islamic Theology, Yola</h3>
              <p>Premier islamic secondary school known for academic excellence and character development.</p>
              <a href="details/el-kenemy-college.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/amclogo.jpg" alt="Aliyu Musdafa College">
              </div>
              <h3>Aliyu Musdafa College, (AMC) Yola</h3>
              <p>Historic institution providing quality education to students across the state.</p>
              <a href="details/amc-yola.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/caalogo.jpg" alt="Chiroma Ahmad Academy">
              </div>
              <h3>Chiroma Ahmad Academy, Yola</h3>
              <p>Modern secondary school offering international curriculum and quality education.</p>
              <a href="details/chiroma-ahmad-academy.html">Learn more →</a>
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
              <a href="details/fce-yola.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/spylogo.jpg" alt="State Polytechnic">
              </div>
              <h3>State Polytechnic</h3>
              <p>Technical institution offering diploma and certificate programs.</p>
              <a href="details/spy-yola.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/polylogo.jpg" alt="Federal Polytechnic">
              </div>
              <h3>Federal Polytechnic</h3>
              <p>Technical institution offering diploma and certificate programs.</p>
              <a href="details/fed-poly-yola.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/conmylogo.jpg" alt="School of Nursing">
              </div>
              <h3>School of Nursing</h3>
              <p>Specialized institution for nursing education and healthcare training.</p>
              <a href="details/nursing-school-yola.html">Learn more →</a>
            </div>
          </div>

          <div class="section4-container">
            
          </div>
        </div>
      </div>
      
    </section>
  `;
};

window.stopEduResponse = function() {
  if (eduAbortController) {
    eduAbortController.abort();
    eduAbortController = null;
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

window.sendEduMessage = async function(faqText = '') {
  const input = document.getElementById('edu-chat-input');
  const chat = document.getElementById('edu-chat-messages');
  const preview = document.getElementById('edu-chat-preview');
  const sendBtn = document.querySelector('.send-button');
  const stopBtn = document.querySelector('.stop-button');
  
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
    <div class='ai-msg'><span class='ai-msg-text'>...</span></div>
  `;
  chat.appendChild(msgGroup);
  preview.innerHTML = '';
  if (!faqText) input.value = '';

  let finalAnswer = "";
  try {
    const localData = await fetch('Data/EduInfo/eduinfo.txt').then(r => r.text());
    finalAnswer = await getGeminiAnswer(EDU_AI_PROMPT + "\n\n" + localData, msg, window.GEMINI_API_KEY);
  } catch (e) {
    console.error("Error fetching local data or Gemini API call:", e);
    finalAnswer = "Sorry, I could not access local information or the AI at this time.";
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
async function getGeminiAnswer(localData, msg, apiKey) {
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=' + apiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${localData}\n\nUser question: ${msg}` }] }]
      })
    });
    const data = await res.json();
    return (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) ?
      data.candidates[0].content.parts[0].text : "No answer from AI.";
  } catch (error) {
    console.error("Gemini API error:", error);
    return "Sorry, I'm having trouble connecting to the AI at the moment.";
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
}}

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

window.sendEduMessage = async function(faqText = '') {
  const input = document.getElementById('edu-chat-input');
  const chat = document.getElementById('edu-chat-messages');
  const preview = document.getElementById('edu-chat-preview');
  const submitBtn = document.querySelector('#edu-chat-input + button[type="submit"]');

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
    <div class='ai-msg'><span class='ai-msg-text'>...</span></div>
  `;
  chat.appendChild(msgGroup);
  preview.innerHTML = '';
  if (!faqText) input.value = '';

  let finalAnswer = "";
  try {
    const localData = await fetch('Data/EduInfo/eduinfo.txt').then(r => r.text()); // Assuming a local data file for EduInfo
    finalAnswer = await getGeminiAnswer(localData, msg, window.GEMINI_API_KEY);
  } catch (e) {
    console.error("Error fetching local data or Gemini API call:", e);
    finalAnswer = "Sorry, I could not access local information or the AI at this time.";
  }

  msgGroup.querySelector('.ai-msg-text').innerHTML = formatAIResponse(finalAnswer);
  chat.scrollTop = chat.scrollHeight;

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = "Send";
  }
};
