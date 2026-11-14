import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  PieChart as PieIcon, 
  Search, 
  Plus, 
  RefreshCw, 
  ExternalLink, 
  Star, 
  SlidersHorizontal,
  Activity,
  Layers,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { usePortfolio } from '../../context/PortfolioContext';
import { useSettings } from '../../context/SettingsContext';
import { fetchStockQuote } from '../../services/marketDataService';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { StockQuote, Holding } from '../../types';

export interface StocksPageProps {
  onNavigate: (page: string, data?: any) => void;
}

const SECTOR_COLORS = ['#06B6D4', '#7C3AED', '#10B981', '#F59E0B', '#3B82F6', '#EC4899', '#8B5CF6', '#14B8A6'];

export const StocksPage: React.FC<StocksPageProps> = ({ onNavigate }) => {
  const { holdings, metrics, refreshMarketData, isRefreshing, toggleWatchlist, isInWatchlist } = usePortfolio();
  const { settings } = useSettings();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'value' | 'return' | 'dayChange' | 'name'>('value');
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({});
  const [loadingQuotes, setLoadingQuotes] = useState(false);

  // Filter only stock holdings
  const stockHoldings = useMemo(() => {
    return holdings.filter(h => h.assetType === 'stock');
  }, [holdings]);

  // Fetch live quotes for all stock holdings
  useEffect(() => {
    let isMounted = true;
    async function loadQuotes() {
      if (stockHoldings.length === 0) return;
      setLoadingQuotes(true);
      try {
        const quoteMap: Record<string, StockQuote> = {};
        await Promise.all(
          stockHoldings.map(async (holding) => {
            const quote = await fetchStockQuote(holding.symbol, settings.finnhubKey);
            quoteMap[holding.symbol] = quote;
          })
        );
        if (isMounted) {
          setQuotes(quoteMap);
        }
      } catch (err) {
        console.warn('Error loading stock quotes in StocksPage:', err);
      } finally {
        if (isMounted) {
          setLoadingQuotes(false);
        }
      }
    }
    loadQuotes();
    return () => {
      isMounted = false;
    };
  }, [stockHoldings, settings.finnhubKey]);

  // Aggregate totals
  const { totalInvested, currentValue, totalPL, totalReturnPct, dayChange, dayChangePct } = useMemo(() => {
    let invested = 0;
    let current = 0;
    let day = 0;

    stockHoldings.forEach(h => {
      const inv = h.quantity * h.averagePrice;
      const quote = quotes[h.symbol];
      const price = quote ? quote.price : h.averagePrice;
      const cur = h.quantity * price;
      const changePct = quote ? quote.changePercent : 0;
      const dChange = cur * (changePct / 100);

      invested += inv;
      current += cur;
      day += dChange;
    });

    const pl = current - invested;
    const returnPct = invested > 0 ? (pl / invested) * 100 : 0;
    const dPct = current > 0 ? (day / current) * 100 : 0;

    return {
      totalInvested: invested,
      currentValue: current,
      totalPL: pl,
      totalReturnPct: returnPct,
      dayChange: day,
      dayChangePct: dPct
    };
  }, [stockHoldings, quotes]);

  // Filter and sort holdings
  const processedHoldings = useMemo(() => {
    const list = stockHoldings.map(h => {
      const quote = quotes[h.symbol];
      const curPrice = quote ? quote.price : h.averagePrice;
      const dayPct = quote ? quote.changePercent : 0;
      const inv = h.quantity * h.averagePrice;
      const val = h.quantity * curPrice;
      const pl = val - inv;
      const retPct = inv > 0 ? (pl / inv) * 100 : 0;
      const dayVal = val * (dayPct / 100);

      return {
        ...h,
        currentPrice: curPrice,
        quote,
        invested: inv,
        currentValue: val,
        profitLoss: pl,
        returnPercent: retPct,
        dayChange: dayVal,
        dayChangePercent: dayPct,
        sector: quote?.sector || 'Equity'
      };
    });

    // Filter
    const filtered = list.filter(h => 
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.sector.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort
    return filtered.sort((a, b) => {
      if (sortBy === 'value') return b.currentValue - a.currentValue;
      if (sortBy === 'return') return b.returnPercent - a.returnPercent;
      if (sortBy === 'dayChange') return b.dayChangePercent - a.dayChangePercent;
      if (sortBy === 'name') return a.symbol.localeCompare(b.symbol);
      return 0;
    });
  }, [stockHoldings, quotes, searchQuery, sortBy]);

  // Sector breakdown data for Pie Chart
  const sectorChartData = useMemo(() => {
    const map: Record<string, number> = {};
    processedHoldings.forEach(h => {
      map[h.sector] = (map[h.sector] || 0) + h.currentValue;
    });

    return Object.entries(map).map(([name, value]) => ({
      name,
      value,
      percentage: currentValue > 0 ? (value / currentValue) * 100 : 0
    })).sort((a, b) => b.value - a.value);
  }, [processedHoldings, currentValue]);

  // Individual Top Gainer and Loser among stocks
  const { topGainer, topLoser } = useMemo(() => {
    if (processedHoldings.length === 0) return { topGainer: null, topLoser: null };
    const sorted = [...processedHoldings].sort((a, b) => b.dayChangePercent - a.dayChangePercent);
    const gainer = sorted[0];
    const loser = sorted.length > 1 ? sorted[sorted.length - 1] : null;
    return { topGainer: gainer, topLoser: loser };
  }, [processedHoldings]);

  return (
    <div className="space-y-6 pb-12 w-full max-w-7xl mx-auto">
      {/* Header with Market Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-gray-100 tracking-tight">
              Stock Portfolio
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wide bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              MARKET LIVE
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-400 font-mono mt-1">
            Real-time equity performance, sector allocations, and intelligence.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refreshMarketData()}
            disabled={isRefreshing || loadingQuotes}
            className="px-3 py-2 rounded-xl bg-[#151C2B] hover:bg-[#182033] border border-white/[0.08] text-gray-300 hover:text-cyan-400 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
            title="Refresh Quotes"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || loadingQuotes ? 'animate-spin text-cyan-400' : ''}`} />
            <span className="hidden sm:inline">Sync Prices</span>
          </button>
          
          <button
            onClick={() => onNavigate('stock_analysis', { symbol: 'RELIANCE' })}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs shadow-[0_0_15px_rgba(6,182,212,0.35)] transition-all flex items-center gap-1.5"
          >
            <Activity className="w-4 h-4" />
            <span>Deep Analysis</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Investment */}
        <div className="glass-card p-4 sm:p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-all"></div>
          <div className="flex items-center justify-between text-gray-400 text-xs font-medium mb-2">
            <span>Total Stock Investment</span>
            <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-gray-100 tracking-tight">
            {formatCurrency(totalInvested, settings.currency)}
          </div>
          <div className="mt-2 text-[11px] text-gray-500 font-mono">
            Across {stockHoldings.length} equity positions
          </div>
        </div>

        {/* Current Value */}
        <div className="glass-card p-4 sm:p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-full blur-2xl group-hover:bg-violet-500/10 transition-all"></div>
          <div className="flex items-center justify-between text-gray-400 text-xs font-medium mb-2">
            <span>Current Value</span>
            <span className="p-1.5 rounded-lg bg-violet-500/10 text-violet-400">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-gray-100 tracking-tight">
            {formatCurrency(currentValue, settings.currency)}
          </div>
          <div className="mt-2 text-[11px] text-gray-500 font-mono">
            Live valuation at market close/bid
          </div>
        </div>

        {/* Total P&L */}
        <div className={`glass-card p-4 sm:p-5 rounded-2xl relative overflow-hidden ${totalPL >= 0 ? 'border-emerald-500/20' : 'border-rose-500/20'}`}>
          <div className="flex items-center justify-between text-gray-400 text-xs font-medium mb-2">
            <span>Total Profit / Loss</span>
            <span className={`p-1.5 rounded-lg ${totalPL >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
              {totalPL >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </span>
          </div>
          <div className={`text-xl sm:text-2xl font-black tracking-tight ${totalPL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatCurrency(totalPL, settings.currency)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs font-mono">
            <span className={`font-bold ${totalPL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatPercent(totalReturnPct)}
            </span>
            <span className="text-gray-500">all-time returns</span>
          </div>
        </div>

        {/* Day Change */}
        <div className={`glass-card p-4 sm:p-5 rounded-2xl relative overflow-hidden ${dayChange >= 0 ? 'border-cyan-500/20' : 'border-rose-500/20'}`}>
          <div className="flex items-center justify-between text-gray-400 text-xs font-medium mb-2">
            <span>Today's Change</span>
            <span className={`p-1.5 rounded-lg ${dayChange >= 0 ? 'bg-cyan-500/10 text-cyan-400' : 'bg-rose-500/10 text-rose-400'}`}>
              {dayChange >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            </span>
          </div>
          <div className={`text-xl sm:text-2xl font-black tracking-tight ${dayChange >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
            {formatCurrency(dayChange, settings.currency)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs font-mono">
            <span className={`font-bold ${dayChange >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
              {formatPercent(dayChangePct)}
            </span>
            <span className="text-gray-500">since last session</span>
          </div>
        </div>
      </div>

      {/* Top Gainer, Top Loser & Sector Allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Highlights: Top Gainer & Loser */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider font-mono flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            Top Movers Today
          </h2>

          {/* Top Gainer Card */}
          <div 
            onClick={() => topGainer && onNavigate('stock_analysis', { symbol: topGainer.symbol })}
            className="glass-card p-4 rounded-2xl border-emerald-500/20 hover:border-emerald-500/40 cursor-pointer transition-all hover:translate-y-[-2px] relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold uppercase">
                Top Gainer
              </span>
              <span className="text-xs font-mono font-bold text-emerald-400 flex items-center">
                <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                {topGainer ? formatPercent(topGainer.dayChangePercent) : '0.00%'}
              </span>
            </div>

            {topGainer ? (
              <div>
                <div className="flex items-baseline justify-between">
                  <h3 className="text-lg font-black text-gray-100">{topGainer.symbol}</h3>
                  <span className="text-sm font-bold text-gray-200">
                    {formatCurrency(topGainer.currentPrice, settings.currency)}
                  </span>
                </div>
                <p className="text-xs text-gray-400 truncate mt-0.5">{topGainer.name}</p>
                <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-gray-400">
                  <span>Holding Profit:</span>
                  <span className={topGainer.profitLoss >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                    {formatCurrency(topGainer.profitLoss, settings.currency)} ({formatPercent(topGainer.returnPercent)})
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic py-2">No gainers detected in today's session</p>
            )}
          </div>

          {/* Top Loser Card */}
          <div 
            onClick={() => topLoser && onNavigate('stock_analysis', { symbol: topLoser.symbol })}
            className="glass-card p-4 rounded-2xl border-rose-500/20 hover:border-rose-500/40 cursor-pointer transition-all hover:translate-y-[-2px] relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30 font-bold uppercase">
                Top Loser
              </span>
              <span className="text-xs font-mono font-bold text-rose-400 flex items-center">
                <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                {topLoser ? formatPercent(topLoser.dayChangePercent) : '0.00%'}
              </span>
            </div>

            {topLoser ? (
              <div>
                <div className="flex items-baseline justify-between">
                  <h3 className="text-lg font-black text-gray-100">{topLoser.symbol}</h3>
                  <span className="text-sm font-bold text-gray-200">
                    {formatCurrency(topLoser.currentPrice, settings.currency)}
                  </span>
                </div>
                <p className="text-xs text-gray-400 truncate mt-0.5">{topLoser.name}</p>
                <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-gray-400">
                  <span>Holding Profit:</span>
                  <span className={topLoser.profitLoss >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                    {formatCurrency(topLoser.profitLoss, settings.currency)} ({formatPercent(topLoser.returnPercent)})
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic py-2">No losers detected in today's session</p>
            )}
          </div>
        </div>

        {/* Sector Allocation Chart Card */}
        <div className="lg:col-span-2 glass-card p-5 rounded-2xl border border-white/[0.08] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-gray-200 flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-cyan-400" />
                Sector Diversification
              </h2>
              <p className="text-xs text-gray-500 font-mono">Portfolio exposure by economic sector</p>
            </div>
            <span className="text-xs font-mono text-gray-400">
              {sectorChartData.length} Sectors
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            {/* Pie Chart */}
            <div className="h-48 w-full">
              {sectorChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sectorChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {sectorChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={SECTOR_COLORS[index % SECTOR_COLORS.length]} stroke="#0B0F17" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val: any) => formatCurrency(Number(val) || 0, settings.currency)}
                      contentStyle={{
                        backgroundColor: '#111827',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: '#F3F4F6'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-gray-500">
                  No stock holdings to plot
                </div>
              )}
            </div>

            {/* Sector Breakdown List */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {sectorChartData.map((sec, idx) => (
                <div key={sec.name} className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-black/20 hover:bg-black/40 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0" 
                      style={{ backgroundColor: SECTOR_COLORS[idx % SECTOR_COLORS.length] }} 
                    />
                    <span className="text-gray-300 font-medium truncate">{sec.name}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono shrink-0 ml-2">
                    <span className="text-gray-400">{formatCurrency(sec.value, settings.currency)}</span>
                    <span className="text-cyan-400 font-bold min-w-10 text-right">{sec.percentage.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stock Holdings Section */}
      <div className="space-y-4">
        {/* Search, Filter & Actions Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stocks by name, symbol, or sector..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[#111827]/80 border border-white/[0.08] text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 justify-end">
            <div className="flex items-center gap-1.5 bg-[#111827]/80 border border-white/[0.08] px-3 py-1.5 rounded-xl text-xs">
              <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-400 hidden sm:inline">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-gray-200 focus:outline-none cursor-pointer"
              >
                <option value="value" className="bg-[#111827]">Current Value</option>
                <option value="return" className="bg-[#111827]">Total Return %</option>
                <option value="dayChange" className="bg-[#111827]">Day Change %</option>
                <option value="name" className="bg-[#111827]">Symbol</option>
              </select>
            </div>
          </div>
        </div>

        {/* Holdings Grid */}
        {processedHoldings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {processedHoldings.map((stock) => {
              const inWatch = isInWatchlist(stock.symbol);
              return (
                <div
                  key={stock.id}
                  onClick={() => onNavigate('stock_analysis', { symbol: stock.symbol })}
                  className="glass-card glass-card-hover p-4 sm:p-5 rounded-2xl cursor-pointer group flex flex-col justify-between relative overflow-hidden"
                >
                  <div className="space-y-3">
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-black text-gray-100 group-hover:text-cyan-400 transition-colors">
                            {stock.symbol}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.05] text-gray-400 border border-white/[0.05] truncate max-w-28">
                            {stock.sector}
                          </span>
                        </div>
                        <h4 className="text-xs text-gray-400 truncate mt-0.5 font-medium">{stock.name}</h4>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWatchlist({
                            symbol: stock.symbol,
                            name: stock.name,
                            assetType: 'stock'
                          });
                        }}
                        className={`p-1.5 rounded-lg transition-all ${
                          inWatch 
                            ? 'text-amber-400 bg-amber-400/10' 
                            : 'text-gray-500 hover:text-amber-400 hover:bg-white/5'
                        }`}
                        title={inWatch ? 'Remove from Watchlist' : 'Add to Watchlist'}
                      >
                        <Star className={`w-4 h-4 ${inWatch ? 'fill-amber-400' : ''}`} />
                      </button>
                    </div>

                    {/* Price and Day Change */}
                    <div className="flex items-baseline justify-between pt-1">
                      <div>
                        <div className="text-lg font-black text-gray-100 font-mono">
                          {formatCurrency(stock.currentPrice, settings.currency)}
                        </div>
                        <div className="text-[11px] text-gray-500 font-mono">
                          Avg: {formatCurrency(stock.averagePrice, settings.currency)}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`inline-flex items-center text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                          stock.dayChangePercent >= 0 
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                        }`}>
                          {stock.dayChangePercent >= 0 ? '+' : ''}{stock.dayChangePercent.toFixed(2)}%
                        </span>
                        <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                          {stock.dayChange >= 0 ? '+' : ''}{formatCurrency(stock.dayChange, settings.currency)}
                        </div>
                      </div>
                    </div>

                    {/* Quantity & Total Value */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.06] text-xs font-mono">
                      <div>
                        <span className="text-gray-500 text-[10px] uppercase block">Shares</span>
                        <span className="text-gray-200 font-bold">{stock.quantity}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-500 text-[10px] uppercase block">Holding Value</span>
                        <span className="text-cyan-300 font-bold">{formatCurrency(stock.currentValue, settings.currency)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Profit & Loss Footer */}
                  <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase block font-mono">Total Returns</span>
                      <span className={`font-mono font-bold ${stock.profitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatCurrency(stock.profitLoss, settings.currency)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-mono font-bold px-2 py-1 rounded-lg ${
                        stock.returnPercent >= 0 
                          ? 'bg-emerald-500/10 text-emerald-400' 
                          : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {formatPercent(stock.returnPercent)}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-cyan-400 transition-colors" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="glass-card p-10 rounded-2xl text-center space-y-4 border border-white/[0.08]">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto">
              <TrendingUp className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-100">No Stock Holdings Found</h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto mt-1">
                {searchQuery 
                  ? `No stocks matching "${searchQuery}". Try a different keyword.` 
                  : 'Start building your equity portfolio by adding leading stocks or exploring our AI analysis engine.'}
              </p>
            </div>
            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={() => onNavigate('stock_analysis', { symbol: 'RELIANCE' })}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all"
              >
                Explore RELIANCE
              </button>
              <button
                onClick={() => onNavigate('stock_analysis', { symbol: 'TCS' })}
                className="px-4 py-2 rounded-xl bg-[#151C2B] hover:bg-[#182033] border border-white/[0.08] text-gray-200 text-xs font-semibold transition-all"
              >
                Analyze TCS
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StocksPage;
