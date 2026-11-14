import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Receipt,
  Download,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Calendar,
  Info,
  FileText
} from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext';
import { formatCurrency } from '../../utils/formatters';
import type { Transaction } from '../../types';

export interface TaxPnLPageProps {
  onNavigate?: (page: string) => void;
}

interface TaxEntry {
  id: string;
  symbol: string;
  name: string;
  buyDate: string;
  sellDate: string;
  holdingDays: number;
  buyPrice: number;
  sellPrice: number;
  quantity: number;
  gainLoss: number;
  taxType: 'STCG' | 'LTCG';
  taxEstimate: number;
  costBasis: number;
  saleProceeds: number;
}

const LTCG_EXEMPTION = 125000; // ₹1.25L
const STCG_RATE = 0.20; // 20%
const LTCG_RATE = 0.125; // 12.5%

// Financial year date ranges
const FY_RANGES: Record<string, { start: Date; end: Date; label: string }> = {
  'FY2024-25': {
    label: 'FY 2024-25 (Apr 2024 – Mar 2025)',
    start: new Date('2024-04-01'),
    end: new Date('2025-03-31'),
  },
  'FY2023-24': {
    label: 'FY 2023-24 (Apr 2023 – Mar 2024)',
    start: new Date('2023-04-01'),
    end: new Date('2024-03-31'),
  },
  'FY2025-26': {
    label: 'FY 2025-26 (Apr 2025 – Mar 2026)',
    start: new Date('2025-04-01'),
    end: new Date('2026-03-31'),
  },
};

function daysBetween(d1: string, d2: string): number {
  const a = new Date(d1).getTime();
  const b = new Date(d2).getTime();
  return Math.round(Math.abs(b - a) / 86400000);
}

