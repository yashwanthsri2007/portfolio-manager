// src/components/market/MarketIntelligence.tsx
// Comprehensive Market Intelligence: Indian Market News, Holding-Specific News Filtering,
// Corporate Events & Earnings Calendar, and Indian IPO Tracker.

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Globe, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  ShieldAlert, 
  Flame, 
  ExternalLink, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Sparkles,
  BarChart2,
  DollarSign,
  Radio,
  Calendar,
  Rocket,
  Filter,
  Check,
  Tag,
  Star,
  Layers,
  FileText
} from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext';
import { useSettings } from '../../context/SettingsContext';
import { calculatePortfolioSentiment } from '../../services/sentimentService';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { Modal } from '../common/Modal';
import {
  INDIAN_MARKET_NEWS,
  filterNewsForHoldings,
  CORPORATE_EVENTS_CALENDAR,
  filterEventsForHoldings,
  INDIAN_IPOS,
  type IndianNewsItem,
  type CorporateEvent,
  type IPOItem
} from '../../services/indianMarketService';

export interface MarketIntelligenceProps {
  onNavigate?: (page: string, data?: any) => void;
}

interface MarketIndexItem {
  id: string;
  name: string;
  region: string;
  value: string;
  change: string;
  changePercent: number;
  isPositive: boolean;
}

const MARKET_INDICES: MarketIndexItem[] = [
  { id: 'nifty', name: 'NIFTY 50', region: 'NSE India', value: '24,842.10', change: '+142.30', changePercent: 0.58, isPositive: true },
  { id: 'sensex', name: 'SENSEX', region: 'BSE India', value: '81,385.50', change: '+410.20', changePercent: 0.51, isPositive: true },
  { id: 'giftnifty', name: 'GIFT NIFTY', region: 'NSE IX', value: '24,925.00', change: '+82.00', changePercent: 0.33, isPositive: true },
  { id: 'nasdaq', name: 'NASDAQ 100', region: 'US Tech', value: '18,518.60', change: '-64.20', changePercent: -0.35, isPositive: false },
  { id: 'sp500', name: 'S&P 500', region: 'US Broad', value: '5,815.20', change: '+12.40', changePercent: 0.21, isPositive: true },
  { id: 'gold', name: 'Gold (10g)', region: 'MCX Spot', value: '₹78,450', change: '+420.00', changePercent: 0.54, isPositive: true },
  { id: 'silver', name: 'Silver (1kg)', region: 'MCX Spot', value: '₹93,200', change: '+1,150.00', changePercent: 1.25, isPositive: true },
  { id: 'usdinr', name: 'USD / INR', region: 'Forex Spot', value: '84.08', change: '+0.04', changePercent: 0.05, isPositive: true }
];

