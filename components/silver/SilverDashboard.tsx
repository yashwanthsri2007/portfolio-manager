import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Shield,
  Sparkles,
  Package,
  Scale,
  Gem,
  CircleDollarSign,
  Coins
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { usePortfolio } from '../../context/PortfolioContext';
import { getSilverLivePrice, calculateSilverHoldingValue } from '../../services/metalsService';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import GlassCard from '../common/GlassCard';
import AnimatedCounter from '../common/AnimatedCounter';
import EmptyState from '../common/EmptyState';
import { Holding, MetalPrice } from '../../types';

export interface SilverDashboardProps {
  onNavigate: (page: string) => void;
}

const SILVER_CATEGORIES = [
  { id: 'Coins', label: 'Silver Coins', icon: Coins, color: '#94A3B8' },
  { id: 'Bars', label: 'Silver Bars', icon: Package, color: '#64748B' },
  { id: 'Jewellery', label: 'Silver Jewellery', icon: Gem, color: '#CBD5E1' },
  { id: 'Digital', label: 'Digital Silver', icon: CircleDollarSign, color: '#475569' },
];

export const SilverDashboard: React.FC<SilverDashboardProps> = ({ onNavigate }) => {
  const { holdings, addHolding, deleteHolding } = usePortfolio();
  const [showAddForm, setShowAddForm] = useState(false);
  const [addCategory, setAddCategory] = useState<string>('Coins');
  const [addWeight, setAddWeight] = useState('');
  const [addPrice, setAddPrice] = useState('');

  const livePrice: MetalPrice = getSilverLivePrice();

  // Filter silver holdings
  const silverHoldings = useMemo(
    () => holdings.filter(h => h.assetType === 'silver'),
    [holdings]
  );

  // Compute total silver portfolio
  const silverSummary = useMemo(() => {
    let totalInvested = 0;
    let totalCurrent = 0;
    let totalWeightGrams = 0;
    const categoryBreakdown: Record<string, { weight: number; invested: number; current: number }> = {};

    silverHoldings.forEach(h => {
      const val = calculateSilverHoldingValue(h, livePrice);
      totalInvested += val.totalInvested;
      totalCurrent += val.currentValue;
      const cat = h.metalDetails?.metalCategory || 'Coins';
      const weight = h.metalDetails?.weightGrams || h.quantity;
      totalWeightGrams += weight;

      if (!categoryBreakdown[cat]) {
        categoryBreakdown[cat] = { weight: 0, invested: 0, current: 0 };
      }
      categoryBreakdown[cat].weight += weight;
      categoryBreakdown[cat].invested += val.totalInvested;
      categoryBreakdown[cat].current += val.currentValue;
    });

    const profitLoss = totalCurrent - totalInvested;
    const returnPercent = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;

    return {
      totalInvested,
      totalCurrent,
      profitLoss,
      returnPercent,
      totalWeightGrams,
      categoryBreakdown,
    };
  }, [silverHoldings, livePrice]);

  // Synthetic price chart data
  const priceChartData = useMemo(() => {
    const base = livePrice.pricePerGram;
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(
      (month, i) => ({
        month,
        price: Math.round(base * (0.88 + i * 0.012 + Math.sin(i * 0.7) * 0.03) * 100) / 100,
      })
    );
  }, [livePrice]);

  // Allocation donut data
  const allocationData = useMemo(() => {
    return Object.entries(silverSummary.categoryBreakdown).map(([cat, data]) => ({
      name: cat,
      value: data.current,
      color: SILVER_CATEGORIES.find(c => c.id === cat)?.color || '#64748B',
    }));
  }, [silverSummary.categoryBreakdown]);

  const handleAddSilver = () => {
    const weight = parseFloat(addWeight);
    const price = parseFloat(addPrice);
    if (!weight || !price) return;

    addHolding({
      assetType: 'silver',
      symbol: `SILVER-${addCategory.toUpperCase()}`,
      name: `Silver ${addCategory}`,
      quantity: weight,
      averagePrice: price,
      purchaseDate: new Date().toISOString().split('T')[0],
      metalDetails: {
        metalCategory: addCategory as any,
        weightGrams: weight,
      },
    });

    setAddWeight('');
    setAddPrice('');
    setShowAddForm(false);
  };

  const isPositive = livePrice.dayChangePercent >= 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-gray-400/20 to-gray-600/20 border border-gray-500/30 shadow-[0_0_25px_rgba(148,163,184,0.15)]">
              <ShieldCheck className="w-7 h-7 text-gray-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-200 via-gray-300 to-gray-400 bg-clip-text text-transparent">
                SILVER COMMAND CENTER
              </h1>
              <p className="text-xs text-gray-400 font-mono tracking-wider">
                PRECIOUS METALS PORTFOLIO • LIVE PRICING
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2.5 bg-gradient-to-r from-gray-500/20 to-gray-600/20 border border-gray-500/40 text-gray-200 rounded-xl text-sm font-semibold hover:border-gray-400 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(148,163,184,0.1)]"
        >
          <Plus className="w-4 h-4" />
          Add Silver Holding
        </button>
      </motion.div>

      {/* Live Price Display */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        {/* Price per Gram */}
        <GlassCard className="relative overflow-hidden border-gray-600/30">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gray-400/5 rounded-full -mr-8 -mt-8" />
          <p className="text-xs text-gray-400 font-mono mb-1">SILVER / GRAM</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono">
              <AnimatedCounter value={livePrice.pricePerGram} prefix="₹" decimals={2} />
            </span>
          </div>
          <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${
            isPositive ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {formatPercent(Math.abs(livePrice.dayChangePercent))} today
          </div>
        </GlassCard>

        {/* Price per KG */}
        <GlassCard className="border-gray-600/30">
          <p className="text-xs text-gray-400 font-mono mb-1">SILVER / KG</p>
          <p className="text-2xl font-bold text-white font-mono">
            <AnimatedCounter value={livePrice.pricePerKg || livePrice.pricePerGram * 1000} prefix="₹" decimals={0} />
          </p>
          <p className="text-xs text-gray-500 mt-2 font-mono">
            <Clock className="w-3 h-3 inline mr-1" />
            {livePrice.lastUpdated}
          </p>
        </GlassCard>

        {/* Monthly Change */}
        <GlassCard className="border-gray-600/30">
          <p className="text-xs text-gray-400 font-mono mb-1">30-DAY CHANGE</p>
          <p className={`text-2xl font-bold font-mono ${
            livePrice.monthlyChangePercent >= 0 ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {livePrice.monthlyChangePercent >= 0 ? '+' : ''}{formatPercent(livePrice.monthlyChangePercent)}
          </p>
          <div className="mt-2 h-1 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                livePrice.monthlyChangePercent >= 0 ? 'bg-emerald-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(Math.abs(livePrice.monthlyChangePercent) * 10, 100)}%` }}
            />
          </div>
        </GlassCard>

        {/* Yearly Change */}
        <GlassCard className="border-gray-600/30">
          <p className="text-xs text-gray-400 font-mono mb-1">1-YEAR CHANGE</p>
          <p className={`text-2xl font-bold font-mono ${
            livePrice.yearlyChangePercent >= 0 ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {livePrice.yearlyChangePercent >= 0 ? '+' : ''}{formatPercent(livePrice.yearlyChangePercent)}
          </p>
          <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
            <Shield className="w-3 h-3" />
            Safe Haven Asset
          </div>
        </GlassCard>
      </motion.div>

      {/* Portfolio Summary Cards */}
      {silverHoldings.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          <GlassCard>
            <p className="text-xs text-gray-400 font-mono mb-1">TOTAL INVESTED</p>
            <p className="text-xl font-bold text-white font-mono">
              <AnimatedCounter value={silverSummary.totalInvested} prefix="₹" />
            </p>
          </GlassCard>

          <GlassCard>
            <p className="text-xs text-gray-400 font-mono mb-1">CURRENT VALUE</p>
            <p className="text-xl font-bold text-white font-mono">
              <AnimatedCounter value={silverSummary.totalCurrent} prefix="₹" />
            </p>
          </GlassCard>

          <GlassCard>
            <p className="text-xs text-gray-400 font-mono mb-1">PROFIT / LOSS</p>
            <p className={`text-xl font-bold font-mono ${
              silverSummary.profitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {silverSummary.profitLoss >= 0 ? '+' : ''}{formatCurrency(silverSummary.profitLoss)}
            </p>
            <p className={`text-xs font-mono ${
              silverSummary.returnPercent >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}>
              ({formatPercent(silverSummary.returnPercent)})
            </p>
          </GlassCard>

          <GlassCard>
            <p className="text-xs text-gray-400 font-mono mb-1">TOTAL WEIGHT</p>
            <p className="text-xl font-bold text-white font-mono">
              <AnimatedCounter value={silverSummary.totalWeightGrams} suffix="g" decimals={1} />
            </p>
            <p className="text-xs text-gray-500 mt-1">
              ({(silverSummary.totalWeightGrams / 1000).toFixed(2)} kg)
            </p>
          </GlassCard>
        </motion.div>
      )}

      {/* Price Chart + Allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Price Chart */}
        <GlassCard className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-200 font-mono">SILVER PRICE TREND (12M)</h3>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Sparkles className="w-3 h-3" />
              INR / Gram
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={priceChartData}>
                <defs>
                  <linearGradient id="silverGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#94A3B8" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#94A3B8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 10 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 10 }}
                  domain={['dataMin - 2', 'dataMax + 2']}
                  tickFormatter={(v: number) => `₹${v}`}
                />
                <Tooltip
                  contentStyle={{
                    background: '#1E293B',
                    border: '1px solid rgba(148,163,184,0.3)',
                    borderRadius: '12px',
                    color: '#F3F4F6',
                    fontSize: '12px',
                  }}
                  formatter={(value: any) => [`₹${Number(value || 0).toFixed(2)}`, 'Price']}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#94A3B8"
                  strokeWidth={2}
                  fill="url(#silverGradient)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#94A3B8', stroke: '#0B0F17', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Category Allocation */}
        <GlassCard>
          <h3 className="text-sm font-semibold text-gray-200 font-mono mb-4">CATEGORY ALLOCATION</h3>
          {allocationData.length > 0 ? (
            <>
              <div className="h-40 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={allocationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      dataKey="value"
                      stroke="none"
                    >
                      {allocationData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: '#1E293B',
                        border: '1px solid rgba(148,163,184,0.3)',
                        borderRadius: '8px',
                        color: '#F3F4F6',
                        fontSize: '11px',
                      }}
                      formatter={(value: any) => [formatCurrency(Number(value || 0)), 'Value']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-2">
                {allocationData.map((cat) => (
                  <div key={cat.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-gray-300">{cat.name}</span>
                    </div>
                    <span className="text-gray-400 font-mono">{formatCurrency(cat.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-40 flex items-center justify-center text-gray-500 text-sm">
              No silver holdings yet
            </div>
          )}
        </GlassCard>
      </div>

      {/* Holdings Table */}
      {silverHoldings.length > 0 ? (
        <GlassCard>
          <h3 className="text-sm font-semibold text-gray-200 font-mono mb-4">
            SILVER HOLDINGS ({silverHoldings.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 font-mono uppercase border-b border-gray-800/60">
                  <th className="text-left py-2 px-3">Category</th>
                  <th className="text-right py-2 px-3">Weight (g)</th>
                  <th className="text-right py-2 px-3">Buy Price</th>
                  <th className="text-right py-2 px-3">Current Value</th>
                  <th className="text-right py-2 px-3">P&L</th>
                  <th className="text-right py-2 px-3">Return</th>
                  <th className="text-center py-2 px-3">Date</th>
                  <th className="text-center py-2 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {silverHoldings.map((h) => {
                  const val = calculateSilverHoldingValue(h, livePrice);
                  const ret = val.totalInvested > 0
                    ? ((val.currentValue - val.totalInvested) / val.totalInvested) * 100
                    : 0;
                  const cat = h.metalDetails?.metalCategory || 'Coins';
                  const catConfig = SILVER_CATEGORIES.find(c => c.id === cat);
                  const CatIcon = catConfig?.icon || Coins;

                  return (
                    <tr key={h.id} className="border-b border-gray-800/30 hover:bg-gray-800/20 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${catConfig?.color || '#64748B'}20` }}>
                            <CatIcon className="w-3.5 h-3.5" style={{ color: catConfig?.color }} />
                          </div>
                          <span className="text-gray-200">{cat}</span>
                        </div>
                      </td>
                      <td className="text-right py-3 px-3 font-mono text-gray-200">
                        {(h.metalDetails?.weightGrams || h.quantity).toFixed(1)}g
                      </td>
                      <td className="text-right py-3 px-3 font-mono text-gray-400">
                        {formatCurrency(h.averagePrice)}/g
                      </td>
                      <td className="text-right py-3 px-3 font-mono text-white font-semibold">
                        {formatCurrency(val.currentValue)}
                      </td>
                      <td className={`text-right py-3 px-3 font-mono font-semibold ${
                        val.profitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {val.profitLoss >= 0 ? '+' : ''}{formatCurrency(val.profitLoss)}
                      </td>
                      <td className={`text-right py-3 px-3 font-mono text-xs ${
                        ret >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {ret >= 0 ? '+' : ''}{formatPercent(ret)}
                      </td>
                      <td className="text-center py-3 px-3 text-xs text-gray-500 font-mono">
                        {h.purchaseDate}
                      </td>
                      <td className="text-center py-3 px-3">
                        <button
                          onClick={() => deleteHolding(h.id)}
                          className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      ) : (
        <EmptyState
          icon={ShieldCheck}
          title="No silver holdings"
          message="Add your silver coins, bars, or jewellery to track their value against live market prices."
          actionLabel="Add Silver Holding"
          onAction={() => setShowAddForm(true)}
        />
      )}

      {/* Add Silver Form Modal */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowAddForm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#151C2B] border border-gray-700/60 rounded-2xl p-6 w-full max-w-md space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-gray-200 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-gray-400" />
                Add Silver Holding
              </h3>

              {/* Category Selection */}
              <div>
                <label className="text-xs text-gray-400 font-mono mb-2 block">CATEGORY</label>
                <div className="grid grid-cols-2 gap-2">
                  {SILVER_CATEGORIES.map(cat => {
                    const CatIcon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setAddCategory(cat.id)}
                        className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition-all ${
                          addCategory === cat.id
                            ? 'bg-gray-500/20 border-gray-400/50 text-gray-200'
                            : 'bg-gray-800/40 border-gray-700/40 text-gray-400 hover:border-gray-600'
                        }`}
                      >
                        <CatIcon className="w-4 h-4" style={{ color: cat.color }} />
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Weight Input */}
              <div>
                <label className="text-xs text-gray-400 font-mono mb-1 block">WEIGHT (GRAMS)</label>
                <input
                  type="number"
                  value={addWeight}
                  onChange={(e) => setAddWeight(e.target.value)}
                  placeholder="e.g. 100"
                  className="w-full px-3 py-2.5 bg-gray-800/60 border border-gray-700/60 rounded-xl text-sm text-gray-200 focus:outline-none focus:border-gray-400/50 font-mono"
                />
              </div>

              {/* Purchase Price */}
              <div>
                <label className="text-xs text-gray-400 font-mono mb-1 block">PURCHASE PRICE (₹/gram)</label>
                <input
                  type="number"
                  value={addPrice}
                  onChange={(e) => setAddPrice(e.target.value)}
                  placeholder={`Current: ₹${livePrice.pricePerGram.toFixed(2)}`}
                  className="w-full px-3 py-2.5 bg-gray-800/60 border border-gray-700/60 rounded-xl text-sm text-gray-200 focus:outline-none focus:border-gray-400/50 font-mono"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-800/60 text-gray-400 hover:text-gray-200 text-sm font-medium border border-gray-700/40 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSilver}
                  disabled={!addWeight || !addPrice}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-gray-500/30 to-gray-600/30 border border-gray-400/40 text-gray-200 text-sm font-semibold hover:border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Holding
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SilverDashboard;
