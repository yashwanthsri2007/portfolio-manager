import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, TrendingUp, TrendingDown, Minus, Star, X,
  Sparkles, Filter, AlertCircle, CheckCircle, Clock, ExternalLink
} from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext';
import { getStoredGeminiKey } from '../../services/aiService';

interface EarningsEntry {
  company: string;
  symbol: string;
  resultDate: string;
  expectedEPS: number;
  previousEPS: number;
  yoyGrowth: number;
  analystRating: 'BUY' | 'HOLD' | 'SELL' | 'OUTPERFORM';
  actualEPS?: number;
}

const EARNINGS_DATA: EarningsEntry[] = [
  { company: 'TCS', symbol: 'TCS', resultDate: '2026-11-21', expectedEPS: 29.5, previousEPS: 27.1, yoyGrowth: 8.9, analystRating: 'BUY' },
  { company: 'Infosys', symbol: 'INFY', resultDate: '2026-11-24', expectedEPS: 18.9, previousEPS: 17.4, yoyGrowth: 8.6, analystRating: 'BUY' },
  { company: 'Wipro', symbol: 'WIPRO', resultDate: '2026-11-26', expectedEPS: 6.1, previousEPS: 5.7, yoyGrowth: 7.0, analystRating: 'HOLD' },
  { company: 'HDFC Bank', symbol: 'HDFCBANK', resultDate: '2026-11-19', expectedEPS: 20.4, previousEPS: 18.9, yoyGrowth: 7.9, analystRating: 'BUY' },
  { company: 'Reliance Industries', symbol: 'RELIANCE', resultDate: '2026-12-02', expectedEPS: 29.8, previousEPS: 28.2, yoyGrowth: 5.7, analystRating: 'OUTPERFORM' },
  { company: 'ITC Ltd', symbol: 'ITC', resultDate: '2026-12-05', expectedEPS: 5.3, previousEPS: 4.9, yoyGrowth: 8.2, analystRating: 'BUY' },
  { company: 'Bajaj Finance', symbol: 'BAJFINANCE', resultDate: '2026-11-22', expectedEPS: 86.4, previousEPS: 79.2, yoyGrowth: 9.1, analystRating: 'BUY' },
  { company: 'Maruti Suzuki', symbol: 'MARUTI', resultDate: '2026-11-28', expectedEPS: 158.2, previousEPS: 148.7, yoyGrowth: 6.4, analystRating: 'HOLD' },
  { company: 'Tata Motors', symbol: 'TATAMOTORS', resultDate: '2026-11-30', expectedEPS: 22.1, previousEPS: 19.8, yoyGrowth: 11.6, analystRating: 'OUTPERFORM' },
  { company: 'Asian Paints', symbol: 'ASIANPAINT', resultDate: '2026-12-08', expectedEPS: 28.3, previousEPS: 30.1, yoyGrowth: -6.0, analystRating: 'HOLD' },
  { company: 'Larsen & Toubro', symbol: 'LT', resultDate: '2026-11-25', expectedEPS: 32.8, previousEPS: 30.4, yoyGrowth: 7.9, analystRating: 'BUY' },
  { company: 'Sun Pharmaceutical', symbol: 'SUNPHARMA', resultDate: '2026-11-27', expectedEPS: 15.9, previousEPS: 14.2, yoyGrowth: 12.0, analystRating: 'BUY' },
  { company: 'Axis Bank', symbol: 'AXISBANK', resultDate: '2026-11-20', expectedEPS: 24.1, previousEPS: 22.3, yoyGrowth: 8.1, analystRating: 'OUTPERFORM' },
  { company: 'ICICI Bank', symbol: 'ICICIBANK', resultDate: '2026-11-18', expectedEPS: 16.8, previousEPS: 15.4, yoyGrowth: 9.1, analystRating: 'BUY' },
  { company: 'Titan Company', symbol: 'TITAN', resultDate: '2026-12-04', expectedEPS: 12.4, previousEPS: 11.0, yoyGrowth: 12.7, analystRating: 'HOLD' },
];

const ratingColor: Record<string, string> = {
  BUY: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  HOLD: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  SELL: 'text-red-400 bg-red-500/10 border-red-500/30',
  OUTPERFORM: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
};

