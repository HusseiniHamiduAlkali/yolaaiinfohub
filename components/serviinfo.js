// Load common AI utilities first
if (!window.commonAILoaded) {
  const script = document.createElement('script');
  script.src = 'components/commonAI.js';
  script.onload = () => { window.commonAILoaded = true; };
  document.head.appendChild(script);
}

// Edit this prompt to instruct the AI on how to answer user messages for ServiInfo
window.SERVI_AI_PROMPT = window.SERVI_AI_PROMPT || `You are an AI assistant for Yola, Adamawa State, Nigeria.
Help the user find professional services in Yola.
Answer the user's question using the information provided below, and the internet. But only those regarding professional services and service providers.
If the answer is not present, reply: "Sorry, I do not have that specific information in my local database. Please contact a local service directory for further help."
And if a user clearly requests information on health, education, community, environment, navigation, or agriculture, refer them to either of MediInfo, EduInfo, CommunityInfo, EcoInfo, NaviInfo, or AgroInfo, as the case may be.`;

window.serviAbortController = window.serviAbortController || null;

window.renderSection = function() {
  if (typeof ensureNavbarLoaded === 'function') {
    try { ensureNavbarLoaded(); } catch (e) { console.warn('ensureNavbarLoaded() threw:', e); }
  } else {
    console.warn('ensureNavbarLoaded is not defined; continuing without it.');
  }
  if (!document.getElementById('global-css')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'styles/global.css';
    link.id = 'global-css';
    document.head.appendChild(link);
  }
  
  return fetch('templates/servi.html').then(r => r.text()).then(html => {
    document.getElementById('main-content').innerHTML = html;
    
    // Load chat history AFTER template is inserted
    setTimeout(() => { 
      window.initAndRestoreSectionHistory && window.initAndRestoreSectionHistory('servi', 'servi-chat-messages');
      // Ensure auto-scroll observer is attached for this section
      window.observeChatContainers && window.observeChatContainers();
    }, 50);
    
    // Wire model toggle after template is inserted
    const mt = document.getElementById('model-toggle');
    if (mt) mt.onchange = function() { window.toggleGeminiModel('servi', this.checked); };

    // Add Enter key handler to chat input - ensures attachments and text are sent together
    const serviInput = document.getElementById('servi-chat-input');
    if (serviInput) {
      serviInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          window.sendServiMessage();
        }
      });
    }

      // Populate currency dropdowns for this newly-inserted template (if function exists)
      if (typeof window.populateDropdown === 'function') {
        window.populateDropdown('currency1');
        window.populateDropdown('currency2');
        window.populateDropdown('currency3');
      }
      // Setup exchange converter wiring after dropdowns are populated
      if (typeof window.setupExchangeConverter === 'function') {
        try { window.setupExchangeConverter(); } catch (e) { console.error('setupExchangeConverter failed:', e); }
      }
  }).catch(err => {
    console.error('Failed to load servi template:', err);
    document.getElementById('main-content').innerHTML = '<p>Failed to load content.</p>';
  });
};

// stopServiResponse is now handled by setupStopButton in commonAI.js

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
    const promptGuide = localStorage.getItem('servi_ai_prompt') || SERVI_AI_PROMPT;
    contents.parts.push({
      text: `${promptGuide}\n\n--- LOCAL DATA START ---\n${localData}\n--- LOCAL DATA END ---\n\nUser question: ${msg}`
    });
    const modelVersion = 'gemini-2.5-flash';
    let body = JSON.stringify({ model: modelVersion, contents: [contents] });
    
    const serverUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? (window.API_BASE || 'http://localhost:4000') + '/api/gemini'
      : '/api/gemini';
    
    const fetchOptions = { 
      method: 'POST', 
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include',
      mode: 'cors',
      body
    };
    if (signal) {
      fetchOptions.signal = signal;
    }
      
    let res = await fetch(serverUrl, fetchOptions);

    if (!res.ok) {
      if (res.status === 429) {
        throw new Error('API_RATE_LIMIT');
      } else if (res.status >= 500) {
        throw new Error('API_SERVER_ERROR');
      }
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    let data;
    try {
      data = await res.json();
    } catch (jsonError) {
      console.error('Failed to parse API response:', jsonError);
      throw new Error('INVALID_JSON_RESPONSE');
    }
    
    if (data.error) {
      console.error('Gemini API error:', data.error);
      throw new Error('API_ERROR: ' + (data.error.message || JSON.stringify(data.error)));
    }
    
    return (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) ? data.candidates[0].content.parts[0].text : "Sorry, I couldn't get a response from the AI.";
  } catch (err) {
    if (err.name === 'AbortError') {
      throw err; // Re-throw abort errors to be handled by caller
    }
    console.error('Error getting Gemini answer:', err);
    throw err;
  }
}

