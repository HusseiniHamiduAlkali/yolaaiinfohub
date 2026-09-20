// Central Yola AI Chat page handler
// This file now contains the standalone chat page logic.
const STORAGE_KEY_BASE = 'yola-threads-v1';
const ACTIVE_KEY_BASE = 'yola-active-thread';
const THEME_KEY = 'yola-theme';
const DEFAULT_MODEL = 'google/gemini-3.6-flash';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function getApiBase() {
  try {
    if (window.API_BASE) return String(window.API_BASE).replace(/\/$/, '');
    if (window.__APP_API_BASE__) return String(window.__APP_API_BASE__).replace(/\/$/, '');
    const stored = sessionStorage.getItem('yola-api-base') || localStorage.getItem('yola-api-base');
    if (stored) return String(stored).replace(/\/$/, '');

    const { protocol, hostname, port } = window.location;
    const isProductionStaticHost = /netlify\.app|yolaaiinfohub/i.test(hostname || '');
    const isLocalHost = ['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(hostname) || hostname.startsWith('192.') || hostname.startsWith('10.');
    if (isProductionStaticHost) {
      return 'https://yolaaiinfohub-authentication.onrender.com';
    }
    if (isLocalHost) {
      if (port === '4000') return `${protocol}//${hostname}:${port}`;
      const fallbackHost = hostname === '127.0.0.1' || hostname === '0.0.0.0' ? '127.0.0.1' : 'localhost';
      return `${protocol}//${fallbackHost}:4000`;
    }
    return `${protocol}//${hostname}${port ? ':' + port : ''}`;
  } catch {
    return '';
  }
}

function buildApiUrl(path) {
  const base = getApiBase();
  if (!base) return path;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

function getLoggedInUsername() {
  try {
    if (window.currentUser && window.currentUser.username) {
      return window.currentUser.username;
    }
    const stored = localStorage.getItem('currentUser');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed && parsed.username ? parsed.username : null;
  } catch (e) {
    return null;
  }
}

function getUserStorageKey(base) {
  const user = getLoggedInUsername();
  return user ? `${base}-${user}` : base;
}

function loadThreads() {
  try {
    const key = getUserStorageKey(STORAGE_KEY_BASE);
    let raw = localStorage.getItem(key);
    if (!raw && key !== STORAGE_KEY_BASE) {
      raw = localStorage.getItem(STORAGE_KEY_BASE);
    }
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveThreads() {
  const key = getUserStorageKey(STORAGE_KEY_BASE);
  localStorage.setItem(key, JSON.stringify(state.threads));
}

function loadActiveId() {
  const key = getUserStorageKey(ACTIVE_KEY_BASE);
  let id = localStorage.getItem(key);
  if (!id && key !== ACTIVE_KEY_BASE) {
    id = localStorage.getItem(ACTIVE_KEY_BASE);
  }
  return id;
}

function saveActiveId(id) {
  if (!id) return;
  const key = getUserStorageKey(ACTIVE_KEY_BASE);
  localStorage.setItem(key, id);
}

const state = {
  threads: [],
  activeId: null,
  attachments: [],
  starMode: false,
  liveCall: { active: false, muted: false, timer: null, seconds: 0, stream: null, socket: null, inputContext: null, outputContext: null, source: null, processor: null, inputReady: false, greetingPending: false, userAudioEnabled: false, micEnableTimer: null, playbackStarted: false, outputTime: 0 },
  currentAbort: null,
};

function newId() {
  return 't_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function createThread(initial = {}) {
  const t = {
    id: newId(),
    title: 'New chat',
    model: DEFAULT_MODEL,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
    starred: [],
    ...initial,
  };
  state.threads.unshift(t);
  saveThreads();
  return t;
}

function activeThread() {
  return state.threads.find((t) => t.id === state.activeId);
}

function boot() {
  if (!document.querySelector('#composer')) {
    if (!window.__chatBootTimer) {
      window.__chatBootTimer = window.setTimeout(() => {
        window.__chatBootTimer = null;
        boot();
      }, 50);
    }
    return;
  }

  if (window.__chatBooted) return;
  window.__chatBooted = true;

  const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);

  state.threads = loadThreads();
  let active = loadActiveId();
  if (!state.threads.length) {
    const t = createThread();
    active = t.id;
  } else if (!active || !state.threads.find((t) => t.id === active)) {
    active = state.threads[0].id;
  }
  state.activeId = active;
  saveActiveId(active);

  wireEvents();
  renderThreads();
  renderActive();
}

window.boot = boot;
window.sendMessage = sendMessage;
window.wireEvents = wireEvents;
window.toggleOptions = toggleOptions;
window.doOptionAction = doOptionAction;
window.startLiveCall = startLiveCall;
window.toggleMute = toggleMute;
window.endLiveCall = endLiveCall;

function renderThreads() {
  const list = $('#thread-list');
  if (!list) return;
  list.innerHTML = '';
  for (const t of state.threads) {
    const item = document.createElement('div');
    item.className = 'thread-item' + (t.id === state.activeId ? ' active' : '');
    item.dataset.id = t.id;
    const preview = t.messages.find((m) => m.role === 'user')?.content?.slice?.(0, 60) || 'No messages yet';
    item.innerHTML = `
      <div style="min-width:0">
        <div class="thread-title"></div>
        <div class="thread-meta"></div>
      </div>
      <button class="thread-delete" title="Delete chat" aria-label="Delete chat">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
      </button>
    `;
    item.querySelector('.thread-title').textContent = t.title || 'New chat';
    item.querySelector('.thread-meta').textContent = preview;
    item.addEventListener('click', (e) => {
      if (e.target.closest('.thread-delete')) return;
      switchThread(t.id);
      closeSidebarMobile();
    });
    item.querySelector('.thread-delete').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteThread(t.id);
    });
    list.appendChild(item);
  }
}

function switchThread(id) {
  state.activeId = id;
  saveActiveId(id);
  state.attachments = [];
  renderAttachments();
  renderThreads();
  renderActive();
}

function deleteThread(id) {
  if (!confirm('Delete this chat?')) return;
  state.threads = state.threads.filter((t) => t.id !== id);
  if (!state.threads.length) createThread();
  if (state.activeId === id) state.activeId = state.threads[0].id;
  saveActiveId(state.activeId);
  saveThreads();
  renderThreads();
  renderActive();
}

function renderActive() {
  const t = activeThread();
  if (!t) return;
  const modelSelect = $('#model-select');
  if (modelSelect) modelSelect.value = t.model || DEFAULT_MODEL;
  const box = $('#messages');
  if (!box) return;
  box.innerHTML = '';
  if (!t.messages.length) {
    const tpl = $('#empty-state-tpl')?.content.cloneNode(true);
    if (tpl) {
      box.appendChild(tpl);
      $$('.faq-chip', box).forEach((chip) => {
        chip.addEventListener('click', () => {
          $('#input').value = chip.dataset.prompt;
          sendMessage();
        });
      });
    }
  } else {
    for (const m of t.messages) box.appendChild(renderMessage(m));
    scrollToBottom();
  }
}

function renderMessage(m) {
  const wrap = document.createElement('div');
  wrap.className = 'msg ' + m.role;
  wrap.dataset.id = m.id;
  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  if (m.role === 'assistant') {
    //avatar.innerHTML = `<img src="Data/Images/yolarflogo.jpg" alt="AI" />`;
    avatar.innerHTML = `<div>AI</div>`;
  } else {
    avatar.textContent = 'You';
  }
  const bubble = document.createElement('div');
  const t = activeThread();
  bubble.className = 'bubble' + (t?.starred?.includes(m.id) ? ' starred' : '');
  bubble.addEventListener('click', () => {
    if (!state.starMode) return;
    toggleStar(m.id);
  });

  if (m.attachments?.length) {
    for (const a of m.attachments) {
      if (a.kind === 'image') {
        const img = document.createElement('img');
        img.className = 'attachment';
        img.src = a.dataUrl;
        img.alt = a.name || 'image';
        bubble.appendChild(img);
      } else {
        const chip = document.createElement('span');
        chip.className = 'file-chip';
        chip.textContent = '📎 ' + (a.name || 'file');
        bubble.appendChild(chip);
      }
    }
  }

  const body = document.createElement('div');
  body.className = 'msg-body';
  body.innerHTML = renderMarkdown(m.content || '');
  bubble.appendChild(body);

  if (m.role === 'assistant') {
    const actions = document.createElement('div');
    actions.className = 'msg-actions';
    actions.innerHTML = `
      <button type="button" class="msg-action-btn copy-btn" title="Copy answer" aria-label="Copy answer">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
      </button>
      <button type="button" class="msg-action-btn speak-btn" title="Read aloud" aria-label="Read aloud">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9v6h4l5 5V4L7 9H3z"></path><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a9 9 0 0 1 0 12.73"></path></svg>
      </button>
      <button type="button" class="msg-action-btn delete-btn" title="Delete response" aria-label="Delete response">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M8 6V4h8v2"></path></svg>
      </button>
    `;
    const copyBtn = actions.querySelector('.copy-btn');
    const speakBtn = actions.querySelector('.speak-btn');
    const deleteBtn = actions.querySelector('.delete-btn');

    copyBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      copyAIResponse(m.id, bubble);
    });
    speakBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      speakAIResponse(m.id, bubble);
    });
    deleteBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      deleteAIResponse(m.id);
    });

    bubble.appendChild(actions);
  }

  const time = document.createElement('div');
  time.className = 'msg-time';
  time.textContent = formatTime(m.createdAt);

  const col = document.createElement('div');
  col.style.cssText = 'display:flex;flex-direction:column;min-width:0;max-width:100%; margin-top: 6px';
  col.appendChild(bubble);
  col.appendChild(time);

  wrap.appendChild(avatar);
  wrap.appendChild(col);
  return wrap;
}

