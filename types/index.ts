export type AssetType = 'stock' | 'mutual_fund' | 'gold' | 'silver' | 'crypto' | 'cash';

export type MetalCategory = '24K' | '22K' | 'Jewellery' | 'Coins' | 'Bars' | 'Digital';

export type TransactionType = 'BUY' | 'SELL' | 'DEPOSIT' | 'WITHDRAWAL' | 'DIVIDEND';

export interface Holding {
  id: string;
  assetType: AssetType;
  symbol: string;
  name: string;
  quantity: number;
  averagePrice: number;
  purchaseDate: string;
  broker?: string;
  exchange?: string; // NSE, BSE, NASDAQ, NYSE, etc.
  notes?: string;
  manualPrice?: number; // User-entered price override
  lastPriceType?: 'live' | 'manual';
  currentPrice?: number;
  metalDetails?: {
    metalCategory: MetalCategory;
    weightGrams: number;
  };
  isDemo?: boolean;
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  assetType: AssetType;
  symbol: string;
  name: string;
  type: TransactionType;
  quantity: number;
  price: number;
  totalValue: number; // quantity * price or deposit amount
  brokerage?: number;
  realizedPnL?: number; // For SELL transactions: (sellPrice - avgCost) * quantity - brokerage
  costBasis?: number;
  cashBalanceAfter: number;
  exchange?: string;
  notes?: string;
}

export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  high52: number;
  low52: number;
  marketCap: string;
  volume: number;
  pe: number;
  eps?: number;
  beta?: number;
  sector?: string;
  exchange?: string;
  lastUpdated: string;
  isLive: boolean;
  isManual?: boolean;
  dataSource?: 'finnhub' | 'manual' | 'reference' | 'unverified';
}

export interface MutualFundScheme {
  schemeCode: number | string;
  schemeName: string;
}

export interface MutualFundQuote {
  schemeCode: string;
  schemeName: string;
  nav: number;
  previousNav: number;
  change: number;
  changePercent: number;
  date: string;
}

export interface MetalPrice {
  type: 'gold' | 'silver';
  pricePerGram: number;
  pricePer10g?: number;
  pricePerKg?: number;
  dayChange: number;
  dayChangePercent: number;
  monthlyChangePercent: number;
  yearlyChangePercent: number;
  lastUpdated: string;
}

export interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  source: string;
  time: string;
  url?: string;
  relatedSymbol?: string;
  sentiment: 'bullish' | 'neutral' | 'bearish';
  confidence: number;
}

export interface WatchlistItem {
  id: string;
  symbol: string;
  name: string;
  assetType: AssetType;
  addedAt: string;
}

export interface AllocationCategory {
  category: string;
  amount: number;
  percentage: number;
  color: string;
  profitLoss: number;
  returnPercent: number;
}

export interface SectorAllocation {
  sector: string;
  amount: number;
  percentage: number;
}

export interface ConcentrationRiskItem {
  symbol: string;
  name: string;
  weight: number;
  currentValue: number;
}

export interface PortfolioMetrics {
  totalNetWorth: number; // availableCash + total current market value of holdings
  availableCash: number;
  totalInvested: number; // remaining cost basis of active holdings
  currentValue: number; // market value of all non-cash holdings
  holdingsValue: number;
  unrealizedProfitLoss: number; // currentValue - totalInvested
  realizedProfitLoss: number; // sum of realized P&L from sold assets
  totalProfitLoss: number; // unrealizedProfitLoss + realizedProfitLoss
  totalReturnPercent: number;
  todayProfitLoss: number;
  todayReturnPercent: number;
  totalDeposited: number;
  totalWithdrawn: number;
  netCashFlow: number; // totalDeposited - totalWithdrawn
  assetAllocation: AllocationCategory[];
  sectorAllocation: SectorAllocation[];
  diversificationScore: number; // 0 - 100
  portfolioSentimentScore: number; // 0 - 100
  topGainer: { symbol: string; name: string; changePercent: number; profit: number } | null;
  topLoser: { symbol: string; name: string; changePercent: number; loss: number } | null;
  concentrationRisk: ConcentrationRiskItem[];
}

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl?: string;
  plan: 'PRO' | 'INSTITUTIONAL';
  isLoggedIn: boolean;
  uid?: string;
}

export interface AppSettings {
  finnhubKey: string;
  geminiKey: string;
  newsKey: string;
  currency: 'INR' | 'USD';
  theme: 'dark' | 'obsidian';
  isDemoMode: boolean;
  enableNotifications: boolean;
  autoRefreshInterval: number; // in seconds
  lastApiCheck?: {
    status: 'connected' | 'disconnected' | 'error' | 'unconfigured';
    message: string;
    timestamp: string;
  };
  lastGeminiCheck?: {
    status: 'connected' | 'disconnected' | 'error' | 'unconfigured';
    message: string;
    timestamp: string;
  };
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  read: boolean;
}
