import type { Holding, WatchlistItem } from '../types';

// Default initial state is completely empty
export const INITIAL_HOLDINGS: Holding[] = [];

// Optional sample portfolio that can be loaded on-demand from Settings
export const SAMPLE_TEST_HOLDINGS: Holding[] = [
  {
    id: 'sample-stock-1',
    assetType: 'stock',
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd.',
    quantity: 45,
    averagePrice: 2450.00,
    purchaseDate: '2025-04-15',
    broker: 'Zerodha',
    exchange: 'NSE',
    notes: 'Long-term core holding in energy & retail'
  },
  {
    id: 'sample-stock-2',
    assetType: 'stock',
    symbol: 'INFY',
    name: 'Infosys Limited',
    quantity: 120,
    averagePrice: 1520.50,
    purchaseDate: '2025-06-10',
    broker: 'Groww',
    exchange: 'NSE',
    notes: 'IT Sector allocation'
  },
  {
    id: 'sample-stock-3',
    assetType: 'stock',
    symbol: 'HDFCBANK',
    name: 'HDFC Bank Ltd.',
    quantity: 80,
    averagePrice: 1610.00,
    purchaseDate: '2025-03-01',
    broker: 'Zerodha',
    exchange: 'NSE',
    notes: 'Banking leader'
  },
  {
    id: 'sample-mf-1',
    assetType: 'mutual_fund',
    symbol: '122639',
    name: 'Parag Parikh Flexi Cap Fund - Direct Growth',
    quantity: 3500.45,
    averagePrice: 62.40,
    purchaseDate: '2024-11-05',
    broker: 'Direct',
    notes: 'Global & Indian equity SIP'
  },
  {
    id: 'sample-gold-1',
    assetType: 'gold',
    symbol: 'GOLD-24K-BAR',
    name: 'Physical Gold 24K Bar',
    quantity: 1,
    averagePrice: 68500,
    purchaseDate: '2025-02-14',
    notes: 'Stored in vault',
    metalDetails: {
      metalCategory: 'Bars',
      weightGrams: 30
    }
  }
];

export const INITIAL_WATCHLIST: WatchlistItem[] = [
  {
    id: 'w-1',
    symbol: 'TCS',
    name: 'Tata Consultancy Services',
    assetType: 'stock',
    addedAt: '2026-01-10'
  },
  {
    id: 'w-2',
    symbol: 'ICICIBANK',
    name: 'ICICI Bank Ltd.',
    assetType: 'stock',
    addedAt: '2026-01-15'
  },
  {
    id: 'w-3',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    assetType: 'stock',
    addedAt: '2026-02-01'
  },
  {
    id: 'w-4',
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    assetType: 'stock',
    addedAt: '2026-02-05'
  }
];