function renderMarkdown(text) {
  if (!text) return '';
  try {
    const html = window.marked.parse(text, { breaks: true });
    return window.DOMPurify.sanitize(html);
  } catch {
    return escapeHtml(text);
  }
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function scrollToBottom() {
  const box = $('#messages');
  if (!box) return;
  box.scrollTop = box.scrollHeight;
}

function getFriendlyErrorMessage(err) {
  const detail = String(err?.message || err?.detail || err?.error || '').trim();
  const lower = detail.toLowerCase();
  const status = Number(err?.status || 0);

  if (status === 401 || lower.includes('unauthorized') || lower.includes('api key')) {
    return 'Authentication failed. Please check your AI API credentials.';
  }
  if (status === 403 || lower.includes('forbidden') || lower.includes('permission')) {
    return 'Access denied. Please check your API access permissions.';
  }
  if (status === 404 || lower.includes('not found') || lower.includes('endpoint')) {
    return 'AI service endpoint not found. Please refresh and try again.';
  }
  if (status === 405 || lower.includes('method not allowed')) {
    return 'The chat service is currently unavailable. Please try again shortly.';
  }
  if (status === 429 || lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Rate limit reached — please slow down or try again in a moment.';
  }
  if (status === 402 || lower.includes('credits') || lower.includes('credit')) {
    return 'AI credits exhausted — add credits in workspace billing.';
  }
  if (status === 503 || lower.includes('service unavailable') || lower.includes('temporarily unavailable')) {
    return 'AI service unavailable. Please try again shortly.';
  }
  if (status >= 500 || lower.includes('server') || lower.includes('internal error')) {
    return 'Unexpected server error. Please try again later.';
  }
  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('fetch')) {
    return 'Network error. Please check your internet connection.';
  }
  if (lower.includes('aborted') || lower.includes('abort')) {
    return 'Request cancelled.';
  }
  return 'Unable to send your message. Please try again.';
}

