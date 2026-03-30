// Load common AI utilities first
if (!window.commonAILoaded) {
  const script = document.createElement('script');
  script.src = 'components/commonAI.js';
  script.onload = () => { window.commonAILoaded = true; };
  document.head.appendChild(script);
}

// IMPORTED FROM commonAI.js:

// ✓ window.useGemini25 - Model preference (Gemini 2.5 vs 1.5)
// ✓ window.toggleGeminiModel() - Switch between models
// ✓ window.currentSpeech - Speech synthesis state
// ✓ window.stopSpeaking() - Stop text-to-speech
// ✓ window.speakText() - Convert text to speech
// ✓ window.captureImage() - Camera capture functionality
// ✓ window.recordAudio() - Microphone recording
// ✓ window.uploadFile() - File upload handler
// ✓ window.formatAIResponse() - Format responses with markdown
// ✓ window.ensureNavbarLoaded() - Load navbar safely
// ✓ window.getGeminiAnswer() - Core API integration (can override)


// Global text-to-speech variables and functions
// The actual `getGeminiAnswer` implementation with optional `signal` is defined
// later in this file. The duplicate no-signal variant above has been removed
// to ensure the AbortController signal is respected and to avoid function
// definition conflicts.

// Edit this prompt to instruct the AI on how to answer user messages for CommunityInfo
window.COMMUNITY_AI_PROMPT = window.COMMUNITY_AI_PROMPT || `You are an AI community coordinator for Yola, Adamawa State, Nigeria.
Help users find community events, organizations, services, and social information.

### Analysis Capabilities:
- **Image Analysis**: Analyze community-related images
  - Identify locations and community facilities in photos
  - Recognize community events and gatherings
  - Analyze flyers and community announcements
- **Audio Analysis**: Listen to community inquiries and concerns
  - Transcribe community event information
  - Help with community communication needs
- **Document Analysis**: Review community documents and announcements
  - Summarize community guidelines and events
  - Extract event details and community information

### Community Information Areas:
- Community events and gatherings
- Cultural and social organizations
- Community development projects
- Religious institutions and services
- Sports and recreation facilities
- Market information and trade associations
- Community safety and emergency services
- Social services and support organizations
- Volunteer and community engagement opportunities

### Response Guidelines:
- Provide helpful information about community events and organizations
- For images: Identify community locations and activities, provide context
- For audio: Transcribe community concerns and provide relevant information
- Include relevant Yola community organizations and contacts
- Emphasize community participation and engagement
- If info unavailable: "Sorry, I don't have that specific information. Please contact local community leaders for further help."

### Section Referrals:
- Health → MediInfo | Education → EduInfo | Navigation → NaviInfo | Agriculture → AgroInfo | Jobs → JobsConnect`;

window.communityAbortController = window.communityAbortController || null;
// Robust navbar loader


window.renderSection = function() {
  console.log('communityinfo.renderSection running');
  ensureNavbarLoaded();
  if (!document.getElementById('global-css')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'styles/global.css';
    link.id = 'global-css';
    document.head.appendChild(link);
  }
  return fetch('templates/community.html').then(r => r.text()).then(html => {
    document.getElementById('main-content').innerHTML = html;
    
    // Load chat history AFTER template is inserted
    setTimeout(() => {
      window.initAndRestoreSectionHistory && window.initAndRestoreSectionHistory('community', 'community-chat-messages');
      // Ensure auto-scroll observer is attached for this section
      window.observeChatContainers && window.observeChatContainers();
    }, 50);
    
    // Wire model toggle after template is inserted
    const mt = document.getElementById('model-toggle');
    if (mt) mt.onchange = function() { window.toggleGeminiModel('community', this.checked); };

    // Add Enter key handler to chat input - ensures attachments and text are sent together
    const communityInput = document.getElementById('chat-input') || document.querySelector('.chat-input-area input[type="text"]');
    if (communityInput) {
      communityInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          window.sendCommunityMessage();
        }
      });
    }
  }).catch(err => {
    console.error('Failed to load home template:', err);
    document.getElementById('main-content').innerHTML = '<p>Failed to load content.</p>';
  });  
};

// stopCommunityResponse is now handled by setupStopButton in commonAI.js

