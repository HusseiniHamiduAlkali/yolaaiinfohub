

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
Help the user with agricultural information in Yola.
Answer the user's question using the information provided below, and the internet. But only those regarding agriculture and farming.
If the answer is not present, reply: "Sorry, I do not have that specific information in my local database. Please contact a local agricultural authority for further help."
And if a user clearly requests information on education, navigation, community, health, jobs, or environment, refer them to either of EduInfo, NaviInfo, CommunityInfo, MediInfo, JobsConnect, or EcoInfo, as the case may be.`;

window.agroAbortController = window.agroAbortController || null;

window.stopAgroResponse = function() {
  if (window.agroAbortController) {
    window.agroAbortController.abort();
    window.agroAbortController = null;
  }
  const sendBtn = document.querySelector('.send-button');
  const aiMsgText = document.querySelector('.ai-msg-text');
  if (sendBtn) {
    sendBtn.classList.remove('sending');
    sendBtn.textContent = 'Send';
    sendBtn.style.backgroundColor = '';
  }
  if (aiMsgText) {
    aiMsgText.innerHTML = "Response stopped by user.";
  }
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
            <span class="model-label">Using Gemini 1.5 Flash</span>
          </div>
        </div>
        <div class="chat-messages" id="agro-chat-messages"></div>
        <form class="chat-input-area" onsubmit="event.preventDefault(); window.sendAgroMessage();">
          <div id="agro-chat-preview" class="chat-preview"></div>
          <input type="text" id="agro-chat-input" placeholder="Ask about agriculture..." required />
          <div class="send-button-group">
            <button type="submit" class="send-button">Send</button>
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
                <img src="Data/Images/afanassociation.jpg" alt="All Farmers Association of Nigeria (AFAN)">
              </div>
              <h3>All Farmers Association of Nigeria (AFAN)</h3>
              <p>National umbrella organization representing farmers' interests, providing support, and promoting agricultural development in Nigeria.</p>
              <a href="details/Agro/afan.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/rifanassociation.jpg" alt="Rice farmers association of Nigeria Adamawa state chapter, Yola">
              </div>
              <h3>Rice farmers association of Nigeria Adamawa state chapter, Yola.</h3>
              <p>State chapter organization supporting rice farmers through training, resources, and market access initiatives.</p>
              <a href="details/Agro/rifan.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/swofonassociation.png" alt="Small-scale Women Farmers Organisation in Nigeria (SWOFON), Yola">
              </div>
              <h3>Small-scale Women Farmers Organisation in Nigeria (SWOFON), Yola.</h3>
              <p>Organization empowering women farmers through capacity building, access to resources, and advocacy for gender-inclusive agricultural policies.</p>
              <a href="details/Agro/swofon.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/hyfassociation.jpg" alt="Himma Youth Farmers Association of Nigeria (HYFAN), Yola Chapter">
              </div>
              <h3>Himma Youth Farmers Association of Nigeria (HYFAN), Yola Chapter.</h3>
              <p>Youth-focused agricultural organization promoting farming among young people through training, mentorship, and support programs.</p>
              <a href="details/Agro/hyfan.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/smallholderassociation.png" alt="Smallholder farmers association of Nigeria Adamawa state chapter, Yola">
              </div>
              <h3>Smallholder farmers association of Nigeria Adamawa state chapter, Yola.</h3>
              <p>Organization supporting small-scale farmers with resources, training, and market access to improve agricultural productivity and livelihoods.</p>
              <a href="details/Agro/smallholder.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/fison.png" alt="FISON, Yola">
              </div>
              <h3>Fisheries Society Of Nigeria (FISON), Yola.</h3>
              <p>Professional organization supporting the development of fisheries and aquaculture through research, training, and best practices.</p>
              <a href="details/Agro/peasant.html">Learn more →</a>
            </div>

          </div>
        </div>

        <div class="section3">
          <h3 class="section3-title">Extension Services</h3>
          <div class="section4-container">
          
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/iita.png" alt="Agric Extension">
              </div>
              <h3>IITA - The International Institute Of Tropical Agriculture, Training Scheme.</h3>
              <p>IITA says it ahs trained 35,000 farmers on modern farming techniques in seven local governments in Adamawa state.</p>
              <a href="details/Agro/iita.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/acresal.png" alt="Agric Extension">
              </div>
              <h3>ACRESAL  Agro-Climatic Resilience In Semi-Arid Landscapes.</h3>
              <p>State-run facility providing resources to support local farmers in improving agricultural productivity.</p>
              <a href="details/Agro/acresal.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/rmrdc.jpg" alt="Research Station">
              </div>
              <h3>Raw Materials Research And Development Council, Yola.</h3>
              <p>Research and development center for improved farming practices.</p>
              <a href="details/Agro/rmrdc.html">Learn more →</a>
            </div>

          </div>
        </div>

        <div class="section3">
          <h3 class="section3-title">Agricultural Input Suppliers</h3>
          <div class="section4-container">

          <div class="section4">
            <div class="img-placeholder">
              <img src="Data/Images/yusashagro.jpg" alt="Yusash Agro Chemicals">
            </div>
            <h3>Yusash Agro Chemicals.</h3>
            <p>Leading supplier of agricultural chemicals, fertilizers, and farming inputs with expert guidance for optimal usage.</p>
            <a href="details/Agro/yusash-inputs.html">Learn more →</a>
          </div>
          <div class="section4">
            <div class="img-placeholder">
              <img src="Data/Images/miaagro.jpg" alt="Mia Agro Chemicals, Yola">
            </div>
            <h3>Mia Agro Chemicals, Yola.</h3>
            <p>Comprehensive provider of agricultural chemicals, pesticides, and farming supplies serving the Yola farming community.</p>
            <a href="details/Agro/mia-agro-inputs.html">Learn more →</a>
          </div>
           <div class="section4">
            <div class="img-placeholder">
              <img src="Data/Images/comfortagro.png" alt="Comfort Agro Chemicals, Yola">
            </div>
            <h3>Comfort Agro Chemicals, Yola.</h3>
            <p>Reliable supplier of quality agricultural inputs, chemicals, and farming supplies with professional advisory services.</p>
            <a href="details/Agro/comfort-agro-inputs.html">Learn more →</a>
          </div>
          
           <div class="section4">
            <div class="img-placeholder">
              <img src="Data/Images/goldenagro.png" alt="Golden Agro Supply, Yola">
            </div>
            <h3>Golden Agro Supply, Yola.</h3>
            <p>One-stop shop for agricultural supplies, equipment, and farming inputs with technical support services.</p>
            <a href="details/Agro/golden-inputs.html">Learn more →</a>
          </div>
          
           <div class="section4">
            <div class="img-placeholder">
              <img src="Data/Images/nazareth.png" alt="Golden Agro Supply, Yola">
            </div>
            <h3>Nazareth Farmers' Service Center, Yola.</h3>
            <p>Comprehensive agricultural service center providing farming supplies, equipment, and technical support to local farmers.</p>
            <a href="details/Agro/nazareth-inputs.html">Learn more →</a>
          </div>
          
           <div class="section4">
            <div class="img-placeholder">
              <img src="Data/Images/kandimi.png" alt="Golden Agro Supply, Yola">
            </div>
            <h3>Kandimi Agro Input Dealers, Yola.</h3>
            <p>Trusted agricultural input dealer offering quality seeds, fertilizers, and farming supplies with expert guidance.</p>
            <a href="details/Agro/kandimi-inputs.html">Learn more →</a>
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
                <a href="details/Agro/ngurore-market.html">Learn more →</a>
              </div>  

              
              <div class="section4">
                <div class="img-placeholder">
                  <img src="Data/Images/jambutumarket1.png" alt="Chikun Chicks - Chicken">
                </div>
                <h3>Jambutu Vegetables and Fruits Market.</h3>
                <p>Major marketplace for fresh vegetables and fruits, connecting local farmers directly with consumers.</p>
                <a href="details/Agro/jambutu-vegetables-market.html">Learn more →</a>
              </div>
              
              <div class="section4">
                <div class="img-placeholder">
                  <img src="Data/Images/jambutumarket2.png" alt="Chikun Chicks - Chicken">
                </div>
                <h3>Jambutu Smoked Fish Market, Yola.</h3>
                <p>Specialized market known for quality smoked fish products and fresh fish supplies from local fishermen.</p>
                <a href="details/Agro/jambutu-fish-market.html">Learn more →</a>
              </div>
              <div class="section4">
                <div class="img-placeholder">
                  <img src="Data/Images/agricfair.jpg" alt="Agricultural Inputs Trade Fair, Yola">
                </div>
                <h3>Agricultural Inputs Trade Fair, Yola.</h3>
                <p>Annual trade fair showcasing agricultural inputs, machinery, and innovations to connect farmers with suppliers.</p>
                <a href="details/Agro/trade-fair.html">Learn more →</a>
                </div>
                
              <div class="section4">
                <div class="img-placeholder">
                  <img src="Data/Images/sarekosam.png" alt="Chikun Chicks - Chicken">
                </div>
                <h3>Sare Kosam - Home Of Pure & Natural Milk.</h3>
                <p>Local dairy producer specializing in fresh, pure milk products sourced from local dairy farmers.</p>
                <a href="details/Agro/sare-kosam.html">Learn more →</a>
              </div>
              <div class="section4">
                <div class="img-placeholder">
                  <img src="Data/Images/wakili.png" alt="Wakili (WK) Poultry Farms, Yola">
                </div>
                <h3>Wakili (WK) Poultry Farms, Yola</h3>
                <p>Modern poultry farm specializing in chicken breeding, egg production, and poultry products.</p>
                <a href="details/Agro/wakili-farms.html">Learn more →</a>
              </div>
              <div class="section4">
                <div class="img-placeholder">
                  <img src="Data/Images/chikun.png" alt="Chikun Chicks - Chicken">
                </div>
                <h3>Chikun Chicks - Chicken</h3>
                <p>Professional poultry business providing quality chicks, eggs, and chicken products to the Yola market.</p>
                <a href="details/Agro/chikun-chicks.html">Learn more →</a>
              </div>

              <div class="section4">
                <div class="img-placeholder">
                  <img src="Data/Images/lacrest.jpg" alt="Chikun Chicks - Chicken">
                </div>
                <h3>LA'CREST Frozens, Yola.</h3>
                <p>Premium frozen food distributor offering a wide range of quality frozen meat and poultry products.</p>
                <a href="details/Agro/la-crest.html">Learn more →</a>
              </div>
              <div class="section4">
                <div class="img-placeholder">
                  <img src="Data/Images/easylife.png" alt="Chikun Chicks - Chicken">
                </div>
                <h3>Easy Life Frozen Chicken.</h3>
                <p>Supplier of high-quality frozen chicken products with reliable cold chain distribution in Yola.</p>
                <a href="details/Agro/easy-life.html">Learn more →</a>
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
                <a href="details/Agro/ricogado.html">Learn more →</a>
              </div>

              <div class="section4">
                <div class="img-placeholder">
                  <img src="Data/Images/shamadprocessing.jpg" alt="Grain Processing">
                </div>
                <h3>Shamad Grain Processing Center, Yola.</h3>
                <p>Modern grain processing and storage Facilities.</p>
                <a href="details/Agro/shamad.html">Learn more →</a>
              </div>
              
              <div class="section4">
                <div class="img-placeholder">
                  <img src="Data/Images/coldhubs.png" alt="Cold Storage">
                </div>
                <h3>ColdHubs Stores, Jambutu Groceries Market, Jimeta, Yola.</h3>
                <p>Temperature-controlled storage for agricultural products.</p>
                <a href="details/Agro/coldhubs.html">Learn more →</a>
              </div>
              
            </div>

        <div class="section3">
          <h3 class="section3-title">Agricultural Support Initiatives</h3>
          <div class="section4-container">

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/agro2.png" alt="Distribution Of Farm Inputs To Residents By The Executive Governor">
              </div>
              <h3>Distribiution Of Farm Inputs To Residents By The Executive Governor</h3>
              <p>Government initiative providing essential farming inputs, seeds, and agricultural supplies to support local farmers and boost agricultural production.</p>
              <a href="details/Agro/fintiri-inputs-distribution.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/agro1.png" alt="'Every Home A Garden' - Movement By The First Lady">
              </div>
              <h3>'Every Home A Garden' - Movement By The First Lady.</h3>
              <p>Initiative promoting urban agriculture and food security by encouraging household gardening and sustainable farming practices.</p>
              <a href="details/Agro/every-home-garden.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/climatesmart.png" alt="Climate-smart Seed Production Training">
              </div>
              <h3>Climate-smart Seed Production Training</h3>
              <p>Capacity building program teaching farmers climate-resilient seed production techniques and sustainable agricultural practices.</p>
              <a href="details/Agro/climate-smart-seed.html">Learn more →</a>
            </div>

          </div>
        </div>
        
        <div class="section3">
          <h3 class="section3-title">Medical And Clinical Veterinary Services</h3>
          <div class="section4-container">

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/divinepetvet.jpg" alt="Divine Pet Veterinary Clinic, Yola">
              </div>
              <h3>Divine Pet Veterinary Clinic, Yola.</h3>
              <p>Professional veterinary clinic providing comprehensive medical care for pets and small animals in Yola.</p>
              <a href="details/Agro/divine-pet-vet.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/hooflinevet.jpg" alt="Hoof - Line Veterinary, Yola">
              </div>
              <h3>Hoof - Line Veterinary, Yola.</h3>
              <p>Specialized veterinary practice focusing on livestock health, treatment, and preventive care services.</p>
              <a href="details/Agro/hoofline-vet.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/crittersvet.png" alt="Critters veterinary Center">
              </div>
              <h3>Critters veterinary Center.</h3>
              <p>Full-service veterinary center offering medical care, surgery, and health consultations for all types of animals.</p>
              <a href="details/Agro/critters-vet.html">Learn more →</a>
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
    sendBtn.classList.add('sending');
    sendBtn.textContent = 'Stop';
    sendBtn.style.backgroundColor = '#ff4444';

    // Add click handler to stop response
    const stopHandler = () => {
      if (window.agroAbortController) {
        window.agroAbortController.abort();
        window.agroAbortController = null;
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
    <div class='ai-msg'><span class='ai-msg-text'>Agro AI typing...</span></div>
  `;
  chat.appendChild(msgGroup);
  preview.innerHTML = '';
  if (!faqText) input.value = '';

  // Load existing chat history
  let chatHistory = JSON.parse(localStorage.getItem('agro_chat_history') || '[]');

  let finalAnswer = "";
  try {
    const localData = await fetch('Data/AgroInfo/agroinfo.txt').then(r => r.text());
    
    // Include chat history in the context
    const historyContext = chatHistory.length > 0 
        ? "\n\nRecent conversation history:\n" + chatHistory.map(h => `User: ${h.user}\nAI: ${h.ai}`).join('\n\n')
        : "";
    
    try {    
      finalAnswer = await getGeminiAnswer(localData + historyContext, msg, window.GEMINI_API_KEY, imageData);
      
      // Store in chat history (keep last 5 messages)
      chatHistory.push({ user: msg, ai: finalAnswer });
      if (chatHistory.length > 5) chatHistory = chatHistory.slice(-5);
      localStorage.setItem('agro_chat_history', JSON.stringify(chatHistory));
    } catch (e) {
      if (e.name === 'AbortError') {
        finalAnswer = "Response stopped by user.";
      } else {
        console.error("Error in Gemini API call:", e);
        finalAnswer = "Sorry, I could not get a response from the AI at this time. Please try again.";
      }
    }
  } catch (e) {
    console.error("Error fetching local data:", e);
    finalAnswer = "Sorry, I could not access the local information. Please check your connection!";
  }

  msgGroup.querySelector('.ai-msg-text').innerHTML = `
    <div class="ai-response">
      ${finalAnswer.replace(/\*{1,3}([^*]+)\*{1,3}/g, '<b>$1</b>').replace(/\n/g, '<br>')}
      <button onclick="window.speakText(this.parentElement.textContent)" class="read-aloud-btn" title="Listen to Response">
        🔊
      </button>
    </div>
  `;
  chat.scrollTop = chat.scrollHeight;

  if (sendBtn) {
    sendBtn.classList.remove('sending');
    sendBtn.textContent = 'Send';
    sendBtn.style.backgroundColor = '';
  }
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
  const url = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:4000/api/gemini'
    : '/api/gemini';

  let response;
  try {
    response = await fetch(url, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body,
      signal: window.agroAbortController?.signal 
    });
    
    let data = await response.json();
    if (data.error && window.useGemini25 && !imageData) {
      // fallback to 1.5
      body = JSON.stringify({ model: 'gemini-1.5-flash', contents: [contents] });
      response = await fetch(url, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body,
        signal: window.agroAbortController?.signal 
      });
      data = await response.json();
    }
    return (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) ? data.candidates[0].content.parts[0].text : "Sorry, I couldn't get a response from the AI.";
  } catch (err) {
    if (err.name === 'AbortError') {
      throw err; // Re-throw abort errors to be handled by caller
    }
    throw new Error("Failed to get response from AI service");
  }
}
