import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Layers,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  BarChart2,
  PieChart as PieIcon,
  Filter,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Briefcase,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import {
  fetchSectorData,
  getSectorChange,
  getSectorColor,
  getTopGainers,
  getTopLosers,
  type SectorData,
  type TimePeriod,
} from '../../services/sectorService';
import { usePortfolio } from '../../context/PortfolioContext';

export interface SectorHeatmapPageProps {
  onNavigate?: (page: string) => void;
}

export const SectorHeatmapPage: React.FC<SectorHeatmapPageProps> = ({ onNavigate: _onNavigate }) => {
  const { holdings } = usePortfolio();
  const [sectors, setSectors] = useState<SectorData[]>([]);
  const [period, setPeriod] = useState<TimePeriod>('1D');
  const [loading, setLoading] = useState(true);
  const [selectedSector, setSelectedSector] = useState<SectorData | null>(null);

  const loadData = async () => {
    setLoading(true);
    const data = await fetchSectorData();
    setSectors(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const topGainers = useMemo(() => getTopGainers(sectors, period), [sectors, period]);
  const topLosers = useMemo(() => getTopLosers(sectors, period), [sectors, period]);

  // Sort sectors by performance for chart
  const sortedSectors = useMemo(() => {
    return [...sectors].sort((a, b) => getSectorChange(b, period) - getSectorChange(a, period));
  }, [sectors, period]);

  // Map user holdings to sectors if possible
  const userSectorExposure = useMemo(() => {
    // Basic heuristics based on symbols
    const map: Record<string, { count: number; value: number }> = {};
    holdings.forEach(h => {
      let sec = 'Diversified';
      const sym = h.symbol.toUpperCase();
      if (['TCS', 'INFY', 'WIPRO', 'HCLTECH', 'TECHM', 'COFORGE'].includes(sym)) sec = 'IT';
      else if (['HDFCBANK', 'ICICIBANK', 'AXISBANK', 'KOTAKBANK', 'SBIN'].includes(sym)) sec = 'Bank';
      else if (['MARUTI', 'TATAMOTORS', 'BAJAJ-AUTO', 'HEROMOTOCO', 'M&M'].includes(sym)) sec = 'Auto';
      else if (['SUNPHARMA', 'CIPLA', 'DRREDDY', 'DIVISLAB'].includes(sym)) sec = 'Pharma';
      else if (['RELIANCE', 'ONGC', 'BPCL', 'IOC', 'POWERGRID', 'NTPC'].includes(sym)) sec = 'Energy';
      else if (['ITC', 'HINDUNILVR', 'NESTLEIND', 'BRITANNIA'].includes(sym)) sec = 'FMCG';
      else if (['TATASTEEL', 'JSWSTEEL', 'HINDALCO', 'COALINDIA'].includes(sym)) sec = 'Metal';
      else if (['DLF', 'GODREJPROP', 'OBEROIRLTY'].includes(sym)) sec = 'Realty';
      else if (h.assetType === 'crypto') sec = 'Crypto';
      else if (h.assetType === 'gold' || h.assetType === 'silver') sec = 'Precious Metals';

      const price = h.currentPrice ?? h.averagePrice;
      if (!map[sec]) map[sec] = { count: 0, value: 0 };
      map[sec].count += 1;
      map[sec].value += price * h.quantity;
    });
    return map;
  }, [holdings]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-cyan-400">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span className="font-mono">Building Sector Performance Heatmap...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              MARKET BREADTH
            </span>
            <span className="text-xs text-gray-400 font-mono">NSE SECTORAL INDICES</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1 flex items-center gap-2">
            <Layers className="w-6 h-6 text-cyan-400" />
            Sector Heatmap
          </h1>
          <p className="text-xs text-gray-400">
            Real-time visual map of sectoral strength, rotation, and money flows across the Indian economy
          </p>
        </div>

        {/* Controls: Time Period Filter & Refresh */}
        <div className="flex items-center gap-2 bg-gray-900/60 p-1.5 rounded-2xl border border-gray-800">
          {(['1D', '1W', '1M', '3M'] as TimePeriod[]).map(t => (
            <button
              key={t}
              onClick={() => setPeriod(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all ${
                period === t
                  ? 'bg-cyan-500 text-black font-bold shadow-lg shadow-cyan-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {t}
            </button>
          ))}
          <button
            onClick={loadData}
            className="p-1.5 ml-1 text-gray-400 hover:text-cyan-400 transition-colors"
            title="Refresh Heatmap"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top Gainers & Losers Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top 3 Gainers */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/20 to-gray-900/80 border border-emerald-500/20 backdrop-blur">
          <div className="flex items-center justify-between text-xs font-mono text-emerald-400 mb-3">
            <span className="flex items-center gap-1.5 font-bold uppercase">
              <TrendingUp className="w-4 h-4" />
              Leading Sectors ({period})
            </span>
            <span className="text-gray-500 text-[10px]">TOP 3</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {topGainers.map(s => {
              const chg = getSectorChange(s, period);
              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedSector(s)}
                  className="p-3 rounded-xl bg-gray-900/60 border border-emerald-500/20 cursor-pointer hover:border-emerald-400 transition-all"
                >
                  <div className="text-xs font-bold text-white truncate">{s.shortName}</div>
                  <div className="text-sm font-mono font-extrabold text-emerald-400 mt-1">
                    +{chg.toFixed(2)}%
                  </div>
                  <div className="text-[10px] text-gray-400 truncate mt-1">
                    Top: <span className="text-emerald-300 font-mono">{s.topGainer}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top 3 Losers */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-red-950/20 to-gray-900/80 border border-red-500/20 backdrop-blur">
          <div className="flex items-center justify-between text-xs font-mono text-red-400 mb-3">
            <span className="flex items-center gap-1.5 font-bold uppercase">
              <TrendingDown className="w-4 h-4" />
              Lagging Sectors ({period})
            </span>
            <span className="text-gray-500 text-[10px]">BOTTOM 3</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {topLosers.map(s => {
              const chg = getSectorChange(s, period);
              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedSector(s)}
                  className="p-3 rounded-xl bg-gray-900/60 border border-red-500/20 cursor-pointer hover:border-red-400 transition-all"
                >
                  <div className="text-xs font-bold text-white truncate">{s.shortName}</div>
                  <div className="text-sm font-mono font-extrabold text-red-400 mt-1">
                    {chg.toFixed(2)}%
                  </div>
                  <div className="text-[10px] text-gray-400 truncate mt-1">
                    Lag: <span className="text-red-300 font-mono">{s.topLoser}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Interactive Visual Heatmap Grid */}
      <div className="p-6 rounded-2xl bg-gray-900/50 backdrop-blur border border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Sector Performance Heatmap ({period})
            </h3>
            <p className="text-xs text-gray-400 font-mono">
              Click any tile to inspect index details and underlying stocks
            </p>
          </div>

          {/* Color legend */}
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-400">
            <span className="px-1.5 py-0.5 rounded bg-red-600 text-white">&lt;-3%</span>
            <span className="px-1.5 py-0.5 rounded bg-red-400/70 text-white">-1%</span>
            <span className="px-1.5 py-0.5 rounded bg-gray-700 text-gray-300">0%</span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-400/70 text-white">+1%</span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-white">&gt;+3%</span>
          </div>
        </div>

        {/* Heatmap Tiles Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {sectors.map(sector => {
            const chg = getSectorChange(sector, period);
            const isPos = chg >= 0;
            const isSelected = selectedSector?.id === sector.id;

            return (
              <motion.div
                key={sector.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedSector(sector)}
                className={`p-4 rounded-2xl cursor-pointer transition-all border flex flex-col justify-between min-h-[110px] ${
                  isSelected
                    ? 'ring-2 ring-cyan-400 border-white'
                    : 'border-gray-800/80 hover:border-gray-600'
                } ${getSectorColor(chg)}`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-white drop-shadow">
                    <span className="truncate">{sector.shortName}</span>
                    <span className="text-[10px] opacity-80 font-mono">
                      {isPos ? '+' : ''}{chg.toFixed(2)}%
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-white/90 drop-shadow mt-0.5">
                    {sector.indexValue.toLocaleString()}
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-black/10 flex items-center justify-between text-[10px] text-white/90 font-mono">
                  <span className="truncate">▲ {sector.topGainer}</span>
                  <span className="truncate">▼ {sector.topLoser}</span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Selected Sector Details Drawer */}
        {selectedSector && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-6 p-5 rounded-2xl bg-gray-900 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-bold text-white">{selectedSector.name}</h4>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-400">
                  INDEX: {selectedSector.indexValue.toLocaleString()}
                </span>
              </div>
              <div className="flex flex-wrap gap-4 mt-2 text-xs font-mono text-gray-300">
                <span>1D: <b className={selectedSector.change1D >= 0 ? 'text-emerald-400' : 'text-red-400'}>{selectedSector.change1D}%</b></span>
                <span>1W: <b className={selectedSector.change1W >= 0 ? 'text-emerald-400' : 'text-red-400'}>{selectedSector.change1W}%</b></span>
                <span>1M: <b className={selectedSector.change1M >= 0 ? 'text-emerald-400' : 'text-red-400'}>{selectedSector.change1M}%</b></span>
                <span>3M: <b className={selectedSector.change3M >= 0 ? 'text-emerald-400' : 'text-red-400'}>{selectedSector.change3M}%</b></span>
                <span>Top Gainer: <b className="text-emerald-400">{selectedSector.topGainer}</b></span>
                <span>Top Loser: <b className="text-red-400">{selectedSector.topLoser}</b></span>
              </div>
            </div>

            <button
              onClick={() => setSelectedSector(null)}
              className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg bg-gray-800 transition-colors"
            >
              Close Details
            </button>
          </motion.div>
        )}
      </div>

      {/* Sector Ranking Chart & Your Exposure */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Horizontal Performance Rank Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-gray-900/50 backdrop-blur border border-gray-800">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono mb-4 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-cyan-400" />
            Sector Performance Ranking ({period})
          </h3>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sortedSectors.map(s => ({
                  name: s.shortName,
                  change: getSectorChange(s, period),
                }))}
                margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#9CA3AF', fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                />
                <YAxis
                  tick={{ fill: '#9CA3AF', fontSize: 10 }}
                  tickFormatter={val => `${val}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#374151',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                  }}
                  formatter={(val: any) => [`${Number(val).toFixed(2)}%`, 'Change']}
                />
                <ReferenceLine y={0} stroke="#4B5563" />
                <Bar dataKey="change" radius={[4, 4, 0, 0]}>
                  {sortedSectors.map((entry, index) => {
                    const chg = getSectorChange(entry, period);
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={chg >= 0 ? '#10B981' : '#EF4444'}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Your Portfolio Exposure by Sector */}
        <div className="p-6 rounded-2xl bg-gray-900/50 backdrop-blur border border-gray-800 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono mb-2 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-violet-400" />
              Your Sector Exposure
            </h3>
            <p className="text-xs text-gray-400 font-mono mb-4">
              Estimated distribution from your holdings
            </p>

            <div className="space-y-3">
              {Object.keys(userSectorExposure).length === 0 ? (
                <div className="p-4 rounded-xl bg-gray-800/40 border border-gray-800 text-xs text-gray-400 text-center font-mono">
                  No holdings recorded yet. Add stocks to view your sector allocation.
                </div>
              ) : (
                Object.entries(userSectorExposure).map(([sec, info], i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-gray-800/30 border border-gray-800 text-xs font-mono"
                  >
                    <div>
                      <span className="font-semibold text-white">{sec}</span>
                      <span className="text-[10px] text-gray-400 ml-2">({info.count} items)</span>
                    </div>
                    <span className="font-mono text-cyan-400 font-semibold">
                      ₹{Math.round(info.value).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-[11px] text-cyan-300 font-mono">
            💡 <b>Sector Rotation Tip:</b> Consider shifting allocation from lagging sectors (&lt;-3%) into sectors showing emerging 1W momentum.
          </div>
        </div>
      </div>
    </div>
  );
};
