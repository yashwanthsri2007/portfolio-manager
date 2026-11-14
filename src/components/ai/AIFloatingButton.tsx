import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Sparkles } from 'lucide-react';

export interface AIFloatingButtonProps {
  onClick: () => void;
  isOpen: boolean;
}

export const AIFloatingButton: React.FC<AIFloatingButtonProps> = ({ onClick, isOpen }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
      {/* Tooltip */}
      <AnimatePresence>
        {isHovered && !isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 10, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 10, scale: 0.9 }}
            className="px-3.5 py-1.5 rounded-xl glass-card border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.3)] text-xs font-mono font-bold text-cyan-300 pointer-events-none hidden sm:flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>CyberFinance AI</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <div className="relative">
        {/* Pulse outer aura when closed */}
        {!isOpen && (
          <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-cyan-500 to-violet-600 opacity-70 blur-md animate-pulse-slow pointer-events-none" />
        )}

        <motion.button
          onClick={onClick}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          aria-label={isOpen ? 'Close CyberFinance AI' : 'Open CyberFinance AI'}
          className={`relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-2xl ${
            isOpen
              ? 'bg-gray-900 border border-red-500/50 text-red-400 shadow-[0_0_25px_rgba(239,68,68,0.35)]'
              : 'bg-gradient-to-br from-cyan-400 via-cyan-500 to-violet-600 text-black shadow-[0_0_30px_rgba(6,182,212,0.5)] border border-white/20'
          }`}
        >
          {isOpen ? (
            <X className="w-6 h-6 stroke-[2.5]" />
          ) : (
            <div className="relative flex items-center justify-center">
              <Bot className="w-6 h-6 text-black stroke-[2.2]" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-cyan-400 animate-ping" />
            </div>
          )}
        </motion.button>
      </div>
    </div>
  );
};

export default AIFloatingButton;
