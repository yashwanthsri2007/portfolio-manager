import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Activity,
  Layers,
  Calendar,
  AlertCircle,
  HelpCircle,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieIcon,
  Globe,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import {
  fetchFIIDIIData,
  computeMTD,
  computeSentiment,
  getTrendSignal,
  MOCK_SECTOR_FLOWS,
  type FIIDIIEntry,
} from '../../services/fiiDiiService';

export interface FIIDIIPageProps {
  onNavigate?: (page: string) => void;
}

export const FIIDIIPage: React.FC<FIIDIIPageProps> = ({ onNavigate: _onNavigate }) => {
  const [data, setData] = useState<FIIDIIEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'net' | 'gross'>('net');

  const loadData = async () => {
    setLoading(true);
    const result = await fetchFIIDIIData();
    setData(result);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading || data.length === 0) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-cyan-400">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span className="font-mono">Loading Institutional Flow Data...</span>
        </div>
      </div>
    );
  }

  const today = data[0];
  const { fiiMTD, diiMTD } = computeMTD(data);
  const sentiment = computeSentiment(data);
  const trendSignal = getTrendSignal(data);

  // Format chart data (reverse so oldest is left, newest right)
  const chartData = [...data].reverse().map(d => ({
    date: d.date.split('-')[0] + ' ' + d.date.split('-')[1],
    'FII Net': d.fiiNet,
    'DII Net': d.diiNet,
    'Total Net': d.fiiNet + d.diiNet,
    'FII Buy': d.fiiBuy,
    'FII Sell': d.fiiSell,
    'DII Buy': d.diiBuy,
    'DII Sell': d.diiSell,
  }));

  const formatCr = (num: number) => {
    const abs = Math.abs(num);
    const sign = num >= 0 ? '+' : '-';
    return `${sign}₹${abs.toLocaleString('en-IN')} Cr`;
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              INSTITUTIONAL RADAR
            </span>
            <span className="text-xs text-gray-400 font-mono">NSE / BSE CASH MARKET</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1 flex items-center gap-2">
            <Globe className="w-6 h-6 text-cyan-400" />
            FII & DII Activity
          </h1>
          <p className="text-xs text-gray-400">
            Foreign & Domestic Institutional Investors daily net buying and selling flows in Indian equities
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium border border-gray-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Trend Signal Alert Banner */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-2xl bg-gradient-to-r from-gray-900 via-gray-900 to-gray-950 border border-cyan-500/30 flex items-center gap-3"
      >
        <Activity className="w-5 h-5 text-cyan-400 shrink-0" />
        <div className="text-xs font-mono text-gray-200">
          <span className="font-bold text-cyan-300 mr-2">INSTITUTIONAL MOMENTUM:</span>
          {trendSignal}
        </div>
      </motion.div>

      {/* Top 4 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today FII */}
        <div className="p-5 rounded-2xl bg-gray-900/50 backdrop-blur border border-gray-800">
          <div className="flex items-center justify-between text-xs text-gray-400 font-mono">
            <span>TODAY'S FII NET</span>
            <span className="text-[10px] text-gray-500">{today.date}</span>
          </div>
          <div className={`text-2xl font-extrabold font-mono mt-2 ${today.fiiNet >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCr(today.fiiNet)}
          </div>
          <div className="text-[11px] text-gray-400 mt-2 flex justify-between font-mono">
            <span>Buy: ₹{today.fiiBuy.toLocaleString()} Cr</span>
            <span>Sell: ₹{today.fiiSell.toLocaleString()} Cr</span>
          </div>
        </div>

        {/* Today DII */}
        <div className="p-5 rounded-2xl bg-gray-900/50 backdrop-blur border border-gray-800">
          <div className="flex items-center justify-between text-xs text-gray-400 font-mono">
            <span>TODAY'S DII NET</span>
            <span className="text-[10px] text-gray-500">{today.date}</span>
          </div>
          <div className={`text-2xl font-extrabold font-mono mt-2 ${today.diiNet >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCr(today.diiNet)}
          </div>
          <div className="text-[11px] text-gray-400 mt-2 flex justify-between font-mono">
            <span>Buy: ₹{today.diiBuy.toLocaleString()} Cr</span>
            <span>Sell: ₹{today.diiSell.toLocaleString()} Cr</span>
          </div>
        </div>

        {/* MTD FII */}
        <div className="p-5 rounded-2xl bg-gray-900/50 backdrop-blur border border-gray-800">
          <div className="flex items-center justify-between text-xs text-gray-400 font-mono">
            <span>MTD FII NET FLOW</span>
            <span className="text-[10px] text-cyan-400">LAST 20 DAYS</span>
          </div>
          <div className={`text-2xl font-extrabold font-mono mt-2 ${fiiMTD >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCr(fiiMTD)}
          </div>
          <div className="text-[11px] text-gray-400 mt-2 font-mono">
            {fiiMTD >= 0 ? 'Aggressive foreign inflow' : 'Foreign outflows into cash'}
          </div>
        </div>

        {/* MTD DII */}
        <div className="p-5 rounded-2xl bg-gray-900/50 backdrop-blur border border-gray-800">
          <div className="flex items-center justify-between text-xs text-gray-400 font-mono">
            <span>MTD DII NET FLOW</span>
            <span className="text-[10px] text-violet-400">LAST 20 DAYS</span>
          </div>
          <div className={`text-2xl font-extrabold font-mono mt-2 ${diiMTD >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCr(diiMTD)}
          </div>
          <div className="text-[11px] text-gray-400 mt-2 font-mono">
            {diiMTD >= 0 ? 'Domestic absorption strong' : 'Domestic profit booking'}
          </div>
        </div>
      </div>

      {/* Main Flow Chart & Sentiment Meter */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recharts Bar Chart (2 cols) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-gray-900/50 backdrop-blur border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Institutional Net Flows (Last 20 Sessions)
              </h3>
              <p className="text-xs text-gray-400 font-mono">Values in ₹ Crores</p>
            </div>

            <div className="flex items-center gap-1 bg-gray-800/60 p-1 rounded-xl text-xs">
              <button
                onClick={() => setViewMode('net')}
                className={`px-3 py-1 rounded-lg transition-colors ${viewMode === 'net' ? 'bg-cyan-500 text-black font-semibold' : 'text-gray-400'}`}
              >
                Net Flows
              </button>
              <button
                onClick={() => setViewMode('gross')}
                className={`px-3 py-1 rounded-lg transition-colors ${viewMode === 'gross' ? 'bg-cyan-500 text-black font-semibold' : 'text-gray-400'}`}
              >
                Combined
              </button>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#9CA3AF', fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                />
                <YAxis
                  tick={{ fill: '#9CA3AF', fontSize: 10 }}
                  tickFormatter={val => `${val / 1000}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#374151',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                  }}
                  formatter={(val: any) => [`₹${Number(val).toLocaleString()} Cr`]}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <ReferenceLine y={0} stroke="#4B5563" />
                {viewMode === 'net' ? (
                  <>
                    <Bar dataKey="FII Net" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="DII Net" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                  </>
                ) : (
                  <Bar dataKey="Total Net" fill="#10B981" radius={[4, 4, 0, 0]} />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sentiment Meter & Summary */}
        <div className="p-6 rounded-2xl bg-gray-900/50 backdrop-blur border border-gray-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Market Sentiment
              </h3>
              <Activity className="w-4 h-4 text-cyan-400" />
            </div>
            <p className="text-xs text-gray-400 font-mono mt-1">Based on 10-day cumulative flow</p>

            <div className="mt-6 text-center">
              <div className="text-5xl font-black font-mono text-white">
                {sentiment.score}
                <span className="text-lg text-gray-500 font-normal">/100</span>
              </div>
              <div className={`text-base font-bold mt-1 ${sentiment.color}`}>
                {sentiment.label}
              </div>

              {/* Progress bar meter */}
              <div className="mt-4 h-3 bg-gray-800 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-red-500 via-yellow-400 to-emerald-400"
                  style={{ width: `${sentiment.score}%` }}
                />
              </div>

              <div className="flex justify-between text-[10px] text-gray-500 font-mono mt-1">
                <span>BEARISH (0)</span>
                <span>NEUTRAL (50)</span>
                <span>BULLISH (100)</span>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-xl bg-gray-800/40 border border-gray-700/50 text-xs text-gray-300 space-y-2 font-mono">
            <div className="flex justify-between">
              <span className="text-gray-400">Net Flow (20D):</span>
              <span className={fiiMTD + diiMTD >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                {formatCr(fiiMTD + diiMTD)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">FII / DII Ratio:</span>
              <span className="text-white">
                {Math.abs(fiiMTD / (diiMTD || 1)).toFixed(2)}x
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Trend Dominance:</span>
              <span className={Math.abs(fiiMTD) > Math.abs(diiMTD) ? 'text-cyan-400' : 'text-violet-400'}>
                {Math.abs(fiiMTD) > Math.abs(diiMTD) ? 'FII Driven' : 'DII Driven'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sector Flow Table & Sectoral Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sector FII Flows */}
        <div className="lg:col-span-1 p-6 rounded-2xl bg-gray-900/50 backdrop-blur border border-gray-800">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono mb-4 flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-cyan-400" />
            Sector-Wise FII Flows
          </h3>

          <div className="space-y-3">
            {MOCK_SECTOR_FLOWS.map((s, idx) => {
              const isPos = s.fiiFlow >= 0;
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-gray-800/30 border border-gray-800 text-xs font-mono"
                >
                  <span className="text-gray-300 truncate max-w-[150px]">{s.sector}</span>
                  <div className="flex items-center gap-3">
                    <span className={`font-semibold ${isPos ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatCr(s.fiiFlow)}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${isPos ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                      {isPos ? '+' : ''}{s.change}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detailed 20-Day Flow Ledger */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-gray-900/50 backdrop-blur border border-gray-800 overflow-hidden">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-violet-400" />
            20-Day Flow Ledger
          </h3>

          <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-gray-800/80 text-gray-400 sticky top-0">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-right">FII Buy</th>
                  <th className="p-3 text-right">FII Sell</th>
                  <th className="p-3 text-right">FII Net</th>
                  <th className="p-3 text-right">DII Buy</th>
                  <th className="p-3 text-right">DII Sell</th>
                  <th className="p-3 text-right">DII Net</th>
                  <th className="p-3 text-center">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 text-gray-300">
                {data.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-800/30 transition-colors">
                    <td className="p-3 font-semibold text-white">{row.date}</td>
                    <td className="p-3 text-right text-gray-400">₹{row.fiiBuy.toLocaleString()}</td>
                    <td className="p-3 text-right text-gray-400">₹{row.fiiSell.toLocaleString()}</td>
                    <td className={`p-3 text-right font-bold ${row.fiiNet >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatCr(row.fiiNet)}
                    </td>
                    <td className="p-3 text-right text-gray-400">₹{row.diiBuy.toLocaleString()}</td>
                    <td className="p-3 text-right text-gray-400">₹{row.diiSell.toLocaleString()}</td>
                    <td className={`p-3 text-right font-bold ${row.diiNet >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatCr(row.diiNet)}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        row.marketTrend === 'Bullish'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : row.marketTrend === 'Bearish'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                      }`}>
                        {row.marketTrend}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
