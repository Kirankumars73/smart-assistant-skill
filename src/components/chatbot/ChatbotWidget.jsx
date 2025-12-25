import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { processQueryWithAI } from '../../services/geminiService';

const ChatbotWidget = () => {
  const { hasFacultyAccess } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, text: 'Hello! I\'m your AI-powered Smart Academic Assistant 🤖 I can help you with student data, analytics, timetables, and more. Just ask me naturally!', sender: 'bot' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Only show chatbot for faculty/admin
  if (!hasFacultyAccess()) {
    return null;
  }

  // AI-powered query processing with fallback to rule-based
  const processQuery = async (userInput) => {
    const input = userInput.toLowerCase();
    
    try {
      // Try AI-powered response first
      const aiResponse = await processQueryWithAI(userInput);
      return aiResponse;
    } catch (error) {
      console.error('AI processing failed, using fallback:', error);
      
      // Fallback to rule-based logic (original implementation)
      try {
        // PRIORITY: Student ID lookup
        const studentIdMatch = input.match(/(?:student\s+(?:id\s+)?|id\s+|usn\s+)([a-z0-9]+)/i);
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
            return `**Student Found:**\n\n` +
                   `📋 **Name:** ${data.name || 'N/A'}\n` +
                   `🆔 **Student ID:** ${data.studentId || 'N/A'}\n` +
                   `📚 **Branch:** ${data.branch || 'N/A'}\n` +
                   `📊 **Semester:** ${data.semester || 'N/A'}\n` +
                   `🎓 **CGPA:** ${data.cgpa || 'N/A'}\n` +
                   `📝 **Internal Marks:** ${data.internalMarks || 'N/A'}%\n` +
                   `❗ **Back Papers:** ${data.backPapers || 0}\n` +
                   `📧 **Email:** ${data.email || 'N/A'}\n` +
                   `📱 **Phone:** ${data.phone || 'N/A'}`;
          } else {
            return `No student found with ID "${searchId}". Please check the ID and try again.`;
          }
        }
        
        // Student count
        if (input.includes('student') && (input.includes('how many') || input.includes('count') || input.includes('total'))) {
          const studentsSnapshot = await getDocs(collection(db, 'students'));
          return `There are currently **${studentsSnapshot.size} students** enrolled in the system.`;
        }
        
        // Help
        if (input.includes('help') || input.includes('what can you')) {
          return `I can help you with:\n\n**📚 Students**\n• "Show student ID 12345"\n• "How many students?"\n• "List CSE students"\n\n**📊 Analytics**\n• "What's the average CGPA?"\n• "Who is at risk?"\n\n**💬 General**\nJust ask naturally!`;
        }
        
        return 'I\'m having trouble connecting to the AI service. Try asking about students, timetables, or type "help" to see what I can do!';
        
      } catch (fallbackError) {
        console.error('Fallback query error:', fallbackError);
        return 'Sorry, I encountered an error while processing your request. Please try again.';
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { id: Date.now(), text: input, sender: 'user' };
    setMessages([...messages, userMessage]);
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
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        text: 'Sorry, an error occurred. Please try again.',
        sender: 'bot'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
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
            className="fixed bottom-24 right-6 w-96 h-[500px] bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-pink-500 to-orange-500 px-6 py-4">
              <h3 className="text-white font-bold text-lg">AI Assistant</h3>
              <p className="text-white/80 text-xs">Ask me about students, timetables & more!</p>
            </div>

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
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask me anything..."
                  className="flex-1 px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
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
