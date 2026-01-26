/**
 * Voice Service - Complete Voice Assistant Implementation
 * Features: STT, TTS, Wake Word Detection, Voice Activity Detection
 * Integrates with Gemini AI for intelligent responses
 */

class VoiceAssistant {
  constructor() {
    // Speech Recognition (STT)
    this.recognition = null;
    this.isListening = false;
    this.isContinuousMode = false;
    
    // Speech Synthesis (TTS)
    this.synthesis = window.speechSynthesis;
    this.isSpeaking = false;
    this.currentUtterance = null;
    
    // Voice settings
    this.settings = {
      language: 'en-US',
      voice: null,
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      autoSpeak: true,
      wakeWord: 'hey assistant'
    };
    
    // Callbacks
    this.onTranscript = null;
    this.onFinalTranscript = null;
    this.onSpeechStart = null;
    this.onSpeechEnd = null;
    this.onError = null;
    
    // Initialize
    this.init();
  }

  /**
   * Initialize voice services
   */
  init() {
    // Check browser support
    if (!this.checkSupport()) {
      console.error('Voice services not supported in this browser');
      return;
    }

    // Initialize speech recognition
    this.initSpeechRecognition();
    
    // Load available voices
    this.loadVoices();
    
    // Load saved settings
    this.loadSettings();
  }

  /**
   * Check browser support for voice features
   */
  checkSupport() {
    const hasSTT = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    const hasTTS = 'speechSynthesis' in window;
    
    return {
      stt: hasSTT,
      tts: hasTTS,
      full: hasSTT && hasTTS
    };
  }

  /**
   * Initialize Speech Recognition (STT)
   */
  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Speech recognition not available');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;
    this.recognition.lang = this.settings.language;

    // Event handlers
    this.recognition.onstart = () => {
      this.isListening = true;
      if (this.onSpeechStart) this.onSpeechStart();
    };

    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Callback for interim results
      if (this.onTranscript) {
        this.onTranscript(interimTranscript || finalTranscript, false);
      }

      // Callback for final transcript
      if (finalTranscript && this.onFinalTranscript) {
        this.onFinalTranscript(finalTranscript.trim());
      }

      // Check for wake word in continuous mode
      if (this.isContinuousMode && finalTranscript) {
        this.checkWakeWord(finalTranscript);
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.isListening = false;
      
      if (this.onError) {
        this.onError({
          type: 'recognition',
          error: event.error,
          message: this.getErrorMessage(event.error)
        });
      }

      // Auto-restart if continuous mode and error is recoverable
      if (this.isContinuousMode && this.isRecoverableError(event.error)) {
        setTimeout(() => this.startListening(true), 1000);
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (this.onSpeechEnd) this.onSpeechEnd();
      
      // Restart if continuous mode
      if (this.isContinuousMode) {
        setTimeout(() => this.startListening(true), 100);
      }
    };
  }

  /**
   * Check if error is recoverable
   */
  isRecoverableError(error) {
    const recoverableErrors = ['network', 'aborted', 'no-speech'];
    return recoverableErrors.includes(error);
  }

  /**
   * Get user-friendly error message
   */
  getErrorMessage(error) {
    const errorMessages = {
      'no-speech': 'No speech detected. Please try again.',
      'audio-capture': 'Microphone not available. Please check permissions.',
      'not-allowed': 'Microphone permission denied. Please enable it in settings.',
      'network': 'Network error. Please check your connection.',
      'aborted': 'Speech recognition aborted.',
      'language-not-supported': 'Language not supported.'
    };
    
    return errorMessages[error] || 'An error occurred with speech recognition.';
  }

  /**
   * Start listening for speech
   */
  startListening(continuous = false) {
    if (!this.recognition) {
      console.error('Speech recognition not initialized');
      return;
    }

    if (this.isListening) {
      console.warn('Already listening');
      return;
    }

    this.isContinuousMode = continuous;
    
    try {
      this.recognition.start();
    } catch (error) {
      console.error('Error starting recognition:', error);
      if (this.onError) {
        this.onError({
          type: 'recognition',
          error: error.message,
          message: 'Failed to start speech recognition'
        });
      }
    }
  }

