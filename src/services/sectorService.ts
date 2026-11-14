// src/services/sectorService.ts
// Sector Heatmap Data Service

export interface SectorData {
  id: string;
  name: string;
  shortName: string;
  indexValue: number;
  change1D: number; // %
  change1W: number;
  change1M: number;
  change3M: number;
  topGainer: string;
  topLoser: string;
  marketCap: number; // ₹ Lakh Cr (relative size for tile sizing)
}

const MOCK_SECTORS: SectorData[] = [
  {
    id: 'nifty-bank',
    name: 'Nifty Bank',
    shortName: 'Bank',
    indexValue: 48230,
    change1D: -1.42,
    change1W: -2.18,
    change1M: -4.5,
    change3M: 1.2,
    topGainer: 'HDFCBANK',
    topLoser: 'AXISBANK',
    marketCap: 320,
  },
  {
    id: 'nifty-it',
    name: 'Nifty IT',
    shortName: 'IT',
    indexValue: 42180,
    change1D: 1.85,
    change1W: 3.42,
    change1M: 6.8,
    change3M: 12.4,
    topGainer: 'INFY',
    topLoser: 'WIPRO',
    marketCap: 290,
  },
  {
    id: 'nifty-auto',
    name: 'Nifty Auto',
    shortName: 'Auto',
    indexValue: 23450,
    change1D: 0.78,
    change1W: 1.95,
    change1M: 3.2,
    change3M: 8.5,
    topGainer: 'MARUTI',
    topLoser: 'HEROMOTOCO',
    marketCap: 180,
  },
  {
    id: 'nifty-pharma',
    name: 'Nifty Pharma',
    shortName: 'Pharma',
    indexValue: 21780,
    change1D: 2.14,
    change1W: 4.1,
    change1M: 7.4,
    change3M: 15.6,
    topGainer: 'SUNPHARMA',
    topLoser: 'CIPLA',
    marketCap: 165,
  },
  {
    id: 'nifty-fmcg',
    name: 'Nifty FMCG',
    shortName: 'FMCG',
    indexValue: 56320,
    change1D: -0.32,
    change1W: -0.85,
    change1M: -1.8,
    change3M: 2.1,
    topGainer: 'NESTLEIND',
    topLoser: 'HINDUNILVR',
    marketCap: 155,
  },
  {
    id: 'nifty-metal',
    name: 'Nifty Metal',
    shortName: 'Metal',
    indexValue: 9820,
    change1D: -2.35,
    change1W: -5.1,
    change1M: -8.2,
    change3M: -3.4,
    topGainer: 'HINDZINC',
    topLoser: 'JSWSTEEL',
    marketCap: 110,
  },
  {
    id: 'nifty-energy',
    name: 'Nifty Energy',
    shortName: 'Energy',
    indexValue: 38750,
    change1D: -1.82,
    change1W: -3.6,
    change1M: -5.1,
    change3M: -2.8,
    topGainer: 'POWERGRID',
    topLoser: 'RELIANCE',
    marketCap: 250,
  },
  {
    id: 'nifty-realty',
    name: 'Nifty Realty',
    shortName: 'Realty',
    indexValue: 1125,
    change1D: 3.42,
    change1W: 5.8,
    change1M: 9.2,
    change3M: 18.5,
    topGainer: 'DLF',
    topLoser: 'OBEROIRLTY',
    marketCap: 75,
  },
  {
    id: 'nifty-psubank',
    name: 'Nifty PSU Bank',
    shortName: 'PSU Bank',
    indexValue: 6480,
    change1D: -2.1,
    change1W: -4.5,
    change1M: -7.8,
    change3M: 2.3,
    topGainer: 'SBIN',
    topLoser: 'BANKBARODA',
    marketCap: 95,
  },
  {
    id: 'nifty-infra',
    name: 'Nifty Infra',
    shortName: 'Infra',
    indexValue: 8940,
    change1D: 0.42,
    change1W: 1.1,
    change1M: 2.4,
    change3M: 6.8,
    topGainer: 'L&T',
    topLoser: 'IRCON',
    marketCap: 120,
  },
  {
    id: 'nifty-media',
    name: 'Nifty Media',
    shortName: 'Media',
    indexValue: 2340,
    change1D: -0.95,
    change1W: -2.3,
    change1M: -4.1,
    change3M: -8.5,
    topGainer: 'ZEETELE',
    topLoser: 'PVRINOX',
    marketCap: 35,
  },
  {
    id: 'nifty-finserv',
    name: 'Nifty Financial Services',
    shortName: 'FinServ',
    indexValue: 23850,
    change1D: -1.15,
    change1W: -2.4,
    change1M: -3.8,
    change3M: 0.9,
    topGainer: 'BAJFINANCE',
    topLoser: 'HDFCLIFE',
    marketCap: 275,
  },
  {
    id: 'nifty-midcap',
    name: 'Nifty Midcap 100',
    shortName: 'Midcap',
    indexValue: 56780,
    change1D: 0.65,
    change1W: 1.8,
    change1M: 3.6,
    change3M: 9.2,
    topGainer: 'ZOMATO',
    topLoser: 'FEDERALBNK',
    marketCap: 200,
  },
  {
    id: 'nifty-smallcap',
    name: 'Nifty Smallcap 100',
    shortName: 'Smallcap',
    indexValue: 19420,
    change1D: 1.24,
    change1W: 2.6,
    change1M: 4.8,
    change3M: 11.4,
    topGainer: 'RBLBANK',
    topLoser: 'TRIDENT',
    marketCap: 90,
  },
];

export async function fetchSectorData(): Promise<SectorData[]> {
  // NSE requires browser session — return mock data
  return MOCK_SECTORS;
}

export type TimePeriod = '1D' | '1W' | '1M' | '3M';

export function getSectorChange(sector: SectorData, period: TimePeriod): number {
  switch (period) {
    case '1D': return sector.change1D;
    case '1W': return sector.change1W;
    case '1M': return sector.change1M;
    case '3M': return sector.change3M;
  }
}

export function getSectorColor(change: number): string {
  if (change > 3)  return 'bg-emerald-500';
  if (change > 1)  return 'bg-emerald-400/70';
  if (change > 0)  return 'bg-emerald-300/40';
  if (change > -1) return 'bg-red-300/40';
  if (change > -3) return 'bg-red-400/70';
  return 'bg-red-600';
}

export function getSectorTextColor(change: number): string {
  if (change > 1)  return 'text-white';
  if (change > 0)  return 'text-emerald-900';
  if (change > -1) return 'text-red-900';
  return 'text-white';
}

export function getTopGainers(sectors: SectorData[], period: TimePeriod, n = 3): SectorData[] {
  return [...sectors]
    .sort((a, b) => getSectorChange(b, period) - getSectorChange(a, period))
    .slice(0, n);
}

export function getTopLosers(sectors: SectorData[], period: TimePeriod, n = 3): SectorData[] {
  return [...sectors]
    .sort((a, b) => getSectorChange(a, period) - getSectorChange(b, period))
    .slice(0, n);
}