window.sendServiMessage = async function(faqText = '') {
  const input = document.getElementById('servi-chat-input');
  const chat = document.getElementById('servi-chat-messages');
  const preview = document.getElementById('servi-chat-preview');
  const sendBtn = document.querySelector('#servi-chat-input + .send-button-group .send-button');
  const stopBtn = document.querySelector('#servi-chat-input + .send-button-group .stop-button');

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

  const attachments = window.getMessageAttachmentsFromPreview('servi', preview) || [];
  if (attachments.length > 0) {
    const attDesc = attachments.map(att => `${att.name || 'file'} (${att.type || 'unknown'})`).join(', ');
    msg = msg ? `${msg}\n\nAttached files: ${attDesc}` : `Attached files: ${attDesc}`;
  }
  if (!msg && !attach) return;

  // Setup stop button with commonAI utility (creates AbortController) - with fallback if not loaded
  if (sendBtn && typeof window.setupStopButton === 'function') {
    window.setupStopButton({ sendBtn, section: 'servi' });
  }

  const msgGroup = document.createElement('div');
  msgGroup.className = 'chat-message-group';
  // generate a temporary message id now so we can reuse for actions
  const mid = Date.now() + '_' + Math.random().toString(36).substr(2,9);
  msgGroup.setAttribute('data-msg-id', mid);
  msgGroup.innerHTML = `
    <div class='user-msg' data-msg-id='${mid}'>${msg}${attach ? "<br>" + attach : ""}</div>
    <div class='ai-msg' data-msg-id='${mid}'><span class='ai-msg-text'>Servi AI typing...</span></div>
  `;
  chat.appendChild(msgGroup);
  window.clearPreviewAndRemoveBtn(preview);
  if (!faqText) input.value = '';

  let finalAnswer = "";
  try {
    const signal = window.serviAbortController ? window.serviAbortController.signal : null;

    // Fetch all .html files in details/Servi directory
    const serviFiles = await fetch('details/Servi/', signal ? { signal } : {}).then(r => r.text());
    const parser = new DOMParser();
    const doc = parser.parseFromString(serviFiles, 'text/html');
    const links = Array.from(doc.querySelectorAll('a[href$=".html"]')).map(link => `details/Servi/${link.getAttribute('href')}`);

    const htmlContents = await Promise.all(
      links.map(async (link) => {
        try {
          const res = await fetch(link, signal ? { signal } : {});
          if (!res.ok) return '';
          return `\n--- ${link} ---\n` + (await res.text());
        } catch {
          return '';
        }
      })
    );

    const allLocalData = htmlContents.join('\n');
    finalAnswer = await window.callGeminiAI(allLocalData, msg, window.GEMINI_API_KEY, mediaData, signal, 'servi', attachments);
  } catch (e) {
    if (e && (e.name === 'AbortError' || e.message === 'AbortError')) {
      finalAnswer = 'Request cancelled.';
    } else if (typeof window.friendlyAIErrorMessage === 'function') {
      finalAnswer = window.friendlyAIErrorMessage(e);
    } else {
      console.error("Error fetching local data or Gemini API call:", e);
      finalAnswer = "The AI is currently unavailable. Please try again later.";
    }
  }

  msgGroup.querySelector('.ai-msg-text').innerHTML = formatAIResponse(finalAnswer);
  if (typeof window.addActionsToMsgGroup === 'function') {
    window.addActionsToMsgGroup(msgGroup, 'servi', 'servi-chat-messages');
  }
  chat.scrollTop = chat.scrollHeight;

  if (sendBtn) {
    sendBtn.classList.remove('sending');
    sendBtn.textContent = 'Send';
    sendBtn.style.backgroundColor = '';
  }
  window.serviAbortController = null;
};

// Add currency exchange rate logic
async function fetchExchangeRates() {
  // Legacy function retained for manual fetch button; perform a simple conversion
  // We'll try to convert using amount1 as source if present
  const a1 = document.getElementById('amount1');
  if (a1) {
    const val = parseFloat(a1.value);
    if (!isNaN(val)) {
      await window.convertFrom(1);
    }
  }
}

// Ensure dropdowns are populated dynamically
if (!window.populateDropdown) {
  window.populateDropdown = (dropdownId) => {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) {
      console.error(`Dropdown with ID '${dropdownId}' not found.`);
      return;
    }
    if (!window.currencies) {
      window.currencies = [
        'USD', 'NGN', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CNY', 'ZAR', 'XAF'
      ];
    }
    window.currencies.forEach(currency => {
      const option = document.createElement('option');
      option.value = currency;
      option.textContent = currency;
      dropdown.appendChild(option);
    });
  };
}

