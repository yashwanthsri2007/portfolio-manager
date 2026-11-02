import type { StockQuote } from '../types';

// Reference Indian & Global stock database for fallback when market is closed or API key is absent
const REFERENCE_STOCK_DATA: Record<string, Partial<StockQuote>> = {
  RELIANCE: {
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd.',
    price: 2985.40,
    previousClose: 2940.00,
    change: 45.40,
    changePercent: 1.54,
    high52: 3024.90,
    low52: 2220.30,
    marketCap: '₹20.2 Lakh Cr',
    volume: 8452100,
    pe: 28.4,
    eps: 105.10,
    beta: 0.92,
    sector: 'Energy & Retail',
    exchange: 'NSE',
  },
  TCS: {
    symbol: 'TCS',
    name: 'Tata Consultancy Services',
    price: 4210.00,
    previousClose: 4185.00,
    change: 25.00,
    changePercent: 0.60,
    high52: 4585.00,
    low52: 3312.00,
    marketCap: '₹15.2 Lakh Cr',
    volume: 2410000,
    pe: 31.5,
    eps: 133.65,
    beta: 0.78,
    sector: 'IT & Software',
    exchange: 'NSE',
  },
  HDFCBANK: {
    symbol: 'HDFCBANK',
    name: 'HDFC Bank Ltd.',
    price: 1720.80,
    previousClose: 1705.50,
    change: 15.30,
    changePercent: 0.90,
    high52: 1794.00,
    low52: 1363.50,
    marketCap: '₹13.1 Lakh Cr',
    volume: 12450000,
    pe: 19.8,
    eps: 86.90,
    beta: 1.05,
    sector: 'Banking & Financials',
    exchange: 'NSE',
  },
  INFY: {
    symbol: 'INFY',
    name: 'Infosys Limited',
    price: 1845.20,
    previousClose: 1860.00,
    change: -14.80,
    changePercent: -0.80,
    high52: 1978.00,
    low52: 1355.00,
    marketCap: '₹7.65 Lakh Cr',
    volume: 5214000,
    pe: 27.2,
    eps: 67.80,
    beta: 0.85,
    sector: 'IT & Software',
    exchange: 'NSE',
  },
  TATAMOTORS: {
    symbol: 'TATAMOTORS',
    name: 'Tata Motors Ltd.',
    price: 945.60,
    previousClose: 928.00,
    change: 17.60,
    changePercent: 1.90,
    high52: 1179.00,
    low52: 605.00,
    marketCap: '₹3.48 Lakh Cr',
    volume: 9840000,
    pe: 15.6,
    eps: 60.60,
    beta: 1.35,
    sector: 'Automobile',
    exchange: 'NSE',
  },
  ICICIBANK: {
    symbol: 'ICICIBANK',
    name: 'ICICI Bank Ltd.',
    price: 1240.50,
    previousClose: 1228.00,
    change: 12.50,
    changePercent: 1.02,
    high52: 1257.00,
    low52: 898.00,
    marketCap: '₹8.72 Lakh Cr',
    volume: 7850000,
    pe: 18.2,
    eps: 68.15,
    beta: 1.10,
    sector: 'Banking & Financials',
    exchange: 'NSE',
  },
  AAPL: {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: 224.50,
    previousClose: 221.80,
    change: 2.70,
    changePercent: 1.22,
    high52: 237.23,
    low52: 164.08,
    marketCap: '$3.45T',
    volume: 48500000,
    pe: 34.1,
    eps: 6.58,
    beta: 1.02,
    sector: 'Technology',
    exchange: 'NASDAQ',
  },
  NVDA: {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    price: 128.40,
    previousClose: 124.50,
    change: 3.90,
    changePercent: 3.13,
    high52: 140.76,
    low52: 45.90,
    marketCap: '$3.15T',
    volume: 95400000,
    pe: 68.4,
    eps: 1.88,
    beta: 1.68,
    sector: 'Semiconductors',
    exchange: 'NASDAQ',
  },
  MSFT: {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    price: 432.80,
    previousClose: 429.10,
    change: 3.70,
    changePercent: 0.86,
    high52: 468.35,
    low52: 366.50,
    marketCap: '$3.22T',
    volume: 21500000,
    pe: 36.2,
    eps: 11.95,
    beta: 0.91,
    sector: 'Technology',
    exchange: 'NASDAQ',
  },
  GOOGL: {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    price: 168.90,
    previousClose: 166.50,
    change: 2.40,
    changePercent: 1.44,
    high52: 191.75,
    low52: 129.40,
    marketCap: '$2.11T',
    volume: 28400000,
    pe: 24.5,
    eps: 6.89,
    beta: 1.05,
    sector: 'Communication Services',
    exchange: 'NASDAQ',
  }
};

