'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatWithAIStream, ChatMessage } from '@/lib/gemini';

interface AIChatProps {
  isOpen: boolean;
  onClose: () => void;
}

const AIChat: React.FC<AIChatProps> = ({ isOpen, onClose }) => {
  const STORAGE_KEY = 'ai_chat_messages_v1';
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem('ai_chat_messages_v1');
        if (raw) {
          const saved = JSON.parse(raw) as ChatMessage[];
          if (Array.isArray(saved) && saved.length > 0) return saved;
        }
      }
    } catch {}
    return [{
      role: 'assistant',
      content: '👋 Hey, I\'m Alex! I can guide you through airdrops, wallets, gas, and DeFi. Ask anything and I\'ll give a clear, friendly walkthrough with quick tips and a short summary when it helps. ✨'
    }];
  });
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingAssistant, setStreamingAssistant] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    const c = messagesContainerRef.current;
    if (c) {
      c.scrollTo({ top: c.scrollHeight, behavior: 'smooth' });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Ensure we land at the bottom when opening the modal
  useEffect(() => {
    if (isOpen) {
      const id = setTimeout(() => scrollToBottom(), 60);
      return () => clearTimeout(id);
    }
  }, [isOpen]);

  // Keep autoscrolling during streaming
  useEffect(() => {
    if (streamingAssistant) scrollToBottom();
  }, [streamingAssistant]);

  // Load saved conversation on mount
  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      if (raw) {
        const saved = JSON.parse(raw) as ChatMessage[];
        if (Array.isArray(saved) && saved.length > 0) {
          setMessages(saved);
        }
      }
    } catch {}
  }, []);

  // Persist conversation on change (keep last 30 messages)
  useEffect(() => {
    try {
      const trimmed = messages.slice(-30);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {}
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setStreamingAssistant('');
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    try {
      const history: ChatMessage[] = [...messages, userMessage];
      let accum = '';
      await chatWithAIStream(
        history,
        (delta) => {
          accum += delta;
          setStreamingAssistant(prev => prev + delta);
        },
        abortRef.current.signal
      );
      const finalText = accum.trim();
      if (finalText) {
        setMessages(prev => [...prev, { role: 'assistant', content: finalText }]);
      }
      setStreamingAssistant('');
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

  const stopStreaming = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (streamingAssistant) {
      setMessages(prev => [...prev, { role: 'assistant', content: streamingAssistant }]);
      setStreamingAssistant('');
    }
    setIsLoading(false);
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
            className="fixed inset-x-3 bottom-3 sm:bottom-4 sm:right-4 sm:top-auto sm:left-auto w-auto max-w-md h-[75dvh] sm:h-[600px] bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-neutral-800 z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-neutral-800 bg-gradient-to-r from-blue-500 to-purple-600 rounded-t-2xl">
              <div className="flex items-center space-x-3">
                <motion.div 
                  className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg"
                  animate={{ 
                    scale: [1, 1.05, 1]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <span className="text-blue-500 font-bold text-lg">AI</span>
                </motion.div>
                <div>
                  <h3 className="text-lg font-bold text-white">Ask Alex</h3>
                  <p className="text-sm text-blue-100">Your Web3 Assistant</p>
                </div>
              </div>
              <motion.button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>
            </div>

            {/* Messages */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 pb-24 space-y-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="flex items-start space-x-2 max-w-[90%] sm:max-w-[85%]">
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-white text-sm font-bold">AI</span>
                      </div>
                    )}
                    <motion.div
                      className={`p-4 rounded-2xl shadow-sm leading-[1.55] tracking-tight ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                          : 'bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                      }`}
                      whileHover={{ scale: 1.01 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <p className="text-[0.96rem] sm:text-base whitespace-pre-wrap">{message.content}</p>
                    </motion.div>
                    {message.role === 'user' && (
                      <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-white text-sm font-bold">U</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              
              {(isLoading || streamingAssistant) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="flex items-start space-x-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-white text-xs">🤖</span>
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-2xl border border-gray-200 dark:border-gray-700 max-w-[90%] sm:max-w-[85%]">
                      <p className="text-base leading-relaxed whitespace-pre-wrap">{streamingAssistant || 'Alex is typing…'}</p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex space-x-1">
                          <motion.div className="w-2 h-2 bg-blue-500 rounded-full" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} />
                          <motion.div className="w-2 h-2 bg-purple-500 rounded-full" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} />
                          <motion.div className="w-2 h-2 bg-pink-500 rounded-full" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} />
                        </div>
                        {/* Stop button removed; integrated into send button */}
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
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 font-medium">💡 Quick questions:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {quickQuestions.map((question, index) => (
                    <motion.button
                      key={index}
                      onClick={() => setInputMessage(question)}
                      className="text-sm px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:from-blue-100 hover:to-purple-100 dark:hover:from-blue-900 dark:hover:to-purple-900 transition-all duration-300 border border-blue-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 text-left"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
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
            <div className="p-4 border-t border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-b-2xl pb-[env(safe-area-inset-bottom)]">
              <div className="flex space-x-3">
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask Alex anything about Web3..."
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-base"
                    disabled={isLoading}
                  />
                  {isLoading && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <motion.div
                        className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                    </div>
                  )}
                </div>
                <motion.button
                  onClick={isLoading ? stopStreaming : handleSendMessage}
                  disabled={!inputMessage.trim() && !isLoading}
                  className={`px-3 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl font-semibold text-white ${isLoading ? 'bg-red-600 hover:bg-red-700' : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600'}`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  animate={isLoading ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 0.5, repeat: isLoading ? Infinity : 0 }}
                  aria-label={isLoading ? 'Stop' : 'Send'}
                  title={isLoading ? 'Stop' : 'Send'}
                >
                  {isLoading ? (
                    // stop icon (square)
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><rect x="6" y="6" width="8" height="8" rx="1"/></svg>
                  ) : (
                    // send icon
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                  )}
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

