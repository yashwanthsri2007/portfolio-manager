import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

export type GlassCardVariant = 'default' | 'cyan' | 'emerald' | 'red' | 'gold' | 'violet';

export interface GlassCardProps extends Omit<HTMLMotionProps<'div'>, 'onClick'> {
  children: React.ReactNode;
  className?: string;
  variant?: GlassCardVariant;
  hover?: boolean;
  glow?: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

const variantStyles: Record<GlassCardVariant, string> = {
  default: 'glass-card',
  cyan: 'glass-card-cyan',
  emerald: 'glass-card-emerald',
  red: 'glass-card-red',
  gold: 'glass-card-gold',
  violet: 'bg-[#111827]/75 backdrop-blur-md border border-[#7C3AED]/35 shadow-[0_0_15px_rgba(124,58,237,0.15)]',
};

const glowStyles: Record<GlassCardVariant, string> = {
  default: 'glow-ring-cyan',
  cyan: 'glow-ring-cyan',
  emerald: 'shadow-[0_0_25px_rgba(16,185,129,0.3)] border-emerald-500/60',
  red: 'shadow-[0_0_25px_rgba(239,68,68,0.3)] border-red-500/60',
  gold: 'shadow-[0_0_25px_rgba(245,158,11,0.3)] border-amber-500/60',
  violet: 'shadow-[0_0_25px_rgba(124,58,237,0.35)] border-violet-500/60',
};

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  variant = 'default',
  hover = false,
  glow = false,
  onClick,
  ...props
}) => {
  const baseClasses = 'rounded-2xl relative overflow-hidden transition-colors duration-300';
  const variantClass = variantStyles[variant];
  const hoverClass = hover ? 'glass-card-hover cursor-pointer' : '';
  const glowClass = glow ? glowStyles[variant] : '';

  return (
    <motion.div
      onClick={onClick}
      whileHover={hover ? { y: -3, scale: 1.008 } : undefined}
      whileTap={hover ? { scale: 0.995 } : undefined}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`${baseClasses} ${variantClass} ${hoverClass} ${glowClass} ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default GlassCard;
