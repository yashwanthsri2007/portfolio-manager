import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  HeartPulse,
  ShieldCheck,
  TrendingUp,
  PieChart,
  Layers,
  Wallet,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Info
} from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext';
import { formatCurrency } from '../../utils/formatters';

export interface PortfolioHealthPageProps {
  onNavigate?: (page: string) => void;
}

interface SubScore {
  key: string;
  label: string;
  score: number;
  description: string;
  icon: React.ElementType;
  tip: string;
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
}

function scoreBarColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-yellow-500';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}

function scoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Needs Attention';
}

function grade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B+';
  if (score >= 60) return 'B';
  if (score >= 40) return 'C';
  return 'D';
}

/** SVG circular gauge */
const CircularGauge: React.FC<{ score: number }> = ({ score }) => {
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;
  const color =
    score >= 80 ? '#10B981' : score >= 60 ? '#EAB308' : score >= 40 ? '#F97316' : '#EF4444';

  return (
    <svg width="200" height="200" className="mx-auto">
      <circle cx="100" cy="100" r={radius} fill="none" stroke="#1F2937" strokeWidth="16" />
      <circle
        cx="100"
        cy="100"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="16"
        strokeDasharray={`${filled} ${circumference - filled}`}
        strokeDashoffset={circumference / 4}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1s ease' }}
      />
      <text x="100" y="92" textAnchor="middle" fill={color} fontSize="36" fontWeight="bold">
        {score}
      </text>
      <text x="100" y="116" textAnchor="middle" fill="#9CA3AF" fontSize="12">
        / 100
      </text>
      <text x="100" y="136" textAnchor="middle" fill={color} fontSize="14" fontWeight="600">
        {grade(score)}
      </text>
    </svg>
  );
};

