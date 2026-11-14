import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: ModalSize;
  className?: string;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  className = '',
}) => {
  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Dark Overlay Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 glass-modal-overlay"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full ${sizeClasses[size]} bg-[#111827]/95 backdrop-blur-2xl border border-gray-800 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden my-auto z-10 ${className}`}
          >
            {/* Header */}
            {title ? (
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800/80 bg-gray-900/40">
                <h3 className="text-sm sm:text-base font-bold text-gray-100 tracking-wider uppercase">
                  {title}
                </h3>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-xl text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-colors"
                  title="Close Modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-20 p-1.5 rounded-xl text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-colors"
                title="Close Modal"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {/* Content Body */}
            <div className="p-6 max-h-[80vh] overflow-y-auto scrollbar-thin">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