function toggleStar(msgId) {
  const t = activeThread();
  if (!t) return;
  t.starred ??= [];
  const idx = t.starred.indexOf(msgId);
  if (idx >= 0) t.starred.splice(idx, 1);
  else t.starred.push(msgId);
  saveThreads();
  renderActive();
}

async function sendMessage() {
  const input = $('#input');
  if (!input) return;
  const text = input.value.trim();
  if (!text && !state.attachments.length) return;
  const t = activeThread();
  if (!t) return;

  const userMsg = {
    id: 'm_' + Math.random().toString(36).slice(2, 10),
    role: 'user',
    content: text,
    createdAt: Date.now(),
    attachments: state.attachments.slice(),
  };
  t.messages.push(userMsg);
  if (t.messages.filter((m) => m.role === 'user').length === 1) {
    t.title = text.slice(0, 40) || 'New chat';
  }
  t.updatedAt = Date.now();

  input.value = '';
  autoGrow(input);
  const attachmentsForRequest = state.attachments.slice();
  state.attachments = [];
  renderAttachments();

  saveThreads();
  renderThreads();
  renderActive();

  const aiMsg = {
    id: 'm_' + Math.random().toString(36).slice(2, 10),
    role: 'assistant',
    content: '',
    createdAt: Date.now(),
  };
  t.messages.push(aiMsg);
  const box = $('#messages');
  if (!box) return;
  const el = renderMessage(aiMsg);
  const bodyEl = el.querySelector('.msg-body');
  bodyEl.innerHTML = `<span class="typing"><span></span><span></span><span></span></span>`;
  box.appendChild(el);
  scrollToBottom();

  const payloadMessages = t.messages
    .filter((m) => m.id !== aiMsg.id)
    .map((m) => {
      const parts = [];
      if (m.content) parts.push({ type: 'text', text: m.content });
      if (m.attachments?.length) {
        for (const a of m.attachments) {
          parts.push({ type: 'file', url: a.dataUrl, mediaType: a.mime || (a.kind === 'image' ? 'image/png' : 'application/octet-stream'), filename: a.name });
        }
      }
      if (m.id === userMsg.id && attachmentsForRequest.length && !m.attachments?.length) {
        for (const a of attachmentsForRequest) {
          parts.push({ type: 'file', url: a.dataUrl, mediaType: a.mime || 'application/octet-stream', filename: a.name });
        }
      }
      return { id: m.id, role: m.role, parts };
    });

  const latestUserText = (payloadMessages.findLast?.((m) => m.role === 'user')?.parts || [])
    .filter((part) => part?.type === 'text')
    .map((part) => part.text || '')
    .join(' ')
    .trim();

  const debugHint = latestUserText
    ? `\n\n[System hint] The user is asking about: "${latestUserText}". When answering, search the local project files for this exact name or closely related terms before saying the local data is empty.`
    : '';

  const requestBody = {
    model: t.model || DEFAULT_MODEL,
    messages: payloadMessages.map((message) => ({
      ...message,
      parts: message.parts.map((part) => ({ ...part }))
    }))
  };

  if (latestUserText) {
    requestBody.messages = [
      {
        id: 'system-local-context',
        role: 'user',
        parts: [{ type: 'text', text: debugHint }],
      },
      ...requestBody.messages,
    ];
  }

  const controller = new AbortController();
  state.currentAbort = controller;

  try {
    const res = await fetch(buildApiUrl('/api/chat'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      const detail = errText || `Request failed with status ${res.status}`;
      let errorMessage = detail;
      try {
        const parsed = JSON.parse(errText);
        errorMessage = parsed.error || parsed.message || detail;
      } catch {
        errorMessage = detail;
      }
      const error = new Error(errorMessage || `HTTP ${res.status}`);
      error.status = res.status;
      error.detail = errorMessage;
      throw error;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let acc = '';
    bodyEl.innerHTML = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      acc += chunk;
      aiMsg.content = acc;
      bodyEl.innerHTML = renderMarkdown(acc);
      scrollToBottom();
    }
    if (!acc) {
      aiMsg.content = '_(no response)_';
      bodyEl.innerHTML = renderMarkdown(aiMsg.content);
    }
  } catch (err) {
    console.error(err);
    const msg = getFriendlyErrorMessage(err);
    aiMsg.content = `⚠️ ${msg}`;
    bodyEl.innerHTML = renderMarkdown(aiMsg.content);
    showToast(msg);
  } finally {
    state.currentAbort = null;
    t.updatedAt = Date.now();
    saveThreads();
    renderThreads();
    if (state.liveCall.active && aiMsg.content && !aiMsg.content.startsWith('⚠️')) {
      speakAndContinue(aiMsg.content);
    }
  }
}

function getMessageText(messageId) {
  const t = activeThread();
  if (!t) return '';
  const msg = t.messages.find((item) => item.id === messageId);
  return msg?.content || '';
}

function copyAIResponse(messageId, bubbleEl) {
  const text = bubbleEl?.querySelector('.msg-body')?.textContent?.trim() || getMessageText(messageId);
  if (!text) {
    showToast('Nothing to copy.');
    return;
  }
  navigator.clipboard.writeText(text).then(() => {
    showToast('AI message copied.');
  }).catch((err) => {
    console.warn('Copy failed:', err);
    showToast('Copy failed.');
  });
}

function speakAIResponse(messageId, bubbleEl) {
  const text = bubbleEl?.querySelector('.msg-body')?.textContent?.trim() || getMessageText(messageId);
  if (!text) {
    showToast('Nothing to speak.');
    return;
  }
  if (!window.speechSynthesis) {
    showToast('Speech synthesis is not supported in this browser.');
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  window.speechSynthesis.speak(utterance);
}

function deleteAIResponse(messageId) {
  if (!confirm('Delete this prompt and its reply? This action cannot be undone.')) return;
  const t = activeThread();
  if (!t) return;

  const index = t.messages.findIndex((item) => item.id === messageId);
  if (index === -1) return;

  const removeIndexes = [index];
  const previousIndex = index > 0 ? index - 1 : -1;
  if (previousIndex >= 0 && t.messages[previousIndex].role === 'user') {
    removeIndexes.push(previousIndex);
  }

  const sortedIndexes = [...new Set(removeIndexes)].sort((a, b) => b - a);
  for (const removeIndex of sortedIndexes) {
    t.messages.splice(removeIndex, 1);
  }

  if (!t.messages.length) {
    t.title = 'New chat';
  }

  t.updatedAt = Date.now();
  saveThreads();
  renderThreads();
  renderActive();
}

function renderAttachments() {
  const box = $('#attachments-preview');
  if (!box) return;
  box.innerHTML = '';
  state.attachments.forEach((a, i) => {
    const chip = document.createElement('span');
    chip.className = 'attachment-chip';
    if (a.kind === 'image') {
      chip.innerHTML = `<img src="${a.dataUrl}" alt="" /><span>${escapeHtml(a.name || 'image')}</span><button aria-label="Remove">×</button>`;
    } else {
      chip.innerHTML = `<span>📎 ${escapeHtml(a.name || 'file')}</span><button aria-label="Remove">×</button>`;
    }
    chip.querySelector('button').addEventListener('click', () => {
      state.attachments.splice(i, 1);
      renderAttachments();
    });
    box.appendChild(chip);
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function handleFile(file) {
  if (!file) return;
  if (!window.FileReader) {
    showToast('File upload is not supported in this browser.');
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    showToast('File is over 8MB — please pick a smaller one.');
    return;
  }
  const dataUrl = await fileToDataUrl(file);
  const kind = file.type.startsWith('image/') ? 'image' : 'file';
  state.attachments.push({ kind, name: file.name, mime: file.type, dataUrl });
  renderAttachments();
}

let recorder = null;
let recordChunks = [];
async function toggleRecord() {
  const btn = $('#record-btn');
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showToast('Microphone access is not available in this browser.');
    return;
  }
  if (typeof MediaRecorder === 'undefined') {
    showToast('Audio recording is not supported in this browser.');
    return;
  }
  if (recorder && recorder.state === 'recording') {
    recorder.stop();
    btn?.classList.remove('recording');
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordChunks = [];
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => recordChunks.push(e.data);
    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(recordChunks, { type: recorder.mimeType || 'audio/webm' });
      await transcribeAndInsert(blob);
    };
    recorder.start();
    btn?.classList.add('recording');
    showToast('Recording — tap the mic again to stop.');
  } catch (e) {
    console.error(e);
    showToast('Microphone permission denied or unavailable.');
  }
}

async function transcribeAndInsert(blob) {
  const form = new FormData();
  const ext = blob.type.includes('mp4') ? 'm4a' : 'webm';
  form.append('file', blob, `voice.${ext}`);
  showToast('Transcribing…');
  try {
    const res = await fetch(buildApiUrl('/api/transcribe'), { method: 'POST', body: form });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    const text = data.text || '';
    const input = $('#input');
    if (input) {
      input.value = (input.value + ' ' + text).trim();
      autoGrow(input);
    }
    hideToast();
    if (state.liveCall.active && text) sendMessage();
  } catch (e) {
    console.error(e);
    showToast('Transcription failed.');
  }
}

async function startLiveCall() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showToast('Microphone access is not available in this browser.');
    return;
  }
  if (!window.AudioContext && !window.webkitAudioContext) {
    showToast('Live audio is not supported in this browser.');
    return;
  }
  if (state.liveCall.active) return endLiveCall();

  const lc = state.liveCall;
  try {
    const socketUrl = buildLiveSocketUrl();
    if (!socketUrl) {
      showToast('Live voice is unavailable on this host. The Render backend must be active for Gemini Live.');
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    lc.inputContext = new AudioContextClass();
    lc.outputContext = new AudioContextClass();
    await Promise.all([lc.inputContext.resume(), lc.outputContext.resume()]);
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    });
    const socket = new WebSocket(socketUrl);
    lc.active = true;
    lc.userAudioEnabled = false;
    lc.stream = stream;
    lc.socket = socket;
    lc.seconds = 0;
    $('#live-call-bar')?.removeAttribute('hidden');
    updateCallDuration();
    lc.timer = setInterval(() => {
      lc.seconds++;
      updateCallDuration();
    }, 1000);

    socket.addEventListener('open', () => showToast('Connecting to Gemini Live…'));
    socket.addEventListener('message', async (event) => {
      const data = typeof event.data === 'string' ? event.data : await event.data.text();
      handleLiveMessage(lc, data);
    });
    socket.addEventListener('error', () => showToast('Gemini Live connection failed.'));
    socket.addEventListener('close', (event) => {
      console.warn('Gemini Live socket closed before session started:', event.code, event.reason || 'no reason');
      if (lc.active) endLiveCall();
    });
  } catch (e) {
    console.error(e);
    streamCleanup(lc);
    showToast('Cannot access microphone or live audio capture.');
  }
}

