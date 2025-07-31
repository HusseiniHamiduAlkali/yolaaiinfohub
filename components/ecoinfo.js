// Import required scripts
document.write('<script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.11.0/dist/tf.min.js"></script>');
document.write('<script src="components/ecoClassifier.js"></script>');

window.GEMINI_API_KEY = "AIzaSyAZ9TgevsUjCvczgJ31FHSUI1yZ25olZ9U";

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
};

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

// Edit this prompt to instruct the AI on how to answer user messages for EcoInfo
window.ECO_AI_PROMPT = window.ECO_AI_PROMPT || `You are an AI assistant for Yola, Adamawa State, Nigeria.
Respond to greetings politely, and enquire on how to help the user with environmental information in Yola.
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
  document.getElementById('main-content').innerHTML = `
    <section class="info-section">
      <h2>EcoInfo - Environmental Help</h2>
      
      <p>Ask about recycling, waste, or environmental services in Yola.</p>
      <div class="chat-container">
        <div class="chat-header">
          <span>EcoInfo AI Chat</span>
          <div class="model-switch">
            <label class="switch">
              <input type="checkbox" id="model-toggle" onchange="window.toggleGeminiModel('eco', this.checked)">
              <span class="slider round"></span>
            </label>
            <span class="model-label">Using Gemini 1.5</span>
          </div>
        </div>
        <div class="chat-messages" id="chat-messages"></div>
        <form class="chat-input-area" onsubmit="event.preventDefault(); window.sendEcoMessage();">
          <div id="eco-chat-preview" class="chat-preview"></div>
          <input type="text" id="eco-chat-input" placeholder="Ask about environment..." required />
          <div class="send-button-group">
            <button type="submit" class="send-button">
              <span class="send-text">Send</span>
              <span class="spinner"></span>
            </button>
            <button type="button" class="stop-button" style="display:none" onclick="window.stopEcoResponse()">Stop</button>
          </div>
        </form>
        <div class="input-options">
          <button type="button" onclick="window.captureImage('eco')" title="Capture Image"><span>📷</span></button>
          <button type="button" onclick="window.recordAudio('eco')" title="Record Audio"><span>🎤</span></button>
          <label class="file-upload-btn" title="Upload File">
            <span>📁</span>
            <input type="file" style="display:none" onchange="window.uploadFile(event, 'eco')" />
          </label>
        </div>
        
      <div class="faq-list">
        <h3>EcoInfo FAQs</h3>
        <ul>
          <li><a class="faq-link" onclick="window.sendEcoMessage('How do I recycle waste in Yola?')">How do I recycle waste in Yola?</a></li>
          <li><a class="faq-link" onclick="window.sendEcoMessage('Where are the nearest parks or green spaces?')">Where are the nearest parks or green spaces?</a></li>
          <li><a class="faq-link" onclick="window.sendEcoMessage('How can I report illegal dumping?')">How can I report illegal dumping?</a></li>
          <li><a class="faq-link" onclick="window.sendEcoMessage('What are the environmental organizations in Yola?')">What are the environmental organizations in Yola?</a></li>
          <li><a class="faq-link" onclick="window.sendEcoMessage('How do I start a community garden?')">How do I start a community garden?</a></li>
          <li><a class="faq-link" onclick="window.sendEcoMessage('What are the best practices for waste management?')">What are the best practices for waste management?</a></li>
        </ul>
      </div>
      </div>
      <div class="section2">
        <h2>Environmental Services in Yola</h2>
        
        <div class="section3">
          <h3 class="section3-title">Recycling Centers</h3>
          <div class="section4-container">
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/EcoInfo/recycling1.jpg" alt="Yola Recycling Center">
              </div>
              <h3>Yola Recycling Center</h3>
              <p>Comprehensive recycling facility handling paper, plastic, metal, and electronic waste.</p>
              <a href="details/yola-recycling-center.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/EcoInfo/recycling2.jpg" alt="GreenCycle Solutions">
              </div>
              <h3>GreenCycle Solutions</h3>
              <p>Specialized in plastic recycling and sustainable waste management.</p>
            <a href="details/greencycle-solutions.html">Learn more →</a>
          </div>
          <div class="section4">
            <img src="Data/Images/EcoInfo/recycling3.jpg" alt="EcoWaste Management">
            <h3>EcoWaste Management</h3>
            <p>Industrial and commercial recycling services with eco-friendly practices.</p>
            <a href="details/ecowaste-management.html">Learn more →</a>
          </div>
        </div>

        <div class="section3">
          <h3 class="section3-title">Environmental Organizations</h3>
          <div class="section4-container">
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/EcoInfo/org1.jpg" alt="Green Yola Initiative">
              </div>
              <h3>Green Yola Initiative</h3>
              <p>Non-profit organization focused on environmental education and conservation.</p>
              <a href="details/green-yola-initiative.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/EcoInfo/org2.jpg" alt="Eco Warriors">
              </div>
              <h3>Eco Warriors</h3>
              <p>Community-based organization working on environmental protection and awareness.</p>
              <a href="details/eco-warriors.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/EcoInfo/org3.jpg" alt="Clean Yola Project">
              </div>
              <h3>Clean Yola Project</h3>
              <p>Focused on city cleanliness and sustainable urban development.</p>
              <a href="details/clean-yola-project.html">Learn more →</a>
            </div>
          </div>
        </div>

        <div class="section3">
          <h3 class="section3-title">Green Spaces</h3>
          <div class="section4-container">
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/EcoInfo/park1.jpg" alt="Community Garden">
              </div>
              <h3>Yola Community Garden</h3>
              <p>Public garden space for community farming and environmental education.</p>
              <a href="details/yola-community-garden.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/EcoInfo/park2.jpg" alt="Eco Park">
              </div>
              <h3>Yola Eco Park</h3>
              <p>Sustainable park featuring native plants and environmental exhibits.</p>
              <a href="details/yola-eco-park.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/EcoInfo/park3.jpg" alt="Nature Reserve">
              </div>
              <h3>Benue Valley Reserve</h3>
              <p>Protected natural area with biodiversity conservation programs.</p>
              <a href="details/benue-valley-reserve.html">Learn more →</a>
            </div>
          </div>
        </div>

        <div class="section3">
          <h3 class="section3-title">Sustainable Initiatives</h3>
          <div class="section4-container">
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/EcoInfo/initiative1.jpg" alt="Solar Power">
              </div>
              <h3>Yola Solar Initiative</h3>
              <p>Promoting solar energy adoption and renewable power solutions.</p>
              <a href="details/yola-solar-initiative.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/EcoInfo/initiative2.jpg" alt="Water Conservation">
              </div>
              <h3>Water Conservation Project</h3>
              <p>Programs for water conservation and sustainable water management.</p>
              <a href="details/water-conservation-project.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/EcoInfo/initiative3.jpg" alt="Green Transport">
              </div>
              <h3>Green Transport Network</h3>
              <p>Promoting eco-friendly transportation options in Yola.</p>
              <a href="details/green-transport-network.html">Learn more →</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
};


