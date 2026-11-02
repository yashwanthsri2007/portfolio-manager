import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  Star, 
  Plus, 
  ExternalLink, 
  AlertCircle, 
  Clock, 
  ShieldAlert, 
  Zap, 
  BarChart2, 
  FileText, 
  Newspaper, 
  Info, 
  Check, 
  Search,
  CheckCircle2,
  Share2
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { usePortfolio } from '../../context/PortfolioContext';
import { useSettings } from '../../context/SettingsContext';
import { useNotifications } from '../../context/NotificationContext';
import { fetchStockQuote } from '../../services/marketDataService';
import { formatCurrency, formatPercent, formatDate } from '../../utils/formatters';
import { StockQuote } from '../../types';

export interface StockAnalysisProps {
  symbol?: string;
  onNavigate: (page: string, data?: any) => void;
}

type Timeframe = '1D' | '1W' | '1M' | '6M' | '1Y' | '5Y';

export const StockAnalysis: React.FC<StockAnalysisProps> = ({ 
  symbol = 'RELIANCE', 
  onNavigate 
}) => {
  const currentSymbol = symbol.toUpperCase().trim() || 'RELIANCE';
  const { settings } = useSettings();
  const { news, toggleWatchlist, isInWatchlist, addHolding } = usePortfolio();
  const { addNotification } = useNotifications();

  const [activeTab, setActiveTab] = useState<'overview' | 'chart' | 'fundamentals' | 'news'>('overview');
  const [timeframe, setTimeframe] = useState<Timeframe>('1M');
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Quick ticker search
  const [searchTicker, setSearchTicker] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Add to portfolio modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addQty, setAddQty] = useState('10');
  const [addPrice, setAddPrice] = useState('');
  const [addedSuccess, setAddedSuccess] = useState(false);

  // Fetch stock data
  useEffect(() => {
    let isMounted = true;
    async function loadQuoteData() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchStockQuote(currentSymbol, settings.finnhubKey);
        if (isMounted) {
          if (!data || !data.price) {
            setError(`Unable to retrieve financial metrics for ${currentSymbol}`);
          } else {
            setQuote(data);
            setAddPrice(data.price.toString());
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || `Failed to fetch quote for ${currentSymbol}`);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadQuoteData();
    return () => {
      isMounted = false;
    };
  }, [currentSymbol, settings.finnhubKey]);

  // Synthetic Historical Chart Generator based on quote & timeframe
  const chartData = useMemo(() => {
    if (!quote) return [];
    const basePrice = quote.price;
    const isPositive = quote.changePercent >= 0;

    let pointsCount = 20;
    let timeLabels: string[] = [];

    if (timeframe === '1D') {
      pointsCount = 8;
      timeLabels = ['09:15', '10:15', '11:15', '12:15', '13:15', '14:15', '15:00', '15:30'];
    } else if (timeframe === '1W') {
      pointsCount = 7;
      timeLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'];
    } else if (timeframe === '1M') {
      pointsCount = 15;
      timeLabels = Array.from({ length: 15 }, (_, i) => `Day ${i * 2 + 1}`);
    } else if (timeframe === '6M') {
      pointsCount = 12;
      timeLabels = ['M-5', 'M-4.5', 'M-4', 'M-3.5', 'M-3', 'M-2.5', 'M-2', 'M-1.5', 'M-1', 'W-2', 'W-1', 'Now'];
    } else if (timeframe === '1Y') {
      pointsCount = 12;
      timeLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    } else {
      pointsCount = 10;
      timeLabels = ['2021', '2022', '2023 H1', '2023 H2', '2024 H1', '2024 H2', '2025 H1', '2025 H2', '2026 Q1', 'Current'];
    }

    // Generate organic pseudo-random walk anchored at quote.price
    const result = [];
    const volatility = timeframe === '1D' ? 0.015 : timeframe === '1Y' || timeframe === '5Y' ? 0.25 : 0.08;
    const startPrice = isPositive 
      ? basePrice * (1 - (timeframe === '1D' ? quote.changePercent / 100 : volatility))
      : basePrice * (1 + (timeframe === '1D' ? Math.abs(quote.changePercent) / 100 : volatility));

    let currentVal = startPrice;
    for (let i = 0; i < pointsCount; i++) {
      const progress = i / (pointsCount - 1);
      // smooth interpolation towards basePrice with pseudo noise
      const target = startPrice + (basePrice - startPrice) * progress;
      const noise = (Math.sin(i * 1.8 + currentSymbol.charCodeAt(0)) * 0.5) * (basePrice * (volatility / 2));
      currentVal = i === pointsCount - 1 ? basePrice : target + noise;

      result.push({
        time: timeLabels[i] || `P${i}`,
        price: parseFloat(Math.max(currentVal, basePrice * 0.4).toFixed(2))
      });
    }

    return result;
  }, [quote, timeframe, currentSymbol]);

  // Filter news for current stock
  const relatedNews = useMemo(() => {
    return news.filter(n => 
      n.relatedSymbol?.toUpperCase() === currentSymbol ||
      n.headline.toUpperCase().includes(currentSymbol) ||
      n.summary.toUpperCase().includes(currentSymbol)
    );
  }, [news, currentSymbol]);

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTicker.trim()) return;
    onNavigate('stock_analysis', { symbol: searchTicker.trim().toUpperCase() });
    setSearchTicker('');
    setIsSearching(false);
  };

  const handleAddToPortfolio = () => {
    if (!quote) return;
    const qty = parseFloat(addQty) || 1;
    const price = parseFloat(addPrice) || quote.price;

    addHolding({
      assetType: 'stock',
      symbol: quote.symbol,
      name: quote.name,
      quantity: qty,
      averagePrice: price,
      purchaseDate: new Date().toISOString().split('T')[0],
      broker: 'Manual Input',
      notes: `Added from Deep Stock Analysis tool`,
      isDemo: false
    });

    addNotification({
      title: 'Holding Added',
      message: `Successfully added ${qty} shares of ${quote.symbol} to your portfolio.`,
      type: 'success'
    });

    setAddedSuccess(true);
    setTimeout(() => {
      setAddedSuccess(false);
      setShowAddModal(false);
    }, 1200);
  };

  const inWatchlist = isInWatchlist(currentSymbol);

  // 52 Week Range calculation percentage
  const range52Percent = useMemo(() => {
    if (!quote || quote.high52 <= quote.low52) return 50;
    const pct = ((quote.price - quote.low52) / (quote.high52 - quote.low52)) * 100;
    return Math.min(Math.max(pct, 0), 100);
  }, [quote]);

  // Loading skeleton state
  if (loading) {
    return (
      <div className="space-y-6 pb-12 w-full max-w-7xl mx-auto animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/[0.05]" />
          <div className="h-6 w-48 rounded bg-white/[0.05]" />
        </div>
        <div className="glass-card p-6 rounded-2xl border border-white/[0.08] space-y-4">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <div className="h-8 w-40 rounded bg-white/[0.05]" />
              <div className="h-4 w-60 rounded bg-white/[0.05]" />
            </div>
            <div className="h-10 w-32 rounded-xl bg-white/[0.05]" />
          </div>
          <div className="h-64 rounded-xl bg-white/[0.02]" />
        </div>
      </div>
    );
  }

  // Error State
  if (error || !quote) {
    return (
      <div className="space-y-6 pb-12 w-full max-w-4xl mx-auto">
        <button
          onClick={() => onNavigate('stocks')}
          className="flex items-center gap-2 text-xs font-mono text-gray-400 hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Stocks</span>
        </button>

        <div className="glass-card p-8 rounded-2xl border border-rose-500/20 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-100">Stock Quote Unavailable</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
              {error || `Could not fetch live or historical market data for symbol "${currentSymbol}".`}
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => onNavigate('stock_analysis', { symbol: 'RELIANCE' })}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition-all"
            >
              Analyze RELIANCE
            </button>
            <button
              onClick={() => onNavigate('stocks')}
              className="px-4 py-2 rounded-xl bg-[#151C2B] border border-white/[0.08] text-gray-300 text-xs font-semibold"
            >
              Return to Portfolio
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 w-full max-w-7xl mx-auto">
      {/* Top Navigation & Quick Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('stocks')}
            className="p-2 rounded-xl bg-[#151C2B] hover:bg-[#182033] border border-white/[0.08] text-gray-400 hover:text-cyan-400 transition-all"
            title="Back to Stock Portfolio"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-500">Stock Intelligence</span>
            <span className="text-gray-600">/</span>
            <span className="text-xs font-mono font-bold text-cyan-400">{quote.symbol}</span>
          </div>
        </div>

        {/* Ticker Search Box */}
        <form onSubmit={handleQuickSearch} className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchTicker}
              onChange={(e) => setSearchTicker(e.target.value)}
              placeholder="Jump to symbol (e.g. TCS)..."
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-[#111827] border border-white/[0.08] text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 uppercase font-mono w-48 sm:w-56"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 rounded-xl bg-[#151C2B] border border-white/[0.08] text-xs font-semibold text-gray-300 hover:text-cyan-400 transition-colors"
          >
            Go
          </button>
        </form>
      </div>

      {/* Hero Stock Header Card */}
      <div className="glass-card p-5 sm:p-6 rounded-2xl border border-white/[0.08] relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Company Details */}
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black text-gray-100 tracking-tight">
                {quote.symbol}
              </h1>
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold bg-white/[0.06] text-gray-300 border border-white/[0.08]">
                {quote.sector || 'Equities'}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wide bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                LIVE FEED
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-400 mt-1 font-medium">{quote.name}</p>
          </div>

          {/* Price & Day Change */}
          <div className="flex flex-col md:items-end">
            <div className="text-3xl sm:text-4xl font-black text-gray-100 font-mono tracking-tight">
              {formatCurrency(quote.price, settings.currency)}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center gap-1 text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                quote.change >= 0 
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              }`}>
                {quote.change >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {quote.change >= 0 ? '+' : ''}{quote.change.toFixed(2)} ({formatPercent(quote.changePercent)})
              </span>
              <span className="text-[11px] text-gray-500 font-mono">Today</span>
            </div>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="mt-6 pt-4 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-black/30 p-1 rounded-xl border border-white/[0.05]">
            {(['overview', 'chart', 'fundamentals', 'news'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  activeTab === tab
                    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleWatchlist({
                symbol: quote.symbol,
                name: quote.name,
                assetType: 'stock'
              })}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                inWatchlist 
                  ? 'bg-amber-400/10 text-amber-400 border-amber-400/30' 
                  : 'bg-[#151C2B] text-gray-300 border-white/[0.08] hover:text-amber-400'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${inWatchlist ? 'fill-amber-400' : ''}`} />
              <span>{inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add to Portfolio</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="glass-card p-3 rounded-xl border border-white/[0.06]">
              <span className="text-[10px] text-gray-500 uppercase font-mono block">Market Cap</span>
              <span className="text-sm font-bold text-gray-100 font-mono mt-0.5 block">{quote.marketCap}</span>
            </div>
            <div className="glass-card p-3 rounded-xl border border-white/[0.06]">
              <span className="text-[10px] text-gray-500 uppercase font-mono block">P/E Ratio</span>
              <span className="text-sm font-bold text-gray-100 font-mono mt-0.5 block">{quote.pe || '24.5'}</span>
            </div>
            <div className="glass-card p-3 rounded-xl border border-white/[0.06]">
              <span className="text-[10px] text-gray-500 uppercase font-mono block">EPS (TTM)</span>
              <span className="text-sm font-bold text-gray-100 font-mono mt-0.5 block">
                {quote.eps ? formatCurrency(quote.eps, settings.currency) : '₹64.20'}
              </span>
            </div>
            <div className="glass-card p-3 rounded-xl border border-white/[0.06]">
              <span className="text-[10px] text-gray-500 uppercase font-mono block">Beta</span>
              <span className="text-sm font-bold text-gray-100 font-mono mt-0.5 block">{quote.beta || '0.94'}</span>
            </div>
            <div className="glass-card p-3 rounded-xl border border-white/[0.06]">
              <span className="text-[10px] text-gray-500 uppercase font-mono block">Volume</span>
              <span className="text-sm font-bold text-gray-100 font-mono mt-0.5 block">
                {(quote.volume || 1200000).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="glass-card p-3 rounded-xl border border-white/[0.06]">
              <span className="text-[10px] text-gray-500 uppercase font-mono block">Prev Close</span>
              <span className="text-sm font-bold text-gray-100 font-mono mt-0.5 block">
                {formatCurrency(quote.previousClose, settings.currency)}
              </span>
            </div>
            <div className="glass-card p-3 rounded-xl border border-white/[0.06]">
              <span className="text-[10px] text-gray-500 uppercase font-mono block">Sector</span>
              <span className="text-sm font-bold text-cyan-400 font-mono mt-0.5 block truncate">
                {quote.sector || 'Equities'}
              </span>
            </div>
          </div>

          {/* 52 Week Range Visual Bar */}
          <div className="glass-card p-5 rounded-2xl border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-gray-400 font-bold uppercase tracking-wider">52-Week Price Spectrum</span>
              <span className="text-cyan-400 font-bold">Position: {range52Percent.toFixed(0)}% of Range</span>
            </div>

            <div className="space-y-1.5">
              <div className="relative h-3 w-full bg-black/40 rounded-full overflow-hidden border border-white/[0.06]">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400 rounded-full"
                  style={{ width: `${range52Percent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs font-mono text-gray-400">
                <div>
                  <span className="text-[10px] text-gray-500 block">52W Low</span>
                  <span className="text-gray-300 font-bold">{formatCurrency(quote.low52, settings.currency)}</span>
                </div>
                <div className="text-center">
                  <span className="text-[10px] text-gray-500 block">Current</span>
                  <span className="text-cyan-400 font-bold">{formatCurrency(quote.price, settings.currency)}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-500 block">52W High</span>
                  <span className="text-gray-300 font-bold">{formatCurrency(quote.high52, settings.currency)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bull Case & Bear Case Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bull Case */}
            <div className="glass-card p-5 rounded-2xl border border-emerald-500/20 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-3 text-emerald-400">
                <TrendingUp className="w-4 h-4" />
                <h3 className="text-sm font-bold uppercase font-mono tracking-wider">Algorithmic Bull Thesis</h3>
              </div>
              <ul className="space-y-2 text-xs text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>Dominant market share in {quote.sector || 'core sector'} with proven cash-flow compounding.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>Operating margins and return on equity (ROE) consistently trade above peer benchmarks.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>Institutional inflows from domestic mutual funds and global index adjustments remain positive.</span>
                </li>
              </ul>
            </div>

            {/* Bear Case */}
            <div className="glass-card p-5 rounded-2xl border border-rose-500/20 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-3 text-rose-400">
                <TrendingDown className="w-4 h-4" />
                <h3 className="text-sm font-bold uppercase font-mono tracking-wider">Algorithmic Risk Vectors</h3>
              </div>
              <ul className="space-y-2 text-xs text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold">•</span>
                  <span>Sensitivity to macroeconomic interest rate adjustments and global supply fluctuations.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold">•</span>
                  <span>Valuation multiples ({quote.pe}x P/E) offer limited margin of safety in volatile broad market pullbacks.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold">•</span>
                  <span>Regulatory or sector compliance overhead could pressure near-term quarterly guidance.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Chart */}
      {activeTab === 'chart' && (
        <div className="glass-card p-5 sm:p-6 rounded-2xl border border-white/[0.08] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-gray-200 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-cyan-400" />
                Interactive Price Action
              </h2>
              <p className="text-xs text-gray-500 font-mono">Synthetic multi-resolution financial tick series</p>
            </div>

            {/* Timeframe Buttons */}
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/[0.06]">
              {(['1D', '1W', '1M', '6M', '1Y', '5Y'] as Timeframe[]).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                    timeframe === tf
                      ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* Area Chart */}
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="stockChartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="time" 
                  stroke="#4B5563" 
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  axisLine={{ stroke: '#374151' }}
                />
                <YAxis 
                  stroke="#4B5563"
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  axisLine={{ stroke: '#374151' }}
                  tickFormatter={(val) => `₹${val}`}
                />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val) || 0, settings.currency), 'Price']}
                  contentStyle={{
                    backgroundColor: '#111827',
                    border: '1px solid rgba(6, 182, 212, 0.3)',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#F3F4F6',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="price" 
                  stroke="#06B6D4" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#stockChartGrad)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-xs font-mono text-gray-500 pt-2 border-t border-white/[0.06]">
            <span>Timeframe: {timeframe}</span>
            <span>Current Benchmark: {formatCurrency(quote.price, settings.currency)}</span>
          </div>
        </div>
      )}

      {/* Tab 3: Fundamentals */}
      {activeTab === 'fundamentals' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="glass-card p-5 rounded-2xl border border-white/[0.08]">
              <span className="text-xs text-gray-400 font-mono uppercase block">Market Capitalization</span>
              <div className="text-2xl font-black text-gray-100 font-mono mt-1">{quote.marketCap}</div>
              <p className="text-xs text-gray-500 mt-2">Total equity market value calculated from outstanding common shares.</p>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-white/[0.08]">
              <span className="text-xs text-gray-400 font-mono uppercase block">Price to Earnings (P/E)</span>
              <div className="text-2xl font-black text-cyan-400 font-mono mt-1">{quote.pe || '26.4'}x</div>
              <p className="text-xs text-gray-500 mt-2">Valuation multiple relative to trailing 12-month earnings.</p>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-white/[0.08]">
              <span className="text-xs text-gray-400 font-mono uppercase block">Earnings Per Share (EPS)</span>
              <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
                {quote.eps ? formatCurrency(quote.eps, settings.currency) : '₹72.50'}
              </div>
              <p className="text-xs text-gray-500 mt-2">Net income distributed per outstanding share.</p>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-white/[0.08]">
              <span className="text-xs text-gray-400 font-mono uppercase block">Dividend Yield</span>
              <div className="text-2xl font-black text-gray-100 font-mono mt-1">1.25%</div>
              <p className="text-xs text-gray-500 mt-2">Annual dividend payout ratio relative to current share price.</p>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-white/[0.08]">
              <span className="text-xs text-gray-400 font-mono uppercase block">Beta (Volatility)</span>
              <div className="text-2xl font-black text-violet-400 font-mono mt-1">{quote.beta || '0.92'}</div>
              <p className="text-xs text-gray-500 mt-2">Market volatility measure against NIFTY50 benchmark.</p>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-white/[0.08]">
              <span className="text-xs text-gray-400 font-mono uppercase block">Return on Equity (ROE)</span>
              <div className="text-2xl font-black text-gray-100 font-mono mt-1">18.4%</div>
              <p className="text-xs text-gray-500 mt-2">Measure of financial efficiency generating profit from equity capital.</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: News */}
      {activeTab === 'news' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-200 flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-cyan-400" />
              Intelligence & News Feed for {quote.symbol}
            </h2>
            <span className="text-xs font-mono text-gray-500">{relatedNews.length} Signals Found</span>
          </div>

          {relatedNews.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {relatedNews.map((item) => (
                <div key={item.id} className="glass-card p-5 rounded-2xl border border-white/[0.08] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-gray-400">{item.source} • {item.time}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      item.sentiment === 'bullish' 
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                        : item.sentiment === 'bearish'
                        ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        : 'bg-gray-500/15 text-gray-300 border border-gray-500/30'
                    }`}>
                      {item.sentiment}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-gray-100 leading-snug">{item.headline}</h3>
                  <p className="text-xs text-gray-400 line-clamp-3 leading-relaxed">{item.summary}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card p-8 rounded-2xl text-center space-y-2 border border-white/[0.06]">
              <p className="text-xs text-gray-400">No specific headlines currently mapped to ticker {quote.symbol}.</p>
              <p className="text-[11px] text-gray-500">Global market sentiment for this asset remains neutral.</p>
            </div>
          )}
        </div>
      )}

      {/* Quick Add to Portfolio Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card p-6 rounded-2xl border border-cyan-500/30 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-100">Add {quote.symbol} to Portfolio</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-200 text-xs font-mono"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-gray-400 font-mono block mb-1">Number of Shares</label>
                <input
                  type="number"
                  value={addQty}
                  onChange={(e) => setAddQty(e.target.value)}
                  min="1"
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.1] text-gray-100 focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div>
                <label className="text-gray-400 font-mono block mb-1">Purchase Price per Share (₹)</label>
                <input
                  type="number"
                  value={addPrice}
                  onChange={(e) => setAddPrice(e.target.value)}
                  step="0.05"
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.1] text-gray-100 focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-mono flex justify-between">
                <span>Estimated Total:</span>
                <span className="font-bold">
                  {formatCurrency((parseFloat(addQty) || 0) * (parseFloat(addPrice) || 0), settings.currency)}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleAddToPortfolio}
                disabled={addedSuccess}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all flex items-center gap-1.5"
              >
                {addedSuccess ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>{addedSuccess ? 'Holding Added!' : 'Confirm Holding'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory Disclaimer */}
      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] text-center">
        <p className="text-[11px] text-gray-500 font-mono">
          Disclaimer: This information is for educational purposes only. Not financial advice.
        </p>
      </div>
    </div>
  );
};

export default StockAnalysis;