function buildLiveSocketUrl() {
  const base = getApiBase();
  if (!base) return '';

  try {
    const parsed = new URL(base);
    const isProductionStaticHost = /netlify\.app|yolaaiinfohub/i.test(window.location.hostname || '');
    const isBackendHost = /onrender\.com|localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(parsed.hostname || '');
    if (isProductionStaticHost && !isBackendHost) return '';

    const url = new URL(`${parsed.origin}/api/live`);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return url.toString();
  } catch {
    return '';
  }
}

function setupLiveAudioInput(lc) {
  if (lc.inputReady || !lc.inputContext || !lc.stream) return;
  if (lc.source) lc.source.disconnect();
  const context = lc.inputContext;
  lc.source = context.createMediaStreamSource(lc.stream);
  const silentOutput = context.createGain();
  silentOutput.gain.value = 0;
  if (context.audioWorklet && typeof AudioWorkletNode !== 'undefined') {
    const workletCode = `class YolaMicProcessor extends AudioWorkletProcessor {
      process(inputs, outputs) {
        const input = inputs[0] && inputs[0][0];
        if (input && input.length) this.port.postMessage(input.slice(0));
        const output = outputs[0] && outputs[0][0];
        if (output) output.fill(0);
        return true;
      }
    }
    registerProcessor('yola-mic-processor', YolaMicProcessor);`;
    const moduleUrl = URL.createObjectURL(new Blob([workletCode], { type: 'application/javascript' }));
    context.audioWorklet.addModule(moduleUrl).then(() => {
      URL.revokeObjectURL(moduleUrl);
      if (!lc.active || lc.inputReady) return;
      lc.processor = new AudioWorkletNode(context, 'yola-mic-processor');
      lc.processor.port.onmessage = (event) => sendLivePcm(lc, event.data, context.sampleRate);
      lc.source.connect(lc.processor);
      lc.processor.connect(silentOutput);
      silentOutput.connect(context.destination);
      lc.inputReady = true;
      lc.userAudioEnabled = true;
    }).catch((error) => {
      URL.revokeObjectURL(moduleUrl);
      console.error('AudioWorklet setup failed:', error);
      setupScriptProcessorFallback(lc, context, silentOutput);
    });
    return;
  }
  setupScriptProcessorFallback(lc, context, silentOutput);
}

