import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Coins, 
  ShieldCheck, 
  PieChart as PieIcon, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  ExternalLink, 
  AlertCircle,
  Sparkles,
  Layers
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

export interface HoldingsTableProps {
  holdings: Holding[];
  filter: string; // 'all' | 'stock' | 'mutual_fund' | 'gold' | 'silver'
  sortBy: string; // 'name' | 'value' | 'return' | 'weight' | 'invested'
  onSelectHolding: (holding: Holding) => void;
  onNavigate?: (page: string, data?: any) => void;
}

export interface ComputedHoldingData {
  holding: Holding;
  invested: number;
  currentPrice: number;
  currentValue: number;
  dayChange: number;
  dayChangePercent: number;
  totalProfitLoss: number;
  returnPercent: number;
  weight: number;
  quote?: StockQuote | MutualFundQuote | MetalPrice;
}

export const HoldingsTable: React.FC<HoldingsTableProps> = ({
  holdings,
  filter,
  sortBy,
  onSelectHolding,
  onNavigate,
}) => {
  const { isRefreshing, metrics } = usePortfolio();
  const [quotes, setQuotes] = useState<Record<string, any>>({});
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(true);
  const [localSortField, setLocalSortField] = useState<string>(sortBy || 'value');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Sync external sortBy with localSortField
  useEffect(() => {
    if (sortBy) {
      setLocalSortField(sortBy);
    }
  }, [sortBy]);

  // Fetch live quotes for stocks & mutual funds, and load metal prices
  useEffect(() => {
    let isMounted = true;

    async function loadAllQuotes() {
      setIsLoadingQuotes(true);
      const newQuotes: Record<string, any> = {};

      try {
        const liveGold = getGoldLivePrice();
        const liveSilver = getSilverLivePrice();
        newQuotes['gold'] = liveGold;
        newQuotes['silver'] = liveSilver;

        // Fetch stock quotes
        const stockHoldings = holdings.filter(h => h.assetType === 'stock');
        await Promise.all(
          stockHoldings.map(async (h) => {
            const q = await fetchStockQuote(h.symbol);
            newQuotes[`stock_${h.symbol}`] = q;
          })
        );

        // Fetch mutual fund quotes
        const mfHoldings = holdings.filter(h => h.assetType === 'mutual_fund');
        await Promise.all(
          mfHoldings.map(async (h) => {
            const q = await fetchMutualFundQuote(h.symbol);
            newQuotes[`mf_${h.symbol}`] = q;
          })
        );

        if (isMounted) {
          setQuotes(newQuotes);
        }
      } catch (err) {
        console.warn('Error fetching quotes in HoldingsTable:', err);
      } finally {
        if (isMounted) {
          setIsLoadingQuotes(false);
        }
      }
    }

    loadAllQuotes();

    return () => {
      isMounted = false;
    };
  }, [holdings, isRefreshing]);

  // Compute values for each holding
  const computedList: ComputedHoldingData[] = useMemo(() => {
    const liveGold = quotes['gold'] || getGoldLivePrice();
    const liveSilver = quotes['silver'] || getSilverLivePrice();
    const totalPortfolioValue = metrics.totalNetWorth > 0 ? metrics.totalNetWorth : 1;

    return holdings.map((h) => {
      let invested = h.quantity * h.averagePrice;
      let currentPrice = h.averagePrice;
      let currentValue = invested;
      let dayChange = 0;
      let dayChangePercent = 0;
      let quoteObj: any = null;

      if (h.assetType === 'stock') {
        const quote: StockQuote = quotes[`stock_${h.symbol}`];
        quoteObj = quote;
        currentPrice = quote ? quote.price : (h.manualPrice || h.averagePrice);
        currentValue = h.quantity * currentPrice;
        dayChangePercent = quote ? quote.changePercent : 0;
        dayChange = h.quantity * (currentPrice * (dayChangePercent / 100));
      } else if (h.assetType === 'mutual_fund') {
        const quote: MutualFundQuote = quotes[`mf_${h.symbol}`];
        quoteObj = quote;
        currentPrice = quote ? quote.nav : (h.manualPrice || h.averagePrice);
        currentValue = h.quantity * currentPrice;
        dayChangePercent = quote ? quote.changePercent : 0;
        dayChange = h.quantity * (currentPrice * (dayChangePercent / 100));
      } else if (h.assetType === 'gold') {
        const goldVal = calculateGoldHoldingValue(h, liveGold);
        quoteObj = liveGold;
        invested = goldVal.totalInvested;
        currentValue = goldVal.currentValue;
        currentPrice = goldVal.currentPricePerGram;
        dayChangePercent = liveGold.dayChangePercent;
        dayChange = currentValue * (dayChangePercent / 100);
      } else if (h.assetType === 'silver') {
        const silverVal = calculateSilverHoldingValue(h, liveSilver);
        quoteObj = liveSilver;
        invested = silverVal.totalInvested;
        currentValue = silverVal.currentValue;
        currentPrice = silverVal.currentPricePerGram;
        dayChangePercent = liveSilver.dayChangePercent;
        dayChange = currentValue * (dayChangePercent / 100);
      }

      const totalProfitLoss = currentValue - invested;
      const returnPercent = invested > 0 ? (totalProfitLoss / invested) * 100 : 0;
      const weight = (currentValue / totalPortfolioValue) * 100;

      return {
        holding: h,
        invested,
        currentPrice,
        currentValue,
        dayChange,
        dayChangePercent,
        totalProfitLoss,
        returnPercent,
        weight,
        quote: quoteObj
      };
    });
  }, [holdings, quotes, metrics.totalNetWorth]);

  // Filter holdings
  const filteredList = useMemo(() => {
    return computedList.filter((item) => {
      if (filter === 'all' || !filter) return true;
      if (filter === 'stock') return item.holding.assetType === 'stock';
      if (filter === 'mutual_fund') return item.holding.assetType === 'mutual_fund';
      if (filter === 'gold') return item.holding.assetType === 'gold';
      if (filter === 'silver') return item.holding.assetType === 'silver';
      return true;
    });
  }, [computedList, filter]);

  // Sort holdings
  const sortedList = useMemo(() => {
    return [...filteredList].sort((a, b) => {
      let valA: number | string = 0;
      let valB: number | string = 0;

      switch (localSortField) {
        case 'name':
          valA = a.holding.name.toLowerCase();
          valB = b.holding.name.toLowerCase();
          if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
          if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
          return 0;
        case 'return':
          valA = a.returnPercent;
          valB = b.returnPercent;
          break;
        case 'weight':
          valA = a.weight;
          valB = b.weight;
          break;
        case 'invested':
          valA = a.invested;
          valB = b.invested;
          break;
        case 'value':
        default:
          valA = a.currentValue;
          valB = b.currentValue;
          break;
      }

      return sortDirection === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });
  }, [filteredList, localSortField, sortDirection]);

  const handleHeaderSort = (field: string) => {
    if (localSortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setLocalSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: string) => {
    if (localSortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-gray-500 opacity-60 group-hover:opacity-100" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-cyan-400" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-cyan-400" />
    );
  };

  const getAssetBadge = (type: Holding['assetType']) => {
    switch (type) {
      case 'stock':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <TrendingUp className="w-3 h-3" />
            Stock
          </span>
        );
      case 'mutual_fund':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20">
            <PieIcon className="w-3 h-3" />
            MF
          </span>
        );
      case 'gold':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
            <Coins className="w-3 h-3" />
            Gold
          </span>
        );
      case 'silver':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-400/10 text-slate-300 border border-slate-400/20">
            <ShieldCheck className="w-3 h-3" />
            Silver
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20">
            <Layers className="w-3 h-3" />
            Cash
          </span>
        );
    }
  };

  // Loading skeleton state
  if (isLoadingQuotes && holdings.length === 0) {
    return (
      <div className="w-full space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="w-full h-16 rounded-xl bg-gray-800/40 border border-white/[0.04] animate-pulse flex items-center justify-between px-6"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gray-700/50" />
              <div className="space-y-1.5">
                <div className="w-36 h-3.5 bg-gray-700/50 rounded" />
                <div className="w-20 h-2.5 bg-gray-700/30 rounded" />
              </div>
            </div>
            <div className="w-24 h-4 bg-gray-700/40 rounded" />
            <div className="w-24 h-4 bg-gray-700/40 rounded" />
            <div className="w-20 h-4 bg-gray-700/40 rounded" />
          </div>
        ))}
      </div>
    );
  }

  // Empty state for current filter
  if (sortedList.length === 0) {
    return (
      <div className="w-full py-16 text-center glass-card border-dashed border-gray-800/80 rounded-2xl flex flex-col items-center justify-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-gray-800/60 flex items-center justify-center text-gray-500">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-gray-300">No holdings found</h3>
        <p className="text-xs text-gray-500 max-w-sm">
          {filter !== 'all'
            ? `You don't have any ${filter.replace('_', ' ')} holdings in your portfolio yet.`
            : 'No matching holdings found with the current criteria.'}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* DESKTOP / TABLET DATA TABLE */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-white/[0.08] glass-card">
        <table className="w-full text-left border-collapse min-w-[980px]">
          <thead>
            <tr className="border-b border-white/[0.08] bg-[#151C2B]/60 text-[11px] font-mono uppercase tracking-wider text-gray-400 select-none">
              <th className="py-3.5 px-4 font-semibold">
                <button
                  type="button"
                  onClick={() => handleHeaderSort('name')}
                  className="group flex items-center gap-1.5 hover:text-cyan-400 transition-colors"
                >
                  <span>Asset / Symbol</span>
                  {getSortIcon('name')}
                </button>
              </th>
              <th className="py-3.5 px-3 font-semibold text-right">Qty / Wt</th>
              <th className="py-3.5 px-3 font-semibold text-right">Avg Price</th>
              <th className="py-3.5 px-4 font-semibold text-right">
                <button
                  type="button"
                  onClick={() => handleHeaderSort('invested')}
                  className="group inline-flex items-center gap-1.5 hover:text-cyan-400 transition-colors ml-auto"
                >
                  <span>Invested</span>
                  {getSortIcon('invested')}
                </button>
              </th>
              <th className="py-3.5 px-3 font-semibold text-right">Current Price</th>
              <th className="py-3.5 px-4 font-semibold text-right">
                <button
                  type="button"
                  onClick={() => handleHeaderSort('value')}
                  className="group inline-flex items-center gap-1.5 hover:text-cyan-400 transition-colors ml-auto"
                >
                  <span>Current Value</span>
                  {getSortIcon('value')}
                </button>
              </th>
              <th className="py-3.5 px-3 font-semibold text-right">Day Change</th>
              <th className="py-3.5 px-4 font-semibold text-right">
                <button
                  type="button"
                  onClick={() => handleHeaderSort('return')}
                  className="group inline-flex items-center gap-1.5 hover:text-cyan-400 transition-colors ml-auto"
                >
                  <span>Total P&L</span>
                  {getSortIcon('return')}
                </button>
              </th>
              <th className="py-3.5 px-3 font-semibold text-right">
                <button
                  type="button"
                  onClick={() => handleHeaderSort('return')}
                  className="group inline-flex items-center gap-1.5 hover:text-cyan-400 transition-colors ml-auto"
                >
                  <span>Return %</span>
                  {getSortIcon('return')}
                </button>
              </th>
              <th className="py-3.5 px-4 font-semibold text-right">
                <button
                  type="button"
                  onClick={() => handleHeaderSort('weight')}
                  className="group inline-flex items-center gap-1.5 hover:text-cyan-400 transition-colors ml-auto"
                >
                  <span>Weight</span>
                  {getSortIcon('weight')}
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04] text-xs">
            {sortedList.map((item) => {
              const { holding, invested, currentPrice, currentValue, dayChange, dayChangePercent, totalProfitLoss, returnPercent, weight } = item;
              const isProfit = totalProfitLoss >= 0;
              const isDayProfit = dayChange >= 0;

              return (
                <tr
                  key={holding.id}
                  onClick={() => onSelectHolding(holding)}
                  className="cursor-pointer transition-all duration-200 hover:bg-[#182033]/80 hover:shadow-[0_0_20px_rgba(6,182,212,0.12)] group"
                >
                  {/* Asset / Symbol */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-800/80 border border-white/[0.06] flex items-center justify-center shrink-0 group-hover:border-cyan-500/40 transition-colors">
                        {holding.assetType === 'stock' && <TrendingUp className="w-4 h-4 text-cyan-400" />}
                        {holding.assetType === 'mutual_fund' && <PieIcon className="w-4 h-4 text-purple-400" />}
                        {holding.assetType === 'gold' && <Coins className="w-4 h-4 text-amber-400" />}
                        {holding.assetType === 'silver' && <ShieldCheck className="w-4 h-4 text-slate-300" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-100 truncate max-w-[170px] group-hover:text-cyan-300 transition-colors">
                            {holding.name}
                          </span>
                          {holding.isDemo && (
                            <span className="px-1.5 py-0.2 text-[9px] font-mono tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded">
                              DEMO
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[10px] text-gray-400 tracking-wider">
                            {holding.symbol}
                          </span>
                          <span className="text-[10px] text-gray-600">•</span>
                          {getAssetBadge(holding.assetType)}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Quantity / Weight */}
                  <td className="py-3.5 px-3 text-right font-mono text-gray-300">
                    {holding.assetType === 'gold' || holding.assetType === 'silver' ? (
                      <div>
                        <span>{holding.metalDetails?.weightGrams || holding.quantity} g</span>
                        <div className="text-[10px] text-gray-500">
                          {holding.metalDetails?.metalCategory || 'Fine Bullion'}
                        </div>
                      </div>
                    ) : (
                      <span>{holding.quantity.toLocaleString('en-IN', { maximumFractionDigits: 3 })}</span>
                    )}
                  </td>

                  {/* Avg Price */}
                  <td className="py-3.5 px-3 text-right font-mono text-gray-300">
                    {formatCurrency(holding.averagePrice)}
                    {(holding.assetType === 'gold' || holding.assetType === 'silver') && (
                      <span className="text-[10px] text-gray-500 block">
                        {holding.averagePrice > 10000 
                          ? (holding.assetType === 'gold' ? '/ 10g' : '/ kg') 
                          : '/ g'}
                      </span>
                    )}
                  </td>

                  {/* Invested */}
                  <td className="py-3.5 px-4 text-right font-mono text-gray-300 font-medium">
                    {formatCurrency(invested)}
                  </td>

                  {/* Current Price */}
                  <td className="py-3.5 px-3 text-right font-mono text-gray-200">
                    <div>
                      <span>{formatCurrency(currentPrice)}</span>
                      {(holding.assetType === 'gold' || holding.assetType === 'silver') && (
                        <span className="text-[10px] text-gray-500 block">/ gram</span>
                      )}
                    </div>
                  </td>

                  {/* Current Value */}
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-gray-100">
                    {formatCurrency(currentValue)}
                  </td>

                  {/* Day Change */}
                  <td className={`py-3.5 px-3 text-right font-mono ${isDayProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                    <div className="flex items-center justify-end gap-1">
                      {isDayProfit ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      <span>{isDayProfit ? '+' : ''}{formatCurrency(dayChange)}</span>
                    </div>
                    <span className="text-[10px] opacity-80 block">
                      ({formatPercent(dayChangePercent)})
                    </span>
                  </td>

                  {/* Total P&L */}
                  <td className={`py-3.5 px-4 text-right font-mono font-semibold ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                    <span>{isProfit ? '+' : ''}{formatCurrency(totalProfitLoss)}</span>
                  </td>

                  {/* Return % */}
                  <td className="py-3.5 px-3 text-right font-mono">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                        isProfit
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}
                    >
                      {formatPercent(returnPercent)}
                    </span>
                  </td>

                  {/* Weight % */}
                  <td className="py-3.5 px-4 text-right font-mono text-gray-400">
                    <div className="flex items-center justify-end gap-1.5">
                      <span>{weight.toFixed(1)}%</span>
                      <div className="w-10 h-1.5 rounded-full bg-gray-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full"
                          style={{ width: `${Math.min(weight, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MOBILE CONDENSED CARD VIEW ( < 768px ) */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {sortedList.map((item) => {
          const { holding, invested, currentPrice, currentValue, dayChange, dayChangePercent, totalProfitLoss, returnPercent, weight } = item;
          const isProfit = totalProfitLoss >= 0;
          const isDayProfit = dayChange >= 0;

          return (
            <div
              key={holding.id}
              onClick={() => onSelectHolding(holding)}
              className="glass-card p-4 rounded-xl space-y-3 cursor-pointer hover:border-cyan-500/40 active:scale-[0.99] transition-all"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gray-800/80 border border-white/[0.08] flex items-center justify-center shrink-0">
                    {holding.assetType === 'stock' && <TrendingUp className="w-4 h-4 text-cyan-400" />}
                    {holding.assetType === 'mutual_fund' && <PieIcon className="w-4 h-4 text-purple-400" />}
                    {holding.assetType === 'gold' && <Coins className="w-4 h-4 text-amber-400" />}
                    {holding.assetType === 'silver' && <ShieldCheck className="w-4 h-4 text-slate-300" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-semibold text-gray-100 truncate max-w-[180px]">
                        {holding.name}
                      </h4>
                      {holding.isDemo && (
                        <span className="px-1.5 py-0.2 text-[8px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded">
                          DEMO
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-mono text-gray-400">{holding.symbol}</span>
                      <span className="text-gray-600 text-[10px]">•</span>
                      {getAssetBadge(holding.assetType)}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-bold font-mono text-gray-100 block">
                    {formatCurrency(currentValue)}
                  </span>
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                      isProfit
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}
                  >
                    {formatPercent(returnPercent)}
                  </span>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/[0.06] text-[11px] font-mono">
                <div>
                  <span className="text-gray-500 block text-[10px]">Invested</span>
                  <span className="text-gray-300 font-medium">{formatCurrency(invested)}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">Day P&L</span>
                  <span className={`${isDayProfit ? 'text-emerald-400' : 'text-red-400'} font-medium`}>
                    {isDayProfit ? '+' : ''}{formatPercent(dayChangePercent)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-gray-500 block text-[10px]">Portfolio Wt</span>
                  <span className="text-cyan-400 font-medium">{weight.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HoldingsTable;