/**
 * Retrieve active Finnhub API Key from override, localStorage settings, or environment variable.
 */
export function getStoredFinnhubKey(overrideKey?: string): string {
  if (overrideKey && overrideKey.trim()) {
    return overrideKey.trim();
  }
  try {
    const stored = localStorage.getItem('portfolio_manager_settings');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.finnhubKey && parsed.finnhubKey.trim()) {
        return parsed.finnhubKey.trim();
      }
    }
  } catch {}
  return import.meta.env.VITE_FINNHUB_API_KEY || '';
}

/**
 * Test Finnhub API connection using proxy or direct token
 */
export async function testFinnhubConnection(userApiKey?: string): Promise<{
  success: boolean;
  message: string;
  latency?: number;
}> {
  try {
    const token = getStoredFinnhubKey(userApiKey);
    const headers: Record<string, string> = {};
    if (token) {
      headers['x-finnhub-token'] = token;
    }

    // Try through Vite proxy first
    const res = await fetch('/api/finnhub/test-connection', { headers });
    if (res.ok) {
      return await res.json();
    }

    // If proxy returned an error message, extract it
    try {
      const errData = await res.json();
      return { success: false, message: errData.message || `HTTP ${res.status}` };
    } catch {
      // Fallback: direct test against Finnhub if running without proxy
      if (token) {
        const start = Date.now();
        const directRes = await fetch(`https://finnhub.io/api/v1/quote?symbol=AAPL&token=${token}`);
        const latency = Date.now() - start;
        if (directRes.ok) {
          const d = await directRes.json();
          if (d && typeof d.c === 'number' && d.c > 0) {
            return {
              success: true,
              message: `Connected directly to Finnhub (${latency}ms). Live AAPL: $${d.c}`,
              latency
            };
          }
        }
      }
      return { success: false, message: 'Could not connect to Finnhub. Check network or API key.' };
    }
  } catch (err: any) {
    return { success: false, message: err.message || 'Connection failed' };
  }
}

/**
 * Fetch a single stock quote from Finnhub with fallback for Indian/unsupported stocks
 */