  /**
   * Stop listening
   */
  stopListening() {
    if (!this.recognition || !this.isListening) return;
    
    this.isContinuousMode = false;
    try {
      this.recognition.stop();
    } catch (error) {
      console.error('Error stopping recognition:', error);
    }
  }

  /**
   * Check for wake word
   */
  checkWakeWord(transcript) {
    const normalizedTranscript = transcript.toLowerCase().trim();
    const wakeWord = this.settings.wakeWord.toLowerCase();
    
    if (normalizedTranscript.includes(wakeWord)) {
      // Remove wake word from transcript
      const query = normalizedTranscript.replace(wakeWord, '').trim();
      
      if (query && this.onFinalTranscript) {
        // Trigger with the query after wake word
        this.onFinalTranscript(query);
      }
    }
  }

  /**
   * Load available voices for TTS
   */
  loadVoices() {
    const voices = this.synthesis.getVoices();
    
    if (voices.length === 0) {
      // Voices not loaded yet, wait for them
      this.synthesis.onvoiceschanged = () => {
        this.loadVoices();
      };
      return;
    }

    // Find best voice for current language
    const preferredVoice = voices.find(voice => 
      voice.lang === this.settings.language && voice.localService
    ) || voices.find(voice => 
      voice.lang.startsWith(this.settings.language.split('-')[0])
    );

    if (preferredVoice) {
      this.settings.voice = preferredVoice;
    }
  }

  /**
   * Speak text (TTS)
   */
  speak(text, options = {}) {
    if (!text || text.trim() === '') return;

    // Stop current speech
    this.stopSpeaking();

    // Create utterance
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Apply settings
    utterance.voice = options.voice || this.settings.voice;
    utterance.rate = options.rate || this.settings.rate;
    utterance.pitch = options.pitch || this.settings.pitch;
    utterance.volume = options.volume || this.settings.volume;
    utterance.lang = options.lang || this.settings.language;

    // Event handlers
    utterance.onstart = () => {
      this.isSpeaking = true;
      if (options.onStart) options.onStart();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      if (options.onEnd) options.onEnd();
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      this.isSpeaking = false;
      this.currentUtterance = null;
      if (options.onError) options.onError(event);
    };

    // Speak
    this.currentUtterance = utterance;
    this.synthesis.speak(utterance);
  }

  /**
   * Stop speaking
   */
  stopSpeaking() {
    if (this.synthesis.speaking) {
      this.synthesis.cancel();
      this.isSpeaking = false;
      this.currentUtterance = null;
    }
  }

  /**
   * Pause speaking
   */
  pauseSpeaking() {
    if (this.synthesis.speaking && !this.synthesis.paused) {
      this.synthesis.pause();
    }
  }

  /**
   * Resume speaking
   */
  resumeSpeaking() {
    if (this.synthesis.paused) {
      this.synthesis.resume();
    }
  }

  /**
   * Update settings
   */
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    
    // Update recognition language
    if (this.recognition && newSettings.language) {
      this.recognition.lang = newSettings.language;
    }
    
    // Save settings
    this.saveSettings();
  }

  /**
   * Get available voices
   */
  getAvailableVoices() {
    return this.synthesis.getVoices();
  }

  /**
   * Get available languages
   */
  getAvailableLanguages() {
    const voices = this.getAvailableVoices();
    const languages = [...new Set(voices.map(voice => voice.lang))];
    return languages.sort();
  }

  /**
   * Save settings to localStorage
   */
  saveSettings() {
    try {
      localStorage.setItem('voiceAssistantSettings', JSON.stringify({
        language: this.settings.language,
        rate: this.settings.rate,
        pitch: this.settings.pitch,
        volume: this.settings.volume,
        autoSpeak: this.settings.autoSpeak,
        wakeWord: this.settings.wakeWord
      }));
    } catch (error) {
      console.error('Error saving voice settings:', error);
    }
  }

  /**
   * Load settings from localStorage
   */
  loadSettings() {
    try {
      const saved = localStorage.getItem('voiceAssistantSettings');
      if (saved) {
        const settings = JSON.parse(saved);
        this.updateSettings(settings);
      }
    } catch (error) {
      console.error('Error loading voice settings:', error);
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.stopListening();
    this.stopSpeaking();
    this.recognition = null;
  }
}

// Export singleton instance
const voiceService = new VoiceAssistant();
export default voiceService;