function sendLivePcm(lc, input, sampleRate) {
  if (!lc.active || lc.muted || !lc.userAudioEnabled || !lc.socket || lc.socket.readyState !== WebSocket.OPEN) return;
  const pcm = resampleToPcm16(input, sampleRate, 16000);
  if (pcm.length) {
    lc.socket.send(JSON.stringify({ realtimeInput: { audio: { data: arrayBufferToBase64(pcm), mimeType: 'audio/pcm;rate=16000' } } }));
    const status = $('#live-status');
    if (status) status.textContent = 'Listening…';
  }
}

function setupScriptProcessorFallback(lc, context, silentOutput) {
  if (!lc.active || lc.inputReady) return;
  lc.processor = context.createScriptProcessor(2048, 1, 1);
  lc.processor.onaudioprocess = (event) => {
    sendLivePcm(lc, event.inputBuffer.getChannelData(0), event.inputBuffer.sampleRate);
  };
  lc.source.connect(lc.processor);
  lc.processor.connect(silentOutput);
  silentOutput.connect(context.destination);
  lc.inputReady = true;
  lc.userAudioEnabled = true;
}

function resampleToPcm16(samples, inputRate, outputRate) {
  const ratio = inputRate / outputRate;
  const output = new Int16Array(Math.floor(samples.length / ratio));
  for (let index = 0; index < output.length; index++) {
    const sourceIndex = Math.min(Math.floor(index * ratio), samples.length - 1);
    const sample = Math.max(-1, Math.min(1, samples[sourceIndex]));
    output[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return output.buffer;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  return btoa(binary);
}

function base64ToArrayBuffer(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

function handleLiveMessage(lc, rawData) {
  let message;
  try { message = JSON.parse(rawData); } catch { return; }
  if (message.type === 'live-ready') {
    const configuredModel = window.AI_LIVE_MODEL || 'gemini-3.8-live';
    const model = configuredModel.startsWith('models/') ? configuredModel : `models/${configuredModel}`;
    const safeModel = /gemini-(3\.8-live|3\.5-live-translate-preview)/.test(model) ? model : 'models/gemini-3.8-live';
    lc.socket.send(JSON.stringify({
      setup: {
        model: safeModel,
        generationConfig: { responseModalities: ['AUDIO'] },
        realtimeInputConfig: {
          automaticActivityDetection: {
            disabled: false,
            prefixPaddingMs: 40,
            silenceDurationMs: 700
          }
        },
        systemInstruction: { parts: [{ text: 'You are Yola AI Info Hub voice assistant. Be concise, helpful, and speak naturally.' }] }
      }
    }));
    showToast('Live call started — speak whenever you like.');
    return;
  }
  if (message.type === 'live-error') {
    showToast(message.error || 'Gemini Live is unavailable.');
    return;
  }
  if (message.error) {
    console.error('Gemini Live protocol error:', message.error);
    showToast(message.error.message || 'Gemini Live rejected the audio session.');
    return;
  }
  if (message.setupComplete) {
    lc.greetingPending = true;
    lc.userAudioEnabled = false;
    lc.socket.send(JSON.stringify({
      clientContent: {
        turns: [{ role: 'user', parts: [{ text: 'Hello there. How may I help you?' }] }],
        turnComplete: true
      }
    }));
    const status = $('#live-status');
    if (status) status.textContent = 'Speaking…';
    return;
  }
  const content = message.serverContent;
  if (!content) return;
  if (content.interrupted) {
    lc.outputTime = lc.outputContext ? lc.outputContext.currentTime : 0;
    return;
  }
  for (const part of content.modelTurn?.parts || []) {
    if (part.inlineData?.data) {
      playLiveAudio(lc, base64ToArrayBuffer(part.inlineData.data), part.inlineData.mimeType);
    }
  }
  if (content.modelTurn) {
    const status = $('#live-status');
    if (status) status.textContent = 'Speaking…';
  }
  if (content.turnComplete) {
    if (lc.greetingPending) {
      lc.greetingPending = false;
      const outputContext = lc.outputContext;
      const drainBufferMs = 120;
      const delay = outputContext
        ? Math.max(120, (lc.outputTime - outputContext.currentTime + 0.08) * 1000 + drainBufferMs)
        : 250;
      clearTimeout(lc.micEnableTimer);
      lc.micEnableTimer = setTimeout(() => {
        lc.micEnableTimer = null;
        if (!lc.active) return;
        if (!lc.inputReady) {
          setupLiveAudioInput(lc);
        } else {
          lc.userAudioEnabled = true;
        }
        const status = $('#live-status');
        if (status) status.textContent = 'Listening…';
      }, delay);
    } else {
      lc.userAudioEnabled = true;
      const status = $('#live-status');
      if (status) status.textContent = 'Listening…';
    }
  }
}

function playLiveAudio(lc, pcmBuffer, mimeType) {
  if (!lc.outputContext || !lc.active) return;
  lc.outputContext.resume().catch((error) => console.error('Unable to resume live audio output:', error));
  const samples = new Int16Array(pcmBuffer);
  const rateMatch = String(mimeType || '').match(/rate=(\d+)/i);
  const sampleRate = rateMatch ? Number(rateMatch[1]) : 24000;
  const audioBuffer = lc.outputContext.createBuffer(1, samples.length, sampleRate);
  const channel = audioBuffer.getChannelData(0);
  for (let index = 0; index < samples.length; index++) channel[index] = samples[index] / 0x8000;
  const source = lc.outputContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(lc.outputContext.destination);
  const startupBuffer = lc.playbackStarted ? 0 : 0.035;
  const startAt = Math.max(lc.outputContext.currentTime + startupBuffer, lc.outputTime || 0);
  source.start(startAt);
  lc.outputTime = startAt + audioBuffer.duration;
  lc.playbackStarted = true;
}

function updateCallDuration() {
  const s = state.liveCall.seconds;
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  const el = $('#call-duration');
  if (el) el.textContent = `${mm}:${ss}`;
}

function toggleMute() {
  state.liveCall.muted = !state.liveCall.muted;
  const btn = $('#live-mute-btn');
  const status = $('#live-status');
  if (btn) btn.textContent = state.liveCall.muted ? 'Unmute' : 'Mute';
  if (status) status.textContent = state.liveCall.muted ? 'Muted' : 'Listening…';
}

function endLiveCall() {
  const lc = state.liveCall;
  lc.active = false;
  lc.muted = false;
  clearInterval(lc.timer);
  clearTimeout(lc.micEnableTimer);
  if (lc.socket && lc.socket.readyState === WebSocket.OPEN) {
    lc.socket.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }));
    lc.socket.close();
  }
  if (lc.processor) lc.processor.disconnect();
  if (lc.source) lc.source.disconnect();
  if (lc.inputContext && lc.inputContext.state !== 'closed') lc.inputContext.close();
  if (lc.outputContext && lc.outputContext.state !== 'closed') lc.outputContext.close();
  if (lc.stream) lc.stream.getTracks().forEach((t) => t.stop());
  lc.stream = null;
  lc.socket = null;
  lc.inputContext = null;
  lc.outputContext = null;
  lc.processor = null;
  lc.source = null;
  lc.inputReady = false;
  lc.greetingPending = false;
  lc.userAudioEnabled = false;
  lc.micEnableTimer = null;
  lc.playbackStarted = false;
  lc.outputTime = 0;
  $('#live-call-bar')?.setAttribute('hidden', '');
  const btn = $('#live-mute-btn');
  if (btn) btn.textContent = 'Mute';
}

