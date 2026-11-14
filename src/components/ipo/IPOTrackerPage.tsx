// src/components/ipo/IPOTrackerPage.tsx
// IPO Tracker — Live IPOs, Upcoming, Recent Listings, GMP Tracker

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rocket,
  TrendingUp,
  TrendingDown,
  Bell,
  X,
  ChevronRight,
  Info,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Calendar,
  BarChart2,
  Flame,
  Star,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  BellRing,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import {
  fetchIPOData,
  getIPOsByStatus,
  getHighGMPIPOs,
  getRecentListings,
  getSortedByGMP,
  getIPORecommendation,
  HIGH_GMP_THRESHOLD,
  type IPOEntry,
} from '../../services/ipoService';

interface Props {
  onNavigate: (page: string) => void;
}

type Tab = 'live' | 'upcoming' | 'recent' | 'gmp';

const REMINDER_KEY = 'ipo_reminders';

function formatCr(val: number) {
  return `₹${val.toLocaleString('en-IN')} Cr`;
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── GMP Alert Banner ───────────────────────────────────────────────────────
function GMPAlertBanner({ highGmpIPOs }: { highGmpIPOs: IPOEntry[] }) {
  const [dismissed, setDismissed] = useState(false);
  if (!highGmpIPOs.length || dismissed) return null;
  const top = highGmpIPOs[0];
  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="relative flex items-center gap-3 bg-gradient-to-r from-orange-600/80 to-red-600/80 border border-orange-500/50 rounded-2xl p-4 backdrop-blur"
    >
      <Flame className="w-6 h-6 text-orange-200 flex-shrink-0 animate-pulse" />
      <div className="flex-1 min-w-0">
        <span className="font-bold text-white">🔥 HIGH GMP ALERT: </span>
        <span className="text-orange-100">
          {top.companyName} showing{' '}
          <span className="font-bold text-white">{top.gmpPercent.toFixed(1)}% GMP</span> —
          Strong listing gain expected
        </span>
        {highGmpIPOs.length > 1 && (
          <span className="ml-2 text-orange-200 text-sm">
            + {highGmpIPOs.length - 1} more
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="px-2 py-0.5 bg-orange-500/40 text-orange-100 text-xs rounded-full font-semibold">
          LIVE
        </span>
        <button
          onClick={() => setDismissed(true)}
          className="text-orange-200 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Status Badge ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: IPOEntry['status'] }) {
  const map = {
    upcoming: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
    open:     'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    allotment:'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    listed:   'bg-violet-500/20 text-violet-400 border border-violet-500/30',
    closed:   'bg-gray-500/20 text-gray-400 border border-gray-500/30',
  } as const;
  const labels = {
    upcoming: 'Upcoming', open: 'Open', allotment: 'Allotment', listed: 'Listed', closed: 'Closed',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${map[status]}`}>
      {labels[status]}
    </span>
  );
}

// ─── IPO Row ─────────────────────────────────────────────────────────────────
function IPORow({ ipo, onClick }: { ipo: IPOEntry; onClick: () => void }) {
  const isPositiveGMP = ipo.gmpPercent >= 0;
  return (
    <motion.tr
      whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
      className="border-b border-gray-700/40 cursor-pointer"
      onClick={onClick}
    >
      <td className="px-4 py-3">
        <div className="font-semibold text-white text-sm">{ipo.companyName}</div>
        <div className="text-xs text-gray-400">{ipo.sector}</div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-300">{ipo.issuePrice}</td>
      <td className="px-4 py-3 text-sm text-gray-300">{formatCr(ipo.issueSize)}</td>
      <td className="px-4 py-3">
        <div className={`text-sm font-semibold ${isPositiveGMP ? 'text-emerald-400' : 'text-red-400'}`}>
          {isPositiveGMP ? '+' : ''}₹{ipo.gmp}
        </div>
        <div className={`text-xs ${isPositiveGMP ? 'text-emerald-400' : 'text-red-400'}`}>
          {isPositiveGMP ? '+' : ''}{ipo.gmpPercent.toFixed(1)}%
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-gray-300">{ipo.subscriptionStatus}</span>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={ipo.status} />
      </td>
      <td className="px-4 py-3 text-gray-400">
        <ChevronRight className="w-4 h-4" />
      </td>
    </motion.tr>
  );
}

// ─── Listing Row ─────────────────────────────────────────────────────────────
function ListingRow({ ipo, onClick }: { ipo: IPOEntry; onClick: () => void }) {
  const gain = ipo.listingGain ?? 0;
  return (
    <motion.tr
      whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
      className="border-b border-gray-700/40 cursor-pointer"
      onClick={onClick}
    >
      <td className="px-4 py-3">
        <div className="font-semibold text-white text-sm">{ipo.companyName}</div>
        <div className="text-xs text-gray-400">{ipo.sector}</div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-300">{ipo.issuePrice}</td>
      <td className="px-4 py-3 text-sm text-gray-300">
        {ipo.listingPrice ? `₹${ipo.listingPrice}` : '—'}
      </td>
      <td className="px-4 py-3">
        <div className={`flex items-center gap-1 text-sm font-semibold ${gain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {gain >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          {gain >= 0 ? '+' : ''}{gain.toFixed(2)}%
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-300">{formatDate(ipo.listingDate)}</td>
      <td className="px-4 py-3 text-sm text-gray-300">{ipo.subscriptionStatus}</td>
      <td className="px-4 py-3 text-gray-400">
        <ChevronRight className="w-4 h-4" />
      </td>
    </motion.tr>
  );
}

// ─── GMP Row ─────────────────────────────────────────────────────────────────
function GMPRow({ ipo, rank, onClick }: { ipo: IPOEntry; rank: number; onClick: () => void }) {
  const isPositive = ipo.gmpPercent >= 0;
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      onClick={onClick}
      className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700/40 cursor-pointer hover:border-cyan-500/30 transition-all"
    >
      <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold
        ${rank === 1 ? 'bg-yellow-500/20 text-yellow-400' : rank === 2 ? 'bg-gray-400/20 text-gray-300' : rank === 3 ? 'bg-orange-500/20 text-orange-400' : 'bg-gray-700/50 text-gray-400'}`}>
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-white text-sm truncate">{ipo.companyName}</div>
        <div className="text-xs text-gray-400">{ipo.sector}</div>
      </div>
      <div className="text-sm text-gray-400">{ipo.issuePrice}</div>
      <div className={`text-right ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
        <div className="font-bold">{isPositive ? '+' : ''}₹{ipo.gmp}</div>
        <div className="text-xs">{isPositive ? '+' : ''}{ipo.gmpPercent.toFixed(1)}%</div>
      </div>
      <StatusBadge status={ipo.status} />
      {ipo.gmpPercent > HIGH_GMP_THRESHOLD && (
        <Flame className="w-4 h-4 text-orange-400 flex-shrink-0" />
      )}
    </motion.div>
  );
}

// ─── IPO Detail Modal ─────────────────────────────────────────────────────────
function IPODetailModal({ ipo, onClose }: { ipo: IPOEntry; onClose: () => void }) {
  const rec = getIPORecommendation(ipo);
  const [reminders, setReminders] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(REMINDER_KEY) || '[]'); } catch { return []; }
  });
  const hasReminder = reminders.includes(ipo.id);

  const toggleReminder = () => {
    const updated = hasReminder
      ? reminders.filter((r) => r !== ipo.id)
      : [...reminders, ipo.id];
    setReminders(updated);
    localStorage.setItem(REMINDER_KEY, JSON.stringify(updated));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-gray-900 border border-gray-700/50 rounded-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-700/50">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-white">{ipo.companyName}</h2>
              <StatusBadge status={ipo.status} />
              <span className="px-2 py-0.5 bg-gray-700/50 text-gray-300 text-xs rounded-full">
                {ipo.category === 'mainboard' ? 'Mainboard' : 'SME'}
              </span>
            </div>
            <p className="text-gray-400 text-sm">{ipo.sector}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-700/50 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Company Overview */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Company Overview</h3>
            <p className="text-gray-300 text-sm leading-relaxed">{ipo.companyDescription}</p>
          </div>

          {/* Key Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Issue Size', value: formatCr(ipo.issueSize) },
              { label: 'Issue Price', value: ipo.issuePrice },
              { label: 'Open Date', value: formatDate(ipo.openDate) },
              { label: 'Listing Date', value: formatDate(ipo.listingDate) },
              { label: 'Promoter Holding', value: `${ipo.promoterHolding}%` },
              { label: 'Retail Quota', value: `${ipo.retailQuota}%` },
              { label: 'QIB Quota', value: `${ipo.qibQuota}%` },
              { label: 'NII Quota', value: `${ipo.niiQuota}%` },
            ].map((item) => (
              <div key={item.label} className="bg-gray-800/50 rounded-xl p-3">
                <div className="text-xs text-gray-400 mb-1">{item.label}</div>
                <div className="text-sm font-semibold text-white">{item.value}</div>
              </div>
            ))}
          </div>

          {/* Subscription */}
          {ipo.retailSubscription !== undefined && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Subscription Status</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Retail (RII)', value: ipo.retailSubscription, quota: ipo.retailQuota },
                  { label: 'NII (HNI)', value: ipo.niiSubscription, quota: ipo.niiQuota },
                  { label: 'QIB', value: ipo.qibSubscription, quota: ipo.qibQuota },
                ].map((cat) => (
                  <div key={cat.label} className="bg-gray-800/50 rounded-xl p-4 text-center">
                    <div className="text-xs text-gray-400 mb-1">{cat.label}</div>
                    <div className={`text-2xl font-bold ${(cat.value ?? 0) >= 1 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {cat.value?.toFixed(2) ?? '—'}x
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{cat.quota}% quota</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* GMP Trend */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              GMP Trend (7 Days) — Current GMP: {ipo.gmpPercent >= 0 ? '+' : ''}₹{ipo.gmp} ({ipo.gmpPercent.toFixed(1)}%)
            </h3>
            <div className="h-32 bg-gray-800/50 rounded-xl p-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ipo.gmpHistory}>
                  <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    labelStyle={{ color: '#9ca3af' }}
                    itemStyle={{ color: '#22d3ee' }}
                    formatter={(v: any) => [`₹${v}`, 'GMP']}
                  />
                  <Line
                    type="monotone"
                    dataKey="gmp"
                    stroke="#22d3ee"
                    strokeWidth={2}
                    dot={{ fill: '#22d3ee', r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Financials */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Financial Highlights</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700/50">
                    {['Year', 'Revenue (₹Cr)', 'Net Profit (₹Cr)', 'EPS (₹)'].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-xs text-gray-400 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ipo.financials.map((fin) => (
                    <tr key={fin.year} className="border-b border-gray-700/30">
                      <td className="px-3 py-2 text-gray-300 font-semibold">{fin.year}</td>
                      <td className="px-3 py-2 text-gray-300">{fin.revenue.toLocaleString('en-IN')}</td>
                      <td className={`px-3 py-2 font-semibold ${fin.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {fin.profit >= 0 ? '' : '('}{Math.abs(fin.profit).toLocaleString('en-IN')}{fin.profit < 0 ? ')' : ''}
                      </td>
                      <td className={`px-3 py-2 ${fin.eps >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        ₹{fin.eps.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Issue Price vs Listing */}
          {ipo.listingPrice && (
            <div className="bg-gray-800/50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Issue vs Listing Price</h3>
              <div className="flex items-center gap-6">
                <div>
                  <div className="text-xs text-gray-400">Issue Price</div>
                  <div className="text-xl font-bold text-white">₹{ipo.issuePriceHigh}</div>
                </div>
                <ChevronRight className="text-gray-500 w-5 h-5" />
                <div>
                  <div className="text-xs text-gray-400">Listing Price</div>
                  <div className={`text-xl font-bold ${(ipo.listingGain ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    ₹{ipo.listingPrice}
                  </div>
                </div>
                <div className={`px-3 py-1.5 rounded-xl text-sm font-bold ${(ipo.listingGain ?? 0) >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                  {(ipo.listingGain ?? 0) >= 0 ? '+' : ''}{ipo.listingGain?.toFixed(2)}%
                </div>
              </div>
            </div>
          )}

          {/* Recommendation */}
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">AI Recommendation</h3>
            <div className="flex items-start gap-3">
              <div className={`text-2xl font-black ${rec.color}`}>{rec.rating}</div>
              <p className="text-gray-300 text-sm leading-relaxed">{rec.reasoning}</p>
            </div>
          </div>

          {/* Apply Reminder */}
          {(ipo.status === 'upcoming' || ipo.status === 'open') && (
            <button
              onClick={toggleReminder}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${
                hasReminder
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-black'
              }`}
            >
              {hasReminder ? (
                <><CheckCircle2 className="w-4 h-4" /> Reminder Set — Click to Remove</>
              ) : (
                <><BellRing className="w-4 h-4" /> Set Apply Reminder for {formatDate(ipo.openDate)}</>
              )}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export const IPOTrackerPage: React.FC<Props> = ({ onNavigate }) => {
  const [ipos, setIpos] = useState<IPOEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('live');
  const [selectedIPO, setSelectedIPO] = useState<IPOEntry | null>(null);

  useEffect(() => {
    fetchIPOData().then((data) => {
      setIpos(data);
      setLoading(false);
    });
  }, []);

  const liveIPOs      = useMemo(() => getIPOsByStatus(ipos, 'open'), [ipos]);
  const upcomingIPOs  = useMemo(() => getIPOsByStatus(ipos, 'upcoming'), [ipos]);
  const recentIPOs    = useMemo(() => getRecentListings(ipos), [ipos]);
  const gmpSortedIPOs = useMemo(() => getSortedByGMP(ipos), [ipos]);
  const highGmpIPOs   = useMemo(() => ipos.filter(i => i.gmpPercent > HIGH_GMP_THRESHOLD), [ipos]);

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'live',     label: '🟢 Live IPOs',      count: liveIPOs.length },
    { id: 'upcoming', label: '🔜 Upcoming',        count: upcomingIPOs.length },
    { id: 'recent',   label: '📋 Recent Listings', count: recentIPOs.length },
    { id: 'gmp',      label: '🔥 GMP Tracker',     count: gmpSortedIPOs.length },
  ];

  const TableHeader = ({ columns }: { columns: string[] }) => (
    <thead>
      <tr className="border-b border-gray-700/50">
        {columns.map((c) => (
          <th key={c} className="px-4 py-3 text-left text-xs text-gray-400 font-medium uppercase tracking-wider">
            {c}
          </th>
        ))}
      </tr>
    </thead>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-cyan-500/10 rounded-xl">
          <Rocket className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">IPO Tracker</h1>
          <p className="text-gray-400 text-sm">Live GMP, subscription status & upcoming issues</p>
        </div>
      </div>

      {/* GMP Alert Banner */}
      <AnimatePresence>
        {!loading && <GMPAlertBanner highGmpIPOs={highGmpIPOs} />}
      </AnimatePresence>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
            <p className="text-gray-400">Fetching IPO data...</p>
          </div>
        </div>
      )}

      {!loading && (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Live IPOs',       value: liveIPOs.length,      icon: <BarChart2 className="w-5 h-5 text-emerald-400" />, color: 'text-emerald-400' },
              { label: 'Upcoming IPOs',   value: upcomingIPOs.length,  icon: <Calendar className="w-5 h-5 text-cyan-400" />,    color: 'text-cyan-400' },
              { label: 'Recent Listings', value: recentIPOs.length,    icon: <TrendingUp className="w-5 h-5 text-violet-400" />,color: 'text-violet-400' },
              { label: 'High GMP (>15%)', value: highGmpIPOs.length,   icon: <Flame className="w-5 h-5 text-orange-400" />,     color: 'text-orange-400' },
            ].map((stat) => (
              <div key={stat.label} className="bg-gray-900/50 backdrop-blur border border-gray-700/50 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">{stat.icon}<span className="text-xs text-gray-400">{stat.label}</span></div>
                <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 flex-wrap">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeTab === t.id
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'text-gray-400 hover:text-white bg-gray-800/50 border border-gray-700/40'
                }`}
              >
                {t.label}
                {t.count !== undefined && (
                  <span className="ml-2 px-1.5 py-0.5 bg-gray-700/50 rounded-full text-xs">{t.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {/* Live / Upcoming — table view */}
              {(activeTab === 'live' || activeTab === 'upcoming') && (
                <div className="bg-gray-900/50 backdrop-blur border border-gray-700/50 rounded-2xl overflow-hidden">
                  {activeTab === 'live' && liveIPOs.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                      <Clock className="w-10 h-10 text-gray-600" />
                      <p className="text-gray-400">No IPOs currently open for subscription</p>
                      <p className="text-gray-500 text-sm">Check upcoming IPOs tab</p>
                    </div>
                  )}
                  {activeTab === 'upcoming' && upcomingIPOs.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                      <Calendar className="w-10 h-10 text-gray-600" />
                      <p className="text-gray-400">No upcoming IPOs scheduled</p>
                    </div>
                  )}
                  {((activeTab === 'live' && liveIPOs.length > 0) || (activeTab === 'upcoming' && upcomingIPOs.length > 0)) && (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <TableHeader columns={['Company', 'Issue Price', 'Issue Size', 'GMP', 'Subscription', 'Status', '']} />
                        <tbody>
                          {(activeTab === 'live' ? liveIPOs : upcomingIPOs).map((ipo) => (
                            <IPORow key={ipo.id} ipo={ipo} onClick={() => setSelectedIPO(ipo)} />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Recent Listings */}
              {activeTab === 'recent' && (
                <div className="bg-gray-900/50 backdrop-blur border border-gray-700/50 rounded-2xl overflow-hidden">
                  <div className="p-4 border-b border-gray-700/50">
                    <h2 className="text-lg font-semibold text-white">Recent Listings (Last 3 Months)</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <TableHeader columns={['Company', 'Issue Price', 'Listing Price', 'Listing Gain', 'Listing Date', 'Subscription', '']} />
                      <tbody>
                        {recentIPOs.map((ipo) => (
                          <ListingRow key={ipo.id} ipo={ipo} onClick={() => setSelectedIPO(ipo)} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* GMP Tracker */}
              {activeTab === 'gmp' && (
                <div className="bg-gray-900/50 backdrop-blur border border-gray-700/50 rounded-2xl p-6 space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-semibold text-white">GMP Tracker — Sorted by GMP%</h2>
                    <div className="flex items-center gap-2 text-xs text-orange-400">
                      <Flame className="w-3.5 h-3.5" />
                      <span>GMP {'>'} {HIGH_GMP_THRESHOLD}% highlighted</span>
                    </div>
                  </div>
                  {gmpSortedIPOs.map((ipo, i) => (
                    <GMPRow key={ipo.id} ipo={ipo} rank={i + 1} onClick={() => setSelectedIPO(ipo)} />
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </>
      )}

      {/* IPO Detail Modal */}
      <AnimatePresence>
        {selectedIPO && (
          <IPODetailModal ipo={selectedIPO} onClose={() => setSelectedIPO(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};
