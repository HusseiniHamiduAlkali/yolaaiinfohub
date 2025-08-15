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

// Edit this prompt to instruct the AI on how to answer user messages for CommunityInfo
window.COMMUNITY_AI_PROMPT = window.COMMUNITY_AI_PROMPT || `You are an AI assistant for Yola, Adamawa State, Nigeria.
Respond to greetings politely, and enquire on how to help the user with community information in Yola.
Answer the user's question using the information provided below, and the internet. But only those regarding community events, organizations, and services.
If the answer is not present, reply: "Sorry, I do not have that specific information in my local database. Please contact a local community authority for further help."
And if a user clearly requests information on health, education, navigation, environment, jobs, or agriculture, refer them to either of MediInfo, EduInfo, NaviInfo, EcoInfo, JobsConnect, or AgroInfo, as the case may be.`;

window.communityAbortController = window.communityAbortController || null;
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
      <h2>CommunityInfo - Community Help</h2>
      <p>Ask about local events, organizations, or community services in Yola.</p>
      <div class="chat-container">
        <div class="chat-header">
          <span>CommunityInfo AI Chat</span>
          <div class="model-switch">
            <label class="switch">
              <input type="checkbox" id="model-toggle" onchange="window.toggleGeminiModel('community', this.checked)">
              <span class="slider round"></span>
            </label>
            <span class="model-label">Using Gemini 1.5 Flash</span>
          </div>
        </div>
        <div class="chat-messages" id="chat-messages"></div>
        <form class="chat-input-area" onsubmit="event.preventDefault(); window.sendCommunityMessage();">
          <div id="chat-preview" class="chat-preview"></div>
          <input type="text" id="chat-input" placeholder="Ask about community..." required />
          <div class="send-button-group">
            <button type="submit" class="send-button">
              <span class="send-text">Send</span>
              <span class="spinner"></span>
            </button>
            <button type="button" class="stop-button" style="display:none" onclick="window.stopCommunityResponse()">Stop</button>
          </div>
        </form>
        <div class="input-options">
          <button type="button" onclick="captureImage()" title="Capture Image"><span>📷</span></button>
          <button type="button" onclick="recordAudio()" title="Record Audio"><span>🎤</span></button>
          <label class="file-upload-btn" title="Upload File">
            <span>📁</span>
            <input type="file" style="display:none" onchange="uploadFile(event, 'community')" />
          </label>
        </div>
        <div class="faq-list">
        <h3>CommunityInfo FAQs</h3>
        <ul>
          <li><a class="faq-link" onclick="window.sendCommunityMessage('What are the major community events in Yola?')">What are the major community events in Yola?</a></li>
          <li><a class="faq-link" onclick="window.sendCommunityMessage('How do I join a local organization?')">How do I join a local organization?</a></li>
          <li><a class="faq-link" onclick="window.sendCommunityMessage('Where can I find information about volunteering?')">Where can I find information about volunteering?</a></li>
          <li><a class="faq-link" onclick="window.sendCommunityMessage('How do I report a community issue?')">How do I report a community issue?</a></li>
          <li><a class="faq-link" onclick="window.sendCommunityMessage('What are the support groups in Yola?')">What are the support groups in Yola?</a></li>
          <li><a class="faq-link" onclick="window.sendCommunityMessage('How can I organize a community event?')">How can I organize a community event?</a></li>
        </ul>
      </div>
      </div>
      
      
      <div class=section2>

        <div class="section3">
          <h3 class="section3-title">Community Bulletin (Top Stories this week in Yola).</h3>
          <div class="section4-container">
          
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/flood2.jpg" alt="flood Yola.">
              </div>
              <h3>The Ever-devastating Flood Experienced in Yola.</h3>
              <p></p>
              <a href="details/flood.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/lawstudents.jpg" alt=" Yola.">
              </div>
              <h3>Six Nigerian Law School Students Kidnapped En Route To Yola Campus.</h3>
              <p>Six students of the Nigerian Law School have been reportedly abducted by suspected armed bandits
                 while travelling to resume at the school's...</p>
              <a href="details/.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/blackout.jpg" alt="">
              </div>
              <h3>Total blackout hits Yola, Jalingo as TCN begins repair</h3>
              <p>The residents of Yola and Jalingo, the capitals of Adamawa and Taraba States, 
                have been hit by a five-day darkness.</p>
              <a href="details/.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/waterboard2.jpg" alt="waterboard">
              </div>
              <h3>Relief after 15 years as Yola Town water scheme gets facelift</h3>
              <p>Residents of Yola Town in Yola South Local Government Area of Adamawa State have been relieved of an acute shortage of water.</p>
              <a href="details/.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/conference2.png" alt="">
              </div>
              <h3>Gov. Fintiri flags off N18.9b international conference centre in Yola</h3>
              <p>Governor Ahmadu Fintiri, on Thursday, May 29, 2025, performed the groundbreaking ceremony for the construction of an ultramodern International Conference and...</p>
              <a href="details/.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/cng.jpg" alt=" Yola">
              </div>
              <h3>Nigerian govt commissions LCNG fuelling station in Yola, 1st in Northeast</h3>
              <p>The Nigerian government has commissioned an LCNG refuelling and conversion centre in the Adamawa State capital, Yola It is coming as the...</p>
              <a href="details/.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/yedc3.jpg" alt="">
              </div>
              <h3>Meters theft rampant in Adamawa as Yola Electric Company cautions customers</h3>
              <p>The Yola Electricity Distribution Company (YEDC) has issued a stern warning to customers against buying meters from any source other than designated purchasing...</p>
              <a href="details/.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/atikuaun.jpg" alt="">
              </div>
              <h3>Atiku preaches patience, courage at AUN, Yola graduation ceremony</h3>
              <p>Former Vice President Atiku Abubakar has urged young people to embrace patience and courage, which he described as virtues that pay off in life.</p>
              <a href="details/.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/yolamarket.jpg" alt="">
              </div>
              <h3>Adamawa government okays N2.9Bn to rebuild Yola town market</h3>
              <p>The Adamawa State Govt approved N2,937, 217120.45 k for the reconstruction of the Yola town market, destroyed by fire about five months ago.</p>
              <a href="details/.html">Learn more →</a>
            </div>

          </div>
        </div>

        <div class="section3">
          <h3 class="section3-title">Community Organizations</h3>
          <div class="section4-container">

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/redcross3.jpg" alt="Red Cross">
              </div>
              <h3>Nigerian Red Cross Society - Yola Branch</h3>
              <p>Humanitarian organization providing emergency services and community support.</p>
              <a href="details/redcross.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/yolarflogo.jpg" alt="Youth Organization">
              </div>
              <h3>Yola Renewal Foundation</h3>
              <p>Empowering young people through education and skill development.</p>
              <a href="details/youthdev.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/womensupport.png" alt="Women Support">
              </div>
              <h3>Youth And Women Empowerment Foundation (YAWEF),Yola</h3>
              <p>Supporting women through education, business, and social programs.</p>
              <a href="details/womensupport.html">Learn more →</a>
            </div>
            
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/byda.jpg" alt="Women Support">
              </div>
              <h3>Bako Youth Organisation Yola</h3>
              <p>Supporting youth through education, business, and social programs.</p>
              <a href="details/womensupport.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/toungo.jpg" alt="Women Support">
              </div>
              <h3>Universal Youth Development Initiative Yola</h3>
              <p>Supporting youth through education, business, and social programs.</p>
              <a href="details/womensupport.html">Learn more →</a>
            </div>


            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/adamawaunited.jpg" alt="Adamawa United">
              </div>
              <h3>Adamawa United Football Club, Association.</h3>
              <p>Supporting youth through education, business, and social programs.</p>
              <a href="details/womensupport.html">Learn more →</a>
            </div>

          </div>
        </div>


        <div class="section3">
          <h3 class="section3-title">Community Activities and Programs</h3>
          
          <div class="section4-container">
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/undp1.png" alt="UNDP vocational training">
              </div>
              <h3>UNDP Vocational Training Program</h3>
              <p></p>
              <a href="details/programs.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/lgi.png" alt="(LGI) Workshop">
              </div>
              <h3>Lead Generation Initiative (LGI) Workshop</h3>
              <p>LGI Organises leadership training for 500 youth in Yola.</p>
              <a href="details/youthdev.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/auncommunity2.jpg" alt="AUN Class of 2K26">
              </div>
              <h3>AUN Class of 2K26 Community Service</h3>
              <p>The AUN class of 2026 embarked on inaugral community service in Yola local primary schools.</p>
              <a href="details/.html">Learn more →</a>
            </div>

            
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/auntownhall.jpg" alt="AUN townhall meeting">
              </div>
              <h3>AUN Townhall Meeting, Yola</h3>
              <p></p>
              <a href="details/womensupport.html">Learn more →</a>
            </div>

            
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/aungraduation.jpg" alt=" (AUN) graduation">
              </div>
              <h3>American University of Nigeria, (AUN) Graduation Ceremony</h3>
              <p>Supporting youth through education, business, and social programs.</p>
              <a href="details/.html">Learn more →</a>
            </div>

            
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/fintiriwallet.jpg" alt="Fintiri wallet program">
              </div>
              <h3>Fintiri Wallet Program</h3>
              <p>Conditional cash transfer for the less previllaged in the society</p>
              <a href="details/.html">Learn more →</a>
            </div>
            
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/fcea.png" alt="">
              </div>
              <h3>Female child Education Awareness Program</h3>
              <p>Conditional cash transfer for the less previllaged in the society</p>
              <a href="details/.html">Learn more →</a>
            </div>
            
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/govcup.jpg" alt="Governor's Cup Football">
              </div>
              <h3>Governor's Cup Football Competition</h3>
              <p></p>
              <a href="details/.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/cleaningday.png" alt="Community Cleaning Day">
              </div>
              <h3>Community Cleaning Day</h3>
              <p>Monthly community cleaning and beautification program.</p>
              <a href="details/.html">Learn more →</a>
            </div>

          </div>
        </div>

        
        <div class="section3">
        <h3 class="section3-title">Events in Yola</h3>
          
          <div class="section4-container">

          <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/wbfw.png" alt="World Breastfeeding Week">
              </div>
              <h3>World Breastfeeding Week in Yola</h3>
              <p></p>
              <a href="details/.html">Learn more →</a>
            </div>
          
          
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/childday2.png" alt="Childrens' Day">
              </div>
              <h3>Childrens' Day in Yola</h3>
              <p></p>
              <a href="details/.html">Learn more →</a>
            </div>
          
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/aunwomen.jpg" alt="">
              </div>
              <h3>International Women's Day</h3>
              <p></p>
              <a href="details/.html">Learn more →</a>
            </div>
          
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/eduday.jpg" alt="">
              </div>
              <h3>International Day of Education.</h3>
              <p></p>
              <a href="details/.html">Learn more →</a>
            </div>

                      
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/independence.jpg" alt="">
              </div>
              <h3>National Independence Day in Yola.</h3>
              <p></p>
              <a href="details/.html">Learn more →</a>
            </div>
          
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/malariaday.png" alt="">
              </div>
              <h3>World Malaria Day in Yola.</h3>
              <p></p>
              <a href="details/.html">Learn more →</a>
            </div>

        </div>
        </div>

        <div class="section3">
        
        <h3 class="section3-title">Community Centers</h3>

          <div class="section4-container">
          
          <div class="section4">
            <div class="img-placeholder">
              <img src="Data/Images/ribadusquare.jpg" alt="Cultural Center">
            </div>
            <h3>Mahmudu Ribadu Square, Yola</h3>
            <p>Venue for cultural events, exhibitions, and traditional performances.</p>
            <a href="details/ribadu-square.html">Learn more →</a>
          </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/digitalhall.jpg" alt="">
              </div>
              <h3>Digital Multipurpose Hall Yola</h3>
              <p>.</p>
              <a href="details/.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/aunhall.png" alt="Sports Complex">
              </div>
              <h3>AUN Community Hall, Yola</h3>
              <p>.</p>
              <a href="details.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/banquethall.jpg" alt="Sports Complex">
              </div>
              <h3>Banquet Hall, Government House Yola</h3>
              <p>.</p>
              <a href="details.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/crystalpalace.jpg" alt="">
              </div>
              <h3>Crystal Palace Event Center, Yola.</h3>
              <p>.</p>
              <a href="details.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/fcehall.jpg" alt="">
              </div>
              <h3>Federal Collece Of Education (FCE) Yola, Multipurpose hall</h3>
              <p>.</p>
              <a href="details.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/amchall.jpg" alt="">
              </div>
              <h3>Aliyu Musdafa College (AMC) Yola, Multipurpose hall.</h3>
              <p>.</p>
              <a href="details.html">Learn more →</a>
            </div>


            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/fastnet.jpg" alt="">
              </div>
              <h3>Fastnet Movie Theatre, Yola.</h3>
              <p>.</p>
              <a href="details.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/lamidocinema.jpg" alt="">
              </div>
              <h3>Lamido Cinema, Yola.</h3>
              <p>.</p>
              <a href="details.html">Learn more →</a>
            </div>


          </div>
        </div>

        <div class="section3">
          <h3 class="section3-title">Radio and TV stations</h3>
          <div class="section4-container">
          
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/pulaakufm.jpg" alt="Pulaaku FM Radio Yola.">
              </div>
              <h3>Pulaaku FM Radio Yola.</h3>
              <p>A local Radio station offering in local languages.</p>
              <a href="details/pulaaku.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/fombinafmlogo.jpg" alt="Fombina FM Radio Yola.">
              </div>
              <h3>Fombina FM Radio Yola.</h3>
              <p>A local Radio station offering in local languages.</p>
              <a href="details/fombinafm.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/fmgotel.jpg" alt="FM Gotel">
              </div>
              <h3>Gotel FM Yola.</h3>
              <p>A local Radio station offering in local languages.</p>
              <a href="details/gotelfm.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/abcyola.jpg" alt="ABC Yola">
              </div>
              <h3>Adamawa Broadcasting Coperation (ABC), Yola.</h3>
              <p>A state owned radio station </p>
              <a href="details/abcyola.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/nasfm.png" alt="ABC Yola">
              </div>
              <h3>NAS FM Radio Yola.</h3>
              <p>A private radio station broadcasting news, advertisement e.tc.</p>
              <a href="details/nasfm.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/usaku.png" alt="Usaku FM Yola">
              </div>
              <h3>Usaku FM Yola.</h3>
              <p>A private radio station broadcasting news, advertisement e.tc.</p>
              <a href="details/nasfm.html">Learn more →</a>
            </div>
            
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/ntalogo.jpg" alt="ABC Yola">
              </div>
              <h3>National Television Authority NTA Yola.</h3>
              <p>Government owned television station</p>
              <a href="details/nasfm.html">Learn more →</a>
            </div>
            
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/atv.jpg" alt="ATV Yola">
              </div>
              <h3>ATV Yola.</h3>
              <p>Astate government station broadcasting news, advertisement e.tc.</p>
              <a href="details/nasfm.html">Learn more →</a>
            </div>
            
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/tvgotel.jpg" alt="TV Gotel Yola">
              </div>
              <h3>TV Gotel Yola.</h3>
              <p>A private radio station broadcasting news, advertisement e.tc.</p>
              <a href="details/nasfm.html">Learn more →</a>
            </div>

          </div>
        </div>

    </div>

    </section>
  `;
};

window.stopCommunityResponse = function() {
  if (communityAbortController) {
    communityAbortController.abort();
    communityAbortController = null;
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

window.sendCommunityMessage = async function(faqText = '') {
  const input = document.getElementById('chat-input');
  const chat = document.getElementById('chat-messages');
  const preview = document.getElementById('chat-preview');
  const sendBtn = document.querySelector('.send-button');
  const stopBtn = document.querySelector('.stop-button');
  
  let msg = faqText || input.value.trim();
  let attach = preview.innerHTML;
  if (!msg && !attach) return;

  if (communityAbortController) {
    communityAbortController.abort();
  }
  communityAbortController = new AbortController();

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
    const localData = await fetch('Data/CommunityInfo/communityinfo.txt').then(r => r.text());
    finalAnswer = await getGeminiAnswer(COMMUNITY_AI_PROMPT + "\n\n" + localData, msg, window.GEMINI_API_KEY);
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
  communityAbortController = null;
};

window.captureImage = function() {
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
    document.getElementById('community-chat-preview').innerHTML = `<img src='${dataUrl}' style='max-width:120px;max-height:80px;border-radius:8px;margin:4px 0;' alt='Captured Image' />`;
    overlay.remove();
    if (stream) stream.getTracks().forEach(t => t.stop());
  };
  closeBtn.onclick = () => {
    overlay.remove();
    if (stream) stream.getTracks().forEach(t => t.stop());
  };
};

window.recordAudio = function() {
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
        document.getElementById('community-chat-preview').innerHTML = `<audio src='${audioUrl}' controls style='max-width:120px;vertical-align:middle;margin:4px 0;'></audio>`;
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
    const promptGuide = localStorage.getItem('community_ai_prompt') || COMMUNITY_AI_PROMPT;
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
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't get a response from the AI.";
  } catch (err) {
    return "Sorry, there was an error contacting the AI service.";
  }
}

/*
// Edit this prompt to instruct the AI on how to answer user messages
const SECTION_AI_PROMPT = `You are an AI assistant for Yola, Adamawa State, Nigeria.
Respond to greetings politely, and enquire on how to help the user with [SECTION] information in Yola.
Answer the user's question using the information provided below, and the internet. But only those regarding [SECTION TOPIC].
If the answer is not present, reply: "Sorry, I do not have that specific information in my local database. Please contact a local [SECTION] authority for further help."
And if a user clearly requests information about other topics, refer them to the appropriate section (MediInfo, EduInfo, NaviInfo, etc).`;

//let sectionAbortController = null;
*/