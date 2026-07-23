// Central Yola AI Chat page handler
// This file now contains the standalone chat page logic.
const STORAGE_KEY_BASE = 'yola-threads-v1';
const ACTIVE_KEY_BASE = 'yola-active-thread';
const THEME_KEY = 'yola-theme';
const DEFAULT_MODEL = 'google/gemini-2.5-flash';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function getApiBase() {
  try {
    if (window.API_BASE) return String(window.API_BASE).replace(/\/$/, '');
    if (window.__APP_API_BASE__) return String(window.__APP_API_BASE__).replace(/\/$/, '');
    const stored = sessionStorage.getItem('yola-api-base') || localStorage.getItem('yola-api-base');
    if (stored) return String(stored).replace(/\/$/, '');

    const { protocol, hostname, port } = window.location;
    const isLocalHost = ['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(hostname) || hostname.startsWith('192.') || hostname.startsWith('10.');
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
  liveCall: { active: false, muted: false, timer: null, seconds: 0, recorder: null, stream: null, chunks: [], loopTimer: null },
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
    avatar.innerHTML = `<img src="Data/Images/yolarflogo.jpg" alt="AI" />`;
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
  col.style.cssText = 'display:flex;flex-direction:column;min-width:0;max-width:100%;';
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

  const controller = new AbortController();
  state.currentAbort = controller;

  try {
    const res = await fetch(buildApiUrl('/api/chat'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: t.model || DEFAULT_MODEL, messages: payloadMessages }),
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
  if (!confirm('Delete this message? This action cannot be undone.')) return;
  const t = activeThread();
  if (!t) return;
  const index = t.messages.findIndex((item) => item.id === messageId);
  if (index === -1) return;
  t.messages.splice(index, 1);
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
  if (typeof MediaRecorder === 'undefined') {
    showToast('Live audio capture is not supported in this browser.');
    return;
  }
  if (state.liveCall.active) return endLiveCall();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.liveCall.active = true;
    state.liveCall.stream = stream;
    state.liveCall.seconds = 0;
    $('#live-call-bar')?.removeAttribute('hidden');
    updateCallDuration();
    state.liveCall.timer = setInterval(() => {
      state.liveCall.seconds++;
      updateCallDuration();
    }, 1000);
    recordChunk();
    showToast('Live call started — speak whenever you like.');
  } catch (e) {
    console.error(e);
    showToast('Cannot access microphone or live audio capture.');
  }
}

function updateCallDuration() {
  const s = state.liveCall.seconds;
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  const el = $('#call-duration');
  if (el) el.textContent = `${mm}:${ss}`;
}

function recordChunk() {
  const lc = state.liveCall;
  if (!lc.active || lc.muted) {
    lc.loopTimer = setTimeout(recordChunk, 800);
    return;
  }
  lc.chunks = [];
  const rec = new MediaRecorder(lc.stream);
  lc.recorder = rec;
  rec.ondataavailable = (e) => lc.chunks.push(e.data);
  rec.onstop = async () => {
    const blob = new Blob(lc.chunks, { type: rec.mimeType || 'audio/webm' });
    if (blob.size > 3000) {
      await transcribeAndInsert(blob);
    } else if (lc.active) {
      recordChunk();
    }
  };
  rec.start();
  const status = $('#live-status');
  if (status) status.textContent = 'Listening…';
  setTimeout(() => {
    if (rec.state === 'recording') rec.stop();
  }, 4000);
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
  clearTimeout(lc.loopTimer);
  if (lc.recorder && lc.recorder.state === 'recording') lc.recorder.stop();
  if (lc.stream) lc.stream.getTracks().forEach((t) => t.stop());
  lc.stream = null;
  $('#live-call-bar')?.setAttribute('hidden', '');
  const btn = $('#live-mute-btn');
  if (btn) btn.textContent = 'Mute';
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
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.options-menu')) toggleOptions(false);
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
