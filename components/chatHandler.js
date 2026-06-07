// Common chat handler functions
// NOTE: API keys must not be embedded into frontend code for security.
// Use a backend proxy (/api/gemini) or Netlify function that holds the GEMINI key.
window.GEMINI_API_KEY = window.GEMINI_API_KEY || null;

// Global attachment tracking for each section
// Stores metadata about attached files in the current message
window.sectionAttachments = window.sectionAttachments || {};

// Initialize attachment storage for a section
window.initAttachmentStorage = function(section) {
  if (!window.sectionAttachments[section]) {
    window.sectionAttachments[section] = [];
  }
};

// Add attachment metadata (accepts File or manual object with dataURL)
window.addAttachment = function(section, file) {
  window.initAttachmentStorage(section);
  const attachment = {
    name: file.name || file.filename || 'attachment',
    type: file.type || file.mimeType || '',
    size: file.size || 0,
    timestamp: Date.now(),
    id: Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  };
  if (file.dataURL) {
    attachment.dataURL = file.dataURL;
  }
  window.sectionAttachments[section].push(attachment);
  return attachment;
};

// Get attachments for a section
window.getAttachments = function(section) {
  window.initAttachmentStorage(section);
  return window.sectionAttachments[section];
};

// Clear attachments for a section (after message is sent)
window.clearAttachments = function(section) {
  if (window.sectionAttachments[section]) {
    window.sectionAttachments[section] = [];
  }
};

// Format attachment info for display
window.getAttachmentSummary = function(section) {
  const attachments = window.getAttachments(section);
  if (!attachments || attachments.length === 0) return '';
  
  const summary = attachments.map(att => {
    const typeIcon = att.type.startsWith('image/') ? '🖼️' : 
                     att.type.startsWith('audio/') ? '🎵' :
                     att.type.startsWith('video/') ? '🎥' :
                     att.type === 'application/pdf' ? '📄' : '📎';
    const sizeKB = (att.size / 1024).toFixed(1);
    return `${typeIcon} ${att.name} (${sizeKB}KB)`;
  }).join(' | ');
  
  return `<div class="attachment-metadata" style="font-size:12px; color:#718096; margin-top:6px; padding-top:6px; border-top:1px solid #e2e8f0;">📎 Attachments: ${summary}</div>`;
};

window.getMessageAttachmentsFromPreview = function(section, preview) {
  if (!section || !preview || !preview.querySelector) return [];

  const attachments = (window.getAttachments(section) || []).slice();
  const container = preview.querySelector('.preview-container');
  if (!container) return attachments;

  const fileData = container.getAttribute('data-file-data');
  const fileMime = container.getAttribute('data-file-mime');
  const fileName = container.getAttribute('data-file-name');

  const addAttachment = (name, type, dataURL) => {
    if (!dataURL || !type) return;
    const exists = attachments.some(a => a.dataURL === dataURL && a.type === type && a.name === name);
    if (!exists) {
      attachments.push({ name: name || 'attachment', type, size: 0, dataURL });
    }
  };

  if (fileData && fileMime) {
    addAttachment(fileName || 'file', fileMime, fileData);
    return attachments;
  }

  const img = container.querySelector('img');
  const audio = container.querySelector('audio');
  const video = container.querySelector('video');
  const iframe = container.querySelector('iframe');

  if (img && img.src) {
    addAttachment(fileName || 'image', img.src.match(/data:([^;]+)/)?.[1] || 'image/jpeg', img.src);
  } else if (audio && audio.src) {
    addAttachment(fileName || 'audio', audio.src.match(/data:([^;]+)/)?.[1] || 'audio/webm', audio.src);
  } else if (video && video.src) {
    addAttachment(fileName || 'video', video.src.match(/data:([^;]+)/)?.[1] || 'video/mp4', video.src);
  } else if (iframe && iframe.src) {
    addAttachment(fileName || 'pdf', 'application/pdf', iframe.src);
  }

  return attachments;
};

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
  
  const cleanText = text.replace(/<[^>]*>/g, '').replace(/<br>/g, ' ');
  
  const utterance = new SpeechSynthesisUtterance(cleanText);
  
  // Set preferred voice
  const voices = speechSynthesis.getVoices();
  const preferredVoice = voices.find(voice => 
    voice.name.includes('Google') || voice.name.includes('Microsoft') || 
    voice.name.includes('English')
  );
  if (preferredVoice) utterance.voice = preferredVoice;
  
  // Adjust speech parameters
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  
  window.currentSpeech = utterance;
  
  // Visual feedback
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

// In-memory chat history helpers (cleared on full page reload)
window.initChatHistory = window.initChatHistory || function(section, maxLen = 10) {
  const key = `${section}ChatHistory`;
  window[key] = window[key] || [];
  window[`${section}MAX_HISTORY_LENGTH`] = maxLen;
};

window.addToChatHistory = window.addToChatHistory || function(section, role, content) {
  const key = `${section}ChatHistory`;
  window[key] = window[key] || [];
  window[key].push({ role, content });
  const max = window[`${section}MAX_HISTORY_LENGTH`] || 10;
  if (window[key].length > max) window[key].shift();
};

window.getQAHistoryForSection = window.getQAHistoryForSection || function(section, maxPairs = 5) {
  const key = `${section}ChatHistory`;
  const h = window[key] || [];
  const pairs = [];
  for (let i = 0; i < h.length; i++) {
    if (h[i].role === 'user') {
      const ai = (h[i+1] && h[i+1].role === 'assistant') ? h[i+1].content : '';
      pairs.push({ user: h[i].content, ai });
    }
    if (pairs.length >= maxPairs) break;
  }
  return pairs;
};

