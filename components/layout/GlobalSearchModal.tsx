import React, { useState, useEffect } from 'react';
import { Search, X, TrendingUp, PieChart, Coins, Navigation, ArrowRight } from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext';

export interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNav: (tab: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectNav
}) => {
  const [query, setQuery] = useState('');
  const { holdings } = usePortfolio();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open signal
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const pageLinks = [
    { id: 'overview', name: 'Overview Command Dashboard', category: 'Navigation' },
    { id: 'portfolio', name: 'Holdings Portfolio Manager', category: 'Navigation' },
    { id: 'stocks', name: 'Stock Analysis Terminal', category: 'Navigation' },
    { id: 'mutual_funds', name: 'Mutual Funds Dashboard', category: 'Navigation' },
    { id: 'gold', name: 'Gold Command Center', category: 'Navigation' },
    { id: 'silver', name: 'Silver Command Center', category: 'Navigation' },
    { id: 'watchlist', name: 'Stock Watchlist', category: 'Navigation' },
    { id: 'intelligence', name: 'Market Intelligence Radar', category: 'Navigation' },
    { id: 'analytics', name: 'Advanced Portfolio Analytics', category: 'Navigation' },
    { id: 'ai_advisor', name: 'CYBERFINANCE AI Advisor', category: 'Navigation' },
    { id: 'reports', name: 'Generate Financial PDF Report', category: 'Navigation' },
    { id: 'settings', name: 'Settings & API Keys', category: 'Navigation' },
  ];

  const filteredPages = pageLinks.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
  const filteredHoldings = holdings.filter(h => 
    h.symbol.toLowerCase().includes(query.toLowerCase()) || 
    h.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-start justify-center pt-20 px-4">
      <div className="w-full max-w-xl bg-[#111827] border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.2)] overflow-hidden">
        {/* Search Header */}
        <div className="p-4 border-b border-gray-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-cyan-400" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type stock name, ticker, or page section..."
            className="flex-1 bg-transparent text-gray-100 placeholder-gray-500 text-sm focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-3">
          {/* Holdings Match */}
          {filteredHoldings.length > 0 && (
            <div>
              <p className="px-3 text-[10px] font-mono text-cyan-400 tracking-wider uppercase mb-1">
                Portfolio Holdings
              </p>
              {filteredHoldings.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.assetType === 'stock') onSelectNav('stocks');
                    else if (item.assetType === 'mutual_fund') onSelectNav('mutual_funds');
                    else if (item.assetType === 'gold') onSelectNav('gold');
                    else if (item.assetType === 'silver') onSelectNav('silver');
                    else onSelectNav('portfolio');
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-800/60 text-left transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-200">{item.name}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{item.symbol} • Qty {item.quantity}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-cyan-400 transition-colors" />
                </button>
              ))}
            </div>
          )}

          {/* Navigation Pages Match */}
          {filteredPages.length > 0 && (
            <div>
              <p className="px-3 text-[10px] font-mono text-cyan-400 tracking-wider uppercase mb-1">
                Navigation & Views
              </p>
              {filteredPages.map((page) => (
                <button
                  key={page.id}
                  onClick={() => {
                    onSelectNav(page.id);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-800/60 text-left transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20">
                      <Navigation className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-medium text-gray-200">{page.name}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-violet-400 transition-colors" />
                </button>
              ))}
            </div>
          )}

          {filteredPages.length === 0 && filteredHoldings.length === 0 && (
            <div className="py-8 text-center text-gray-500 text-xs font-mono">
              No matching assets or pages found for "{query}".
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
