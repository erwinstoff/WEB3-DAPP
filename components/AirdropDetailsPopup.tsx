'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AirdropDetails } from '@/lib/gemini';

interface AirdropDetailsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  airdrop: AirdropDetails;
}

const AirdropDetailsPopup: React.FC<AirdropDetailsPopupProps> = ({ isOpen, onClose, airdrop }) => {
  const [analysis, setAnalysis] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [isCached, setIsCached] = useState(false);

  useEffect(() => {
    if (isOpen && airdrop) {
      fetchAnalysis();
    }
  }, [isOpen, airdrop, fetchAnalysis]);

  const fetchAnalysis = useCallback(async () => {
    setIsLoading(true);
    setError('');
    setIsCached(false);
    
    try {
      // Add timeout to prevent infinite loading
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch('/api/airdrop-explainer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ airdrop }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        console.error('API Response Error:', data);
        throw new Error(data.error || 'Failed to analyze airdrop');
      }

      setAnalysis(data.explanation);
      setIsCached(data.cached || false);
    } catch (err) {
      console.error('Error analyzing airdrop:', err);
      
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('Request timed out. Please try again.');
        } else if (err.message.includes('Failed to fetch')) {
          setError('Network error. Please check your connection and try again.');
        } else {
          setError(`Error: ${err.message}`);
        }
      } else {
        setError('Failed to analyze airdrop. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [airdrop]);

  const formatAnalysis = (text: string) => {
    // Split by common section headers and format
    const sections = text.split(/(\d+\.\s*[A-Z][^.]*)/);
    return sections.map((section, index) => {
      if (section.match(/^\d+\.\s*[A-Z]/)) {
        return (
          <h4 key={index} className="font-semibold text-blue-600 dark:text-blue-400 mt-4 mb-2">
            {section}
          </h4>
        );
      }
      return (
        <p key={index} className="text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">
          {section}
        </p>
      );
    });
  };

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
          
          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ 
              type: "spring", 
              damping: 20, 
              stiffness: 100,
              duration: 0.4
            }}
            className="fixed inset-4 md:inset-8 lg:inset-16 z-50 flex flex-col max-w-4xl mx-auto perspective-1000 overflow-y-auto"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* 3D Container with Multiple Layers */}
            <div className="relative w-full h-full">
              {/* Background Glow Layer */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.8 }}
                className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-cyan-500/20 rounded-2xl blur-3xl"
                style={{ transform: 'translateZ(-50px)' }}
              />
              
              {/* Main Container */}
              <motion.div
                whileHover={{ 
                  rotateY: 2,
                  rotateX: 1,
                  scale: 1.02,
                  transition: { duration: 0.3 }
                }}
                className="relative w-full h-full bg-gradient-to-br from-white via-gray-50 to-blue-50/30 dark:from-neutral-900 dark:via-neutral-800 dark:to-blue-900/30 rounded-2xl shadow-[0_25px_50px_rgba(0,0,0,0.25)] dark:shadow-[0_25px_50px_rgba(0,0,0,0.5)] border border-gray-200/50 dark:border-neutral-700/50 backdrop-blur-xl overflow-hidden"
                style={{ 
                  transformStyle: 'preserve-3d',
                  boxShadow: '0 25px 50px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.1), inset 0 1px 0 rgba(255,255,255,0.2)'
                }}
              >
                {/* Animated Background Pattern */}
                <div className="absolute inset-0 opacity-5 dark:opacity-10">
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-500 animate-pulse" />
                  <div className="absolute top-10 left-10 w-32 h-32 bg-blue-400 rounded-full blur-3xl animate-float" />
                  <div className="absolute bottom-10 right-10 w-40 h-40 bg-purple-400 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
                  <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-cyan-400 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
                </div>

                {/* Floating Particles */}
                <div className="absolute inset-0 overflow-hidden">
                  {[...Array(20)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-1 h-1 bg-blue-400 rounded-full"
                      style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                      }}
                      animate={{
                        y: [0, -20, 0],
                        opacity: [0, 1, 0],
                        scale: [0, 1, 0],
                      }}
                      transition={{
                        duration: 3 + Math.random() * 2,
                        repeat: Infinity,
                        delay: Math.random() * 2,
                      }}
                    />
                  ))}
                </div>
                {/* Header */}
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="relative flex items-center justify-between p-6 border-b border-gray-200/30 dark:border-neutral-700/30 backdrop-blur-sm"
                  style={{ transform: 'translateZ(10px)' }}
                >
                  {/* Header Background Glow */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-cyan-500/5" />
                  
                  <div className="relative flex items-center space-x-4">
                    {/* 3D AI Icon */}
                    <motion.div
                      whileHover={{ 
                        rotateY: 180,
                        scale: 1.1,
                        transition: { duration: 0.6 }
                      }}
                      className="relative"
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-500 rounded-xl shadow-[0_8px_25px_rgba(59,130,246,0.4)] flex items-center justify-center relative overflow-hidden">
                        {/* Inner Glow */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl" />
                        {/* Icon Content */}
                        <span className="text-white font-black text-lg relative z-10">AI</span>
                        {/* Animated Ring */}
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                          className="absolute inset-0 border-2 border-white/30 rounded-xl"
                        />
                      </div>
                      {/* Shadow Layer */}
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl blur-lg opacity-30 -z-10" />
                    </motion.div>
                    
                    <div className="relative">
                      <motion.h2 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4, duration: 0.5 }}
                        className="text-2xl font-extrabold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 dark:from-white dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent"
                      >
                        {airdrop.title}
                      </motion.h2>
                      <motion.p 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                        className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center space-x-2"
                      >
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span>AI-Powered Analysis</span>
                      </motion.p>
                    </div>
                  </div>
                  
                  {/* 3D Close Button */}
                  <motion.button
                    whileHover={{ 
                      scale: 1.1,
                      rotate: 90,
                      transition: { duration: 0.2 }
                    }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onClose}
                    className="relative p-3 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 rounded-xl transition-all duration-200 backdrop-blur-sm border border-gray-200/30 dark:border-gray-700/30"
                    style={{ transform: 'translateZ(5px)' }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-100/50 to-gray-200/50 dark:from-gray-800/50 dark:to-gray-700/50 rounded-xl" />
                    <svg className="w-6 h-6 text-gray-600 dark:text-gray-400 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </motion.button>
                </motion.div>

                {/* Content */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                  className="relative flex-1 overflow-y-auto p-6"
                  style={{ transform: 'translateZ(5px)' }}
                >
                  {/* Airdrop Info Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Snapshot Card */}
                    <motion.div
                      initial={{ opacity: 0, y: 30, rotateX: -10 }}
                      animate={{ opacity: 1, y: 0, rotateX: 0 }}
                      transition={{ delay: 0.5, duration: 0.5 }}
                      whileHover={{ 
                        y: -5,
                        rotateY: 5,
                        scale: 1.02,
                        transition: { duration: 0.2 }
                      }}
                      className="relative group"
                      style={{ transform: 'translateZ(20px)' }}
                    >
                      <div className="relative bg-gradient-to-br from-blue-50 via-blue-100/50 to-cyan-50 dark:from-blue-900/30 dark:via-blue-800/20 dark:to-cyan-900/30 p-6 rounded-2xl border border-blue-200/50 dark:border-blue-700/50 backdrop-blur-sm overflow-hidden">
                        {/* Card Glow */}
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-cyan-400/10 rounded-2xl" />
                        {/* Animated Border */}
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                          className="absolute inset-0 rounded-2xl border-2 border-transparent bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-border"
                          style={{ mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', maskComposite: 'xor' }}
                        />
                        {/* Content */}
                        <div className="relative z-10">
                          <div className="flex items-center space-x-2 mb-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <h3 className="font-bold text-blue-800 dark:text-blue-200">Snapshot Date</h3>
                          </div>
                          <p className="text-blue-700 dark:text-blue-300 font-medium">{airdrop.snapshot}</p>
                        </div>
                      </div>
                    </motion.div>

                    {/* Eligibility Card */}
                    <motion.div
                      initial={{ opacity: 0, y: 30, rotateX: -10 }}
                      animate={{ opacity: 1, y: 0, rotateX: 0 }}
                      transition={{ delay: 0.6, duration: 0.5 }}
                      whileHover={{ 
                        y: -5,
                        rotateY: 5,
                        scale: 1.02,
                        transition: { duration: 0.2 }
                      }}
                      className="relative group"
                      style={{ transform: 'translateZ(20px)' }}
                    >
                      <div className="relative bg-gradient-to-br from-green-50 via-emerald-100/50 to-teal-50 dark:from-green-900/30 dark:via-emerald-800/20 dark:to-teal-900/30 p-6 rounded-2xl border border-green-200/50 dark:border-green-700/50 backdrop-blur-sm overflow-hidden">
                        {/* Card Glow */}
                        <div className="absolute inset-0 bg-gradient-to-br from-green-400/10 to-emerald-400/10 rounded-2xl" />
                        {/* Animated Border */}
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                          className="absolute inset-0 rounded-2xl border-2 border-transparent bg-gradient-to-r from-green-400 via-emerald-400 to-green-400 bg-clip-border"
                          style={{ mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', maskComposite: 'xor' }}
                        />
                        {/* Content */}
                        <div className="relative z-10">
                          <div className="flex items-center space-x-2 mb-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <h3 className="font-bold text-green-800 dark:text-green-200">Eligibility</h3>
                          </div>
                          <p className="text-green-700 dark:text-green-300 font-medium">{airdrop.eligibility}</p>
                        </div>
                      </div>
                    </motion.div>

                    {/* Status Card */}
                    <motion.div
                      initial={{ opacity: 0, y: 30, rotateX: -10 }}
                      animate={{ opacity: 1, y: 0, rotateX: 0 }}
                      transition={{ delay: 0.7, duration: 0.5 }}
                      whileHover={{ 
                        y: -5,
                        rotateY: 5,
                        scale: 1.02,
                        transition: { duration: 0.2 }
                      }}
                      className="relative group"
                      style={{ transform: 'translateZ(20px)' }}
                    >
                      <div className="relative bg-gradient-to-br from-purple-50 via-violet-100/50 to-indigo-50 dark:from-purple-900/30 dark:via-violet-800/20 dark:to-indigo-900/30 p-6 rounded-2xl border border-purple-200/50 dark:border-purple-700/50 backdrop-blur-sm overflow-hidden">
                        {/* Card Glow */}
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-400/10 to-violet-400/10 rounded-2xl" />
                        {/* Animated Border */}
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                          className="absolute inset-0 rounded-2xl border-2 border-transparent bg-gradient-to-r from-purple-400 via-violet-400 to-purple-400 bg-clip-border"
                          style={{ mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', maskComposite: 'xor' }}
                        />
                        {/* Content */}
                        <div className="relative z-10">
                          <div className="flex items-center space-x-2 mb-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-violet-500 rounded-lg flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                            </div>
                            <h3 className="font-bold text-purple-800 dark:text-purple-200">Status</h3>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                            <p className="text-purple-700 dark:text-purple-300 font-medium">Upcoming</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  {/* AI Analysis */}
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, duration: 0.6 }}
                    className="relative"
                    style={{ transform: 'translateZ(15px)' }}
                  >
                    <div className="relative bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-800/80 dark:via-blue-900/20 dark:to-purple-900/20 rounded-2xl p-8 border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm overflow-hidden">
                      {/* Analysis Background Glow */}
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-400/5 via-purple-400/5 to-cyan-400/5 rounded-2xl" />
                      
                      {/* Floating Analysis Elements */}
                      <div className="absolute top-4 right-4 w-16 h-16 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-xl animate-pulse" />
                      <div className="absolute bottom-4 left-4 w-12 h-12 bg-gradient-to-br from-purple-400/20 to-cyan-400/20 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }} />
                      
                      <div className="relative z-10">
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.9, duration: 0.5 }}
                          className="flex items-center space-x-3 mb-6"
                        >
                          {/* 3D AI Icon */}
                          <motion.div
                            whileHover={{ 
                              rotateY: 360,
                              scale: 1.1,
                              transition: { duration: 0.8 }
                            }}
                            className="relative"
                          >
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-500 rounded-xl shadow-[0_8px_25px_rgba(59,130,246,0.4)] flex items-center justify-center relative overflow-hidden">
                              {/* Inner Glow */}
                              <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent rounded-xl" />
                              {/* Icon Content */}
                              <span className="text-white font-black text-sm relative z-10">AI</span>
                              {/* Animated Ring */}
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-0 border-2 border-white/40 rounded-xl"
                              />
                            </div>
                            {/* Shadow Layer */}
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl blur-lg opacity-40 -z-10" />
                          </motion.div>
                          
                          <div>
                            <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 dark:from-white dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent">
                              AI Analysis
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center space-x-2">
                              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                              <span>Powered by Gemini AI</span>
                              {isCached && (
                                <span className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs rounded-full flex items-center space-x-1">
                                  <span>⚡</span>
                                  <span>Cached</span>
                                </span>
                              )}
                            </p>
                          </div>
                        </motion.div>

                        {isLoading && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center justify-center space-y-4 py-8"
                          >
                            <div className="relative">
                              <motion.div 
                                animate={{ rotate: 360 }}
                                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center"
                              >
                                <span className="text-white font-bold">AI</span>
                              </motion.div>
                              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg blur-md opacity-20 animate-pulse" />
                            </div>
                            
                            <div className="text-center">
                              <motion.div
                                animate={{ opacity: [0.7, 1, 0.7] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="text-base font-medium bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
                              >
                                Analyzing Airdrop...
                              </motion.div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                                🤖 AI is crafting an engaging explanation for you
                              </p>
                            </div>
                            
                            <div className="flex space-x-1">
                              <motion.div
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                                className="w-2 h-2 bg-blue-500 rounded-full"
                              />
                              <motion.div
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ duration: 1, repeat: Infinity, delay: 0.3 }}
                                className="w-2 h-2 bg-purple-500 rounded-full"
                              />
                              <motion.div
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ duration: 1, repeat: Infinity, delay: 0.6 }}
                                className="w-2 h-2 bg-blue-500 rounded-full"
                              />
                            </div>
                          </motion.div>
                        )}

                        {error && (
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="relative bg-gradient-to-br from-red-50 via-red-100/50 to-pink-50 dark:from-red-900/30 dark:via-red-800/20 dark:to-pink-900/30 border border-red-200/50 dark:border-red-700/50 rounded-xl p-6 backdrop-blur-sm"
                          >
                            <div className="flex items-center space-x-3 mb-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                              </div>
                              <p className="text-red-700 dark:text-red-300 font-medium">{error}</p>
                            </div>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={fetchAnalysis}
                              className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-lg transition-all duration-200 font-medium shadow-lg"
                            >
                              Retry Analysis
                            </motion.button>
                          </motion.div>
                        )}

                        {analysis && !isLoading && !error && (
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.6 }}
                            className="prose prose-sm max-w-none dark:prose-invert relative"
                          >
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-400/5 via-purple-400/5 to-cyan-400/5 rounded-xl" />
                            <div className="relative z-10 p-6">
                              {formatAnalysis(analysis)}
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </motion.div>

                  {/* Disclaimer */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.0, duration: 0.6 }}
                    className="mt-8 relative"
                    style={{ transform: 'translateZ(10px)' }}
                  >
                    <div className="relative bg-gradient-to-br from-yellow-50 via-amber-100/50 to-orange-50 dark:from-yellow-900/30 dark:via-amber-800/20 dark:to-orange-900/30 border border-yellow-200/50 dark:border-yellow-700/50 rounded-xl p-6 backdrop-blur-sm overflow-hidden">
                      {/* Disclaimer Background Glow */}
                      <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 to-orange-400/5 rounded-xl" />
                      
                      <div className="relative z-10 flex items-start space-x-3">
                        <motion.div
                          animate={{ rotate: [0, 10, -10, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center flex-shrink-0"
                        >
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                        </motion.div>
                        <div>
                          <h4 className="font-bold text-yellow-800 dark:text-yellow-200 mb-2 flex items-center space-x-2">
                            <span>Disclaimer</span>
                            <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                          </h4>
                          <p className="text-yellow-700 dark:text-yellow-300 text-sm leading-relaxed">
                            This AI analysis is for informational purposes only and should not be considered as financial advice. 
                            Always do your own research and consult with financial advisors before making investment decisions.
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AirdropDetailsPopup;
