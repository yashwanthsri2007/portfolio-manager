import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { Holding, PortfolioMetrics, WatchlistItem, NewsItem, Transaction, StockQuote } from '../types';
import { INITIAL_HOLDINGS, INITIAL_WATCHLIST, SAMPLE_TEST_HOLDINGS } from '../utils/initialDemoData';
import {
  loadStoredHoldings,
  saveHoldingsToStorage,
  loadStoredTransactions,
  saveTransactionsToStorage,
  loadStoredCash,
  saveCashToStorage,
  clearAllPortfolioStorage,
  exportPortfolioBackupJSON,
  restorePortfolioBackupJSON,
  isSetupCompleted,
  markSetupCompleted,
  STORAGE_KEYS
} from '../services/portfolioService';
import { fetchStockQuote, getStoredFinnhubKey } from '../services/marketDataService';
import { fetchMutualFundQuote } from '../services/mutualFundService';
import { getGoldLivePrice, getSilverLivePrice, calculateGoldHoldingValue, calculateSilverHoldingValue } from '../services/metalsService';
import { getMarketNews } from '../services/newsService';
import { calculatePortfolioSentiment } from '../services/sentimentService';

interface BuyTransactionParams {
  assetType: Holding['assetType'];
  symbol: string;
  name: string;
  quantity: number;
  price: number;
  date?: string;
  brokerage?: number;
  exchange?: string;
  deductCash?: boolean;
  notes?: string;
}

interface SellTransactionParams {
  holdingId?: string;
  symbol: string;
  quantity: number;
  price: number;
  date?: string;
  brokerage?: number;
  addCash?: boolean;
  notes?: string;
}

interface PortfolioContextType {
  holdings: Holding[];
  transactions: Transaction[];
  cashBalance: number;
  watchlist: WatchlistItem[];
  metrics: PortfolioMetrics;
  news: NewsItem[];
  quotesCache: Record<string, StockQuote | any>;
  isRefreshing: boolean;
  isFirstTimeUser: boolean;
  // Holding Actions
  addHolding: (holding: Omit<Holding, 'id'>, recordBuyTx?: boolean, deductFromCash?: boolean) => void;
  updateHolding: (id: string, updated: Partial<Holding>) => void;
  deleteHolding: (id: string) => void;
  duplicateHolding: (id: string) => void;
  importHoldings: (newHoldings: Holding[], overwrite?: boolean) => void;
  // Transaction & Cash Actions
  recordBuyTransaction: (params: BuyTransactionParams) => void;
  recordSellTransaction: (params: SellTransactionParams) => { success: boolean; error?: string };
  depositCash: (amount: number, date?: string, notes?: string) => void;
  withdrawCash: (amount: number, date?: string, notes?: string) => { success: boolean; error?: string };
  setCashBalance: (newBalance: number) => void;
  deleteTransaction: (id: string) => void;
  completeSetup: (initialCash: number, initialHoldings?: Holding[]) => void;
  // Backup & Storage
  clearAllData: () => void;
  loadSamplePortfolio: () => void;
  restoreFromBackup: (jsonString: string) => void;
  getBackupJSON: () => string;
  // Watchlist & Market
  toggleWatchlist: (item: Omit<WatchlistItem, 'id' | 'addedAt'>) => void;
  isInWatchlist: (symbol: string) => boolean;
  refreshMarketData: () => void;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

export const PortfolioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Core State
  const [holdings, setHoldings] = useState<Holding[]>(() => {
    const stored = loadStoredHoldings();
    return stored.length > 0 ? stored : INITIAL_HOLDINGS;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    return loadStoredTransactions();
  });

