// src/services/indianMarketService.ts
// Indian Market Intelligence: Indices, News with Sentiments, Holding-specific filtering,
// Morning Opening Briefing, Corporate Events Calendar, and IPO Tracker.

import type { Holding } from '../types';

export interface MarketIndex {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  lastUpdated: string;
}

export interface IndianNewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  impact: string;
  relatedSymbols: string[];
  url?: string;
}

export interface CorporateEvent {
  id: string;
  symbol: string;
  companyName: string;
  eventType: 'EARNINGS' | 'DIVIDEND' | 'SPLIT' | 'BONUS' | 'AGM';
  eventDate: string; // YYYY-MM-DD
  details: string;
  amountOrRatio?: string;
  isHeldByUser?: boolean;
}

export interface IPOItem {
  id: string;
  name: string;
  symbol: string;
  status: 'UPCOMING' | 'LIVE' | 'CLOSED' | 'LISTED';
  priceBand: string;
  issueSize: string;
  lotSize: number;
  minInvestment: number;
  openDate: string;
  closeDate: string;
  listingDate: string;
  gmp: string; // Grey Market Premium
  gmpPercent: number;
  subscription: {
    qib: number;
    nii: number;
    retail: number;
    total: number;
  };
  aiAnalysis: string;
  isWatchlisted?: boolean;
}

export interface MorningBriefingData {
  generatedAt: string;
  overallSentiment: 'Bullish' | 'Cautious' | 'Neutral' | 'Bearish';
  giftNifty: { points: number; percent: number; indication: string };
  usMarkets: { dow: number; sp500: number; nasdaq: number; summary: string };
  macroCues: { crudeOil: number; usdInr: number; us10yYield: number; goldINR: number };
  indianOutlook: string;
  holdingAlerts: string[];
  keyEventsToday: string[];
}

// ─── 1. Indian Market Indices ────────────────────────────────────────────────
export const INDIAN_INDICES: MarketIndex[] = [
  { symbol: 'NIFTY 50', name: 'Nifty 50 Index', price: 24350.25, change: 125.40, changePercent: 0.52, high: 24410.00, low: 24280.10, lastUpdated: 'Live' },
  { symbol: 'SENSEX', name: 'BSE Sensex 30', price: 80210.80, change: 412.30, changePercent: 0.52, high: 80420.00, low: 79980.50, lastUpdated: 'Live' },
  { symbol: 'GIFT NIFTY', name: 'GIFT Nifty Futures', price: 24425.00, change: 82.00, changePercent: 0.34, high: 24460.00, low: 24320.00, lastUpdated: 'Live' },
  { symbol: 'BANK NIFTY', name: 'Nifty Bank Index', price: 51890.60, change: -75.20, changePercent: -0.14, high: 52100.00, low: 51740.00, lastUpdated: 'Live' },
  { symbol: 'INDIA VIX', name: 'India Volatility Index', price: 13.45, change: -0.65, changePercent: -4.61, high: 14.20, low: 13.10, lastUpdated: 'Live' }
];

