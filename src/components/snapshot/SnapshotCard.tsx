import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Download,
  Share2,
  Copy,
  Check,
  Zap,
  TrendingUp,
  TrendingDown,
  Sparkles,
  PieChart as PieIcon,
  ShieldCheck,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { usePortfolio } from '../../context/PortfolioContext';
import { formatCurrency, formatPercent } from '../../utils/formatters';

interface SnapshotCardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SnapshotCard: React.FC<SnapshotCardProps> = ({ isOpen, onClose }) => {
  const { holdings, metrics, cashBalance } = usePortfolio();
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!isOpen) return null;

  const totalValue = metrics.totalNetWorth;
  const totalProfitLoss = metrics.totalProfitLoss;
  const returnPercentage = metrics.totalReturnPercent;
  const isPositive = totalProfitLoss >= 0;

  const getHoldingPrice = (h: any) => h.currentPrice ?? h.averagePrice ?? 0;

  // Top 3 holdings by value
  const topHoldings = [...holdings]
    .sort((a, b) => getHoldingPrice(b) * b.quantity - getHoldingPrice(a) * a.quantity)
    .slice(0, 3);

  // Asset breakdown
  const stockVal = holdings.filter(h => h.assetType === 'stock').reduce((acc, h) => acc + getHoldingPrice(h) * h.quantity, 0);
  const mfVal = holdings.filter(h => h.assetType === 'mutual_fund').reduce((acc, h) => acc + getHoldingPrice(h) * h.quantity, 0);
  const cryptoVal = holdings.filter(h => h.assetType === 'crypto').reduce((acc, h) => acc + getHoldingPrice(h) * h.quantity, 0);
  const goldVal = holdings.filter(h => h.assetType === 'gold' || h.assetType === 'silver').reduce((acc, h) => acc + getHoldingPrice(h) * h.quantity, 0);
  const cashVal = cashBalance;

  const handleDownload = async () => {
    if (!cardRef.current) return;
    try {
      setDownloading(true);
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: '#0a0f1d',
        useCORS: true,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Portfolio_Snapshot_Yashwanth_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export snapshot:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handleCopy = async () => {
    if (!cardRef.current) return;
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: '#0a0f1d',
        useCORS: true,
      });
      canvas.toBlob(async blob => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        } catch {
          // Fallback
          handleDownload();
        }
      });
    } catch (err) {
      console.error('Failed to copy snapshot:', err);
    }
  };

  const handleShare = async () => {
    if (!cardRef.current) return;
    if (navigator.share) {
      try {
        const canvas = await html2canvas(cardRef.current, {
          scale: 2,
          backgroundColor: '#0a0f1d',
          useCORS: true,
        });
        canvas.toBlob(async blob => {
          if (!blob) return;
          const file = new File([blob], 'portfolio_snapshot.png', { type: 'image/png' });
          await navigator.share({
            title: "Yashwanth's Portfolio Snapshot",
            text: `My Portfolio Net Worth: ${formatCurrency(totalValue)} (${isPositive ? '+' : ''}${formatPercent(returnPercentage)})`,
            files: [file],
          });
        });
      } catch {
        handleDownload();
      }
    } else {
      handleDownload();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative max-w-lg w-full"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute -top-12 right-0 p-2 text-gray-400 hover:text-white bg-gray-800/60 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Shareable Card Canvas */}
          <div
            ref={cardRef}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#0F172A] via-[#0A0F1D] to-[#050811] border border-cyan-500/30 p-7 shadow-2xl shadow-cyan-950/50 text-white"
          >
            {/* Background ambient glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header: Brand & Date */}
            <div className="relative flex items-center justify-between pb-4 border-b border-gray-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-violet-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xs font-bold tracking-wider text-cyan-400 uppercase">
                    Portfolio Manager
                  </h3>
                  <p className="text-[10px] text-gray-400 font-mono">
                    WEALTH INTELLIGENCE DECK
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-mono text-gray-400">
                  {new Date().toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
                <div className="flex items-center justify-end gap-1 text-[10px] text-emerald-400">
                  <ShieldCheck className="w-3 h-3" />
                  <span>VERIFIED</span>
                </div>
              </div>
            </div>

            {/* User Title */}
            <div className="relative mt-5">
              <span className="text-[11px] font-mono tracking-widest text-cyan-400/80 uppercase">
                EXECUTIVE SUMMARY
              </span>
              <h2 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-gray-400 bg-clip-text text-transparent">
                Yashwanth's Portfolio
              </h2>
            </div>

            {/* Total Net Worth in Hero Font */}
            <div className="relative mt-4 p-5 rounded-2xl bg-gradient-to-br from-gray-900/80 to-gray-950/80 border border-gray-800/80 shadow-inner">
              <span className="text-xs font-mono text-gray-400">TOTAL NET WORTH</span>
              <div className="text-3xl sm:text-4xl font-extrabold text-white mt-1 tracking-tight font-mono">
                {formatCurrency(totalValue)}
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-gray-800/60">
                <div>
                  <span className="text-[10px] font-mono text-gray-400 uppercase">Total Returns</span>
                  <div className={`flex items-center gap-1 font-bold text-sm ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    <span>{isPositive ? '+' : ''}{formatCurrency(totalProfitLoss)}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-mono text-gray-400 uppercase">Return %</span>
                  <div className={`flex items-center gap-1 font-bold text-sm ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                    <span>{isPositive ? '+' : ''}{formatPercent(returnPercentage)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Holdings */}
            {topHoldings.length > 0 && (
              <div className="relative mt-4">
                <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  Top Holdings
                </span>
                <div className="mt-2 space-y-2">
                  {topHoldings.map((h, i) => {
                    const price = getHoldingPrice(h);
                    const avg = h.averagePrice ?? 0;
                    const hVal = price * h.quantity;
                    const hGain = (price - avg) * h.quantity;
                    const hGainPct = avg > 0 ? ((price - avg) / avg) * 100 : 0;
                    const hPositive = hGain >= 0;

                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-gray-900/60 border border-gray-800/50 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-lg bg-cyan-500/10 text-cyan-400 font-mono text-[10px] flex items-center justify-center font-bold">
                            {i + 1}
                          </span>
                          <div>
                            <div className="font-bold text-white">{h.symbol}</div>
                            <div className="text-[10px] text-gray-400">{h.quantity} units</div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-mono text-white font-semibold">{formatCurrency(hVal)}</div>
                          <div className={`text-[10px] font-mono ${hPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                            {hPositive ? '+' : ''}{formatPercent(hGainPct)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Mini Asset Allocation Progress Bar */}
            <div className="relative mt-4 p-3 rounded-xl bg-gray-900/40 border border-gray-800/50">
              <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono mb-2">
                <span className="flex items-center gap-1">
                  <PieIcon className="w-3 h-3 text-violet-400" />
                  Asset Allocation
                </span>
                <span className="text-gray-500">100%</span>
              </div>

              <div className="h-2 rounded-full overflow-hidden flex bg-gray-800">
                {totalValue > 0 ? (
                  <>
                    <div style={{ width: `${(stockVal / totalValue) * 100}%` }} className="bg-cyan-500" title="Stocks" />
                    <div style={{ width: `${(mfVal / totalValue) * 100}%` }} className="bg-emerald-500" title="Mutual Funds" />
                    <div style={{ width: `${(cryptoVal / totalValue) * 100}%` }} className="bg-amber-500" title="Crypto" />
                    <div style={{ width: `${(goldVal / totalValue) * 100}%` }} className="bg-yellow-400" title="Bullion" />
                    <div style={{ width: `${(cashVal / totalValue) * 100}%` }} className="bg-violet-500" title="Cash" />
                  </>
                ) : (
                  <div className="w-full bg-gray-700" />
                )}
              </div>

              <div className="flex flex-wrap gap-2.5 mt-2.5 text-[10px] font-mono text-gray-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500" /> Stocks</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> MF</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Crypto</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" /> Gold/Silver</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-500" /> Cash</span>
              </div>
            </div>

            {/* Footer Watermark */}
            <div className="mt-5 pt-3 border-t border-gray-800/80 flex items-center justify-between text-[10px] text-gray-500 font-mono">
              <span>PORTFOLIO MANAGER APP</span>
              <span>VERIFIED SNAPSHOT</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition-colors shadow-lg shadow-cyan-500/20"
            >
              <Download className="w-4 h-4" />
              <span>{downloading ? 'Exporting...' : 'Save PNG'}</span>
            </button>

            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-medium text-xs transition-colors border border-gray-700"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>

            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs transition-colors shadow-lg shadow-violet-600/20"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
