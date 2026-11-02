import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  DollarSign, 
  ShieldCheck, 
  Plus, 
  Upload, 
  Bot, 
  ArrowUpRight, 
  ArrowDownRight, 
  BookOpen,
  Sparkles
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { usePortfolio } from '../../context/PortfolioContext';
import { formatCurrency, formatPercent } from '../../utils/formatters';

export interface OverviewDashboardProps {
  onNavigate: (tab: string) => void;
  onOpenAddHolding: () => void;
  onOpenCSVImport: () => void;
  onOpenCashModal?: () => void;
  onOpenSetupModal?: () => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  onNavigate,
  onOpenAddHolding,
  onOpenCSVImport,
  onOpenCashModal,
  onOpenSetupModal
}) => {
  const { user } = useAuth();
  const { metrics, holdings, transactions, cashBalance } = usePortfolio();

  // Dynamic time-based greeting
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12
    ? 'Good morning'
    : currentHour < 17
    ? 'Good afternoon'
    : 'Good evening';

  // Compute monthly growth curve from actual recorded transaction history
  const historicalGrowth = React.useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthIdx = new Date().getMonth();
    
    // Last 6 months
    const points = [];
    for (let i = 5; i >= 0; i--) {
      const targetMonthIdx = (currentMonthIdx - i + 12) % 12;
      const monthLabel = monthNames[targetMonthIdx];

      // If transactions exist, accumulate up to this month
      if (transactions.length > 0) {
        let cumulativeVal = 0;
        transactions.forEach(t => {
          const tDate = new Date(t.date);
          if (tDate.getMonth() <= targetMonthIdx) {
            if (t.type === 'DEPOSIT') cumulativeVal += t.totalValue;
            else if (t.type === 'WITHDRAWAL') cumulativeVal -= t.totalValue;
            else if (t.type === 'SELL') cumulativeVal += (t.realizedPnL || 0);
          }
        });
        // Scale to current net worth for final point
        const val = i === 0 ? metrics.totalNetWorth : Math.max(0, cumulativeVal);
        points.push({ month: monthLabel, value: val });
      } else {
        points.push({ month: monthLabel, value: metrics.totalNetWorth });
      }
    }
    return points;
  }, [transactions, metrics.totalNetWorth]);

  const isEmptyPortfolio = holdings.length === 0 && cashBalance === 0;

  return (
    <div className="space-y-6 pb-10">
      {/* Header Welcome & Primary Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-100 flex items-center gap-2">
            {greeting},{' '}
            <span className="bg-gradient-to-r from-cyan-400 via-white to-violet-300 bg-clip-text text-transparent">
              {user.name || 'Yashwanth'}
            </span>
          </h1>
          <p className="text-xs text-gray-400 font-mono">
            {isEmptyPortfolio
              ? 'Your portfolio is ready for setup. Start by adding cash or recording your investments.'
              : 'Real-time portfolio valuation, cash balance & investment ledgers.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {onOpenSetupModal && (
            <button
              onClick={onOpenSetupModal}
              className="px-3.5 py-2 rounded-xl bg-gray-800/80 hover:bg-gray-800 text-cyan-300 border border-cyan-500/40 text-xs font-semibold transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Portfolio Setup</span>
            </button>
          )}

          {onOpenCashModal && (
            <button
              onClick={onOpenCashModal}
              className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition-all flex items-center gap-1.5"
            >
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span>Manage Cash</span>
            </button>
          )}

          <button
            onClick={onOpenAddHolding}
            className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Holding</span>
          </button>

          <button
            onClick={() => onNavigate('ledger')}
            className="px-3.5 py-2 rounded-xl bg-violet-600/30 hover:bg-violet-600/50 text-violet-300 border border-violet-500/40 text-xs font-semibold transition-all flex items-center gap-1.5"
          >
            <BookOpen className="w-4 h-4" />
            <span>Ledger</span>
          </button>

          <button
            onClick={onOpenCSVImport}
            className="px-3.5 py-2 rounded-xl bg-gray-800/80 hover:bg-gray-800 text-gray-300 border border-gray-700 text-xs font-semibold transition-all flex items-center gap-1.5"
          >
            <Upload className="w-4 h-4" />
            <span>Import CSV</span>
          </button>
        </div>
      </div>

      {/* First Time / Empty State Banner */}
      {isEmptyPortfolio && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-cyan-950/40 via-gray-900/80 to-violet-950/40 border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.1)] flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              Welcome to Portfolio Manager, {user.name || 'Yashwanth'}!
            </h2>
            <p className="text-xs text-gray-400 max-w-xl leading-relaxed">
              All demo figures have been removed. Your net worth and performance are calculated exclusively from your actual investments and liquid cash. Set your starting cash balance or record your first asset to begin tracking.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {onOpenSetupModal && (
              <button
                onClick={onOpenSetupModal}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg hover:brightness-110 transition-all"
              >
                Launch Setup Wizard
              </button>
            )}
            {onOpenCashModal && (
              <button
                onClick={onOpenCashModal}
                className="px-4 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold text-xs transition-all hover:bg-emerald-500/30"
              >
                Deposit Cash
              </button>
            )}
          </div>
        </div>
      )}

      {/* HERO SECTION: TOTAL NET WORTH */}
      <div className="glass-card border-cyan-500/30 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.15)]">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          {/* Left Net Worth Badge with Glowing Ring */}
          <div className="space-y-4 lg:col-span-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-xs font-mono text-cyan-400 tracking-widest uppercase">
                TOTAL NET WORTH (LIQUID + ASSETS)
              </span>
            </div>

            <div className="relative inline-block">
              <div className="text-3xl md:text-5xl font-black text-white tracking-tight glow-text-cyan font-mono">
                {formatCurrency(metrics.totalNetWorth)}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                metrics.todayProfitLoss >= 0
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-red-500/15 text-red-400 border border-red-500/30'
              }`}>
                {metrics.todayProfitLoss >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                <span>{formatCurrency(metrics.todayProfitLoss)} today</span>
                <span>({formatPercent(metrics.todayReturnPercent)})</span>
              </div>
            </div>

            <p className="text-xs text-gray-400">
              {metrics.totalProfitLoss !== 0 ? (
                <>
                  Net portfolio P&L:{' '}
                  <strong className={metrics.totalProfitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                    {metrics.totalProfitLoss >= 0 ? '+' : ''}{formatCurrency(metrics.totalProfitLoss)}
                  </strong>{' '}
                  ({formatPercent(metrics.totalReturnPercent)})
                </>
              ) : (
                'No recorded gains or losses yet.'
              )}
            </p>
          </div>

          {/* Right Line Chart */}
          <div className="lg:col-span-2 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historicalGrowth}>
                <defs>
                  <linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#4B5563" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis hide domain={['dataMin - 1000', 'dataMax + 1000']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#06B6D4', borderRadius: '12px', fontSize: '12px' }}
                  formatter={(value: any) => [formatCurrency(Number(value)), 'Net Worth']}
                />
                <Area type="monotone" dataKey="value" stroke="#06B6D4" strokeWidth={3} fillOpacity={1} fill="url(#netWorthGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* FOUR ACCURATE FINANCIAL KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* AVAILABLE CASH */}
        <div className="glass-card glass-card-hover rounded-2xl p-5 border-gray-800">
          <div className="flex items-center justify-between text-xs font-mono text-gray-400 mb-2">
            <span>AVAILABLE CASH</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {formatCurrency(metrics.availableCash)}
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-gray-400 font-mono">
            <span>Uninvested Liquidity</span>
            {onOpenCashModal && (
              <button onClick={onOpenCashModal} className="text-emerald-400 hover:underline">
                Deposit / Withdraw →
              </button>
            )}
          </div>
        </div>

        {/* HOLDINGS MARKET VALUE */}
        <div className="glass-card glass-card-hover rounded-2xl p-5 border-gray-800">
          <div className="flex items-center justify-between text-xs font-mono text-gray-400 mb-2">
            <span>HOLDINGS VALUATION</span>
            <DollarSign className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {formatCurrency(metrics.holdingsValue)}
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-gray-400 font-mono">
            <span>Cost: {formatCurrency(metrics.totalInvested)}</span>
            <span className="text-cyan-400 font-semibold">{holdings.length} Assets</span>
          </div>
        </div>

        {/* UNREALIZED P&L */}
        <div className="glass-card glass-card-hover rounded-2xl p-5 border-gray-800">
          <div className="flex items-center justify-between text-xs font-mono text-gray-400 mb-2">
            <span>UNREALIZED P&L</span>
            {metrics.unrealizedProfitLoss >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400" />
            )}
          </div>
          <div className={`text-xl font-bold font-mono ${
            metrics.unrealizedProfitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {metrics.unrealizedProfitLoss >= 0 ? '+' : ''}{formatCurrency(metrics.unrealizedProfitLoss)}
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] font-mono">
            <span className="text-gray-400">Open Positions</span>
            <span className={`font-bold ${metrics.unrealizedProfitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatPercent(metrics.totalReturnPercent)}
            </span>
          </div>
        </div>

        {/* REALIZED P&L */}
        <div className="glass-card glass-card-hover rounded-2xl p-5 border-gray-800">
          <div className="flex items-center justify-between text-xs font-mono text-gray-400 mb-2">
            <span>REALIZED P&L</span>
            <BookOpen className="w-4 h-4 text-violet-400" />
          </div>
          <div className={`text-xl font-bold font-mono ${
            metrics.realizedProfitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {metrics.realizedProfitLoss >= 0 ? '+' : ''}{formatCurrency(metrics.realizedProfitLoss)}
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] font-mono">
            <span className="text-gray-400">Closed Sales</span>
            <button onClick={() => onNavigate('ledger')} className="text-violet-400 hover:underline">
              Ledger Audit →
            </button>
          </div>
        </div>
      </div>

      {/* ALLOCATION VISUALIZATION & DIVERSIFICATION HEALTH SCORE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donut Allocation Visualizer */}
        <div className="lg:col-span-2 glass-card rounded-3xl p-6 border-gray-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-100">Asset Allocation</h2>
              <p className="text-xs text-gray-400">Distribution across Cash, Stocks, Mutual Funds, Gold & Silver</p>
            </div>
            <button
              onClick={() => onNavigate('analytics')}
              className="text-xs text-cyan-400 hover:underline font-mono"
            >
              View Analytics →
            </button>
          </div>

          {metrics.assetAllocation.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="h-60 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metrics.assetAllocation}
                      dataKey="amount"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={4}
                    >
                      {metrics.assetAllocation.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#0B0F17" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '10px' }}
                      formatter={(val: any) => [formatCurrency(Number(val)), 'Value']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Category breakdown table */}
              <div className="space-y-3">
                {metrics.assetAllocation.map((item) => (
                  <div key={item.category} className="p-2.5 rounded-xl bg-gray-900/60 border border-gray-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <div>
                        <p className="text-xs font-semibold text-gray-200">{item.category}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{item.percentage.toFixed(1)}% Allocation</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-gray-100 font-mono">{formatCurrency(item.amount)}</p>
                      <p className={`text-[10px] font-bold font-mono ${item.profitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {item.category === 'Cash' ? 'Liquid' : formatPercent(item.returnPercent)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-gray-500 text-xs font-mono">
              No assets or cash recorded yet. Use Add Holding or Deposit Cash above.
            </div>
          )}
        </div>

        {/* Portfolio Health & Diversification Risk Meter */}
        <div className="glass-card rounded-3xl p-6 border-gray-800 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-100">Portfolio Health</h2>
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
            </div>

            {/* Score Circular Meter */}
            <div className="text-center py-4 space-y-2">
              <div className="inline-flex items-center justify-center w-28 h-28 rounded-full border-4 border-cyan-500/30 bg-cyan-500/5 glow-ring-cyan">
                <span className="text-3xl font-black text-cyan-300 glow-text-cyan font-mono">
                  {metrics.diversificationScore}
                </span>
                <span className="text-xs text-gray-500 font-mono">/100</span>
              </div>

              <p className="text-xs font-semibold text-cyan-400 uppercase tracking-widest pt-2">
                {metrics.diversificationScore >= 70
                  ? 'HEALTHY & DIVERSIFIED'
                  : metrics.diversificationScore > 0
                  ? 'MODERATE CONCENTRATION'
                  : 'AWAITING HOLDINGS'}
              </p>
              <p className="text-xs text-gray-400 px-2">
                Calculated dynamically from your actual active holding distribution and liquid cash buffer.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-800 space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-gray-400">Top Holding:</span>
              <span className="text-white font-bold">
                {holdings.length > 0 ? holdings[0].symbol : 'None'}
              </span>
            </div>
            <div className="flex justify-between text-xs font-mono">
              <span className="text-gray-400">Max Asset Weight:</span>
              <span className="text-cyan-400 font-bold">
                {metrics.concentrationRisk[0] ? `${metrics.concentrationRisk[0].weight.toFixed(1)}%` : '0%'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
