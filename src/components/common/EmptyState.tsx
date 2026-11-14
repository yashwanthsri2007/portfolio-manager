import React from 'react';
import { LucideIcon, FolderSearch } from 'lucide-react';
import { motion } from 'framer-motion';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = FolderSearch,
  title,
  message,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`relative flex flex-col items-center justify-center p-8 md:p-12 text-center max-w-md mx-auto overflow-hidden ${className}`}
    >
      {/* Subtle Background Glow Rings */}
      <div className="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none">
        <div className="w-48 h-48 rounded-full bg-cyan-500/5 blur-2xl" />
        <div className="w-64 h-64 rounded-full border border-cyan-500/10 animate-spin-slow opacity-30" />
      </div>

      {/* Icon Capsule */}
      <div className="relative mb-5">
        <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.18)]">
          <Icon className="w-8 h-8" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-violet-600/40 border border-violet-400/60" />
      </div>

      {/* Title & Message */}
      <h3 className="text-lg font-bold text-gray-100 tracking-wide mb-2">
        {title}
      </h3>
      <p className="text-sm text-gray-400 leading-relaxed mb-6 max-w-xs">
        {message}
      </p>

      {/* Action Button */}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="glass-button-cyan text-sm py-2 px-5 rounded-xl shadow-lg hover:shadow-cyan-500/25"
        >
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
};

export default EmptyState;