export const TaxPnLPage: React.FC<TaxPnLPageProps> = ({ onNavigate: _onNavigate }) => {
  const { transactions, holdings, metrics } = usePortfolio();
  const [selectedFY, setSelectedFY] = useState<string>('FY2024-25');

  // Build a map of BUY transactions per symbol for cost basis lookup
  const buyHistory = useMemo(() => {
    const map: Record<string, { price: number; date: string; qty: number }[]> = {};
    transactions
      .filter(t => t.type === 'BUY' && t.assetType !== 'cash')
      .forEach(t => {
        if (!map[t.symbol]) map[t.symbol] = [];
        map[t.symbol].push({ price: t.price, date: t.date, qty: t.quantity });
      });
    return map;
  }, [transactions]);

  // Compute realized tax entries from SELL transactions in selected FY
  const taxEntries = useMemo<TaxEntry[]>(() => {
    const fy = FY_RANGES[selectedFY];
    const sellTxs = transactions.filter(
      t =>
        t.type === 'SELL' &&
        t.assetType !== 'cash' &&
        new Date(t.date) >= fy.start &&
        new Date(t.date) <= fy.end
    );

    return sellTxs.map(sell => {
      // Try to find matching BUY for this symbol
      const buys = buyHistory[sell.symbol] || [];
      let buyDate = '';
      let buyPrice = sell.costBasis ? sell.costBasis / sell.quantity : sell.price;

      if (buys.length > 0) {
        // Use the earliest buy for holding period calculation
        const sortedBuys = [...buys].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        buyDate = sortedBuys[0].date;
        buyPrice = sortedBuys[0].price;
      }

      const holdingDays = buyDate ? daysBetween(buyDate, sell.date) : 0;
      const taxType: 'STCG' | 'LTCG' = holdingDays >= 365 ? 'LTCG' : 'STCG';
      const gainLoss = sell.realizedPnL ?? 0;
      // Individual tax estimate (simplified – will aggregate properly in summary)
      const taxEstimate =
        taxType === 'STCG'
          ? Math.max(0, gainLoss) * STCG_RATE
          : Math.max(0, gainLoss) * LTCG_RATE;

      return {
        id: sell.id,
        symbol: sell.symbol,
        name: sell.name,
        buyDate,
        sellDate: sell.date,
        holdingDays,
        buyPrice,
        sellPrice: sell.price,
        quantity: sell.quantity,
        gainLoss,
        taxType,
        taxEstimate,
        costBasis: sell.costBasis ?? sell.quantity * buyPrice,
        saleProceeds: sell.totalValue,
      };
    });
  }, [transactions, buyHistory, selectedFY]);

  // Unrealized gains (open positions)
  const unrealizedGains = useMemo(() => {
    return holdings
      .filter(h => h.assetType === 'stock' || h.assetType === 'mutual_fund')
      .map(h => {
        const alloc = metrics.assetAllocation.find(
          a => a.category === 'Stocks' || a.category === 'Mutual Funds'
        );
        const currentPrice =
          h.currentPrice && h.currentPrice > 0
            ? h.currentPrice
            : h.averagePrice;
        const unrealized = (currentPrice - h.averagePrice) * h.quantity;
        const days = h.purchaseDate ? daysBetween(h.purchaseDate, new Date().toISOString().split('T')[0]) : 0;
        return {
          symbol: h.symbol,
          name: h.name,
          purchaseDate: h.purchaseDate,
          unrealized,
          days,
          taxType: days >= 365 ? 'LTCG' : 'STCG',
          _alloc: alloc // keep ts happy
        };
      })
      .filter(h => Math.abs(h.unrealized) > 1);
  }, [holdings, metrics]);

  // Tax summary
  const summary = useMemo(() => {
    const stcgGains = taxEntries
      .filter(e => e.taxType === 'STCG' && e.gainLoss > 0)
      .reduce((s, e) => s + e.gainLoss, 0);
    const stcgLosses = taxEntries
      .filter(e => e.taxType === 'STCG' && e.gainLoss < 0)
      .reduce((s, e) => s + e.gainLoss, 0);
    const netSTCG = stcgGains + stcgLosses;

    const ltcgGains = taxEntries
      .filter(e => e.taxType === 'LTCG' && e.gainLoss > 0)
      .reduce((s, e) => s + e.gainLoss, 0);
    const ltcgLosses = taxEntries
      .filter(e => e.taxType === 'LTCG' && e.gainLoss < 0)
      .reduce((s, e) => s + e.gainLoss, 0);
    const netLTCG = ltcgGains + ltcgLosses;

    const taxableSTCG = Math.max(0, netSTCG);
    const taxableLTCG = Math.max(0, netLTCG - LTCG_EXEMPTION);

    const stcgTax = taxableSTCG * STCG_RATE;
    const ltcgTax = taxableLTCG * LTCG_RATE;
    const totalTax = stcgTax + ltcgTax;

    return {
      totalSTCG: netSTCG,
      totalLTCG: netLTCG,
      taxableSTCG,
      taxableLTCG,
      stcgTax,
      ltcgTax,
      totalTax,
      ltcgExemption: LTCG_EXEMPTION,
    };
  }, [taxEntries]);

  // PDF Export
  const handleExportPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFontSize(18);
    doc.setTextColor(6, 182, 212);
    doc.text(`Tax P&L Report – ${FY_RANGES[selectedFY].label}`, 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated for: Yashwanth | Portfolio Manager`, 14, 28);
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 14, 34);

    // Summary section
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('Tax Summary', 14, 48);

    const summaryRows = [
      ['Total STCG', formatCurrency(summary.totalSTCG)],
      ['Total LTCG', formatCurrency(summary.totalLTCG)],
      ['LTCG Exemption', formatCurrency(summary.ltcgExemption)],
      ['Taxable LTCG', formatCurrency(summary.taxableLTCG)],
      ['STCG Tax @ 20%', formatCurrency(summary.stcgTax)],
      ['LTCG Tax @ 12.5%', formatCurrency(summary.ltcgTax)],
      ['Total Estimated Tax', formatCurrency(summary.totalTax)],
    ];

    let y = 56;
    summaryRows.forEach(([label, value]) => {
      doc.setFontSize(10);
      doc.text(label, 14, y);
      doc.text(value, 100, y);
      y += 7;
    });

    // Table header
    y += 6;
    doc.setFontSize(11);
    doc.setTextColor(6, 182, 212);
    doc.text('Detailed Transactions', 14, y);
    y += 6;

    doc.setFontSize(8);
    doc.setTextColor(80);
    const headers = ['Symbol', 'Buy Date', 'Sell Date', 'Days', 'Buy ₹', 'Sell ₹', 'Qty', 'Gain/Loss', 'Type', 'Tax Est.'];
    const colWidths = [22, 24, 24, 12, 24, 24, 12, 28, 12, 24];
    let x = 14;
    headers.forEach((h, i) => { doc.text(h, x, y); x += colWidths[i]; });
    y += 4;
    doc.setDrawColor(200);
    doc.line(14, y, 290, y);
    y += 4;

    doc.setTextColor(0);
    taxEntries.forEach(e => {
      if (y > 190) { doc.addPage(); y = 20; }
      x = 14;
      const row = [
        e.symbol.substring(0, 10),
        e.buyDate || '—',
        e.sellDate,
        String(e.holdingDays),
        `₹${e.buyPrice.toFixed(0)}`,
        `₹${e.sellPrice.toFixed(0)}`,
        String(e.quantity),
        `${e.gainLoss >= 0 ? '+' : ''}₹${e.gainLoss.toFixed(0)}`,
        e.taxType,
        `₹${e.taxEstimate.toFixed(0)}`,
      ];
      row.forEach((val, i) => { doc.text(val, x, y); x += colWidths[i]; });
      y += 6;
    });

    y += 10;
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      'DISCLAIMER: This is an estimate only. Actual tax liability may differ. Consult a qualified tax professional.',
      14,
      y
    );

    doc.save(`TaxPnL_${selectedFY}_Yashwanth.pdf`);
  };

  const fyOptions = Object.keys(FY_RANGES);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-600/20 border border-cyan-500/30 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Tax P&L Report</h1>
            <p className="text-sm text-gray-400">Capital Gains Summary for Yashwanth</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* FY Selector */}
          <select
            value={selectedFY}
            onChange={e => setSelectedFY(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500/60"
          >
            {fyOptions.map(fy => (
              <option key={fy} value={fy}>
                {FY_RANGES[fy].label}
              </option>
            ))}
          </select>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-xl transition-colors text-sm"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
        <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-300">
          <strong>Disclaimer:</strong> This is an estimate only based on your recorded transactions. Tax rules are
          simplified (STCG: 20%, LTCG: 12.5% above ₹1.25L exemption per post-July 2024 Budget). Actual liability
          may vary based on STT credits, indexation, surcharge &amp; cess. <strong>Consult a qualified tax professional before filing.</strong>
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          {
            label: 'Total STCG',
            value: summary.totalSTCG,
            icon: TrendingUp,
            color: summary.totalSTCG >= 0 ? 'text-emerald-400' : 'text-red-400',
            info: 'Held < 1 year · 20% tax',
          },
          {
            label: 'Total LTCG',
            value: summary.totalLTCG,
            icon: TrendingUp,
            color: summary.totalLTCG >= 0 ? 'text-emerald-400' : 'text-red-400',
            info: 'Held ≥ 1 year · 12.5% tax',
          },
          {
            label: 'LTCG Exemption',
            value: LTCG_EXEMPTION,
            icon: Info,
            color: 'text-cyan-400',
            info: 'First ₹1.25L LTCG exempt',
          },
          {
            label: 'Taxable LTCG',
            value: summary.taxableLTCG,
            icon: FileText,
            color: 'text-violet-400',
            info: 'LTCG − ₹1.25L exemption',
          },
          {
            label: 'Est. Tax Liability',
            value: summary.totalTax,
            icon: Receipt,
            color: summary.totalTax > 0 ? 'text-red-400' : 'text-emerald-400',
            info: 'STCG Tax + LTCG Tax',
          },
        ].map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
              className="bg-gray-900/50 backdrop-blur border border-gray-700/50 rounded-2xl p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{card.label}</span>
                <Icon className="w-4 h-4 text-gray-500" />
              </div>
              <p className={`text-lg font-bold ${card.color}`}>{formatCurrency(card.value)}</p>
              <p className="text-[10px] text-gray-500">{card.info}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Tax Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-900/50 backdrop-blur border border-gray-700/50 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-cyan-400 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> STCG Breakdown (Held &lt; 1 Year)
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-300">
              <span>Taxable STCG</span>
              <span className={summary.taxableSTCG >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                {formatCurrency(summary.taxableSTCG)}
              </span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Tax Rate</span>
              <span className="text-gray-400">20% flat</span>
            </div>
            <div className="border-t border-gray-700/50 pt-2 flex justify-between font-semibold text-white">
              <span>STCG Tax</span>
              <span className="text-red-400">{formatCurrency(summary.stcgTax)}</span>
            </div>
          </div>
        </div>
        <div className="bg-gray-900/50 backdrop-blur border border-gray-700/50 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-violet-400 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> LTCG Breakdown (Held ≥ 1 Year)
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-300">
              <span>Gross LTCG</span>
              <span className={summary.totalLTCG >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                {formatCurrency(summary.totalLTCG)}
              </span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Exemption (Section 10(38))</span>
              <span className="text-cyan-400">− {formatCurrency(LTCG_EXEMPTION)}</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Taxable LTCG</span>
              <span className="text-violet-400">{formatCurrency(summary.taxableLTCG)}</span>
            </div>
            <div className="border-t border-gray-700/50 pt-2 flex justify-between font-semibold text-white">
              <span>LTCG Tax @ 12.5%</span>
              <span className="text-red-400">{formatCurrency(summary.ltcgTax)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-gray-900/50 backdrop-blur border border-gray-700/50 rounded-2xl p-5">
        <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-cyan-400" />
          Realized Gains / Losses — {FY_RANGES[selectedFY].label}
        </h2>

        {taxEntries.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Receipt className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No SELL transactions recorded in this financial year.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-700/50">
                  {['Stock', 'Buy Date', 'Sell Date', 'Days', 'Buy ₹', 'Sell ₹', 'Qty', 'Gain/Loss', 'Type', 'Tax Est.'].map(h => (
                    <th key={h} className="text-left text-gray-500 font-medium py-2 pr-4 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {taxEntries.map((entry, idx) => (
                  <motion.tr
                    key={entry.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.03 }}
                    className="border-b border-gray-800/40 hover:bg-gray-800/20 transition-colors"
                  >
                    <td className="py-2.5 pr-4">
                      <div className="font-semibold text-white">{entry.symbol}</div>
                      <div className="text-gray-500 truncate max-w-[100px]">{entry.name}</div>
                    </td>
                    <td className="py-2.5 pr-4 text-gray-400">{entry.buyDate || '—'}</td>
                    <td className="py-2.5 pr-4 text-gray-400">{entry.sellDate}</td>
                    <td className="py-2.5 pr-4 text-gray-400">{entry.holdingDays}d</td>
                    <td className="py-2.5 pr-4 text-gray-300">{formatCurrency(entry.buyPrice)}</td>
                    <td className="py-2.5 pr-4 text-gray-300">{formatCurrency(entry.sellPrice)}</td>
                    <td className="py-2.5 pr-4 text-gray-300">{entry.quantity}</td>
                    <td className={`py-2.5 pr-4 font-semibold ${entry.gainLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {entry.gainLoss >= 0 ? '+' : ''}{formatCurrency(entry.gainLoss)}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          entry.taxType === 'LTCG'
                            ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {entry.taxType}
                      </span>
                    </td>
                    <td className={`py-2.5 font-semibold ${entry.taxEstimate > 0 ? 'text-red-400' : 'text-gray-500'}`}>
                      {formatCurrency(entry.taxEstimate)}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Unrealized Gains */}
      {unrealizedGains.length > 0 && (
        <div className="bg-gray-900/50 backdrop-blur border border-gray-700/50 rounded-2xl p-5">
          <h2 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-violet-400" />
            Unrealized Gains (Open Positions — Not Yet Sold)
          </h2>
          <p className="text-xs text-gray-500 mb-4">These will attract tax only upon sale. Plan wisely.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-700/50">
                  {['Stock', 'Purchase Date', 'Days Held', 'Unrealized G/L', 'Type if Sold Today'].map(h => (
                    <th key={h} className="text-left text-gray-500 font-medium py-2 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {unrealizedGains.map((h, idx) => (
                  <tr key={idx} className="border-b border-gray-800/40 hover:bg-gray-800/20 transition-colors">
                    <td className="py-2.5 pr-4">
                      <div className="font-semibold text-white">{h.symbol}</div>
                      <div className="text-gray-500 truncate max-w-[120px]">{h.name}</div>
                    </td>
                    <td className="py-2.5 pr-4 text-gray-400">{h.purchaseDate}</td>
                    <td className="py-2.5 pr-4 text-gray-400">{h.days}d</td>
                    <td className={`py-2.5 pr-4 font-semibold ${h.unrealized >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {h.unrealized >= 0 ? '+' : ''}{formatCurrency(h.unrealized)}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          h.taxType === 'LTCG'
                            ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {h.taxType}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
