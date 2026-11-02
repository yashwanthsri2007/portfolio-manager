import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Plus, 
  RefreshCw, 
  Sparkles, 
  PieChart as PieIcon, 
  ArrowUpRight, 
  ArrowDownRight, 
  ExternalLink, 
  ChevronRight, 
  SlidersHorizontal,
  X,
  Check,
  CheckCircle2,
  Calendar,
  Layers,
  Info
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { usePortfolio } from '../../context/PortfolioContext';
import { useSettings } from '../../context/SettingsContext';
import { useNotifications } from '../../context/NotificationContext';
import { searchMutualFunds, fetchMutualFundQuote } from '../../services/mutualFundService';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { Holding, MutualFundQuote, MutualFundScheme } from '../../types';

export interface MutualFundsPageProps {
  onNavigate: (page: string, data?: any) => void;
}

const MF_COLORS = ['#7C3AED', '#06B6D4', '#10B981', '#F59E0B', '#EC4899', '#3B82F6', '#8B5CF6'];

export const MutualFundsPage: React.FC<MutualFundsPageProps> = ({ onNavigate }) => {
  const { holdings, refreshMarketData, isRefreshing, addHolding, deleteHolding } = usePortfolio();
  const { settings } = useSettings();
  const { addNotification } = useNotifications();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MutualFundScheme[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Live quotes state for holdings
  const [mfQuotes, setMfQuotes] = useState<Record<string, MutualFundQuote>>({});
  const [loadingQuotes, setLoadingQuotes] = useState(false);

  // Selected Fund Details Modal State
  const [selectedFund, setSelectedFund] = useState<MutualFundQuote | null>(null);
  const [isLoadingFundDetail, setIsLoadingFundDetail] = useState(false);

  // Quick Add State
  const [quickAddScheme, setQuickAddScheme] = useState<MutualFundQuote | null>(null);
  const [addUnits, setAddUnits] = useState('100');
  const [addNav, setAddNav] = useState('');
  const [addedSuccess, setAddedSuccess] = useState(false);

  // Filter MF holdings
  const mfHoldings = useMemo(() => {
    return holdings.filter(h => h.assetType === 'mutual_fund');
  }, [holdings]);

  // Fetch live NAV quotes for all user MF holdings
  useEffect(() => {
    let isMounted = true;
    async function loadMFQuotes() {
      if (mfHoldings.length === 0) return;
      setLoadingQuotes(true);
      try {
        const quoteMap: Record<string, MutualFundQuote> = {};
        await Promise.all(
          mfHoldings.map(async (holding) => {
            const quote = await fetchMutualFundQuote(holding.symbol);
            quoteMap[holding.symbol] = quote;
          })
        );
        if (isMounted) {
          setMfQuotes(quoteMap);
        }
      } catch (err) {
        console.warn('Error loading MF quotes:', err);
      } finally {
        if (isMounted) {
          setLoadingQuotes(false);
        }
      }
    }

    loadMFQuotes();
    return () => {
      isMounted = false;
    };
  }, [mfHoldings]);

  // Handle Search input debounce
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchMutualFunds(searchQuery.trim());
        setSearchResults(results);
        setShowSearchDropdown(true);
      } catch (err) {
        console.warn('Search MF error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Aggregate Performance Totals
  const { totalInvested, currentValue, totalReturns, totalReturnPercent, processedHoldings } = useMemo(() => {
    let invested = 0;
    let current = 0;

    const list = mfHoldings.map(h => {
      const quote = mfQuotes[h.symbol];
      const curNav = quote ? quote.nav : (h.manualPrice || h.averagePrice);
      const hInvested = h.quantity * h.averagePrice;
      const hCurrent = h.quantity * curNav;
      const pl = hCurrent - hInvested;
      const retPct = hInvested > 0 ? (pl / hInvested) * 100 : 0;
      const dayPct = quote ? quote.changePercent : 0;
      const dayVal = hCurrent * (dayPct / 100);

      invested += hInvested;
      current += hCurrent;

      return {
        ...h,
        currentNav: curNav,
        quote,
        invested: hInvested,
        currentValue: hCurrent,
        profitLoss: pl,
        returnPercent: retPct,
        dayChange: dayVal,
        dayChangePercent: dayPct
      };
    });

    const pl = current - invested;
    const retPct = invested > 0 ? (pl / invested) * 100 : 0;

    return {
      totalInvested: invested,
      currentValue: current,
      totalReturns: pl,
      totalReturnPercent: retPct,
      processedHoldings: list
    };
  }, [mfHoldings, mfQuotes]);

  // Best & Worst performing mutual funds
  const { bestFund, worstFund } = useMemo(() => {
    if (processedHoldings.length === 0) return { bestFund: null, worstFund: null };
    const sorted = [...processedHoldings].sort((a, b) => b.returnPercent - a.returnPercent);
    return {
      bestFund: sorted[0],
      worstFund: sorted.length > 1 ? sorted[sorted.length - 1] : null
    };
  }, [processedHoldings]);

  // Allocation Donut Data
  const allocationData = useMemo(() => {
    return processedHoldings.map(h => ({
      name: h.name,
      value: h.currentValue,
      percentage: currentValue > 0 ? (h.currentValue / currentValue) * 100 : 0
    })).sort((a, b) => b.value - a.value);
  }, [processedHoldings, currentValue]);

  // Open Fund Detail from row or search
  const handleOpenFundDetail = async (schemeCode: string | number) => {
    setIsLoadingFundDetail(true);
    try {
      const q = await fetchMutualFundQuote(schemeCode.toString());
      setSelectedFund(q);
      setShowSearchDropdown(false);
    } catch (err) {
      console.warn('Failed to fetch scheme quote:', err);
    } finally {
      setIsLoadingFundDetail(false);
    }
  };

  // Open Quick Add Modal
  const handleInitiateAdd = (quote: MutualFundQuote) => {
    setQuickAddScheme(quote);
    setAddNav(quote.nav.toString());
    setAddUnits('100');
    setSelectedFund(null);
  };

  // Confirm Add to Portfolio
  const handleConfirmAdd = () => {
    if (!quickAddScheme) return;
    const units = parseFloat(addUnits) || 1;
    const navVal = parseFloat(addNav) || quickAddScheme.nav;

    addHolding({
      assetType: 'mutual_fund',
      symbol: quickAddScheme.schemeCode,
      name: quickAddScheme.schemeName,
      quantity: units,
      averagePrice: navVal,
      purchaseDate: new Date().toISOString().split('T')[0],
      broker: 'Direct Scheme',
      notes: 'Added from Mutual Funds Dashboard',
      isDemo: false
    });

    addNotification({
      title: 'Mutual Fund Added',
      message: `Added ${units} units of ${quickAddScheme.schemeName} to your portfolio.`,
      type: 'success'
    });

    setAddedSuccess(true);
    setTimeout(() => {
      setAddedSuccess(false);
      setQuickAddScheme(null);
    }, 1200);
  };

  return (
    <div className="space-y-6 pb-12 w-full max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-gray-100 tracking-tight">
              Mutual Funds Dashboard
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wide bg-violet-500/10 text-violet-400 border border-violet-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse"></span>
              NAV REALTIME SYNC
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-400 font-mono mt-1">
            Systematic SIP holdings, NAV valuations, and fund growth analytics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refreshMarketData()}
            disabled={isRefreshing || loadingQuotes}
            className="px-3 py-2 rounded-xl bg-[#151C2B] hover:bg-[#182033] border border-white/[0.08] text-gray-300 hover:text-violet-400 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
            title="Refresh Quotes"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || loadingQuotes ? 'animate-spin text-violet-400' : ''}`} />
            <span className="hidden sm:inline">Refresh NAVs</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total MF Investment */}
        <div className="glass-card p-4 sm:p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between text-gray-400 text-xs font-medium mb-2">
            <span>Total MF Investment</span>
            <span className="p-1.5 rounded-lg bg-violet-500/10 text-violet-400">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-gray-100 tracking-tight">
            {formatCurrency(totalInvested, settings.currency)}
          </div>
          <div className="mt-2 text-[11px] text-gray-500 font-mono">
            Invested across {mfHoldings.length} schemes
          </div>
        </div>

        {/* Current Value */}
        <div className="glass-card p-4 sm:p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between text-gray-400 text-xs font-medium mb-2">
            <span>Current Value</span>
            <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-gray-100 tracking-tight">
            {formatCurrency(currentValue, settings.currency)}
          </div>
          <div className="mt-2 text-[11px] text-gray-500 font-mono">
            Latest NAV market valuation
          </div>
        </div>

        {/* Returns */}
        <div className={`glass-card p-4 sm:p-5 rounded-2xl relative overflow-hidden ${totalReturns >= 0 ? 'border-emerald-500/20' : 'border-rose-500/20'}`}>
          <div className="flex items-center justify-between text-gray-400 text-xs font-medium mb-2">
            <span>Total Gain / Loss</span>
            <span className={`p-1.5 rounded-lg ${totalReturns >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
              {totalReturns >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            </span>
          </div>
          <div className={`text-xl sm:text-2xl font-black tracking-tight ${totalReturns >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatCurrency(totalReturns, settings.currency)}
          </div>
          <div className="mt-2 text-[11px] text-gray-500 font-mono">
            Net capital appreciation
          </div>
        </div>

        {/* Return % */}
        <div className={`glass-card p-4 sm:p-5 rounded-2xl relative overflow-hidden ${totalReturnPercent >= 0 ? 'border-emerald-500/20' : 'border-rose-500/20'}`}>
          <div className="flex items-center justify-between text-gray-400 text-xs font-medium mb-2">
            <span>Total Return %</span>
            <span className={`p-1.5 rounded-lg ${totalReturnPercent >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
              <Sparkles className="w-4 h-4" />
            </span>
          </div>
          <div className={`text-xl sm:text-2xl font-black tracking-tight ${totalReturnPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatPercent(totalReturnPercent)}
          </div>
          <div className="mt-2 text-[11px] text-gray-500 font-mono">
            Portfolio XIRR / return rate
          </div>
        </div>
      </div>

      {/* Highlights: Best & Worst Performing Fund + Donut Allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Best & Worst Fund Cards */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider font-mono flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" />
            Performance Extremes
          </h2>

          {/* Best Performing Fund */}
          <div 
            onClick={() => bestFund && handleOpenFundDetail(bestFund.symbol)}
            className="glass-card p-4 rounded-2xl border-emerald-500/20 hover:border-emerald-500/40 cursor-pointer transition-all hover:translate-y-[-2px]"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold uppercase">
                Best Performing
              </span>
              <span className="text-xs font-mono font-bold text-emerald-400 flex items-center">
                <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                {bestFund ? formatPercent(bestFund.returnPercent) : '0.00%'}
              </span>
            </div>

            {bestFund ? (
              <div>
                <h3 className="text-sm font-bold text-gray-100 line-clamp-2 leading-snug">{bestFund.name}</h3>
                <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-gray-400">
                  <span>Current NAV:</span>
                  <span className="text-gray-200 font-bold">₹{bestFund.currentNav.toFixed(2)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs font-mono text-gray-400">
                  <span>Total Gain:</span>
                  <span className="text-emerald-400 font-semibold">{formatCurrency(bestFund.profitLoss, settings.currency)}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic py-2">No funds in portfolio</p>
            )}
          </div>

          {/* Worst Performing Fund */}
          <div 
            onClick={() => worstFund && handleOpenFundDetail(worstFund.symbol)}
            className="glass-card p-4 rounded-2xl border-rose-500/20 hover:border-rose-500/40 cursor-pointer transition-all hover:translate-y-[-2px]"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30 font-bold uppercase">
                Underperforming
              </span>
              <span className="text-xs font-mono font-bold text-rose-400 flex items-center">
                <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                {worstFund ? formatPercent(worstFund.returnPercent) : '0.00%'}
              </span>
            </div>

            {worstFund ? (
              <div>
                <h3 className="text-sm font-bold text-gray-100 line-clamp-2 leading-snug">{worstFund.name}</h3>
                <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-gray-400">
                  <span>Current NAV:</span>
                  <span className="text-gray-200 font-bold">₹{worstFund.currentNav.toFixed(2)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs font-mono text-gray-400">
                  <span>Gain / Loss:</span>
                  <span className={worstFund.profitLoss >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                    {formatCurrency(worstFund.profitLoss, settings.currency)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic py-2">Add more schemes to compare performance</p>
            )}
          </div>
        </div>

        {/* Donut Allocation Chart Card */}
        <div className="lg:col-span-2 glass-card p-5 rounded-2xl border border-white/[0.08] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-gray-200 flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-violet-400" />
                Mutual Fund Allocation
              </h2>
              <p className="text-xs text-gray-500 font-mono">Weighting by capital allocation</p>
            </div>
            <span className="text-xs font-mono text-gray-400">
              {allocationData.length} Schemes
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            {/* Donut Chart */}
            <div className="h-48 w-full">
              {allocationData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={allocationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {allocationData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={MF_COLORS[index % MF_COLORS.length]} stroke="#0B0F17" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val: any) => formatCurrency(Number(val) || 0, settings.currency)}
                      contentStyle={{
                        backgroundColor: '#111827',
                        border: '1px solid rgba(124, 58, 237, 0.3)',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: '#F3F4F6'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-gray-500">
                  No mutual fund positions
                </div>
              )}
            </div>

            {/* Scheme List with Colors */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {allocationData.map((scheme, idx) => (
                <div key={scheme.name} className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-black/20 hover:bg-black/40 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0" 
                      style={{ backgroundColor: MF_COLORS[idx % MF_COLORS.length] }} 
                    />
                    <span className="text-gray-300 font-medium truncate">{scheme.name}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono shrink-0 ml-2">
                    <span className="text-violet-400 font-bold">{scheme.percentage.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Fund Search Bar with Dropdown */}
      <div className="relative">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search all Indian mutual funds (e.g. Parag Parikh, SBI Small Cap, HDFC, Axis, Mirae)..."
              className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl bg-[#111827] border border-white/[0.08] text-gray-100 placeholder-gray-500 focus:outline-none focus:border-violet-500/50 transition-all shadow-inner"
            />
            {isSearching && (
              <RefreshCw className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-violet-400 animate-spin" />
            )}
            {searchQuery && !isSearching && (
              <button 
                onClick={() => { setSearchQuery(''); setSearchResults([]); setShowSearchDropdown(false); }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Search Results Dropdown */}
        {showSearchDropdown && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-30 mt-2 bg-[#111827] border border-violet-500/30 rounded-2xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto backdrop-blur-xl">
            <div className="p-2 border-b border-white/[0.06] text-[10px] font-mono text-gray-400 uppercase tracking-wider flex justify-between">
              <span>MFAPI Search Results ({searchResults.length})</span>
              <span>Click to view live NAV</span>
            </div>
            {searchResults.map((fund) => (
              <div
                key={fund.schemeCode}
                onClick={() => handleOpenFundDetail(fund.schemeCode)}
                className="p-3 hover:bg-violet-500/10 transition-colors cursor-pointer border-b border-white/[0.04] last:border-b-0 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-gray-200 truncate">{fund.schemeName}</div>
                  <div className="text-[10px] font-mono text-violet-400 mt-0.5">Code: {fund.schemeCode}</div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenFundDetail(fund.schemeCode);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 text-[11px] font-semibold shrink-0"
                >
                  View NAV
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mutual Fund Holdings List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider font-mono flex items-center gap-2">
            <Layers className="w-4 h-4 text-violet-400" />
            Your Mutual Fund Holdings ({processedHoldings.length})
          </h2>
        </div>

        {processedHoldings.length > 0 ? (
          <div className="space-y-3">
            {processedHoldings.map((fund) => (
              <div
                key={fund.id}
                onClick={() => handleOpenFundDetail(fund.symbol)}
                className="glass-card glass-card-hover p-4 sm:p-5 rounded-2xl cursor-pointer transition-all border border-white/[0.08] relative overflow-hidden group"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Column: Name & Units */}
                  <div className="space-y-1 lg:max-w-md">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-violet-500/15 text-violet-300 border border-violet-500/30">
                        Scheme #{fund.symbol}
                      </span>
                      <span className="text-xs text-gray-500 font-mono">
                        {fund.broker || 'Direct'}
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-gray-100 group-hover:text-violet-400 transition-colors">
                      {fund.name}
                    </h3>
                    <div className="text-xs text-gray-400 font-mono">
                      Units: <span className="text-gray-200 font-semibold">{fund.quantity.toLocaleString('en-IN', { maximumFractionDigits: 3 })}</span>
                    </div>
                  </div>

                  {/* Middle Column: Purchase NAV vs Live NAV */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase block">Purchase NAV</span>
                      <span className="text-gray-200 font-bold">₹{fund.averagePrice.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase block">Current NAV</span>
                      <span className="text-cyan-400 font-bold">₹{fund.currentNav.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase block">Invested</span>
                      <span className="text-gray-200 font-bold">{formatCurrency(fund.invested, settings.currency)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase block">Current Value</span>
                      <span className="text-violet-300 font-bold">{formatCurrency(fund.currentValue, settings.currency)}</span>
                    </div>
                  </div>

                  {/* Right Column: P&L & Actions */}
                  <div className="flex items-center justify-between lg:justify-end gap-4 border-t lg:border-t-0 pt-3 lg:pt-0 border-white/[0.06]">
                    <div className="text-right">
                      <div className={`text-sm font-bold font-mono ${fund.profitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatCurrency(fund.profitLoss, settings.currency)}
                      </div>
                      <span className={`inline-block text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        fund.returnPercent >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {formatPercent(fund.returnPercent)}
                      </span>
                    </div>

                    <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-violet-400 transition-colors" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="glass-card p-10 rounded-2xl text-center space-y-4 border border-white/[0.08]">
            <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center mx-auto">
              <Layers className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-100">No Mutual Fund Holdings</h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto mt-1">
                You haven't added any mutual fund holdings yet. Search for any AMFI scheme above or quick-add from popular funds.
              </p>
            </div>
            <div className="pt-2 flex flex-wrap justify-center gap-2">
              <button
                onClick={() => handleOpenFundDetail('122639')}
                className="px-3 py-1.5 rounded-xl bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/30 text-violet-300 text-xs font-semibold"
              >
                + Parag Parikh Flexi Cap
              </button>
              <button
                onClick={() => handleOpenFundDetail('125497')}
                className="px-3 py-1.5 rounded-xl bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/30 text-violet-300 text-xs font-semibold"
              >
                + SBI Small Cap
              </button>
              <button
                onClick={() => handleOpenFundDetail('119598')}
                className="px-3 py-1.5 rounded-xl bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/30 text-violet-300 text-xs font-semibold"
              >
                + Mirae Asset Large Cap
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Fund Detail / Inspection Modal */}
      {selectedFund && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card p-6 rounded-2xl border border-violet-500/40 max-w-lg w-full space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  AMFI Code: {selectedFund.schemeCode}
                </span>
                <h3 className="text-base font-bold text-gray-100 mt-1.5 leading-snug">
                  {selectedFund.schemeName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedFund(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-100 text-xs"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Stats */}
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06]">
                <span className="text-[10px] text-gray-500 uppercase block">Latest NAV</span>
                <div className="text-xl font-bold text-violet-400 mt-1">₹{selectedFund.nav.toFixed(2)}</div>
                <span className="text-[10px] text-gray-400 mt-1 block">As of {selectedFund.date}</span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06]">
                <span className="text-[10px] text-gray-500 uppercase block">Day Change</span>
                <div className={`text-xl font-bold mt-1 ${selectedFund.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {selectedFund.change >= 0 ? '+' : ''}{selectedFund.change.toFixed(2)} ({formatPercent(selectedFund.changePercent)})
                </div>
                <span className="text-[10px] text-gray-400 mt-1 block">Prev NAV: ₹{selectedFund.previousNav.toFixed(2)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
              <button
                onClick={() => setSelectedFund(null)}
                className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 text-xs font-semibold"
              >
                Close
              </button>
              <button
                onClick={() => handleInitiateAdd(selectedFund)}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-[0_0_15px_rgba(124,58,237,0.4)] transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Holding</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Form Modal */}
      {quickAddScheme && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card p-6 rounded-2xl border border-violet-500/30 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-100">Add to MF Portfolio</h3>
              <button 
                onClick={() => setQuickAddScheme(null)}
                className="text-gray-400 hover:text-gray-200 text-xs font-mono"
              >
                Close
              </button>
            </div>

            <p className="text-xs text-gray-300 font-medium truncate">{quickAddScheme.schemeName}</p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-gray-400 font-mono block mb-1">Units Allocated</label>
                <input
                  type="number"
                  value={addUnits}
                  onChange={(e) => setAddUnits(e.target.value)}
                  step="0.001"
                  min="0.001"
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.1] text-gray-100 focus:outline-none focus:border-violet-500/50 font-mono"
                />
              </div>

              <div>
                <label className="text-gray-400 font-mono block mb-1">Purchase NAV (₹)</label>
                <input
                  type="number"
                  value={addNav}
                  onChange={(e) => setAddNav(e.target.value)}
                  step="0.01"
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.1] text-gray-100 focus:outline-none focus:border-violet-500/50 font-mono"
                />
              </div>

              <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-300 font-mono flex justify-between">
                <span>Total Investment:</span>
                <span className="font-bold">
                  {formatCurrency((parseFloat(addUnits) || 0) * (parseFloat(addNav) || 0), settings.currency)}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setQuickAddScheme(null)}
                className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAdd}
                disabled={addedSuccess}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-[0_0_15px_rgba(124,58,237,0.4)] transition-all flex items-center gap-1.5"
              >
                {addedSuccess ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>{addedSuccess ? 'Holding Added!' : 'Save Holding'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MutualFundsPage;
