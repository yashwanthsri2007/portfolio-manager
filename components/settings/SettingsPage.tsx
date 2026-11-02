import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  User,
  Shield,
  Palette,
  Key,
  Database,
  Bell,
  Info,
  Eye,
  EyeOff,
  Check,
  Save,
  Trash2,
  Download,
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  DollarSign,
  Radio,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { usePortfolio } from '../../context/PortfolioContext';
import { useNotifications } from '../../context/NotificationContext';
import { exportHoldingsCSV } from '../../services/portfolioService';
import { testFinnhubConnection } from '../../services/marketDataService';
import { testGeminiConnection } from '../../services/aiService';

export interface SettingsPageProps {
  onNavigate?: (page: string, data?: any) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = () => {
  const { user, updateProfile } = useAuth();
  const { settings, updateSettings, resetSettings } = useSettings();
  const {
    holdings,
    clearAllData,
    loadSamplePortfolio,
    restoreFromBackup,
    getBackupJSON
  } = usePortfolio();
  const { addNotification } = useNotifications();

  // Profile Edit State
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(user.name);

  // API Key Form State
  const [finnhubKey, setFinnhubKey] = useState(settings.finnhubKey || '');
  const [geminiKey, setGeminiKey] = useState(settings.geminiKey || '');
  const [newsKey, setNewsKey] = useState(settings.newsKey || '');

  // Connection Test State
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [apiTestResult, setApiTestResult] = useState<{ success: boolean; message: string; latency?: number } | null>(null);

  const [isTestingGemini, setIsTestingGemini] = useState(false);
  const [geminiTestResult, setGeminiTestResult] = useState<{ success: boolean; message: string; latency?: number; model?: string } | null>(null);

  // Password Visibility Toggles
  const [showFinnhub, setShowFinnhub] = useState(false);
  const [showGemini, setShowGemini] = useState(false);
  const [showNews, setShowNews] = useState(false);

  // Dialogs
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showSampleConfirm, setShowSampleConfirm] = useState(false);

  // File input ref for backup restore
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save Profile Name
  const handleSaveProfile = () => {
    if (!editName.trim()) return;
    updateProfile({ name: editName.trim() });
    setIsEditingName(false);
    addNotification({
      title: 'Profile Updated',
      message: `Account name updated to ${editName.trim()}.`,
      type: 'success'
    });
  };

  // Save API Keys
  const handleSaveAPIKeys = () => {
    updateSettings({
      finnhubKey: finnhubKey.trim(),
      geminiKey: geminiKey.trim(),
      newsKey: newsKey.trim()
    });

    addNotification({
      title: 'API Keys Saved',
      message: 'Finnhub & AI credentials stored locally.',
      type: 'success'
    });
  };

  // Test Finnhub Connection
  const handleTestFinnhub = async () => {
    setIsTestingApi(true);
    setApiTestResult(null);
    try {
      const res = await testFinnhubConnection(finnhubKey.trim());
      setApiTestResult(res);
      updateSettings({
        lastApiCheck: {
          status: res.success ? 'connected' : 'error',
          message: res.message,
          timestamp: new Date().toLocaleTimeString()
        }
      });
      addNotification({
        title: res.success ? 'Finnhub Connected' : 'Finnhub Error',
        message: res.message,
        type: res.success ? 'success' : 'alert'
      });
    } catch (err: any) {
      setApiTestResult({ success: false, message: err?.message || 'Connection failed' });
    } finally {
      setIsTestingApi(false);
    }
  };

  // Test Gemini AI Connection
  const handleTestGemini = async () => {
    setIsTestingGemini(true);
    setGeminiTestResult(null);
    try {
      const res = await testGeminiConnection(geminiKey.trim());
      setGeminiTestResult(res);
      addNotification({
        title: res.success ? 'Gemini AI Connected' : 'Gemini AI Error',
        message: res.message,
        type: res.success ? 'success' : 'alert'
      });
    } catch (err: any) {
      setGeminiTestResult({ success: false, message: err?.message || 'Connection failed' });
    } finally {
      setIsTestingGemini(false);
    }
  };

