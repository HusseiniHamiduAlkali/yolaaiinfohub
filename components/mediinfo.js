
// Load common AI utilities first
if (!window.commonAILoaded) {
  const script = document.createElement('script');
  script.src = 'components/commonAI.js';
  script.onload = () => { window.commonAILoaded = true; };
  document.head.appendChild(script);
}

// Edit this prompt to instruct the AI on how to answer user messages for MediInfo
window.MEDI_AI_PROMPT = window.MEDI_AI_PROMPT || `You are an AI health information advisor for Yola, Adamawa State, Nigeria.
Provide health and medical information with appropriate disclaimers about professional medical advice.

### Analysis Capabilities:
- **Image Analysis**: Analyze medical/health-related images with caution
  - Identify common health conditions from symptoms shown
  - Provide educational information about visible health issues
  - Suggest when professional medical consultation is needed
- **Audio Analysis**: Listen to health concerns expressed in voice recordings
  - Transcribe symptoms and health questions
  - Provide general health information and guidance
- **Document Analysis**: Review health records, medical reports, wellness plans
  - Explain medical terminology and test results
  - Provide general health guidance based on documents

### Health Information Areas:
- Common diseases, symptoms, and general treatments
- Preventive health practices and hygiene
- Nutrition and wellness advice
- First aid information
- Mental health resources
- Maternal and child health information
- Common medication information
- Local healthcare facilities in Yola

### CRITICAL Response Guidelines:
- ⚠️ DISCLAIMER: "This is general health information only and not a substitute for professional medical diagnosis or treatment."
- For images: Provide general educational information and strongly recommend professional consultation
- For audio: Identify concerns and recommend appropriate healthcare providers
- Always recommend consulting qualified medical professionals for diagnosis
- Include local hospitals and clinics in Yola
- For emergencies, direct to nearest hospital

### Section Referrals:
- Education → EduInfo | Nutrition/Agriculture → AgroInfo | Navigation → NaviInfo | Community → CommunityInfo | Jobs → JobsConnect`;

window.mediAbortController = window.mediAbortController || null;

// Robust navbar loader
window.renderSection = function() {
  if (typeof window.ensureNavbarLoaded === 'function') {
    window.ensureNavbarLoaded();
  }
  if (!document.getElementById('global-css')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'styles/global.css';
    link.id = 'global-css';
    document.head.appendChild(link);
  }
  
  return fetch('templates/medi.html').then(r => r.text()).then(html => {
      return html;
    }).then(html => {
      document.getElementById('main-content').innerHTML = html;
      
      // Load chat history AFTER template is inserted
      setTimeout(() => {
        window.initAndRestoreSectionHistory && window.initAndRestoreSectionHistory('medi', 'medi-chat-messages');
        // Ensure auto-scroll observer is attached for this section
        window.observeChatContainers && window.observeChatContainers();
      }, 50);
      
      // Wire model toggle after template is inserted
      const mt = document.getElementById('model-toggle');
      if (mt) mt.onchange = function() { window.toggleGeminiModel('medi', this.checked); };

      // Add Enter key handler to chat input - ensures attachments and text are sent together
      const mediInput = document.getElementById('medi-chat-input');
      if (mediInput) {
        mediInput.addEventListener('keydown', function(e) {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            window.sendMediMessage();
          }
        });
      }
    }).catch(err => {
      console.error('Failed to load medi template:', err);
      document.getElementById('main-content').innerHTML = '<p>Failed to load content.</p>';
  });  
};

// stopMediResponse is now handled by setupStopButton in commonAI.js

