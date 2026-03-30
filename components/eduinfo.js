// eduinfo.js

// Load common AI utilities first
if (!window.commonAILoaded) {
  const script = document.createElement('script');
  script.src = 'components/commonAI.js';
  script.onload = () => { window.commonAILoaded = true; };
  document.head.appendChild(script);
}

// AI Prompt for EduInfo
window.EDU_AI_PROMPT = `You are an expert AI tutor and educational advisor for Yola, Adamawa State, Nigeria.
Specialize in all levels of education from primary school through university.

### Analysis Capabilities:
- **Image Analysis**: Analyze diagrams, equations, photos of textbooks, handwritten assignments, and educational materials
  - Explain complex concepts shown in images
  - Help solve math problems or physics diagrams
  - Identify errors in student work
- **Audio Analysis**: Listen to educational audio files and lectures
  - Answer questions about audio content
  - Transcribe key points from educational recordings
- **Document Analysis**: Review PDFs, educational documents, course materials
  - Summarize educational content
  - Answer questions about document content
  - Provide study guidance

### Response Guidelines:
- Focus ONLY on education-related topics for Yola
- Provide clear, student-friendly explanations
- For images: Identify subject matter and provide detailed educational guidance
- For audio: Transcribe intent and provide educational support
- Include relevant schools/institutions in Yola when helpful
- If info unavailable: "Sorry, I don't have that specific information. Please contact a local education authority for further help."

### Section Referrals:
- Health matters → MediInfo | Navigation → NaviInfo | Community → CommunityInfo
- Agriculture → AgroInfo | Jobs → JobsConnect | Environment → EcoInfo

### Conversation History:
{history}`;