async function getGeminiAnswer(localData, msg, apiKey, imageData = null) {
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

    // Use the editable prompt from localStorage or fallback
    const promptGuide = localStorage.getItem('eco_ai_prompt') || ECO_AI_PROMPT;
    contents.parts.push({
      text: `${promptGuide}\n\n--- LOCAL DATA START ---\n${localData}\n--- LOCAL DATA END ---\n\nUser question: ${msg}`
    });

    // End of try block for the outer try
  } catch (e) {
    return "Sorry, I could not access local information at this time. Try checking your internet connection.";
  }

  // Choose model based on user preference and image presence
  const modelVersion = imageData ? 'gemini-pro-vision' : 
                      (window.useGemini25 ? 'gemini-2.5-flash' : 'gemini-1.5-flash');
  
  let url = `https://generativelanguage.googleapis.com/v1/models/${modelVersion}:generateContent?key=${apiKey}`;
  let body = JSON.stringify({ contents: [contents] });
  let finalAnswer = "";
  
  try {
    let res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    let data = await res.json();
    // If 2.5 fails, fallback to 1.5
    if (data.error && window.useGemini25 && !imageData) {
      console.log('Falling back to Gemini 1.5');
      url = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=' + apiKey;
      res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      data = await res.json();
    }
    finalAnswer = data.candidates?.[0]?.content?.parts?.[0]?.text ||
                  data.candidates?.[0]?.content?.text || data.candidates?.[0]?.content || data.candidates?.[0]?.text || data.text || "Sorry, I do not have that specific information in my local database. Please contact a local education authority for further help.";
  } catch (e) {
    finalAnswer = "Sorry, I could not access local information at this time. Try checking your internet connection.";
  }
  return finalAnswer;
} // <-- This closes the async function getGeminiAnswer

