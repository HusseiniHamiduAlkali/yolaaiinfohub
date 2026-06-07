// Load common AI utilities first
if (!window.commonAILoaded) {
  const script = document.createElement('script');
  script.src = 'components/commonAI.js';
  script.onload = () => { window.commonAILoaded = true; };
  document.head.appendChild(script);
}

// Edit this prompt to instruct the AI on how to answer user messages for ServiInfo
window.SERVI_AI_PROMPT = window.SERVI_AI_PROMPT || `You are an AI service directory advisor for Yola, Adamawa State, Nigeria.
Help users find professional services, service providers, and skilled workers.

### Analysis Capabilities:
- **Image Analysis**: Analyze images of service work or service-related documents
  - Identify types of services shown (plumbing, electrical, construction, etc.)
  - Recommend appropriate service providers for similar work
  - Assess quality of work from photos
- **Audio Analysis**: Listen to service inquiries and requests
  - Transcribe service requirements from voice messages
  - Recommend appropriate service providers
- **Document Analysis**: Review service quotes, proposals, invoices
  - Compare service quotes and pricing
  - Verify legitimacy of service providers

### Service Categories:
- Plumbing, electrical, and maintenance services
- Construction and renovation services
- Cleaning and sanitation services
- Transportation and logistics services
- IT and technical services
- Beauty, hair, and personal care services
- Automotive and mechanic services
- Home and furniture services

### Response Guidelines:
- Provide comprehensive service provider information
- For images: Identify service type and recommend qualified providers
- For audio: Transcribe service needs and recommend providers
- Include ratings, contact info, and pricing estimates
- If info unavailable: "Sorry, I don't have that specific information. Please contact a local service directory for further help."

### Section Referrals:
- Health → MediInfo | Education → EduInfo | Community → CommunityInfo | Navigation → NaviInfo | Agriculture → AgroInfo`;

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

      // Initialize currency converter with new card-based UI
      if (typeof window.initCurrencyConverter === 'function') {
        try { window.initCurrencyConverter(); } catch (e) { console.error('initCurrencyConverter failed:', e); }
      }
  }).catch(err => {
    console.error('Failed to load servi template:', err);
    document.getElementById('main-content').innerHTML = '<p>Failed to load content.</p>';
  });
};

// stopServiResponse is now handled by setupStopButton in commonAI.js

