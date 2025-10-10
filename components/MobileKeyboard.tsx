'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface MobileKeyboardProps {
  onKeyPress: (key: string) => void;
  onBackspace: () => void;
  onSend: () => void;
  theme: 'light' | 'dark';
}

const MobileKeyboard: React.FC<MobileKeyboardProps> = ({ onKeyPress, onBackspace, onSend, theme }) => {
  const rows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
  ];

  const specialKeys = [
    { key: 'space', label: 'Space', width: 'flex-1' },
    { key: 'backspace', label: '⌫', width: 'w-16', action: onBackspace },
    { key: 'send', label: 'Send', width: 'w-20', action: onSend, className: 'bg-blue-500 text-white' }
  ];

  const handleKeyPress = (key: string) => {
    if (key === 'space') {
      onKeyPress(' ');
    } else {
      onKeyPress(key);
    }
  };

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`fixed bottom-0 left-0 right-0 z-50 p-4 border-t ${
        theme === 'dark' 
          ? 'bg-neutral-900 border-neutral-700' 
          : 'bg-white border-gray-200'
      }`}
      style={{ 
        paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.1)'
      }}
    >
      {/* Regular keyboard rows */}
      <div className="space-y-2 mb-3">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-center gap-1">
            {row.map((key) => (
              <motion.button
                key={key}
                onClick={() => handleKeyPress(key)}
                className={`w-8 h-10 rounded-lg font-semibold text-sm transition-all duration-150 ${
                  theme === 'dark'
                    ? 'bg-neutral-800 text-white hover:bg-neutral-700 active:bg-neutral-600'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200 active:bg-gray-300'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {key}
              </motion.button>
            ))}
          </div>
        ))}
      </div>

      {/* Special keys row */}
      <div className="flex gap-2">
        {specialKeys.map((specialKey) => (
          <motion.button
            key={specialKey.key}
            onClick={specialKey.action || (() => handleKeyPress(specialKey.key))}
            className={`h-10 rounded-lg font-semibold text-sm transition-all duration-150 flex items-center justify-center ${
              specialKey.className || (
                theme === 'dark'
                  ? 'bg-neutral-800 text-white hover:bg-neutral-700 active:bg-neutral-600'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200 active:bg-gray-300'
              )
            } ${specialKey.width}`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {specialKey.label}
          </motion.button>
        ))}
      </div>

      {/* Quick action buttons */}
      <div className="flex gap-2 mt-3">
        {['?', '!', '@', '#', '$', '%'].map((symbol) => (
          <motion.button
            key={symbol}
            onClick={() => handleKeyPress(symbol)}
            className={`w-8 h-8 rounded-lg font-semibold text-sm transition-all duration-150 ${
              theme === 'dark'
                ? 'bg-neutral-800 text-white hover:bg-neutral-700 active:bg-neutral-600'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200 active:bg-gray-300'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {symbol}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
};

export default MobileKeyboard;
