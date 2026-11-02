import React, { useState, useMemo } from 'react';
import { 
  Coins, 
  TrendingUp, 
  Plus, 
  Shield, 
  Sparkles, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight, 
  Scale, 
  Gem, 
  Award, 
  Layers, 
  Trash2, 
  X, 
  Check, 
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { usePortfolio } from '../../context/PortfolioContext';
import { useSettings } from '../../context/SettingsContext';
import { useNotifications } from '../../context/NotificationContext';
import { getGoldLivePrice, calculateGoldHoldingValue } from '../../services/metalsService';
import { formatCurrency, formatPercent, formatDate } from '../../utils/formatters';
import { Holding, MetalCategory, MetalPrice } from '../../types';

export interface GoldDashboardProps {
  onNavigate: (page: string, data?: any) => void;
}

type ChartTimeframe = '1M' | '6M' | '1Y' | '5Y';

export const GoldDashboard: React.FC<GoldDashboardProps> = ({ onNavigate }) => {
  const { holdings, addHolding, deleteHolding, refreshMarketData, isRefreshing } = usePortfolio();
  const { settings } = useSettings();
  const { addNotification } = useNotifications();

  const [timeframe, setTimeframe] = useState<ChartTimeframe>('1Y');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState('24K Fine Gold Bar');
  const [addCategory, setAddCategory] = useState<MetalCategory>('Bars');
  const [addWeight, setAddWeight] = useState('10');
  const [addPricePer10g, setAddPricePer10g] = useState('72000');
  const [addNotes, setAddNotes] = useState('Bank Safe Deposit Locker');
  const [addedSuccess, setAddedSuccess] = useState(false);

  // Live gold price
  const liveGold: MetalPrice = useMemo(() => {
    return getGoldLivePrice();
  }, [isRefreshing]);

  // Filter gold holdings
  const goldHoldings = useMemo(() => {
    return holdings.filter(h => h.assetType === 'gold');
  }, [holdings]);

  // Calculate holdings values
  const { totalWeightGrams, totalInvested, totalCurrentValue, totalPL, totalReturnPct, processedHoldings } = useMemo(() => {
    let weight = 0;
    let invested = 0;
    let current = 0;

    const list = goldHoldings.map(h => {
      const val = calculateGoldHoldingValue(h, liveGold);
      weight += val.weightGrams;
      invested += val.totalInvested;
      current += val.currentValue;

      return {
        ...h,
        ...val,
        category: h.metalDetails?.metalCategory || '24K'
      };
    });

    const pl = current - invested;
    const retPct = invested > 0 ? (pl / invested) * 100 : 0;

    return {
      totalWeightGrams: weight,
      totalInvested: invested,
      totalCurrentValue: current,
      totalPL: pl,
      totalReturnPct: retPct,
      processedHoldings: list
    };
  }, [goldHoldings, liveGold]);

  // Synthetic Historical Gold Price Chart Data
  const chartData = useMemo(() => {
    const curGram = liveGold.pricePerGram; // ~7450
    if (timeframe === '1M') {
      return [
        { period: 'Day 1', price: curGram * 0.965 },
        { period: 'Day 5', price: curGram * 0.972 },
        { period: 'Day 10', price: curGram * 0.968 },
        { period: 'Day 15', price: curGram * 0.985 },
        { period: 'Day 20', price: curGram * 0.991 },
        { period: 'Day 25', price: curGram * 0.995 },
        { period: 'Today', price: curGram }
      ];
    } else if (timeframe === '6M') {
      return [
        { period: 'M-5', price: curGram * 0.91 },
        { period: 'M-4', price: curGram * 0.93 },
        { period: 'M-3', price: curGram * 0.925 },
        { period: 'M-2', price: curGram * 0.95 },
        { period: 'M-1', price: curGram * 0.978 },
        { period: 'Current', price: curGram }
      ];
    } else if (timeframe === '1Y') {
      return [
        { period: 'Q1 2025', price: 6280 },
        { period: 'Q2 2025', price: 6540 },
        { period: 'Q3 2025', price: 6890 },
        { period: 'Q4 2025', price: 7120 },
        { period: 'Q1 2026', price: 7350 },
        { period: 'Current', price: curGram }
      ];
    } else {
      return [
        { period: '2022', price: 4850 },
        { period: '2023', price: 5400 },
        { period: '2024', price: 6150 },
        { period: '2025', price: 6900 },
        { period: '2026', price: curGram }
      ];
    }
  }, [timeframe, liveGold]);

  const handleAddGold = (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(addWeight) || 10;
    const p10g = parseFloat(addPricePer10g) || 72000;
    const pricePerG = p10g / 10;

    addHolding({
      assetType: 'gold',
      symbol: `GOLD-${addCategory.toUpperCase()}`,
      name: addName.trim() || `Physical Gold ${addCategory}`,
      quantity: 1,
      averagePrice: p10g,
      purchaseDate: new Date().toISOString().split('T')[0],
      notes: addNotes,
      metalDetails: {
        metalCategory: addCategory,
        weightGrams: w
      },
      isDemo: false
    });

    addNotification({
      title: 'Gold Holding Added',
      message: `Recorded ${w}g of ${addCategory} gold in your vault.`,
      type: 'success'
    });

    setAddedSuccess(true);
    setTimeout(() => {
      setAddedSuccess(false);
      setShowAddModal(false);
    }, 1200);
  };

  return (
    <div className="space-y-6 pb-12 w-full max-w-7xl mx-auto">
      {/* Header with Gold Accent */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl glass-card glass-card-gold relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-100 tracking-tight flex items-center gap-2">
                GOLD COMMAND CENTER
              </h1>
              <p className="text-xs text-amber-300/80 font-mono mt-0.5">
                Physical Bullion, Sovereign Coins, 24K/22K Vault Valuation
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 relative z-10">
          <button
            onClick={() => refreshMarketData()}
            disabled={isRefreshing}
            className="px-3 py-2 rounded-xl bg-[#151C2B] hover:bg-[#182033] border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
            <span className="hidden sm:inline">Sync Rates</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-xs shadow-[0_0_20px_rgba(245,158,11,0.35)] transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Gold Holding</span>
          </button>
        </div>
      </div>

      {/* Live Benchmark Gold Price Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Price Per Gram */}
        <div className="glass-card p-4 rounded-xl border border-amber-500/20">
          <span className="text-[10px] text-amber-400/80 font-mono uppercase block">Live Price (1g 24K)</span>
          <div className="text-lg sm:text-xl font-black text-gray-100 font-mono mt-1">
            {formatCurrency(liveGold.pricePerGram, settings.currency)}
          </div>
          <span className="text-[10px] text-gray-500 font-mono mt-0.5 block">per gram bullion</span>
        </div>

        {/* Price Per 10 Grams */}
        <div className="glass-card p-4 rounded-xl border border-amber-500/20">
          <span className="text-[10px] text-amber-400/80 font-mono uppercase block">Live Benchmark (10g)</span>
          <div className="text-lg sm:text-xl font-black text-amber-400 font-mono mt-1">
            {formatCurrency(liveGold.pricePer10g || liveGold.pricePerGram * 10, settings.currency)}
          </div>
          <span className="text-[10px] text-gray-500 font-mono mt-0.5 block">standard 1 tola</span>
        </div>

        {/* Daily Change */}
        <div className="glass-card p-4 rounded-xl border border-amber-500/20">
          <span className="text-[10px] text-gray-400 font-mono uppercase block">Daily Change</span>
          <div className="text-lg sm:text-xl font-black text-emerald-400 font-mono mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-4 h-4" />
            +{liveGold.dayChangePercent}%
          </div>
          <span className="text-[10px] text-gray-500 font-mono mt-0.5 block">+₹{liveGold.dayChange} / g</span>
        </div>

        {/* Monthly Change */}
        <div className="glass-card p-4 rounded-xl border border-white/[0.06]">
          <span className="text-[10px] text-gray-400 font-mono uppercase block">Monthly Momentum</span>
          <div className="text-lg sm:text-xl font-black text-emerald-400 font-mono mt-1">
            +{liveGold.monthlyChangePercent}%
          </div>
          <span className="text-[10px] text-gray-500 font-mono mt-0.5 block">30-day gain</span>
        </div>

        {/* Yearly Change */}
        <div className="glass-card p-4 rounded-xl border border-white/[0.06] col-span-2 sm:col-span-1">
          <span className="text-[10px] text-gray-400 font-mono uppercase block">1-Year Yield</span>
          <div className="text-lg sm:text-xl font-black text-amber-400 font-mono mt-1">
            +{liveGold.yearlyChangePercent}%
          </div>
          <span className="text-[10px] text-gray-500 font-mono mt-0.5 block">safe haven compounding</span>
        </div>
      </div>

      {/* Summary Metrics & Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Portfolio Vault Summary */}
        <div className="glass-card p-5 rounded-2xl border border-amber-500/20 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Scale className="w-4 h-4" />
                Vault Holdings Overview
              </span>
              <span className="text-xs text-gray-400 font-mono">{goldHoldings.length} Assets</span>
            </div>

            <div className="space-y-4 mt-4">
              <div>
                <span className="text-[11px] text-gray-400 font-mono uppercase block">Total Pure Weight</span>
                <div className="text-2xl sm:text-3xl font-black text-gray-100 font-mono tracking-tight mt-0.5">
                  {totalWeightGrams.toFixed(1)} <span className="text-amber-400 text-lg">grams</span>
                </div>
                <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                  ≈ {(totalWeightGrams / 11.664).toFixed(2)} tolas
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/[0.06] font-mono text-xs">
                <div>
                  <span className="text-gray-500 text-[10px] uppercase block">Total Invested</span>
                  <span className="text-gray-200 font-bold">{formatCurrency(totalInvested, settings.currency)}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] uppercase block">Current Value</span>
                  <span className="text-amber-300 font-bold">{formatCurrency(totalCurrentValue, settings.currency)}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-amber-400/80 uppercase font-mono block">Vault Net Profit</span>
                  <span className={`text-base font-black font-mono ${totalPL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatCurrency(totalPL, settings.currency)}
                  </span>
                </div>
                <span className={`px-2 py-1 rounded-lg text-xs font-mono font-bold ${
                  totalReturnPct >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}>
                  {formatPercent(totalReturnPct)}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 text-[11px] text-gray-500 font-mono border-t border-white/[0.06]">
            Purity adjusted: 24K (100%), 22K (91.6%), Jewellery (88%)
          </div>
        </div>

        {/* Right Columns: Gold Price Recharts Area Chart */}
        <div className="lg:col-span-2 glass-card p-5 sm:p-6 rounded-2xl border border-white/[0.08] flex flex-col justify-between space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-gray-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Gold Price Trajectory (INR / Gram)
              </h2>
              <p className="text-xs text-gray-500 font-mono">Macroeconomic gold price compounding</p>
            </div>

            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/[0.06]">
              {(['1M', '6M', '1Y', '5Y'] as ChartTimeframe[]).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                    timeframe === tf
                      ? 'bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* Area Chart with Gold Gradient */}
          <div className="h-60 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="period" 
                  stroke="#4B5563" 
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  axisLine={{ stroke: '#374151' }}
                />
                <YAxis 
                  stroke="#4B5563"
                  domain={['dataMin - 100', 'dataMax + 100']}
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  axisLine={{ stroke: '#374151' }}
                  tickFormatter={(val) => `₹${val}`}
                />
                <Tooltip
                  formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Gold Rate/g']}
                  contentStyle={{
                    backgroundColor: '#111827',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#F3F4F6',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="price" 
                  stroke="#F59E0B" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#goldGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-xs font-mono text-gray-500 pt-2 border-t border-white/[0.06]">
            <span>Gold Purity: 99.9% (24 Karat Fine Bullion)</span>
            <span className="text-amber-400">Current: ₹{liveGold.pricePerGram}/g</span>
          </div>
        </div>
      </div>

      {/* Gold Holdings Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider font-mono flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-400" />
            Individual Vault Records
          </h2>
        </div>

        {processedHoldings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {processedHoldings.map((h) => (
              <div 
                key={h.id}
                className="glass-card glass-card-hover p-4 sm:p-5 rounded-2xl border border-white/[0.08] flex flex-col justify-between group relative overflow-hidden"
              >
                <div className="space-y-3">
                  {/* Category & Title */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold uppercase">
                        {h.category} Gold
                      </span>
                      <h3 className="text-base font-bold text-gray-100 mt-1">{h.name}</h3>
                      {h.notes && (
                        <p className="text-xs text-gray-500 font-mono mt-0.5 truncate">{h.notes}</p>
                      )}
                    </div>

                    <button
                      onClick={() => deleteHolding(h.id)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Remove Holding"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Weight and Rate */}
                  <div className="p-3 rounded-xl bg-black/30 border border-white/[0.05] grid grid-cols-2 gap-2 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase block">Total Weight</span>
                      <span className="text-gray-100 font-bold text-sm">{h.weightGrams}g</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase block">Current Rate/g</span>
                      <span className="text-amber-400 font-bold text-sm">₹{h.currentPricePerGram.toFixed(0)}</span>
                    </div>
                  </div>

                  {/* Financial Breakdown */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase block">Cost Basis</span>
                      <span className="text-gray-300 font-semibold">{formatCurrency(h.totalInvested, settings.currency)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-gray-500 uppercase block">Current Valuation</span>
                      <span className="text-amber-300 font-bold">{formatCurrency(h.currentValue, settings.currency)}</span>
                    </div>
                  </div>
                </div>

                {/* Profit/Loss Footer */}
                <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase block">Appreciation</span>
                    <span className={`font-bold ${h.profitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatCurrency(h.profitLoss, settings.currency)}
                    </span>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    h.returnPercent >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                  }`}>
                    {formatPercent(h.returnPercent)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="glass-card p-10 rounded-2xl text-center space-y-4 border border-white/[0.08]">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <Coins className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-100">No Gold Recorded in Vault</h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto mt-1">
                Keep track of physical gold bullion bars, jewelry, sovereign gold coins, or digital gold.
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all"
            >
              Add Your First Gold Holding
            </button>
          </div>
        )}
      </div>

      {/* Add Gold Holding Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card p-6 rounded-2xl border border-amber-500/40 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-100 flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-400" />
                Add Gold to Vault
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-200 text-xs font-mono"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleAddGold} className="space-y-3 text-xs">
              <div>
                <label className="text-gray-400 font-mono block mb-1">Holding Title / Description</label>
                <input
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. 24K Swiss Bullion Bar"
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.1] text-gray-100 focus:outline-none focus:border-amber-500/50"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 font-mono block mb-1">Category</label>
                  <select
                    value={addCategory}
                    onChange={(e) => setAddCategory(e.target.value as MetalCategory)}
                    className="w-full px-3 py-2 rounded-xl bg-[#111827] border border-white/[0.1] text-gray-100 focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="Bars">Bars (24K)</option>
                    <option value="Coins">Coins (24K)</option>
                    <option value="24K">24K Bullion</option>
                    <option value="22K">22K Standard</option>
                    <option value="Jewellery">Jewellery (22K/18K)</option>
                    <option value="Digital">Digital Gold</option>
                  </select>
                </div>

                <div>
                  <label className="text-gray-400 font-mono block mb-1">Weight (Grams)</label>
                  <input
                    type="number"
                    value={addWeight}
                    onChange={(e) => setAddWeight(e.target.value)}
                    step="0.1"
                    min="0.1"
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.1] text-gray-100 focus:outline-none focus:border-amber-500/50 font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-400 font-mono block mb-1">Purchase Rate per 10g (₹)</label>
                <input
                  type="number"
                  value={addPricePer10g}
                  onChange={(e) => setAddPricePer10g(e.target.value)}
                  step="10"
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.1] text-gray-100 focus:outline-none focus:border-amber-500/50 font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-gray-400 font-mono block mb-1">Location / Safe Notes</label>
                <input
                  type="text"
                  value={addNotes}
                  onChange={(e) => setAddNotes(e.target.value)}
                  placeholder="e.g. Bank Locker, Home Safe"
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.1] text-gray-100 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 font-mono flex justify-between">
                <span>Calculated Total Cost:</span>
                <span className="font-bold">
                  {formatCurrency(((parseFloat(addWeight) || 0) * (parseFloat(addPricePer10g) || 0)) / 10, settings.currency)}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addedSuccess}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-[0_0_15px_rgba(245,158,11,0.4)] transition-all flex items-center gap-1.5"
                >
                  {addedSuccess ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  <span>{addedSuccess ? 'Gold Stored!' : 'Save to Vault'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoldDashboard;