const daysUntil = (dateStr: string) => Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

export const EarningsCalendarPage: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
  const { holdings } = usePortfolio();
  const [filterTab, setFilterTab] = useState<'all' | 'holdings'>('all');
  const [aiModal, setAiModal] = useState<{ company: string; text: string; loading: boolean } | null>(null);
  const [actualEPS, setActualEPS] = useState<Record<string, string>>({});
  const [showEPSInput, setShowEPSInput] = useState<string | null>(null);

  const holdingSymbols = useMemo(() => new Set(holdings.map(h => h.symbol.toUpperCase())), [holdings]);

  const filteredData = useMemo(() => {
    const data = filterTab === 'holdings'
      ? EARNINGS_DATA.filter(e => holdingSymbols.has(e.symbol))
      : EARNINGS_DATA;
    return data.sort((a, b) => new Date(a.resultDate).getTime() - new Date(b.resultDate).getTime());
  }, [filterTab, holdingSymbols]);

  const hasGeminiKey = !!getStoredGeminiKey();

  const fetchAISummary = async (company: string) => {
    setAiModal({ company, text: '', loading: true });
    try {
      const geminiKey = getStoredGeminiKey();
      const res = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-key': geminiKey,
        },
        body: JSON.stringify({
          prompt: `Summarize what analysts expect for ${company} Q3FY25 results, key metrics to watch, and any risks. Keep it under 150 words.`,
          model: 'gemini-2.0-flash',
        }),
      });
      const data = await res.json();
      setAiModal({ company, text: data.text || data.error || 'No response', loading: false });
    } catch (e: any) {
      setAiModal({ company, text: `Error: ${e.message}`, loading: false });
    }
  };

  const getSurprise = (symbol: string, expectedEPS: number) => {
    const actual = parseFloat(actualEPS[symbol] || '');
    if (isNaN(actual)) return null;
    const diff = ((actual - expectedEPS) / Math.abs(expectedEPS)) * 100;
    if (diff > 2) return { label: `Beat +${diff.toFixed(1)}%`, color: 'text-emerald-400 bg-emerald-500/10' };
    if (diff < -2) return { label: `Miss ${diff.toFixed(1)}%`, color: 'text-red-400 bg-red-500/10' };
    return { label: 'Inline', color: 'text-gray-400 bg-gray-700/50' };
  };

  const cardClass = 'bg-gray-900/50 backdrop-blur border border-gray-700/50 rounded-2xl p-6';

  const thisWeek = filteredData.filter(e => { const d = daysUntil(e.resultDate); return d >= 0 && d <= 7; });

  return (
    <div className="p-6 space-y-6 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calendar className="text-violet-400" size={28} /> Earnings Calendar AI
          </h1>
          <p className="text-gray-400 text-sm mt-1">Q3FY25 Earnings — Major NSE Companies</p>
        </div>
      </div>

      {/* This week highlights */}
      {thisWeek.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
          <p className="text-amber-300 font-semibold flex items-center gap-2 mb-2"><Clock size={16} /> This Week ({thisWeek.length} results)</p>
          <div className="flex gap-2 flex-wrap">
            {thisWeek.map(e => (
              <span key={e.symbol} className="px-3 py-1 bg-amber-500/20 text-amber-200 text-xs rounded-full border border-amber-500/30">
                {e.company} — {e.resultDate} ({daysUntil(e.resultDate)}d)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['all', 'holdings'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilterTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all flex items-center gap-2 ${filterTab === tab ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40' : 'text-gray-400 hover:text-white'}`}
          >
            {tab === 'holdings' && <Filter size={14} />}
            {tab === 'all' ? 'All Companies' : 'My Holdings'}
            {tab === 'holdings' && <span className="text-xs bg-violet-500/30 px-1.5 py-0.5 rounded-full">{holdingSymbols.size}</span>}
          </button>
        ))}
      </div>

      {!hasGeminiKey && (
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle size={18} className="text-amber-400 shrink-0" />
          <p className="text-gray-300 text-sm">Configure your AI API key in <button onClick={() => onNavigate('settings')} className="text-cyan-400 hover:underline">Settings</button> to enable AI summaries.</p>
        </div>
      )}

      {/* Table */}
      <div className={cardClass}>
        {filterTab === 'holdings' && filteredData.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Filter size={40} className="mx-auto mb-3 opacity-30" />
            <p>None of your holdings have upcoming earnings. <button className="text-cyan-400 hover:underline" onClick={() => setFilterTab('all')}>View all companies</button></p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700/50">
                  {['Company', 'Symbol', 'Result Date', 'Exp EPS', 'Prev EPS', 'YoY%', 'Rating', 'Actual EPS', 'Surprise', 'AI'].map(h => (
                    <th key={h} className="text-left pb-3 pr-3 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredData.map(e => {
                  const days = daysUntil(e.resultDate);
                  const surprise = getSurprise(e.symbol, e.expectedEPS);
                  const isMyHolding = holdingSymbols.has(e.symbol);
                  return (
                    <tr key={e.symbol} className={`border-b border-gray-800/50 hover:bg-white/5 transition-colors ${isMyHolding ? 'bg-cyan-500/5' : ''}`}>
                      <td className="py-3 pr-3 font-medium text-white">
                        {e.company}
                        {isMyHolding && <span className="ml-2 text-xs text-cyan-400">★</span>}
                      </td>
                      <td className="py-3 pr-3 text-cyan-400 font-mono">{e.symbol}</td>
                      <td className="py-3 pr-3">
                        <span className="text-gray-300">{e.resultDate}</span>
                        {days >= 0 && days <= 7 && (
                          <span className="ml-2 px-1.5 py-0.5 bg-amber-500/20 text-amber-300 text-xs rounded-full">{days}d</span>
                        )}
                      </td>
                      <td className="py-3 pr-3 text-white">₹{e.expectedEPS}</td>
                      <td className="py-3 pr-3 text-gray-400">₹{e.previousEPS}</td>
                      <td className={`py-3 pr-3 font-medium ${e.yoyGrowth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {e.yoyGrowth >= 0 ? '+' : ''}{e.yoyGrowth}%
                      </td>
                      <td className="py-3 pr-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${ratingColor[e.analystRating]}`}>
                          {e.analystRating}
                        </span>
                      </td>
                      <td className="py-3 pr-3">
                        {showEPSInput === e.symbol ? (
                          <input
                            autoFocus
                            type="number"
                            value={actualEPS[e.symbol] || ''}
                            onChange={ev => setActualEPS(prev => ({ ...prev, [e.symbol]: ev.target.value }))}
                            onBlur={() => setShowEPSInput(null)}
                            placeholder="Enter EPS"
                            className="w-24 bg-gray-800 border border-gray-600 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-cyan-500"
                          />
                        ) : (
                          <button onClick={() => setShowEPSInput(e.symbol)} className="text-xs text-gray-500 hover:text-cyan-400 transition-colors">
                            {actualEPS[e.symbol] ? `₹${actualEPS[e.symbol]}` : '+ Enter'}
                          </button>
                        )}
                      </td>
                      <td className="py-3 pr-3">
                        {surprise ? (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${surprise.color}`}>{surprise.label}</span>
                        ) : <span className="text-gray-600 text-xs">—</span>}
                      </td>
                      <td className="py-3">
                        <button
                          onClick={() => hasGeminiKey ? fetchAISummary(e.company) : onNavigate('settings')}
                          className="flex items-center gap-1 px-2 py-1 bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 text-violet-300 text-xs rounded-lg transition-all"
                        >
                          <Sparkles size={12} /> AI
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* AI Modal */}
      <AnimatePresence>
        {aiModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-gray-900 border border-violet-500/30 rounded-2xl p-6 w-full max-w-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-semibold flex items-center gap-2"><Sparkles size={18} className="text-violet-400" /> AI Summary — {aiModal.company}</h3>
                <button onClick={() => setAiModal(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
              </div>
              {aiModal.loading ? (
                <div className="flex items-center gap-3 py-8 justify-center">
                  <div className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-gray-400">Fetching AI analysis...</span>
                </div>
              ) : (
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{aiModal.text}</p>
              )}
              <button onClick={() => setAiModal(null)} className="mt-4 w-full py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-gray-300 text-sm transition-colors">Close</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