// Exchange converter utilities
window._exchangeRatesCache = window._exchangeRatesCache || {};

async function getRatesForBase(base) {
  if (!base) return null;
  const cached = window._exchangeRatesCache[base];
  const now = Date.now();
  if (cached && (now - cached.ts) < 1000 * 60 * 60) { // 1 hour cache
    return cached.rates;
  }
  // Try multiple public endpoints to improve reliability and handle different JSON shapes
  const endpoints = [
    (b) => `https://api.exchangerate.host/latest?base=${encodeURIComponent(b)}`,
    (b) => `https://open.er-api.com/v6/latest/${encodeURIComponent(b)}`,
    (b) => `https://api.exchangerate-api.com/v4/latest/${encodeURIComponent(b)}`
  ];
  for (const ep of endpoints) {
    try {
      const url = ep(base);
      const res = await fetch(url);
      if (!res.ok) {
        console.warn('getRatesForBase: endpoint returned non-ok', url, res.status);
        continue;
      }
      const data = await res.json();
      // Normalize possible field names
      const rates = data.rates || data.conversion_rates || data['conversion_rates'];
      if (rates && typeof rates === 'object') {
        window._exchangeRatesCache[base] = { rates: rates, ts: now };
        return rates;
      }
      // Some APIs wrap rates differently (older or unexpected formats)
      console.warn('getRatesForBase: endpoint returned unexpected payload', url, data);
    } catch (err) {
      console.warn('getRatesForBase fetch failed for endpoint, trying next:', err);
      continue;
    }
  }
  console.error('getRatesForBase error: all endpoints failed or returned invalid data');
  return null;
}

window._ignoreExchangeInput = false;

window.convertFrom = async function(index) {
  const idx = Number(index);
  const sel1 = document.getElementById('currency1');
  const sel2 = document.getElementById('currency2');
  const sel3 = document.getElementById('currency3');
  const amt1 = document.getElementById('amount1');
  const amt2 = document.getElementById('amount2');
  const amt3 = document.getElementById('amount3');
  if (!sel1 || !sel2 || !sel3 || !amt1 || !amt2 || !amt3) return;

  const selMap = {1: sel1, 2: sel2, 3: sel3};
  const amtMap = {1: amt1, 2: amt2, 3: amt3};
  const srcSel = selMap[idx];
  const srcAmt = parseFloat(amtMap[idx].value);
  if (!srcSel || !srcSel.value) return;
  if (isNaN(srcAmt)) {
    // clear others
    window._ignoreExchangeInput = true;
    if (idx !== 1) amt1.value = '';
    if (idx !== 2) amt2.value = '';
    if (idx !== 3) amt3.value = '';
    window._ignoreExchangeInput = false;
    return;
  }

  const rates = await getRatesForBase(srcSel.value);
  if (!rates) return;

  window._ignoreExchangeInput = true;
  try {
    // compute for each target
    for (let i = 1; i <= 3; i++) {
      if (i === idx) continue;
      const targetSel = selMap[i];
      const targetAmtEl = amtMap[i];
      if (!targetSel || !targetSel.value) {
        targetAmtEl.value = '';
        continue;
      }
      const rate = rates[targetSel.value];
      if (typeof rate === 'number') {
        const converted = srcAmt * rate;
        targetAmtEl.value = Number.isFinite(converted) ? Math.round(converted * 100) / 100 : '';
      } else {
        targetAmtEl.value = '';
      }
    }
  } finally {
    window._ignoreExchangeInput = false;
  }
};

window.setupExchangeConverter = function() {
  const inputs = Array.from(document.querySelectorAll('.exchange-amount'));
  const selects = [document.getElementById('currency1'), document.getElementById('currency2'), document.getElementById('currency3')];
  if (inputs.length < 3 || selects.some(s => !s)) return;

  inputs.forEach(inp => {
    inp.addEventListener('input', function() {
      if (window._ignoreExchangeInput) return;
      const idx = Number(this.dataset.index || 1);
      window.convertFrom(idx);
    });
  });

  selects.forEach((sel, i) => {
    sel.addEventListener('change', function() {
      // when currency changes, try to recompute using the corresponding amount as source
      const idx = i + 1;
      window.convertFrom(idx);
    });
  });
};

// Attach event listener to the button (idempotent binding to avoid redeclare errors)
(function() {
  try {
    const btn = document.getElementById('fetch-rates');
    if (!btn) return;
    if (window._servi_fetchRatesBound) return;
    btn.addEventListener('click', fetchExchangeRates);
    window._servi_fetchRatesBound = true;
  } catch (e) {
    console.error('Failed to bind fetch-rates button:', e);
  }
})();