function streamCleanup(lc) {
  lc.active = false;
  clearTimeout(lc.micEnableTimer);
  if (lc.stream) lc.stream.getTracks().forEach((track) => track.stop());
  if (lc.inputContext && lc.inputContext.state !== 'closed') lc.inputContext.close();
  if (lc.outputContext && lc.outputContext.state !== 'closed') lc.outputContext.close();
  lc.stream = null;
  lc.inputReady = false;
  lc.inputContext = null;
  lc.outputContext = null;
  lc.greetingPending = false;
  lc.userAudioEnabled = false;
  lc.micEnableTimer = null;
  lc.playbackStarted = false;
}

async function speakAndContinue(text) {
  const liveStatus = $('#live-status');
  if (liveStatus) liveStatus.textContent = 'Speaking…';
  try {
    const res = await fetch(buildApiUrl('/api/tts'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.slice(0, 1000) }),
    });
    if (!res.ok) throw new Error(await res.text());
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    await audio.play();
    audio.onended = () => {
      URL.revokeObjectURL(url);
      if (state.liveCall.active) recordChunk();
    };
  } catch (e) {
    if (window.speechSynthesis && typeof window.speechSynthesis.speak === 'function') {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.onend = () => {
        if (state.liveCall.active) recordChunk();
      };
      window.speechSynthesis.speak(utterance);
      return;
    }
    console.error(e);
    showToast('TTS failed.');
    if (state.liveCall.active) recordChunk();
  }
}

