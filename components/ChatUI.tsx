'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Types
export type Message = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt?: string;
};

export interface ChatUIProps {
  messages: Message[];
  isTyping?: boolean;
  isSending?: boolean;
  onSend: (text: string) => Promise<void> | void;
  onAttach?: () => void;
  autoFocus?: boolean;
  className?: string;
}

// Small fade-in + slide-up variants for message bubbles
const bubbleVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.18 } },
  exit: { opacity: 0, y: 8, transition: { duration: 0.15 } }
};

// Fallback markdown renderer if `react-markdown` is not installed yet.
// Keep extremely small and safe (no HTML injection). Only supports line breaks and basic **bold**.
const FallbackMarkdown: React.FC<{ children: string; className?: string }> = ({ children, className }) => {
  const parts = useMemo(() => {
    const segments = children.split(/(\*\*[^*]+\*\*)/g);
    return segments.map((seg, idx) => {
      if (/^\*\*[^*]+\*\*$/.test(seg)) {
        return <strong key={idx} className="font-semibold">{seg.replace(/\*\*/g, '')}</strong>;
      }
      return <React.Fragment key={idx}>{seg}</React.Fragment>;
    });
  }, [children]);

  return (
    <p className={className}>
      {parts}
    </p>
  );
};

// Hook: auto-scroll to latest with manual override and "Jump to latest" control
function useAutoScroll(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [isUserPinned, setIsUserPinned] = useState<boolean>(false);
  const [showJumpButton, setShowJumpButton] = useState<boolean>(false);

  const isNearBottom = useCallback((): boolean => {
    const el = containerRef.current;
    if (!el) return true;
    const thresholdPx = 72; // within 72px from bottom counts as at bottom
    return el.scrollHeight - el.scrollTop - el.clientHeight < thresholdPx;
  }, [containerRef]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, [containerRef]);

  const handleScroll = useCallback(() => {
    const atBottom = isNearBottom();
    setIsUserPinned(!atBottom);
    setShowJumpButton(!atBottom);
  }, [isNearBottom]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [containerRef, handleScroll]);

  return { isUserPinned, showJumpButton, scrollToBottom };
}