window.sendCommunityMessage = async function(faqText = '') {
  let input = document.getElementById('chat-input') || document.querySelector('.chat-input-area input[type="text"]');
  if (!input) {
    console.warn('Community input element not found; aborting sendCommunityMessage');
    return;
  }
  const chat = document.getElementById('chat-messages');
  const preview = document.getElementById('chat-preview');
  const sendBtn = document.querySelector('#chat-input + .send-button-group .send-button') || document.querySelector('.send-button');

  let msg = faqText || input.value.trim();
  let attach = '';
  const previewContainer = preview.querySelector('.preview-container');
  if (previewContainer) {
    const clone = previewContainer.cloneNode(true);
    const btn = clone.querySelector('.remove-btn');
    if (btn) btn.remove();
    attach = clone.outerHTML;
  } else {
    attach = preview.innerHTML;
  }
  if (!msg && !attach) return;

  // Extract media data if present in preview
  let mediaData = null;
  const previewContainer2 = preview.querySelector('.preview-container');

  if (previewContainer2) {
    const fileData = previewContainer2.getAttribute('data-file-data');
    const fileMime = previewContainer2.getAttribute('data-file-mime');

    if (fileData && fileMime) {
      mediaData = {
        dataUrl: fileData,
        mimeType: fileMime,
        fileName: previewContainer2.getAttribute('data-file-name')
      };
    } else {
      const previewImg = previewContainer2.querySelector('img');
      const previewAudio = previewContainer2.querySelector('audio');
      const previewVideo = previewContainer2.querySelector('video');
      const previewIframe = previewContainer2.querySelector('iframe');
      if (previewImg && previewImg.src) {
        mediaData = previewImg.src;
        msg = msg + "\nPlease analyze this image and provide relevant community information or suggestions.";
      } else if (previewAudio && previewAudio.src) {
        mediaData = previewAudio.src;
      } else if (previewVideo && previewVideo.src) {
        mediaData = previewVideo.src;
      } else if (previewIframe && previewIframe.src) {
        mediaData = previewIframe.src;
      }
    }
  }

  const attachments = window.getMessageAttachmentsFromPreview('community', preview) || [];
  if (attachments.length > 0) {
    const attDesc = attachments.map(att => `${att.name || 'file'} (${att.type || 'unknown'})`).join(', ');
    msg = msg ? `${msg}\n\nAttached files: ${attDesc}` : `Attached files: ${attDesc}`;
  }

  let controller = null;
  if (typeof window.setupStopButton === 'function') {
    controller = window.setupStopButton({ sendBtn, section: 'community' });
  }

  const msgGroup = document.createElement('div');
  msgGroup.className = 'chat-message-group';
  const mid = Date.now() + '_' + Math.random().toString(36).substr(2,9);
  msgGroup.setAttribute('data-msg-id', mid);
  msgGroup.innerHTML = `
    <div class='user-msg' data-msg-id='${mid}'>${msg}${attach ? "<br>" + attach : ""}</div>
    <div class='ai-msg' data-msg-id='${mid}'><span class='ai-msg-text'>Community AI typing...</span></div>
  `;
  chat.appendChild(msgGroup);
  if (typeof window.clearPreviewAndRemoveBtn === 'function') {
    window.clearPreviewAndRemoveBtn(preview);
  } else {
    preview.innerHTML = '';
  }
  if (!faqText) input.value = '';

  let finalAnswer = "";
  try {
    const signal = controller ? controller.signal : (window.communityAbortController ? window.communityAbortController.signal : null);

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

    // Define all known HTML files in details/Community
    const htmlFileNames = [
      'abcyola.html', 'adamawa-united.html', 'admin-services.html', 'amc-hall.html', 'atv.html', 
      'aun-community.html', 'aun-graduation-ceremony.html', 'aun-graduation.html', 'aun-hall.html', 
      'aun-townhall.html', 'bako-youth.html', 'banquet-hall.html', 'blackout.html', 'breastfeeding-week.html', 
      'childrens-day.html', 'cleaning-day.html', 'conference-center.html', 'crystal-palace.html', 
      'digital-hall.html', 'digital-literacy.html', 'edu-volunteer.html', 'education-day.html', 
      'elderly.html', 'env-volunteer.html', 'fastnet.html', 'fce-hall.html', 
      'female-education.html', 'festival.html', 'fintiri-wallet.html', 'flood.html', 
      'fombinafm.html', 'gotelfm.html', 'governors-cup.html', 'health-volunteer.html', 
      'independence-day.html', 'lamido-cinema.html', 'law-students.html', 'lcng-station.html', 
      'lgi-workshop.html', 'malaria-day.html', 'market-rebuild.html', 'market.html', 
      'nasfm.html', 'ntayola.html', 'pulaakufm.html', 'redcross-society.html', 
      'redcross.html', 'renewal-foundation.html', 'ribadu-square.html', 'tvgotel.html', 
      'undp-training.html', 'universal-youth.html', 'usakufm.html', 'wards-proximity.html', 
      'water-scheme.html', 'women.html', 'womens-day.html', 'workshop.html', 
      'yawef.html', 'yawef2.html', 'yedc-meters.html', 'yola-renewal-foundation.html', 
      'yolde-pate-youth.html', 'youth-skills.html', 'youth.html'
    ];

    // Fetch HTML content from language directories
    const allHtmlPromises = [];
    for (const langDir of uniqueLangDirs) {
      for (const fileName of htmlFileNames) {
        const filePath = `details/Community/${langDir}/${fileName}`;
        allHtmlPromises.push(
          fetch(filePath, signal ? { signal } : {})
            .then(res => res.ok ? res.text().then(text => `\n--- ${fileName} (${langDir}) ---\n${text}`) : '')
            .catch(() => '')
        );
      }
    }

    const allLocalData = (await Promise.all(allHtmlPromises)).filter(content => content.length > 0).join('\n');

    // Ensure in-memory history exists for community
    window.initChatHistory && window.initChatHistory('community', 10);
    // Reserve slot for user message (AI will be added after response)
    window.addToChatHistory && window.addToChatHistory('community', 'user', msg);

    // Get chat history context from in-memory helper
    const historyPairs = window.getQAHistoryForSection ? window.getQAHistoryForSection('community', 5) : [];
    const historyContext = historyPairs.length > 0 ? '\n\nRecent chat history:\n' + historyPairs.map(h => `User: ${h.user}\nAI: ${h.ai}`).join('\n\n') : '';

    // Combine all local data
    const allLocalDataWithHistory = allLocalData + historyContext;
    
    try {
      finalAnswer = await window.callGeminiAI(allLocalDataWithHistory, msg, window.GEMINI_API_KEY, mediaData, signal, 'community', attachments);
      // Add AI response to in-memory history
      window.addToChatHistory && window.addToChatHistory('community', 'assistant', finalAnswer);
    } catch (e) {
      if (e && (e.name === 'AbortError' || e.message === 'AbortError')) {
        finalAnswer = "Request cancelled.";
      } else if (typeof window.friendlyAIErrorMessage === 'function') {
        finalAnswer = window.friendlyAIErrorMessage(e);
      } else {
        console.error("Error in Gemini API call:", e);
        finalAnswer = "The AI is currently unavailable. Please try again later.";
      }
    }
  } catch (e) {
    console.error("Error fetching local data or Gemini API call:", e);
    finalAnswer = "Sorry, I could not access the local information or the AI at this time. Please check your connection!";
    window.addActionsToMsgGroup(msgGroup, 'community', 'chat-messages');
  }
  chat.scrollTop = chat.scrollHeight;

  const currentBtn = document.querySelector('#chat-input + .send-button-group .send-button') || document.querySelector('.send-button');
  if (currentBtn) {
    const restoredBtn = currentBtn.cloneNode(true);
    restoredBtn.type = 'submit';
    currentBtn.parentNode.replaceChild(restoredBtn, currentBtn);

    restoredBtn.classList.remove('sending');
    restoredBtn.textContent = 'Send';
    restoredBtn.style.backgroundColor = '';

    restoredBtn.addEventListener('click', (e) => { if (e && typeof e.preventDefault === 'function') e.preventDefault(); window.sendCommunityMessage(); });
  }
};


