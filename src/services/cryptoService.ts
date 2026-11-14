// src/services/cryptoService.ts
// Cryptocurrency market intelligence, CoinGecko integration & holding management

export interface CryptoMarketItem {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency?: number;
  price_change_percentage_30d_in_currency?: number;
  high_24h: number;
  low_24h: number;
  sparkline_in_7d?: {
    price: number[];
  };
}

export interface CryptoHoldingForm {
  coinId: string;
  symbol: string;
  name: string;
  quantity: number;
  buyPriceINR: number;
  purchaseDate: string;
  walletExchange: string;
  notes?: string;
}

const STORAGE_KEY_CRYPTO_CACHE = 'pm_crypto_markets_cache';
const STORAGE_KEY_CRYPTO_WATCHLIST = 'pm_crypto_watchlist';

// Default / offline fallback rates (INR)
export const FALLBACK_CRYPTO_MARKETS: CryptoMarketItem[] = [
  {
    id: 'bitcoin',
    symbol: 'btc',
    name: 'Bitcoin',
    current_price: 8250000,
    market_cap: 162000000000000,
    total_volume: 3200000000000,
    price_change_percentage_24h: 1.85,
    price_change_percentage_7d_in_currency: 4.2,
    price_change_percentage_30d_in_currency: 12.5,
    high_24h: 8350000,
    low_24h: 8120000,
    sparkline_in_7d: { price: [8000000, 8050000, 8120000, 8180000, 8250000] }
  },
  {
    id: 'ethereum',
    symbol: 'eth',
    name: 'Ethereum',
    current_price: 285000,
    market_cap: 34200000000000,
    total_volume: 1450000000000,
    price_change_percentage_24h: -0.62,
    price_change_percentage_7d_in_currency: 2.1,
    price_change_percentage_30d_in_currency: 8.4,
    high_24h: 292000,
    low_24h: 281000,
    sparkline_in_7d: { price: [278000, 282000, 280000, 288000, 285000] }
  },
  {
    id: 'solana',
    symbol: 'sol',
    name: 'Solana',
    current_price: 18200,
    market_cap: 8600000000000,
    total_volume: 520000000000,
    price_change_percentage_24h: 5.4,
    price_change_percentage_7d_in_currency: 14.8,
    price_change_percentage_30d_in_currency: 28.2,
    high_24h: 18900,
    low_24h: 17200,
    sparkline_in_7d: { price: [15800, 16400, 17100, 17800, 18200] }
  },
  {
    id: 'ripple',
    symbol: 'xrp',
    name: 'XRP',
    current_price: 195,
    market_cap: 11200000000000,
    total_volume: 890000000000,
    price_change_percentage_24h: 3.1,
    price_change_percentage_7d_in_currency: 8.9,
    price_change_percentage_30d_in_currency: 45.0,
    high_24h: 202,
    low_24h: 188,
    sparkline_in_7d: { price: [178, 182, 189, 192, 195] }
  },
  {
    id: 'binancecoin',
    symbol: 'bnb',
    name: 'BNB',
    current_price: 56500,
    market_cap: 8200000000000,
    total_volume: 210000000000,
    price_change_percentage_24h: 0.45,
    price_change_percentage_7d_in_currency: 1.2,
    price_change_percentage_30d_in_currency: 5.6,
    high_24h: 57200,
    low_24h: 55800,
    sparkline_in_7d: { price: [55800, 56000, 56200, 56800, 56500] }
  },
  {
    id: 'dogecoin',
    symbol: 'doge',
    name: 'Dogecoin',
    current_price: 24.5,
    market_cap: 3600000000000,
    total_volume: 450000000000,
    price_change_percentage_24h: -1.2,
    price_change_percentage_7d_in_currency: -3.5,
    price_change_percentage_30d_in_currency: 18.2,
    high_24h: 25.8,
    low_24h: 23.9,
    sparkline_in_7d: { price: [25.4, 25.1, 24.8, 24.9, 24.5] }
  },
  {
    id: 'cardano',
    symbol: 'ada',
    name: 'Cardano',
    current_price: 68.2,
    market_cap: 2450000000000,
    total_volume: 180000000000,
    price_change_percentage_24h: 2.3,
    price_change_percentage_7d_in_currency: 6.7,
    price_change_percentage_30d_in_currency: 14.5,
    high_24h: 70.1,
    low_24h: 66.4,
    sparkline_in_7d: { price: [64.0, 65.5, 66.2, 67.8, 68.2] }
  }
];

// Fetch crypto market list
export async function fetchCryptoMarkets(vsCurrency = 'inr'): Promise<{
  data: CryptoMarketItem[];
  isLive: boolean;
}> {
  try {
    const res = await fetch(`/api/crypto/markets?vs_currency=${vsCurrency}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        localStorage.setItem(STORAGE_KEY_CRYPTO_CACHE, JSON.stringify(json.data));
        return { data: json.data, isLive: json.source === 'coingecko_live' };
      }
    }
  } catch {}

  // Check local cache
  try {
    const cached = localStorage.getItem(STORAGE_KEY_CRYPTO_CACHE);
    if (cached) {
      return { data: JSON.parse(cached), isLive: false };
    }
  } catch {}

  return { data: FALLBACK_CRYPTO_MARKETS, isLive: false };
}

// Watchlist storage
export function loadCryptoWatchlist(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CRYPTO_WATCHLIST);
    return raw ? JSON.parse(raw) : ['bitcoin', 'ethereum', 'solana'];
  } catch {
    return ['bitcoin', 'ethereum', 'solana'];
  }
}

export function saveCryptoWatchlist(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CRYPTO_WATCHLIST, JSON.stringify(ids));
  } catch {}
}