// Abort controller for fetch requests
window.eduAbortController = null;
// Initialize EduInfo Section
window.renderSection = function() {
    return fetch('templates/edu.html').then(r => r.text()).then(html => {
        document.getElementById('main-content').innerHTML = html;
        
        // Load chat history AFTER template is inserted
        setTimeout(() => { 
          window.initAndRestoreSectionHistory && window.initAndRestoreSectionHistory('edu', 'eduinfo-chat-messages');
          // Ensure auto-scroll observer is attached for this section
          window.observeChatContainers && window.observeChatContainers();
        }, 50);
        
        // Wire model toggle after template is inserted
        const mt = document.getElementById('model-toggle');
        if (mt) mt.onchange = function() { window.toggleGeminiModel('edu', this.checked); };

        // Add Enter key handler to chat input - ensures attachments and text are sent together
        const eduInput = document.getElementById('edu-chat-input');
        if (eduInput) {
          eduInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              window.sendEduMessage();
            }
          });
        }
    }).catch(err => {
        console.error('Failed to load home template:', err);
        document.getElementById('main-content').innerHTML = '<p>Failed to load content.</p>';
    });
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
    const sendBtn = document.querySelector('#edu-chat-input + .send-button-group .send-button');
    const stopBtn = document.querySelector('#edu-chat-input + .send-button-group .stop-button');

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

    // Setup stop button with commonAI utility (with fallback if not loaded)
    if (typeof window.setupStopButton === 'function') {
      window.setupStopButton({ sendBtn, section: 'edu' });
    }

    const msgGroup = document.createElement('div');
    msgGroup.className = 'chat-message-group';
    // generate a temporary message id now so we can reuse for actions
    const mid = Date.now() + '_' + Math.random().toString(36).substr(2,9);
    msgGroup.setAttribute('data-msg-id', mid);
    msgGroup.innerHTML = `
    <div class='user-msg' data-msg-id='${mid}'>${msg}${attach ? "<br>" + attach : ""}</div>
    <div class='ai-msg' data-msg-id='${mid}'><span class='ai-msg-text'>Edu AI typing...</span></div>
  `;
    chat.appendChild(msgGroup);
    // Extract media data from preview (image, audio, or file)
    let mediaData = null;
    const previewContainer2 = preview.querySelector('.preview-container');
    
    if (previewContainer2) {
      // Check if container has stored file data (for non-visual files)
      const fileData = previewContainer2.getAttribute('data-file-data');
      const fileMime = previewContainer2.getAttribute('data-file-mime');
      
      if (fileData && fileMime) {
        mediaData = {
          dataUrl: fileData,
          mimeType: fileMime,
          fileName: previewContainer2.getAttribute('data-file-name')
        };
      } else {
        // Fallback to checking for image/audio elements
        const imgElement = previewContainer2.querySelector('img');
        const audioElement = previewContainer2.querySelector('audio');
        const videoElement = previewContainer2.querySelector('video');
        const iframeElement = previewContainer2.querySelector('iframe');

        if (imgElement && imgElement.src) {
          mediaData = imgElement.src;
        } else if (audioElement && audioElement.src) {
          mediaData = audioElement.src;
        } else if (videoElement && videoElement.src) {
          mediaData = videoElement.src;
        } else if (iframeElement && iframeElement.src) {
          mediaData = iframeElement.src;
        }
      }
    }

    const attachments = window.getMessageAttachmentsFromPreview('edu', preview) || [];
    if (attachments.length > 0) {
      const attDesc = attachments.map(att => `${att.name || 'file'} (${att.type || 'unknown'})`).join(', ');
      msg = msg ? `${msg}\n\nAttached files: ${attDesc}` : `Attached files: ${attDesc}`;
    }

    // Use shared function to clear preview and remove button
    if (typeof window.clearPreviewAndRemoveBtn === 'function') {
      window.clearPreviewAndRemoveBtn(preview);
    } else {
      preview.innerHTML = '';
    }
    if (!faqText) input.value = '';

  // Initialize in-memory history for edu and add user entry
  window.initChatHistory && window.initChatHistory('edu', 10);
  window.addToChatHistory && window.addToChatHistory('edu', 'user', msg);

  // Build history context from in-memory pairs
  const historyPairs = window.getQAHistoryForSection ? window.getQAHistoryForSection('edu', 5) : [];

  let finalAnswer = "";
    try {
        const signal = window.eduAbortController ? window.eduAbortController.signal : null;

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

        // Define all known HTML files in details/Edu
        const htmlFileNames = [
            'adroit-academy.html', 'adsu.html', 'albayaan-academy.html', 'alnaab-academy.html',
            'amc-yola.html', 'aun.html', 'baitul-ateeq.html', 'binani-academy.html',
            'bkc-yola.html', 'central-college.html', 'chiroma-ahmad-academy.html', 'cls-yola.html',
            'cosmotech-yola.html', 'el-kenemy-college.html', 'eyn-secondary.html', 'fce-yola.html',
            'fed-poly-yola.html', 'fggc-yola.html', 'gdss-yola.html', 'gmmc-yola.html',
            'gtc-yola.html', 'library.html', 'mau.html', 'nursing-school-yola.html',
            'spy-yola.html', 'sra-yola.html', 'ubec-smart-school.html'
        ];

        // Fetch HTML content from language directories
        const allHtmlPromises = [];
        for (const langDir of uniqueLangDirs) {
            for (const fileName of htmlFileNames) {
                const filePath = `details/Edu/${langDir}/${fileName}`;
                allHtmlPromises.push(
                    fetch(filePath, signal ? { signal } : {})
                        .then(res => res.ok ? res.text().then(text => `\n--- ${fileName} (${langDir}) ---\n${text}`) : '')
                        .catch(() => '')
                );
            }
        }

        const allLocalData = (await Promise.all(allHtmlPromises)).filter(content => content.length > 0).join('\n');
        
        // Get chat history for this section
        const historyContext = historyPairs.length > 0 
            ? "\n\nRecent chat history:\n" + historyPairs.map(h => `User: ${h.user}\nAI: ${h.ai}`).join('\n\n')
            : "";
        
        // Combine all local data
        const allLocalDataWithHistory = allLocalData + historyContext;
            
  finalAnswer = await window.callGeminiAI(allLocalDataWithHistory, msg, window.GEMINI_API_KEY, mediaData, window.eduAbortController ? window.eduAbortController.signal : null, 'edu', attachments);
  // Add user message to history
  window.addToChatHistory && window.addToChatHistory('edu', 'user', msg);
  // Add assistant reply to in-memory history
  window.addToChatHistory && window.addToChatHistory('edu', 'assistant', finalAnswer);
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
      window.addActionsToMsgGroup(msgGroup, 'edu', 'eduinfo-chat-messages');
    }
    chat.scrollTop = chat.scrollHeight;

    if (sendBtn) {
        sendBtn.classList.remove('sending');
        sendBtn.textContent = 'Send';
        sendBtn.style.backgroundColor = '';
    }
    window.eduAbortController = null;
};

// Common helper for Gemini API call
async function getGeminiAnswer(localData, msg, apiKey, imageData = null, signal = null) {
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
  const modelVersion = 'gemini-2.5-flash';
  let body = JSON.stringify({ model: modelVersion, contents: [contents] });
  const url = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? (window.API_BASE || 'http://localhost:4000') + '/api/gemini'
    : '/api/gemini';
  
  let response;
  try {
    const fetchOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    };
    if (signal) {
      fetchOptions.signal = signal;
    }

    response = await fetch(url, fetchOptions);
    
    let data = await response.json();
    return (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) ? data.candidates[0].content.parts[0].text : "Sorry, I couldn't get a response from the AI.";
  } catch (err) {
    if (err.name === 'AbortError') {
      throw err; // Re-throw abort errors to be handled by caller
    }
    throw new Error("Failed to get response from AI service");
  }
}
