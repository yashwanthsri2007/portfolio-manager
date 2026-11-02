import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  Eye,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  GripVertical,
  RefreshCw,
  ExternalLink,
  Star,
  Activity,
  AlertCircle
} from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext';
import { fetchStockQuote } from '../../services/marketDataService';
import { StockQuote, WatchlistItem } from '../../types';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import GlassCard from '../common/GlassCard';
import SparkLine from '../common/SparkLine';
import EmptyState from '../common/EmptyState';

export interface WatchlistPageProps {
  onNavigate: (page: string, data?: any) => void;
}

export const WatchlistPage: React.FC<WatchlistPageProps> = ({ onNavigate }) => {
  const { watchlist, toggleWatchlist } = usePortfolio();
  const [searchQuery, setSearchQuery] = useState('');
  const [addSymbol, setAddSymbol] = useState('');
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [orderedItems, setOrderedItems] = useState<WatchlistItem[]>(watchlist);

  useEffect(() => {
    setOrderedItems(watchlist);
  }, [watchlist]);

  // Fetch quotes for watchlist items
  const refreshQuotes = async () => {
    setIsRefreshing(true);
    const newQuotes: Record<string, StockQuote> = {};
    const stockItems = orderedItems.filter(w => w.assetType === 'stock');
    await Promise.all(
      stockItems.map(async (w) => {
        try {
          const quote = await fetchStockQuote(w.symbol);
          if (quote) newQuotes[w.symbol] = quote;
        } catch {}
      })
    );
    setQuotes(newQuotes);
    setIsRefreshing(false);
  };

  useEffect(() => {
    refreshQuotes();
    const interval = setInterval(refreshQuotes, 60000);
    return () => clearInterval(interval);
  }, [orderedItems.length]);

  const filteredItems = useMemo(() => {
    if (!searchQuery) return orderedItems;
    const q = searchQuery.toLowerCase();
    return orderedItems.filter(
      w => w.symbol.toLowerCase().includes(q) || w.name.toLowerCase().includes(q)
    );
  }, [orderedItems, searchQuery]);

  const handleAddSymbol = () => {
    if (!addSymbol.trim()) return;
    const sym = addSymbol.trim().toUpperCase();
    toggleWatchlist({
      symbol: sym,
      name: sym,
      assetType: 'stock'
    });
    setAddSymbol('');
  };

  const handleRemove = (item: WatchlistItem) => {
    toggleWatchlist({
      symbol: item.symbol,
      name: item.name,
      assetType: item.assetType
    });
  };

  // Generate synthetic sparkline data
  const getSparkData = (symbol: string): number[] => {
    const seed = symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const base = 100;
    return Array.from({ length: 20 }, (_, i) => {
      return base + Math.sin((seed + i) * 0.5) * 8 + Math.cos((seed + i) * 0.3) * 4;
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/30">
              <Eye className="w-6 h-6 text-violet-400" />
            </div>
            Watchlist
          </h1>
          <p className="text-sm text-gray-400 mt-1 font-mono">
            TRACKING {watchlist.length} ASSETS • REAL-TIME MONITORING
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={refreshQuotes}
            disabled={isRefreshing}
            className={`p-2.5 rounded-xl bg-gray-800/60 hover:bg-gray-800 text-gray-300 hover:text-cyan-400 border border-gray-700/60 transition-all ${
              isRefreshing ? 'animate-spin text-cyan-400' : ''
            }`}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {/* Search & Add Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search watchlist..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-800/60 border border-gray-700/60 rounded-xl text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
          />
        </div>

        {/* Add Symbol */}
        <div className="flex gap-2">
          <input
            type="text"
            value={addSymbol}
            onChange={(e) => setAddSymbol(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleAddSymbol()}
            placeholder="Add symbol (e.g. TCS)"
            className="w-40 px-3 py-2.5 bg-gray-800/60 border border-gray-700/60 rounded-xl text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 font-mono"
          />
          <button
            onClick={handleAddSymbol}
            className="px-4 py-2.5 bg-gradient-to-r from-cyan-500/20 to-violet-600/20 border border-cyan-500/40 text-cyan-300 rounded-xl text-sm font-semibold hover:border-cyan-400 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </motion.div>

      {/* Watchlist Table */}
      {filteredItems.length === 0 ? (
        <EmptyState
          icon={Eye}
          title="Your watchlist is empty"
          message="Add stocks and assets to track their performance in real-time."
        />
      ) : (
        <GlassCard className="overflow-hidden !p-0">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-800/30 border-b border-gray-700/40 text-xs font-mono text-gray-400 uppercase tracking-wider">
            <div className="col-span-1"></div>
            <div className="col-span-3">Asset</div>
            <div className="col-span-2 text-right">Price</div>
            <div className="col-span-2 text-right">Change</div>
            <div className="col-span-2 text-center">Trend</div>
            <div className="col-span-1 text-right">Volume</div>
            <div className="col-span-1 text-center">Actions</div>
          </div>

          {/* Rows */}
          <AnimatePresence>
            {filteredItems.map((item, idx) => {
              const quote = quotes[item.symbol];
              const price = quote?.price || 0;
              const change = quote?.change || 0;
              const changePercent = quote?.changePercent || 0;
              const isPositive = changePercent >= 0;
              const volume = quote?.volume || 0;
              const sparkData = getSparkData(item.symbol);

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ delay: idx * 0.03 }}
                  className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-gray-800/40 hover:bg-gray-800/20 transition-colors group items-center cursor-pointer"
                  onClick={() => onNavigate('stocks', { symbol: item.symbol })}
                >
                  {/* Drag Handle */}
                  <div className="col-span-1 flex items-center">
                    <GripVertical className="w-4 h-4 text-gray-600 group-hover:text-gray-400 cursor-grab" />
                  </div>

                  {/* Asset Info */}
                  <div className="col-span-3 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold ${
                      isPositive
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-red-500/10 text-red-400 border border-red-500/30'
                    }`}>
                      {item.symbol.substring(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white font-mono">{item.symbol}</p>
                      <p className="text-xs text-gray-400 truncate max-w-[120px]">{item.name}</p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="col-span-2 text-right">
                    <p className="text-sm font-semibold text-white font-mono">
                      {price > 0 ? formatCurrency(price) : '—'}
                    </p>
                  </div>

                  {/* Change */}
                  <div className="col-span-2 text-right">
                    {price > 0 ? (
                      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                        isPositive
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}>
                        {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {formatPercent(Math.abs(changePercent))}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">—</span>
                    )}
                  </div>

                  {/* Sparkline */}
                  <div className="col-span-2 flex justify-center">
                    <SparkLine
                      data={sparkData}
                      color={isPositive ? '#10B981' : '#EF4444'}
                      width={80}
                      height={28}
                    />
                  </div>

                  {/* Volume */}
                  <div className="col-span-1 text-right">
                    <p className="text-xs font-mono text-gray-400">
                      {volume > 0 ? `${(volume / 1e6).toFixed(1)}M` : '—'}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 flex justify-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(item);
                      }}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                      title="Remove from watchlist"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate('stocks', { symbol: item.symbol });
                      }}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors opacity-0 group-hover:opacity-100"
                      title="View analysis"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </GlassCard>
      )}

      {/* Quick Stats */}
      {watchlist.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          <GlassCard className="text-center">
            <Star className="w-5 h-5 text-amber-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white font-mono">{watchlist.length}</p>
            <p className="text-xs text-gray-400 mt-1">Assets Tracked</p>
          </GlassCard>

          <GlassCard className="text-center">
            <TrendingUp className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-emerald-400 font-mono">
              {Object.values(quotes).filter(q => q.changePercent >= 0).length}
            </p>
            <p className="text-xs text-gray-400 mt-1">Gainers Today</p>
          </GlassCard>

          <GlassCard className="text-center">
            <TrendingDown className="w-5 h-5 text-red-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-red-400 font-mono">
              {Object.values(quotes).filter(q => q.changePercent < 0).length}
            </p>
            <p className="text-xs text-gray-400 mt-1">Losers Today</p>
          </GlassCard>
        </motion.div>
      )}
    </div>
  );
};

export default WatchlistPage;
