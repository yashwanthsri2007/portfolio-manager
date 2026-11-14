import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusCircle, TrendingUp, Calendar, DollarSign, BarChart2,
  RefreshCw, ChevronDown, ChevronUp, X, Calculator, Trash2,
  IndianRupee, Gift
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts';
import { usePortfolio } from '../../context/PortfolioContext';

interface DividendEntry {
  id: string;
  stockName: string;
  symbol: string;
  exDate: string;
  paymentDate: string;
  amountPerShare: number;
  sharesHeld: number;
  totalReceived: number;
  createdAt: string;
}

interface UpcomingDividend {
  company: string;
  symbol: string;
  exDate: string;
  paymentDate: string;
  dividendPerShare: number;
  yield: number;
  frequency: string;
}

const UPCOMING_DIVIDENDS: UpcomingDividend[] = [
  { company: 'TCS', symbol: 'TCS', exDate: '2026-11-20', paymentDate: '2026-12-05', dividendPerShare: 10, yield: 0.26, frequency: 'Quarterly' },
  { company: 'Infosys', symbol: 'INFY', exDate: '2026-11-25', paymentDate: '2026-12-10', dividendPerShare: 21, yield: 1.11, frequency: 'Semi-Annual' },
  { company: 'HUL', symbol: 'HINDUNILVR', exDate: '2026-12-01', paymentDate: '2026-12-18', dividendPerShare: 24, yield: 0.88, frequency: 'Annual' },
  { company: 'ITC', symbol: 'ITC', exDate: '2026-12-05', paymentDate: '2026-12-20', dividendPerShare: 7.5, yield: 2.1, frequency: 'Annual' },
  { company: 'Reliance Industries', symbol: 'RELIANCE', exDate: '2026-12-10', paymentDate: '2026-12-28', dividendPerShare: 10, yield: 0.38, frequency: 'Annual' },
  { company: 'Coal India', symbol: 'COALINDIA', exDate: '2026-11-28', paymentDate: '2026-12-15', dividendPerShare: 15.5, yield: 5.6, frequency: 'Interim' },
  { company: 'HDFC Bank', symbol: 'HDFCBANK', exDate: '2026-12-15', paymentDate: '2026-12-30', dividendPerShare: 19, yield: 1.1, frequency: 'Annual' },
  { company: 'ONGC', symbol: 'ONGC', exDate: '2026-12-08', paymentDate: '2026-12-22', dividendPerShare: 8, yield: 3.4, frequency: 'Interim' },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const STORAGE_KEY = 'portfolio_dividends';

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const daysUntil = (dateStr: string) => {
  const diff = new Date(dateStr).getTime() - new Date().getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export const DividendTracker: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
  const { holdings } = usePortfolio();

  const [dividends, setDividends] = useState<DividendEntry[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'tracker' | 'upcoming' | 'calendar' | 'calculator'>('tracker');

  // Add form state
  const [form, setForm] = useState({
    stockName: '', symbol: '', exDate: '', paymentDate: '',
    amountPerShare: '', sharesHeld: '',
  });

  // Calculator state
  const [calcState, setCalcState] = useState({
    monthlyInvestment: '5000',
    annualYield: '2.5',
    years: '10',
    reinvestmentRate: '100',
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dividends));
  }, [dividends]);

  const handleAddDividend = () => {
    if (!form.stockName || !form.exDate || !form.amountPerShare || !form.sharesHeld) return;
    const aps = parseFloat(form.amountPerShare);
    const sh = parseFloat(form.sharesHeld);
    const entry: DividendEntry = {
      id: `div_${Date.now()}`,
      stockName: form.stockName,
      symbol: form.symbol.toUpperCase(),
      exDate: form.exDate,
      paymentDate: form.paymentDate,
      amountPerShare: aps,
      sharesHeld: sh,
      totalReceived: aps * sh,
      createdAt: new Date().toISOString(),
    };
    setDividends(prev => [entry, ...prev]);
    setForm({ stockName: '', symbol: '', exDate: '', paymentDate: '', amountPerShare: '', sharesHeld: '' });
    setShowAddForm(false);
  };

  // Current FY: April - March
  const currentFYStart = useMemo(() => {
    const now = new Date();
    return now.getMonth() >= 3
      ? new Date(now.getFullYear(), 3, 1)
      : new Date(now.getFullYear() - 1, 3, 1);
  }, []);

  const totalFYDividends = useMemo(() =>
    dividends
      .filter(d => new Date(d.paymentDate || d.exDate) >= currentFYStart)
      .reduce((s, d) => s + d.totalReceived, 0),
    [dividends, currentFYStart]
  );

  const totalAllTime = useMemo(() =>
    dividends.reduce((s, d) => s + d.totalReceived, 0),
    [dividends]
  );

  const nextExDate = useMemo(() => {
    const future = UPCOMING_DIVIDENDS
      .filter(u => daysUntil(u.exDate) >= 0)
      .sort((a, b) => new Date(a.exDate).getTime() - new Date(b.exDate).getTime());
    return future[0] || null;
  }, []);

  // Monthly chart data
  const monthlyData = useMemo(() => {
    const totals: Record<number, number> = {};
    dividends.forEach(d => {
      const m = new Date(d.paymentDate || d.exDate).getMonth();
      totals[m] = (totals[m] || 0) + d.totalReceived;
    });
    return MONTHS.map((name, i) => ({ name, amount: totals[i] || 0 }));
  }, [dividends]);

  // Calculator
  const calcResult = useMemo(() => {
    const P = parseFloat(calcState.monthlyInvestment) || 0;
    const r = (parseFloat(calcState.annualYield) || 0) / 100;
    const years = parseInt(calcState.years) || 10;
    const reinvest = (parseFloat(calcState.reinvestmentRate) || 100) / 100;
    // Simple compound reinvestment: corpus grows by dividend yield each year, with monthly additions
    let corpus = 0;
    for (let y = 0; y < years; y++) {
      corpus = (corpus + P * 12) * (1 + r * reinvest);
    }
    const totalInvested = P * 12 * years;
    const annualDividend = corpus * r;
    return { corpus, totalInvested, annualDividend, monthlyDividend: annualDividend / 12 };
  }, [calcState]);

  const projectedAnnual = useMemo(() => {
    const totalInvested = holdings.reduce((s, h) => s + h.quantity * h.averagePrice, 0);
    return totalInvested * 0.015; // assume 1.5% avg dividend yield
  }, [holdings]);

  const yieldOnCost = totalFYDividends > 0 && holdings.length > 0
    ? (totalFYDividends / holdings.reduce((s, h) => s + h.quantity * h.averagePrice, 0)) * 100
    : 0;

  const cardClass = 'bg-gray-900/50 backdrop-blur border border-gray-700/50 rounded-2xl p-6';

  return (
    <div className="p-6 space-y-6 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Gift className="text-cyan-400" size={28} /> Dividend Tracker
          </h1>
          <p className="text-gray-400 text-sm mt-1">Track received & upcoming dividends for Yashwanth's portfolio</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 px-4 py-2 rounded-xl transition-all"
        >
          <PlusCircle size={16} /> Add Dividend
        </motion.button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Received (FY)', value: formatCurrency(totalFYDividends), icon: IndianRupee, color: 'cyan' },
          { label: 'Projected Annual', value: formatCurrency(projectedAnnual), icon: TrendingUp, color: 'violet' },
          { label: 'Yield on Cost', value: `${yieldOnCost.toFixed(2)}%`, icon: BarChart2, color: 'emerald' },
          { label: 'Next Ex-Date', value: nextExDate ? `${nextExDate.symbol} in ${daysUntil(nextExDate.exDate)}d` : 'N/A', icon: Calendar, color: 'amber' },
        ].map((card, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className={cardClass}>
            <div className="flex items-center gap-2 mb-2">
              <card.icon size={16} className={`text-${card.color}-400`} />
              <span className="text-gray-400 text-xs">{card.label}</span>
            </div>
            <p className={`text-xl font-bold text-${card.color}-300`}>{card.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['tracker', 'upcoming', 'calendar', 'calculator'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${activeTab === tab ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-gray-400 hover:text-white'}`}
          >
            {tab === 'calculator' ? '🧮 Reinvestment Calc' : tab === 'upcoming' ? '📅 Upcoming' : tab === 'calendar' ? '📊 Calendar' : '📋 My Dividends'}
          </button>
        ))}
      </div>

      {/* TAB: My Dividends */}
      {activeTab === 'tracker' && (
        <div className={cardClass}>
          <h2 className="text-white font-semibold mb-4">My Dividend History</h2>
          {dividends.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Gift size={40} className="mx-auto mb-3 opacity-30" />
              <p>No dividends recorded yet. Add your first dividend!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700/50">
                    {['Stock', 'Symbol', 'Ex-Date', 'Payment Date', '₹/Share', 'Shares', 'Total'].map(h => (
                      <th key={h} className="text-left pb-3 pr-4 font-medium">{h}</th>
                    ))}
                    <th className="pb-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {dividends.map(d => (
                    <tr key={d.id} className="border-b border-gray-800/50 hover:bg-white/5 transition-colors">
                      <td className="py-3 pr-4 text-white font-medium">{d.stockName}</td>
                      <td className="py-3 pr-4 text-cyan-400">{d.symbol}</td>
                      <td className="py-3 pr-4 text-gray-300">{d.exDate}</td>
                      <td className="py-3 pr-4 text-gray-300">{d.paymentDate || '—'}</td>
                      <td className="py-3 pr-4 text-gray-300">₹{d.amountPerShare}</td>
                      <td className="py-3 pr-4 text-gray-300">{d.sharesHeld}</td>
                      <td className="py-3 pr-4 text-emerald-400 font-semibold">{formatCurrency(d.totalReceived)}</td>
                      <td className="py-3">
                        <button onClick={() => setDividends(prev => prev.filter(x => x.id !== d.id))} className="text-gray-500 hover:text-red-400 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={6} className="pt-3 text-gray-400 font-medium">Total All Time</td>
                    <td className="pt-3 text-cyan-300 font-bold text-base">{formatCurrency(totalAllTime)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: Upcoming Dividends */}
      {activeTab === 'upcoming' && (
        <div className={cardClass}>
          <h2 className="text-white font-semibold mb-4">Upcoming Dividends — Major Indian Stocks</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700/50">
                  {['Company', 'Symbol', 'Ex-Date', 'Payment Date', '₹/Share', 'Yield', 'Frequency', 'Days'].map(h => (
                    <th key={h} className="text-left pb-3 pr-4 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {UPCOMING_DIVIDENDS.sort((a, b) => new Date(a.exDate).getTime() - new Date(b.exDate).getTime()).map(u => {
                  const days = daysUntil(u.exDate);
                  const isClose = days <= 7;
                  return (
                    <tr key={u.symbol} className="border-b border-gray-800/50 hover:bg-white/5 transition-colors">
                      <td className="py-3 pr-4 text-white font-medium">{u.company}</td>
                      <td className="py-3 pr-4 text-cyan-400 font-mono">{u.symbol}</td>
                      <td className="py-3 pr-4 text-gray-300">{u.exDate}</td>
                      <td className="py-3 pr-4 text-gray-300">{u.paymentDate}</td>
                      <td className="py-3 pr-4 text-emerald-400">₹{u.dividendPerShare}</td>
                      <td className="py-3 pr-4 text-violet-400">{u.yield}%</td>
                      <td className="py-3 pr-4 text-gray-400">{u.frequency}</td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isClose ? 'bg-amber-500/20 text-amber-300' : 'bg-gray-700/50 text-gray-400'}`}>
                          {days < 0 ? 'Past' : `${days}d`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: Calendar */}
      {activeTab === 'calendar' && (
        <div className={cardClass}>
          <h2 className="text-white font-semibold mb-6">Monthly Dividend Income</h2>
          {dividends.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <BarChart2 size={40} className="mx-auto mb-3 opacity-30" />
              <p>Add dividend entries to see the monthly chart.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} tickFormatter={v => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                  formatter={(v: any) => [formatCurrency(Number(v) || 0), 'Dividend Income']}
                />
                {monthlyData.map((_, i) => (
                  <Cell key={i} fill={`hsl(${180 + i * 10}, 70%, 50%)`} />
                ))}
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {monthlyData.map((_, i) => (
                    <Cell key={i} fill={`hsl(${180 + i * 15}, 70%, 50%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* TAB: Reinvestment Calculator */}
      {activeTab === 'calculator' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className={cardClass}>
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><Calculator size={18} className="text-violet-400" /> Dividend Reinvestment Calculator</h2>
            <p className="text-gray-400 text-sm mb-6">Calculate corpus growth when dividends are reinvested compoundly.</p>
            <div className="space-y-4">
              {[
                { label: 'Monthly Investment (₹)', key: 'monthlyInvestment', placeholder: '5000' },
                { label: 'Annual Dividend Yield (%)', key: 'annualYield', placeholder: '2.5' },
                { label: 'Investment Period (Years)', key: 'years', placeholder: '10' },
                { label: 'Reinvestment Rate (%)', key: 'reinvestmentRate', placeholder: '100' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-gray-400 text-xs block mb-1">{f.label}</label>
                  <input
                    type="number"
                    value={(calcState as any)[f.key]}
                    onChange={e => setCalcState(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              ))}
            </div>
          </div>
          <div className={cardClass + ' flex flex-col justify-center'}>
            <h3 className="text-gray-400 text-sm mb-6">Projected Outcome after {calcState.years} Years</h3>
            {[
              { label: 'Total Corpus', value: formatCurrency(calcResult.corpus), color: 'cyan' },
              { label: 'Total Invested', value: formatCurrency(calcResult.totalInvested), color: 'gray' },
              { label: 'Wealth Created', value: formatCurrency(calcResult.corpus - calcResult.totalInvested), color: 'emerald' },
              { label: 'Annual Dividend Income', value: formatCurrency(calcResult.annualDividend), color: 'violet' },
              { label: 'Monthly Dividend Income', value: formatCurrency(calcResult.monthlyDividend), color: 'amber' },
            ].map(r => (
              <div key={r.label} className="flex justify-between items-center py-3 border-b border-gray-800/50 last:border-0">
                <span className="text-gray-400 text-sm">{r.label}</span>
                <span className={`text-${r.color}-300 font-bold text-lg`}>{r.value}</span>
              </div>
            ))}
            <p className="text-gray-500 text-xs mt-4">* Based on simple CAGR compound reinvestment. Actual returns may vary.</p>
          </div>
        </div>
      )}

      {/* Add Dividend Modal */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-gray-900 border border-gray-700/50 rounded-2xl p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-semibold text-lg">Add Received Dividend</h3>
                <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Stock Name', key: 'stockName', type: 'text', placeholder: 'e.g. TCS' },
                  { label: 'Symbol', key: 'symbol', type: 'text', placeholder: 'e.g. TCS' },
                  { label: 'Ex-Date', key: 'exDate', type: 'date', placeholder: '' },
                  { label: 'Payment Date', key: 'paymentDate', type: 'date', placeholder: '' },
                  { label: 'Amount per Share (₹)', key: 'amountPerShare', type: 'number', placeholder: '10' },
                  { label: 'Shares Held', key: 'sharesHeld', type: 'number', placeholder: '100' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-gray-400 text-xs block mb-1">{f.label}</label>
                    <input
                      type={f.type}
                      value={(form as any)[f.key]}
                      onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                ))}
                {form.amountPerShare && form.sharesHeld && (
                  <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3">
                    <p className="text-cyan-300 text-sm">Total Received: <strong>{formatCurrency(parseFloat(form.amountPerShare) * parseFloat(form.sharesHeld))}</strong></p>
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowAddForm(false)} className="flex-1 py-2 rounded-xl border border-gray-700/50 text-gray-400 hover:text-white transition-colors">Cancel</button>
                <button onClick={handleAddDividend} className="flex-1 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 transition-colors font-medium">Add Dividend</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