window.sendMediMessage = async function(faqText = '') {
  const input = document.getElementById('medi-chat-input');
  const chat = document.getElementById('medi-chat-messages');
  const preview = document.getElementById('medi-chat-preview');
  const sendBtn = document.querySelector('#medi-chat-input + .send-button-group .send-button');
  const stopBtn = document.querySelector('#medi-chat-input + .send-button-group .stop-button');

  // Ensure input element exists
  if (!input) {
    console.warn('Medi input element not found; aborting sendMediMessage');
    return;
  }

  // Always extract attachment from preview before clearing
  let msg = faqText || input.value.trim();
  let attach = '';
  const container = preview.querySelector('.preview-container');
  if (container) {
    const clone = container.cloneNode(true);
    const btn = clone.querySelector('.remove-btn');
    if (btn) btn.remove();
    attach = clone.outerHTML;
  } else {
    attach = preview.innerHTML;
  }
  let mediaData = null;
  if (preview) {
    const container = preview.querySelector('.preview-container');
    
    if (container) {
      // Check if container has stored file data (for non-visual files)
      const fileData = container.getAttribute('data-file-data');
      const fileMime = container.getAttribute('data-file-mime');
      
      if (fileData && fileMime) {
        mediaData = {
          dataUrl: fileData,
          mimeType: fileMime,
          fileName: container.getAttribute('data-file-name')
        };
      } else {
        // Fallback to checking for image/audio/video/iframe elements
        const img = container.querySelector('img');
        const audio = container.querySelector('audio');
        const video = container.querySelector('video');
        const iframe = container.querySelector('iframe');
        if (img && img.src) mediaData = img.src;
        else if (audio && audio.src) mediaData = audio.src;
        else if (video && video.src) mediaData = video.src;
        else if (iframe && iframe.src) mediaData = iframe.src;
      }
    }
  }

  const attachments = window.getMessageAttachmentsFromPreview('medi', preview) || [];
  if (attachments.length > 0) {
    const attDesc = attachments.map(att => `${att.name || 'file'} (${att.type || 'unknown'})`).join(', ');
    msg = msg ? `${msg}\n\nAttached files: ${attDesc}` : `Attached files: ${attDesc}`;
  }

  if (!msg && !attach) return;

  // Setup stop button with commonAI utility (with fallback if not loaded)
  if (typeof window.setupStopButton === 'function') {
    window.setupStopButton({ sendBtn, section: 'medi' });
  }

  const msgGroup = document.createElement('div');
  msgGroup.className = 'chat-message-group';
  // generate a temporary message id now so we can reuse for actions
  const mid = Date.now() + '_' + Math.random().toString(36).substr(2,9);
  msgGroup.setAttribute('data-msg-id', mid);
  msgGroup.innerHTML = `
    <div class='user-msg' data-msg-id='${mid}'>${msg}${attach ? "<br>" + attach : ""}</div>
    <div class='ai-msg' data-msg-id='${mid}'><span class='ai-msg-text'>Medi AI typing...</span></div>
  `;
  chat.appendChild(msgGroup);
  if (typeof window.clearPreviewAndRemoveBtn === 'function') {
    window.clearPreviewAndRemoveBtn(preview);
  } else {
    preview.innerHTML = '';
  }
  if (!faqText) input.value = '';

  // Load existing chat history using commonAI.js
  window.initChatHistory && window.initChatHistory('medi', 10);
  let chatHistory = window.getChatHistory ? window.getChatHistory('medi') : [];


  let finalAnswer = "";
  try {
    // Fetch main local data
    const signal = window.mediAbortController ? window.mediAbortController.signal : null;

    // Get current language from i18n or localStorage
    const currentLang = (window.i18n && window.i18n.language) || localStorage.getItem('language') || 'En';
    const langCode = currentLang.substring(0, 2).toUpperCase(); // Extract first 2 letters for directory name
    const langDirCode = langCode === 'EN' ? 'En' : langCode === 'AR' ? 'Ar' : langCode === 'FR' ? 'Fr' : 
                        langCode === 'FU' ? 'Fu' : langCode === 'HA' ? 'Ha' : langCode === 'IG' ? 'Ig' : 
                        langCode === 'PI' ? 'Pi' : langCode === 'YO' ? 'Yo' : 'En'; // Default to English

    // List of all available language directories
    const availableLangs = ['En', 'Ar', 'Fr', 'Fu', 'Ha', 'Ig', 'Pi', 'Yo'];
    
    // Prioritize current language, then fall back to English if current not available
    const langDirsToLoad = availableLangs.includes(langDirCode) ? [langDirCode, 'En'] : ['En'];
    
    // Remove duplicates
    const uniqueLangDirs = [...new Set(langDirsToLoad)];

    // Define all known HTML files in details/Medi
    const htmlFileNames = [
      'alfijr-pharmacy.html', 'fortland-hospital.html', 'galbose-hospital.html', 'german-hospital.html', 
      'jasar-pharmacy.html', 'jds-pharmacy.html', 'kerion-pharmacy.html', 'kingblaise-pharmacy.html', 
      'lekki-pharmacy.html', 'malamre-clinic.html', 'mauth-yola.html', 'meddy-clinic.html', 
      'meddy-pharmacy.html', 'mufami-pharmacy.html', 'nets-distribution.html', 'newboshang-hospital.html', 
      'polio-immunization.html', 'redcross-awareness.html', 'shekinah-pharmacy.html', 'specialist-hospital.html', 
      'valli-clinic.html', 'yola-dispensary.html'
    ];

    // Fetch HTML content from language directories
    const allHtmlPromises = [];
    for (const langDir of uniqueLangDirs) {
      for (const fileName of htmlFileNames) {
        const filePath = `details/Medi/${langDir}/${fileName}`;
        allHtmlPromises.push(
          fetch(filePath, signal ? { signal } : {})
            .then(res => res.ok ? res.text().then(text => `\n--- ${fileName} (${langDir}) ---\n${text}`) : '')
            .catch(() => '')
        );
      }
    }

    const allLocalData = (await Promise.all(allHtmlPromises)).filter(content => content.length > 0).join('\n');

    // Ensure in-memory history exists for medi
    window.initChatHistory && window.initChatHistory('medi', 10);
    // Reserve slot for user message (AI will be added after response)
    window.addToChatHistory && window.addToChatHistory('medi', 'user', msg);

    // Get chat history context from in-memory helper
    const historyPairs = window.getQAHistoryForSection ? window.getQAHistoryForSection('medi', 5) : [];
    const historyContext = historyPairs.length > 0 ? '\n\nRecent chat history:\n' + historyPairs.map(h => `User: ${h.user}\nAI: ${h.ai}`).join('\n\n') : '';
    
    // Combine all local data
    const allLocalDataWithHistory = allLocalData + historyContext;

    finalAnswer = await window.callGeminiAI(allLocalDataWithHistory, msg, window.GEMINI_API_KEY, mediaData, window.mediAbortController ? window.mediAbortController.signal : null, 'medi', attachments);
    // Add AI response to in-memory history
    window.addToChatHistory && window.addToChatHistory('medi', 'assistant', finalAnswer);
  } catch (e) {
    if (e && (e.name === 'AbortError' || e.message === 'AbortError')) {
        finalAnswer = "Request cancelled.";
    } else if (typeof window.friendlyAIErrorMessage === 'function') {
        finalAnswer = window.friendlyAIErrorMessage(e);
    } else {
        console.error("Error fetching local data or Gemini API call:", e);
        finalAnswer = "The AI is currently unavailable. Please try again later.";
    }
  }

  msgGroup.querySelector('.ai-msg-text').innerHTML = formatAIResponse(finalAnswer);
    if (typeof window.addActionsToMsgGroup === 'function') {
      window.addActionsToMsgGroup(msgGroup, 'medi', 'medi-chat-messages');
    }

  if (sendBtn) {
    sendBtn.classList.remove('sending');
    sendBtn.textContent = 'Send';
    sendBtn.style.backgroundColor = '';
  }
  window.mediAbortController = null;
};

// Common helper for Gemini API call
async function getGeminiAnswer(localData, msg, apiKey, imageData = null, signal = null) {
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
    const modelVersion = 'gemini-2.5-flash';
    let body = JSON.stringify({ model: modelVersion, contents: [contents] });
    const url = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? (window.API_BASE || 'http://localhost:4000') + '/api/gemini'
      : '/api/gemini';
    
    const fetchOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    };
    if (signal) {
      fetchOptions.signal = signal;
    }

    let res = await fetch(url, fetchOptions);
    let data = await res.json();
    // Server will automatically handle fallback from 2.5 to 1.5 if needed
    return (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) ? data.candidates[0].content.parts[0].text : "Sorry, I couldn't get a response from the AI.";
  } catch (err) {
    if (err.name === 'AbortError') {
      throw err; // Re-throw abort errors
    }
    return "Sorry, I could not access local information or the AI at this time. Pls check your internet connection!";
  }
}
