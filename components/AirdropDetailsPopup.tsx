'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AirdropDetails } from '@/lib/gemini';
import { X, Calendar, CheckCircle, BrainCircuit, AlertTriangle, Info } from 'lucide-react';

// Helper function to format the analysis content
const formatAnalysis = (text: string) => {
  let html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic text-gray-300">$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-gray-700 text-sm rounded px-1.5 py-1 font-mono">$1</code>')
    .replace(/(\d+\.\s)/g, '<br /><br />$1');
  
  // Add custom styling for lists
  html = html.replace(/<br \/><br \/>(\d+\.\s.*?)((?=<br \/><br \/>\d+\.\s)|$)/gs, (match, item) => {
    return `<div class="flex items-start mt-3">${item.replace(/(\d+\.)/, '<span class="text-blue-400 font-semibold mr-3">$1</span>')}</div>`;
  });

  return <div className="text-gray-300 space-y-2" dangerouslySetInnerHTML={{ __html: html }} />;
};


interface AirdropDetailsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  airdrop: AirdropDetails;
}

const AirdropDetailsPopup: React.FC<AirdropDetailsPopupProps> = ({ isOpen, onClose, airdrop }) => {
  const [analysis, setAnalysis] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const fetchAnalysis = useCallback(async () => {
    if (!airdrop) return;
    setIsLoading(true);
    setError('');
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch('/api/airdrop-explainer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ airdrop }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to get analysis.');
      }

      setAnalysis(data.explanation);
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('The analysis is taking too long. Please try again later.');
        } else {
          setError(err.message);
        }
      } else {
        setError('An unknown error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [airdrop]);

  useEffect(() => {
    if (isOpen) {
      fetchAnalysis();
    }
  }, [isOpen, fetchAnalysis]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-lg z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 180 }}
            className="relative w-full max-w-4xl h-[90vh] bg-gray-900/50 border border-gray-700 rounded-2xl shadow-2xl shadow-blue-500/10 flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <header className="flex items-center justify-between p-5 border-b border-gray-800 flex-shrink-0">
              <div className="flex items-center space-x-4">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, rotate: 360 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                  className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center"
                >
                  <BrainCircuit className="text-white" />
                </motion.div>
                <div>
                  <h2 className="text-xl font-bold text-white">{airdrop.title}</h2>
                  <p className="text-sm text-gray-400">Airdrop Details</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-2 rounded-full text-gray-400 hover:bg-gray-800"
              >
                <X size={24} />
              </motion.button>
            </header>

            {/* Content */}
            <main className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Details */}
              <div className="flex flex-col space-y-6">
                <InfoCard icon={<Calendar />} title="Snapshot Date" content={airdrop.snapshot} />
                <InfoCard icon={<CheckCircle />} title="Eligibility" content={airdrop.eligibility} />
              </div>

              {/* Right Column: AI Analysis */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5 flex flex-col">
                <h3 className="font-semibold text-white text-lg mb-4 flex items-center">
                  <BrainCircuit className="mr-3 text-blue-400" />
                  Analysis
                </h3>
                
                {isLoading && <LoadingState />}
                {error && <ErrorState message={error} onRetry={fetchAnalysis} />}
                {!isLoading && !error && analysis && (
                  <div className="prose prose-invert max-w-none text-gray-300">
                    {formatAnalysis(analysis)}
                  </div>
                )}
              </div>
            </main>

            {/* Footer */}
            <footer className="p-4 border-t border-gray-800 text-center text-xs text-gray-500">
              Powered by <span className="font-semibold text-blue-400">Alex</span>. Analysis is AI-generated and may contain inaccuracies.
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const InfoCard = ({ icon, title, content }: { icon: React.ReactElement<{ className?: string }>, title: string, content: string }) => (
  <motion.div 
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: 0.3 }}
    className="bg-gray-800/50 border border-gray-700 p-4 rounded-lg"
  >
    <div className="flex items-center text-gray-400 mb-2">
      {React.cloneElement(icon, { className: `mr-2 ${icon.props.className || ''}` })}
      <h3 className="font-semibold text-sm">{title}</h3>
    </div>
    <p className="text-white font-medium">{content}</p>
  </motion.div>
);

const LoadingState = () => (
  <div className="flex flex-col items-center justify-center h-full text-center">
    <motion.div 
      animate={{ rotate: 360 }} 
      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
      className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mb-4"
    />
    <p className="text-gray-300">Alex is analyzing the airdrop...</p>
    <p className="text-xs text-gray-500 mt-1">This may take a moment.</p>
  </div>
);

const ErrorState = ({ message, onRetry }: { message: string, onRetry: () => void }) => (
  <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg text-center">
    <AlertTriangle className="mx-auto mb-2" />
    <p className="font-semibold mb-2">Analysis Failed</p>
    <p className="text-sm mb-4">{message}</p>
    <button
      onClick={onRetry}
      className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
    >
      Try Again
    </button>
  </div>
);

export default AirdropDetailsPopup;
