import React, { useState, useMemo } from 'react';
import { 
  Briefcase, 
  Plus, 
  Upload, 
  RefreshCw, 
  Download, 
  Search, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  PieChart as PieIcon, 
  Coins, 
  ShieldCheck, 
  Layers, 
  X,
  Sparkles,
  ArrowUpDown,
  FileSpreadsheet
} from 'lucide-react';
import { Holding } from '../../types';
import { usePortfolio } from '../../context/PortfolioContext';
import { useNotifications } from '../../context/NotificationContext';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import HoldingsTable from './HoldingsTable';
import AddHoldingModal from './AddHoldingModal';
import CSVImportModal from './CSVImportModal';
import HoldingDetailDrawer from './HoldingDetailDrawer';

export interface PortfolioPageProps {
  onNavigate?: (page: string, data?: any) => void;
}

export const PortfolioPage: React.FC<PortfolioPageProps> = ({ onNavigate }) => {
  const { 
    holdings, 
    metrics, 
    refreshMarketData, 
    isRefreshing, 
    deleteHolding, 
    duplicateHolding,
    getBackupJSON
  } = usePortfolio();
  const { addNotification } = useNotifications();

  // Modals & Drawer State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);
  const [selectedHolding, setSelectedHolding] = useState<Holding | null>(null);
  const [editingHolding, setEditingHolding] = useState<Holding | undefined>(undefined);

  // Filters & Search
  const [activeTab, setActiveTab] = useState<'all' | 'stock' | 'mutual_fund' | 'gold' | 'silver'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'value' | 'name' | 'return' | 'weight' | 'invested'>('value');

  // Filter holdings by search query
  const searchedHoldings = useMemo(() => {
    if (!searchQuery.trim()) return holdings;
    const query = searchQuery.toLowerCase().trim();
    return holdings.filter(
      (h) =>
        h.name.toLowerCase().includes(query) ||
        h.symbol.toLowerCase().includes(query) ||
        (h.broker && h.broker.toLowerCase().includes(query)) ||
        (h.notes && h.notes.toLowerCase().includes(query))
    );
  }, [holdings, searchQuery]);

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      all: holdings.length,
      stock: holdings.filter((h) => h.assetType === 'stock').length,
      mutual_fund: holdings.filter((h) => h.assetType === 'mutual_fund').length,
      gold: holdings.filter((h) => h.assetType === 'gold').length,
      silver: holdings.filter((h) => h.assetType === 'silver').length,
    };
  }, [holdings]);

  // Export holdings as JSON
  const handleExportJSON = () => {
    try {
      const dataStr = getBackupJSON();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `portfolio-manager-${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      addNotification({
        title: 'Portfolio Exported',
        message: `Successfully exported ${holdings.length} holdings to JSON.`,
        type: 'success',
      });
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const handleEditHolding = (holding: Holding) => {
    setEditingHolding(holding);
    setIsAddModalOpen(true);
  };

  const isTotalProfit = metrics.totalProfitLoss >= 0;
  const isTodayProfit = metrics.todayProfitLoss >= 0;

  return (
    <div className="space-y-6 pb-12 w-full max-w-7xl mx-auto">
      {/* PAGE HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-100 tracking-tight flex items-center gap-2">
                My Portfolio
              </h1>
              <p className="text-xs text-gray-400 font-mono">
                Asset Allocation • Live Valuations • Real-Time P&L
              </p>
            </div>
          </div>
        </div>

        {/* ACTION BUTTONS ROW */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setEditingHolding(undefined);
              setIsAddModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-[0_0_20px_rgba(6,182,212,0.35)] transition-all flex items-center gap-1.5 active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Holding</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCSVModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-gray-800/80 hover:bg-gray-800 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-all flex items-center gap-1.5 hover:shadow-[0_0_15px_rgba(6,182,212,0.15)] active:scale-95"
          >
            <Upload className="w-4 h-4" />
            <span>Import CSV</span>
          </button>

          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('ledger')}
              className="px-3.5 py-2 rounded-xl bg-violet-600/30 hover:bg-violet-600/50 text-violet-300 border border-violet-500/40 text-xs font-semibold transition-all flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Investment Ledger</span>
            </button>
          )}

          <button
            type="button"
            onClick={refreshMarketData}
            disabled={isRefreshing}
            className="px-3 py-2 rounded-xl bg-gray-800/80 hover:bg-gray-800 text-gray-300 hover:text-cyan-400 border border-white/[0.08] text-xs font-semibold transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            title="Refresh Live Market Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            <span className="hidden sm:inline">{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportJSON}
            className="px-3 py-2 rounded-xl bg-gray-800/80 hover:bg-gray-800 text-gray-300 hover:text-cyan-400 border border-white/[0.08] text-xs font-semibold transition-all flex items-center gap-1.5 active:scale-95"
            title="Export portfolio as JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* PORTFOLIO SUMMARY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Portfolio Value */}
        <div className="glass-card p-4 rounded-2xl relative overflow-hidden border-white/[0.08]">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-xl pointer-events-none" />
          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">
            Total Current Value
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-gray-100 mt-1">
            {formatCurrency(metrics.totalNetWorth)}
          </div>
          <div className="text-[10px] text-gray-400 font-mono mt-1 flex items-center gap-1">
            <span>{holdings.length} assets active</span>
          </div>
        </div>

        {/* Total Invested */}
        <div className="glass-card p-4 rounded-2xl relative overflow-hidden border-white/[0.08]">
          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">
            Total Invested
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-gray-200 mt-1">
            {formatCurrency(metrics.totalInvested)}
          </div>
          <div className="text-[10px] text-gray-400 font-mono mt-1">
            Book cost basis
          </div>
        </div>

        {/* Total Profit & Loss */}
        <div className="glass-card p-4 rounded-2xl relative overflow-hidden border-white/[0.08]">
          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">
            All-Time Profit / Loss
          </span>
          <div className={`text-xl sm:text-2xl font-black font-mono mt-1 flex items-baseline gap-1 ${isTotalProfit ? 'text-emerald-400' : 'text-red-400'}`}>
            <span>{isTotalProfit ? '+' : ''}{formatCurrency(metrics.totalProfitLoss)}</span>
          </div>
          <div className={`text-[10px] font-mono font-bold mt-1 flex items-center gap-1 ${isTotalProfit ? 'text-emerald-400' : 'text-red-400'}`}>
            {isTotalProfit ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{formatPercent(metrics.totalReturnPercent)}</span>
          </div>
        </div>

        {/* Today's P&L */}
        <div className="glass-card p-4 rounded-2xl relative overflow-hidden border-white/[0.08]">
          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">
            Today's Movement
          </span>
          <div className={`text-xl sm:text-2xl font-black font-mono mt-1 ${isTodayProfit ? 'text-emerald-400' : 'text-red-400'}`}>
            <span>{isTodayProfit ? '+' : ''}{formatCurrency(metrics.todayProfitLoss)}</span>
          </div>
          <div className={`text-[10px] font-mono font-bold mt-1 flex items-center gap-1 ${isTodayProfit ? 'text-emerald-400' : 'text-red-400'}`}>
            {isTodayProfit ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{formatPercent(metrics.todayReturnPercent)} today</span>
          </div>
        </div>
      </div>

      {/* FILTER TABS & SEARCH / SORT CONTROLS */}
      <div className="glass-card p-4 rounded-2xl border-white/[0.08] space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {[
              { id: 'all', label: 'All Assets', icon: Layers, count: tabCounts.all },
              { id: 'stock', label: 'Stocks', icon: TrendingUp, count: tabCounts.stock },
              { id: 'mutual_fund', label: 'Mutual Funds', icon: PieIcon, count: tabCounts.mutual_fund },
              { id: 'gold', label: 'Gold', icon: Coins, count: tabCounts.gold },
              { id: 'silver', label: 'Silver', icon: ShieldCheck, count: tabCounts.silver },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium whitespace-nowrap flex items-center gap-1.5 transition-all ${
                    isActive
                      ? 'bg-cyan-500 text-black font-bold shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                      : 'bg-gray-800/60 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      isActive ? 'bg-black/20 text-black' : 'bg-gray-700/60 text-gray-300'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Input & Sort Dropdown */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search symbol, name, broker..."
                className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-gray-900/80 border border-white/[0.08] text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="w-4 h-4 text-gray-500 hover:text-gray-300 absolute right-2.5 top-2.5 flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1 bg-gray-900/80 border border-white/[0.08] rounded-xl px-2.5 py-1 text-xs font-mono text-gray-300 shrink-0">
              <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-gray-200 focus:outline-none cursor-pointer pr-1"
              >
                <option value="value" className="bg-[#151C2B]">Value</option>
                <option value="name" className="bg-[#151C2B]">Name</option>
                <option value="return" className="bg-[#151C2B]">Return %</option>
                <option value="weight" className="bg-[#151C2B]">Weight</option>
                <option value="invested" className="bg-[#151C2B]">Invested</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* HOLDINGS TABLE OR EMPTY STATE */}
      {holdings.length === 0 ? (
        <div className="glass-card rounded-3xl p-10 text-center border-dashed border-gray-800 space-y-4 max-w-lg mx-auto my-12">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(6,182,212,0.2)]">
            <Sparkles className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-bold text-gray-100">
              Start building your portfolio
            </h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
              Add individual equity, mutual fund, or metal holdings manually, or import your entire broker portfolio in seconds via CSV.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setEditingHolding(undefined);
                setIsAddModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Holding</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCSVModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>Import CSV</span>
            </button>
          </div>
        </div>
      ) : (
        <HoldingsTable
          holdings={searchedHoldings}
          filter={activeTab}
          sortBy={sortBy}
          onSelectHolding={(h) => setSelectedHolding(h)}
          onNavigate={onNavigate}
        />
      )}

      {/* ADD / EDIT HOLDING MODAL */}
      <AddHoldingModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingHolding(undefined);
        }}
        editHolding={editingHolding}
      />

      {/* CSV IMPORT MODAL */}
      <CSVImportModal
        isOpen={isCSVModalOpen}
        onClose={() => setIsCSVModalOpen(false)}
      />

      {/* HOLDING DETAIL RIGHT DRAWER */}
      <HoldingDetailDrawer
        holding={selectedHolding}
        isOpen={Boolean(selectedHolding)}
        onClose={() => setSelectedHolding(null)}
        onEdit={(h) => {
          setSelectedHolding(null);
          handleEditHolding(h);
        }}
        onDelete={(id) => {
          deleteHolding(id);
          setSelectedHolding(null);
          addNotification({
            title: 'Holding Deleted',
            message: 'Holding removed from your portfolio',
            type: 'alert'
          });
        }}
        onDuplicate={(id) => {
          duplicateHolding(id);
          setSelectedHolding(null);
          addNotification({
            title: 'Holding Duplicated',
            message: 'Created a duplicate copy of holding',
            type: 'info'
          });
        }}
        onNavigate={onNavigate}
      />
    </div>
  );
};

export default PortfolioPage;
