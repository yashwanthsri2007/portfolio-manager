import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Calendar,
  Download,
  Filter,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Search,
  DollarSign,
  Briefcase,
  Trash2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext';
import { formatCurrency } from '../../utils/formatters';
import { exportLedgerCSV } from '../../services/portfolioService';
import GlassCard from '../common/GlassCard';
import EmptyState from '../common/EmptyState';
import type { Transaction, TransactionType, AssetType } from '../../types';

interface LedgerPageProps {
  onNavigate?: (page: string, data?: any) => void;
  onOpenRecordTransaction?: () => void;
}

export const LedgerPage: React.FC<LedgerPageProps> = ({ onOpenRecordTransaction }) => {
  const { transactions, deleteTransaction } = usePortfolio();

  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('monthly');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<TransactionType | 'ALL'>('ALL');
  const [filterAsset, setFilterAsset] = useState<AssetType | 'ALL'>('ALL');

  // Selected Month/Year state
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth()); // 0-11
  const [selectedWeekOffset, setSelectedWeekOffset] = useState<number>(0); // 0 = current week, 1 = 1 week ago, etc.

  // 1. Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (filterType !== 'ALL' && t.type !== filterType) return false;
      if (filterAsset !== 'ALL' && t.assetType !== filterAsset) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesSymbol = t.symbol.toLowerCase().includes(q);
        const matchesName = t.name.toLowerCase().includes(q);
        const matchesNotes = (t.notes || '').toLowerCase().includes(q);
        if (!matchesSymbol && !matchesName && !matchesNotes) return false;
      }

      const txDate = new Date(t.date);
      if (viewMode === 'monthly') {
        return txDate.getFullYear() === selectedYear && txDate.getMonth() === selectedMonth;
      } else {
        // Weekly filtering based on offset
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay() - (selectedWeekOffset * 7));
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        return txDate >= startOfWeek && txDate <= endOfWeek;
      }
    });
  }, [transactions, viewMode, selectedYear, selectedMonth, selectedWeekOffset, filterType, filterAsset, searchQuery]);

  // 2. Ledger Financial Summaries
  const summary = useMemo(() => {
    let totalInvested = 0; // Buys
    let totalWithdrawn = 0; // Withdrawals
    let totalDeposited = 0; // Deposits
    let totalSellProceeds = 0; // Sells
    let totalRealizedPnL = 0;
    let buyCount = 0;
    let sellCount = 0;

    const assetBreakdown: Record<string, number> = {};

    filteredTransactions.forEach(t => {
      if (t.type === 'BUY') {
        totalInvested += t.totalValue;
        buyCount++;
        assetBreakdown[t.assetType] = (assetBreakdown[t.assetType] || 0) + t.totalValue;
      } else if (t.type === 'SELL') {
        totalSellProceeds += t.totalValue;
        totalRealizedPnL += (t.realizedPnL || 0);
        sellCount++;
      } else if (t.type === 'DEPOSIT') {
        totalDeposited += t.totalValue;
      } else if (t.type === 'WITHDRAWAL') {
        totalWithdrawn += t.totalValue;
      }
    });

    const netCashFlow = totalDeposited - totalWithdrawn;

    return {
      totalInvested,
      totalWithdrawn,
      totalDeposited,
      totalSellProceeds,
      totalRealizedPnL,
      netCashFlow,
      buyCount,
      sellCount,
      assetBreakdown
    };
  }, [filteredTransactions]);

  const handleExportCSV = () => {
    const csv = exportLedgerCSV(filteredTransactions);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `PORTFOLIO_LEDGER_${viewMode.toUpperCase()}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-600/20 border border-cyan-500/30">
              <BookOpen className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-300 via-white to-violet-300 bg-clip-text text-transparent">
                INVESTMENT LEDGER
              </h1>
              <p className="text-xs text-gray-400 font-mono tracking-wider">
                TRANSACTION AUDIT • REALIZED P&L • CASH FLOW TRACKER
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="p-1 rounded-xl bg-gray-800/80 border border-gray-700/60 flex items-center">
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'weekly'
                  ? 'bg-cyan-500 text-black shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'monthly'
                  ? 'bg-cyan-500 text-black shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            disabled={filteredTransactions.length === 0}
            className="p-2.5 rounded-xl bg-gray-800/60 hover:bg-gray-800 text-gray-300 hover:text-cyan-400 border border-gray-700/60 transition-all disabled:opacity-40"
            title="Export Ledger as CSV"
          >
            <Download className="w-4 h-4" />
          </button>

          {onOpenRecordTransaction && (
            <button
              onClick={onOpenRecordTransaction}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 text-white font-semibold text-xs tracking-wider uppercase flex items-center gap-1.5 shadow-[0_0_20px_rgba(6,182,212,0.25)] hover:brightness-110 transition-all"
            >
              <Plus className="w-4 h-4" />
              Record Transaction
            </button>
          )}
        </div>
      </motion.div>

      {/* Date Navigation Bar */}
      <GlassCard className="!p-3 flex flex-wrap items-center justify-between gap-3">
        {viewMode === 'monthly' ? (
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (selectedMonth === 0) {
                  setSelectedMonth(11);
                  setSelectedYear(prev => prev - 1);
                } else {
                  setSelectedMonth(prev => prev - 1);
                }
              }}
              className="p-1.5 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-gray-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-sm font-bold font-mono text-white tracking-wide">
              {MONTH_NAMES[selectedMonth]} {selectedYear}
            </span>

            <button
              onClick={() => {
                if (selectedMonth === 11) {
                  setSelectedMonth(0);
                  setSelectedYear(prev => prev + 1);
                } else {
                  setSelectedMonth(prev => prev + 1);
                }
              }}
              className="p-1.5 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-gray-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedWeekOffset(prev => prev + 1)}
              className="p-1.5 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-gray-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-sm font-bold font-mono text-white tracking-wide">
              {selectedWeekOffset === 0
                ? 'CURRENT WEEK'
                : `${selectedWeekOffset} WEEK${selectedWeekOffset > 1 ? 'S' : ''} AGO`}
            </span>

            <button
              onClick={() => setSelectedWeekOffset(prev => Math.max(0, prev - 1))}
              disabled={selectedWeekOffset === 0}
              className="p-1.5 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-gray-300 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-3 py-1.5 bg-gray-900 border border-gray-700/60 rounded-xl text-xs text-gray-300 focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="ALL">All Types</option>
            <option value="BUY">Buys Only</option>
            <option value="SELL">Sells Only</option>
            <option value="DEPOSIT">Deposits Only</option>
            <option value="WITHDRAWAL">Withdrawals Only</option>
          </select>

          {/* Asset Filter */}
          <select
            value={filterAsset}
            onChange={(e) => setFilterAsset(e.target.value as any)}
            className="px-3 py-1.5 bg-gray-900 border border-gray-700/60 rounded-xl text-xs text-gray-300 focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="ALL">All Assets</option>
            <option value="stock">Stocks</option>
            <option value="mutual_fund">Mutual Funds</option>
            <option value="gold">Gold</option>
            <option value="silver">Silver</option>
            <option value="cash">Cash Flow</option>
          </select>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search symbol / note..."
              className="pl-8 pr-3 py-1.5 bg-gray-900 border border-gray-700/60 rounded-xl text-xs text-gray-300 placeholder-gray-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </GlassCard>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Money Invested */}
        <GlassCard>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-400 font-mono">
              {viewMode === 'weekly' ? 'WEEKLY INVESTED' : 'MONTHLY INVESTED'}
            </p>
            <ArrowUpRight className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-xl font-bold font-mono text-white">
            {formatCurrency(summary.totalInvested)}
          </p>
          <p className="text-xs text-gray-500 mt-1 font-mono">
            {summary.buyCount} buy transactions
          </p>
        </GlassCard>

        {/* Realized Profit / Loss */}
        <GlassCard>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-400 font-mono">REALIZED P&L</p>
            <TrendingUp className={`w-4 h-4 ${summary.totalRealizedPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`} />
          </div>
          <p className={`text-xl font-bold font-mono ${
            summary.totalRealizedPnL >= 0 ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {summary.totalRealizedPnL >= 0 ? '+' : ''}{formatCurrency(summary.totalRealizedPnL)}
          </p>
          <p className="text-xs text-gray-500 mt-1 font-mono">
            {summary.sellCount} sell executions
          </p>
        </GlassCard>

        {/* Net Cash In/Out */}
        <GlassCard>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-400 font-mono">NET CASH FLOW</p>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <p className={`text-xl font-bold font-mono ${
            summary.netCashFlow >= 0 ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {summary.netCashFlow >= 0 ? '+' : ''}{formatCurrency(summary.netCashFlow)}
          </p>
          <p className="text-xs text-gray-500 mt-1 font-mono">
            +₹{summary.totalDeposited.toLocaleString('en-IN')} / -₹{summary.totalWithdrawn.toLocaleString('en-IN')}
          </p>
        </GlassCard>

        {/* Total Volume */}
        <GlassCard>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-400 font-mono">TOTAL TRANSACTIONS</p>
            <Calendar className="w-4 h-4 text-violet-400" />
          </div>
          <p className="text-xl font-bold font-mono text-white">
            {filteredTransactions.length}
          </p>
          <p className="text-xs text-gray-500 mt-1 font-mono">
            In selected timeframe
          </p>
        </GlassCard>
      </div>

      {/* Transactions Table */}
      {filteredTransactions.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No transactions recorded"
          message={`No recorded transactions found for ${
            viewMode === 'monthly' ? `${MONTH_NAMES[selectedMonth]} ${selectedYear}` : 'this week'
          }. Use the "Record Transaction" button or Add Holding to log your investments.`}
          actionLabel="Record Transaction"
          onAction={onOpenRecordTransaction}
        />
      ) : (
        <GlassCard className="overflow-hidden !p-0">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold font-mono text-gray-200">
              TRANSACTION HISTORY ({filteredTransactions.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-800/80 bg-gray-900/60 text-gray-400 font-mono uppercase">
                  <th className="text-left py-3 px-4">Date</th>
                  <th className="text-left py-3 px-4">Asset</th>
                  <th className="text-center py-3 px-3">Type</th>
                  <th className="text-right py-3 px-3">Qty</th>
                  <th className="text-right py-3 px-3">Price</th>
                  <th className="text-right py-3 px-4">Total Value</th>
                  <th className="text-right py-3 px-3">Realized P&L</th>
                  <th className="text-right py-3 px-4">Cash After</th>
                  <th className="text-left py-3 px-4">Notes</th>
                  <th className="text-center py-3 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx) => {
                  const isBuy = tx.type === 'BUY';
                  const isSell = tx.type === 'SELL';
                  const isDeposit = tx.type === 'DEPOSIT';
                  const isWithdrawal = tx.type === 'WITHDRAWAL';

                  return (
                    <tr
                      key={tx.id}
                      className="border-b border-gray-800/40 hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono text-gray-400 whitespace-nowrap">
                        {tx.date}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white">{tx.symbol}</span>
                          <span className="text-gray-400 truncate max-w-[120px]">{tx.name}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wider ${
                          isBuy
                            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                            : isSell
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                            : isDeposit
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-red-500/10 text-red-400 border border-red-500/30'
                        }`}>
                          {tx.type}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-gray-200">
                        {tx.quantity > 0 && tx.assetType !== 'cash' ? tx.quantity : '—'}
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-gray-300">
                        {tx.assetType !== 'cash' ? `₹${tx.price.toFixed(2)}` : '—'}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-semibold text-white">
                        {formatCurrency(tx.totalValue)}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-semibold">
                        {isSell && tx.realizedPnL !== undefined ? (
                          <span className={tx.realizedPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                            {tx.realizedPnL >= 0 ? '+' : ''}{formatCurrency(tx.realizedPnL)}
                          </span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-mono text-gray-300">
                        {formatCurrency(tx.cashBalanceAfter)}
                      </td>

                      <td className="py-3 px-4 text-gray-400 truncate max-w-[160px]">
                        {tx.notes || '—'}
                      </td>

                      <td className="py-3 px-2 text-center">
                        <button
                          onClick={() => deleteTransaction(tx.id)}
                          className="p-1 text-gray-600 hover:text-red-400 transition-colors"
                          title="Delete transaction entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  );
};

export default LedgerPage;