export const PortfolioHealthPage: React.FC<PortfolioHealthPageProps> = ({ onNavigate: _onNavigate }) => {
  const { metrics, holdings, cashBalance } = usePortfolio();

  const subScores = useMemo<SubScore[]>(() => {
    const totalNetWorth = metrics.totalNetWorth;
    const totalHoldings = holdings.length;

    // 1. Diversification: num of different asset types & sector spread
    const assetTypes = new Set(holdings.map(h => h.assetType)).size;
    const sectors = metrics.sectorAllocation.length;
    const divScore = Math.min(
      100,
      (assetTypes >= 4 ? 40 : assetTypes * 10) +
        (sectors >= 5 ? 40 : sectors * 8) +
        (totalHoldings >= 10 ? 20 : totalHoldings * 2)
    );

    // 2. Concentration Risk: penalty if any single holding > 20% of portfolio
    const maxConc = metrics.concentrationRisk.length > 0 ? metrics.concentrationRisk[0].weight : 0;
    let concScore = 100;
    if (maxConc > 50) concScore = 20;
    else if (maxConc > 35) concScore = 45;
    else if (maxConc > 20) concScore = 70;

    // 3. Return Performance: overall P&L %
    const retPct = metrics.totalReturnPercent;
    let retScore = 50;
    if (retPct >= 20) retScore = 100;
    else if (retPct >= 10) retScore = 80;
    else if (retPct >= 5) retScore = 65;
    else if (retPct >= 0) retScore = 50;
    else if (retPct >= -10) retScore = 30;
    else retScore = 10;

    // 4. Asset Allocation: mixed assets score higher
    const allocationCategories = metrics.assetAllocation.length;
    const allocScore = Math.min(100, allocationCategories * 20);

    // 5. Cash Reserve: healthy buffer (5-20% = ideal)
    const cashPct = totalNetWorth > 0 ? (cashBalance / totalNetWorth) * 100 : 0;
    let cashScore = 50;
    if (cashPct >= 5 && cashPct <= 20) cashScore = 100;
    else if (cashPct > 20 && cashPct <= 40) cashScore = 70;
    else if (cashPct > 40) cashScore = 40; // too much idle cash
    else if (cashPct < 5 && cashBalance > 0) cashScore = 70;
    else cashScore = 30;

    // 6. Volatility Score: proxy via concentration & sector diversification
    const volatilityScore = Math.round((divScore + concScore) / 2);

    return [
      {
        key: 'diversification',
        label: 'Diversification',
        score: Math.round(divScore),
        description: `${assetTypes} asset types, ${sectors} sectors, ${totalHoldings} holdings`,
        icon: Layers,
        tip: divScore < 60
          ? 'Add more asset classes (MF, gold, crypto) and spread across sectors.'
          : 'Good spread across assets and sectors.',
      },
      {
        key: 'concentration',
        label: 'Concentration Risk',
        score: Math.round(concScore),
        description: `Largest holding: ${maxConc.toFixed(1)}% of portfolio`,
        icon: ShieldCheck,
        tip: concScore < 70
          ? `Top holding is ${maxConc.toFixed(1)}% — aim to keep single stocks < 20%.`
          : 'No single stock dominates. Well distributed.',
      },
      {
        key: 'returns',
        label: 'Return Performance',
        score: Math.round(retScore),
        description: `Overall return: ${metrics.totalReturnPercent.toFixed(2)}%`,
        icon: TrendingUp,
        tip: retScore < 60
          ? 'Returns are below par. Review underperforming holdings and consider rebalancing.'
          : 'Portfolio is generating healthy returns.',
      },
      {
        key: 'allocation',
        label: 'Asset Allocation',
        score: Math.round(allocScore),
        description: `${allocationCategories} active asset categories`,
        icon: PieChart,
        tip: allocScore < 60
          ? 'Consider adding mutual funds, gold or ETFs for better allocation balance.'
          : 'Good mix of assets in your portfolio.',
      },
      {
        key: 'cash',
        label: 'Cash Reserve',
        score: Math.round(cashScore),
        description: `Cash: ${formatCurrency(cashBalance)} (${cashPct.toFixed(1)}% of NW)`,
        icon: Wallet,
        tip: cashScore < 60
          ? cashPct > 30
            ? 'Too much idle cash. Consider deploying into diversified assets.'
            : 'Low cash buffer. Keep 5–15% as dry powder for opportunities.'
          : 'Healthy cash reserve maintained.',
      },
      {
        key: 'volatility',
        label: 'Volatility Score',
        score: Math.round(volatilityScore),
        description: 'Based on concentration & diversification proxy',
        icon: Activity,
        tip: volatilityScore < 60
          ? 'High concentration and low diversification suggest elevated volatility risk.'
          : 'Portfolio appears relatively stable.',
      },
    ];
  }, [metrics, holdings, cashBalance]);

  const overallScore = useMemo(() => {
    const avg = subScores.reduce((s, ss) => s + ss.score, 0) / subScores.length;
    return Math.round(avg);
  }, [subScores]);

  // Recommendations based on weakest scores
  const recommendations = useMemo(() => {
    const recs: string[] = [];
    const sorted = [...subScores].sort((a, b) => a.score - b.score);
    sorted.slice(0, 3).forEach(ss => {
      if (ss.score < 80) recs.push(ss.tip);
    });
    if (metrics.concentrationRisk[0]?.weight > 20) {
      recs.push(`Consider trimming ${metrics.concentrationRisk[0]?.name} — it represents ${metrics.concentrationRisk[0]?.weight.toFixed(1)}% of your portfolio.`);
    }
    if (holdings.filter(h => h.assetType === 'mutual_fund').length === 0) {
      recs.push('No mutual funds detected. SIP in index funds can smooth long-term returns.');
    }
    return [...new Set(recs)].slice(0, 5);
  }, [subScores, metrics, holdings]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-600/20 border border-emerald-500/30 flex items-center justify-center">
          <HeartPulse className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Portfolio Health Score</h1>
          <p className="text-sm text-gray-400">Comprehensive analysis of Yashwanth's portfolio</p>
        </div>
      </div>

      {/* Overall Score */}
      <div className="bg-gray-900/50 backdrop-blur border border-gray-700/50 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="shrink-0">
            <CircularGauge score={overallScore} />
            <p className={`text-center text-lg font-bold mt-2 ${scoreColor(overallScore)}`}>
              {scoreLabel(overallScore)}
            </p>
          </div>
          <div className="flex-1 space-y-3">
            <h2 className="text-lg font-semibold text-white">
              Overall Portfolio Health: Grade {grade(overallScore)}
            </h2>
            <p className="text-sm text-gray-400">
              Your portfolio scored <span className={`font-bold ${scoreColor(overallScore)}`}>{overallScore}/100</span> based on
              diversification, concentration risk, return performance, asset allocation, cash reserves and
              volatility profile.
            </p>
            {/* Mini stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2">
              {[
                { label: 'Total Net Worth', value: formatCurrency(metrics.totalNetWorth), color: 'text-cyan-400' },
                { label: 'Overall Return', value: `${metrics.totalReturnPercent >= 0 ? '+' : ''}${metrics.totalReturnPercent.toFixed(2)}%`, color: metrics.totalReturnPercent >= 0 ? 'text-emerald-400' : 'text-red-400' },
                { label: 'Holdings', value: String(holdings.length), color: 'text-violet-400' },
              ].map(stat => (
                <div key={stat.label} className="bg-gray-800/50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">{stat.label}</p>
                  <p className={`text-base font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sub Scores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {subScores.map((ss, idx) => {
          const Icon = ss.icon;
          return (
            <motion.div
              key={ss.key}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.07 }}
              className="bg-gray-900/50 backdrop-blur border border-gray-700/50 rounded-2xl p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gray-800/60 border border-gray-700/50 flex items-center justify-center">
                    <Icon className={`w-4 h-4 ${scoreColor(ss.score)}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{ss.label}</h3>
                    <p className="text-[11px] text-gray-500">{ss.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xl font-bold ${scoreColor(ss.score)}`}>{ss.score}</span>
                  <span className="text-xs text-gray-500">/100</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden mb-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${ss.score}%` }}
                  transition={{ duration: 0.8, delay: idx * 0.07 + 0.3 }}
                  className={`h-full rounded-full ${scoreBarColor(ss.score)}`}
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${
                  ss.score >= 80 ? 'bg-emerald-500/20 text-emerald-400' :
                  ss.score >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                  ss.score >= 40 ? 'bg-orange-500/20 text-orange-400' :
                  'bg-red-500/20 text-red-400'
                }`}>{scoreLabel(ss.score)}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Recommendations */}
      <div className="bg-gray-900/50 backdrop-blur border border-gray-700/50 rounded-2xl p-5">
        <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <Info className="w-5 h-5 text-cyan-400" />
          Actionable Recommendations
        </h2>
        <div className="space-y-3">
          {recommendations.length === 0 ? (
            <div className="flex items-center gap-3 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm">Your portfolio is in excellent health! Keep up the good work.</span>
            </div>
          ) : (
            recommendations.map((rec, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                className="flex items-start gap-3 bg-gray-800/40 rounded-xl p-3"
              >
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-sm text-gray-300">{rec}</p>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Score Legend */}
      <div className="bg-gray-900/50 backdrop-blur border border-gray-700/50 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">Score Legend</h3>
        <div className="flex flex-wrap gap-3">
          {[
            { range: '80–100', label: 'Excellent', cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
            { range: '60–79', label: 'Good', cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
            { range: '40–59', label: 'Fair', cls: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
            { range: '0–39', label: 'Needs Attention', cls: 'bg-red-500/20 text-red-400 border-red-500/30' },
          ].map(l => (
            <span key={l.range} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${l.cls}`}>
              {l.range} — {l.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