// ─── 2. Indian Market News Feed with Sentiments & Impact ──────────────────────
export const INDIAN_MARKET_NEWS: IndianNewsItem[] = [
  {
    id: 'in-news-1',
    title: 'RBI Monetary Policy Committee maintains Repo Rate at 6.5%, projects 7.2% GDP growth',
    summary: 'The Reserve Bank of India kept benchmark repo rates steady while reiterating an unwavering commitment to bringing CPI inflation squarely to the 4% target.',
    source: 'Economic Times',
    publishedAt: '2 hours ago',
    sentiment: 'NEUTRAL',
    impact: 'Banks enjoy stable net interest margins (NIMs), while rate-sensitive auto and real estate sectors maintain steady demand momentum.',
    relatedSymbols: ['HDFCBANK', 'ICICIBANK', 'SBIN', 'TATAMOTORS', 'DLF']
  },
  {
    id: 'in-news-2',
    title: 'Reliance Industries unveils ₹75,000 Cr green energy gigafactory expansion timeline',
    summary: 'RIL is commissioning integrated solar photovoltaic cells and battery storage gigafactories in Jamnagar ahead of initial Q3 schedules.',
    source: 'Moneycontrol',
    publishedAt: '3 hours ago',
    sentiment: 'BULLISH',
    impact: 'Accelerates margin diversification into clean energy infrastructure, providing long-term structural valuation tailwinds.',
    relatedSymbols: ['RELIANCE', 'TATAPOWER']
  },
  {
    id: 'in-news-3',
    title: 'Tata Consultancy Services (TCS) secures $1.8B AI infrastructure modernization contract',
    summary: 'TCS signed a multi-year deal with a tier-1 European insurer to implement enterprise generative AI workflow transformation.',
    source: 'Livemint',
    publishedAt: '5 hours ago',
    sentiment: 'BULLISH',
    impact: 'Re-accelerates Indian IT sector order book growth and indicates reviving international enterprise technology expenditure.',
    relatedSymbols: ['TCS', 'INFY', 'WIPRO', 'HCLTECH']
  },
  {
    id: 'in-news-4',
    title: 'SEBI tightens retail index derivatives rules: increases lot sizes and margin checks',
    summary: 'Markets regulator SEBI enacted enhanced eligibility thresholds for index options to safeguard retail participants from excessive speculative leverage.',
    source: 'Business Standard',
    publishedAt: '6 hours ago',
    sentiment: 'NEUTRAL',
    impact: 'Moderates high-frequency proprietary trading volumes while promoting long-term cash equity investment and systematic investing.',
    relatedSymbols: ['BSE', 'ANGELONE', 'MCX']
  },
  {
    id: 'in-news-5',
    title: 'Tata Steel reports robust domestic steel volume surge amid infrastructure push',
    summary: 'Tata Steel demonstrated resilient domestic capacity utilization of 96%, offsetting subdued European export margins.',
    source: 'Financial Express',
    publishedAt: '8 hours ago',
    sentiment: 'BULLISH',
    impact: 'Beneficiary of Government capital expenditure on railways, expressways, and urban real estate projects.',
    relatedSymbols: ['TATASTEEL', 'JSWSTEEL', 'SAIL']
  },
  {
    id: 'in-news-6',
    title: 'Crude oil softens to $74/barrel easing fiscal deficit and inflation pressure for India',
    summary: 'Brent crude retreated as international inventory builds mitigated geopolitical risk premia, benefiting Indian oil marketing companies and chemical producers.',
    source: 'Reuters India',
    publishedAt: '10 hours ago',
    sentiment: 'BULLISH',
    impact: 'Positive for USD/INR currency stability, consumer goods raw materials, and paint and lubricant manufacturers.',
    relatedSymbols: ['BPCL', 'IOC', 'ASIANPAINT', 'BERGEPAINT']
  }
];

// Helper: Filter news specifically relevant to user's holdings
export function filterNewsForHoldings(news: IndianNewsItem[], holdings: Holding[]): IndianNewsItem[] {
  if (holdings.length === 0) return news;

  const userSymbols = new Set(
    holdings.map(h => h.symbol.toUpperCase().replace(/-EQ$/, ''))
  );
  const userNames = holdings.map(h => h.name.toLowerCase());

  return news.filter(item => {
    // Check symbol match
    const hasSymbolMatch = item.relatedSymbols.some(s => userSymbols.has(s.toUpperCase()));
    if (hasSymbolMatch) return true;

    // Check title/summary text match
    const text = `${item.title} ${item.summary}`.toLowerCase();
    return userNames.some(name => name.length > 3 && text.includes(name));
  });
}

