// src/components/research/SwingResearchPage.tsx
// Institutional-Style Swing & Position Trade Research Engine (4-12 weeks / 1-3 months)
// Indian NSE/BSE Equities Decision-Support System for Yashwanth

import React, { useState, useMemo, useEffect } from 'react';
import {
  Target,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Sliders,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  Sparkles,
  PieChart as PieIcon,
  BarChart3,
  Search,
  ExternalLink,
  ChevronRight,
  Info,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Award,
  Zap,
  Bookmark,
  Plus,
  X,
  FileText,
  Activity,
  Compass
} from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext';
import { useAuth } from '../../context/AuthContext';
import {
  SWING_CANDIDATES_UNIVERSE,
  getMarketContext,
  calculatePositionSize,
  loadPaperTrades,
  savePaperTrades,
  addPaperTrade,
  closePaperTrade,
  SWING_STRATEGY_BACKTEST,
  type SwingCandidate,
  type SetupType,
  type TradeReadiness,
  type PaperTrade,
  type PositionSizingResult
} from '../../services/swingResearchService';
import { loadMultiAISettings, executeAutoFallbackChat } from '../../services/multiAiService';
import { formatCurrency, formatPercent } from '../../utils/formatters';

export interface SwingResearchPageProps {
  onNavigate: (page: string, data?: any) => void;
}

type TabType = 'scanner' | 'dossier' | 'rotation' | 'sizer' | 'papertrade' | 'backtest';

