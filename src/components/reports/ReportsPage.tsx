import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  Layers,
  ShieldCheck,
  TrendingUp,
  PieChart as PieIcon,
  Sparkles,
  AlertCircle,
  FileCode,
  ArrowDownToLine,
  ExternalLink
} from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useNotifications } from '../../context/NotificationContext';
import { generatePDFReport } from '../../services/reportService';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { Holding } from '../../types';

export interface ReportsPageProps {
  onNavigate?: (page: string, data?: any) => void;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ onNavigate }) => {
  const { metrics, holdings, importHoldings, getBackupJSON } = usePortfolio();
  const { user } = useAuth();
  const { settings } = useSettings();
  const { addNotification } = useNotifications();

  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGeneratedDate, setLastGeneratedDate] = useState<string | null>(() => {
    return localStorage.getItem('portfolio_manager_last_report_date') || localStorage.getItem('nexus_last_report_date') || null;
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // PDF Generation Handler
  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    try {
      // Small delay for fluid UI animation
      await new Promise(res => setTimeout(res, 500));
      generatePDFReport(metrics, holdings, user);

      const nowStr = new Date().toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      localStorage.setItem('portfolio_manager_last_report_date', nowStr);
      setLastGeneratedDate(nowStr);

      addNotification({
        title: 'Report Downloaded',
        message: 'Portfolio Manager monthly audit PDF report has been generated and downloaded.',
        type: 'success'
      });
    } catch (err: any) {
      console.error('PDF generation error:', err);
      addNotification({
        title: 'Report Failed',
        message: `Could not generate report: ${err?.message || 'Unknown error'}`,
        type: 'alert'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Export Portfolio JSON
  const handleExportJSON = () => {
    try {
      const jsonStr = getBackupJSON();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `portfolio_manager_report_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addNotification({
        title: 'Portfolio Exported',
        message: 'Portfolio data successfully exported as JSON.',
        type: 'success'
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Export Portfolio CSV
  const handleExportCSV = () => {
    try {
      const headers = ['Symbol', 'Asset Name', 'Asset Type', 'Quantity', 'Average Price', 'Purchase Date', 'Broker'];
      const rows = holdings.map(h => [
        `"${h.symbol}"`,
        `"${h.name || h.symbol}"`,
        `"${h.assetType}"`,
        h.quantity,
        h.averagePrice,
        `"${h.purchaseDate || ''}"`,
        `"${h.broker || 'Direct'}"`
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `portfolio_holdings_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addNotification({
        title: 'CSV Exported',
        message: 'Portfolio holdings exported to CSV spreadsheet format.',
        type: 'success'
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Import Portfolio JSON file
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        const holdingsList: Holding[] = Array.isArray(parsed) 
          ? parsed 
          : Array.isArray(parsed.holdings) 
          ? parsed.holdings 
          : [];

        if (holdingsList.length === 0) {
          throw new Error('No valid holdings array found in JSON file.');
        }

        importHoldings(holdingsList, false);
        addNotification({
          title: 'Holdings Imported',
          message: `Successfully imported ${holdingsList.length} assets into your portfolio.`,
          type: 'success'
        });
      } catch (err: any) {
        addNotification({
          title: 'Import Failed',
          message: err?.message || 'Invalid JSON format.',
          type: 'alert'
        });
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportJSON}
        accept=".json"
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-wider text-gray-100 flex items-center gap-2">
                WEALTH <span className="bg-gradient-to-r from-cyan-400 via-violet-300 to-emerald-400 bg-clip-text text-transparent">REPORTS</span>
              </h1>
              <p className="text-xs text-gray-400 font-mono">
                Institutional-grade PDF portfolio audits, data export & backup pipelines
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
          <Calendar className="w-4 h-4 text-cyan-400" />
          <span>Statement Cycle: <strong>{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</strong></span>
        </div>
      </div>

      {/* Primary Report Generation Section */}
      <div className="glass-card p-6 md:p-8 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-[#111827]/90 via-[#151C2B]/90 to-[#182033]/90 relative overflow-hidden shadow-[0_0_35px_rgba(6,182,212,0.12)]">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/40">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Comprehensive Wealth Statement
            </div>
            <h2 className="text-xl md:text-2xl font-black text-gray-100">
              Generate Comprehensive Monthly Portfolio Audit
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
              Produces a publication-ready PDF document including full net worth valuation, multi-asset allocation, individual security performance tables, sector distribution, and quantitative risk metrics.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-gray-400 font-mono">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Asset Allocation Table
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Top 10 Holdings Matrix
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Risk Health Scores
              </span>
            </div>
          </div>

          <div className="flex flex-col items-start lg:items-end gap-3 shrink-0">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleGeneratePDF}
              disabled={isGenerating}
              className="px-6 py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-black font-black text-sm tracking-wide shadow-[0_0_25px_rgba(6,182,212,0.4)] flex items-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className={`w-5 h-5 ${isGenerating ? 'animate-bounce' : ''}`} />
              <span>{isGenerating ? 'GENERATING PDF REPORT...' : 'GENERATE MONTHLY REPORT'}</span>
            </motion.button>

            {lastGeneratedDate && (
              <span className="text-[11px] font-mono text-gray-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                Last generated: <span className="text-cyan-300">{lastGeneratedDate}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Report Structure & Preview Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            Report Document Schema & Live Blueprint
          </h3>
          <span className="text-[11px] text-gray-500 font-mono">5 Audit Sections</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1: Executive Summary */}
          <div className="glass-card p-5 rounded-2xl border border-white/[0.08] hover:border-cyan-500/30 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 text-cyan-400">
                <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Section 01</span>
                <TrendingUp className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-gray-100">Executive Valuation Summary</h4>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Snapshot of gross net worth, total invested capital, total profit/loss, and annualized return alpha.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-800 flex items-center justify-between text-xs font-mono">
              <span className="text-gray-400">Net Worth Value:</span>
              <span className="text-cyan-300 font-bold">{formatCurrency(metrics.totalNetWorth, settings.currency)}</span>
            </div>
          </div>

          {/* Card 2: Asset Allocation Breakdown */}
          <div className="glass-card p-5 rounded-2xl border border-white/[0.08] hover:border-violet-500/30 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 text-violet-400">
                <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Section 02</span>
                <PieIcon className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-gray-100">Asset Class Allocation</h4>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Tabular breakdown of Equity, Mutual Funds, Bullion, and Cash with capital weights and yields.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-800 flex items-center justify-between text-xs font-mono">
              <span className="text-gray-400">Asset Classes:</span>
              <span className="text-violet-300 font-bold">{metrics.assetAllocation.length} Active Categories</span>
            </div>
          </div>

          {/* Card 3: Top Portfolio Holdings */}
          <div className="glass-card p-5 rounded-2xl border border-white/[0.08] hover:border-emerald-500/30 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 text-emerald-400">
                <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Section 03</span>
                <Layers className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-gray-100">Top Holdings Ledger</h4>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Itemized register showing symbol, security name, quantity, acquisition price, and custodian/broker.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-800 flex items-center justify-between text-xs font-mono">
              <span className="text-gray-400">Holdings Included:</span>
              <span className="text-emerald-300 font-bold">{Math.min(10, holdings.length)} Securities</span>
            </div>
          </div>

          {/* Card 4: Risk Diagnostics */}
          <div className="glass-card p-5 rounded-2xl border border-white/[0.08] hover:border-amber-500/30 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 text-amber-400">
                <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Section 04</span>
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-gray-100">Health & Risk Assessment</h4>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Quantitative risk metrics including single-asset concentration thresholds and diversification scores.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-800 flex items-center justify-between text-xs font-mono">
              <span className="text-gray-400">Health Score:</span>
              <span className="text-amber-300 font-bold">{metrics.diversificationScore}/100</span>
            </div>
          </div>

          {/* Card 5: Sentiment & Catalysts */}
          <div className="glass-card p-5 rounded-2xl border border-white/[0.08] hover:border-cyan-500/30 transition-all flex flex-col justify-between lg:col-span-2">
            <div>
              <div className="flex items-center justify-between mb-3 text-cyan-400">
                <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Section 05</span>
                <Sparkles className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-gray-100">Market Sentiment & Macro Catalysts</h4>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Algorithmic sentiment scoring derived from live financial intelligence feeds and corporate disclosures across your holdings.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-800 flex items-center justify-between text-xs font-mono">
              <span className="text-gray-400">Sentiment Score:</span>
              <span className="text-cyan-300 font-bold">{metrics.portfolioSentimentScore}/100</span>
            </div>
          </div>
        </div>
      </div>

      {/* Data Export & Backup Section */}
      <div className="glass-card p-6 rounded-2xl border border-white/[0.08] space-y-5">
        <div>
          <h3 className="text-sm font-black tracking-wide text-gray-100 flex items-center gap-2">
            <ArrowDownToLine className="w-4 h-4 text-cyan-400" />
            DATA EXPORT & PORTFOLIO BACKUP PIPELINES
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Export structured machine-readable backups or restore holdings from external JSON files.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Export JSON */}
          <div className="p-4 rounded-xl bg-[#111827]/70 border border-white/[0.06] hover:border-cyan-500/30 transition-all flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold mb-1">
                <FileCode className="w-4 h-4" />
                <span>PORTFOLIO JSON EXPORT</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Complete lossless backup of all holdings, weights, and metadata.
              </p>
            </div>
            <button
              onClick={handleExportJSON}
              className="w-full py-2.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-[0_0_12px_rgba(6,182,212,0.15)]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Portfolio JSON</span>
            </button>
          </div>

          {/* Export CSV */}
          <div className="p-4 rounded-xl bg-[#111827]/70 border border-white/[0.06] hover:border-emerald-500/30 transition-all flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold mb-1">
                <FileSpreadsheet className="w-4 h-4" />
                <span>CSV SPREADSHEET</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Compatible with Excel, Google Sheets, Zerodha, and tax filing software.
              </p>
            </div>
            <button
              onClick={handleExportCSV}
              className="w-full py-2.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-[0_0_12px_rgba(16,185,129,0.15)]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV Table</span>
            </button>
          </div>

          {/* Import JSON */}
          <div className="p-4 rounded-xl bg-[#111827]/70 border border-white/[0.06] hover:border-violet-500/30 transition-all flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-violet-400 font-mono text-xs font-bold mb-1">
                <Upload className="w-4 h-4" />
                <span>RESTORE FROM BACKUP</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Restore or merge holdings from a previously exported Portfolio Manager JSON backup.
              </p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-violet-300 border border-violet-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-[0_0_12px_rgba(124,58,237,0.15)]"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Portfolio JSON</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