window.loadChatHistoryToDOM = window.loadChatHistoryToDOM || function(section, containerId) {
  const id = containerId || `${section}-chat-messages`;
  const chat = document.getElementById(id);
  if (!chat) return;
  const key = `${section}ChatHistory`;
  const hist = window[key] || [];
  chat.innerHTML = hist.map(msg => `\n      <div class='chat-message-group'>\n        <div class='${msg.role === 'user' ? 'user-msg' : 'ai-msg'}'>${msg.role === 'assistant' ? (typeof formatAIResponse === 'function' ? formatAIResponse(msg.content) : msg.content) : msg.content}</div>\n      </div>\n  `).join('');
  chat.scrollTop = chat.scrollHeight;
};

// Common helper for Gemini API call - delegate to centralized commonAI implementation
async function getGeminiAnswer(prompt, msg, section, apiKey, attachments = []) {
  try {
    const sectionName = (section || 'home').toLowerCase();
    const titleCase = sectionName.charAt(0).toUpperCase() + sectionName.slice(1);
    const localDetails = typeof window.fetchLocalDetails === 'function'
      ? await window.fetchLocalDetails(titleCase, 'En')
      : '';
    const localData = `${prompt || ''}\n\n${localDetails || ''}`;
    return await window.callGeminiAI(localData, msg, apiKey, null, null, sectionName, attachments);
  } catch (e) {
    console.error('getGeminiAnswer wrapper error', e);
    return "Sorry, I'm having trouble connecting to the AI at the moment.";
  }
}

// Use centralized `formatAIResponse` from components/commonAI.js

// Image capture handled centrally in `components/commonAI.js` via `window.captureImage`.

// Common audio recording function
// Audio recording handled centrally in `components/commonAI.js` via `window.recordAudio(section)`.

// File upload handled centrally in `components/commonAI.js` via `window.uploadFile(e, section)`.

// Message handling function
window.sendMessage = async function(section, faqText = '') {
  const input = document.getElementById(`${section}-chat-input`);
  const chat = document.getElementById(`${section}-chat-messages`);
  const preview = document.getElementById(`${section}-chat-preview`);
  const sendBtn = document.querySelector(`#${section}-chat-container .send-button`);
  const stopBtn = document.querySelector(`#${section}-chat-container .stop-button`);
  
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
  if (!msg && !attach) return;

  // Get attachment summary
  const attachmentSummary = window.getAttachmentSummary(section);
  const fullMessage = attachmentSummary ? msg + attachmentSummary : msg;

  // Gather attachments metadata with dataURL
  const attachments = window.getAttachments(section) || [];
  // if a preview image exists keep backwards compatibility
  let imageData = null;
  let aiInstructions = '';
  if (attachments.length) {
    attachments.forEach(att => {
      if (att.dataURL && att.type && att.type.startsWith('image/')) {
        imageData = att.dataURL; // pick first image for old API call
        // Keep instruction separate for AI backend only (don't show to user)
        aiInstructions = "\nPlease analyze this image and provide relevant information.";
      }
    });
  }
  // Store instructions for API call but don't add to displayed message
  window[`${section}_AI_INSTRUCTIONS`] = aiInstructions;

  if (window[`${section}AbortController`]) {
    window[`${section}AbortController`].abort();
  }
  window[`${section}AbortController`] = new AbortController();

  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.classList.add('sending');
    sendBtn.textContent = '';
  }
  if (stopBtn) stopBtn.style.display = 'inline-flex';

  const msgGroup = document.createElement('div');
  msgGroup.className = 'chat-message-group';
  msgGroup.innerHTML = `
    <div class='user-msg'>${fullMessage}${attach ? "<br>" + attach : ""}</div>
    <div class='ai-msg'><span class='ai-msg-text'>...</span></div>
  `;
  chat.appendChild(msgGroup);
  
  // Clear preview and attachments using centralized helper so remove button and any state are cleaned
  if (typeof window.clearPreviewAndRemoveBtn === 'function') {
    window.clearPreviewAndRemoveBtn(preview);
  } else {
    preview.innerHTML = '';
  }
  
  // Clear attachments after message is sent
  window.clearAttachments(section);
  
  if (!faqText) input.value = '';

  try {
    const systemPrompt = window[`${section.toUpperCase()}_AI_PROMPT`] || '';
    const localizedPrompt = (window.localizeAIRequest && typeof window.localizeAIRequest === 'function') ? window.localizeAIRequest(systemPrompt) : systemPrompt;
    // Add AI instructions (invisible to user) to the message sent to backend
    const msgWithAIInstructions = msg + (window[`${section}_AI_INSTRUCTIONS`] || '');
    const finalAnswer = await getGeminiAnswer(
      localizedPrompt,
      msgWithAIInstructions,
      section,
      window.GEMINI_API_KEY,
      attachments
    );

    msgGroup.querySelector('.ai-msg-text').innerHTML = formatAIResponse(finalAnswer);
    if (typeof window.addActionsToMsgGroup === 'function') {
      window.addActionsToMsgGroup(msgGroup, section, `${section}-chat-messages`);
    }
    chat.scrollTop = chat.scrollHeight;
  } catch (e) {
    console.error(`Error in ${section} chat:`, e);
    msgGroup.querySelector('.ai-msg-text').innerHTML = formatAIResponse("Sorry, I encountered an error while processing your request.");
    if (typeof window.addActionsToMsgGroup === 'function') {
      window.addActionsToMsgGroup(msgGroup, section, `${section}-chat-messages`);
    }
  }

  if (sendBtn) {
    sendBtn.disabled = false;
    sendBtn.classList.remove('sending');
    sendBtn.textContent = 'Send';
  }
  if (stopBtn) stopBtn.style.display = 'none';
  window[`${section}AbortController`] = null;
};
