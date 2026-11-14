// src/services/fiiDiiService.ts
// FII/DII Activity Data Service

export interface FIIDIIEntry {
  date: string;
  fiiBuy: number;   // ₹ Crores
  fiiSell: number;
  fiiNet: number;
  diiBuy: number;
  diiSell: number;
  diiNet: number;
  marketTrend: 'Bullish' | 'Bearish' | 'Neutral';
}

export interface SectorFlow {
  sector: string;
  fiiFlow: number; // ₹ Cr (positive = buying, negative = selling)
  change: number;  // % change
}

function generateMockFIIDIIData(): FIIDIIEntry[] {
  const entries: FIIDIIEntry[] = [
    { date: '14-Nov-2024', fiiBuy: 8420, fiiSell: 12850, fiiNet: -4430, diiBuy: 9120, diiSell: 5340, diiNet: 3780, marketTrend: 'Bearish' },
    { date: '13-Nov-2024', fiiBuy: 7230, fiiSell: 11420, fiiNet: -4190, diiBuy: 8650, diiSell: 4920, diiNet: 3730, marketTrend: 'Bearish' },
    { date: '12-Nov-2024', fiiBuy: 9850, fiiSell: 13100, fiiNet: -3250, diiBuy: 7450, diiSell: 4780, diiNet: 2670, marketTrend: 'Bearish' },
    { date: '11-Nov-2024', fiiBuy: 11200, fiiSell: 14800, fiiNet: -3600, diiBuy: 8900, diiSell: 5100, diiNet: 3800, marketTrend: 'Bearish' },
    { date: '08-Nov-2024', fiiBuy: 10500, fiiSell: 13900, fiiNet: -3400, diiBuy: 8200, diiSell: 4900, diiNet: 3300, marketTrend: 'Bearish' },
    { date: '07-Nov-2024', fiiBuy: 14200, fiiSell: 11300, fiiNet: 2900, diiBuy: 6800, diiSell: 7200, diiNet: -400, marketTrend: 'Bullish' },
    { date: '06-Nov-2024', fiiBuy: 15800, fiiSell: 10200, fiiNet: 5600, diiBuy: 5900, diiSell: 7800, diiNet: -1900, marketTrend: 'Bullish' },
    { date: '05-Nov-2024', fiiBuy: 13400, fiiSell: 9800, fiiNet: 3600, diiBuy: 6200, diiSell: 8100, diiNet: -1900, marketTrend: 'Bullish' },
    { date: '04-Nov-2024', fiiBuy: 12700, fiiSell: 10100, fiiNet: 2600, diiBuy: 7100, diiSell: 8300, diiNet: -1200, marketTrend: 'Neutral' },
    { date: '01-Nov-2024', fiiBuy: 9800, fiiSell: 12300, fiiNet: -2500, diiBuy: 8100, diiSell: 6200, diiNet: 1900, marketTrend: 'Bearish' },
    { date: '31-Oct-2024', fiiBuy: 8500, fiiSell: 13800, fiiNet: -5300, diiBuy: 9400, diiSell: 5100, diiNet: 4300, marketTrend: 'Bearish' },
    { date: '30-Oct-2024', fiiBuy: 10200, fiiSell: 14600, fiiNet: -4400, diiBuy: 8800, diiSell: 4700, diiNet: 4100, marketTrend: 'Bearish' },
    { date: '29-Oct-2024', fiiBuy: 7800, fiiSell: 11200, fiiNet: -3400, diiBuy: 7600, diiSell: 4400, diiNet: 3200, marketTrend: 'Bearish' },
    { date: '28-Oct-2024', fiiBuy: 11500, fiiSell: 9200, fiiNet: 2300, diiBuy: 6300, diiSell: 7800, diiNet: -1500, marketTrend: 'Bullish' },
    { date: '25-Oct-2024', fiiBuy: 13900, fiiSell: 8800, fiiNet: 5100, diiBuy: 5700, diiSell: 8200, diiNet: -2500, marketTrend: 'Bullish' },
    { date: '24-Oct-2024', fiiBuy: 16200, fiiSell: 9400, fiiNet: 6800, diiBuy: 5200, diiSell: 9100, diiNet: -3900, marketTrend: 'Bullish' },
    { date: '23-Oct-2024', fiiBuy: 14500, fiiSell: 10100, fiiNet: 4400, diiBuy: 6100, diiSell: 8800, diiNet: -2700, marketTrend: 'Bullish' },
    { date: '22-Oct-2024', fiiBuy: 9200, fiiSell: 12700, fiiNet: -3500, diiBuy: 8300, diiSell: 5800, diiNet: 2500, marketTrend: 'Bearish' },
    { date: '21-Oct-2024', fiiBuy: 8700, fiiSell: 13200, fiiNet: -4500, diiBuy: 9100, diiSell: 5300, diiNet: 3800, marketTrend: 'Bearish' },
    { date: '18-Oct-2024', fiiBuy: 10400, fiiSell: 14100, fiiNet: -3700, diiBuy: 8600, diiSell: 5000, diiNet: 3600, marketTrend: 'Bearish' },
  ];
  return entries;
}