  const [cashBalance, setCashBalanceState] = useState<number>(() => {
    return loadStoredCash();
  });

  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.WATCHLIST);
      return stored ? JSON.parse(stored) : INITIAL_WATCHLIST;
    } catch {
      return INITIAL_WATCHLIST;
    }
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [quotesCache, setQuotesCache] = useState<Record<string, any>>({});
  const [setupDone, setSetupDone] = useState<boolean>(() => isSetupCompleted());

  // First time user check
  const isFirstTimeUser = useMemo(() => {
    return !setupDone && holdings.length === 0 && cashBalance === 0 && transactions.length === 0;
  }, [setupDone, holdings.length, cashBalance, transactions.length]);

  // Sync state to local storage
  useEffect(() => {
    saveHoldingsToStorage(holdings);
  }, [holdings]);

  useEffect(() => {
    saveTransactionsToStorage(transactions);
  }, [transactions]);

  useEffect(() => {
    saveCashToStorage(cashBalance);
  }, [cashBalance]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(watchlist));
  }, [watchlist]);

  // 2. Market Data Refresher
  const refreshMarketData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const newQuotes: Record<string, any> = {};
      const liveGold = getGoldLivePrice();
      const liveSilver = getSilverLivePrice();

      newQuotes['GOLD-LIVE'] = liveGold;
      newQuotes['SILVER-LIVE'] = liveSilver;

      // Fetch stock quotes for active stock holdings & watchlist using stored Finnhub key
      const activeFinnhubKey = getStoredFinnhubKey();
      const stockSymbols = Array.from(
        new Set([
          ...holdings.filter(h => h.assetType === 'stock').map(h => h.symbol),
          ...watchlist.filter(w => w.assetType === 'stock').map(w => w.symbol)
        ])
      );

      await Promise.all(
        stockSymbols.map(async (sym) => {
          const holding = holdings.find(h => h.symbol.toUpperCase() === sym.toUpperCase());
          newQuotes[`stock_${sym}`] = await fetchStockQuote(sym, activeFinnhubKey, holding?.manualPrice);
        })
      );

      // Fetch MF quotes
      const mfHoldings = holdings.filter(h => h.assetType === 'mutual_fund');
      await Promise.all(
        mfHoldings.map(async (h) => {
          newQuotes[`mf_${h.symbol}`] = await fetchMutualFundQuote(h.symbol);
        })
      );

      setQuotesCache(newQuotes);
    } catch (err) {
      console.warn('Market data refresh error:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [holdings, watchlist]);

  useEffect(() => {
    refreshMarketData();
    const interval = setInterval(refreshMarketData, 60000);
    return () => clearInterval(interval);
  }, [refreshMarketData]);

  // 3. Financial Metrics & Math Calculation
  const metrics: PortfolioMetrics = useMemo(() => {
    let totalInvestedCost = 0;
    let holdingsCurrentValue = 0;
    let todayProfitLoss = 0;

    const categoryTotals: Record<string, { invested: number; current: number; profit: number }> = {
      Cash: { invested: cashBalance, current: cashBalance, profit: 0 },
      Stocks: { invested: 0, current: 0, profit: 0 },
      'Mutual Funds': { invested: 0, current: 0, profit: 0 },
      Gold: { invested: 0, current: 0, profit: 0 },
      Silver: { invested: 0, current: 0, profit: 0 },
      Crypto: { invested: 0, current: 0, profit: 0 }
    };

    const sectorTotals: Record<string, number> = {};
    const holdingPerformances: { symbol: string; name: string; changePercent: number; profit: number; value: number }[] = [];

    const liveGold = quotesCache['GOLD-LIVE'] || getGoldLivePrice();
    const liveSilver = quotesCache['SILVER-LIVE'] || getSilverLivePrice();

    holdings.forEach(h => {
      let hInvested = h.quantity * h.averagePrice;
      let hCurrent = hInvested;
      let hDayChange = 0;
      let sector = 'Other';

      if (h.assetType === 'stock') {
        const quote = quotesCache[`stock_${h.symbol}`];
        const price = h.manualPrice ?? (quote && quote.price > 0 ? quote.price : h.averagePrice);
        const changePercent = quote ? quote.changePercent : 0;
        sector = quote?.sector || 'Equity';

        hCurrent = h.quantity * price;
        hDayChange = h.quantity * (price * (changePercent / 100));

        categoryTotals['Stocks'].invested += hInvested;
        categoryTotals['Stocks'].current += hCurrent;
        categoryTotals['Stocks'].profit += (hCurrent - hInvested);

        holdingPerformances.push({
          symbol: h.symbol,
          name: h.name,
          changePercent,
          profit: hCurrent - hInvested,
          value: hCurrent
        });
      } else if (h.assetType === 'mutual_fund') {
        const mfQuote = quotesCache[`mf_${h.symbol}`];
        const nav = mfQuote && mfQuote.nav > 0 ? mfQuote.nav : h.averagePrice;
        const changePercent = mfQuote ? mfQuote.changePercent : 0;
        sector = 'Mutual Funds';

        hCurrent = h.quantity * nav;
        hDayChange = h.quantity * (nav * (changePercent / 100));

        categoryTotals['Mutual Funds'].invested += hInvested;
        categoryTotals['Mutual Funds'].current += hCurrent;
        categoryTotals['Mutual Funds'].profit += (hCurrent - hInvested);

        holdingPerformances.push({
          symbol: h.name,
          name: h.name,
          changePercent,
          profit: hCurrent - hInvested,
          value: hCurrent
        });
      } else if (h.assetType === 'gold') {
        const goldVal = calculateGoldHoldingValue(h, liveGold);
        hInvested = goldVal.totalInvested;
        hCurrent = goldVal.currentValue;
        hDayChange = hCurrent * (liveGold.dayChangePercent / 100);
        sector = 'Precious Metals';

        categoryTotals['Gold'].invested += hInvested;
        categoryTotals['Gold'].current += hCurrent;
        categoryTotals['Gold'].profit += goldVal.profitLoss;
      } else if (h.assetType === 'silver') {
        const silverVal = calculateSilverHoldingValue(h, liveSilver);
        hInvested = silverVal.totalInvested;
        hCurrent = silverVal.currentValue;
        hDayChange = hCurrent * (liveSilver.dayChangePercent / 100);
        sector = 'Precious Metals';

        categoryTotals['Silver'].invested += hInvested;
        categoryTotals['Silver'].current += hCurrent;
        categoryTotals['Silver'].profit += silverVal.profitLoss;
      } else if (h.assetType === 'crypto') {
        sector = 'Cryptocurrency';
        categoryTotals['Crypto'].invested += hInvested;
        categoryTotals['Crypto'].current += hCurrent;
        categoryTotals['Crypto'].profit += 0;
      }

      totalInvestedCost += hInvested;
      holdingsCurrentValue += hCurrent;
      todayProfitLoss += hDayChange;
      sectorTotals[sector] = (sectorTotals[sector] || 0) + hCurrent;
    });

    // Realized Profit / Loss calculated from all recorded SELL transactions
    const realizedProfitLoss = transactions
      .filter(t => t.type === 'SELL')
      .reduce((sum, t) => sum + (t.realizedPnL || 0), 0);

    // Total Cash Flow
    const totalDeposited = transactions
      .filter(t => t.type === 'DEPOSIT')
      .reduce((sum, t) => sum + t.totalValue, 0);

    const totalWithdrawn = transactions
      .filter(t => t.type === 'WITHDRAWAL')
      .reduce((sum, t) => sum + t.totalValue, 0);

    const netCashFlow = totalDeposited - totalWithdrawn;

    // Unrealized & Total P&L
    const unrealizedProfitLoss = holdingsCurrentValue - totalInvestedCost;
    const totalProfitLoss = unrealizedProfitLoss + realizedProfitLoss;
    const totalNetWorth = cashBalance + holdingsCurrentValue;

    // Portfolio Return %
    const totalReturnPercent = totalInvestedCost > 0
      ? (unrealizedProfitLoss / totalInvestedCost) * 100
      : (netCashFlow > 0 ? (totalProfitLoss / netCashFlow) * 100 : 0);

    const todayReturnPercent = totalNetWorth > 0 ? (todayProfitLoss / totalNetWorth) * 100 : 0;

    // Asset Allocation Chart formatting
    const categoryColors: Record<string, string> = {
      Cash: '#10B981',
      Stocks: '#06B6D4',
      'Mutual Funds': '#7C3AED',
      Gold: '#F59E0B',
      Silver: '#94A3B8',
      Crypto: '#EC4899'
    };

    const assetAllocation = Object.keys(categoryTotals).map(cat => {
      const amt = categoryTotals[cat].current;
      const pct = totalNetWorth > 0 ? (amt / totalNetWorth) * 100 : 0;
      const inv = categoryTotals[cat].invested;
      const profit = amt - inv;
      const ret = inv > 0 ? (profit / inv) * 100 : 0;
      return {
        category: cat,
        amount: amt,
        percentage: pct,
        color: categoryColors[cat] || '#64748B',
        profitLoss: profit,
        returnPercent: ret
      };
    }).filter(a => a.amount > 0 || (a.category === 'Cash' && cashBalance > 0));

    // Sector allocation
    const sectorAllocation = Object.keys(sectorTotals).map(sec => ({
      sector: sec,
      amount: sectorTotals[sec],
      percentage: holdingsCurrentValue > 0 ? (sectorTotals[sec] / holdingsCurrentValue) * 100 : 0
    })).sort((a, b) => b.amount - a.amount);

    // Top Gainers & Losers
    holdingPerformances.sort((a, b) => b.changePercent - a.changePercent);
    const topGainer = holdingPerformances.length > 0 && holdingPerformances[0].changePercent > 0 ? {
      symbol: holdingPerformances[0].symbol,
      name: holdingPerformances[0].name,
      changePercent: holdingPerformances[0].changePercent,
      profit: holdingPerformances[0].profit
    } : null;

    const topLoser = holdingPerformances.length > 0 && holdingPerformances[holdingPerformances.length - 1].changePercent < 0 ? {
      symbol: holdingPerformances[holdingPerformances.length - 1].symbol,
      name: holdingPerformances[holdingPerformances.length - 1].name,
      changePercent: holdingPerformances[holdingPerformances.length - 1].changePercent,
      loss: holdingPerformances[holdingPerformances.length - 1].profit
    } : null;

    // Concentration Risk Analysis
    const concentrationRisk = holdingPerformances.map(hp => ({
      symbol: hp.symbol,
      name: hp.name,
      weight: totalNetWorth > 0 ? (hp.value / totalNetWorth) * 100 : 0,
      currentValue: hp.value
    })).sort((a, b) => b.weight - a.weight);

    // Diversification Health Score (0-100)
    let score = 100;
    if (holdings.length === 0) {
      score = cashBalance > 0 ? 50 : 0;
    } else {
      if (concentrationRisk.length > 0 && concentrationRisk[0].weight > 35) score -= 25;
      if (assetAllocation.length <= 1) score -= 20;
      if (holdings.length < 3) score -= 15;
    }
    score = Math.max(0, Math.min(100, score));

    // News & Sentiment calculation
    const currentNews = getMarketNews(holdings);
    const sentiment = calculatePortfolioSentiment(currentNews);

    return {
      totalNetWorth,
      availableCash: cashBalance,
      totalInvested: totalInvestedCost,
      currentValue: holdingsCurrentValue,
      holdingsValue: holdingsCurrentValue,
      unrealizedProfitLoss,
      realizedProfitLoss,
      totalProfitLoss,
      totalReturnPercent,
      todayProfitLoss,
      todayReturnPercent,
      totalDeposited,
      totalWithdrawn,
      netCashFlow,
      assetAllocation,
      sectorAllocation,
      diversificationScore: score,
      portfolioSentimentScore: sentiment.score,
      topGainer,
      topLoser,
      concentrationRisk
    };
  }, [holdings, transactions, cashBalance, quotesCache]);

  const news = useMemo(() => getMarketNews(holdings), [holdings]);

  // 4. Portfolio & Transaction Actions

  // Record a BUY transaction and update or create holding
  const recordBuyTransaction = useCallback((params: BuyTransactionParams) => {
    const {
      assetType,
      symbol,
      name,
      quantity,
      price,
      date = new Date().toISOString().split('T')[0],
      brokerage = 0,
      exchange = 'NSE',
      deductCash = true,
      notes = ''
    } = params;

    const totalValue = quantity * price + brokerage;

    // 1. Deduct cash if requested
    let newCashBalance = cashBalance;
    if (deductCash) {
      newCashBalance = Math.max(0, cashBalance - totalValue);
      setCashBalanceState(newCashBalance);
    }

    // 2. Update existing holding or create new holding using weighted-average cost
    setHoldings(prev => {
      const upperSym = symbol.toUpperCase().trim();
      const existingIdx = prev.findIndex(h => h.symbol.toUpperCase() === upperSym && h.assetType === assetType);

      if (existingIdx >= 0) {
        const existing = prev[existingIdx];
        const totalOldCost = existing.quantity * existing.averagePrice;
        const totalNewCost = quantity * price;
        const newTotalQty = existing.quantity + quantity;
        const newAvgPrice = newTotalQty > 0 ? (totalOldCost + totalNewCost) / newTotalQty : price;

        const updated = [...prev];
        updated[existingIdx] = {
          ...existing,
          quantity: newTotalQty,
          averagePrice: parseFloat(newAvgPrice.toFixed(2)),
          purchaseDate: date,
          exchange: exchange || existing.exchange,
          notes: notes ? `${existing.notes || ''}; ${notes}`.trim() : existing.notes
        };
        return updated;
      } else {
        const newH: Holding = {
          id: `h_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          assetType,
          symbol: upperSym,
          name: name || upperSym,
          quantity,
          averagePrice: price,
          purchaseDate: date,
          exchange,
          notes
        };
        return [newH, ...prev];
      }
    });

    // 3. Create transaction record
    const tx: Transaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      date,
      assetType,
      symbol: symbol.toUpperCase().trim(),
      name: name || symbol.toUpperCase().trim(),
      type: 'BUY',
      quantity,
      price,
      totalValue,
      brokerage,
      cashBalanceAfter: newCashBalance,
      exchange,
      notes
    };

    setTransactions(prev => [tx, ...prev]);
    markSetupCompleted();
    setSetupDone(true);
  }, [cashBalance]);

  // Record a SELL transaction with realized P/L
  const recordSellTransaction = useCallback((params: SellTransactionParams): { success: boolean; error?: string } => {
    const {
      symbol,
      quantity,
      price,
      date = new Date().toISOString().split('T')[0],
      brokerage = 0,
      addCash = true,
      notes = ''
    } = params;

    const upperSym = symbol.toUpperCase().trim();
    const existing = holdings.find(h => h.symbol.toUpperCase() === upperSym);

    if (!existing) {
      return { success: false, error: `Holding for ${symbol} not found in portfolio.` };
    }

    if (existing.quantity < quantity) {
      return { success: false, error: `Insufficient quantity. You hold ${existing.quantity} units, attempted to sell ${quantity}.` };
    }

    // Realized Profit/Loss Math:
    // costBasisOfSold = quantity * existing.averagePrice
    // saleProceeds = quantity * price - brokerage
    // realizedPnL = saleProceeds - costBasisOfSold
    const costBasis = quantity * existing.averagePrice;
    const grossProceeds = quantity * price;
    const netProceeds = grossProceeds - brokerage;
    const realizedPnL = parseFloat((netProceeds - costBasis).toFixed(2));

    // Update Cash Balance
    let newCashBalance = cashBalance;
    if (addCash) {
      newCashBalance = cashBalance + netProceeds;
      setCashBalanceState(newCashBalance);
    }

    // Update or remove holding
    setHoldings(prev => {
      return prev.map(h => {
        if (h.id === existing.id) {
          const remainingQty = h.quantity - quantity;
          return remainingQty > 0 ? { ...h, quantity: remainingQty } : null;
        }
        return h;
      }).filter(Boolean) as Holding[];
    });

    // Create SELL transaction record
    const tx: Transaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      date,
      assetType: existing.assetType,
      symbol: upperSym,
      name: existing.name,
      type: 'SELL',
      quantity,
      price,
      totalValue: netProceeds,
      brokerage,
      costBasis: parseFloat(costBasis.toFixed(2)),
      realizedPnL,
      cashBalanceAfter: newCashBalance,
      exchange: existing.exchange,
      notes
    };

    setTransactions(prev => [tx, ...prev]);
    return { success: true };
  }, [holdings, cashBalance]);

  // Deposit cash
  const depositCash = useCallback((amount: number, date?: string, notes?: string) => {
    if (amount <= 0) return;
    const newCash = cashBalance + amount;
    setCashBalanceState(newCash);

    const tx: Transaction = {
      id: `tx_dep_${Date.now()}`,
      date: date || new Date().toISOString().split('T')[0],
      assetType: 'cash',
      symbol: 'CASH',
      name: 'Cash Deposit',
      type: 'DEPOSIT',
      quantity: 1,
      price: amount,
      totalValue: amount,
      cashBalanceAfter: newCash,
      notes: notes || 'Funds added to investment capital'
    };

    setTransactions(prev => [tx, ...prev]);
    markSetupCompleted();
    setSetupDone(true);
  }, [cashBalance]);

  // Withdraw cash
  const withdrawCash = useCallback((amount: number, date?: string, notes?: string): { success: boolean; error?: string } => {
    if (amount <= 0) return { success: false, error: 'Amount must be greater than zero.' };
    if (amount > cashBalance) {
      return { success: false, error: `Insufficient cash. Available: ₹${cashBalance.toLocaleString('en-IN')}, requested: ₹${amount.toLocaleString('en-IN')}` };
    }

    const newCash = cashBalance - amount;
    setCashBalanceState(newCash);

    const tx: Transaction = {
      id: `tx_wth_${Date.now()}`,
      date: date || new Date().toISOString().split('T')[0],
      assetType: 'cash',
      symbol: 'CASH',
      name: 'Cash Withdrawal',
      type: 'WITHDRAWAL',
      quantity: 1,
      price: amount,
      totalValue: amount,
      cashBalanceAfter: newCash,
      notes: notes || 'Funds withdrawn from cash balance'
    };

    setTransactions(prev => [tx, ...prev]);
    return { success: true };
  }, [cashBalance]);

  const setCashBalance = useCallback((newBalance: number) => {
    setCashBalanceState(Math.max(0, newBalance));
  }, []);

  const addHolding = useCallback((newH: Omit<Holding, 'id'>, recordBuyTx = true, deductFromCash = false) => {
    const item: Holding = {
      ...newH,
      id: `h_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    };

    setHoldings(prev => [item, ...prev]);

    if (recordBuyTx && item.assetType !== 'cash') {
      recordBuyTransaction({
        assetType: item.assetType,
        symbol: item.symbol,
        name: item.name,
        quantity: item.quantity,
        price: item.averagePrice,
        date: item.purchaseDate,
        exchange: item.exchange,
        deductCash: deductFromCash
      });
    }

    markSetupCompleted();
    setSetupDone(true);
  }, [recordBuyTransaction]);

  const updateHolding = useCallback((id: string, updated: Partial<Holding>) => {
    setHoldings(prev => prev.map(h => h.id === id ? { ...h, ...updated } : h));
  }, []);

  const deleteHolding = useCallback((id: string) => {
    setHoldings(prev => prev.filter(h => h.id !== id));
  }, []);

  const duplicateHolding = useCallback((id: string) => {
    const existing = holdings.find(h => h.id === id);
    if (existing) {
      addHolding({
        ...existing,
        name: `${existing.name} (Copy)`
      }, false);
    }
  }, [holdings, addHolding]);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  }, []);

  const importHoldings = useCallback((newHoldings: Holding[], overwrite = false) => {
    if (overwrite) {
      setHoldings(newHoldings);
    } else {
      setHoldings(prev => [...newHoldings, ...prev]);
    }
    markSetupCompleted();
    setSetupDone(true);
  }, []);

  const completeSetup = useCallback((initialCash: number, initialHoldingsList: Holding[] = []) => {
    if (initialCash > 0) {
      setCashBalanceState(initialCash);
      const tx: Transaction = {
        id: `tx_init_${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        assetType: 'cash',
        symbol: 'CASH',
        name: 'Initial Investment Capital',
        type: 'DEPOSIT',
        quantity: 1,
        price: initialCash,
        totalValue: initialCash,
        cashBalanceAfter: initialCash,
        notes: 'Initial portfolio setup deposit'
      };
      setTransactions([tx]);
    }

    if (initialHoldingsList.length > 0) {
      setHoldings(initialHoldingsList);
    }

    markSetupCompleted();
    setSetupDone(true);
  }, []);

  const clearAllData = useCallback(() => {
    clearAllPortfolioStorage();
    setHoldings([]);
    setTransactions([]);
    setCashBalanceState(0);
    setSetupDone(false);
  }, []);

  const loadSamplePortfolio = useCallback(() => {
    setCashBalanceState(75000);
    setHoldings(SAMPLE_TEST_HOLDINGS);

    const sampleTxs: Transaction[] = [
      {
        id: 'tx-sample-1',
        date: '2025-01-05',
        assetType: 'cash',
        symbol: 'CASH',
        name: 'Initial Capital',
        type: 'DEPOSIT',
        quantity: 1,
        price: 500000,
        totalValue: 500000,
        cashBalanceAfter: 500000,
        notes: 'Primary savings transfer'
      },
      {
        id: 'tx-sample-2',
        date: '2025-04-15',
        assetType: 'stock',
        symbol: 'RELIANCE',
        name: 'Reliance Industries Ltd.',
        type: 'BUY',
        quantity: 45,
        price: 2450.00,
        totalValue: 110250,
        brokerage: 40,
        cashBalanceAfter: 389710,
        exchange: 'NSE'
      },
      {
        id: 'tx-sample-3',
        date: '2025-06-10',
        assetType: 'stock',
        symbol: 'INFY',
        name: 'Infosys Limited',
        type: 'BUY',
        quantity: 120,
        price: 1520.50,
        totalValue: 182460,
        brokerage: 40,
        cashBalanceAfter: 207210,
        exchange: 'NSE'
      }
    ];

    setTransactions(sampleTxs);
    markSetupCompleted();
    setSetupDone(true);
  }, []);

  const getBackupJSON = useCallback(() => {
    return exportPortfolioBackupJSON(cashBalance, holdings, transactions, watchlist);
  }, [cashBalance, holdings, transactions, watchlist]);

  const restoreFromBackup = useCallback((jsonString: string) => {
    const data = restorePortfolioBackupJSON(jsonString);
    setCashBalanceState(data.cashBalance || 0);
    setHoldings(data.holdings || []);
    setTransactions(data.transactions || []);
    if (data.watchlist) setWatchlist(data.watchlist);
    markSetupCompleted();
    setSetupDone(true);
  }, []);

  const toggleWatchlist = useCallback((item: Omit<WatchlistItem, 'id' | 'addedAt'>) => {
    setWatchlist(prev => {
      const exists = prev.some(w => w.symbol.toUpperCase() === item.symbol.toUpperCase());
      if (exists) {
        return prev.filter(w => w.symbol.toUpperCase() !== item.symbol.toUpperCase());
      }
      return [{
        ...item,
        id: `w_${Date.now()}`,
        addedAt: new Date().toISOString().split('T')[0]
      }, ...prev];
    });
  }, []);

  const isInWatchlist = useCallback((symbol: string) => {
    return watchlist.some(w => w.symbol.toUpperCase() === symbol.toUpperCase());
  }, [watchlist]);

  return (
    <PortfolioContext.Provider value={{
      holdings,
      transactions,
      cashBalance,
      watchlist,
      metrics,
      news,
      quotesCache,
      isRefreshing,
      isFirstTimeUser,
      addHolding,
      updateHolding,
      deleteHolding,
      duplicateHolding,
      importHoldings,
      recordBuyTransaction,
      recordSellTransaction,
      depositCash,
      withdrawCash,
      setCashBalance,
      deleteTransaction,
      completeSetup,
      clearAllData,
      loadSamplePortfolio,
      restoreFromBackup,
      getBackupJSON,
      toggleWatchlist,
      isInWatchlist,
      refreshMarketData
    }}>
      {children}
    </PortfolioContext.Provider>
  );
};

export const usePortfolio = () => {
  const context = useContext(PortfolioContext);
  if (!context) throw new Error('usePortfolio must be used within PortfolioProvider');
  return context;
};
