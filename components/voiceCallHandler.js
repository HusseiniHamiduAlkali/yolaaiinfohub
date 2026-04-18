// Voice Call Handler for AI Chat
// Enables live voice calls between user and AI across all sections
// NOTE: API keys must not be embedded into frontend code for security.
// Use a backend proxy or Netlify function that holds the API key.

// API Key placeholder - set via environment variable or backend proxy
window.VOICE_API_KEY = window.VOICE_API_KEY || null;

// Voice Call Manager
window.VoiceCallManager = window.VoiceCallManager || {
  activeCall: null,
  stream: null,
  mediaRecorder: null,
  audioContext: null,
  
  // Initialize voice call for a section
  initializeVoiceCall: async function(section) {
    try {
      // Check if browser supports required APIs
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Your browser does not support voice calls. Please use Chrome, Firefox, Safari, or Edge.');
        return false;
      }

      // Check if API key is configured
      if (!window.VOICE_API_KEY) {
        alert('Voice API not configured. Please set VOICE_API_KEY in your environment variables or admin panel.');
        return false;
      }

      // Request microphone permission
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.activeCall = {
        section: section,
        startTime: Date.now(),
        duration: 0,
        isActive: true,
        isMuted: false
      };

      // Set up audio processing
      this._setupAudioProcessing(section);
      
      // Update UI
      this._updateCallUI(section, true);
      
      return true;
    } catch (err) {
      console.error('Failed to initialize voice call:', err);
      if (err.name === 'NotAllowedError') {
        alert('Microphone permission denied. Please enable microphone access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        alert('No microphone found. Please connect a microphone and try again.');
      }
      return false;
    }
  },

  // Set up audio processing and streaming
  _setupAudioProcessing: function(section) {
    if (!this.stream) return;

    // Create MediaRecorder to capture audio
    const options = { mimeType: 'audio/webm' };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options.mimeType = 'audio/mp4';
    }

    this.mediaRecorder = new MediaRecorder(this.stream, options);
    const audioChunks = [];

    this.mediaRecorder.addEventListener('dataavailable', (event) => {
      audioChunks.push(event.data);
    });

    this.mediaRecorder.addEventListener('stop', () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      this._sendAudioToAI(section, audioBlob);
      audioChunks.length = 0;
    });

    this.mediaRecorder.start();
  },

  // Send audio to AI via backend proxy
  _sendAudioToAI: async function(section, audioBlob) {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice-message.webm');
      formData.append('section', section);
      formData.append('voiceApiKey', window.VOICE_API_KEY);

      // Call backend proxy for voice API
      const response = await fetch((window.API_BASE || '') + '/api/voice-call', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        // Play AI response
        await this._playAIResponse(section, result.audioResponse);
      } else {
        console.error('Voice API error:', result.error);
      }
    } catch (err) {
      console.error('Failed to send audio to AI:', err);
    }
  },

  // Play AI voice response
  _playAIResponse: async function(section, audioUrl) {
    try {
      const audio = new Audio(audioUrl);
      audio.play();
      
      // Show playing indicator
      const indicator = document.querySelector(`#${section}-voice-indicator`);
      if (indicator) {
        indicator.classList.add('playing');
        audio.addEventListener('ended', () => {
          indicator.classList.remove('playing');
        });
      }
    } catch (err) {
      console.error('Failed to play AI response:', err);
    }
  },

  // Update call UI
  _updateCallUI: function(section, isActive) {
    const btn = document.querySelector(`#${section}-voice-call-btn`);
    const indicator = document.querySelector(`#${section}-voice-indicator`);
    const duration = document.querySelector(`#${section}-call-duration`);

    if (btn) {
      btn.classList.toggle('active-call', isActive);
      btn.textContent = isActive ? '🔴 End Call' : '☎️ Voice Call';
    }

    if (indicator) {
      indicator.style.display = isActive ? 'block' : 'none';
    }

    if (isActive && duration) {
      let seconds = 0;
      const interval = setInterval(() => {
        if (!this.activeCall || !this.activeCall.isActive) {
          clearInterval(interval);
          return;
        }
        seconds++;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        duration.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
      }, 1000);
    }
  },

  // Toggle mute
  toggleMute: function(section) {
    if (!this.activeCall) return;
    
    this.activeCall.isMuted = !this.activeCall.isMuted;
    
    if (this.stream) {
      this.stream.getAudioTracks().forEach(track => {
        track.enabled = !this.activeCall.isMuted;
      });
    }

    const muteBtn = document.querySelector(`#${section}-mute-btn`);
    if (muteBtn) {
      muteBtn.classList.toggle('muted', this.activeCall.isMuted);
      muteBtn.textContent = this.activeCall.isMuted ? '🔇 Unmute' : '🔊 Mute';
    }
  },

  // End voice call
  endCall: async function(section) {
    if (!this.activeCall) return;

    try {
      // Stop recording
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }

      // Stop all audio tracks
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }

      // Close audio context
      if (this.audioContext && this.audioContext.state !== 'closed') {
        await this.audioContext.close();
        this.audioContext = null;
      }

      this.activeCall.isActive = false;
      const callDuration = Date.now() - this.activeCall.startTime;

      // Add system message to chat
      this._addSystemMessage(section, `Voice call ended. Duration: ${Math.round(callDuration / 1000)}s`);

      // Update UI
      this._updateCallUI(section, false);
      
      this.activeCall = null;
    } catch (err) {
      console.error('Error ending voice call:', err);
    }
  },

  // Add system message to chat
  _addSystemMessage: function(section, message) {
    const chatContainer = document.getElementById(`${section}-chat-messages`) || 
                          document.getElementById(`${section}info-chat-messages`);
    
    if (chatContainer) {
      const systemMsg = document.createElement('div');
      systemMsg.className = 'message system-message';
      systemMsg.innerHTML = `<p style="color: #718096; font-size: 12px; font-style: italic;">ℹ️ ${message}</p>`;
      chatContainer.appendChild(systemMsg);
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  },

  // Check if call is active
  isCallActive: function() {
    return this.activeCall && this.activeCall.isActive;
  },

  // Check if microphone permission is granted
  checkMicrophonePermission: async function() {
    try {
      const permission = await navigator.permissions.query({ name: 'microphone' });
      return permission.state === 'granted';
    } catch (err) {
      console.warn('Permission query not supported:', err);
      return null;
    }
  }
};

// Global function to start voice call (called from UI)
window.startVoiceCall = async function(section) {
  if (window.VoiceCallManager.isCallActive()) {
    await window.VoiceCallManager.endCall(section);
  } else {
    const success = await window.VoiceCallManager.initializeVoiceCall(section);
    if (!success) {
      console.error('Failed to initialize voice call');
    }
  }
};

// Global function to toggle mute during call
window.toggleVoiceCallMute = function(section) {
  window.VoiceCallManager.toggleMute(section);
};

// Global function to end voice call
window.endVoiceCall = async function(section) {
  await window.VoiceCallManager.endCall(section);
};

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  if (window.VoiceCallManager.isCallActive()) {
    window.VoiceCallManager.endCall('current');
  }
});
