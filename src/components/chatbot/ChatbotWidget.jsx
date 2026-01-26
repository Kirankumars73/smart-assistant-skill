import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { processQueryWithAI } from '../../services/geminiService';
import voiceService from '../../services/voiceService';

const ChatbotWidget = () => {
  const { hasFacultyAccess } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, text: 'Hello! I\'m your AI-powered Smart Academic Assistant 🤖 I can help you with student data, analytics, timetables, and more. Just ask me naturally!', sender: 'bot' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Voice state
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [voiceSettings, setVoiceSettings] = useState(voiceService.settings);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const messagesEndRef = useRef(null);
  const audioAnimationRef = useRef(null);

  // Only show chatbot for faculty/admin
  if (!hasFacultyAccess()) {
    return null;
  }

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize voice service
  useEffect(() => {
    // Check browser support
    const support = voiceService.checkSupport();
    if (!support.full) {
      console.warn('Voice features not fully supported');
    }

    // Set up voice callbacks
    voiceService.onTranscript = (text, isFinal) => {
      setTranscript(text);
    };

    voiceService.onFinalTranscript = async (text) => {
      setTranscript('');
      await handleVoiceQuery(text);
    };

    voiceService.onSpeechStart = () => {
      setIsListening(true);
      startAudioAnimation();
    };

    voiceService.onSpeechEnd = () => {
      setIsListening(false);
      stopAudioAnimation();
    };

    voiceService.onError = (error) => {
      console.error('Voice error:', error);
      setIsListening(false);
      stopAudioAnimation();
      
      // Show error message
      const errorMessage = {
        id: Date.now(),
        text: `Voice Error: ${error.message}`,
        sender: 'bot'
      };
      setMessages(prev => [...prev, errorMessage]);
    };

    return () => {
      voiceService.stopListening();
      voiceService.stopSpeaking();
      stopAudioAnimation();
    };
  }, []);

  // Audio visualization animation
  const startAudioAnimation = () => {
    let level = 0;
    audioAnimationRef.current = setInterval(() => {
      level = Math.random() * 100;
      setAudioLevel(level);
    }, 100);
  };

  const stopAudioAnimation = () => {
    if (audioAnimationRef.current) {
      clearInterval(audioAnimationRef.current);
      audioAnimationRef.current = null;
    }
    setAudioLevel(0);
  };

  // AI-powered query processing with fallback
  const processQuery = async (userInput) => {
    const input = userInput.toLowerCase();
    
    try {
      // Try AI-powered response first
      const aiResponse = await processQueryWithAI(userInput);
      return aiResponse;
    } catch (error) {
      console.error('AI processing failed, using fallback:', error);
      
      // Fallback to rule-based logic
      try {
        // Student ID lookup
        const studentIdMatch = input.match(/(?:student\\s+(?:id\\s+)?|id\\s+|usn\\s+)([a-z0-9]+)/i);
        if (studentIdMatch) {
          const searchId = studentIdMatch[1].toUpperCase();
          const studentsSnapshot = await getDocs(collection(db, 'students'));
          const student = studentsSnapshot.docs.find(doc => {
            const data = doc.data();
            return data.studentId?.toUpperCase() === searchId || 
                   data.usn?.toUpperCase() === searchId ||
                   data.rollNumber?.toUpperCase() === searchId;
          });
          
          if (student) {
            const data = student.data();
            return `Student Found:\\n\\n` +
                   `Name: ${data.name || 'N/A'}\\n` +
                   `Student ID: ${data.studentId || 'N/A'}\\n` +
                   `Branch: ${data.branch || 'N/A'}\\n` +
                   `Semester: ${data.semester || 'N/A'}\\n` +
                   `CGPA: ${data.cgpa || 'N/A'}\\n` +
                   `Internal Marks: ${data.internalMarks || 'N/A'}%\\n` +
                   `Back Papers: ${data.backPapers || 0}\\n` +
                   `Email: ${data.email || 'N/A'}\\n` +
                   `Phone: ${data.phone || 'N/A'}`;
          } else {
            return `No student found with ID "${searchId}". Please check the ID and try again.`;
          }
        }
        
        // Student count
        if (input.includes('student') && (input.includes('how many') || input.includes('count') || input.includes('total'))) {
          const studentsSnapshot = await getDocs(collection(db, 'students'));
          return `There are currently ${studentsSnapshot.size} students enrolled in the system.`;
        }
        
        // Help
        if (input.includes('help') || input.includes('what can you')) {
          return `I can help you with:\\n\\nStudents:\\n• "Show student ID 12345"\\n• "How many students?"\\n• "List CSE students"\\n\\nAnalytics:\\n• "What's the average CGPA?"\\n• "Who is at risk?"\\n\\nGeneral:\\nJust ask naturally!`;
        }
        
        return 'I\'m having trouble connecting to the AI service. Try asking about students, timetables, or type "help" to see what I can do!';
        
      } catch (fallbackError) {
        console.error('Fallback query error:', fallbackError);
        return 'Sorry, I encountered an error while processing your request. Please try again.';
      }
    }
  };

  const addMessage = (message) => {
    setMessages(prev => [...prev, message]);
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { id: Date.now(), text: input, sender: 'user' };
    addMessage(userMessage);
    const userQuery = input;
    setInput('');
    setIsTyping(true);

    try {
      const response = await processQuery(userQuery);
      const botMessage = {
        id: Date.now() + 1,
        text: response,
        sender: 'bot'
      };
      addMessage(botMessage);
      
      // Auto-speak in voice mode
      if (isVoiceMode && voiceSettings.autoSpeak) {
        speakResponse(response);
      }
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        text: 'Sorry, an error occurred. Please try again.',
        sender: 'bot'
      };
      addMessage(errorMessage);
    } finally {
      setIsTyping(false);
    }
  };

  const handleVoiceQuery = async (query) => {
    if (!query || query.trim() === '') return;

    const userMessage = { id: Date.now(), text: query, sender: 'user' };
    addMessage(userMessage);
    setIsTyping(true);

    try {
      const response = await processQuery(query);
      const botMessage = {
        id: Date.now() + 1,
        text: response,
        sender: 'bot'
      };
      addMessage(botMessage);
      
      // Speak response
      if (isVoiceMode) {
        speakResponse(response);
      }
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        text: 'Sorry, an error occurred processing your voice query.',
        sender: 'bot'
      };
      addMessage(errorMessage);
    } finally {
      setIsTyping(false);
    }
  };

  const speakResponse = (text) => {
    // Remove markdown formatting for TTS
    const cleanText = text.replace(/\\*\\*/g, '').replace(/\\n/g, '. ');
    
    setIsSpeaking(true);
    voiceService.speak(cleanText, {
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false)
    });
  };

  const toggleVoiceMode = () => {
    if (isVoiceMode) {
      voiceService.stopListening();
      voiceService.stopSpeaking();
      setIsListening(false);
      setIsSpeaking(false);
    }
    setIsVoiceMode(!isVoiceMode);
  };

  const startVoiceInput = () => {
    if (isListening) {
      voiceService.stopListening();
    } else {
      voiceService.startListening();
    }
  };

  const stopSpeaking = () => {
    voiceService.stopSpeaking();
    setIsSpeaking(false);
  };

  const updateVoiceSetting = (key, value) => {
    const newSettings = { ...voiceSettings, [key]: value };
    setVoiceSettings(newSettings);
    voiceService.updateSettings(newSettings);
  };

  return (
    <>
      {/* Floating Chat Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-orange-500 shadow-2xl flex items-center justify-center text-white text-2xl z-50 hover:shadow-pink-500/50 transition-shadow"
      >
        {isOpen ? '✕' : '🤖'}
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="fixed bottom-24 right-6 w-96 h-[600px] bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-pink-500 to-orange-500 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-bold text-lg">AI Assistant</h3>
                  <p className="text-white/80 text-xs">
                    {isVoiceMode ? '🎤 Voice Mode Active' : 'Ask me anything!'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={toggleVoiceMode}
                    className={`p-2 rounded-lg transition-colors ${
                      isVoiceMode ? 'bg-white/20' : 'bg-white/10'
                    } hover:bg-white/30`}
                    title="Toggle Voice Mode"
                  >
                    {isVoiceMode ? '🎙️' : '💬'}
                  </button>
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                    title="Settings"
                  >
                    ⚙️
                  </button>
                </div>
              </div>
            </div>

            {/* Settings Panel */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-gray-800 border-b border-gray-700 overflow-hidden"
                >
                  <div className="p-4 space-y-3">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Speech Rate</label>
                      <input
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.1"
                        value={voiceSettings.rate}
                        onChange={(e) => updateVoiceSetting('rate', parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <span className="text-xs text-gray-500">{voiceSettings.rate}x</span>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Volume</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={voiceSettings.volume}
                        onChange={(e) => updateVoiceSetting('volume', parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <span className="text-xs text-gray-500">{Math.round(voiceSettings.volume * 100)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-gray-400">Auto-speak responses</label>
                      <input
                        type="checkbox"
                        checked={voiceSettings.autoSpeak}
                        onChange={(e) => updateVoiceSetting('autoSpeak', e.target.checked)}
                        className="rounded"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2 rounded-lg whitespace-pre-line ${
                      msg.sender === 'user'
                        ? 'bg-gradient-to-r from-pink-500 to-orange-500 text-white'
                        : 'bg-gray-800 text-gray-200'
                    }`}
                  >
                    {msg.text}
                  </div>
                </motion.div>
              ))}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-gray-800 px-4 py-2 rounded-lg">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Voice Controls */}
            {isVoiceMode && (
              <div className="px-4 py-3 bg-gray-800/50 border-t border-gray-700">
                <div className="flex items-center gap-3">
                  <button
                    onClick={startVoiceInput}
                    disabled={isSpeaking}
                    className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                      isListening
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'bg-gradient-to-r from-pink-500 to-orange-500 text-white hover:shadow-lg'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isListening ? '🔴 Listening...' : '🎤 Tap to Speak'}
                  </button>
                  {isSpeaking && (
                    <button
                      onClick={stopSpeaking}
                      className="px-4 py-3 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-colors"
                    >
                      🔇 Stop
                    </button>
                  )}
                </div>
                
                {/* Transcript Display */}
                {transcript && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-2 p-2 bg-gray-700 rounded-lg text-sm text-gray-300"
                  >
                    {transcript}
                  </motion.div>
                )}
                
                {/* Audio Visualization */}
                {isListening && (
                  <div className="mt-2 flex items-center justify-center gap-1 h-8">
                    {[...Array(20)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-1 bg-gradient-to-t from-pink-500 to-orange-500 rounded-full"
                        animate={{
                          height: [4, Math.random() * 24 + 4, 4]
                        }}
                        transition={{
                          duration: 0.5,
                          repeat: Infinity,
                          delay: i * 0.05
                        }}
                      />
                    ))}
                  </div>
                )}
                
                {/* Speaking Indicator */}
                {isSpeaking && (
                  <div className="mt-2 flex items-center justify-center gap-2 text-sm text-orange-400">
                    <span className="animate-pulse">🔊</span>
                    <span>Speaking...</span>
                  </div>
                )}
              </div>
            )}

            {/* Text Input */}
            <div className="p-4 border-t border-gray-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={isVoiceMode ? "Or type here..." : "Ask me anything..."}
                  disabled={isVoiceMode && isListening}
                  className="flex-1 px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 disabled:opacity-50"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || (isVoiceMode && isListening)}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-orange-500 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-shadow"
                >
                  Send
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatbotWidget;