window.stopEcoResponse = function() {
  if (ecoAbortController) {
    ecoAbortController.abort();
    ecoAbortController = null;
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

window.sendEcoMessage = async function(faqText = '') {
  const input = document.getElementById('eco-chat-input');
  const chat = document.getElementById('chat-messages');
  const preview = document.getElementById('eco-chat-preview');
  const sendBtn = document.querySelector('.send-button');
  const stopBtn = document.querySelector('.stop-button');

  // Extract image data if present in preview
  let imageData = null;
  const previewImg = preview.querySelector('img');
  if (previewImg) {
    imageData = previewImg.src;
    msg = (msg || '') + "\nPlease analyze this image and provide relevant environmental information, identify environmental issues, or suggest eco-friendly practices.";
  }
  
  let msg = faqText || input.value.trim();
  let attach = preview.innerHTML;
  if (!msg && !attach) return;

  if (window.ecoAbortController) {
    window.ecoAbortController.abort();
  }
  window.ecoAbortController = new AbortController();

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
    const localData = await fetch('Data/EcoInfo/ecoinfo.txt').then(r => r.text());
    finalAnswer = await getGeminiAnswer(localData, msg, window.GEMINI_API_KEY, imageData);
  } catch (e) {
    console.error("Error fetching local data or Gemini API call:", e);
    finalAnswer = "Sorry, I could not access local information or the AI at this time.";
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
};

async function getGeminiAnswer(localData, msg, apiKey) {
  const prompt = `
You are an AI assistant for Yola, Adamawa State, Nigeria.
Respond to greetings politely, and enquire on how to help the user with information on Yola environments.
Answer the user's question using the information provided below, and the internet. But only those regarding eco and environments.
If the answer is not present, reply: "Sorry, I do not have that specific information in my local database. Please contact a local environmental authority for further help."
And if a user  clearly requests information on health, education, community, maps/directions, transportation or jobs, refer them to either of MediInfo, EduInfo, NaviInfo, ServiInfo, AgroInfo and CommunityInfo, as the case may be.

--- LOCAL DATA START ---
${localData}
--- LOCAL DATA END ---

User question: ${msg}
  `;
  let url = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=' + apiKey;
  let body = JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] });
  let finalAnswer = "";
  try {
    let res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    let data = await res.json();
    if (data.error && data.error.message && data.error.message.includes('not found')) {
      url = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=' + apiKey;
      res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      data = await res.json();
    }
    finalAnswer = data.candidates?.[0]?.content?.parts?.[0]?.text ||
                  data.candidates?.[0]?.content?.text || data.candidates?.[0]?.content || data.candidates?.[0]?.text || data.text || "Sorry, I do not have that specific information in my local database. Please contact a local education authority for further help.";
  } catch (e) {
    finalAnswer = "Sorry, I could not access local information at this time. Try checking your internet connection.";
  }
  return finalAnswer;
}

function formatAIResponse(text) {
  let formatted = text
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '<b>$1</b>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br>');
  return `<p>${formatted}</p>`;
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

function captureImage(section = 'eco') {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="camera-modal">
      <video id="camera-feed" autoplay style="width:100%;height:auto;border-radius:8px;"></video>
      <canvas id="camera-canvas" style="display:none;"></canvas>
      <div class="camera-controls">
        <button id="capture-btn">Capture</button>
        <button id="close-camera-btn">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const video = document.getElementById('camera-feed');
  const canvas = document.getElementById('camera-canvas');
  const context = canvas.getContext('2d');
  const captureBtn = document.getElementById('capture-btn');
  const closeBtn = document.getElementById('close-camera-btn');
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

  captureBtn.onclick = () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageDataURL = canvas.toDataURL('image/png');
    document.getElementById(section + '-chat-preview').innerHTML = `<img src='${imageDataURL}' style='max-width:120px;max-height:80px;border-radius:8px;margin:4px 0;' alt='Captured Image' />`;
    overlay.remove();
    if (stream) stream.getTracks().forEach(t => t.stop());
  };

  closeBtn.onclick = () => {
    overlay.remove();
    if (stream) stream.getTracks().forEach(t => t.stop());
  };
}

function recordAudio(section = 'eco') {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="audio-modal">
      <p>Recording audio...</p>
      <div class="audio-controls">
        <button id="stop-audio-btn">Stop Recording</button>
        <button id="close-audio-btn">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const stopBtn = document.getElementById('stop-audio-btn');
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
        document.getElementById(section + '-chat-preview').innerHTML = `<audio src='${audioUrl}' controls style='max-width:120px;vertical-align:middle;border-radius:8px;margin:4px 0;'></audio>`;
        audioChunks = [];
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

function uploadFile(e, section = 'medi') {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    const preview = document.getElementById(section+'-chat-preview');
    let html = '';
    if (file.type.startsWith('image/')) {
      html = `<img src='${ev.target.result}' style='max-width:120px;max-height:80px;border-radius:8px;margin:4px 0;' alt='Uploaded Image' />`;
    } else if (file.type.startsWith('audio/')) {
      html = `<audio src='${ev.target.result}' controls style='max-width:120px;vertical-align:middle;border-radius:8px;margin:4px 0;'></audio>`;
    } else {
      html = `<p style='font-size:0.8em;color:#555;'>Uploaded: ${file.name}</p>`;
    }
    preview.innerHTML = html;
  };
  reader.readAsDataURL(file);
}