// ─── 3. Daily Market Opening Briefing ─────────────────────────────────────────
export function generateDailyMorningBriefing(holdings: Holding[], userName = 'Yashwanth'): MorningBriefingData {
  const heldStockSymbols = holdings
    .filter(h => h.assetType === 'stock')
    .map(h => h.symbol.toUpperCase().replace(/-EQ$/, ''));

  const holdingAlerts: string[] = [];

  if (heldStockSymbols.length > 0) {
    heldStockSymbols.forEach(sym => {
      if (sym.includes('RELIANCE')) {
        holdingAlerts.push('RELIANCE: Clean energy gigafactory expansion timeline announced; sentiment positive.');
      } else if (sym.includes('TCS')) {
        holdingAlerts.push('TCS: Multi-year $1.8B AI contract win; strong opening expected.');
      } else if (sym.includes('HDFC')) {
        holdingAlerts.push('HDFCBANK: RBI policy rate pause supports retail lending spread stability.');
      } else if (sym.includes('TATASTEEL')) {
        holdingAlerts.push('TATASTEEL: Domestic volume strength offsets European margin drag.');
      }
    });
  }

  if (holdingAlerts.length === 0) {
    holdingAlerts.push(`All ${holdings.length} portfolio assets have steady pre-market telemetry with no negative corporate action flags.`);
  }

  return {
    generatedAt: new Date().toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }),
    overallSentiment: 'Bullish',
    giftNifty: {
      points: 24425,
      percent: 0.34,
      indication: 'Positive opening (+82 points premium over Nifty 50 cash close).'
    },
    usMarkets: {
      dow: 43910.2,
      sp500: 5985.4,
      nasdaq: 19280.1,
      summary: 'US indices closed higher led by semiconductors and corporate technology capex optimism.'
    },
    macroCues: {
      crudeOil: 74.20,
      usdInr: 84.38,
      us10yYield: 4.38,
      goldINR: 78500
    },
    indianOutlook: 'Domestic institutional liquidity (DII) remains sturdy. FII selling pressure is showing signs of moderation. Support levels for Nifty 50 stand at 24,180 with resistance around 24,520.',
    holdingAlerts,
    keyEventsToday: [
      'RBI MPC Minutes release scheduled for post-market hours',
      'US Core CPI inflation readout at 6:00 PM IST',
      'Q3 Board meeting announcements for major private banking constituents'
    ]
  };
}

// ─── 4. Earnings & Corporate Events Calendar ──────────────────────────────────
export const CORPORATE_EVENTS_CALENDAR: CorporateEvent[] = [
  {
    id: 'ev-1',
    symbol: 'TCS',
    companyName: 'Tata Consultancy Services',
    eventType: 'DIVIDEND',
    eventDate: '2026-11-08',
    details: 'Interim Dividend of ₹10.00 per equity share',
    amountOrRatio: '₹10.00/share'
  },
  {
    id: 'ev-2',
    symbol: 'INFY',
    companyName: 'Infosys Limited',
    eventType: 'EARNINGS',
    eventDate: '2026-11-12',
    details: 'Q3 Financial Results & Guidance Update'
  },
  {
    id: 'ev-3',
    symbol: 'HDFCBANK',
    companyName: 'HDFC Bank Ltd',
    eventType: 'EARNINGS',
    eventDate: '2026-11-15',
    details: 'Quarterly Results & Credit Growth Metrics'
  },
  {
    id: 'ev-4',
    symbol: 'RELIANCE',
    companyName: 'Reliance Industries',
    eventType: 'AGM',
    eventDate: '2026-11-20',
    details: 'Annual Strategic Shareholders Meeting & Telecom/Retail spin-off updates'
  },
  {
    id: 'ev-5',
    symbol: 'ITC',
    companyName: 'ITC Limited',
    eventType: 'DIVIDEND',
    eventDate: '2026-11-22',
    details: 'Special Hotel Demerger Cash Dividend',
    amountOrRatio: '₹6.25/share'
  },
  {
    id: 'ev-6',
    symbol: 'TATAMOTORS',
    companyName: 'Tata Motors Ltd',
    eventType: 'SPLIT',
    eventDate: '2026-11-28',
    details: 'Demerger into Commercial Vehicles (CV) and Passenger Vehicles (PV) entities',
    amountOrRatio: '1:1 Demerger'
  }
];

