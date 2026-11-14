import React from 'react';

export type SystemStatus = 'live' | 'demo' | 'offline' | 'error';

export interface StatusBadgeProps {
  status: SystemStatus;
  label?: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  className = '',
}) => {
  if (status === 'live') {
    return (
      <span className={`badge-live ${className}`}>
        {label || 'LIVE'}
      </span>
    );
  }

  if (status === 'demo') {
    return (
      <span className={`badge-demo ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
        {label || 'DEMO DATA'}
      </span>
    );
  }

  if (status === 'offline') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-800/60 border border-gray-700/60 text-gray-400 text-xs font-semibold font-mono tracking-wide ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
        {label || 'Offline'}
      </span>
    );
  }

  if (status === 'error') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold font-mono tracking-wide ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse" />
        {label || 'Error'}
      </span>
    );
  }

  return null;
};

export default StatusBadge;
