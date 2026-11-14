import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  TrendingUp, 
  TrendingDown, 
  Edit3, 
  Trash2, 
  Copy, 
  LineChart, 
  Coins, 
  ShieldCheck, 
  PieChart as PieIcon, 
  Calendar, 
  Building2, 
  FileText, 
  AlertTriangle,
  ExternalLink,
  Sparkles,
  Info
} from 'lucide-react';
import { Holding, StockQuote, MutualFundQuote, MetalPrice } from '../../types';
import { formatCurrency, formatPercent, formatDate } from '../../utils/formatters';
import { fetchStockQuote } from '../../services/marketDataService';
import { fetchMutualFundQuote } from '../../services/mutualFundService';
import { 
  getGoldLivePrice, 
  getSilverLivePrice, 
  calculateGoldHoldingValue, 
  calculateSilverHoldingValue 
} from '../../services/metalsService';
import { usePortfolio } from '../../context/PortfolioContext';

export interface HoldingDetailDrawerProps {
  holding: Holding | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (holding: Holding) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onNavigate?: (page: string, data?: any) => void;
}

export const HoldingDetailDrawer: React.FC<HoldingDetailDrawerProps> = ({
  holding,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onDuplicate,
  onNavigate,
}) => {
  const { metrics } = usePortfolio();
  const [quote, setQuote] = useState<any>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch holding quote on open or holding change
  useEffect(() => {
    if (!holding || !isOpen) {
      setQuote(null);
      setShowDeleteConfirm(false);
      return;
    }

    let isMounted = true;
    async function loadQuote() {
      setIsLoadingQuote(true);
      try {
        if (holding?.assetType === 'stock') {
          const q = await fetchStockQuote(holding.symbol);
          if (isMounted) setQuote(q);
        } else if (holding?.assetType === 'mutual_fund') {
          const q = await fetchMutualFundQuote(holding.symbol);
          if (isMounted) setQuote(q);
        } else if (holding?.assetType === 'gold') {
          const q = getGoldLivePrice();
          if (isMounted) setQuote(q);
        } else if (holding?.assetType === 'silver') {
          const q = getSilverLivePrice();
          if (isMounted) setQuote(q);
        }
      } catch (err) {
        console.warn('Error loading drawer quote:', err);
      } finally {
        if (isMounted) setIsLoadingQuote(false);
      }
    }

    loadQuote();
    return () => {
      isMounted = false;
    };
  }, [holding, isOpen]);

  if (!isOpen || !holding) return null;

  // Perform calculated metrics
  let invested = holding.quantity * holding.averagePrice;
  let currentPrice = holding.averagePrice;
  let currentValue = invested;
  let dayChange = 0;
  let dayChangePercent = 0;

  if (holding.assetType === 'stock') {
    currentPrice = quote ? quote.price : (holding.manualPrice || holding.averagePrice);
    currentValue = holding.quantity * currentPrice;
    dayChangePercent = quote ? quote.changePercent : 0;
    dayChange = holding.quantity * (currentPrice * (dayChangePercent / 100));
  } else if (holding.assetType === 'mutual_fund') {
    currentPrice = quote ? quote.nav : (holding.manualPrice || holding.averagePrice);
    currentValue = holding.quantity * currentPrice;
    dayChangePercent = quote ? quote.changePercent : 0;
    dayChange = holding.quantity * (currentPrice * (dayChangePercent / 100));
  } else if (holding.assetType === 'gold') {
    const liveGold = quote || getGoldLivePrice();
    const goldVal = calculateGoldHoldingValue(holding, liveGold);
    invested = goldVal.totalInvested;
    currentValue = goldVal.currentValue;
    currentPrice = goldVal.currentPricePerGram;
    dayChangePercent = liveGold.dayChangePercent;
    dayChange = currentValue * (dayChangePercent / 100);
  } else if (holding.assetType === 'silver') {
    const liveSilver = quote || getSilverLivePrice();
    const silverVal = calculateSilverHoldingValue(holding, liveSilver);
    invested = silverVal.totalInvested;
    currentValue = silverVal.currentValue;
    currentPrice = silverVal.currentPricePerGram;
    dayChangePercent = liveSilver.dayChangePercent;
    dayChange = currentValue * (dayChangePercent / 100);
  }

  const profitLoss = currentValue - invested;
  const returnPercent = invested > 0 ? (profitLoss / invested) * 100 : 0;
  const isProfit = profitLoss >= 0;
  const isDayProfit = dayChange >= 0;
  const weight = metrics.totalNetWorth > 0 ? (currentValue / metrics.totalNetWorth) * 100 : 0;

  // 52 Week High/Low Position calculation
  let high52 = quote?.high52;
  let low52 = quote?.low52;
  let rangePercent = 50;
  if (high52 && low52 && high52 > low52) {
    rangePercent = Math.min(Math.max(((currentPrice - low52) / (high52 - low52)) * 100, 0), 100);
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        />

        {/* Slide-in Drawer Container */}
        <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="w-screen max-w-lg bg-[#0E1422] border-l border-white/[0.08] shadow-2xl flex flex-col h-full overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-white/[0.08] flex items-center justify-between bg-[#111827]/80 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-800/80 border border-white/[0.1] flex items-center justify-center text-cyan-400">
                  {holding.assetType === 'stock' && <TrendingUp className="w-5 h-5 text-cyan-400" />}
                  {holding.assetType === 'mutual_fund' && <PieIcon className="w-5 h-5 text-purple-400" />}
                  {holding.assetType === 'gold' && <Coins className="w-5 h-5 text-amber-400" />}
                  {holding.assetType === 'silver' && <ShieldCheck className="w-5 h-5 text-slate-300" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-gray-100 truncate max-w-[220px]">
                      {holding.name}
                    </h3>
                    {holding.isDemo && (
                      <span className="px-1.5 py-0.5 text-[9px] font-mono tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded">
                        DEMO
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-mono text-cyan-400">{holding.symbol}</span>
                    <span className="text-gray-600 text-xs">•</span>
                    <span className="text-xs uppercase font-mono tracking-wider text-gray-400">
                      {holding.assetType.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-gray-800/60 hover:bg-gray-800 text-gray-400 hover:text-gray-100 border border-white/[0.06] flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* PRIMARY VALUATION HERO CARD */}
              <div className="glass-card p-5 rounded-2xl relative overflow-hidden border-white/[0.08]">
                <div className="absolute top-0 right-0 w-44 h-44 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">
                      Current Value
                    </span>
                    <span className="text-xs font-mono text-cyan-400">
                      Weight: {weight.toFixed(1)}% of Portfolio
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between gap-2 flex-wrap">
                    <h2 className="text-3xl font-black font-mono text-white tracking-tight">
                      {formatCurrency(currentValue)}
                    </h2>
                    <div
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold font-mono ${
                        isProfit
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}
                    >
                      {isProfit ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      <span>{isProfit ? '+' : ''}{formatCurrency(profitLoss)}</span>
                      <span>({formatPercent(returnPercent)})</span>
                    </div>
                  </div>

                  {/* Quick stats grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-white/[0.06] text-xs font-mono">
                    <div>
                      <span className="text-gray-400 block text-[11px]">Total Invested</span>
                      <span className="text-gray-200 font-semibold">{formatCurrency(invested)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[11px]">Average Price</span>
                      <span className="text-gray-200 font-semibold">{formatCurrency(holding.averagePrice)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[11px]">Day Change</span>
                      <span className={`${isDayProfit ? 'text-emerald-400' : 'text-red-400'} font-semibold`}>
                        {isDayProfit ? '+' : ''}{formatCurrency(dayChange)} ({formatPercent(dayChangePercent)})
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ASSET SPECIFIC METRICS */}
              {holding.assetType === 'stock' && (
                <div className="glass-card p-5 rounded-2xl space-y-4 border-white/[0.08]">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <LineChart className="w-4 h-4" />
                    Market Snapshot
                  </h4>

                  {/* 52-Week Range Bar */}
                  {high52 && low52 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-mono text-gray-400">
                        <span>52W Low: {formatCurrency(low52)}</span>
                        <span>52W High: {formatCurrency(high52)}</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-gray-800 overflow-hidden relative">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-violet-500 rounded-full"
                          style={{ width: `${rangePercent}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-gray-500 text-center font-mono">
                        Current Price is at {rangePercent.toFixed(0)}% of 52W range
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                    <div className="p-3 rounded-xl bg-gray-800/40 border border-white/[0.04]">
                      <span className="text-gray-400 block text-[10px]">P/E Ratio</span>
                      <span className="text-gray-200 font-semibold">{quote?.pe ? quote.pe.toFixed(1) : '24.5'}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-800/40 border border-white/[0.04]">
                      <span className="text-gray-400 block text-[10px]">Market Cap</span>
                      <span className="text-gray-200 font-semibold">{quote?.marketCap || 'Large Cap'}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-800/40 border border-white/[0.04]">
                      <span className="text-gray-400 block text-[10px]">Sector</span>
                      <span className="text-gray-200 font-semibold truncate block">{quote?.sector || 'Equity'}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-800/40 border border-white/[0.04]">
                      <span className="text-gray-400 block text-[10px]">Volume</span>
                      <span className="text-gray-200 font-semibold">
                        {quote?.volume ? quote.volume.toLocaleString('en-IN') : '1.2M'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* MUTUAL FUND DETAILS */}
              {holding.assetType === 'mutual_fund' && (
                <div className="glass-card p-5 rounded-2xl space-y-3 border-white/[0.08]">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                    <PieIcon className="w-4 h-4" />
                    Mutual Fund Specifics
                  </h4>

                  <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                    <div className="p-3 rounded-xl bg-gray-800/40 border border-white/[0.04]">
                      <span className="text-gray-400 block text-[10px]">Total Units</span>
                      <span className="text-gray-200 font-semibold">{holding.quantity.toLocaleString('en-IN', { maximumFractionDigits: 3 })}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-800/40 border border-white/[0.04]">
                      <span className="text-gray-400 block text-[10px]">Current NAV</span>
                      <span className="text-gray-200 font-semibold">{formatCurrency(currentPrice)}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-800/40 border border-white/[0.04]">
                      <span className="text-gray-400 block text-[10px]">Scheme Code</span>
                      <span className="text-gray-200 font-semibold">{holding.symbol}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-800/40 border border-white/[0.04]">
                      <span className="text-gray-400 block text-[10px]">NAV Date</span>
                      <span className="text-gray-200 font-semibold">{quote?.date || 'Live / Today'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* PRECIOUS METALS SPECIFICS */}
              {(holding.assetType === 'gold' || holding.assetType === 'silver') && (
                <div className="glass-card p-5 rounded-2xl space-y-3 border-white/[0.08]">
                  <h4 className={`text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 ${holding.assetType === 'gold' ? 'text-amber-400' : 'text-slate-300'}`}>
                    {holding.assetType === 'gold' ? <Coins className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                    Metal Specifications
                  </h4>

                  <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                    <div className="p-3 rounded-xl bg-gray-800/40 border border-white/[0.04]">
                      <span className="text-gray-400 block text-[10px]">Category / Form</span>
                      <span className="text-gray-200 font-semibold">
                        {holding.metalDetails?.metalCategory || (holding.assetType === 'gold' ? '24K Bars' : '999 Fine Bullion')}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-800/40 border border-white/[0.04]">
                      <span className="text-gray-400 block text-[10px]">Weight (Grams)</span>
                      <span className="text-gray-200 font-semibold">
                        {holding.metalDetails?.weightGrams || holding.quantity} g
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-800/40 border border-white/[0.04]">
                      <span className="text-gray-400 block text-[10px]">Rate per Gram</span>
                      <span className="text-gray-200 font-semibold">{formatCurrency(currentPrice)}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-800/40 border border-white/[0.04]">
                      <span className="text-gray-400 block text-[10px]">Standard Equivalent</span>
                      <span className="text-gray-200 font-semibold">
                        {holding.assetType === 'gold' 
                          ? `${((holding.metalDetails?.weightGrams || holding.quantity) / 11.66).toFixed(2)} Tola` 
                          : `${((holding.metalDetails?.weightGrams || holding.quantity) / 1000).toFixed(2)} Kg`}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* PURCHASE DETAILS */}
              <div className="glass-card p-5 rounded-2xl space-y-3 border-white/[0.08]">
                <h4 className="text-xs font-mono uppercase tracking-wider text-gray-400">
                  Transaction & Purchase Info
                </h4>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
                    <span className="text-gray-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-500" />
                      Purchase Date
                    </span>
                    <span className="text-gray-200 font-mono">{formatDate(holding.purchaseDate)}</span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
                    <span className="text-gray-400 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-gray-500" />
                      Broker / Platform
                    </span>
                    <span className="text-gray-200 font-medium">{holding.broker || 'Not specified'}</span>
                  </div>

                  {holding.notes && (
                    <div className="pt-2">
                      <span className="text-gray-400 flex items-center gap-1.5 mb-1 text-[11px]">
                        <FileText className="w-3.5 h-3.5 text-gray-500" />
                        Notes & Investment Thesis
                      </span>
                      <p className="text-xs text-gray-300 bg-gray-800/50 p-3 rounded-xl border border-white/[0.04] leading-relaxed">
                        {holding.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* DELETE CONFIRMATION ALERT (if active) */}
              {showDeleteConfirm && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-red-200">Delete Holding?</h4>
                      <p className="text-[11px] text-red-300/80 mt-0.5">
                        Are you sure you want to remove <strong>{holding.name}</strong> from your portfolio? This action cannot be undone.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-xs font-medium hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onDelete(holding.id);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-[0_0_12px_rgba(239,68,68,0.4)]"
                    >
                      Confirm Delete
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Action Buttons */}
            <div className="p-4 border-t border-white/[0.08] bg-[#111827]/90 backdrop-blur-xl flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-medium transition-all"
                  title="Delete Holding"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDuplicate(holding.id);
                    onClose();
                  }}
                  className="p-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 border border-white/[0.08] text-xs font-medium transition-all"
                  title="Duplicate Holding"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                {holding.assetType === 'stock' && onNavigate && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigate('stocks', holding);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-violet-600/30 hover:bg-violet-600/50 text-violet-300 border border-violet-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>View Analysis</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEdit(holding);
                  }}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center gap-1.5 transition-all"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Holding</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};

export default HoldingDetailDrawer;
