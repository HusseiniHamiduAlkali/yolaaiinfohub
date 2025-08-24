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

  // Save to chat history
  const history = JSON.parse(localStorage.getItem('eco_chat_history') || '[]');
  if (history.length >= 5) {
    history.shift(); // Remove oldest message if we have 5 already
  }
  history.push({
    user: msg,
    ai: '', // Will be filled in after AI responds
    timestamp: new Date().toISOString()
  });

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
    sendBtn.classList.add('sending');
    sendBtn.textContent = 'Stop';
    sendBtn.style.backgroundColor = '#ff4444';

    // Add click handler to stop response
    const stopHandler = () => {
      if (window.ecoAbortController) {
        window.ecoAbortController.abort();
        window.ecoAbortController = null;
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
    <div class='ai-msg'><span class='ai-msg-text'>Eco AI typing...</span></div>
  `;
  chat.appendChild(msgGroup);
  preview.innerHTML = '';
  if (!faqText) input.value = '';

  let finalAnswer = "";
  try {
    const localData = await fetch('Data/EcoInfo/ecoinfo.txt').then(r => r.text());
    
    // Get chat history context
    const history = JSON.parse(localStorage.getItem('eco_chat_history') || '[]');
    let historyContext = '';
    if (history.length > 0) {
      historyContext = '\n\nRecent chat history:\n' + 
        history.map(h => `User: ${h.user}\nAI: ${h.ai}`).join('\n\n');
    }
    
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
      ? 'http://localhost:4000/api/gemini'
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

    // Update history with AI response
    const updatedHistory = JSON.parse(localStorage.getItem('eco_chat_history') || '[]');
    if (updatedHistory.length > 0) {
      updatedHistory[updatedHistory.length - 1].ai = finalAnswer;
      localStorage.setItem('eco_chat_history', JSON.stringify(updatedHistory));
    }
  } catch (e) {
    console.error("Error fetching local data or Gemini API call:", e);
    finalAnswer = "Sorry, I could not access local information or the AI at this time.";
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
            <span class="model-label">Using Gemini 1.5 Flash</span>
          </div>
        </div>
        <div class="chat-messages" id="chat-messages"></div>
        <form class="chat-input-area" onsubmit="event.preventDefault(); window.sendEcoMessage();">
          <div id="eco-chat-preview" class="chat-preview"></div>
          <input type="text" id="eco-chat-input" placeholder="Ask about environment..." required />
          <div class="send-button-group">
            <button type="submit" class="send-button">
              <span class="send-text">Send</span>

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
          <h3 class="section3-title">Waste collectors And Recycling Centers.</h3>
          <div class="section4-container">

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/domesticcollectors.png" alt="Yola Domestic Waste Collectors - Professional waste collection services for households">
              </div>
              <h3>Yola Domestic Waste Collectors.</h3>
              <p>Licensed waste management service specializing in domestic waste collection and disposal in Yola.</p>
              <a href="details/.html">Learn more →</a>
            </div>

            
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/plasticcollectors.png" alt="Plastic Waste Collectors Yola - Specialized plastic waste collection and recycling services">
              </div>
              <h3>Plastic Waste Collectors, Yola.</h3>
              <p>Specialized service for collecting and recycling plastic waste materials throughout Yola metropolitan area.</p>
              <a href="details/.html">Learn more →</a>
            </div>

          
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/metalcollectors.png" alt="Metal Waste and Scraps Collectors Yola - Professional metal recycling services">
              </div>
              <h3>Metal Waste and Scraps Collectors, Yola.</h3>
              <p>Professional metal waste collection service focusing on scrap metal recycling and responsible disposal in Yola region.</p>
              <a href="details/.html">Learn more →</a>
            </div>
          
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/recyclingcompany.png" alt="Yola Plastics and Polythenes Waste Recycling Company - Specialized plastic recycling">
              </div>
              <h3>Yola Plastics and Polythenes Waste Recycling Company.</h3>
              <p>Leading plastic recycling facility in Yola specializing in processing and recycling all types of plastics and polythene materials.</p>
            <a href="details/greencycle-solutions.html">Learn more →</a>
          </div>

          <div class="section4">
            <div class="img-placeholder">
              <img src="Data/Images/ecowastemanagement.png" alt="EcoWaste Management">
            </div>
            <h3>EcoWaste Management</h3>
            <p>Industrial and commercial recycling services with eco-friendly practices.</p>
            <a href="details/ecowaste-management.html">Learn more →</a>
          </div>

          <div class="section4">
            <div class="img-placeholder">
              <img src="Data/Images/recyclelimited.jpg" alt="EcoWaste Management">
            </div>
            <h3>Adamawa Waste To Wealth Recyclers Limited.</h3>
            <p>Industrial and commercial recycling services with eco-friendly practices.</p>
            <a href="details/ecowaste-management.html">Learn more →</a>
          </div>

        </div>
        </div>

        <div class="section3">
          <h3 class="section3-title">Environmental Organizations</h3>
          
          <div class="section4-container">
            
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/gesollogo.png" alt="Eco Warriors">
              </div>
              <h3>Green Environment Solutons Initiative, Yola.</h3>
              <p>Community-based organization working on environmental protection and awareness.</p>
              <a href="details/eco-warriors.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/nesrea.jpg" alt="Clean Yola Project">
              </div>
              <h3>National Environmental Standards And Regulations Enforcement Agency, Yola.</h3>
              <p>Focused on city cleanliness and sustainable urban development.</p>
              <a href="details/clean-yola-project.html">Learn more →</a>
            </div>
        
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/ecoassociation1.png" alt="Green Yola Initiative">
              </div>
              <h3>Association Of Plastic Recyclers, Yola.</h3>
              <p>Non-profit organization focused on environmental education and conservation.</p>
              <a href="details/green-yola-initiative.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/greeninitiative.png" alt="Green Yola Initiative">
              </div>
              <h3>UNDP 'Go Green' Initiative Yola</h3>
              <p>Non-profit organization focused on environmental education and conservation.</p>
              <a href="details/green-yola-initiative.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/wapan.jpg" alt="Eco Warriors">
              </div>
              <h3>Waste Pickers Association Of Nigeria (WAPAN), Yola.</h3>
              <p>Community-based organization working on environmental protection and awareness.</p>
              <a href="details/eco-warriors.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/naswon.png" alt="Clean Yola Project">
              </div>
              <h3>National Asssociation OF Scraps And Wate Pickers Of Nigeria (NASWON), Yola.</h3>
              <p>Focused on city cleanliness and sustainable urban development.</p>
              <a href="details/clean-yola-project.html">Learn more →</a>
            </div>

          </div>
        </div>

        <div class="section3">
          <h3 class="section3-title">Sustainable Initiatives</h3>
          <div class="section4-container">
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/solar.jpg" alt="Solar Power">
              </div>
              <h3>Yola Solar Initiative</h3>
              <p>Promoting solar energy adoption and renewable power solutions.</p>
              <a href="details/yola-solar-initiative.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/waterconservation.png" alt="Water Conservation">
              </div>
              <h3>Water Conservation Project</h3>
              <p>Programs for water conservation and sustainable water management.</p>
              <a href="details/water-conservation-project.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/gesol4.jpg" alt="Green Transport">
              </div>
              <h3>Yola Tree Planting Project.</h3>
              <p>Promoting eco-friendly activities in Yola.</p>
              <a href="details/green-transport-network.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/communityconservation.png" alt="Community-Led Environmental Conservation Project - Local initiatives for environmental protection">
              </div>
              <h3>Community-Led Environmental Conservation Project, Yola.</h3>
              <p>Grassroots initiative engaging local communities in environmental conservation efforts and sustainable practices.</p>
              <a href="details/yola-solar-initiative.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/wastetowealth.png" alt="Yola Waste To Wealth Initiative - Converting waste into economic opportunities">
              </div>
              <h3>Yola 'Waste To Wealth' Initiative.</h3>
              <p>Innovative program transforming waste materials into valuable resources while creating economic opportunities for local residents.</p>
              <a href="details/water-conservation-project.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/trashtotreasure.png" alt="Trash To Treasure Initiative Yola - Creative upcycling and waste transformation">
              </div>
              <h3>'Trash To Treasure' Initiative, Yola.</h3>
              <p>Creative upcycling program turning waste materials into art and useful products while promoting environmental awareness.</p>
              <a href="details/green-transport-network.html">Learn more →</a>
            </div>

          </div>
          
        <div class="section3">
          <h3 class="section3-title">Green Spaces</h3>
          <div class="section4-container">
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/wetlands2.jpeg" alt="Community Garden">
              </div>
              <h3>Yola Community Garden</h3>
              <p>Public garden space for community farming and environmental education.</p>
              <a href="details/yola-community-garden.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/wetlands6.jpeg" alt="Eco Park">
              </div>
              <h3>Yola Eco Park</h3>
              <p>Sustainable park featuring native plants and environmental exhibits.</p>
              <a href="details/yola-eco-park.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/riverbenuevalley.jpeg" alt="Nature Reserve">s
              </div>
              <h3>Benue Valley Reserve</h3>
              <p>Protected natural area with biodiversity conservation programs.</p>
              <a href="details/benue-valley-reserve.html">Learn more →</a>
            </div>
          </div>
        </div>

        </div>
      </div>
    </section>
  `;
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




function formatAIResponse(text) {
  let formatted = text
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '<b>$1</b>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br>');
  return `<p>${formatted}</p>`;
}

// Helper function to format AI responses
function formatAIResponse(text) {
  let formatted = text
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '<b>$1</b>') // Bold text
    .replace(/\n/g, '<br>'); // Line breaks
  
  return `
    <div class="ai-response">
      ${formatted}
      <button onclick="window.speakText(this.parentElement.textContent)" class="read-aloud-btn" title="Listen to Response">
        🔊
      </button>
      <style>
        .read-aloud-btn {
          background: transparent;
          border: 1px solid #cbd5e0;
          border-radius: 6px;
          padding: 4px 8px;
          margin-top: 8px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.9em;
        }
        .read-aloud-btn:hover {
          background: #e2e8f0;
          transform: translateY(-1px);
        }
      </style>
    </div>
  `;
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
}}