export const MarketIntelligence: React.FC<MarketIntelligenceProps> = ({ onNavigate }) => {
  const { news, metrics, holdings, refreshMarketData, isRefreshing } = usePortfolio();
  const { settings } = useSettings();

  // Navigation Sub-tabs
  const [activeTab, setActiveTab] = useState<'news' | 'events' | 'ipos' | 'macro'>('news');

  // News Filtering: All Indian News vs My Holdings Only
  const [newsScope, setNewsScope] = useState<'all' | 'holdings'>('holdings');
  const [newsSentimentFilter, setNewsSentimentFilter] = useState<'all' | 'BULLISH' | 'BEARISH' | 'NEUTRAL'>('all');

  // Events Filtering
  const [eventScope, setEventScope] = useState<'all' | 'holdings'>('holdings');

  // IPO State
  const [selectedIPO, setSelectedIPO] = useState<IPOItem | null>(null);
  const [isIPOModalOpen, setIsIPOModalOpen] = useState(false);
  const [ipoWatchlist, setIpoWatchlist] = useState<string[]>(['ipo-1']);

  // Filtered Indian News
  const displayedNews = useMemo(() => {
    let list = newsScope === 'holdings'
      ? filterNewsForHoldings(INDIAN_MARKET_NEWS, holdings)
      : INDIAN_MARKET_NEWS;

    if (newsSentimentFilter !== 'all') {
      list = list.filter(item => item.sentiment === newsSentimentFilter);
    }
    return list;
  }, [newsScope, newsSentimentFilter, holdings]);

  // Filtered Corporate Events
  const displayedEvents = useMemo(() => {
    const list = filterEventsForHoldings(CORPORATE_EVENTS_CALENDAR, holdings);
    if (eventScope === 'holdings') {
      const heldOnly = list.filter(e => e.isHeldByUser);
      return heldOnly.length > 0 ? heldOnly : list;
    }
    return list;
  }, [eventScope, holdings]);

  // Sentiment analysis calculation
  const sentimentAnalysis = calculatePortfolioSentiment(news);
  const score = metrics.portfolioSentimentScore ?? sentimentAnalysis.score ?? 50;
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const toggleIpoWatchlist = (ipoId: string) => {
    setIpoWatchlist(prev =>
      prev.includes(ipoId) ? prev.filter(id => id !== ipoId) : [...prev, ipoId]
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-4 h-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400 shadow-[0_0_10px_#06B6D4]"></span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-wider text-gray-100 flex items-center gap-2">
              MARKET <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">INTELLIGENCE</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-widest bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 uppercase">
              RADAR ACTIVE
            </span>
          </div>
          <p className="text-xs text-gray-400 font-mono mt-1">
            Indian market news, holding-filtered catalysts, corporate action calendars & IPO trackers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refreshMarketData()}
            disabled={isRefreshing}
            className="px-3.5 py-2 rounded-xl bg-gray-900/80 hover:bg-gray-800 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Scanning...' : 'Scan Feeds'}</span>
          </button>
          {onNavigate && (
            <button
              onClick={() => onNavigate('ai_advisor')}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:opacity-95 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask AI Advisor</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Sub-Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-gray-800/80 pb-3 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('news')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-2 ${
            activeTab === 'news'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Indian Market News</span>
        </button>

        <button
          onClick={() => setActiveTab('events')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-2 ${
            activeTab === 'events'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Earnings & Corporate Events</span>
        </button>

        <button
          onClick={() => setActiveTab('ipos')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-2 ${
            activeTab === 'ipos'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Rocket className="w-4 h-4" />
          <span>Indian IPO Tracker</span>
        </button>

        <button
          onClick={() => setActiveTab('macro')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-2 ${
            activeTab === 'macro'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>Global Indices & Macro</span>
        </button>
      </div>

      {/* ─── TAB 1: INDIAN MARKET NEWS ─────────────────────────────────────── */}
      {activeTab === 'news' && (
        <div className="space-y-4">
          {/* Controls Bar: Scope & Sentiment Filter */}
          <div className="p-3.5 rounded-2xl bg-gray-900/60 border border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 font-mono text-[11px] shrink-0">News Scope:</span>
              <div className="flex items-center gap-1 p-0.5 bg-black/60 rounded-xl border border-gray-800">
                <button
                  type="button"
                  onClick={() => setNewsScope('holdings')}
                  className={`px-3 py-1.5 rounded-lg font-bold font-mono transition-all ${
                    newsScope === 'holdings'
                      ? 'bg-cyan-500 text-black shadow-sm'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  My Holdings Only ({holdings.length})
                </button>
                <button
                  type="button"
                  onClick={() => setNewsScope('all')}
                  className={`px-3 py-1.5 rounded-lg font-bold font-mono transition-all ${
                    newsScope === 'all'
                      ? 'bg-cyan-500 text-black shadow-sm'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  All Indian News
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-gray-400 font-mono text-[11px] shrink-0">Sentiment:</span>
              <div className="flex items-center gap-1">
                {(['all', 'BULLISH', 'BEARISH', 'NEUTRAL'] as const).map((sent) => (
                  <button
                    key={sent}
                    type="button"
                    onClick={() => setNewsSentimentFilter(sent)}
                    className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold transition-all ${
                      newsSentimentFilter === sent
                        ? 'bg-gray-800 text-cyan-300 border border-cyan-500/40'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {sent}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* News Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedNews.map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-2xl bg-[#0E1422]/90 border border-gray-800/80 hover:border-gray-700 transition-all flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        item.sentiment === 'BULLISH'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : item.sentiment === 'BEARISH'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      }`}
                    >
                      {item.sentiment}
                    </span>

                    <span className="text-[10px] text-gray-500 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{item.publishedAt} • {item.source}</span>
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-gray-100 leading-snug">
                    {item.title}
                  </h3>

                  <p className="text-xs text-gray-400 leading-relaxed font-sans">
                    {item.summary}
                  </p>

                  {/* Impact Summary */}
                  <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800/80 text-xs text-gray-300 font-sans leading-relaxed">
                    <strong className="text-cyan-400 font-mono text-[11px] block mb-0.5">💡 Analytical Impact:</strong>
                    {item.impact}
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-800/60 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {item.relatedSymbols.map((sym) => (
                      <span
                        key={sym}
                        className="px-2 py-0.5 rounded bg-gray-800 text-[10px] font-mono font-bold text-gray-300"
                      >
                        {sym}
                      </span>
                    ))}
                  </div>

                  {onNavigate && (
                    <button
                      onClick={() => onNavigate('ai_advisor')}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1"
                    >
                      <span>Analyze Impact</span>
                      <span>→</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 2: CORPORATE EVENTS & EARNINGS CALENDAR ────────────────── */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-gray-900/60 border border-gray-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-gray-200">Corporate Actions & Quarterly Results</span>
            </div>

            <div className="flex items-center gap-1 p-0.5 bg-black/60 rounded-xl border border-gray-800">
              <button
                type="button"
                onClick={() => setEventScope('holdings')}
                className={`px-3 py-1 rounded-lg font-bold font-mono text-xs transition-all ${
                  eventScope === 'holdings'
                    ? 'bg-cyan-500 text-black'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                My Holdings Only
              </button>
              <button
                type="button"
                onClick={() => setEventScope('all')}
                className={`px-3 py-1 rounded-lg font-bold font-mono text-xs transition-all ${
                  eventScope === 'all'
                    ? 'bg-cyan-500 text-black'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                All Tracked Equities
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-gray-800 bg-[#0E1422]/60">
            <table className="w-full text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 font-mono text-[11px] bg-gray-900/40">
                  <th className="py-3 px-4">Event Date</th>
                  <th className="py-3 px-4">Symbol / Company</th>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4 text-right">Dividend / Ratio</th>
                  <th className="py-3 px-4 text-center">Portfolio Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 font-mono">
                {displayedEvents.map((ev) => (
                  <tr key={ev.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-cyan-300">
                      {ev.eventDate}
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <div className="font-bold text-gray-100">{ev.companyName}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{ev.symbol}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ev.eventType === 'EARNINGS'
                            ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40'
                            : ev.eventType === 'DIVIDEND'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : ev.eventType === 'SPLIT'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        }`}
                      >
                        {ev.eventType}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans text-gray-300 max-w-xs">
                      {ev.details}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-white">
                      {ev.amountOrRatio || '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {ev.isHeldByUser ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                          In Your Portfolio
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-500 font-mono">Watchlist</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 3: INDIAN IPO TRACKER ────────────────────────────────────── */}
      {activeTab === 'ipos' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-transparent border border-orange-500/30 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Rocket className="w-4 h-4 text-orange-400" />
              <span className="font-bold text-orange-300">Indian Initial Public Offerings (IPO) Radar</span>
            </div>
            <span className="text-[10px] font-mono text-gray-400">
              * GMP: Grey Market Premium is unofficial and indicative.
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-gray-800 bg-[#0E1422]/60">
            <table className="w-full text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 font-mono text-[11px] bg-gray-900/40">
                  <th className="py-3 px-4">Company Name</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Price Band</th>
                  <th className="py-3 px-4 text-right">Lot Size</th>
                  <th className="py-3 px-4 text-right">Min Investment</th>
                  <th className="py-3 px-4">Open - Close</th>
                  <th className="py-3 px-4 text-right">Indicative GMP</th>
                  <th className="py-3 px-4 text-right">Subscription</th>
                  <th className="py-3 px-4 text-center">AI Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 font-mono">
                {INDIAN_IPOS.map((ipo) => {
                  const isWatched = ipoWatchlist.includes(ipo.id);

                  return (
                    <tr key={ipo.id} className="hover:bg-gray-800/30 transition-colors">
                      <td className="py-3 px-4 font-sans">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleIpoWatchlist(ipo.id)}
                            className={isWatched ? 'text-amber-400' : 'text-gray-600 hover:text-gray-400'}
                          >
                            <Star className="w-3.5 h-3.5 fill-current" />
                          </button>
                          <div>
                            <div className="font-bold text-gray-100">{ipo.name}</div>
                            <div className="text-[10px] text-gray-400 font-mono">{ipo.symbol} • {ipo.issueSize}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            ipo.status === 'LIVE'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
                              : ipo.status === 'UPCOMING'
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                              : ipo.status === 'CLOSED'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-gray-800 text-gray-400'
                          }`}
                        >
                          {ipo.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-white">
                        {ipo.priceBand}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-300">
                        {ipo.lotSize} shares
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-white">
                        ₹{ipo.minInvestment.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-[11px]">
                        {ipo.openDate} to {ipo.closeDate}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-400">
                        {ipo.gmp} ({ipo.gmpPercent}%)
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-cyan-300">
                        {ipo.subscription.total > 0 ? `${ipo.subscription.total}x` : '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedIPO(ipo);
                            setIsIPOModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[11px] font-semibold transition-all inline-flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3 text-cyan-400" />
                          <span>AI Brief</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* AI IPO Summary Modal */}
          <Modal
            isOpen={isIPOModalOpen}
            onClose={() => setIsIPOModalOpen(false)}
            title={`IPO Analysis: ${selectedIPO?.name}`}
          >
            {selectedIPO && (
              <div className="space-y-4 text-xs font-sans">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                  <div className="p-2.5 rounded-xl bg-gray-900 border border-gray-800">
                    <div className="text-[10px] text-gray-400">Price Band</div>
                    <div className="text-sm font-bold text-white mt-0.5">{selectedIPO.priceBand}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-gray-900 border border-gray-800">
                    <div className="text-[10px] text-gray-400">Issue Size</div>
                    <div className="text-sm font-bold text-white mt-0.5">{selectedIPO.issueSize}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-gray-900 border border-gray-800">
                    <div className="text-[10px] text-gray-400">Indicative GMP</div>
                    <div className="text-sm font-bold text-emerald-400 mt-0.5">{selectedIPO.gmp}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-gray-900 border border-gray-800">
                    <div className="text-[10px] text-gray-400">Subscription</div>
                    <div className="text-sm font-bold text-cyan-300 mt-0.5">{selectedIPO.subscription.total}x Total</div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 space-y-2">
                  <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span>AI Strategic Analysis & Verdict</span>
                  </div>
                  <p className="text-gray-200 leading-relaxed font-sans">
                    {selectedIPO.aiAnalysis}
                  </p>
                </div>

                <div className="text-[10px] text-gray-500 font-mono">
                  * All IPO evaluations are analytical assessments. Always consult official Red Herring Prospectus (RHP) before applying.
                </div>
              </div>
            )}
          </Modal>
        </div>
      )}

      {/* ─── TAB 4: GLOBAL INDICES & MACRO RADAR ───────────────────────────── */}
      {activeTab === 'macro' && (
        <div className="space-y-8">
          {/* Index Ticker Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {MARKET_INDICES.map((idx) => (
              <div
                key={idx.id}
                className="glass-card p-3 rounded-xl border border-white/[0.06] flex flex-col justify-between"
              >
                <div>
                  <div className="text-[10px] font-mono text-gray-400">{idx.name}</div>
                  <div className="text-[9px] text-gray-500 font-mono">{idx.region}</div>
                </div>
                <div className="mt-2">
                  <div className="text-sm font-bold font-mono text-gray-100">{idx.value}</div>
                  <div className={`text-[10px] font-mono font-semibold flex items-center gap-0.5 ${idx.isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {idx.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    <span>{idx.changePercent}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Macro Gauge & Signals */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="glass-card rounded-2xl p-6 border border-white/[0.08] flex flex-col items-center justify-center text-center">
              <div className="relative flex items-center justify-center">
                <svg className="w-40 h-40 transform -rotate-90">
                  <circle cx="80" cy="80" r={radius} stroke="currentColor" strokeWidth="12" className="text-gray-800" fill="transparent" />
                  <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    stroke={score >= 60 ? '#10B981' : score <= 40 ? '#EF4444' : '#F59E0B'}
                    strokeWidth="12"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black font-mono text-white">{score}</span>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">/ 100</span>
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-base font-bold text-gray-100">Macro Sentiment Meter</h3>
                <p className="text-xs text-gray-400 font-mono">Computed from Indian & Global Financial Signals</p>
              </div>
            </div>

            <div className="lg:col-span-2 glass-card rounded-2xl p-6 border border-white/[0.08] space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-100 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  <span>Macroeconomic Catalysts</span>
                </h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">
                  Interest rates, foreign institutional flows, and crude oil pricing.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="text-xs text-emerald-400 font-mono font-bold">GDP Expansion</div>
                  <div className="text-sm font-bold text-white mt-1">7.2% Projected</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">Domestic demand sturdy</div>
                </div>

                <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                  <div className="text-xs text-cyan-400 font-mono font-bold">Crude Oil (Brent)</div>
                  <div className="text-sm font-bold text-white mt-1">$74.20 / bbl</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">Easing fiscal import burden</div>
                </div>

                <div className="p-3.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
                  <div className="text-xs text-violet-400 font-mono font-bold">RBI Policy Rate</div>
                  <div className="text-sm font-bold text-white mt-1">6.50% Paused</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">Focus on 4% CPI glidepath</div>
                </div>
              </div>

              <div className="text-xs text-gray-400 font-mono pt-2 border-t border-gray-800">
                Institutional Telemetry: Domestic Mutual Funds (DII) net purchased ₹2,400 Cr in recent sessions.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
