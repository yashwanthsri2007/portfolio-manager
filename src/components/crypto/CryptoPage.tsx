// src/components/crypto/CryptoPage.tsx
// Comprehensive Cryptocurrency Section: Live Markets, Watchlist, Charts, and User Crypto Holdings

import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  RefreshCw,
  Search,
  Star,
  ExternalLink,
  ShieldCheck,
  Wallet,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
  Edit2
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';
import { GlassCard } from '../common/GlassCard';
import { Modal } from '../common/Modal';
import { usePortfolio } from '../../context/PortfolioContext';
import {
  fetchCryptoMarkets,
  loadCryptoWatchlist,
  saveCryptoWatchlist,
  FALLBACK_CRYPTO_MARKETS,
  type CryptoMarketItem
} from '../../services/cryptoService';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import type { Holding } from '../../types';

export interface CryptoPageProps {
  onNavigate?: (tab: string, data?: any) => void;
}

export const CryptoPage: React.FC<CryptoPageProps> = ({ onNavigate }) => {
  const { holdings, addHolding, deleteHolding, updateHolding, metrics } = usePortfolio();

  const [markets, setMarkets] = useState<CryptoMarketItem[]>(FALLBACK_CRYPTO_MARKETS);
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [watchlist, setWatchlist] = useState<string[]>(loadCryptoWatchlist);
  const [activeTab, setActiveTab] = useState<'holdings' | 'markets' | 'watchlist'>('holdings');

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHoldingId, setEditingHoldingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    symbol: 'BTC',
    name: 'Bitcoin',
    quantity: '',
    buyPriceINR: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    exchange: 'Binance',
    notes: ''
  });

  // Load live markets
  const loadMarkets = async () => {
    setIsLoading(true);
    const res = await fetchCryptoMarkets('inr');
    setMarkets(res.data);
    setIsLive(res.isLive);
    setIsLoading(false);
  };

  useEffect(() => {
    loadMarkets();
  }, []);

  // Filtered user crypto holdings
  const cryptoHoldings = useMemo(() => {
    return holdings.filter(h => h.assetType === 'crypto');
  }, [holdings]);

  // Aggregate user crypto portfolio value
  const cryptoPortfolioStats = useMemo(() => {
    let totalInvested = 0;
    let totalCurrentVal = 0;

    cryptoHoldings.forEach(h => {
      const invested = h.quantity * h.averagePrice;
      // Match with live price if available, else currentPrice, else avgPrice
      const matchedCoin = markets.find(m => m.symbol.toUpperCase() === h.symbol.toUpperCase());
      const currentPrice = matchedCoin ? matchedCoin.current_price : (h.currentPrice || h.averagePrice);
      const val = h.quantity * currentPrice;

      totalInvested += invested;
      totalCurrentVal += val;
    });

    const pnl = totalCurrentVal - totalInvested;
    const pnlPercent = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;

    return { totalInvested, totalCurrentVal, pnl, pnlPercent };
  }, [cryptoHoldings, markets]);

  // Toggle watchlist
  const handleToggleWatchlist = (coinId: string) => {
    const next = watchlist.includes(coinId)
      ? watchlist.filter(id => id !== coinId)
      : [...watchlist, coinId];
    setWatchlist(next);
    saveCryptoWatchlist(next);
  };

  // Filtered market list
  const filteredMarkets = useMemo(() => {
    return markets.filter(m => {
      const matchesSearch =
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.symbol.toLowerCase().includes(searchQuery.toLowerCase());
      if (activeTab === 'watchlist') {
        return matchesSearch && watchlist.includes(m.id);
      }
      return matchesSearch;
    });
  }, [markets, searchQuery, activeTab, watchlist]);

  // Handle open add modal
  const openAddModal = (presetSymbol?: string, presetName?: string, presetPrice?: number) => {
    setEditingHoldingId(null);
    setFormData({
      symbol: presetSymbol || 'BTC',
      name: presetName || 'Bitcoin',
      quantity: '',
      buyPriceINR: presetPrice ? presetPrice.toString() : '',
      purchaseDate: new Date().toISOString().split('T')[0],
      exchange: 'Binance',
      notes: ''
    });
    setIsModalOpen(true);
  };

  // Handle open edit modal
  const openEditModal = (h: Holding) => {
    setEditingHoldingId(h.id);
    setFormData({
      symbol: h.symbol,
      name: h.name,
      quantity: h.quantity.toString(),
      buyPriceINR: h.averagePrice.toString(),
      purchaseDate: h.purchaseDate,
      exchange: h.exchange || 'Binance',
      notes: h.notes || ''
    });
    setIsModalOpen(true);
  };

  // Handle save holding
  const handleSaveHolding = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(formData.quantity);
    const price = parseFloat(formData.buyPriceINR);
    if (!qty || qty <= 0 || !price || price <= 0) return;

    const matchedCoin = markets.find(m => m.symbol.toUpperCase() === formData.symbol.toUpperCase());
    const livePrice = matchedCoin ? matchedCoin.current_price : price;

    if (editingHoldingId) {
      updateHolding(editingHoldingId, {
        symbol: formData.symbol.toUpperCase(),
        name: formData.name,
        quantity: qty,
        averagePrice: price,
        currentPrice: livePrice,
        purchaseDate: formData.purchaseDate,
        exchange: formData.exchange,
        notes: formData.notes
      });
    } else {
      addHolding({
        assetType: 'crypto',
        symbol: formData.symbol.toUpperCase(),
        name: formData.name,
        quantity: qty,
        averagePrice: price,
        currentPrice: livePrice,
        purchaseDate: formData.purchaseDate,
        exchange: formData.exchange,
        notes: formData.notes
      });
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-gray-100 flex items-center gap-2">
              <Coins className="w-6 h-6 text-amber-400" />
              <span>Crypto Intelligence & Holdings</span>
            </h1>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                isLive
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              }`}
            >
              {isLive ? 'LIVE COINGECKO' : 'REFERENCE CACHE'}
            </span>
          </div>
          <p className="text-xs text-gray-400 font-mono mt-1">
            Track spot digital assets in INR, manage private holdings, and aggregate into total net worth.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadMarkets}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl bg-gray-800/80 hover:bg-gray-800 text-gray-300 border border-gray-700 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Prices</span>
          </button>

          <button
            onClick={() => openAddModal()}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:opacity-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Crypto Holding</span>
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-4 relative overflow-hidden">
          <div className="text-[11px] font-mono text-gray-400">Total Crypto Valuation</div>
          <div className="text-xl font-black text-white mt-1">
            {formatCurrency(cryptoPortfolioStats.totalCurrentVal)}
          </div>
          <div className="text-[11px] font-mono text-gray-400 mt-1">
            Cost: {formatCurrency(cryptoPortfolioStats.totalInvested)}
          </div>
        </GlassCard>

        <GlassCard className="p-4 relative overflow-hidden">
          <div className="text-[11px] font-mono text-gray-400">Unrealized Crypto P/L</div>
          <div
            className={`text-xl font-black mt-1 flex items-center gap-1.5 ${
              cryptoPortfolioStats.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {cryptoPortfolioStats.pnl >= 0 ? (
              <ArrowUpRight className="w-5 h-5" />
            ) : (
              <ArrowDownRight className="w-5 h-5" />
            )}
            <span>
              {cryptoPortfolioStats.pnl >= 0 ? '+' : ''}
              {formatCurrency(cryptoPortfolioStats.pnl)}
            </span>
          </div>
          <div
            className={`text-[11px] font-mono mt-1 ${
              cryptoPortfolioStats.pnlPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatPercent(cryptoPortfolioStats.pnlPercent)} return
          </div>
        </GlassCard>

        {/* Bitcoin Benchmark */}
        <GlassCard className="p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-gray-400">Bitcoin (BTC / INR)</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                (markets[0]?.price_change_percentage_24h || 0) >= 0
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/20 text-rose-300'
              }`}
            >
              {formatPercent(markets[0]?.price_change_percentage_24h || 0)}
            </span>
          </div>
          <div className="text-xl font-black text-white mt-1">
            {formatCurrency(markets[0]?.current_price || 8250000)}
          </div>
          <div className="text-[10px] font-mono text-gray-500 mt-1">
            Market Cap: ₹162T • 24h Vol: ₹3.2T
          </div>
        </GlassCard>

        {/* Ethereum Benchmark */}
        <GlassCard className="p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-gray-400">Ethereum (ETH / INR)</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                (markets[1]?.price_change_percentage_24h || 0) >= 0
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/20 text-rose-300'
              }`}
            >
              {formatPercent(markets[1]?.price_change_percentage_24h || 0)}
            </span>
          </div>
          <div className="text-xl font-black text-white mt-1">
            {formatCurrency(markets[1]?.current_price || 285000)}
          </div>
          <div className="text-[10px] font-mono text-gray-500 mt-1">
            Market Cap: ₹34T • 24h Vol: ₹1.4T
          </div>
        </GlassCard>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center justify-between border-b border-gray-800/80 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('holdings')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'holdings'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            My Crypto Holdings ({cryptoHoldings.length})
          </button>
          <button
            onClick={() => setActiveTab('markets')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'markets'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Live Market Rates
          </button>
          <button
            onClick={() => setActiveTab('watchlist')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'watchlist'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Watchlist ({watchlist.length})
          </button>
        </div>

        {activeTab !== 'holdings' && (
          <div className="relative w-56">
            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search token or symbol..."
              className="w-full pl-8 pr-3 py-1.5 bg-gray-900 border border-gray-800 rounded-xl text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-amber-500"
            />
          </div>
        )}
      </div>

      {/* Tab 1: User Crypto Holdings */}
      {activeTab === 'holdings' && (
        <div>
          {cryptoHoldings.length === 0 ? (
            <GlassCard className="p-12 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Coins className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-gray-200">No Crypto Holdings Recorded</h3>
                <p className="text-xs text-gray-400 max-w-md mx-auto">
                  Add your Bitcoin, Ethereum, Solana or other crypto assets to seamlessly monitor valuation and profit/loss in Indian Rupees (INR).
                </p>
              </div>
              <button
                onClick={() => openAddModal()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-xs inline-flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:opacity-95 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add Your First Crypto Asset</span>
              </button>
            </GlassCard>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-800 bg-[#0E1422]/60">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 font-mono text-[11px] bg-gray-900/40">
                    <th className="py-3 px-4">Asset</th>
                    <th className="py-3 px-4">Wallet / Exchange</th>
                    <th className="py-3 px-4 text-right">Quantity</th>
                    <th className="py-3 px-4 text-right">Avg Buy Price</th>
                    <th className="py-3 px-4 text-right">Live Price</th>
                    <th className="py-3 px-4 text-right">Total Valuation</th>
                    <th className="py-3 px-4 text-right">Unrealized P/L</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60 font-mono">
                  {cryptoHoldings.map((h) => {
                    const matchedCoin = markets.find(m => m.symbol.toUpperCase() === h.symbol.toUpperCase());
                    const livePrice = matchedCoin ? matchedCoin.current_price : (h.currentPrice || h.averagePrice);
                    const holdingVal = h.quantity * livePrice;
                    const investedVal = h.quantity * h.averagePrice;
                    const pnl = holdingVal - investedVal;
                    const pnlPct = investedVal > 0 ? (pnl / investedVal) * 100 : 0;

                    return (
                      <tr key={h.id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-gray-100 flex items-center gap-2 font-sans">
                            <span className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xs font-mono font-bold">
                              {h.symbol.slice(0, 3)}
                            </span>
                            <div>
                              <div>{h.name}</div>
                              <div className="text-[10px] text-gray-400 font-mono">{h.symbol}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-300 font-sans">
                          {h.exchange || 'Self-Custody'}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-white">
                          {h.quantity}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-300">
                          {formatCurrency(h.averagePrice)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-cyan-300">
                          {formatCurrency(livePrice)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-white">
                          {formatCurrency(holdingVal)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className={`font-bold ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
                          </div>
                          <div className={`text-[10px] ${pnlPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {formatPercent(pnlPct)}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openEditModal(h)}
                              className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
                              title="Edit Holding"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteHolding(h.id)}
                              className="p-1.5 rounded-lg bg-gray-800 hover:bg-rose-950/40 text-rose-400 transition-colors"
                              title="Delete Holding"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2 & 3: Live Markets / Watchlist Table */}
      {(activeTab === 'markets' || activeTab === 'watchlist') && (
        <div className="overflow-x-auto rounded-2xl border border-gray-800 bg-[#0E1422]/60">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 font-mono text-[11px] bg-gray-900/40">
                <th className="py-3 px-4">Asset</th>
                <th className="py-3 px-4 text-right">Price (INR)</th>
                <th className="py-3 px-4 text-right">24h Change</th>
                <th className="py-3 px-4 text-right">7d Change</th>
                <th className="py-3 px-4 text-right">30d Change</th>
                <th className="py-3 px-4 text-right">24h Volume</th>
                <th className="py-3 px-4 text-right">Market Cap</th>
                <th className="py-3 px-4 text-center">7d Sparkline</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 font-mono">
              {filteredMarkets.map((coin) => {
                const isWatchlisted = watchlist.includes(coin.id);
                const sparkData = coin.sparkline_in_7d?.price?.map((p, i) => ({ val: p, idx: i })) || [];
                const isUp = (coin.price_change_percentage_24h || 0) >= 0;

                return (
                  <tr key={coin.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleToggleWatchlist(coin.id)}
                          className={`p-1 rounded-lg transition-colors ${
                            isWatchlisted ? 'text-amber-400' : 'text-gray-600 hover:text-gray-400'
                          }`}
                        >
                          <Star className="w-4 h-4 fill-current" />
                        </button>
                        <div>
                          <div className="font-bold text-gray-100 font-sans">{coin.name}</div>
                          <div className="text-[10px] text-gray-400 uppercase">{coin.symbol}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-white">
                      {formatCurrency(coin.current_price)}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-bold ${
                        isUp ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {formatPercent(coin.price_change_percentage_24h || 0)}
                    </td>
                    <td
                      className={`py-3 px-4 text-right ${
                        (coin.price_change_percentage_7d_in_currency || 0) >= 0
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {formatPercent(coin.price_change_percentage_7d_in_currency || 0)}
                    </td>
                    <td
                      className={`py-3 px-4 text-right ${
                        (coin.price_change_percentage_30d_in_currency || 0) >= 0
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {formatPercent(coin.price_change_percentage_30d_in_currency || 0)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-400 text-[11px]">
                      ₹{(coin.total_volume / 1e9).toFixed(1)}B
                    </td>
                    <td className="py-3 px-4 text-right text-gray-300 text-[11px]">
                      ₹{(coin.market_cap / 1e12).toFixed(2)}T
                    </td>
                    <td className="py-3 px-4 text-center w-28">
                      {sparkData.length > 0 ? (
                        <div className="w-24 h-8 mx-auto">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={sparkData}>
                              <Area
                                type="monotone"
                                dataKey="val"
                                stroke={isUp ? '#10b981' : '#f43f5e'}
                                fill="transparent"
                                strokeWidth={1.5}
                                dot={false}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => openAddModal(coin.symbol.toUpperCase(), coin.name, coin.current_price)}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-semibold transition-all flex items-center gap-1 mx-auto"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Hold</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Crypto Holding Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingHoldingId ? 'Edit Crypto Holding' : 'Record Crypto Holding'}
      >
        <form onSubmit={handleSaveHolding} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-gray-400 mb-1">Asset Symbol</label>
              <input
                type="text"
                value={formData.symbol}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                placeholder="e.g. BTC"
                required
                className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-xl text-xs text-white uppercase font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-gray-400 mb-1">Asset Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Bitcoin"
                required
                className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-xl text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-gray-400 mb-1">Quantity</label>
              <input
                type="number"
                step="any"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="0.05"
                required
                className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-xl text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-gray-400 mb-1">Avg Buy Price (INR ₹)</label>
              <input
                type="number"
                step="any"
                value={formData.buyPriceINR}
                onChange={(e) => setFormData({ ...formData, buyPriceINR: e.target.value })}
                placeholder="8250000"
                required
                className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-xl text-xs text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-gray-400 mb-1">Purchase Date</label>
              <input
                type="date"
                value={formData.purchaseDate}
                onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                required
                className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-xl text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-gray-400 mb-1">Wallet / Exchange</label>
              <input
                type="text"
                value={formData.exchange}
                onChange={(e) => setFormData({ ...formData, exchange: e.target.value })}
                placeholder="Binance, Ledger, CoinDCX"
                className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-xl text-xs text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-gray-400 mb-1">Notes (Optional)</label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Long-term hardware cold storage"
              className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-xl text-xs text-white"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-bold shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:opacity-95"
            >
              {editingHoldingId ? 'Save Changes' : 'Add to Portfolio'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
