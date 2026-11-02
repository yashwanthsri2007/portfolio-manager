import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  X,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Coins
} from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext';
import { formatCurrency } from '../../utils/formatters';
import type { AssetType, TransactionType } from '../../types';

interface RecordTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RecordTransactionModal: React.FC<RecordTransactionModalProps> = ({ isOpen, onClose }) => {
  const { holdings, cashBalance, recordBuyTransaction, recordSellTransaction, depositCash, withdrawCash } = usePortfolio();

  const [txType, setTxType] = useState<TransactionType>('BUY');
  const [assetType, setAssetType] = useState<AssetType>('stock');
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [brokerage, setBrokerage] = useState('0');
  const [exchange, setExchange] = useState('NSE');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [syncCash, setSyncCash] = useState(true);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const qty = parseFloat(quantity) || 0;
    const prc = parseFloat(price) || 0;
    const brk = parseFloat(brokerage) || 0;

    if (txType === 'DEPOSIT') {
      if (prc <= 0) {
        setErrorMsg('Deposit amount must be positive.');
        return;
      }
      depositCash(prc, date, notes || 'Cash deposit');
      setSuccessMsg(`Deposited ${formatCurrency(prc)} successfully!`);
    } else if (txType === 'WITHDRAWAL') {
      if (prc <= 0) {
        setErrorMsg('Withdrawal amount must be positive.');
        return;
      }
      const res = withdrawCash(prc, date, notes || 'Cash withdrawal');
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to withdraw.');
        return;
      }
      setSuccessMsg(`Withdrawn ${formatCurrency(prc)} successfully!`);
    } else if (txType === 'BUY') {
      if (!symbol.trim()) {
        setErrorMsg('Symbol is required.');
        return;
      }
      if (qty <= 0 || prc <= 0) {
        setErrorMsg('Quantity and price must be greater than zero.');
        return;
      }

      recordBuyTransaction({
        assetType,
        symbol: symbol.toUpperCase().trim(),
        name: name.trim() || symbol.toUpperCase().trim(),
        quantity: qty,
        price: prc,
        brokerage: brk,
        date,
        exchange,
        deductCash: syncCash,
        notes
      });
      setSuccessMsg(`BUY order recorded for ${symbol.toUpperCase()} (${qty} units)`);
    } else if (txType === 'SELL') {
      if (!symbol.trim()) {
        setErrorMsg('Symbol is required.');
        return;
      }
      if (qty <= 0 || prc <= 0) {
        setErrorMsg('Quantity and price must be greater than zero.');
        return;
      }

      const res = recordSellTransaction({
        symbol: symbol.toUpperCase().trim(),
        quantity: qty,
        price: prc,
        brokerage: brk,
        date,
        addCash: syncCash,
        notes
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to record sell transaction.');
        return;
      }
      setSuccessMsg(`SELL order executed for ${symbol.toUpperCase()} (${qty} units)`);
    }

    setTimeout(() => {
      onClose();
    }, 1000);
  };

  const isTrade = txType === 'BUY' || txType === 'SELL';
  const totalValue = (parseFloat(quantity) || 0) * (parseFloat(price) || 0) + (parseFloat(brokerage) || 0);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-[#0E1422] border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.15)] overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-5 border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-wide">
                  RECORD TRANSACTION
                </h3>
                <p className="text-xs text-gray-400 font-mono">
                  LOG TO WEEKLY & MONTHLY LEDGER
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

          {/* Type Selector */}
          <div className="grid grid-cols-4 p-3 gap-1 bg-gray-900/60 border-b border-gray-800/60">
            {[
              { id: 'BUY', label: 'Buy', color: 'text-cyan-400' },
              { id: 'SELL', label: 'Sell', color: 'text-purple-400' },
              { id: 'DEPOSIT', label: 'Deposit', color: 'text-emerald-400' },
              { id: 'WITHDRAWAL', label: 'Withdraw', color: 'text-red-400' }
            ].map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTxType(t.id as TransactionType);
                  setErrorMsg('');
                }}
                className={`py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                  txType === t.id
                    ? 'bg-gray-800 text-white border border-gray-700 shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <span className={t.color}>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
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

            {isTrade && (
              <>
                {/* Asset Type */}
                <div>
                  <label className="text-xs font-mono text-gray-400 uppercase tracking-wider block mb-1">
                    Asset Class
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'stock', label: 'Stock' },
                      { id: 'mutual_fund', label: 'Mutual Fund' },
                      { id: 'gold', label: 'Gold' },
                      { id: 'silver', label: 'Silver' }
                    ].map(a => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setAssetType(a.id as AssetType)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition-all ${
                          assetType === a.id
                            ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300'
                            : 'bg-gray-800/40 border-gray-700/40 text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Symbol & Name */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-mono text-gray-400 uppercase tracking-wider block mb-1">
                      Ticker / Symbol *
                    </label>
                    {txType === 'SELL' && holdings.length > 0 ? (
                      <select
                        value={symbol}
                        onChange={(e) => {
                          const sym = e.target.value;
                          setSymbol(sym);
                          const h = holdings.find(item => item.symbol === sym);
                          if (h) {
                            setName(h.name);
                            setPrice(h.averagePrice.toString());
                          }
                        }}
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700/60 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value="">Select Holding to Sell</option>
                        {holdings.map(h => (
                          <option key={h.id} value={h.symbol}>
                            {h.symbol} ({h.quantity} units)
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="e.g. RELIANCE, TCS, AAPL"
                        value={symbol}
                        onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700/60 rounded-xl text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                        required
                      />
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-mono text-gray-400 uppercase tracking-wider block mb-1">
                      Exchange
                    </label>
                    <select
                      value={exchange}
                      onChange={(e) => setExchange(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700/60 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="NSE">NSE (India)</option>
                      <option value="BSE">BSE (India)</option>
                      <option value="NASDAQ">NASDAQ (US)</option>
                      <option value="NYSE">NYSE (US)</option>
                      <option value="PHYSICAL">Physical Bullion</option>
                    </select>
                  </div>
                </div>

                {/* Quantity & Price */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-mono text-gray-400 uppercase tracking-wider block mb-1">
                      Quantity / Units *
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700/60 rounded-xl text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-mono text-gray-400 uppercase tracking-wider block mb-1">
                      Execution Price (₹) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700/60 rounded-xl text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                      required
                    />
                  </div>
                </div>

                {/* Brokerage & Charges */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-mono text-gray-400 uppercase tracking-wider block mb-1">
                      Brokerage & Taxes (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={brokerage}
                      onChange={(e) => setBrokerage(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700/60 rounded-xl text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-mono text-gray-400 uppercase tracking-wider block mb-1">
                      Transaction Date
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700/60 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* Live Value Preview */}
                <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800 flex items-center justify-between text-xs">
                  <span className="text-gray-400 font-mono">Net Transaction Value:</span>
                  <span className="font-mono font-bold text-cyan-400 text-sm">
                    {formatCurrency(totalValue)}
                  </span>
                </div>

                {/* Cash Sync Checkbox */}
                <label className="flex items-center gap-2.5 text-xs text-gray-300 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={syncCash}
                    onChange={(e) => setSyncCash(e.target.checked)}
                    className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-cyan-500 focus:ring-0"
                  />
                  <span>
                    {txType === 'BUY'
                      ? 'Deduct value from available cash balance'
                      : 'Add sale proceeds to available cash balance'}
                  </span>
                </label>
              </>
            )}

            {!isTrade && (
              <>
                {/* Deposit / Withdrawal Amount */}
                <div>
                  <label className="text-xs font-mono text-gray-400 uppercase tracking-wider block mb-1">
                    {txType === 'DEPOSIT' ? 'Deposit Amount (₹) *' : 'Withdrawal Amount (₹) *'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700/60 rounded-xl text-lg font-mono font-bold text-white focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-gray-400 uppercase tracking-wider block mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700/60 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </>
            )}

            {/* Notes */}
            <div>
              <label className="text-xs font-mono text-gray-400 uppercase tracking-wider block mb-1">
                Notes / Strategy / Reason
              </label>
              <input
                type="text"
                placeholder="Optional notes for your ledger..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700/60 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 text-white font-semibold text-xs tracking-wider uppercase shadow-[0_0_20px_rgba(6,182,212,0.25)] hover:brightness-110 transition-all"
            >
              Commit To Ledger
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
