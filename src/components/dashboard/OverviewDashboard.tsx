import React, { useMemo } from 'react';
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
  Sparkles,
  Sunrise,
  Coins,
  AlertTriangle,
  Globe,
  Radio,
  Layers,
  Target,
  Share2
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { usePortfolio } from '../../context/PortfolioContext';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { getStoredAngelOneSession } from '../../services/angelOneService';
import { evaluatePortfolioRiskAlerts } from '../../services/alertService';
import { INDIAN_INDICES } from '../../services/indianMarketService';
import { RiskAlertsPanel } from '../ai/RiskAlertsPanel';

export interface OverviewDashboardProps {
  onNavigate: (tab: string, data?: any) => void;
  onOpenAddHolding: () => void;
  onOpenCSVImport: () => void;
  onOpenCashModal?: () => void;
  onOpenSetupModal?: () => void;
  onOpenAngelOne?: () => void;
  onOpenBriefing?: () => void;
  onOpenSnapshot?: () => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  onNavigate,
  onOpenAddHolding,
  onOpenCSVImport,
  onOpenCashModal,
  onOpenSetupModal,
  onOpenAngelOne,
  onOpenBriefing,
  onOpenSnapshot
}) => {
  const { user } = useAuth();
  const { metrics, holdings, transactions, cashBalance } = usePortfolio();

  // Active Angel One broker session
  const aoSession = useMemo(() => getStoredAngelOneSession(), []);

  // Risk Alerts
  const riskAlerts = useMemo(() => evaluatePortfolioRiskAlerts(metrics, holdings), [metrics, holdings]);

  // Crypto holdings breakdown
  const cryptoHoldings = useMemo(() => holdings.filter(h => h.assetType === 'crypto'), [holdings]);
  const cryptoTotalVal = useMemo(() => {
    return cryptoHoldings.reduce((sum, h) => sum + h.quantity * (h.currentPrice || h.averagePrice), 0);
  }, [cryptoHoldings]);

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
          {onOpenBriefing && (
            <button
              onClick={onOpenBriefing}
              className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
            >
              <Sunrise className="w-4 h-4 text-amber-400" />
              <span>Daily Briefing</span>
            </button>
          )}

          {onOpenAngelOne && (
            <button
              onClick={onOpenAngelOne}
              className="px-3.5 py-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-xs font-semibold transition-all flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>{aoSession ? 'Angel One Synced' : 'Connect Angel One'}</span>
              {aoSession && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5"></span>}
            </button>
          )}

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

          {onOpenSnapshot && (
            <button
              onClick={onOpenSnapshot}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-violet-600/20 hover:from-cyan-500/30 hover:to-violet-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
              title="Shareable Snapshot Card"
            >
              <Share2 className="w-4 h-4 text-cyan-400" />
              <span>Snapshot Card</span>
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

      {/* Live Market Ticker Ribbon */}
      <div className="overflow-x-auto py-2 px-1 scrollbar-none flex items-center gap-3 border-y border-gray-800/60 bg-[#0B0F17]/40">
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-cyan-400 shrink-0 pr-2 border-r border-gray-800">
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          <span>INDIAN MARKETS</span>
        </div>
        {INDIAN_INDICES.map((idx) => (
          <div
            key={idx.symbol}
            className="flex items-center gap-2 text-xs font-mono shrink-0 px-3 py-1 rounded-lg bg-gray-900/60 border border-gray-800/80"
          >
            <span className="font-bold text-gray-200">{idx.symbol}:</span>
            <span className="text-white font-semibold">{idx.price.toLocaleString('en-IN')}</span>
            <span className={`text-[10px] font-bold ${idx.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {idx.change >= 0 ? '+' : ''}{idx.changePercent}%
            </span>
          </div>
        ))}
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

      {/* PORTFOLIO RISK RADAR BANNER */}
      {riskAlerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'WARNING').length > 0 && (
        <div className="p-3.5 rounded-2xl bg-amber-950/25 border border-amber-500/30 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-bold text-amber-300 font-mono shrink-0">RISK RADAR:</span>
            <span className="text-gray-300 truncate">
              {riskAlerts[0]?.title}: {riskAlerts[0]?.description}
            </span>
          </div>
          {riskAlerts[0]?.actionTab && (
            <button
              onClick={() => onNavigate(riskAlerts[0].actionTab!)}
              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-mono text-[11px] shrink-0 font-semibold"
            >
              {riskAlerts[0]?.actionLabel || 'Inspect'} →
            </button>
          )}
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

      {/* SMART INTEGRATION & INTELLIGENCE DECK */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Angel One SmartAPI Card */}
        <div
          onClick={onOpenAngelOne}
          className="p-4 rounded-2xl bg-indigo-950/20 hover:bg-indigo-950/30 border border-indigo-500/30 cursor-pointer transition-all flex flex-col justify-between space-y-3 group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-indigo-300">Angel One SmartAPI</span>
            </div>
            <span className={`w-2 h-2 rounded-full ${aoSession ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`} />
          </div>
          <div>
            <div className="text-sm font-bold text-white">
              {aoSession ? `Client ${aoSession.clientCode}` : 'Not Connected'}
            </div>
            <p className="text-[11px] text-gray-400 font-mono mt-0.5">
              {aoSession ? 'Live delivery sync active' : 'Click to import delivery holdings'}
            </p>
          </div>
          <div className="text-[11px] text-indigo-400 group-hover:underline flex items-center gap-1 font-mono">
            <span>{aoSession ? 'Manage Sync' : 'Connect Account'}</span>
            <span>→</span>
          </div>
        </div>

        {/* 2. Crypto Assets Card */}
        <div
          onClick={() => onNavigate('crypto')}
          className="p-4 rounded-2xl bg-amber-950/20 hover:bg-amber-950/30 border border-amber-500/30 cursor-pointer transition-all flex flex-col justify-between space-y-3 group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-amber-300">Crypto Assets</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">LIVE</span>
          </div>
          <div>
            <div className="text-sm font-bold text-white">
              {formatCurrency(cryptoTotalVal)}
            </div>
            <p className="text-[11px] text-gray-400 font-mono mt-0.5">
              {cryptoHoldings.length > 0 ? `${cryptoHoldings.length} tracked tokens` : 'Spot INR rates & holdings'}
            </p>
          </div>
          <div className="text-[11px] text-amber-400 group-hover:underline flex items-center gap-1 font-mono">
            <span>Crypto Terminal</span>
            <span>→</span>
          </div>
        </div>

        {/* 3. Daily Market Briefing Card */}
        <div
          onClick={onOpenBriefing}
          className="p-4 rounded-2xl bg-cyan-950/20 hover:bg-cyan-950/30 border border-cyan-500/30 cursor-pointer transition-all flex flex-col justify-between space-y-3 group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sunrise className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-cyan-300">Morning Briefing</span>
            </div>
            <span className="text-[10px] font-mono text-cyan-400">AUDIO READY</span>
          </div>
          <div>
            <div className="text-sm font-bold text-white">
              GIFT Nifty +82 pts
            </div>
            <p className="text-[11px] text-gray-400 font-mono mt-0.5">
              US markets, crude & holding radar
            </p>
          </div>
          <div className="text-[11px] text-cyan-400 group-hover:underline flex items-center gap-1 font-mono">
            <span>Listen / View Briefing</span>
            <span>→</span>
          </div>
        </div>

        {/* 4. Multi-AI Committee Card */}
        <div
          onClick={() => onNavigate('ai_advisor')}
          className="p-4 rounded-2xl bg-violet-950/20 hover:bg-violet-950/30 border border-violet-500/30 cursor-pointer transition-all flex flex-col justify-between space-y-3 group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-violet-400" />
              <span className="text-xs font-bold text-violet-300">Multi-AI Advisor</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300">4 MODELS</span>
          </div>
          <div>
            <div className="text-sm font-bold text-white">
              Gemini • NIM • Groq
            </div>
            <p className="text-[11px] text-gray-400 font-mono mt-0.5">
              Debate committee & auto fallback
            </p>
          </div>
          <div className="text-[11px] text-violet-400 group-hover:underline flex items-center gap-1 font-mono">
            <span>Ask Committee</span>
            <span>→</span>
          </div>
        </div>

        {/* 5. Swing & Position Trade Research Engine */}
        <div
          onClick={() => onNavigate('swing_research')}
          className="p-4 rounded-2xl bg-cyan-950/25 hover:bg-cyan-950/40 border border-cyan-500/40 cursor-pointer transition-all flex flex-col justify-between space-y-3 group shadow-lg shadow-cyan-950/30"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-cyan-300">Swing Research</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">4-12W</span>
          </div>
          <div>
            <div className="text-sm font-bold text-white">
              TCS • Score 91/100
            </div>
            <p className="text-[11px] text-gray-400 font-mono mt-0.5">
              Breakout setup • R:R 1:2.8
            </p>
          </div>
          <div className="text-[11px] text-cyan-400 group-hover:underline flex items-center gap-1 font-mono">
            <span>Explore Setups</span>
            <span>→</span>
          </div>
        </div>
      </div>

      {/* AI Risk Alerts Panel */}
      <RiskAlertsPanel onNavigate={onNavigate} compact={true} />

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
        <div
          onClick={() => onNavigate('health')}
          className="glass-card rounded-3xl p-6 border-gray-800 flex flex-col justify-between space-y-4 cursor-pointer hover:border-cyan-500/40 transition-all group"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-100 group-hover:text-cyan-300 transition-colors">
                  Portfolio Health
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400">
                  VIEW REPORT →
                </span>
              </div>
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
