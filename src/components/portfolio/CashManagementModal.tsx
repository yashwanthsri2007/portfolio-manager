import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Edit3,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext';
import { formatCurrency } from '../../utils/formatters';

interface CashManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CashManagementModal: React.FC<CashManagementModalProps> = ({ isOpen, onClose }) => {
  const { cashBalance, depositCash, withdrawCash, setCashBalance } = usePortfolio();

  const [tab, setTab] = useState<'deposit' | 'withdraw' | 'correct'>('deposit');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const val = parseFloat(amount);
    if (isNaN(val) || val < 0) {
      setErrorMsg('Please enter a valid amount.');
      return;
    }

    if (tab === 'deposit') {
      if (val === 0) {
        setErrorMsg('Deposit amount must be greater than zero.');
        return;
      }
      depositCash(val, undefined, notes || 'Cash deposit');
      setSuccessMsg(`Deposited ₹${val.toLocaleString('en-IN')} successfully!`);
    } else if (tab === 'withdraw') {
      if (val === 0) {
        setErrorMsg('Withdrawal amount must be greater than zero.');
        return;
      }
      const res = withdrawCash(val, undefined, notes || 'Cash withdrawal');
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to withdraw.');
        return;
      }
      setSuccessMsg(`Withdrawn ₹${val.toLocaleString('en-IN')} successfully!`);
    } else if (tab === 'correct') {
      setCashBalance(val);
      setSuccessMsg(`Cash balance corrected to ₹${val.toLocaleString('en-IN')}.`);
    }

    setAmount('');
    setNotes('');
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-md bg-[#0E1422] border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.15)] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-5 border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-wide">
                  CASH BALANCE MANAGEMENT
                </h3>
                <p className="text-xs text-gray-400 font-mono">
                  AVAILABLE: <span className="text-emerald-400 font-bold">{formatCurrency(cashBalance)}</span>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800/60"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Action Tabs */}
          <div className="grid grid-cols-3 p-3 gap-1 bg-gray-900/60 border-b border-gray-800/60">
            {[
              { id: 'deposit', label: 'Deposit Cash', icon: ArrowUpRight, color: 'text-emerald-400' },
              { id: 'withdraw', label: 'Withdraw', icon: ArrowDownRight, color: 'text-red-400' },
              { id: 'correct', label: 'Manual Edit', icon: Edit3, color: 'text-cyan-400' }
            ].map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setTab(t.id as any);
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                    tab === t.id
                      ? 'bg-gray-800 text-white border border-gray-700 shadow-sm'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${t.color}`} />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                {successMsg}
              </div>
            )}

            <div>
              <label className="text-xs font-mono text-gray-400 uppercase tracking-wider block mb-1.5">
                {tab === 'deposit' && 'Deposit Amount (₹)'}
                {tab === 'withdraw' && 'Withdrawal Amount (₹)'}
                {tab === 'correct' && 'Corrected Cash Balance (₹)'}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-mono font-bold">
                  ₹
                </span>
                <input
                  type="number"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={tab === 'correct' ? cashBalance.toString() : '0.00'}
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-900 border border-gray-700/60 rounded-xl text-base font-mono font-bold text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500"
                  autoFocus
                />
              </div>
            </div>

            {tab !== 'correct' && (
              <div>
                <label className="text-xs font-mono text-gray-400 uppercase tracking-wider block mb-1.5">
                  Notes / Source / Purpose
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Salary savings, Dividend payout, Bank transfer"
                  className="w-full px-3.5 py-2.5 bg-gray-900 border border-gray-700/60 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            )}

            <button
              type="submit"
              className={`w-full py-2.5 rounded-xl font-semibold text-xs tracking-wider uppercase transition-all shadow-md ${
                tab === 'deposit'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20'
                  : tab === 'withdraw'
                  ? 'bg-red-500 hover:bg-red-400 text-white shadow-red-500/20'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-cyan-500/20'
              }`}
            >
              {tab === 'deposit' && 'Confirm Deposit'}
              {tab === 'withdraw' && 'Confirm Withdrawal'}
              {tab === 'correct' && 'Update Cash Balance'}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
