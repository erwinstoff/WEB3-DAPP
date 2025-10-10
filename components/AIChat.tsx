'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatWithAI, ChatMessage } from '@/lib/gemini';

interface AIChatProps {
  isOpen: boolean;
  onClose: () => void;
}

const AIChat: React.FC<AIChatProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: '👋 Hello! I\'m your AI Web3 assistant. I can help you with questions about cryptocurrency, airdrops, DeFi, and blockchain technology. How can I assist you today?'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await chatWithAI(inputMessage.trim(), messages);
      
      // Simulate typing delay for better UX
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: '😔 Sorry, I encountered an error. Please try again later.'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickQuestions = [
    '🚀 What is an airdrop?',
    '💰 How do I claim tokens?',
    '🔒 Is this airdrop safe?',
    '⛽ What are gas fees?',
    '🔗 How do I connect my wallet?',
    '📊 Explain DeFi protocols',
    '🛡️ Wallet security tips',
    '🌐 What is Web3?'
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          
          {/* Chat Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ 
              type: "spring", 
              damping: 20, 
              stiffness: 100,
              duration: 0.4
            }}
            className="fixed bottom-4 right-4 w-full max-w-md h-[600px] bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-neutral-800 z-50 flex flex-col backdrop-blur-sm"
            style={{ 
              background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)',
              backdropFilter: 'blur(10px)'
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-neutral-800 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-neutral-800 dark:to-neutral-700 rounded-t-2xl">
              <div className="flex items-center space-x-3">
                <motion.div 
                  className="w-10 h-10 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg"
                  animate={{ 
                    boxShadow: [
                      '0 0 20px rgba(59, 130, 246, 0.3)',
                      '0 0 30px rgba(147, 51, 234, 0.4)',
                      '0 0 20px rgba(59, 130, 246, 0.3)'
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <span className="text-white font-bold text-sm">🤖</span>
                </motion.div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Web3 Assistant</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Always here to help</p>
                </div>
              </div>
              <motion.button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="flex items-start space-x-2 max-w-[85%]">
                    {message.role === 'assistant' && (
                      <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-white text-xs">🤖</span>
                      </div>
                    )}
                    <motion.div
                      className={`p-3 rounded-2xl shadow-sm ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    </motion.div>
                    {message.role === 'user' && (
                      <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-white text-xs">👤</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="flex items-start space-x-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-white text-xs">🤖</span>
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-2xl border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <motion.div 
                            className="w-2 h-2 bg-blue-500 rounded-full"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                          />
                          <motion.div 
                            className="w-2 h-2 bg-purple-500 rounded-full"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                          />
                          <motion.div 
                            className="w-2 h-2 bg-pink-500 rounded-full"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">AI is thinking...</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Questions */}
            {messages.length === 1 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-4 pb-2"
              >
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 font-medium">💡 Quick questions:</p>
                <div className="flex flex-wrap gap-2">
                  {quickQuestions.map((question, index) => (
                    <motion.button
                      key={index}
                      onClick={() => setInputMessage(question)}
                      className="text-xs px-3 py-2 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:from-blue-100 hover:to-purple-100 dark:hover:from-blue-900 dark:hover:to-purple-900 transition-all duration-300 border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      {question}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-gray-200 dark:border-neutral-800 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-neutral-800 dark:to-neutral-700 rounded-b-2xl">
              <div className="flex space-x-3">
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask me anything about Web3..."
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-200"
                    disabled={isLoading}
                  />
                  {isLoading && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <motion.div
                        className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                    </div>
                  )}
                </div>
                <motion.button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  className="px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-600 dark:disabled:to-gray-700 text-white rounded-xl transition-all duration-200 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  animate={isLoading ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 0.5, repeat: isLoading ? Infinity : 0 }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </motion.button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                Press Enter to send • Shift+Enter for new line
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AIChat;