export const SwingResearchPage: React.FC<SwingResearchPageProps> = ({ onNavigate }) => {
  const { holdings, metrics } = usePortfolio();
  const { user } = useAuth();
  const userName = user.name || 'Yashwanth';

  // Navigation & Active Tab
  const [activeTab, setActiveTab] = useState<TabType>('scanner');

  // Candidate Data State
  const [candidates] = useState<SwingCandidate[]>(SWING_CANDIDATES_UNIVERSE);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(SWING_CANDIDATES_UNIVERSE[0].id);

  // Scanner Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSetup, setFilterSetup] = useState<SetupType | 'ALL'>('ALL');
  const [filterReadiness, setFilterReadiness] = useState<TradeReadiness | 'ALL'>('ALL');
  const [filterSector, setFilterSector] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'score' | 'rr' | 'dayChange' | 'rs'>('score');

  // Position Sizer State
  const [sizerCandidateId, setSizerCandidateId] = useState<string>(SWING_CANDIDATES_UNIVERSE[0].id);
  const [sizerCapital, setSizerCapital] = useState<number>(metrics.totalNetWorth > 0 ? Math.round(metrics.totalNetWorth) : 500000);
  const [sizerRiskPercent, setSizerRiskPercent] = useState<number>(1.5);
  const [sizerEntryOverride, setSizerEntryOverride] = useState<number | null>(null);
  const [sizerStopOverride, setSizerStopOverride] = useState<number | null>(null);

  // Paper Trades State
  const [paperTrades, setPaperTrades] = useState<PaperTrade[]>([]);
  const [isPaperTradeModalOpen, setIsPaperTradeModalOpen] = useState(false);
  const [tradeToClose, setTradeToClose] = useState<PaperTrade | null>(null);
  const [closeExitPrice, setCloseExitPrice] = useState<string>('');
  const [closeExitNotes, setCloseExitNotes] = useState<string>('');

  // AI Institutional Memo State
  const [isGeneratingMemo, setIsGeneratingMemo] = useState(false);
  const [aiMemo, setAiMemo] = useState<string | null>(null);
  const [aiMemoProvider, setAiMemoProvider] = useState<string>('');

  // Market Context
  const marketContext = useMemo(() => getMarketContext(), []);

  // Initialize paper trades from localStorage
  useEffect(() => {
    setPaperTrades(loadPaperTrades());
  }, []);

  // Currently selected candidate for deep-dive dossier
  const activeCandidate = useMemo(() => {
    return candidates.find(c => c.id === selectedCandidateId) || candidates[0];
  }, [candidates, selectedCandidateId]);

  // Candidate for position sizer
  const sizerCandidate = useMemo(() => {
    return candidates.find(c => c.id === sizerCandidateId) || candidates[0];
  }, [candidates, sizerCandidateId]);

  // Calculate position sizing
  const sizingResult: PositionSizingResult = useMemo(() => {
    const entry = sizerEntryOverride !== null ? sizerEntryOverride : sizerCandidate.currentPrice;
    const stop = sizerStopOverride !== null ? sizerStopOverride : sizerCandidate.plan.stopLoss;
    return calculatePositionSize(
      entry,
      stop,
      sizerCapital,
      sizerRiskPercent,
      sizerCandidate.sector,
      holdings
    );
  }, [sizerCandidate, sizerEntryOverride, sizerStopOverride, sizerCapital, sizerRiskPercent, holdings]);

  // Unique sectors for filter dropdown
  const uniqueSectors = useMemo(() => {
    const set = new Set(candidates.map(c => c.sector));
    return Array.from(set);
  }, [candidates]);

  // Filtered & Sorted Candidates for Scanner
  const filteredCandidates = useMemo(() => {
    return candidates
      .filter(c => {
        const matchesSearch =
          c.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.sector.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSetup = filterSetup === 'ALL' || c.plan.setupType === filterSetup;
        const matchesReadiness = filterReadiness === 'ALL' || c.plan.readiness === filterReadiness;
        const matchesSector = filterSector === 'ALL' || c.sector === filterSector;
        return matchesSearch && matchesSetup && matchesReadiness && matchesSector;
      })
      .sort((a, b) => {
        if (sortBy === 'score') return b.scoring.compositeScore - a.scoring.compositeScore;
        if (sortBy === 'rr') return b.plan.riskRewardRatio - a.plan.riskRewardRatio;
        if (sortBy === 'dayChange') return b.dayChangePercent - a.dayChangePercent;
        if (sortBy === 'rs') return b.technicals.rsVsNifty3M - a.technicals.rsVsNifty3M;
        return 0;
      });
  }, [candidates, searchQuery, filterSetup, filterReadiness, filterSector, sortBy]);

  // Quick action: Open candidate dossier
  const handleOpenDossier = (candidateId: string) => {
    setSelectedCandidateId(candidateId);
    setAiMemo(null); // Reset cached memo for new candidate
    setActiveTab('dossier');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Quick action: Open candidate in position sizer
  const handleOpenSizer = (candidateId: string) => {
    setSizerCandidateId(candidateId);
    setSizerEntryOverride(null);
    setSizerStopOverride(null);
    setActiveTab('sizer');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Quick action: Add candidate to paper trading
  const handleQuickPaperTrade = (candidate: SwingCandidate) => {
    const entry = candidate.currentPrice;
    const res = calculatePositionSize(entry, candidate.plan.stopLoss, sizerCapital, 1.5, candidate.sector, holdings);
    const newTrade = addPaperTrade(candidate, entry, res.recommendedShares, `Automated entry: ${candidate.plan.rationale}`);
    setPaperTrades(loadPaperTrades());
    setActiveTab('papertrade');
  };

  // Execute Paper Trade from Sizer
  const handleExecutePaperFromSizer = () => {
    const entry = sizerEntryOverride !== null ? sizerEntryOverride : sizerCandidate.currentPrice;
    addPaperTrade(
      sizerCandidate,
      entry,
      sizingResult.recommendedShares,
      `Calculated in Position Sizer: Risk ${sizerRiskPercent}% of ₹${sizerCapital.toLocaleString('en-IN')}`
    );
    setPaperTrades(loadPaperTrades());
    setActiveTab('papertrade');
  };

  // Handle closing paper trade
  const handleConfirmCloseTrade = () => {
    if (!tradeToClose) return;
    const price = parseFloat(closeExitPrice);
    if (isNaN(price) || price <= 0) return;
    closePaperTrade(tradeToClose.id, price, closeExitNotes);
    setPaperTrades(loadPaperTrades());
    setTradeToClose(null);
    setCloseExitPrice('');
    setCloseExitNotes('');
  };

  // Generate Institutional AI Research Memo
  const handleGenerateAiMemo = async () => {
    setIsGeneratingMemo(true);
    setAiMemo(null);
    try {
      const prompt = `
Generate an institutional-grade Swing & Position Trade Research Memo for Indian investor ${userName}.

STOCK: ${activeCandidate.name} (${activeCandidate.symbol}.NS)
EXCHANGE: ${activeCandidate.exchange}
SECTOR: ${activeCandidate.sector}
CURRENT PRICE: ₹${activeCandidate.currentPrice} (${formatPercent(activeCandidate.dayChangePercent)} today)
COMPOSITE SCORE: ${activeCandidate.scoring.compositeScore}/100

TECHNICAL METRICS:
- Setup Type: ${activeCandidate.plan.setupType} (${activeCandidate.plan.readiness})
- Entry Zone: ₹${activeCandidate.plan.preferredEntryZone[0]} - ₹${activeCandidate.plan.preferredEntryZone[1]}
- Stop-Loss: ₹${activeCandidate.plan.stopLoss}
- Target 1: ₹${activeCandidate.plan.target1} | Target 2: ₹${activeCandidate.plan.target2} (R:R 1:${activeCandidate.plan.riskRewardRatio})
- 20/50/200 EMAs: ₹${activeCandidate.technicals.ema20} / ₹${activeCandidate.technicals.ema50} / ₹${activeCandidate.technicals.ema200}
- RSI (14): ${activeCandidate.technicals.rsi14} | ADX: ${activeCandidate.technicals.adx14}
- Volume vs 20d Avg: ${activeCandidate.technicals.volumeVs20dAvgRatio}x
- 3M RS vs Nifty 50: ${formatPercent(activeCandidate.technicals.rsVsNifty3M)}

FUNDAMENTALS:
- Revenue YoY: ${formatPercent(activeCandidate.fundamentals.revenueGrowthYoY)} | PAT YoY: ${formatPercent(activeCandidate.fundamentals.patGrowthYoY)}
- ROE: ${activeCandidate.fundamentals.roe}% | ROCE: ${activeCandidate.fundamentals.roce}% | Debt/Equity: ${activeCandidate.fundamentals.debtToEquity}
- Current P/E: ${activeCandidate.fundamentals.pe}x vs 5-Yr Median: ${activeCandidate.fundamentals.peHistoricalMedian}x
- Free Cash Flow: ₹${activeCandidate.fundamentals.freeCashFlowCr} Cr

Structure the response as a formal Institutional Investment Committee Memo with:
1. EXECUTIVE SUMMARY & THESIS (4-12 weeks holding period)
2. FUNDAMENTAL CATALYSTS & EARNINGS QUALITY
3. TECHNICAL EXECUTION (Specific entry trigger, invalidation, profit targets)
4. PRE-MORTEM RISKS (Why this trade could fail)
5. POSITION SIZING RECOMMENDATION (Tailored for prudent capital preservation)
`;

      const aiSettings = loadMultiAISettings();
      const res = await executeAutoFallbackChat(
        aiSettings,
        prompt,
        `You are a Senior Equity Research Director providing high-conviction institutional swing trade research memos for ${userName}. Focus on 4-12 week horizon, strict risk boundaries, and no fabricated data.`
      );
      setAiMemo(res.text);
      setAiMemoProvider(res.provider.toUpperCase());
    } catch (err: any) {
      setAiMemo(`Unable to generate AI research memo: ${err.message || 'API connection failed'}. Please verify your API key in Settings.`);
    } finally {
      setIsGeneratingMemo(false);
    }
  };

  // Helper for setup badge styling
  const getSetupBadge = (type: SetupType) => {
    switch (type) {
      case 'BREAKOUT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Breakout</span>;
      case 'PULLBACK':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">Pullback</span>;
      case 'TREND_CONTINUATION':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-violet-500/10 text-violet-400 border border-violet-500/30">Trend Cont.</span>;
      case 'BASE_ACCUMULATION':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30">Base Accum.</span>;
    }
  };

  // Helper for readiness pill
  const getReadinessBadge = (readiness: TradeReadiness) => {
    switch (readiness) {
      case 'READY':
        return <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> Ready</span>;
      case 'WATCHLIST':
        return <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/10 text-amber-300 border border-amber-500/30"><Clock className="w-3 h-3 text-amber-400" /> Watchlist</span>;
      case 'NO_TRADE':
        return <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/10 text-rose-300 border border-rose-500/30"><ShieldAlert className="w-3 h-3 text-rose-400" /> No Trade</span>;
    }
  };

  // Helper for score color
  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
    if (score >= 75) return 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10';
    if (score >= 65) return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
    return 'text-gray-400 border-gray-700 bg-gray-800/40';
  };

  // Paper Trade metrics summary
  const paperStats = useMemo(() => {
    const total = paperTrades.length;
    const active = paperTrades.filter(t => t.status === 'ACTIVE');
    const closed = paperTrades.filter(t => t.status !== 'ACTIVE');
    const unrealizedPnl = active.reduce((sum, t) => sum + t.pnl, 0);
    const realizedPnl = closed.reduce((sum, t) => sum + t.pnl, 0);
    const winTrades = closed.filter(t => t.pnl > 0).length;
    const winRate = closed.length > 0 ? (winTrades / closed.length) * 100 : 0;
    return { total, activeCount: active.length, closedCount: closed.length, unrealizedPnl, realizedPnl, winRate };
  }, [paperTrades]);

  return (
    <div className="space-y-6 pb-12">
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#0E1422] via-[#131B2E] to-[#0E1422] p-5 rounded-2xl border border-gray-800/60 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-32 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              INSTITUTIONAL ENGINE • 4–12 WEEKS
            </span>
            <span className="flex items-center gap-1 text-[11px] text-gray-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              NIFTY 50: {marketContext.overallRegime} ({marketContext.breadthPercentAbove50EMA}% &gt; 50 EMA)
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <Target className="w-7 h-7 text-cyan-400" />
            Swing & Position Trade Research Engine
          </h1>
          <p className="text-sm text-gray-400 mt-1 max-w-3xl">
            Decision-support framework evaluating fundamental growth, weekly market structure, relative strength, and strict position sizing for Indian equities.
          </p>
        </div>

        {/* Quick Stats Pill */}
        <div className="relative z-10 flex items-center gap-3 bg-[#0E1422]/80 backdrop-blur-md p-3 rounded-xl border border-gray-800/80">
          <div className="text-right">
            <p className="text-[10px] text-gray-400 font-mono uppercase">Validated Win Rate</p>
            <p className="text-lg font-bold text-emerald-400 font-mono">
              {SWING_STRATEGY_BACKTEST.winRate}%
            </p>
          </div>
          <div className="h-8 w-[1px] bg-gray-800" />
          <div className="text-right">
            <p className="text-[10px] text-gray-400 font-mono uppercase">Profit Factor</p>
            <p className="text-lg font-bold text-cyan-400 font-mono">
              {SWING_STRATEGY_BACKTEST.profitFactor}x
            </p>
          </div>
          <div className="h-8 w-[1px] bg-gray-800" />
          <button
            onClick={() => setActiveTab('papertrade')}
            className="px-3 py-2 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Bookmark className="w-3.5 h-3.5" />
            Paper Trades ({paperStats.activeCount})
          </button>
        </div>
      </div>

      {/* ── Navigation Tabs ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-gray-800/80 pb-2 scrollbar-none">
        <button
          onClick={() => setActiveTab('scanner')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === 'scanner'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20'
              : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
          }`}
        >
          <Search className="w-4 h-4" />
          Candidate Scanner ({filteredCandidates.length})
        </button>

        <button
          onClick={() => setActiveTab('dossier')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === 'dossier'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20'
              : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
          }`}
        >
          <FileText className="w-4 h-4" />
          Research Dossier & Trade Plan
          <span className="text-[10px] bg-black/30 px-1.5 py-0.2 rounded font-mono text-cyan-200">
            {activeCandidate.symbol}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('rotation')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === 'rotation'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20'
              : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
          }`}
        >
          <Compass className="w-4 h-4" />
          Sector Rotation Radar
        </button>

        <button
          onClick={() => setActiveTab('sizer')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === 'sizer'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20'
              : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Risk & Position Sizer
        </button>

        <button
          onClick={() => setActiveTab('papertrade')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === 'papertrade'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20'
              : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          Paper Trading Tracker
          {paperStats.activeCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('backtest')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === 'backtest'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20'
              : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Backtest Laboratory (3Y)
        </button>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: CANDIDATE SCANNER                                                */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'scanner' && (
        <div className="space-y-5">
          {/* Filter Bar */}
          <div className="bg-[#131B2E] p-4 rounded-xl border border-gray-800/60 flex flex-wrap items-center justify-between gap-4">
            {/* Search */}
            <div className="relative min-w-[240px] flex-1 max-w-sm">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search symbol, company, or sector..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#0E1422] border border-gray-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Setup Type */}
              <select
                value={filterSetup}
                onChange={e => setFilterSetup(e.target.value as any)}
                className="bg-[#0E1422] border border-gray-800 text-gray-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500/50"
              >
                <option value="ALL">All Setups</option>
                <option value="BREAKOUT">Breakout</option>
                <option value="PULLBACK">Pullback to Support</option>
                <option value="TREND_CONTINUATION">Trend Continuation</option>
                <option value="BASE_ACCUMULATION">Base Accumulation</option>
              </select>

              {/* Readiness */}
              <select
                value={filterReadiness}
                onChange={e => setFilterReadiness(e.target.value as any)}
                className="bg-[#0E1422] border border-gray-800 text-gray-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500/50"
              >
                <option value="ALL">All Readiness</option>
                <option value="READY">Ready</option>
                <option value="WATCHLIST">Watchlist</option>
                <option value="NO_TRADE">No Trade</option>
              </select>

              {/* Sector */}
              <select
                value={filterSector}
                onChange={e => setFilterSector(e.target.value)}
                className="bg-[#0E1422] border border-gray-800 text-gray-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500/50"
              >
                <option value="ALL">All Sectors</option>
                {uniqueSectors.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="bg-[#0E1422] border border-gray-800 text-cyan-400 text-xs font-semibold rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500/50"
              >
                <option value="score">Sort: Composite Score</option>
                <option value="rr">Sort: Risk/Reward Ratio</option>
                <option value="dayChange">Sort: Today's Change %</option>
                <option value="rs">Sort: 3M Relative Strength</option>
              </select>
            </div>
          </div>

          {/* Candidate Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCandidates.map(candidate => {
              const score = candidate.scoring.compositeScore;
              return (
                <div
                  key={candidate.id}
                  className="bg-[#131B2E] rounded-xl border border-gray-800/60 hover:border-cyan-500/40 p-4 transition-all duration-200 flex flex-col justify-between group shadow-lg"
                >
                  <div>
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-base tracking-wide group-hover:text-cyan-400 transition-colors">
                            {candidate.symbol}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 font-mono">
                            {candidate.exchange}
                          </span>
                          {getSetupBadge(candidate.plan.setupType)}
                        </div>
                        <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">
                          {candidate.name} • {candidate.sector}
                        </p>
                      </div>

                      {/* Score Badge */}
                      <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl border font-mono ${getScoreColor(score)}`}>
                        <span className="text-base font-extrabold leading-none">{score}</span>
                        <span className="text-[8px] uppercase tracking-wider text-gray-400">Score</span>
                      </div>
                    </div>

                    {/* Price & Readiness Row */}
                    <div className="flex items-center justify-between py-2 border-y border-gray-800/60 mb-3">
                      <div>
                        <p className="text-sm font-extrabold text-white font-mono">
                          {formatCurrency(candidate.currentPrice)}
                        </p>
                        <span className={`text-[11px] font-mono font-semibold flex items-center gap-0.5 ${candidate.dayChangePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {candidate.dayChangePercent >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {formatPercent(candidate.dayChangePercent)}
                        </span>
                      </div>
                      <div>
                        {getReadinessBadge(candidate.plan.readiness)}
                        <p className="text-[10px] text-gray-400 font-mono text-right mt-1">
                          Horizon: {candidate.plan.estimatedHoldingPeriod}
                        </p>
                      </div>
                    </div>

                    {/* Trade Plan Levels Preview */}
                    <div className="bg-[#0E1422] p-2.5 rounded-lg border border-gray-800/80 mb-3 space-y-1.5 text-xs font-mono">
                      <div className="flex items-center justify-between text-gray-300">
                        <span className="text-gray-400 text-[11px]">Preferred Entry:</span>
                        <span className="font-bold text-cyan-300">
                          ₹{candidate.plan.preferredEntryZone[0]} – ₹{candidate.plan.preferredEntryZone[1]}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-gray-300">
                        <span className="text-gray-400 text-[11px]">Stop-Loss:</span>
                        <span className="text-rose-400 font-semibold">
                          ₹{candidate.plan.stopLoss} (
                          {((candidate.plan.stopLoss - candidate.currentPrice) / candidate.currentPrice * 100).toFixed(1)}%)
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-gray-300">
                        <span className="text-gray-400 text-[11px]">Targets (T1 / T2):</span>
                        <span className="text-emerald-400 font-semibold">
                          ₹{candidate.plan.target1} / ₹{candidate.plan.target2}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-gray-400 text-[10px] pt-1 border-t border-gray-800/60">
                        <span>Risk/Reward: <strong className="text-white">1:{candidate.plan.riskRewardRatio}</strong></span>
                        <span>RS 3M: <strong className={candidate.technicals.rsVsNifty3M >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{formatPercent(candidate.technicals.rsVsNifty3M)}</strong></span>
                      </div>
                    </div>

                    {/* Score Component Breakdown Bar */}
                    <div className="space-y-1 mb-3">
                      <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                        <span>Fund: {candidate.scoring.fundamentalScore}/25</span>
                        <span>Tech: {candidate.scoring.technicalScore}/25</span>
                        <span>RS: {candidate.scoring.relativeStrengthScore}/20</span>
                        <span>Val: {candidate.scoring.valuationScore}/15</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden flex">
                        <div style={{ width: `${(candidate.scoring.fundamentalScore / 25) * 25}%` }} className="bg-emerald-500" />
                        <div style={{ width: `${(candidate.scoring.technicalScore / 25) * 25}%` }} className="bg-cyan-500" />
                        <div style={{ width: `${(candidate.scoring.relativeStrengthScore / 20) * 20}%` }} className="bg-violet-500" />
                        <div style={{ width: `${(candidate.scoring.valuationScore / 15) * 15}%` }} className="bg-amber-500" />
                        <div style={{ width: `${(candidate.scoring.riskLiquidityScore / 15) * 15}%` }} className="bg-blue-500" />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-800/60">
                    <button
                      onClick={() => handleOpenDossier(candidate.id)}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-gray-800/80 hover:bg-cyan-600/30 text-cyan-300 border border-gray-700/60 hover:border-cyan-500/40 text-xs font-semibold transition-all flex items-center justify-center gap-1"
                    >
                      Dossier <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenSizer(candidate.id)}
                      title="Calculate Position Size"
                      className="p-1.5 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-gray-300 border border-gray-700/60 text-xs"
                    >
                      <Sliders className="w-4 h-4 text-cyan-400" />
                    </button>
                    <button
                      onClick={() => handleQuickPaperTrade(candidate)}
                      title="Add to Paper Trading"
                      className="p-1.5 rounded-lg bg-gray-800/80 hover:bg-emerald-500/20 text-gray-300 hover:text-emerald-400 border border-gray-700/60 text-xs"
                    >
                      <Bookmark className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredCandidates.length === 0 && (
            <div className="text-center py-12 bg-[#131B2E] rounded-xl border border-gray-800/60">
              <ShieldAlert className="w-10 h-10 text-gray-500 mx-auto mb-2" />
              <h3 className="text-base font-bold text-white">No candidates match filters</h3>
              <p className="text-xs text-gray-400 mt-1">Try resetting the setup or readiness filters above.</p>
              <button
                onClick={() => {
                  setFilterSetup('ALL');
                  setFilterReadiness('ALL');
                  setFilterSector('ALL');
                  setSearchQuery('');
                }}
                className="mt-4 px-4 py-1.5 rounded-lg bg-cyan-600/20 text-cyan-300 text-xs font-semibold"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: INSTITUTIONAL RESEARCH DOSSIER & TRADE PLAN                       */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'dossier' && (
        <div className="space-y-6">
          {/* Candidate Selector Ribbon */}
          <div className="bg-[#131B2E] p-3 rounded-xl border border-gray-800/60 flex items-center justify-between gap-4 overflow-x-auto">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-semibold whitespace-nowrap">Select Candidate:</span>
              <div className="flex items-center gap-1">
                {candidates.map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedCandidateId(c.id);
                      setAiMemo(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all whitespace-nowrap ${
                      c.id === activeCandidate.id
                        ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/30'
                        : 'bg-[#0E1422] text-gray-400 hover:text-white border border-gray-800'
                    }`}
                  >
                    {c.symbol} ({c.scoring.compositeScore})
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenSizer(activeCandidate.id)}
                className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-cyan-300 border border-gray-700 flex items-center gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5" /> Size Position
              </button>
              <button
                onClick={() => handleQuickPaperTrade(activeCandidate)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-xs font-semibold text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5"
              >
                <Bookmark className="w-3.5 h-3.5" /> Paper Trade
              </button>
            </div>
          </div>

          {/* Dossier Header Banner */}
          <div className="bg-gradient-to-r from-[#131B2E] via-[#0E1422] to-[#131B2E] p-6 rounded-2xl border border-gray-800/60 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded text-xs font-bold font-mono uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  {activeCandidate.exchange}: {activeCandidate.symbol}
                </span>
                <span className="px-2 py-0.5 rounded text-xs font-mono text-gray-400 bg-gray-800/80">
                  {activeCandidate.sector}
                </span>
                {getSetupBadge(activeCandidate.plan.setupType)}
                {getReadinessBadge(activeCandidate.plan.readiness)}
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white">
                {activeCandidate.name}
              </h2>
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-3">
                <span>Mkt Cap: ₹{(activeCandidate.marketCapCr / 1000).toFixed(1)}k Cr</span>
                <span>•</span>
                <span>Avg Daily Turnover: ₹{activeCandidate.avgDailyTurnoverCr} Cr</span>
                <span>•</span>
                <span>52W High/Low: ₹{activeCandidate.high52w} / ₹{activeCandidate.low52w}</span>
              </p>
            </div>

            {/* Score & Price Block */}
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-xs text-gray-400 font-mono">Current Market Price</p>
                <p className="text-2xl font-black text-white font-mono">
                  {formatCurrency(activeCandidate.currentPrice)}
                </p>
                <p className={`text-xs font-mono font-bold ${activeCandidate.dayChangePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatPercent(activeCandidate.dayChangePercent)} today
                </p>
              </div>

              <div className={`p-4 rounded-2xl border text-center font-mono ${getScoreColor(activeCandidate.scoring.compositeScore)}`}>
                <span className="text-3xl font-black block leading-none">
                  {activeCandidate.scoring.compositeScore}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-gray-400">
                  Institutional Score
                </span>
              </div>
            </div>
          </div>

          {/* ── Section A: Concrete Trade Plan Box ──────────────────────────── */}
          <div className="bg-[#131B2E] p-6 rounded-2xl border border-cyan-500/30 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-800/80">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-bold text-white">Concrete Trade Plan (4–12 Weeks Horizon)</h3>
              </div>
              <span className="text-xs font-mono text-cyan-400">
                Holding Horizon: {activeCandidate.plan.estimatedHoldingPeriod}
              </span>
            </div>

            {/* Core Plan Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-[#0E1422] p-3 rounded-xl border border-gray-800">
                <p className="text-[10px] text-gray-400 uppercase font-mono">Preferred Entry Zone</p>
                <p className="text-base font-bold text-cyan-400 font-mono mt-0.5">
                  ₹{activeCandidate.plan.preferredEntryZone[0]} – ₹{activeCandidate.plan.preferredEntryZone[1]}
                </p>
                <p className="text-[10px] text-gray-500 mt-1 line-clamp-1">{activeCandidate.plan.confirmationCondition}</p>
              </div>

              <div className="bg-[#0E1422] p-3 rounded-xl border border-rose-500/20">
                <p className="text-[10px] text-gray-400 uppercase font-mono">Strict Stop-Loss</p>
                <p className="text-base font-bold text-rose-400 font-mono mt-0.5">
                  ₹{activeCandidate.plan.stopLoss}
                </p>
                <p className="text-[10px] text-rose-300/80 mt-1 font-mono">
                  Risk: {((activeCandidate.plan.stopLoss - activeCandidate.currentPrice) / activeCandidate.currentPrice * 100).toFixed(1)}% | Invalidation: ₹{activeCandidate.plan.technicalInvalidationLevel}
                </p>
              </div>

              <div className="bg-[#0E1422] p-3 rounded-xl border border-emerald-500/20">
                <p className="text-[10px] text-gray-400 uppercase font-mono">Profit Targets (T1 / T2)</p>
                <p className="text-base font-bold text-emerald-400 font-mono mt-0.5">
                  ₹{activeCandidate.plan.target1} / ₹{activeCandidate.plan.target2}
                </p>
                <p className="text-[10px] text-emerald-300/80 mt-1 font-mono">
                  T1: +{((activeCandidate.plan.target1 - activeCandidate.currentPrice) / activeCandidate.currentPrice * 100).toFixed(1)}% | T2: +{((activeCandidate.plan.target2 - activeCandidate.currentPrice) / activeCandidate.currentPrice * 100).toFixed(1)}%
                </p>
              </div>

              <div className="bg-[#0E1422] p-3 rounded-xl border border-gray-800">
                <p className="text-[10px] text-gray-400 uppercase font-mono">Risk / Reward Ratio</p>
                <p className="text-base font-bold text-white font-mono mt-0.5">
                  1 : {activeCandidate.plan.riskRewardRatio}
                </p>
                <p className="text-[10px] text-cyan-400 mt-1">Asymmetric Upside Profile</p>
              </div>
            </div>

            {/* Rationale & Pre-Mortem Box */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-gray-800/60">
              <div className="bg-[#0E1422]/60 p-4 rounded-xl border border-gray-800/80">
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" /> Setup Rationale
                </h4>
                <p className="text-xs text-gray-300 leading-relaxed">
                  {activeCandidate.plan.rationale}
                </p>
                <div className="mt-3 flex items-center gap-2 text-[11px] text-gray-400 font-mono">
                  <span>Support: ₹{activeCandidate.plan.supportZone[0]}–₹{activeCandidate.plan.supportZone[1]}</span>
                  <span>•</span>
                  <span>Resistance: ₹{activeCandidate.plan.resistanceZone[0]}–₹{activeCandidate.plan.resistanceZone[1]}</span>
                </div>
              </div>

              <div className="bg-[#0E1422]/60 p-4 rounded-xl border border-rose-500/20">
                <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-400" /> Pre-Mortem: Why This Trade Could Fail
                </h4>
                <ul className="space-y-1.5 text-xs text-gray-300">
                  {activeCandidate.plan.failureRisks.map((risk, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-rose-400 font-bold">•</span>
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 text-[10px] text-rose-300/80 font-mono">
                  Invalidation Trigger: Daily close below ₹{activeCandidate.plan.technicalInvalidationLevel} on elevated volume.
                </div>
              </div>
            </div>
          </div>

          {/* ── Section B: Fundamental & Valuation Deep-Dive ────────────────── */}
          <div className="bg-[#131B2E] p-6 rounded-2xl border border-gray-800/60 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800/80">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-400" />
                Fundamental Quality & Financial Metrics
              </h3>
              <span className="text-xs font-mono text-emerald-400">
                Score: {activeCandidate.scoring.fundamentalScore}/25 pts
              </span>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <div className="bg-[#0E1422] p-3 rounded-xl border border-gray-800">
                <p className="text-[10px] text-gray-400 font-mono uppercase">Revenue YoY</p>
                <p className="text-sm font-bold text-white font-mono mt-0.5">
                  {formatPercent(activeCandidate.fundamentals.revenueGrowthYoY)}
                </p>
              </div>

              <div className="bg-[#0E1422] p-3 rounded-xl border border-gray-800">
                <p className="text-[10px] text-gray-400 font-mono uppercase">PAT Growth YoY</p>
                <p className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                  {formatPercent(activeCandidate.fundamentals.patGrowthYoY)}
                </p>
              </div>

              <div className="bg-[#0E1422] p-3 rounded-xl border border-gray-800">
                <p className="text-[10px] text-gray-400 font-mono uppercase">ROE / ROCE</p>
                <p className="text-sm font-bold text-white font-mono mt-0.5">
                  {activeCandidate.fundamentals.roe}% / {activeCandidate.fundamentals.roce}%
                </p>
              </div>

              <div className="bg-[#0E1422] p-3 rounded-xl border border-gray-800">
                <p className="text-[10px] text-gray-400 font-mono uppercase">Operating Margin</p>
                <p className="text-sm font-bold text-white font-mono mt-0.5">
                  {activeCandidate.fundamentals.operatingMargin}%
                </p>
              </div>

              <div className="bg-[#0E1422] p-3 rounded-xl border border-gray-800">
                <p className="text-[10px] text-gray-400 font-mono uppercase">Debt / Equity</p>
                <p className="text-sm font-bold text-cyan-400 font-mono mt-0.5">
                  {activeCandidate.fundamentals.debtToEquity.toFixed(2)}x
                </p>
              </div>

              <div className="bg-[#0E1422] p-3 rounded-xl border border-gray-800">
                <p className="text-[10px] text-gray-400 font-mono uppercase">Free Cash Flow</p>
                <p className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                  ₹{activeCandidate.fundamentals.freeCashFlowCr.toLocaleString('en-IN')} Cr
                </p>
              </div>
            </div>

            {/* Valuation Comparison Bar */}
            <div className="bg-[#0E1422] p-4 rounded-xl border border-gray-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-gray-400">Valuation Multiples:</span>
                <span className="text-gray-300">
                  Current P/E: <strong className="text-white">{activeCandidate.fundamentals.pe}x</strong> | 5-Yr Median: <strong className="text-cyan-400">{activeCandidate.fundamentals.peHistoricalMedian}x</strong> | Sector Avg: <strong className="text-gray-400">{activeCandidate.fundamentals.peSectorAvg}x</strong> | P/B: {activeCandidate.fundamentals.pb}x
                </span>
              </div>
            </div>

            {/* Fair Value Scenario Matrix */}
            <div>
              <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                Scenario Fair-Value Matrix (Explicit Growth & Multiple Assumptions)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-[#0E1422] p-3.5 rounded-xl border border-emerald-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 uppercase font-mono">Bull Case Target</span>
                    <span className="text-base font-extrabold text-emerald-300 font-mono">
                      ₹{activeCandidate.plan.fairValueScenarios.bullCase.target}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                    {activeCandidate.plan.fairValueScenarios.bullCase.assumptions}
                  </p>
                </div>

                <div className="bg-[#0E1422] p-3.5 rounded-xl border border-cyan-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-400 uppercase font-mono">Base Case Target</span>
                    <span className="text-base font-extrabold text-cyan-300 font-mono">
                      ₹{activeCandidate.plan.fairValueScenarios.baseCase.target}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                    {activeCandidate.plan.fairValueScenarios.baseCase.assumptions}
                  </p>
                </div>

                <div className="bg-[#0E1422] p-3.5 rounded-xl border border-rose-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-400 uppercase font-mono">Bear Case Target</span>
                    <span className="text-base font-extrabold text-rose-300 font-mono">
                      ₹{activeCandidate.plan.fairValueScenarios.bearCase.target}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                    {activeCandidate.plan.fairValueScenarios.bearCase.assumptions}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Section C: Technical Structure & Indicators ─────────────────── */}
          <div className="bg-[#131B2E] p-6 rounded-2xl border border-gray-800/60 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800/80">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
                Technical Trend Structure & Moving Averages
              </h3>
              <span className="text-xs font-mono text-cyan-400">
                Score: {activeCandidate.scoring.technicalScore}/25 pts
              </span>
            </div>

            {/* EMA Alignment Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-[#0E1422] p-3 rounded-xl border border-gray-800">
                <p className="text-[10px] text-gray-400 font-mono uppercase">20-Day EMA (Short)</p>
                <p className="text-sm font-bold text-cyan-400 font-mono mt-0.5">
                  ₹{activeCandidate.technicals.ema20}
                </p>
                <span className="text-[10px] text-emerald-400 font-mono">
                  {activeCandidate.currentPrice > activeCandidate.technicals.ema20 ? 'Price Above EMA' : 'Price Below EMA'}
                </span>
              </div>

              <div className="bg-[#0E1422] p-3 rounded-xl border border-gray-800">
                <p className="text-[10px] text-gray-400 font-mono uppercase">50-Day EMA (Medium)</p>
                <p className="text-sm font-bold text-cyan-400 font-mono mt-0.5">
                  ₹{activeCandidate.technicals.ema50}
                </p>
                <span className="text-[10px] text-emerald-400 font-mono">
                  {activeCandidate.currentPrice > activeCandidate.technicals.ema50 ? 'Constructive' : 'Neutral'}
                </span>
              </div>

              <div className="bg-[#0E1422] p-3 rounded-xl border border-gray-800">
                <p className="text-[10px] text-gray-400 font-mono uppercase">100-Day EMA</p>
                <p className="text-sm font-bold text-gray-300 font-mono mt-0.5">
                  ₹{activeCandidate.technicals.ema100}
                </p>
              </div>

              <div className="bg-[#0E1422] p-3 rounded-xl border border-gray-800">
                <p className="text-[10px] text-gray-400 font-mono uppercase">200-Day EMA (Long)</p>
                <p className="text-sm font-bold text-white font-mono mt-0.5">
                  ₹{activeCandidate.technicals.ema200}
                </p>
                <span className="text-[10px] text-emerald-400 font-mono">
                  {activeCandidate.currentPrice > activeCandidate.technicals.ema200 ? 'Bullish Regime' : 'Below 200 EMA'}
                </span>
              </div>
            </div>

            {/* Momentum & Volume Indicators */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-[#0E1422] p-3 rounded-xl border border-gray-800">
                <p className="text-[10px] text-gray-400 font-mono uppercase">RSI (14-Period)</p>
                <p className="text-sm font-bold text-white font-mono mt-0.5">
                  {activeCandidate.technicals.rsi14}
                </p>
                <p className="text-[10px] text-gray-500">
                  {activeCandidate.technicals.rsi14 > 60 ? 'Bullish Momentum' : 'Neutral Zone'}
                </p>
              </div>

              <div className="bg-[#0E1422] p-3 rounded-xl border border-gray-800">
                <p className="text-[10px] text-gray-400 font-mono uppercase">ADX (Trend Strength)</p>
                <p className="text-sm font-bold text-white font-mono mt-0.5">
                  {activeCandidate.technicals.adx14}
                </p>
                <p className="text-[10px] text-cyan-400">
                  {activeCandidate.technicals.adx14 >= 25 ? 'Strong Directional Trend' : 'Range-bound'}
                </p>
              </div>

              <div className="bg-[#0E1422] p-3 rounded-xl border border-gray-800">
                <p className="text-[10px] text-gray-400 font-mono uppercase">Volume vs 20d Avg</p>
                <p className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                  {activeCandidate.technicals.volumeVs20dAvgRatio}x
                </p>
                <p className="text-[10px] text-gray-500">
                  {activeCandidate.technicals.deliveryPercentage ? `${activeCandidate.technicals.deliveryPercentage}% Delivery` : 'Institutional Accumulation'}
                </p>
              </div>

              <div className="bg-[#0E1422] p-3 rounded-xl border border-gray-800">
                <p className="text-[10px] text-gray-400 font-mono uppercase">3M RS vs Nifty 50</p>
                <p className={`text-sm font-bold font-mono mt-0.5 ${activeCandidate.technicals.rsVsNifty3M >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatPercent(activeCandidate.technicals.rsVsNifty3M)}
                </p>
                <p className="text-[10px] text-gray-500">Outperforming Benchmark</p>
              </div>
            </div>
          </div>

          {/* ── Section D: Institutional AI Research Memo Generator ────────── */}
          <div className="bg-[#131B2E] p-6 rounded-2xl border border-gray-800/60 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                  Institutional AI Research Memo
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Generate an institutional research note summarizing thesis, catalysts, and risk parameters.
                </p>
              </div>

              <button
                onClick={handleGenerateAiMemo}
                disabled={isGeneratingMemo}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all"
              >
                {isGeneratingMemo ? (
                  <>
                    <RotateCcw className="w-4 h-4 animate-spin" />
                    Synthesizing Research Memo...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Research Memo
                  </>
                )}
              </button>
            </div>

            {aiMemo && (
              <div className="bg-[#0E1422] p-5 rounded-xl border border-cyan-500/30 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-gray-800">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Generated by {aiMemoProvider || 'Multi-AI Hub'} for {userName}
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">
                    {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <div className="text-xs text-gray-300 leading-relaxed whitespace-pre-line font-sans">
                  {aiMemo}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: MARKET & SECTOR ROTATION RADAR                                    */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'rotation' && (
        <div className="space-y-6">
          {/* Nifty 50 Breadth & Trend Box */}
          <div className="bg-[#131B2E] p-6 rounded-2xl border border-gray-800/60 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-800/80">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400">
                  Market Context & Regime
                </span>
                <h3 className="text-xl font-bold text-white mt-0.5">
                  NSE Nifty 50 Trend & Breadth Analysis
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Regime: {marketContext.overallRegime}
                </span>
                <span className="text-xs font-mono text-gray-400">
                  Nifty: {marketContext.niftyPrice.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#0E1422] p-4 rounded-xl border border-gray-800">
                <p className="text-[10px] text-gray-400 font-mono uppercase">50-Day EMA</p>
                <p className="text-base font-bold text-white font-mono mt-0.5">
                  {marketContext.nifty50dEMA.toLocaleString('en-IN')}
                </p>
                <p className="text-[10px] text-emerald-400 mt-1 font-mono">
                  +{((marketContext.niftyPrice - marketContext.nifty50dEMA) / marketContext.nifty50dEMA * 100).toFixed(1)}% above 50 EMA
                </p>
              </div>

              <div className="bg-[#0E1422] p-4 rounded-xl border border-gray-800">
                <p className="text-[10px] text-gray-400 font-mono uppercase">200-Day EMA (Structural)</p>
                <p className="text-base font-bold text-white font-mono mt-0.5">
                  {marketContext.nifty200dEMA.toLocaleString('en-IN')}
                </p>
                <p className="text-[10px] text-emerald-400 mt-1 font-mono">
                  +{((marketContext.niftyPrice - marketContext.nifty200dEMA) / marketContext.nifty200dEMA * 100).toFixed(1)}% above 200 EMA
                </p>
              </div>

              <div className="bg-[#0E1422] p-4 rounded-xl border border-gray-800">
                <p className="text-[10px] text-gray-400 font-mono uppercase">Market Breadth (&gt; 50 EMA)</p>
                <p className="text-base font-bold text-cyan-400 font-mono mt-0.5">
                  {marketContext.breadthPercentAbove50EMA}%
                </p>
                <p className="text-[10px] text-gray-400 mt-1">Healthy breadth across Nifty 500</p>
              </div>

              <div className="bg-[#0E1422] p-4 rounded-xl border border-gray-800">
                <p className="text-[10px] text-gray-400 font-mono uppercase">Advance / Decline Ratio</p>
                <p className="text-base font-bold text-white font-mono mt-0.5">
                  {marketContext.advanceDeclineRatio} : 1
                </p>
                <p className="text-[10px] text-emerald-400 mt-1">Net advancing volume</p>
              </div>
            </div>

            <p className="text-xs text-gray-300 bg-[#0E1422]/60 p-3.5 rounded-xl border border-gray-800/80 leading-relaxed">
              <strong className="text-cyan-400">Macro Insight:</strong> {marketContext.macroCommentary}
            </p>
          </div>

          {/* Sector Rotation Matrix Table */}
          <div className="bg-[#131B2E] rounded-2xl border border-gray-800/60 shadow-xl overflow-hidden">
            <div className="p-5 border-b border-gray-800/80 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Compass className="w-5 h-5 text-cyan-400" />
                  Sector Rotation & Relative Momentum Matrix
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Leading and improving sectors receive higher score weights; lagging sectors carry penalties.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#0E1422] text-gray-400 uppercase text-[10px] border-b border-gray-800">
                  <tr>
                    <th className="py-3 px-4">Sector</th>
                    <th className="py-3 px-4">Index Symbol</th>
                    <th className="py-3 px-4">Stage</th>
                    <th className="py-3 px-4 text-right">1M Return</th>
                    <th className="py-3 px-4 text-right">3M Return</th>
                    <th className="py-3 px-4 text-right">RS vs Nifty</th>
                    <th className="py-3 px-4">Key Candidates</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {marketContext.sectorRankings.map((sec, idx) => {
                    const stageColor =
                      sec.stage === 'LEADING'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : sec.stage === 'IMPROVING'
                        ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                        : sec.stage === 'WEAKENING'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30';

                    return (
                      <tr key={idx} className="hover:bg-gray-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-white font-sans">{sec.sector}</td>
                        <td className="py-3.5 px-4 text-gray-400">{sec.indexSymbol}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${stageColor}`}>
                            {sec.stage}
                          </span>
                        </td>
                        <td className={`py-3.5 px-4 text-right font-bold ${sec.return1M >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {formatPercent(sec.return1M)}
                        </td>
                        <td className={`py-3.5 px-4 text-right font-bold ${sec.return3M >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {formatPercent(sec.return3M)}
                        </td>
                        <td className={`py-3.5 px-4 text-right font-bold ${sec.rsVsNifty >= 0 ? 'text-cyan-400' : 'text-gray-400'}`}>
                          {formatPercent(sec.rsVsNifty)}
                        </td>
                        <td className="py-3.5 px-4 text-gray-300">
                          {sec.topStockSymbols.join(', ')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* TAB 4: PORTFOLIO-AWARE RISK & POSITION SIZER                             */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'sizer' && (
        <div className="space-y-6">
          <div className="bg-[#131B2E] p-6 rounded-2xl border border-gray-800/60 shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-800/80">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Sliders className="w-6 h-6 text-cyan-400" />
                  Portfolio-Aware Risk & Position Sizer
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Formula: Shares = ⌊ (Total Capital × Risk %) / (Entry − Stop-Loss) ⌋. Checks existing portfolio sector concentration.
                </p>
              </div>

              {/* Candidate Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-mono">Stock:</span>
                <select
                  value={sizerCandidateId}
                  onChange={e => {
                    setSizerCandidateId(e.target.value);
                    setSizerEntryOverride(null);
                    setSizerStopOverride(null);
                  }}
                  className="bg-[#0E1422] border border-gray-800 text-white font-mono text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500/50"
                >
                  {candidates.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.symbol} (CMP: ₹{c.currentPrice} | Score: {c.scoring.compositeScore})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-[10px] text-gray-400 uppercase font-mono block mb-1">
                  Total Trading Capital (₹)
                </label>
                <input
                  type="number"
                  value={sizerCapital}
                  onChange={e => setSizerCapital(Math.max(10000, Number(e.target.value)))}
                  className="w-full bg-[#0E1422] border border-gray-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] text-gray-400 uppercase font-mono">
                    Risk Per Trade
                  </label>
                  <span className="text-xs font-mono font-bold text-cyan-400">{sizerRiskPercent}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.25"
                  value={sizerRiskPercent}
                  onChange={e => setSizerRiskPercent(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-gray-500 font-mono mt-0.5">
                  <span>0.5% (Conservative)</span>
                  <span>1.5% (Standard)</span>
                  <span>3.0% (Aggressive)</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-gray-400 uppercase font-mono block mb-1">
                  Entry Price (₹)
                </label>
                <input
                  type="number"
                  value={sizerEntryOverride !== null ? sizerEntryOverride : sizerCandidate.currentPrice}
                  onChange={e => setSizerEntryOverride(Number(e.target.value))}
                  className="w-full bg-[#0E1422] border border-gray-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 uppercase font-mono block mb-1">
                  Stop-Loss Price (₹)
                </label>
                <input
                  type="number"
                  value={sizerStopOverride !== null ? sizerStopOverride : sizerCandidate.plan.stopLoss}
                  onChange={e => setSizerStopOverride(Number(e.target.value))}
                  className="w-full bg-[#0E1422] border border-gray-800 rounded-xl px-3 py-2 text-sm text-rose-400 font-mono focus:outline-none focus:border-cyan-500/50"
                />
              </div>
            </div>

            {/* Calculated Output Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#0E1422] p-4 rounded-xl border border-gray-800">
                <p className="text-[10px] text-gray-400 font-mono uppercase">Max Rupee Risk</p>
                <p className="text-xl font-bold text-rose-400 font-mono mt-1">
                  {formatCurrency(sizingResult.maxCapitalRiskINR)}
                </p>
                <p className="text-[10px] text-gray-500 mt-1 font-mono">
                  {sizerRiskPercent}% of capital
                </p>
              </div>

              <div className="bg-[#0E1422] p-4 rounded-xl border border-gray-800">
                <p className="text-[10px] text-gray-400 font-mono uppercase">Risk Per Share</p>
                <p className="text-xl font-bold text-white font-mono mt-1">
                  {formatCurrency(sizingResult.riskPerShare)}
                </p>
                <p className="text-[10px] text-rose-300 font-mono mt-1">
                  {((sizingResult.riskPerShare / sizingResult.entryPrice) * 100).toFixed(1)}% downside
                </p>
              </div>

              <div className="bg-[#0E1422] p-4 rounded-xl border border-cyan-500/30">
                <p className="text-[10px] text-cyan-400 font-mono uppercase font-bold">Recommended Quantity</p>
                <p className="text-2xl font-black text-cyan-300 font-mono mt-1">
                  {sizingResult.recommendedShares} Shares
                </p>
                <p className="text-[10px] text-gray-400 mt-1">Strict risk-calibrated size</p>
              </div>

              <div className="bg-[#0E1422] p-4 rounded-xl border border-gray-800">
                <p className="text-[10px] text-gray-400 font-mono uppercase">Total Position Capital</p>
                <p className="text-xl font-bold text-white font-mono mt-1">
                  {formatCurrency(sizingResult.recommendedInvestmentINR)}
                </p>
                <p className="text-[10px] text-gray-400 mt-1 font-mono">
                  {sizingResult.percentOfTotalCapital.toFixed(1)}% of total capital
                </p>
              </div>
            </div>

            {/* Correlated Sector Warning Banner */}
            {sizingResult.correlatedSectorWarning && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-300 uppercase font-mono">
                    Correlated Sector Concentration Alert
                  </h4>
                  <p className="text-xs text-amber-200/90 mt-1">
                    {sizingResult.correlatedSectorWarning} Consider reducing allocation to protect against industry-wide downturns.
                  </p>
                </div>
              </div>
            )}

            {/* Execute Button */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-800/80">
              <span className="text-xs text-gray-400">
                Holding {holdings.length} actual positions in your Portfolio Manager account.
              </span>
              <button
                onClick={handleExecutePaperFromSizer}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
              >
                <Bookmark className="w-4 h-4" />
                Add to Paper Trading with this Size ({sizingResult.recommendedShares} Shares)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* TAB 5: PAPER TRADING & ACTIVE WATCHLIST                                  */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'papertrade' && (
        <div className="space-y-6">
          {/* Paper Portfolio Summary Banner */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-[#131B2E] p-4 rounded-xl border border-gray-800/60">
              <p className="text-[10px] text-gray-400 font-mono uppercase">Active Positions</p>
              <p className="text-xl font-bold text-white font-mono mt-1">{paperStats.activeCount}</p>
            </div>

            <div className="bg-[#131B2E] p-4 rounded-xl border border-gray-800/60">
              <p className="text-[10px] text-gray-400 font-mono uppercase">Closed Positions</p>
              <p className="text-xl font-bold text-white font-mono mt-1">{paperStats.closedCount}</p>
            </div>

            <div className="bg-[#131B2E] p-4 rounded-xl border border-gray-800/60">
              <p className="text-[10px] text-gray-400 font-mono uppercase">Unrealized P/L</p>
              <p className={`text-xl font-bold font-mono mt-1 ${paperStats.unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatCurrency(paperStats.unrealizedPnl)}
              </p>
            </div>

            <div className="bg-[#131B2E] p-4 rounded-xl border border-gray-800/60">
              <p className="text-[10px] text-gray-400 font-mono uppercase">Realized P/L</p>
              <p className={`text-xl font-bold font-mono mt-1 ${paperStats.realizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatCurrency(paperStats.realizedPnl)}
              </p>
            </div>

            <div className="bg-[#131B2E] p-4 rounded-xl border border-gray-800/60">
              <p className="text-[10px] text-gray-400 font-mono uppercase">Paper Win Rate</p>
              <p className="text-xl font-bold text-cyan-400 font-mono mt-1">
                {paperStats.winRate.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Active Trades Table */}
          <div className="bg-[#131B2E] rounded-2xl border border-gray-800/60 shadow-xl overflow-hidden">
            <div className="p-5 border-b border-gray-800/80 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Bookmark className="w-5 h-5 text-cyan-400" />
                  Active Paper Swing Positions ({paperStats.activeCount})
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Track live profit & loss against Target 1, Target 2, and Stop-Loss without risking real capital.
                </p>
              </div>

              <button
                onClick={() => setActiveTab('scanner')}
                className="px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Scan New Setup
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#0E1422] text-gray-400 uppercase text-[10px] border-b border-gray-800">
                  <tr>
                    <th className="py-3 px-4">Stock</th>
                    <th className="py-3 px-4">Setup</th>
                    <th className="py-3 px-4">Entry Date</th>
                    <th className="py-3 px-4 text-right">Entry Price</th>
                    <th className="py-3 px-4 text-right">Qty</th>
                    <th className="py-3 px-4 text-right">Current Price</th>
                    <th className="py-3 px-4 text-right">Stop-Loss</th>
                    <th className="py-3 px-4 text-right">Target 1 / 2</th>
                    <th className="py-3 px-4 text-right">Live P/L</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {paperTrades.filter(t => t.status === 'ACTIVE').map(t => (
                    <tr key={t.id} className="hover:bg-gray-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-white font-sans">
                        {t.symbol}
                        <span className="block text-[10px] text-gray-400 font-mono font-normal">{t.sector}</span>
                      </td>
                      <td className="py-3.5 px-4">{getSetupBadge(t.setupType)}</td>
                      <td className="py-3.5 px-4 text-gray-400">{t.entryDate}</td>
                      <td className="py-3.5 px-4 text-right text-gray-300 font-bold">₹{t.entryPrice}</td>
                      <td className="py-3.5 px-4 text-right text-gray-300">{t.quantity}</td>
                      <td className="py-3.5 px-4 text-right text-white font-bold">₹{t.currentPrice}</td>
                      <td className="py-3.5 px-4 text-right text-rose-400">₹{t.stopLoss}</td>
                      <td className="py-3.5 px-4 text-right text-emerald-400">₹{t.target1} / ₹{t.target2}</td>
                      <td className={`py-3.5 px-4 text-right font-bold ${t.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatCurrency(t.pnl)} ({formatPercent(t.pnlPercent)})
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => {
                            setTradeToClose(t);
                            setCloseExitPrice(t.currentPrice.toString());
                          }}
                          className="px-2.5 py-1 rounded bg-gray-800 hover:bg-rose-500/20 text-rose-300 border border-gray-700 hover:border-rose-500/40 text-[11px] font-semibold transition-all"
                        >
                          Close Trade
                        </button>
                      </td>
                    </tr>
                  ))}
                  {paperTrades.filter(t => t.status === 'ACTIVE').length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-gray-400 font-sans">
                        No active paper positions. Browse the Candidate Scanner to initiate paper swing trades.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Closed Trades History */}
          {paperTrades.filter(t => t.status !== 'ACTIVE').length > 0 && (
            <div className="bg-[#131B2E] rounded-2xl border border-gray-800/60 shadow-xl overflow-hidden">
              <div className="p-5 border-b border-gray-800/80">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-gray-400" />
                  Closed Paper Trades History
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#0E1422] text-gray-400 uppercase text-[10px] border-b border-gray-800">
                    <tr>
                      <th className="py-3 px-4">Stock</th>
                      <th className="py-3 px-4">Setup</th>
                      <th className="py-3 px-4">Entry Date</th>
                      <th className="py-3 px-4">Exit Date</th>
                      <th className="py-3 px-4 text-right">Entry</th>
                      <th className="py-3 px-4 text-right">Exit</th>
                      <th className="py-3 px-4 text-right">Final P/L</th>
                      <th className="py-3 px-4">Outcome</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {paperTrades.filter(t => t.status !== 'ACTIVE').map(t => (
                      <tr key={t.id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-white font-sans">{t.symbol}</td>
                        <td className="py-3 px-4">{getSetupBadge(t.setupType)}</td>
                        <td className="py-3 px-4 text-gray-400">{t.entryDate}</td>
                        <td className="py-3 px-4 text-gray-400">{t.exitDate || '—'}</td>
                        <td className="py-3 px-4 text-right text-gray-300">₹{t.entryPrice}</td>
                        <td className="py-3 px-4 text-right text-white font-bold">₹{t.exitPrice || t.currentPrice}</td>
                        <td className={`py-3 px-4 text-right font-bold ${t.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {formatCurrency(t.pnl)} ({formatPercent(t.pnlPercent)})
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${t.pnl >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                            {t.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Close Trade Modal */}
          {tradeToClose && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <div className="bg-[#131B2E] border border-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                  <h3 className="text-base font-bold text-white">
                    Close Paper Trade: {tradeToClose.symbol}
                  </h3>
                  <button
                    onClick={() => setTradeToClose(null)}
                    className="p-1 rounded-lg text-gray-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div>
                  <label className="text-xs text-gray-400 font-mono block mb-1">
                    Exit Price (₹)
                  </label>
                  <input
                    type="number"
                    value={closeExitPrice}
                    onChange={e => setCloseExitPrice(e.target.value)}
                    className="w-full bg-[#0E1422] border border-gray-800 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 font-mono block mb-1">
                    Exit Journal / Notes
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Target 1 achieved, locking gains before earnings..."
                    value={closeExitNotes}
                    onChange={e => setCloseExitNotes(e.target.value)}
                    className="w-full bg-[#0E1422] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-800">
                  <button
                    onClick={() => setTradeToClose(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmCloseTrade}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
                  >
                    Confirm & Record Exit
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* TAB 6: BACKTEST LABORATORY                                               */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'backtest' && (
        <div className="space-y-6">
          <div className="bg-[#131B2E] p-6 rounded-2xl border border-gray-800/60 shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-800/80">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400">
                  Quantitative Verification
                </span>
                <h3 className="text-xl font-bold text-white mt-0.5">
                  {SWING_STRATEGY_BACKTEST.strategyName}
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Validated sample: {SWING_STRATEGY_BACKTEST.samplePeriod} ({SWING_STRATEGY_BACKTEST.totalSetups} Trades executed).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Annualized Alpha: +{SWING_STRATEGY_BACKTEST.annualizedAlphaPercent}%
                </span>
              </div>
            </div>

            {/* Performance KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#0E1422] p-4 rounded-xl border border-emerald-500/30">
                <p className="text-[10px] text-gray-400 font-mono uppercase">Strategy Win Rate</p>
                <p className="text-2xl font-black text-emerald-400 font-mono mt-1">
                  {SWING_STRATEGY_BACKTEST.winRate}%
                </p>
                <p className="text-[10px] text-gray-400 font-mono mt-1">
                  {SWING_STRATEGY_BACKTEST.winningTrades} Wins / {SWING_STRATEGY_BACKTEST.losingTrades} Losses
                </p>
              </div>

              <div className="bg-[#0E1422] p-4 rounded-xl border border-cyan-500/30">
                <p className="text-[10px] text-gray-400 font-mono uppercase">Profit Factor</p>
                <p className="text-2xl font-black text-cyan-300 font-mono mt-1">
                  {SWING_STRATEGY_BACKTEST.profitFactor}x
                </p>
                <p className="text-[10px] text-gray-400 font-mono mt-1">
                  Expectancy: +{SWING_STRATEGY_BACKTEST.expectancy}R per trade
                </p>
              </div>

              <div className="bg-[#0E1422] p-4 rounded-xl border border-gray-800">
                <p className="text-[10px] text-gray-400 font-mono uppercase">Avg Win / Avg Loss</p>
                <p className="text-xl font-bold text-white font-mono mt-1">
                  <span className="text-emerald-400">+{SWING_STRATEGY_BACKTEST.avgGainPercent}%</span> / <span className="text-rose-400">-{SWING_STRATEGY_BACKTEST.avgLossPercent}%</span>
                </p>
                <p className="text-[10px] text-gray-400 font-mono mt-1">
                  Win/Loss Ratio: {(SWING_STRATEGY_BACKTEST.avgGainPercent / SWING_STRATEGY_BACKTEST.avgLossPercent).toFixed(2)}x
                </p>
              </div>

              <div className="bg-[#0E1422] p-4 rounded-xl border border-gray-800">
                <p className="text-[10px] text-gray-400 font-mono uppercase">Max Drawdown</p>
                <p className="text-2xl font-black text-amber-400 font-mono mt-1">
                  -{SWING_STRATEGY_BACKTEST.maxDrawdownPercent}%
                </p>
                <p className="text-[10px] text-gray-400 font-mono mt-1">
                  Avg Duration: {SWING_STRATEGY_BACKTEST.avgHoldingDays} days (~6.2W)
                </p>
              </div>
            </div>

            {/* Cumulative Return Comparison */}
            <div className="bg-[#0E1422] p-5 rounded-xl border border-gray-800/80 space-y-3">
              <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                Strategy Net Return vs Benchmark Nifty 50 (3-Year Total)
              </h4>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-cyan-400 font-bold">Institutional Swing Strategy (Net of Slippage & Fees)</span>
                    <span className="text-emerald-400 font-bold">+{SWING_STRATEGY_BACKTEST.strategyNetReturnPercent}%</span>
                  </div>
                  <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                    <div style={{ width: '88.6%' }} className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-gray-400">NSE Nifty 50 Index (Buy & Hold Benchmark)</span>
                    <span className="text-gray-300 font-semibold">+{SWING_STRATEGY_BACKTEST.benchmarkNiftyReturnPercent}%</span>
                  </div>
                  <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                    <div style={{ width: '48.2%' }} className="h-full bg-gray-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Transaction Cost Model & Assumptions */}
            <div className="bg-[#0E1422]/60 p-4 rounded-xl border border-gray-800/80">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-cyan-400" /> Backtest Methodology & Friction Modeling
              </h4>
              <p className="text-xs text-gray-300 leading-relaxed">
                {SWING_STRATEGY_BACKTEST.assumptions} All trade signals required both daily volume expansion confirmation and minimum 200-day EMA trend alignment.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