const ChatUI: React.FC<ChatUIProps> = ({
  messages,
  isTyping = false,
  isSending = false,
  onSend,
  onAttach,
  autoFocus = false,
  className
}) => {
  // Use fallback markdown renderer for now
  const MarkdownRenderer = FallbackMarkdown;

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const listEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll management
  const { showJumpButton, scrollToBottom } = useAutoScroll(containerRef);

  // Local input state for the composer
  const [draft, setDraft] = useState<string>('');

  // Focus the composer on mount if requested
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  // Auto scroll on new messages if user is at bottom
  useEffect(() => {
    // Attempt smooth scroll to latest message on updates
    scrollToBottom('smooth');
  }, [messages, scrollToBottom]);

  // Auto-size textarea up to 3 lines
  const autoSizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '0px';
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight || '20');
    const maxHeight = lineHeight * 3;
    const next = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${next}px`;
  }, []);

  useEffect(() => {
    autoSizeTextarea();
  }, [draft, autoSizeTextarea]);

  // Keyboard handlers for sending
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!draft.trim() || isSending) return;
      void (async () => {
        await onSend(draft.trim());
        setDraft('');
        // Ensure we scroll after sending
        setTimeout(() => scrollToBottom('smooth'), 50);
      })();
    }
  }, [draft, isSending, onSend, scrollToBottom]);

  const handleClickSend = useCallback(() => {
    if (!draft.trim() || isSending) return;
    void (async () => {
      await onSend(draft.trim());
      setDraft('');
      setTimeout(() => scrollToBottom('smooth'), 50);
    })();
  }, [draft, isSending, onSend, scrollToBottom]);

  const rootClasses = [
    'relative',
    'flex',
    'flex-col',
    'w-full',
    'h-full', // Use full height of container
    'text-[15px]',
    'font-sans',
    'bg-slate-900' // Solid dark background
  ];

  // Accent palette - professional blue gradient
  const accentFrom = 'from-blue-500';
  const accentTo = 'to-purple-600';

  return (
    <div className={[...rootClasses, className || ''].join(' ')} aria-label="Chat container">
      {/* Messages list */}
      <div
        ref={containerRef}
        role="list"
        className="flex-1 overflow-y-auto px-4 sm:px-6 pt-6 pb-20 space-y-4 scroll-smooth"
        style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
      >
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              role="listitem"
              variants={bubbleVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {/* Bubble */}
              <div
                className={`group max-w-[85%] sm:max-w-[75%] rounded-2xl shadow-lg transition-all duration-200 ${
                  m.role === 'user'
                    ? `bg-gradient-to-br ${accentFrom} ${accentTo} text-white shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.02]`
                    : 'bg-slate-800 border border-slate-700 text-gray-100 hover:bg-slate-700 hover:border-slate-600 hover:scale-[1.01]'
                }`}
              >
                <div className="px-4 py-3 leading-relaxed tracking-tight whitespace-pre-wrap">
                  {m.role === 'assistant' ? (
                    <div className="text-gray-100">
                      {m.text.includes('[CONTACT_US_BUTTON]') ? (
                        <>
                          {m.text.split('[CONTACT_US_BUTTON]').map((part, i) => (
                            <React.Fragment key={i}>
                              <MarkdownRenderer>{part}</MarkdownRenderer>
                              {i < m.text.split('[CONTACT_US_BUTTON]').length - 1 && (
                                <button
                                  onClick={() => {
                                      const contactUrl = process.env.NEXT_PUBLIC_CONTACT_URL || '#';
                                      window.open(contactUrl, '_blank', 'noopener,noreferrer');
                                  }}
                                  className="inline-flex items-center gap-2 px-4 py-2 my-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 transition-all"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4-.8L3 20l.8-4A7.5 7.5 0 113 12" /></svg>
                                  Contact Us
                                </button>
                              )}
                            </React.Fragment>
                          ))}
                        </>
                      ) : (
                        <MarkdownRenderer>{m.text}</MarkdownRenderer>
                      )}
                    </div>
                  ) : (
                    <span className="text-white font-medium">{m.text}</span>
                  )}
                </div>
                {m.createdAt && (
                  <div className="px-4 pb-2">
                    <span className="text-[11px] text-gray-400">{m.createdAt}</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Anchor for scrolling */}
        <div ref={listEndRef} />

        {/* Typing indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              key="typing"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="flex justify-start"
            >
              <div className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 shadow-lg max-w-[65%]">
                <div className="flex items-center gap-2">
                  <span className="text-gray-200 text-sm font-medium">Alex is typing</span>
                  <motion.span
                    className="flex gap-1"
                    aria-label="Assistant is typing"
                  >
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-blue-400"
                        animate={{ opacity: [0.2, 1, 0.2], y: [0, -2, 0] }}
                        transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </motion.span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Jump to latest */}
        <AnimatePresence>
          {showJumpButton && (
            <motion.button
              key="jump-latest"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              onClick={() => scrollToBottom('smooth')}
              className="fixed bottom-28 right-4 z-20 px-3 py-1.5 text-sm rounded-full bg-slate-800 border border-slate-700 text-gray-200 shadow-lg hover:bg-slate-700 hover:border-slate-600"
            >
              Jump to latest
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Composer - sticky to bottom, keyboard-safe */}
      <div
        className="sticky bottom-0 left-0 right-0 z-30"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="px-4 sm:px-6 pb-4 bg-slate-900 border-t border-slate-700">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-3 rounded-2xl bg-slate-800 border border-slate-700 shadow-lg p-3">
              {/* Optional attach */}
              {onAttach && (
                <motion.button
                  type="button"
                  onClick={onAttach}
                  className="hidden sm:inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-700 text-gray-300 hover:bg-slate-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label="Attach"
                >
                  {/* paperclip icon */}
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l10.6-10.6a4 4 0 115.66 5.66L8.99 18.24a2 2 0 11-2.83-2.83l9.19-9.19"/></svg>
                </motion.button>
              )}

              {/* Textarea (auto-size up to 3 lines) */}
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Ask Alex anything..."
                aria-label="Chat message composer"
                className="flex-1 min-h-[44px] max-h-[132px] leading-[1.45] bg-transparent text-gray-100 placeholder:text-gray-400 outline-none resize-none px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />

              {/* Send button */}
              <motion.button
                type="button"
                onClick={handleClickSend}
                disabled={!draft.trim() || isSending}
                className={`inline-flex items-center justify-center px-5 h-11 rounded-xl text-white font-semibold shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500/60 transition-all duration-200 ${
                  (!draft.trim() || isSending)
                    ? 'bg-gradient-to-r from-slate-600 to-slate-700 cursor-not-allowed opacity-60'
                    : `bg-gradient-to-r ${accentFrom} ${accentTo} hover:shadow-xl hover:scale-105 active:scale-95`
                }`}
                whileHover={(!draft.trim() || isSending) ? undefined : { scale: 1.03 }}
                whileTap={(!draft.trim() || isSending) ? undefined : { scale: 0.97 }}
                aria-disabled={!draft.trim() || isSending}
                aria-label="Send message"
              >
                {/* send icon */}
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Notes for developers: This component is UI-only. Wire up onSend/onAttach to your logic. */}
    </div>
  );
};

export default ChatUI;

/*
Example usage:

// import ChatUI, { Message } from '@/components/ChatUI';

// const [messages, setMessages] = useState<Message[]>([]);
// const [isAssistantTyping, setIsAssistantTyping] = useState(false);
// const [isSending, setIsSending] = useState(false);

// <ChatUI
//   messages={messages}
//   isTyping={isAssistantTyping}
//   isSending={isSending}
//   autoFocus
//   onSend={async (text) => {
//     setIsSending(true);
//     try {
//       // push user message
//       setMessages((prev) => [...prev, { id: Math.random().toString(36).substr(2, 9), role: 'user', text, createdAt: new Date().toLocaleTimeString() }]);
//       // simulate assistant
//       setIsAssistantTyping(true);
//       await new Promise((r) => setTimeout(r, 800));
//       setMessages((prev) => [...prev, { id: Math.random().toString(36).substr(2, 9), role: 'assistant', text: `You said: ${text}`, createdAt: new Date().toLocaleTimeString() }]);
//     } finally {
//       setIsAssistantTyping(false);
//       setIsSending(false);
//     }
//   }}
// />
*/


