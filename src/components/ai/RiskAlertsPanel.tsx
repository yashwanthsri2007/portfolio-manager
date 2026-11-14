import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, ShieldAlert, TrendingDown, PieChart,
  Wallet, Zap, ChevronDown, ChevronUp, Sparkles, X, Info
} from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext';
import { getStoredGeminiKey } from '../../services/aiService';

type Severity = 'CRITICAL' | 'WARNING' | 'INFO';

interface RiskAlert {
  id: string;
  severity: Severity;
  icon: string;
  title: string;
  message: string;
  detail?: string;
}

const severityConfig: Record<Severity, { border: string; bg: string; text: string; badge: string }> = {
  CRITICAL: {
    border: 'border-red-500/40',
    bg: 'bg-red-500/10',
    text: 'text-red-300',
    badge: 'bg-red-500/20 text-red-300',
  },
  WARNING: {
    border: 'border-amber-500/40',
    bg: 'bg-amber-500/10',
    text: 'text-amber-300',
    badge: 'bg-amber-500/20 text-amber-300',
  },
  INFO: {
    border: 'border-blue-500/40',
    bg: 'bg-blue-500/10',
    text: 'text-blue-300',
    badge: 'bg-blue-500/20 text-blue-300',
  },
};

export const RiskAlertsPanel: React.FC<{
  onNavigate?: (page: string) => void;
  compact?: boolean;
}> = ({ onNavigate, compact = false }) => {
  const { holdings, metrics, cashBalance } = usePortfolio();
  const [expanded, setExpanded] = useState(!compact);
  const [aiModal, setAiModal] = useState<{ alert: RiskAlert; text: string; loading: boolean } | null>(null);

  const alerts: RiskAlert[] = useMemo(() => {
    const result: RiskAlert[] = [];
    const totalNetWorth = metrics.totalNetWorth;

    if (totalNetWorth <= 0) return result;

    // 1. Concentration Risk — single stock > 20%
    metrics.concentrationRisk.forEach(c => {
      if (c.weight > 20) {
        result.push({
          id: `conc_${c.symbol}`,
          severity: c.weight > 35 ? 'CRITICAL' : 'WARNING',
          icon: '⚠️',
          title: 'HIGH CONCENTRATION',
          message: `${c.name} represents ${c.weight.toFixed(1)}% of your portfolio.`,
          detail: 'Consider trimming this position to reduce single-stock risk. Recommended max per stock: 20%.',
        });
      }
    });

    // 2. Sector concentration > 40%
    metrics.sectorAllocation.forEach(s => {
      if (s.percentage > 40) {
        result.push({
          id: `sector_${s.sector}`,
          severity: 'WARNING',
          icon: '⚠️',
          title: 'SECTOR RISK',
          message: `${s.percentage.toFixed(1)}% exposure to ${s.sector}.`,
          detail: 'Diversify across sectors to reduce concentration risk. Max recommended sector exposure: 40%.',
        });
      }
    });

    // 3. Large drawdown > 25%
    holdings.forEach(h => {
      const currentPrice = h.currentPrice || h.manualPrice || h.averagePrice;
      if (currentPrice < h.averagePrice) {
        const lossPercent = ((currentPrice - h.averagePrice) / h.averagePrice) * 100;
        if (Math.abs(lossPercent) > 25) {
          result.push({
            id: `loss_${h.id}`,
            severity: 'CRITICAL',
            icon: '🔴',
            title: 'SIGNIFICANT LOSS',
            message: `${h.name} is down ${lossPercent.toFixed(1)}% from your average cost.`,
            detail: 'Review your stop-loss strategy. Consider whether fundamentals have changed or this is a temporary correction.',
          });
        }
      }
    });

    // 4. Low diversification
    if (holdings.length > 0 && holdings.length < 5) {
      result.push({
        id: 'low_div',
        severity: 'INFO',
        icon: '📊',
        title: 'LOW DIVERSIFICATION',
        message: `Only ${holdings.length} holding${holdings.length === 1 ? '' : 's'} in portfolio.`,
        detail: 'Consider diversifying across at least 8-10 stocks across different sectors and asset classes.',
      });
    }

    // 5. Cash alert > 50%
    const cashPercent = totalNetWorth > 0 ? (cashBalance / totalNetWorth) * 100 : 0;
    if (cashPercent > 50) {
      result.push({
        id: 'high_cash',
        severity: 'INFO',
        icon: '💰',
        title: 'HIGH CASH',
        message: `${cashPercent.toFixed(1)}% of portfolio is in cash.`,
        detail: 'Consider deploying idle capital gradually using SIP or staggered entry strategies.',
      });
    }

    // 6. Crypto overweight > 30%
    const cryptoAlloc = metrics.assetAllocation.find(a => a.category === 'Crypto');
    if (cryptoAlloc && cryptoAlloc.percentage > 30) {
      result.push({
        id: 'crypto_risk',
        severity: 'WARNING',
        icon: '⚡',
        title: 'CRYPTO RISK',
        message: `${cryptoAlloc.percentage.toFixed(1)}% in crypto — a highly volatile asset class.`,
        detail: 'Recommended crypto allocation for most investors: < 10-15% of total portfolio.',
      });
    }

    return result;
  }, [holdings, metrics, cashBalance]);

  const fetchAIExplanation = async (alert: RiskAlert) => {
    setAiModal({ alert, text: '', loading: true });
    const key = getStoredGeminiKey();
    if (!key) {
      setAiModal({ alert, text: 'No Gemini API key configured. Please add it in Settings to enable AI explanations.', loading: false });
      return;
    }
    try {
      const res = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-gemini-key': key },
        body: JSON.stringify({
          prompt: `Explain this portfolio risk in simple terms for a retail Indian investor: "${alert.title}: ${alert.message}". Provide 2-3 practical steps to mitigate this risk. Keep it under 120 words, friendly tone.`,
          model: 'gemini-2.0-flash',
        }),
      });
      const data = await res.json();
      setAiModal({ alert, text: data.text || data.error || 'No response', loading: false });
    } catch (e: any) {
      setAiModal({ alert, text: `Error: ${e.message}`, loading: false });
    }
  };

  const displayAlerts = compact ? alerts.slice(0, 2) : alerts;

  if (compact) {
    return (
      <div className="bg-gray-900/50 backdrop-blur border border-gray-700/50 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <ShieldAlert size={16} className="text-red-400" /> Risk Alerts
            {alerts.length > 0 && (
              <span className="bg-red-500/20 text-red-300 text-xs px-2 py-0.5 rounded-full border border-red-500/30">{alerts.length}</span>
            )}
          </h3>
          {onNavigate && (
            <button onClick={() => onNavigate('ai_advisor')} className="text-xs text-cyan-400 hover:text-cyan-300">View All →</button>
          )}
        </div>
        {alerts.length === 0 ? (
          <p className="text-emerald-400 text-xs flex items-center gap-1"><span>✅</span> No risk alerts. Portfolio looks healthy!</p>
        ) : (
          <div className="space-y-2">
            {displayAlerts.map(alert => (
              <div key={alert.id} className={`flex items-start gap-2 p-2 rounded-xl border ${severityConfig[alert.severity].border} ${severityConfig[alert.severity].bg}`}>
                <span className="text-sm shrink-0">{alert.icon}</span>
                <div className="min-w-0">
                  <p className={`text-xs font-semibold ${severityConfig[alert.severity].text}`}>{alert.title}</p>
                  <p className="text-gray-400 text-xs truncate">{alert.message}</p>
                </div>
              </div>
            ))}
            {alerts.length > 2 && (
              <p className="text-gray-500 text-xs text-center">+{alerts.length - 2} more alerts</p>
            )}
          </div>
        )}
      </div>
    );
  }

  // Full mode
  return (
    <div className="bg-gray-900/50 backdrop-blur border border-gray-700/50 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <ShieldAlert size={22} className="text-red-400" />
          <div>
            <h2 className="text-white font-semibold">AI Risk Alerts</h2>
            <p className="text-gray-400 text-xs">Auto-scanned from your portfolio</p>
          </div>
          {alerts.length > 0 && (
            <div className="flex gap-2">
              {(['CRITICAL', 'WARNING', 'INFO'] as Severity[]).map(s => {
                const count = alerts.filter(a => a.severity === s).length;
                if (!count) return null;
                return (
                  <span key={s} className={`text-xs px-2 py-0.5 rounded-full ${severityConfig[s].badge}`}>{count} {s}</span>
                );
              })}
            </div>
          )}
        </div>
        <button onClick={() => setExpanded(e => !e)} className="text-gray-400 hover:text-white transition-colors">
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3">
            {alerts.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-4xl">✅</span>
                <p className="text-emerald-400 mt-3 font-medium">No risk alerts detected</p>
                <p className="text-gray-500 text-sm">Your portfolio looks well-balanced. Keep it up!</p>
              </div>
            ) : (
              displayAlerts.map(alert => (
                <motion.div key={alert.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className={`border rounded-2xl p-4 ${severityConfig[alert.severity].border} ${severityConfig[alert.severity].bg}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="text-xl shrink-0 mt-0.5">{alert.icon}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-bold tracking-wide ${severityConfig[alert.severity].text}`}>{alert.severity}</span>
                          <span className="text-white font-semibold text-sm">{alert.title}</span>
                        </div>
                        <p className="text-gray-300 text-sm">{alert.message}</p>
                        {alert.detail && <p className="text-gray-500 text-xs mt-1">{alert.detail}</p>}
                      </div>
                    </div>
                    <button
                      onClick={() => fetchAIExplanation(alert)}
                      className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 text-violet-300 text-xs rounded-xl transition-all whitespace-nowrap"
                    >
                      <Sparkles size={12} /> AI Explain
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Explanation Modal */}
      <AnimatePresence>
        {aiModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-gray-900 border border-violet-500/30 rounded-2xl p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Sparkles size={18} className="text-violet-400" /> AI Explanation
                </h3>
                <button onClick={() => setAiModal(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
              </div>
              <div className={`p-3 rounded-xl mb-4 ${severityConfig[aiModal.alert.severity].bg} border ${severityConfig[aiModal.alert.severity].border}`}>
                <p className={`text-sm font-semibold ${severityConfig[aiModal.alert.severity].text}`}>{aiModal.alert.icon} {aiModal.alert.title}</p>
                <p className="text-gray-300 text-xs mt-1">{aiModal.alert.message}</p>
              </div>
              {aiModal.loading ? (
                <div className="flex items-center gap-3 py-6 justify-center">
                  <div className="w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-gray-400 text-sm">Generating explanation...</span>
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