// Common helper for Gemini API call - delegate to centralized commonAI
async function getGeminiAnswer(localData, msg, apiKey, imageData = null, signal = null) {
  return window.callGeminiAI(localData, msg, apiKey, imageData, signal, 'servi');
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
    <div style="align-self: flex-end"> ${attach ? "<br>" + attach : ""} </div>
    <div class='user-msg' data-msg-id='${mid}'>${msg}</div>
    <div class='ai-msg' data-msg-id='${mid}'><span class='ai-msg-text'>Servi AI typing...</span></div>
  `;
  chat.appendChild(msgGroup);
  window.clearPreviewAndRemoveBtn(preview);
  if (!faqText) input.value = '';

  let finalAnswer = "";
  try {
    const signal = window.serviAbortController ? window.serviAbortController.signal : null;

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

    // Define all known HTML files in details/Servi
    const htmlFileNames = [
      'alumintech-solutions.html', 'atm-aluminium.html', 'bitbyte-technologies.html', 'cac.html', 
      'evans-carpentry.html', 'homeserve-plumbing.html', 'ict-republic.html', 'jabbama-electronics.html', 
      'modern-electric.html', 'nde.html', 'nipost.html', 'novelty-glass-aluminium.html', 
      'pc-klinic.html', 'pure-life.html', 'quality-plumbing.html', 'redcross.html', 
      'rhs-woodworks.html', 'rm-photography.html', 'sj-graphics.html', 'virtual-assistance-freelancers.html', 
      'worksmanship-furniture.html', 'ymca.html', 'yola-plumbers.html', 'yola-power-services.html'
    ];

    // Fetch HTML content from language directories
    const allHtmlPromises = [];
    for (const langDir of uniqueLangDirs) {
      for (const fileName of htmlFileNames) {
        const filePath = `details/Servi/${langDir}/${fileName}`;
        allHtmlPromises.push(
          fetch(filePath, signal ? { signal } : {})
            .then(res => res.ok ? res.text().then(text => `\n--- ${fileName} (${langDir}) ---\n${text}`) : '')
            .catch(() => '')
        );
      }
    }

    const allLocalData = (await Promise.all(allHtmlPromises)).filter(content => content.length > 0).join('\n');

    // Ensure in-memory history exists for servi
    window.initChatHistory && window.initChatHistory('servi', 10);
    // Reserve slot for user message (AI will be added after response)
    window.addToChatHistory && window.addToChatHistory('servi', 'user', msg);

    // Get chat history context from in-memory helper
    const historyPairs = window.getQAHistoryForSection ? window.getQAHistoryForSection('servi', 5) : [];
    const historyContext = historyPairs.length > 0 ? '\n\nRecent chat history:\n' + historyPairs.map(h => `User: ${h.user}\nAI: ${h.ai}`).join('\n\n') : '';
    
    // Combine all local data
    const allLocalDataWithHistory = allLocalData + historyContext;

    finalAnswer = await window.callGeminiAI(allLocalDataWithHistory, msg, window.GEMINI_API_KEY, mediaData, signal, 'servi', attachments);
    // Add AI response to in-memory history
    window.addToChatHistory && window.addToChatHistory('servi', 'assistant', finalAnswer);
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

// Currency Converter - Card Based UI
window._exchangeRatesCache = window._exchangeRatesCache || {};

// Predefined currency data with flag URLs and names
const currencyData = {
  'USD': { name: 'US Dollar', symbol: 'USD' },
  'EUR': { name: 'Euro', symbol: 'EUR' },
  'GBP': { name: 'British Pound', symbol: 'GBP' },
  'JPY': { name: 'Japanese Yen', symbol: 'JPY' },
  'NGN': { name: 'Nigerian Naira', symbol: 'NGN' },
  'CAD': { name: 'Canadian Dollar', symbol: 'CAD' },
  'AUD': { name: 'Australian Dollar', symbol: 'AUD' },
  'CHF': { name: 'Swiss Franc', symbol: 'CHF' },
  'CNY': { name: 'Chinese Yuan', symbol: 'CNY' },
  'INR': { name: 'Indian Rupee', symbol: 'INR' },
  'ZAR': { name: 'South African Rand', symbol: 'ZAR' },
  'XAF': { name: 'CFA Franc', symbol: 'XAF' },
  'KES': { name: 'Kenyan Shilling', symbol: 'KES' },
  'GHS': { name: 'Ghanaian Cedi', symbol: 'GHS' }
};

async function getRatesForBase(base) {
  if (!base) return null;
  const cached = window._exchangeRatesCache[base];
  const now = Date.now();
  if (cached && (now - cached.ts) < 1000 * 60 * 60) { // 1 hour cache
    return cached.rates;
  }
  // Try multiple public endpoints to improve reliability
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
      const rates = data.rates || data.conversion_rates || data['conversion_rates'];
      if (rates && typeof rates === 'object') {
        window._exchangeRatesCache[base] = { rates: rates, ts: now };
        return rates;
      }
      console.warn('getRatesForBase: endpoint returned unexpected payload', url, data);
    } catch (err) {
      console.warn('getRatesForBase fetch failed for endpoint, trying next:', err);
      continue;
    }
  }
  console.error('getRatesForBase error: all endpoints failed or returned invalid data');
  return null;
}

window.initCurrencyConverter = async function() {
  const converter = document.querySelector('.currency-converter');
  if (!converter) {
    console.warn('Currency converter element not found');
    return;
  }

  const cards = Array.from(converter.querySelectorAll('.converted-card'));
  if (cards.length < 3) {
    console.warn('Expected at least 3 currency cards for converter');
    return;
  }

  const currencyOptions = Object.keys(currencyData);
  const cardStates = cards.map(card => ({
    card,
    select: card.querySelector('.currency-card-select'),
    amountInput: card.querySelector('.currency-card-amount'),
    flagImg: card.querySelector('img.flag-img-sm'),
    titleEl: card.querySelector('.currency-card-title'),
    nameEl: card.querySelector('.currency-card-name'),
    valueDisplay: card.querySelector('.currency-card-value'),
    rateDisplay: card.querySelector('.currency-rate')
  }));

  if (cardStates.some(state => !state.select || !state.amountInput || !state.valueDisplay || !state.rateDisplay)) {
    console.warn('Currency card markup is missing required elements');
    return;
  }

  const defaultCurrencies = ['EUR', 'GBP', 'JPY'];
  cardStates.forEach((state, index) => {
    state.select.innerHTML = '';
    currencyOptions.forEach(code => {
      const option = document.createElement('option');
      option.value = code;
      option.textContent = code;
      state.select.appendChild(option);
    });

    const selected = defaultCurrencies[index] || currencyOptions[0];
    state.select.value = selected;
    state.amountInput.value = index === 0 ? '1.00' : '';
    updateCurrencyCardLabels(state);
  });

  const rates = await getRatesForBase('USD');
  if (!rates) {
    console.error('Unable to initialize currency converter because exchange rates could not be fetched.');
    return;
  }

  const formatDisplayValue = value => {
    if (!Number.isFinite(value)) return '0.00';
    return value >= 1000 ? value.toLocaleString('en-US', { maximumFractionDigits: 2 }) : value.toFixed(2);
  };

  const formatInputValue = value => {
    return Number.isFinite(value) ? value.toFixed(2) : '';
  };

  const recalcFrom = activeIndex => {
    const activeState = cardStates[activeIndex];
    const activeCurrency = activeState.select.value;
    const activeAmount = parseFloat(activeState.amountInput.value);

    if (isNaN(activeAmount) || activeState.amountInput.value === '') {
      cardStates.forEach(state => {
        state.amountInput.value = '';
        state.valueDisplay.textContent = '0.00';
      });
      return;
    }

    const activeRate = rates[activeCurrency];
    if (!Number.isFinite(activeRate) || activeRate === 0) {
      console.warn(`No rate available for ${activeCurrency}`);
      return;
    }

    const usdAmount = activeAmount / activeRate;

    cardStates.forEach((state, index) => {
      const currency = state.select.value;
      const rate = rates[currency];
      const converted = Number.isFinite(rate) ? usdAmount * rate : 0;
      state.valueDisplay.textContent = formatDisplayValue(converted);
      state.rateDisplay.textContent = `1 USD = ${Number.isFinite(rate) ? rate.toFixed(4) : '0.0000'} ${currency}`;
      if (index !== activeIndex) {
        state.amountInput.value = formatInputValue(converted);
      }
    });
  };

  function updateCurrencyCardLabels(state) {
    const code = state.select.value;
    const info = currencyData[code] || { name: code, symbol: code };
    state.titleEl.textContent = info.symbol || code;
    state.nameEl.textContent = info.name || code;
    state.flagImg.alt = `${code} flag`;
  }

  cardStates.forEach((state, index) => {
    state.select.addEventListener('change', () => {
      updateCurrencyCardLabels(state);
      recalcFrom(index);
    });
    state.amountInput.addEventListener('input', () => recalcFrom(index));
    state.amountInput.addEventListener('change', () => recalcFrom(index));
  });

  recalcFrom(0);
};

// Legacy functions retained for compatibility
if (!window.populateDropdown) {
  window.populateDropdown = (dropdownId) => {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) {
      console.error(`Dropdown with ID '${dropdownId}' not found.`);
      return;
    }
    if (!window.currencies) {
      window.currencies = [
        'USD', 'NGN', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'ZAR', 'XAF'
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