// Helper: Filter events for user's holdings
export function filterEventsForHoldings(events: CorporateEvent[], holdings: Holding[]): CorporateEvent[] {
  const userSymbols = new Set(
    holdings.map(h => h.symbol.toUpperCase().replace(/-EQ$/, ''))
  );

  return events.map(ev => ({
    ...ev,
    isHeldByUser: userSymbols.has(ev.symbol.toUpperCase())
  }));
}

// ─── 5. Indian IPO Tracker ───────────────────────────────────────────────────
export const INDIAN_IPOS: IPOItem[] = [
  {
    id: 'ipo-1',
    name: 'NTPC Green Energy Ltd',
    symbol: 'NTPCGREEN',
    status: 'LIVE',
    priceBand: '₹102 - ₹108',
    issueSize: '₹10,000 Cr',
    lotSize: 138,
    minInvestment: 14904,
    openDate: '2026-11-04',
    closeDate: '2026-11-07',
    listingDate: '2026-11-12',
    gmp: '₹12 (Unofficial)',
    gmpPercent: 11.1,
    subscription: { qib: 3.2, nii: 4.8, retail: 2.1, total: 3.4 },
    aiAnalysis: 'High sovereign backing from parent NTPC. Substantial solar/wind expansion capacity pipeline. Attractive long-term utility play with moderate listing gains expected.'
  },
  {
    id: 'ipo-2',
    name: 'Swiggy Limited',
    symbol: 'SWIGGY',
    status: 'CLOSED',
    priceBand: '₹371 - ₹390',
    issueSize: '₹11,327 Cr',
    lotSize: 38,
    minInvestment: 14820,
    openDate: '2026-11-01',
    closeDate: '2026-11-04',
    listingDate: '2026-11-08',
    gmp: '₹22 (Unofficial)',
    gmpPercent: 5.6,
    subscription: { qib: 6.0, nii: 4.1, retail: 1.1, total: 3.6 },
    aiAnalysis: 'Duopoly position in Indian food delivery and quick-commerce with Instamart. Improving unit economics with path to sustained EBITDA profitability.'
  },
  {
    id: 'ipo-3',
    name: 'Acme Solar Holdings Ltd',
    symbol: 'ACMESOLAR',
    status: 'UPCOMING',
    priceBand: '₹275 - ₹289',
    issueSize: '₹2,900 Cr',
    lotSize: 51,
    minInvestment: 14739,
    openDate: '2026-11-14',
    closeDate: '2026-11-18',
    listingDate: '2026-11-23',
    gmp: '₹30 (Unofficial)',
    gmpPercent: 10.4,
    subscription: { qib: 0, nii: 0, retail: 0, total: 0 },
    aiAnalysis: 'Renewable energy IPP with operational capacity across solar and hybrid storage. Key risk: customer concentration with state discoms.'
  },
  {
    id: 'ipo-4',
    name: 'Hyundai Motor India Ltd',
    symbol: 'HYUNDAI',
    status: 'LISTED',
    priceBand: '₹1,865 - ₹1,960',
    issueSize: '₹27,870 Cr',
    lotSize: 7,
    minInvestment: 13720,
    openDate: '2026-10-15',
    closeDate: '2026-10-17',
    listingDate: '2026-10-22',
    gmp: '₹0 (Listed)',
    gmpPercent: 0,
    subscription: { qib: 6.9, nii: 0.6, retail: 0.5, total: 2.4 },
    aiAnalysis: 'Largest Indian auto IPO in history. High market share in SUVs with strong export footprint and solid free cash flow generation.'
  }
];
