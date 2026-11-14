// src/components/angelone/AngelOneModal.tsx
// Angel One SmartAPI Integration Modal (Read-Only)

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Key,
  Lock,
  Smartphone,
  ExternalLink,
  Layers,
  ArrowRight,
  LogOut,
  Clock,
  Sparkles
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { usePortfolio } from '../../context/PortfolioContext';
import { useAuth } from '../../context/AuthContext';
import {
  loginAngelOne,
  fetchAngelOneHoldings,
  fetchAngelOneFunds,
  getStoredAngelOneSession,
  clearAngelOneSession,
  getAngelOneLastSync,
  mergeAngelOneHoldings,
  type AngelOneSession,
  type AngelOneHoldingCandidate,
  type AngelOneRMS
} from '../../services/angelOneService';
import { formatCurrency } from '../../utils/formatters';

interface AngelOneModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AngelOneModal: React.FC<AngelOneModalProps> = ({ isOpen, onClose }) => {
  const { holdings, importHoldings, depositCash, setCashBalance, cashBalance } = usePortfolio();
  const { user } = useAuth();

  // Connection Credentials
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('pm_ao_apikey') || '');
  const [clientCode, setClientCode] = useState(() => localStorage.getItem('pm_ao_clientcode') || '');
  const [mpin, setMpin] = useState('');
  const [totp, setTotp] = useState('');

  // Status & Data
  const [session, setSession] = useState<AngelOneSession | null>(getStoredAngelOneSession);
  const [lastSync, setLastSync] = useState<string | null>(getAngelOneLastSync);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Fetched Holdings & Selection
  const [candidates, setCandidates] = useState<AngelOneHoldingCandidate[]>([]);
  const [rmsFunds, setRmsFunds] = useState<AngelOneRMS | null>(null);
  const [syncCashToo, setSyncCashToo] = useState(true);

  // Sync session on mount
  useEffect(() => {
    const active = getStoredAngelOneSession();
    setSession(active);
    setLastSync(getAngelOneLastSync());
  }, [isOpen]);

  // Handle Login & Fetch
  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey || !clientCode || !mpin || !totp) {
      setStatusMessage({ type: 'error', text: 'Please enter all credentials (API Key, Client Code, MPIN, and TOTP).' });
      return;
    }

    setIsLoading(true);
    setStatusMessage({ type: 'info', text: 'Connecting to Angel One SmartAPI gateway...' });

    // Store key and clientcode for convenience
    localStorage.setItem('pm_ao_apikey', apiKey);
    localStorage.setItem('pm_ao_clientcode', clientCode);

    const loginRes = await loginAngelOne({ apiKey, clientCode, mpin, totp });
    if (!loginRes.success || !loginRes.session) {
      setIsLoading(false);
      setStatusMessage({ type: 'error', text: loginRes.error || 'Login failed.' });
      return;
    }

    setSession(loginRes.session);
    setLastSync(loginRes.session.lastSyncedAt);

    // Fetch Holdings & RMS Funds
    await fetchLatestHoldings(loginRes.session, apiKey);
    setIsLoading(false);
  };

  // Fetch holdings using existing active session
  const fetchLatestHoldings = async (activeSession: AngelOneSession, activeKey: string) => {
    setIsLoading(true);
    setStatusMessage({ type: 'info', text: 'Fetching your delivery stock holdings & RMS funds...' });

    const [holdingsRes, fundsRes] = await Promise.all([
      fetchAngelOneHoldings(activeSession, activeKey),
      fetchAngelOneFunds(activeSession, activeKey)
    ]);

    if (fundsRes.success && fundsRes.funds) {
      setRmsFunds(fundsRes.funds);
    }

    if (holdingsRes.success && holdingsRes.holdings) {
      // Map to candidates with selection
      const mapped: AngelOneHoldingCandidate[] = holdingsRes.holdings.map(raw => {
        const cleanSymbol = raw.tradingsymbol.toUpperCase().replace(/-EQ$/, '');
        const isExisting = holdings.some(
          h => h.symbol.toUpperCase() === cleanSymbol || (h.broker === 'Angel One' && h.symbol === raw.tradingsymbol)
        );
        return {
          ...raw,
          cleanName: cleanSymbol,
          selected: true, // Default checked
          isExisting
        };
      });

      setCandidates(mapped);
      setStatusMessage({
        type: 'success',
        text: `Successfully fetched ${mapped.length} delivery holdings from Angel One.`
      });
    } else {
      setStatusMessage({
        type: 'error',
        text: holdingsRes.error || 'Failed to fetch holdings from Angel One.'
      });
    }
    setIsLoading(false);
  };

  // Toggle selection
  const toggleSelect = (symboltoken: string) => {
    setCandidates(prev =>
      prev.map(c => (c.symboltoken === symboltoken ? { ...c, selected: !c.selected } : c))
    );
  };

  const toggleSelectAll = (select: boolean) => {
    setCandidates(prev => prev.map(c => ({ ...c, selected: select })));
  };

  // Confirm Import
  const handleConfirmImport = () => {
    const selectedCount = candidates.filter(c => c.selected).length;
    if (selectedCount === 0) {
      setStatusMessage({ type: 'error', text: 'Please select at least one holding to import.' });
      return;
    }

    const { updatedHoldings, addedCount, updatedCount } = mergeAngelOneHoldings(holdings, candidates);

    // Save into portfolio
    importHoldings(updatedHoldings, true);

    // Optionally sync available RMS cash balance
    if (syncCashToo && rmsFunds && rmsFunds.availablecash > 0) {
      setCashBalance(rmsFunds.availablecash);
    }

    setStatusMessage({
      type: 'success',
      text: `Sync Complete: ${addedCount} added, ${updatedCount} updated. Broker data linked securely.`
    });

    setTimeout(() => {
      onClose();
    }, 1200);
  };

  // Disconnect
  const handleDisconnect = () => {
    clearAngelOneSession();
    setSession(null);
    setCandidates([]);
    setRmsFunds(null);
    setStatusMessage({ type: 'info', text: 'Angel One session disconnected.' });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Angel One SmartAPI Integration" size="lg">
      <div className="space-y-5">
        {/* Security & Read-Only Notice Banner */}
        <div className="p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 flex items-start gap-3 text-xs">
          <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-cyan-300 flex items-center gap-2">
              <span>Read-Only Portfolio Synchronization</span>
              <span className="px-1.5 py-0.5 text-[9px] font-mono bg-cyan-500/20 rounded text-cyan-300">STRICTLY AUDIT</span>
            </div>
            <p className="text-gray-300 leading-relaxed">
              This integration connects via the official Angel One SmartAPI to import your actual delivery holdings, quantities, purchase prices, and RMS funds for <strong>{user.name || 'Yashwanth'}</strong>. Portfolio Manager does not possess order-placement permissions and will never execute trades.
            </p>
          </div>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div
            className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-mono ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : statusMessage.type === 'error'
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                : 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : statusMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Session Connected State */}
        {session ? (
          <div className="space-y-4">
            {/* Active Session Info Bar */}
            <div className="p-4 rounded-2xl bg-gray-900/80 border border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-xs font-bold text-gray-200">Connected: Client {session.clientCode}</span>
                </div>
                <div className="text-[11px] text-gray-400 flex items-center gap-1.5 font-mono">
                  <Clock className="w-3.5 h-3.5 text-gray-500" />
                  <span>Last Synced: {lastSync ? new Date(lastSync).toLocaleTimeString() : 'Just now'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fetchLatestHoldings(session, apiKey)}
                  disabled={isLoading}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Re-Sync</span>
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-rose-950/40 text-gray-400 hover:text-rose-300 border border-gray-700 hover:border-rose-500/40 text-xs transition-all flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              </div>
            </div>

            {/* RMS Funds Preview */}
            {rmsFunds && (
              <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between text-xs">
                <div>
                  <div className="text-gray-400 font-mono">Angel One Available Trading Cash</div>
                  <div className="text-base font-bold text-emerald-400">{formatCurrency(rmsFunds.availablecash)}</div>
                </div>
                <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncCashToo}
                    onChange={(e) => setSyncCashToo(e.target.checked)}
                    className="rounded bg-gray-900 border-gray-700 text-cyan-500 focus:ring-cyan-500"
                  />
                  <span>Sync into Cash Balance</span>
                </label>
              </div>
            )}

            {/* Candidates Holdings List */}
            {candidates.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-400 px-1">
                  <span>Holdings Ready to Import ({candidates.filter(c => c.selected).length}/{candidates.length} selected)</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleSelectAll(true)}
                      className="text-cyan-400 hover:underline"
                    >
                      Select All
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => toggleSelectAll(false)}
                      className="text-gray-400 hover:underline"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                  {candidates.map((c) => (
                    <div
                      key={c.symboltoken}
                      onClick={() => toggleSelect(c.symboltoken)}
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition-all ${
                        c.selected
                          ? 'bg-cyan-950/20 border-cyan-500/40 text-gray-100'
                          : 'bg-gray-900/40 border-gray-800 text-gray-400'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={c.selected}
                          onChange={() => toggleSelect(c.symboltoken)}
                          className="rounded bg-gray-900 border-gray-700 text-cyan-500 focus:ring-cyan-500"
                        />
                        <div>
                          <div className="font-bold flex items-center gap-2">
                            <span>{c.cleanName}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-800 text-gray-300">{c.exchange}</span>
                            {c.isExisting && (
                              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500/20 text-amber-300">
                                Updates Existing
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-400 font-mono">
                            Qty: {c.quantity} • Avg: {formatCurrency(c.avgprice)}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-bold">{formatCurrency(c.quantity * (c.close || c.avgprice))}</div>
                        {c.profitandloss !== undefined && (
                          <div className={`text-[10px] font-mono ${c.profitandloss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {c.profitandloss >= 0 ? '+' : ''}{formatCurrency(c.profitandloss)} ({c.pnlpercentage?.toFixed(2)}%)
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleConfirmImport}
                  className="w-full mt-3 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:opacity-95 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Import {candidates.filter(c => c.selected).length} Holdings into Portfolio</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Credentials Form */
          <form onSubmit={handleConnect} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-gray-400 mb-1">SmartAPI Key</label>
                <div className="relative">
                  <Key className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="e.g. your_smartapi_key"
                    required
                    className="w-full pl-9 pr-3 py-2 bg-gray-900 border border-gray-800 rounded-xl text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-gray-400 mb-1">Client Code</label>
                <div className="relative">
                  <Smartphone className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={clientCode}
                    onChange={(e) => setClientCode(e.target.value.toUpperCase())}
                    placeholder="e.g. A123456"
                    required
                    className="w-full pl-9 pr-3 py-2 bg-gray-900 border border-gray-800 rounded-xl text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-cyan-500 uppercase font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-gray-400 mb-1">Trading MPIN / Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    value={mpin}
                    onChange={(e) => setMpin(e.target.value)}
                    placeholder="4-digit MPIN"
                    required
                    maxLength={10}
                    className="w-full pl-9 pr-3 py-2 bg-gray-900 border border-gray-800 rounded-xl text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-gray-400 mb-1">Current TOTP (Google / MS Auth)</label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={totp}
                    onChange={(e) => setTotp(e.target.value)}
                    placeholder="6-digit TOTP"
                    required
                    maxLength={6}
                    className="w-full pl-9 pr-3 py-2 bg-gray-900 border border-gray-800 rounded-xl text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-cyan-500 font-mono tracking-widest"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <a
                href="https://smartapi.angelone.in"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono"
              >
                <span>Angel One Developer Portal</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 text-white font-bold text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:opacity-95 transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <span>Authenticate & Fetch Holdings</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