function toggleOptions(open) {
  const list = $('#options-list');
  const trigger = $('#options-trigger');
  const isOpen = open ?? !list?.classList.contains('open');
  list?.classList.toggle('open', isOpen);
  trigger?.setAttribute('aria-expanded', String(isOpen));
  if (isOpen) toggleAttachMenu(false);
}

function toggleAttachMenu(open) {
  const list = $('#attach-list');
  const trigger = $('#attach-trigger');
  const isOpen = open ?? !list?.classList.contains('open');
  list?.classList.toggle('open', isOpen);
  trigger?.setAttribute('aria-expanded', String(isOpen));
  if (isOpen) toggleOptions(false);
}

function doAttachAction(action) {
  toggleAttachMenu(false);
  if (action === 'upload-file') {
    $('#file-input')?.click();
  } else if (action === 'capture-image') {
    $('#camera-input')?.click();
  }
}

function doOptionAction(action) {
  toggleOptions(false);
  const t = activeThread();
  if (!t) return;
  if (action === 'toggle-mark') {
    state.starMode = !state.starMode;
    showToast(state.starMode ? 'Star mode ON — tap a message to star it.' : 'Star mode off.');
  } else if (action === 'delete-all') {
    if (!confirm('Delete all messages in this chat?')) return;
    t.messages = [];
    t.starred = [];
    t.title = 'New chat';
    saveThreads();
    renderThreads();
    renderActive();
  } else if (action === 'export') {
    const data = JSON.stringify(t, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${(t.title || 'chat').replace(/[^a-z0-9]+/gi, '-')}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(THEME_KEY, next);
}

function openSidebarMobile() {
  $('#app')?.classList.add('sidebar-open');
}

function closeSidebarMobile() {
  $('#app')?.classList.remove('sidebar-open');
}

function autoGrow(el) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 200) + 'px';
}

