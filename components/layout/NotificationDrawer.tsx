import React from 'react';
import { X, Bell, CheckCheck, AlertCircle, Info, ShieldAlert, Sparkles } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

export interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ isOpen, onClose }) => {
  const { notifications, markAsRead, markAllAsRead, clearNotifications } = useNotifications();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-md bg-[#111827] border-l border-gray-800 h-full flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-bold text-gray-100 uppercase tracking-wider">
              Notification Intelligence
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Controls */}
        <div className="px-4 py-2 bg-gray-900/60 border-b border-gray-800 flex items-center justify-between text-xs font-mono">
          <button
            onClick={markAllAsRead}
            className="text-cyan-400 hover:underline flex items-center gap-1"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </button>
          <button
            onClick={clearNotifications}
            className="text-gray-500 hover:text-red-400 transition-colors"
          >
            Clear all
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.map((item) => (
            <div
              key={item.id}
              onClick={() => markAsRead(item.id)}
              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                item.read
                  ? 'bg-gray-900/40 border-gray-800/60 text-gray-400'
                  : 'bg-cyan-950/20 border-cyan-500/30 text-gray-200 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {item.type === 'warning' ? (
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                  ) : item.type === 'success' ? (
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Info className="w-4 h-4 text-cyan-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold text-gray-200">{item.title}</p>
                    <span className="text-[10px] font-mono text-gray-500">{item.timestamp}</span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">{item.message}</p>
                </div>
              </div>
            </div>
          ))}

          {notifications.length === 0 && (
            <div className="py-20 text-center text-gray-500 text-xs font-mono">
              No active notifications.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 text-center text-[10px] font-mono text-gray-500">
          PORTFOLIO MANAGER Real-Time Alert Stream
        </div>
      </div>
    </div>
  );
};