  // Export Full JSON Backup
  const handleExportJSON = () => {
    try {
      const jsonStr = getBackupJSON();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `portfolio_manager_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addNotification({
        title: 'Full Backup Exported',
        message: 'Complete portfolio, cash, and transaction history exported.',
        type: 'success'
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Export CSV Table
  const handleExportCSV = () => {
    try {
      const csvContent = exportHoldingsCSV(holdings);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `portfolio_manager_holdings_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addNotification({
        title: 'Holdings CSV Exported',
        message: 'Holdings exported to CSV table.',
        type: 'success'
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Import / Restore Full JSON
  const handleRestoreJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        restoreFromBackup(content);
        addNotification({
          title: 'Portfolio Restored',
          message: 'Complete portfolio and transaction ledger restored from backup file.',
          type: 'success'
        });
      } catch (err: any) {
        addNotification({
          title: 'Restore Error',
          message: err?.message || 'Invalid backup file format.',
          type: 'alert'
        });
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  // Clear all data
  const handleConfirmClearData = () => {
    clearAllData();
    setShowClearConfirm(false);
    addNotification({
      title: 'Portfolio Reset',
      message: 'All holdings, cash, and transactions have been reset.',
      type: 'alert'
    });
  };

  // Load sample portfolio
  const handleConfirmSampleData = () => {
    loadSamplePortfolio();
    setShowSampleConfirm(false);
    addNotification({
      title: 'Sample Data Loaded',
      message: 'Sample test portfolio loaded for exploration. You can clear it anytime.',
      type: 'info'
    });
  };

  return (
    <div className="space-y-8 pb-12 max-w-5xl mx-auto">
      {/* Hidden File Input for Restore */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleRestoreJSON}
        accept=".json"
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-wider text-gray-100 flex items-center gap-2">
                PORTFOLIO <span className="bg-gradient-to-r from-cyan-400 via-white to-violet-300 bg-clip-text text-transparent">SETTINGS</span>
              </h1>
              <p className="text-xs text-gray-400 font-mono">
                API credentials, local persistence, backup/restore & display preferences
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            resetSettings();
            addNotification({
              title: 'Settings Reset',
              message: 'Settings restored to factory defaults.',
              type: 'info'
            });
          }}
          className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-cyan-400 border border-white/[0.08] text-xs font-semibold flex items-center gap-2 transition-all self-start md:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Defaults</span>
        </button>
      </div>

      {/* Sections Grid */}
      <div className="space-y-6">
        {/* Section A: Profile Card */}
        <div className="glass-card p-6 rounded-2xl border border-white/[0.08] space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-800">
            <User className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wider font-mono">
              Account Profile
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src={user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'}
                alt={user.name || 'Yashwanth'}
                className="w-14 h-14 rounded-2xl object-cover border-2 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              />
              <div className="space-y-1">
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="px-3 py-1 text-sm bg-gray-900 border border-cyan-500/50 rounded-lg text-gray-100 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    />
                    <button
                      onClick={handleSaveProfile}
                      className="p-1.5 rounded-lg bg-cyan-500 text-black hover:bg-cyan-400 transition-all"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingName(false);
                        setEditName(user.name);
                      }}
                      className="px-2 py-1 text-xs text-gray-400 hover:text-gray-200"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-gray-100">{user.name || 'Yashwanth'}</h3>
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-mono underline"
                    >
                      Edit Display Name
                    </button>
                  </div>
                )}
                <div className="text-xs text-gray-400 font-mono">{user.email || 'Yashwanth@portfoliomanager.io'}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-gradient-to-r from-cyan-500/20 to-violet-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.2)]">
                {user.plan || 'PRO'}
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active Session
              </span>
            </div>
          </div>
        </div>

        {/* Section B: Finnhub & AI Telemetry APIs */}
        <div className="glass-card p-6 rounded-2xl border border-white/[0.08] space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-gray-800">
            <div className="flex items-center gap-2.5">
              <Key className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wider font-mono">
                Market Feeds (Finnhub API) & Gemini AI Telemetry
              </h2>
            </div>
            <button
              onClick={handleSaveAPIKeys}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Credentials</span>
            </button>
          </div>

          {/* Environment Variable Setup & Security Explanation */}
          <div className="p-3.5 rounded-xl bg-gray-900/80 border border-gray-700/60 text-xs text-gray-300 space-y-2 leading-relaxed">
            <div className="font-semibold text-cyan-400 flex items-center gap-1.5">
              <Shield className="w-4 h-4" />
              Enterprise Security & Server-Side Proxy Isolation
            </div>
            <p className="text-gray-400 text-[11px]">
              API requests are securely routed through server proxies (<code className="text-cyan-300 font-mono bg-black/40 px-1 py-0.5 rounded">/api/finnhub/</code> and <code className="text-cyan-300 font-mono bg-black/40 px-1 py-0.5 rounded">/api/gemini/</code>). To avoid storing secrets in browser storage altogether, you can set <code className="text-cyan-300 font-mono bg-black/40 px-1 py-0.5 rounded">FINNHUB_API_KEY</code> and <code className="text-cyan-300 font-mono bg-black/40 px-1 py-0.5 rounded">GEMINI_API_KEY</code> in your root <code className="text-cyan-300 font-mono bg-black/40 px-1 py-0.5 rounded">.env</code> file.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Finnhub Integration Card */}
            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-gray-200">Finnhub Stock API</span>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-2 py-0.5 rounded">Free Plan</span>
                </div>
                <p className="text-[11px] text-gray-400">
                  Retrieves live quotes, closing prices, and company profiles for US stocks.
                </p>

                <div className="relative flex items-center pt-1">
                  <input
                    type={showFinnhub ? 'text' : 'password'}
                    value={finnhubKey}
                    onChange={(e) => setFinnhubKey(e.target.value)}
                    placeholder="Enter token (e.g. c8xxxxxxxxxxxxxx)"
                    className="w-full bg-black/50 border border-white/[0.08] focus:border-cyan-500/50 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-gray-100 placeholder-gray-600 focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFinnhub(!showFinnhub)}
                    className="absolute right-3 text-gray-500 hover:text-gray-300"
                  >
                    {showFinnhub ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Finnhub Test Result */}
                {apiTestResult && (
                  <div className={`p-2.5 rounded-xl border text-[11px] flex items-center gap-2 ${
                    apiTestResult.success
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                      : 'bg-red-950/30 border-red-500/40 text-red-300'
                  }`}>
                    {apiTestResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                    <span className="leading-snug">{apiTestResult.message}</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleTestFinnhub}
                disabled={isTestingApi}
                className="w-full py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
              >
                <Radio className={`w-3.5 h-3.5 ${isTestingApi ? 'animate-spin' : ''}`} />
                <span>{isTestingApi ? 'Testing Finnhub Ping...' : 'Test Finnhub Connection'}</span>
              </button>
            </div>

            {/* Google Gemini AI Integration Card */}
            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-gray-200">Google Gemini AI</span>
                  <span className="text-[10px] font-mono text-violet-400 bg-violet-950/40 border border-violet-800/40 px-2 py-0.5 rounded">gemini-3.8-flash</span>
                </div>
                <p className="text-[11px] text-gray-400">
                  Powers CyberFinance AI advisor with stable gemini-3.8-flash neural intelligence and real portfolio reasoning.
                </p>

                <div className="relative flex items-center pt-1">
                  <input
                    type={showGemini ? 'text' : 'password'}
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder="Enter Gemini API key (AIzaSy...)"
                    className="w-full bg-black/50 border border-white/[0.08] focus:border-cyan-500/50 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-gray-100 placeholder-gray-600 focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGemini(!showGemini)}
                    className="absolute right-3 text-gray-500 hover:text-gray-300"
                  >
                    {showGemini ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Gemini Test Result */}
                {geminiTestResult && (
                  <div className={`p-2.5 rounded-xl border text-[11px] flex items-center gap-2 ${
                    geminiTestResult.success
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                      : 'bg-red-950/30 border-red-500/40 text-red-300'
                  }`}>
                    {geminiTestResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                    <span className="leading-snug">{geminiTestResult.message}</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleTestGemini}
                disabled={isTestingGemini}
                className="w-full py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-violet-300 border border-violet-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isTestingGemini ? 'animate-spin' : ''}`} />
                <span>{isTestingGemini ? 'Testing Gemini AI Ping...' : 'Test Gemini Connection'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section C: Data Management & Persistence */}
        <div className="glass-card p-6 rounded-2xl border border-white/[0.08] space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-800">
            <Database className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wider font-mono">
              Portfolio Persistence & Backup
            </h2>
          </div>

          <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300 flex items-start gap-3">
            <Shield className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              All portfolio data, cash records, and transaction ledgers are saved locally on your computer in localStorage. You can download a complete JSON backup and restore it anytime.
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            <button
              onClick={handleExportJSON}
              className="p-3 rounded-xl bg-gray-900/80 hover:bg-gray-800 border border-white/[0.06] text-xs font-semibold text-gray-300 hover:text-cyan-400 flex items-center justify-center gap-2 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Full JSON Backup</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 rounded-xl bg-gray-900/80 hover:bg-gray-800 border border-white/[0.06] text-xs font-semibold text-gray-300 hover:text-violet-400 flex items-center justify-center gap-2 transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Restore from JSON</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="p-3 rounded-xl bg-gray-900/80 hover:bg-gray-800 border border-white/[0.06] text-xs font-semibold text-gray-300 hover:text-emerald-400 flex items-center justify-center gap-2 transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Holdings CSV</span>
            </button>

            <button
              onClick={() => setShowSampleConfirm(true)}
              className="p-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-xs font-bold text-cyan-400 flex items-center justify-center gap-2 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load Sample Portfolio</span>
            </button>
          </div>

          {/* Destructive Actions Row */}
          <div className="pt-3 border-t border-gray-800/80 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Permanently wipe all holdings, transactions, and cash records
            </div>
            <button
              onClick={() => setShowClearConfirm(true)}
              className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs font-bold text-red-400 flex items-center gap-2 transition-all shadow-[0_0_12px_rgba(239,68,68,0.15)]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All Data</span>
            </button>
          </div>
        </div>

        {/* Section D: About Portfolio Manager */}
        <div className="glass-card p-6 rounded-2xl border border-white/[0.08] space-y-3">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-800">
            <Info className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wider font-mono">
              About Portfolio Manager
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-400">
            <div>
              <div className="text-gray-200 font-bold">PORTFOLIO MANAGER v2.0.0</div>
              <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                Personal Wealth Management System • Real Data Ledger & Finnhub Telemetry
              </div>
            </div>
            <div className="text-[11px] font-mono text-gray-500">
              Personalized for: <strong className="text-white">{user.name || 'Yashwanth'}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal: Clear All Data */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card max-w-md w-full p-6 rounded-2xl border border-red-500/40 shadow-[0_0_40px_rgba(239,68,68,0.3)] space-y-4"
            >
              <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-lg font-black text-gray-100">Permanent Data Reset</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  This will permanently clear all your cash records, holdings, and transaction history. Are you sure? This action cannot be reversed without a backup file.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmClearData}
                  className="py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-all"
                >
                  Yes, Clear Everything
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal: Load Sample Data */}
      <AnimatePresence>
        {showSampleConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card max-w-md w-full p-6 rounded-2xl border border-cyan-500/40 shadow-[0_0_40px_rgba(6,182,212,0.3)] space-y-4"
            >
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-lg font-black text-gray-100">Load Sample Test Data?</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  This will populate test stocks (Reliance, Infosys, HDFC Bank) and transactions to test the ledger, charts, and analysis features. You can clear it anytime with Clear All Data.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setShowSampleConfirm(false)}
                  className="py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSampleData}
                  className="py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all"
                >
                  Load Sample Data
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SettingsPage;
