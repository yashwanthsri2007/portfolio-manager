import React from 'react';
import { Search, Bell, Sparkles, RefreshCw, Wallet, Radio } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useSettings } from '../../context/SettingsContext';
import { usePortfolio } from '../../context/PortfolioContext';
import { formatCurrency } from '../../utils/formatters';

export interface HeaderProps {
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
  onOpenCashModal?: () => void;
  onOpenSetupModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSearch,
  onOpenNotifications,
  onOpenCashModal
}) => {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const { settings, updateSettings } = useSettings();
  const { isRefreshing, refreshMarketData, cashBalance } = usePortfolio();

  // Dynamic greeting based on current local time
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12
    ? 'Good morning'
    : currentHour < 17
    ? 'Good afternoon'
    : 'Good evening';

  const hasApiKey = Boolean(settings.finnhubKey || import.meta.env.VITE_FINNHUB_API_KEY);

  return (
    <header className="h-16 bg-[#0E1422]/90 backdrop-blur-md border-b border-gray-800/60 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Dynamic Greeting & Live Market Ticker */}
      <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-1 text-xs font-mono">
        {/* Dynamic Personal Greeting */}
        <div className="hidden sm:flex items-center gap-2 pr-2 border-r border-gray-800/80">
          <span className="text-gray-400 font-sans text-xs">
            {greeting},{' '}
            <strong className="text-white font-semibold">
              {user.name || 'Yashwanth'}
            </strong>
          </span>
        </div>

        {/* Live Market Indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold">MARKETS LIVE</span>
        </div>

        {/* Finnhub API Status */}
        <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-mono text-gray-400">
          <Radio className={`w-3.5 h-3.5 ${hasApiKey ? 'text-cyan-400' : 'text-amber-400'}`} />
          <span>FINNHUB: <strong className={hasApiKey ? 'text-cyan-400' : 'text-amber-400'}>
            {hasApiKey ? 'READY' : 'OFFLINE (MANUAL FALLBACK)'}
          </strong></span>
        </div>
      </div>

      {/* Right Action Icons */}
      <div className="flex items-center gap-3">
        {/* Available Cash Pill */}
        {onOpenCashModal && (
          <button
            onClick={onOpenCashModal}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-semibold transition-all shadow-sm"
            title="Manage Cash: Deposit or Withdraw Funds"
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline text-[11px] text-gray-400 font-sans">Cash:</span>
            <span>{formatCurrency(cashBalance)}</span>
          </button>
        )}

        {/* Market Data Refresh Button */}
        <button
          onClick={refreshMarketData}
          disabled={isRefreshing}
          className={`p-2 rounded-xl bg-gray-800/50 hover:bg-gray-800 text-gray-300 hover:text-cyan-400 border border-gray-700/50 transition-all ${
            isRefreshing ? 'animate-spin text-cyan-400' : ''
          }`}
          title="Refresh Finnhub & Metals Market Data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Demo Mode Toggle Badge */}
        {settings.isDemoMode && (
          <button
            onClick={() => updateSettings({ isDemoMode: false })}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/40 text-amber-400 hover:bg-amber-500/20 transition-all"
            title="Click to switch to your real portfolio"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>SAMPLE MODE ACTIVE</span>
          </button>
        )}

        {/* Global Search Button (Ctrl+K) */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-800/40 hover:bg-gray-800/80 border border-gray-700/60 text-gray-400 hover:text-cyan-300 text-xs transition-all"
        >
          <Search className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden md:inline">Search...</span>
          <kbd className="px-1.5 py-0.5 rounded bg-gray-900 text-[10px] text-gray-400 border border-gray-700 font-mono">
            Ctrl K
          </kbd>
        </button>

        {/* Notifications Trigger */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 rounded-xl bg-gray-800/40 hover:bg-gray-800 text-gray-300 hover:text-cyan-400 border border-gray-700/60 transition-all"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-cyan-500 text-black font-bold text-[9px] flex items-center justify-center animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-2 pl-2 border-l border-gray-800">
          <img
            src={user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'}
            alt={user.name || 'Yashwanth'}
            className="w-8 h-8 rounded-full border border-cyan-500/40 object-cover cursor-pointer hover:border-cyan-400 transition-all"
            title={`Signed in as ${user.name || 'Yashwanth'}`}
          />
        </div>
      </div>
    </header>
  );
};