let toastTimer = null;
function showToast(msg, duration = 2600) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), duration);
}

function hideToast() {
  clearTimeout(toastTimer);
  const toast = $('#toast');
  if (toast) toast.hidden = true;
}

function wireEvents() {
  $('#new-chat-btn')?.addEventListener('click', () => {
    const t = createThread();
    switchThread(t.id);
    closeSidebarMobile();
    $('#input')?.focus();
  });
  $('#menu-btn')?.addEventListener('click', openSidebarMobile);
  $('#sidebar-close')?.addEventListener('click', closeSidebarMobile);
  $('#sidebar-backdrop')?.addEventListener('click', closeSidebarMobile);

  $('#composer')?.addEventListener('submit', (e) => {
    e.preventDefault();
    sendMessage();
  });
  $('#send-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    sendMessage();
  });
  const input = $('#input');
  input?.addEventListener('input', () => autoGrow(input));
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  $('#model-select')?.addEventListener('change', (e) => {
    const t = activeThread();
    if (!t) return;
    t.model = e.target.value;
    saveThreads();
    const optionText = e.target.selectedOptions?.[0]?.text || t.model;
    showToast(`Model set to ${optionText}`);
  });

  $('#file-input')?.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    for (const f of files) await handleFile(f);
    e.target.value = '';
  });
  $('#camera-input')?.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    for (const f of files) await handleFile(f);
    e.target.value = '';
  });
  $('#record-btn')?.addEventListener('click', toggleRecord);
  $('#live-call-btn')?.addEventListener('click', startLiveCall);
  $('#live-mute-btn')?.addEventListener('click', toggleMute);
  $('#live-end-btn')?.addEventListener('click', endLiveCall);

  $('#options-trigger')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleOptions();
  });
  $$('#options-list li').forEach((li) => {
    li.addEventListener('click', () => doOptionAction(li.dataset.action));
  });
  $('#attach-trigger')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleAttachMenu();
  });
  $$('#attach-list li').forEach((li) => {
    li.addEventListener('click', () => doAttachAction(li.dataset.action));
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.options-menu')) {
      toggleOptions(false);
      toggleAttachMenu(false);
    }
  });

  $('#hide-chat-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    try {
      window.parent.postMessage({ type: 'yola-hide-chat' }, '*');
    } catch (err) {
      console.warn('Unable to postMessage to parent', err);
    }
  });
  document.addEventListener('click', (e) => {
    if (e.target instanceof Element && e.target.closest('#hide-chat-btn')) {
      e.preventDefault();
      try {
        window.parent.postMessage({ type: 'yola-hide-chat' }, '*');
      } catch (err) {
        console.warn('Unable to postMessage to parent', err);
      }
    }
  });

  $('#theme-toggle')?.addEventListener('click', toggleTheme);
  window.addEventListener('load', () => $('#input')?.focus());
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
window.addEventListener('load', boot);