export async function fetchStockQuote(
  symbol: string,
  userApiKey?: string,
  manualPriceOverride?: number
): Promise<StockQuote> {
  const upperSymbol = symbol.toUpperCase().trim();
  const apiKey = getStoredFinnhubKey(userApiKey);

  // 1. If user provided a manual price override, respect it immediately
  if (manualPriceOverride && manualPriceOverride > 0) {
    const ref = REFERENCE_STOCK_DATA[upperSymbol];
    const prevClose = ref?.previousClose || manualPriceOverride;
    const diff = manualPriceOverride - prevClose;
    return {
      symbol: upperSymbol,
      name: ref?.name || upperSymbol,
      price: manualPriceOverride,
      previousClose: prevClose,
      change: parseFloat(diff.toFixed(2)),
      changePercent: prevClose > 0 ? parseFloat(((diff / prevClose) * 100).toFixed(2)) : 0,
      high52: ref?.high52 || manualPriceOverride * 1.2,
      low52: ref?.low52 || manualPriceOverride * 0.8,
      marketCap: ref?.marketCap || 'Manual Entry',
      volume: ref?.volume || 0,
      pe: ref?.pe || 20,
      sector: ref?.sector || 'Custom Asset',
      exchange: ref?.exchange || 'MANUAL',
      lastUpdated: new Date().toISOString(),
      isLive: false,
      isManual: true,
      dataSource: 'manual'
    };
  }

  // 2. Try fetching from Finnhub (via Proxy or direct)
  const querySymbols = [upperSymbol];
  // If likely Indian stock and no dot extension, also try .NS
  if (!upperSymbol.includes('.') && REFERENCE_STOCK_DATA[upperSymbol]?.exchange === 'NSE') {
    querySymbols.push(`${upperSymbol}.NS`);
  }

  for (const qSym of querySymbols) {
    try {
      let quoteData: any = null;
      let profileData: any = null;

      // Try via Vite dev server proxy
      const headers: Record<string, string> = {};
      if (apiKey) headers['x-finnhub-token'] = apiKey;

      const proxyUrl = `/api/finnhub/quote?symbol=${encodeURIComponent(qSym)}`;
      let res = await fetch(proxyUrl, { headers });

      if (res.ok) {
        quoteData = await res.json();
      } else if (apiKey) {
        // Direct call fallback
        const directUrl = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(qSym)}&token=${apiKey}`;
        res = await fetch(directUrl);
        if (res.ok) quoteData = await res.json();
      }

      if (quoteData && typeof quoteData.c === 'number' && quoteData.c > 0) {
        // Valid live quote retrieved from Finnhub!
        try {
          const profRes = await fetch(`/api/finnhub/stock/profile2?symbol=${encodeURIComponent(qSym)}`, { headers });
          if (profRes.ok) profileData = await profRes.json();
        } catch {
          // Profile is non-critical
        }

        const price = quoteData.c;
        const prevClose = quoteData.pc || price;
        const change = quoteData.d ?? (price - prevClose);
        const changePercent = quoteData.dp ?? (prevClose > 0 ? ((change / prevClose) * 100) : 0);

        return {
          symbol: upperSymbol,
          name: profileData?.name || REFERENCE_STOCK_DATA[upperSymbol]?.name || upperSymbol,
          price: parseFloat(price.toFixed(2)),
          previousClose: parseFloat(prevClose.toFixed(2)),
          change: parseFloat(change.toFixed(2)),
          changePercent: parseFloat(changePercent.toFixed(2)),
          high52: quoteData.h || price * 1.15,
          low52: quoteData.l || price * 0.85,
          marketCap: profileData?.marketCapitalization ? `$${(profileData.marketCapitalization / 1000).toFixed(2)}B` : 'N/A',
          volume: quoteData.v || 0,
          pe: profileData?.peRatio || 25,
          sector: profileData?.finnhubIndustry || REFERENCE_STOCK_DATA[upperSymbol]?.sector || 'Equity',
          exchange: profileData?.exchange || (upperSymbol.endsWith('.NS') ? 'NSE' : 'US'),
          lastUpdated: new Date().toISOString(),
          isLive: true,
          isManual: false,
          dataSource: 'finnhub'
        };
      }
    } catch (err) {
      console.warn(`Finnhub query error for ${qSym}:`, err);
    }
  }

  // 3. Fallback: Reference database for recognized tickers
  if (REFERENCE_STOCK_DATA[upperSymbol]) {
    const ref = REFERENCE_STOCK_DATA[upperSymbol];
    return {
      symbol: upperSymbol,
      name: ref.name || upperSymbol,
      price: ref.price || 100,
      previousClose: ref.previousClose || 100,
      change: ref.change || 0,
      changePercent: ref.changePercent || 0,
      high52: ref.high52 || 120,
      low52: ref.low52 || 80,
      marketCap: ref.marketCap || 'N/A',
      volume: ref.volume || 1000000,
      pe: ref.pe || 20,
      sector: ref.sector || 'Equity',
      exchange: ref.exchange || 'NSE/BSE',
      lastUpdated: new Date().toISOString(),
      isLive: false,
      isManual: false,
      dataSource: 'reference'
    };
  }

  // 4. Unknown ticker without live market quote or reference record
  const fallbackPrice = manualPriceOverride || 0;
  return {
    symbol: upperSymbol,
    name: upperSymbol,
    price: fallbackPrice,
    previousClose: fallbackPrice,
    change: 0,
    changePercent: 0,
    high52: fallbackPrice,
    low52: fallbackPrice,
    marketCap: 'N/A',
    volume: 0,
    pe: 0,
    sector: 'Custom Holding',
    exchange: 'MANUAL',
    lastUpdated: new Date().toISOString(),
    isLive: false,
    isManual: true,
    dataSource: 'unverified'
  };
}

/**
 * Batch quote fetcher
 */
export async function fetchStockQuotesBatch(
  symbols: string[],
  apiKey?: string,
  manualPrices?: Record<string, number>
): Promise<Record<string, StockQuote>> {
  const results: Record<string, StockQuote> = {};
  await Promise.all(
    symbols.map(async (sym) => {
      results[sym] = await fetchStockQuote(sym, apiKey, manualPrices?.[sym]);
    })
  );
  return results;
}
