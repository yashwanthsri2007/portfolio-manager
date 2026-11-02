import React, { useState } from 'react';
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
  Radio
} from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext';
import { useSettings } from '../../context/SettingsContext';
import { calculatePortfolioSentiment } from '../../services/sentimentService';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { NewsItem } from '../../types';

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
  { id: 'nasdaq', name: 'NASDAQ 100', region: 'US Tech', value: '18,518.60', change: '-64.20', changePercent: -0.35, isPositive: false },
  { id: 'sp500', name: 'S&P 500', region: 'US Broad', value: '5,815.20', change: '+12.40', changePercent: 0.21, isPositive: true },
  { id: 'gold', name: 'Gold (10g)', region: 'MCX Spot', value: '₹78,450', change: '+420.00', changePercent: 0.54, isPositive: true },
  { id: 'silver', name: 'Silver (1kg)', region: 'MCX Spot', value: '₹93,200', change: '+1,150.00', changePercent: 1.25, isPositive: true },
  { id: 'usdinr', name: 'USD / INR', region: 'Forex Spot', value: '84.08', change: '+0.04', changePercent: 0.05, isPositive: true }
];

export const MarketIntelligence: React.FC<MarketIntelligenceProps> = ({ onNavigate }) => {
  const { news, metrics, refreshMarketData, isRefreshing } = usePortfolio();
  const { settings } = useSettings();
  const [selectedSentimentFilter, setSelectedSentimentFilter] = useState<'all' | 'bullish' | 'bearish'>('all');

  const sentimentAnalysis = calculatePortfolioSentiment(news);
  const score = metrics.portfolioSentimentScore ?? sentimentAnalysis.score ?? 50;

  const bullishNews = news.filter(n => n.sentiment === 'bullish');
  const bearishNews = news.filter(n => n.sentiment === 'bearish');

  // Gauge calculations
  const gaugeColor = score >= 65 ? '#10B981' : score <= 40 ? '#EF4444' : '#F59E0B';
  const gaugeLabel = score >= 65 ? 'Bullish' : score <= 40 ? 'Bearish' : 'Neutral';
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="space-y-8 pb-12">
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
            Real-time sentiment telemetry, catalytic news feeds & macroeconomic indicators
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refreshMarketData()}
            disabled={isRefreshing}
            className="px-4 py-2 rounded-xl bg-gray-900/80 hover:bg-gray-800 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)] disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            <span>{isRefreshing ? 'Refreshing Radar...' : 'Scan Feeds'}</span>
          </button>
          {onNavigate && (
            <button
              onClick={() => onNavigate('ai_advisor')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-black font-bold text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask AI Advisor</span>
            </button>
          )}
        </div>
      </div>

      {/* Market Indices Ticker Cards */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            Global Indices & Benchmark Rates
          </h2>
          <span className="text-[10px] text-gray-500 font-mono">Reference Feeds (Delayed 15m)</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {MARKET_INDICES.map((idx) => {
            const isPos = idx.isPositive;
            return (
              <motion.div
                key={idx.id}
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                className="glass-card p-3 rounded-xl border border-white/[0.07] hover:border-cyan-500/40 transition-all flex flex-col justify-between"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-xs text-gray-200">{idx.name}</h3>
                    <span className="text-[10px] text-gray-500 font-mono">{idx.region}</span>
                  </div>
                  {isPos ? (
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  )}
                </div>

                <div className="mt-2.5">
                  <div className="text-sm font-black font-mono text-gray-100">{idx.value}</div>
                  <div className={`text-[11px] font-mono font-semibold flex items-center gap-1 ${isPos ? 'text-emerald-400' : 'text-red-400'}`}>
                    <span>{idx.change}</span>
                    <span>({isPos ? '+' : ''}{idx.changePercent}%)</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Sentiment Gauge & Holding Driver Summary */}
      <section className="glass-card p-6 rounded-2xl border border-white/[0.08] relative overflow-hidden bg-gradient-to-r from-[#111827]/80 via-[#151C2B]/80 to-[#182033]/80">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          {/* Gauge Visualization */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 lg:border-r border-gray-800/80 pr-0 lg:pr-6">
            <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 160 160">
                {/* Background Ring */}
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  stroke="#1F2937"
                  strokeWidth="12"
                  fill="transparent"
                />
                {/* Gauge Ring */}
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  stroke={gaugeColor}
                  strokeWidth="12"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-1000 ease-out"
                  style={{
                    filter: `drop-shadow(0 0 8px ${gaugeColor})`
                  }}
                />
              </svg>
              {/* Center Text */}
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-black font-mono text-gray-100 tracking-tight">
                  {score}
                </span>
                <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">
                  / 100
                </span>
              </div>
            </div>

            <div className="text-center sm:text-left space-y-1.5">
              <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider">
                Portfolio Sentiment Index
              </span>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span 
                  className="text-xl font-black tracking-wide"
                  style={{ color: gaugeColor }}
                >
                  {gaugeLabel.toUpperCase()}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 border border-white/10 text-gray-300">
                  {score >= 65 ? 'High Conviction' : score <= 40 ? 'Risk Caution' : 'Balanced'}
                </span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed max-w-xs">
                Derived from weighted algorithmic news sentiment across your active asset holdings.
              </p>
            </div>
          </div>

          {/* Holdings Driver Analysis */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-cyan-400" />
              Catalyst & Risk Weighting Distribution
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center justify-between text-xs text-emerald-400 font-mono mb-1">
                  <span>Bullish Drivers</span>
                  <span className="font-bold">{sentimentAnalysis.bullishCount} News</span>
                </div>
                <div className="text-sm font-bold text-gray-100 truncate">
                  {sentimentAnalysis.topPositiveHoldings.length > 0 
                    ? sentimentAnalysis.topPositiveHoldings.join(', ')
                    : 'Broad Market Positivity'}
                </div>
                <div className="text-[11px] text-gray-400 mt-1">Expanding margins & orders</div>
              </div>

              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20">
                <div className="flex items-center justify-between text-xs text-red-400 font-mono mb-1">
                  <span>Risk Exposures</span>
                  <span className="font-bold">{sentimentAnalysis.bearishCount} News</span>
                </div>
                <div className="text-sm font-bold text-gray-100 truncate">
                  {sentimentAnalysis.topRiskHoldings.length > 0 
                    ? sentimentAnalysis.topRiskHoldings.join(', ')
                    : 'No Critical Risks Detected'}
                </div>
                <div className="text-[11px] text-gray-400 mt-1">Supply or valuation headwinds</div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center justify-between text-xs text-amber-400 font-mono mb-1">
                  <span>Neutral / Macro</span>
                  <span className="font-bold">{sentimentAnalysis.neutralCount} Signals</span>
                </div>
                <div className="text-sm font-bold text-gray-100 truncate">
                  Monetary Policy & Forex
                </div>
                <div className="text-[11px] text-gray-400 mt-1">Central bank rate trajectory</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between text-xs text-gray-400 pt-1 border-t border-gray-800">
              <span>Overall Net Worth Analyzed: <strong className="text-cyan-300 font-mono">{formatCurrency(metrics.totalNetWorth, settings.currency)}</strong></span>
              <span>Total Sentiment Signals: <strong className="text-gray-200 font-mono">{news.length} items</strong></span>
            </div>
          </div>
        </div>
      </section>

      {/* Two Large Side-by-Side Radar Panels */}
      {news.length === 0 ? (
        <div className="glass-card p-12 rounded-2xl border border-white/[0.08] text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Globe className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-200">No market intelligence available for your current holdings</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
              Add equity or commodity holdings to automatically engage our high-frequency news sentiment engine.
            </p>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('portfolio')}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all"
            >
              Add Holdings Now
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT PANEL: POSITIVE CATALYST RADAR */}
          <div className="glass-card rounded-2xl border border-[#10B981]/30 shadow-[0_0_30px_rgba(16,185,129,0.12)] p-5 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div>
              {/* Radar Title */}
              <div className="flex items-center justify-between pb-4 border-b border-emerald-500/20 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                    <Flame className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black tracking-wider text-emerald-400 flex items-center gap-2">
                      POSITIVE CATALYST RADAR
                    </h2>
                    <span className="text-[10px] text-gray-400 font-mono">BULLISH MARKET VECTOR SIGNALS</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {bullishNews.length} CATALYSTS
                </span>
              </div>

              {/* News List */}
              <div className="space-y-3.5">
                {bullishNews.length === 0 ? (
                  <div className="py-8 text-center text-gray-500 text-xs font-mono">
                    No bullish catalysts currently detected in active scan window.
                  </div>
                ) : (
                  bullishNews.map((item) => (
                    <motion.div
                      key={item.id}
                      whileHover={{ scale: 1.01, transition: { duration: 0.15 } }}
                      className="p-4 rounded-xl bg-[#111827]/75 border border-emerald-500/20 hover:border-emerald-500/40 transition-all space-y-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="text-xs sm:text-sm font-bold text-gray-100 hover:text-emerald-300 transition-colors leading-snug">
                          {item.headline}
                        </h4>
                        {item.relatedSymbol && (
                          <span className="shrink-0 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {item.relatedSymbol}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-400 leading-relaxed">
                        {item.summary}
                      </p>

                      <div className="pt-2 border-t border-gray-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-[11px] text-gray-500 font-mono">
                          <span className="text-gray-300 font-medium">{item.source}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-gray-500" />
                            {item.time}
                          </span>
                        </div>

                        {/* Confidence Metric Bar */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-gray-400">Confidence:</span>
                          <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-400 rounded-full shadow-[0_0_8px_#10B981]"
                              style={{ width: `${Math.round(item.confidence * 100)}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono font-bold text-emerald-400">
                            {Math.round(item.confidence * 100)}%
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: NEGATIVE RISK RADAR */}
          <div className="glass-card rounded-2xl border border-[#EF4444]/30 shadow-[0_0_30px_rgba(239,68,68,0.12)] p-5 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

            <div>
              {/* Radar Title */}
              <div className="flex items-center justify-between pb-4 border-b border-red-500/20 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.3)]">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black tracking-wider text-red-400 flex items-center gap-2">
                      NEGATIVE RISK RADAR
                    </h2>
                    <span className="text-[10px] text-gray-400 font-mono">BEARISH MARKET VECTOR SIGNALS</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-red-500/20 text-red-300 border border-red-500/40">
                  {bearishNews.length} RISKS
                </span>
              </div>

              {/* News List */}
              <div className="space-y-3.5">
                {bearishNews.length === 0 ? (
                  <div className="py-8 text-center text-gray-500 text-xs font-mono">
                    Zero elevated risk triggers detected across current holdings.
                  </div>
                ) : (
                  bearishNews.map((item) => (
                    <motion.div
                      key={item.id}
                      whileHover={{ scale: 1.01, transition: { duration: 0.15 } }}
                      className="p-4 rounded-xl bg-[#111827]/75 border border-red-500/20 hover:border-red-500/40 transition-all space-y-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="text-xs sm:text-sm font-bold text-gray-100 hover:text-red-300 transition-colors leading-snug">
                          {item.headline}
                        </h4>
                        {item.relatedSymbol && (
                          <span className="shrink-0 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                            {item.relatedSymbol}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-400 leading-relaxed">
                        {item.summary}
                      </p>

                      <div className="pt-2 border-t border-gray-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-[11px] text-gray-500 font-mono">
                          <span className="text-gray-300 font-medium">{item.source}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-gray-500" />
                            {item.time}
                          </span>
                        </div>

                        {/* Confidence Metric Bar */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-gray-400">Risk Severity:</span>
                          <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-red-400 rounded-full shadow-[0_0_8px_#EF4444]"
                              style={{ width: `${Math.round(item.confidence * 100)}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono font-bold text-red-400">
                            {Math.round(item.confidence * 100)}%
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketIntelligence;
