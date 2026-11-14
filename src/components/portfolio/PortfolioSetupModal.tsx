import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Coins,
  CheckCircle2,
  DollarSign,
  Plus,
  Trash2,
  ShieldCheck,
  X
} from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext';
import { formatCurrency } from '../../utils/formatters';
import type { Holding, AssetType } from '../../types';

interface PortfolioSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PortfolioSetupModal: React.FC<PortfolioSetupModalProps> = ({ isOpen, onClose }) => {
  const { completeSetup } = usePortfolio();

  const [step, setStep] = useState<1 | 2>(1);
  const [cashInput, setCashInput] = useState<string>('50000');
  const [initialHoldings, setInitialHoldings] = useState<Omit<Holding, 'id'>[]>([]);

  // Temp form state for adding initial holding
  const [tempType, setTempType] = useState<AssetType>('stock');
  const [tempSymbol, setTempSymbol] = useState('');
  const [tempName, setTempName] = useState('');
  const [tempQty, setTempQty] = useState('');
  const [tempPrice, setTempPrice] = useState('');

  if (!isOpen) return null;

  const handleAddTempHolding = () => {
    if (!tempSymbol.trim() || !tempQty || !tempPrice) return;
    const qty = parseFloat(tempQty);
    const price = parseFloat(tempPrice);
    if (isNaN(qty) || isNaN(price) || qty <= 0 || price <= 0) return;

    setInitialHoldings(prev => [
      ...prev,
      {
        assetType: tempType,
        symbol: tempSymbol.toUpperCase().trim(),
        name: tempName.trim() || tempSymbol.toUpperCase().trim(),
        quantity: qty,
        averagePrice: price,
        purchaseDate: new Date().toISOString().split('T')[0],
        exchange: tempType === 'stock' ? 'NSE' : undefined
      }
    ]);

    setTempSymbol('');
    setTempName('');
    setTempQty('');
    setTempPrice('');
  };

  const handleRemoveTempHolding = (index: number) => {
    setInitialHoldings(prev => prev.filter((_, i) => i !== index));
  };

  const handleFinishSetup = () => {
    const cash = parseFloat(cashInput) || 0;
    const formattedHoldings: Holding[] = initialHoldings.map((h, i) => ({
      ...h,
      id: `h_init_${Date.now()}_${i}`
    }));

    completeSetup(cash, formattedHoldings);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-xl bg-[#0E1422] border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.15)] overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-800/80 bg-gradient-to-r from-cyan-950/40 via-transparent to-violet-950/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-wide">
                  PORTFOLIO MANAGER SETUP
                </h2>
                <p className="text-xs text-gray-400 font-mono">
                  STEP {step} OF 2: {step === 1 ? 'AVAILABLE CASH & CAPITAL' : 'EXISTING HOLDINGS'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            {step === 1 ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-200 mb-1">
                    What is your starting available cash balance?
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Enter the uninvested cash or capital in your bank / brokerage account. This will represent your initial liquid net worth. You can deposit or withdraw cash anytime.
                  </p>
                </div>

                {/* Cash Input */}
                <div className="space-y-3">
                  <label className="text-xs font-mono text-cyan-400 uppercase tracking-wider block">
                    Starting Cash (₹ INR)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-lg font-bold">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={cashInput}
                      onChange={(e) => setCashInput(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-10 pr-4 py-3 bg-gray-900/80 border border-gray-700/60 rounded-xl text-xl font-bold font-mono text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30"
                    />
                  </div>

                  {/* Preset quick buttons */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {['0', '25000', '50000', '100000', '250000', '500000'].map(amount => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => setCashInput(amount)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${
                          cashInput === amount
                            ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300'
                            : 'bg-gray-800/40 border-gray-700/40 text-gray-400 hover:border-gray-600 hover:text-gray-200'
                        }`}
                      >
                        ₹{parseInt(amount).toLocaleString('en-IN')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/20 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-300 leading-relaxed">
                    <strong>Zero Fictional Data Guarantee:</strong> Portfolio Manager will calculate all performance and net worth strictly from your real cash and recorded holdings.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-200 mb-1">
                    Do you have existing holdings to add now?
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    You can quickly add your existing stocks, mutual funds, or gold here. You can also skip this and add them later via the Add Holding button or CSV import.
                  </p>
                </div>

                {/* Add Mini Form */}
                <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'stock', label: 'Stock', icon: TrendingUp },
                      { id: 'mutual_fund', label: 'Mutual Fund', icon: DollarSign },
                      { id: 'gold', label: 'Gold', icon: Coins },
                      { id: 'silver', label: 'Silver', icon: ShieldCheck }
                    ].map(t => {
                      const Icon = t.icon;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTempType(t.id as AssetType)}
                          className={`p-2 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-all ${
                            tempType === t.id
                              ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300'
                              : 'bg-gray-800/40 border-gray-700/40 text-gray-400 hover:text-gray-200'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {t.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Symbol / Ticker (e.g. RELIANCE)"
                      value={tempSymbol}
                      onChange={(e) => setTempSymbol(e.target.value.toUpperCase())}
                      className="px-3 py-2 bg-gray-800/80 border border-gray-700/60 rounded-lg text-xs text-white placeholder-gray-500 font-mono focus:outline-none focus:border-cyan-500"
                    />
                    <input
                      type="text"
                      placeholder="Asset Name (Optional)"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      className="px-3 py-2 bg-gray-800/80 border border-gray-700/60 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Quantity / Units"
                      value={tempQty}
                      onChange={(e) => setTempQty(e.target.value)}
                      className="px-3 py-2 bg-gray-800/80 border border-gray-700/60 rounded-lg text-xs text-white placeholder-gray-500 font-mono focus:outline-none focus:border-cyan-500"
                    />
                    <input
                      type="number"
                      placeholder="Avg Purchase Price (₹)"
                      value={tempPrice}
                      onChange={(e) => setTempPrice(e.target.value)}
                      className="px-3 py-2 bg-gray-800/80 border border-gray-700/60 rounded-lg text-xs text-white placeholder-gray-500 font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddTempHolding}
                    className="w-full py-2 bg-gradient-to-r from-cyan-500/20 to-violet-600/20 border border-cyan-500/40 text-cyan-300 rounded-lg text-xs font-semibold hover:border-cyan-400 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add To Starting Holdings
                  </button>
                </div>

                {/* Staged Holdings List */}
                {initialHoldings.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-mono text-gray-400">
                      HOLDINGS TO IMPORT ({initialHoldings.length})
                    </label>
                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                      {initialHoldings.map((h, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-gray-800/40 border border-gray-700/40 text-xs"
                        >
                          <div>
                            <span className="font-mono font-bold text-white mr-2">{h.symbol}</span>
                            <span className="text-gray-400">{h.quantity} units @ ₹{h.averagePrice}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-emerald-400 font-semibold">
                              {formatCurrency(h.quantity * h.averagePrice)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveTempHolding(idx)}
                              className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="p-4 border-t border-gray-800/80 bg-gray-900/40 flex items-center justify-between">
            {step === 2 ? (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white transition-colors"
              >
                Back to Cash
              </button>
            ) : (
              <span className="text-xs text-gray-500 font-mono">
                Cash: ₹{parseFloat(cashInput || '0').toLocaleString('en-IN')}
              </span>
            )}

            <div className="flex items-center gap-2">
              {step === 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 text-white font-semibold text-xs tracking-wider uppercase flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:brightness-110 transition-all"
                >
                  Next: Holdings
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinishSetup}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold text-xs tracking-wider uppercase flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:brightness-110 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Launch Portfolio Manager
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