export const MOCK_SECTOR_FLOWS: SectorFlow[] = [
  { sector: 'Information Technology', fiiFlow: 2850, change: 1.8 },
  { sector: 'Banking & Finance', fiiFlow: -3420, change: -2.1 },
  { sector: 'Automobile', fiiFlow: 1240, change: 0.9 },
  { sector: 'FMCG', fiiFlow: -890, change: -0.6 },
  { sector: 'Pharma & Healthcare', fiiFlow: 1680, change: 1.2 },
  { sector: 'Metals & Mining', fiiFlow: -1950, change: -1.4 },
  { sector: 'Oil & Gas / Energy', fiiFlow: -2100, change: -1.6 },
  { sector: 'Real Estate', fiiFlow: 760, change: 0.5 },
  { sector: 'Telecom', fiiFlow: 420, change: 0.3 },
  { sector: 'Capital Goods', fiiFlow: 580, change: 0.4 },
];

export async function fetchFIIDIIData(): Promise<FIIDIIEntry[]> {
  // NSE requires browser session — return mock data
  return generateMockFIIDIIData();
}

export function computeMTD(data: FIIDIIEntry[]): { fiiMTD: number; diiMTD: number } {
  const fiiMTD = data.reduce((sum, d) => sum + d.fiiNet, 0);
  const diiMTD = data.reduce((sum, d) => sum + d.diiNet, 0);
  return { fiiMTD, diiMTD };
}

export function computeSentiment(data: FIIDIIEntry[]): {
  score: number;
  label: 'Strongly Bearish' | 'Bearish' | 'Neutral' | 'Bullish' | 'Strongly Bullish';
  color: string;
} {
  const last10 = data.slice(0, 10);
  const totalNet = last10.reduce((sum, d) => sum + d.fiiNet + d.diiNet, 0);
  const avg = totalNet / last10.length;

  if (avg < -4000) return { score: 10, label: 'Strongly Bearish', color: 'text-red-500' };
  if (avg < -1500) return { score: 30, label: 'Bearish', color: 'text-red-400' };
  if (avg < 1500)  return { score: 50, label: 'Neutral', color: 'text-yellow-400' };
  if (avg < 4000)  return { score: 70, label: 'Bullish', color: 'text-emerald-400' };
  return { score: 90, label: 'Strongly Bullish', color: 'text-emerald-500' };
}

export function getTrendSignal(data: FIIDIIEntry[]): string {
  const last5 = data.slice(0, 5);
  const fiiConsecutiveSell = last5.every((d) => d.fiiNet < 0);
  const fiiConsecutiveBuy  = last5.every((d) => d.fiiNet > 0);
  const diiSupporting      = last5.filter((d) => d.diiNet > 0).length >= 4;

  if (fiiConsecutiveSell && diiSupporting)
    return '⚠️ FII selling for 5 consecutive days — DII supporting market. Cautious but not panic.';
  if (fiiConsecutiveSell)
    return '🔴 FII selling for 5 consecutive days — Bearish signal. Watch for reversal.';
  if (fiiConsecutiveBuy)
    return '🟢 FII buying for 5 consecutive days — Bullish momentum. Market upside likely.';
  if (diiSupporting)
    return '🟡 DII supporting market amid FII volatility — Bullish underpinning.';
  return '⚪ Mixed FII/DII activity — Market consolidating. No clear directional signal.';
}