async function getGeminiAnswer(localData, msg, apiKey, imageData = null, signal = null) {
  try {
    const contents = {
      parts: []
    };
    if (imageData && typeof imageData === 'string' && imageData.includes(',')) {
      contents.parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: imageData.split(',')[1]
        }
      });
    } else if (imageData) {
      console.error('Invalid imageData format:', imageData);
    }

    const promptGuide = localStorage.getItem('community_ai_prompt') || COMMUNITY_AI_PROMPT;
    contents.parts.push({
      text: `${promptGuide}\n\n--- LOCAL DATA START ---\n${localData}\n--- LOCAL DATA END ---\n\nUser question: ${msg}`
    });

    const modelVersion = 'gemini-2.5-flash';
    let body = JSON.stringify({ model: modelVersion, contents: [contents] });

    const serverUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? (window.API_BASE || 'http://localhost:4000') + '/api/gemini'
      : 'https://yolaaiinfohub.netlify.app/api/gemini';
      
    const fetchOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    };
    if (signal) {
      fetchOptions.signal = signal;
    }
      
    let res = await fetch(serverUrl, fetchOptions);
    
    if (!res.ok) {
      throw new Error('Network response was not ok');
    }
    
    let data = await res.json();
    
    if (data.error && window.useGemini25 && !imageData) {
      // fallback to 1.5
      body = JSON.stringify({ model: 'gemini-1.5-flash', contents: [contents] });
      res = await fetch(serverUrl, fetchOptions);
      
      if (!res.ok) {
        throw new Error('Network response was not ok');
      }
      
      data = await res.json();
    }
    
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't get a response from the AI.";
  } catch (err) {
    if (err && err.name === 'AbortError') {
      throw err; // Re-throw abort errors
    }
    console.error("Gemini API error:", err);
    if (typeof window.friendlyAIErrorMessage === 'function') return window.friendlyAIErrorMessage(err);
    return "The AI is currently unavailable. Please try again later.";
  }
}
