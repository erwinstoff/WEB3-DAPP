'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AirdropDetails } from '@/lib/types';
import { X, Calendar, CheckCircle, BrainCircuit, AlertTriangle, Info } from 'lucide-react';

// Helper function to format the analysis content with modern styling
const formatAnalysis = (text: string) => {
  // Convert markdown to modern HTML with emojis and colors
  const lines = text.split('\n');
  const formattedLines = lines.map((line, index) => {
    const trimmed = line.trim();
    
    // Handle headers with emojis and colors
    if (trimmed.startsWith('## ')) {
      const title = trimmed.slice(3);
      let emoji = '📋';
      let colorClass = 'text-blue-400';
      
      // Add specific emojis and colors for different sections
      if (title.toLowerCase().includes('overview')) {
        emoji = '🚀';
        colorClass = 'text-blue-400';
      } else if (title.toLowerCase().includes('token') || title.toLowerCase().includes('distribution')) {
        emoji = '💰';
        colorClass = 'text-green-400';
      } else if (title.toLowerCase().includes('eligibility') || title.toLowerCase().includes('requirement')) {
        emoji = '✅';
        colorClass = 'text-green-400';
      } else if (title.toLowerCase().includes('participate') || title.toLowerCase().includes('claim')) {
        emoji = '🎯';
        colorClass = 'text-purple-400';
      } else if (title.toLowerCase().includes('timeline') || title.toLowerCase().includes('date')) {
        emoji = '📅';
        colorClass = 'text-orange-400';
      } else if (title.toLowerCase().includes('market') || title.toLowerCase().includes('analysis')) {
        emoji = '📈';
        colorClass = 'text-cyan-400';
      } else if (title.toLowerCase().includes('takeaway') || title.toLowerCase().includes('summary')) {
        emoji = '⚡';
        colorClass = 'text-yellow-400';
      }
      
      return (
        <h2 key={index} className={`text-xl font-bold ${colorClass} mt-8 mb-4 flex items-center gap-2`}>
          <span>{emoji}</span>
          <span>{title}</span>
        </h2>
      );
    }
    
    // Handle subheaders
    if (trimmed.startsWith('### ')) {
      return (
        <h3 key={index} className="text-lg font-semibold text-white mt-6 mb-3 flex items-center gap-2">
          <span>🔹</span>
          <span>{trimmed.slice(4)}</span>
        </h3>
      );
    }
    
    // Handle bullet points with emojis
    if (trimmed.startsWith('- ')) {
      const content = trimmed.slice(2);
      let emoji = '•';
      
      // Add relevant emojis based on content
      if (content.toLowerCase().includes('token')) emoji = '🪙';
      else if (content.toLowerCase().includes('governance')) emoji = '🗳️';
      else if (content.toLowerCase().includes('utility')) emoji = '⚙️';
      else if (content.toLowerCase().includes('community')) emoji = '👥';
      else if (content.toLowerCase().includes('wallet')) emoji = '👛';
      else if (content.toLowerCase().includes('security')) emoji = '🔒';
      else if (content.toLowerCase().includes('network')) emoji = '🌐';
      else if (content.toLowerCase().includes('fee')) emoji = '⛽';
      
      return (
        <div key={index} className="ml-6 mb-3 text-gray-300 flex items-start gap-2">
          <span className="text-blue-400 mt-1">{emoji}</span>
          <span className="leading-relaxed">{content}</span>
        </div>
      );
    }
    
    // Handle numbered lists with emojis
    if (/^\d+\. /.test(trimmed)) {
      const match = trimmed.match(/^(\d+)\. (.*)/);
      if (match) {
        const number = match[1];
        const content = match[2];
        let emoji = '🔢';
        
        // Add step emojis for numbered lists
        if (content.toLowerCase().includes('verify') || content.toLowerCase().includes('check')) emoji = '🔍';
        else if (content.toLowerCase().includes('prepare') || content.toLowerCase().includes('setup')) emoji = '⚙️';
        else if (content.toLowerCase().includes('connect') || content.toLowerCase().includes('link')) emoji = '🔗';
        else if (content.toLowerCase().includes('claim') || content.toLowerCase().includes('execute')) emoji = '⚡';
        else if (content.toLowerCase().includes('secure') || content.toLowerCase().includes('store')) emoji = '🔐';
        
        return (
          <div key={index} className="ml-6 mb-3 text-gray-300 flex items-start gap-2">
            <span className="text-purple-400 mt-1">{emoji}</span>
            <span className="leading-relaxed">
              <span className="font-semibold text-purple-400">{number}.</span> {content}
            </span>
          </div>
        );
      }
    }
    
    // Handle empty lines
    if (trimmed === '') {
      return <div key={index} className="mb-4"></div>;
    }
    
    // Handle regular paragraphs with better spacing
    return (
      <p key={index} className="mb-4 text-gray-300 leading-relaxed text-base">
        {trimmed}
      </p>
    );
  });
  
  return (
    <div className="space-y-1">
      {formattedLines}
    </div>
  );
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
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 30 }}
            transition={{ type: 'spring', damping: 20, stiffness: 150 }}
            className="relative w-full max-w-3xl h-auto max-h-[85vh] bg-gray-900 border border-gray-700/50 rounded-xl shadow-lg flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <header className="flex items-center justify-between p-4 border-b border-gray-800 flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center border border-blue-500/30">
                  <BrainCircuit className="text-blue-400" size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-100">{airdrop.title}</h2>
                  <p className="text-xs text-gray-400">Professional Analysis</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, backgroundColor: '#374151' }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-2 rounded-full text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </motion.button>
            </header>

            {/* Content */}
            <main className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-gray-600">
              {/* Details Section - now vertical */}
              <div className="flex flex-col space-y-4">
                <InfoCard icon={<Calendar size={18} />} title="Snapshot Date" content={airdrop.snapshot} />
                <InfoCard icon={<CheckCircle size={18} />} title="Eligibility" content={airdrop.eligibility} />
              </div>

              {/* AI Analysis Section */}
              <div className="bg-gray-800/40 border border-gray-700/50 rounded-lg p-5">
                <h3 className="font-medium text-gray-200 text-base mb-3 flex items-center">
                  <BrainCircuit className="mr-2.5 text-blue-500" size={18} />
                  Analysis Report
                </h3>
                
                {isLoading && <LoadingState />}
                {error && <ErrorState message={error} onRetry={fetchAnalysis} />}
                {!isLoading && !error && analysis && (
                  <div className="text-gray-300 leading-relaxed">
                    {formatAnalysis(analysis)}
                  </div>
                )}
              </div>
            </main>

            {/* Footer */}
            <footer className="p-3 border-t border-gray-800 text-center text-xs text-gray-500">
              Analysis provided for informational purposes. Always conduct your own research (DYOR).
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const InfoCard = ({ icon, title, content }: { icon: React.ReactNode, title: string, content: string }) => (
  <div className="bg-gray-800/60 p-4 rounded-lg border border-gray-700/60">
    <div className="flex items-center text-gray-400 mb-1.5">
      <div className="mr-2 text-gray-500">
        {icon}
      </div>
      <h3 className="font-medium text-xs uppercase tracking-wider">{title}</h3>
    </div>
    <p className="text-gray-100 font-semibold text-sm">{content}</p>
  </div>
);

const LoadingState = () => (
  <div className="flex items-center justify-center py-10">
    <motion.div 
      animate={{ rotate: 360 }} 
      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
      className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mr-3"
    />
    <p className="text-sm text-gray-400">Generating analysis...</p>
  </div>
);

const ErrorState = ({ message, onRetry }: { message: string, onRetry: () => void }) => (
  <div className="bg-red-900/30 border border-red-700/50 text-red-300 p-4 rounded-lg text-center">
    <AlertTriangle className="mx-auto mb-2" size={24} />
    <p className="font-semibold mb-1">Analysis Failed</p>
    <p className="text-xs mb-3">{message}</p>
    <button
      onClick={onRetry}
      className="bg-red-600/80 hover:bg-red-600 text-white font-bold py-1.5 px-4 rounded-md text-sm transition-colors"
    >
      Try Again
    </button>
  </div>
);

export default AirdropDetailsPopup;
