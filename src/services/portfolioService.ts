import type { Holding, Transaction } from '../types';

export interface CSVRowPreview {
  raw: Record<string, string>;
  isValid: boolean;
  errors: string[];
  parsedHolding?: Partial<Holding>;
}

export interface CSVImportOptions {
  brokerFormat: 'zerodha' | 'groww' | 'generic';
  columnMapping?: {
    symbol: string;
    name?: string;
    quantity: string;
    averagePrice: string;
    assetType?: string;
    purchaseDate?: string;
  };
}

export function parseCSVContent(csvText: string, options: CSVImportOptions): CSVRowPreview[] {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  const rows = lines.slice(1);

  const previews: CSVRowPreview[] = [];

  rows.forEach((line) => {
    const cells = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
    const rawRow: Record<string, string> = {};
    headers.forEach((h, idx) => {
      let val = (cells[idx] || '').trim().replace(/^["']|["']$/g, '');
      rawRow[h] = val;
    });

    const errors: string[] = [];
    let symbol = '';
    let name = '';
    let quantity = 0;
    let averagePrice = 0;
    let assetType: Holding['assetType'] = 'stock';
    let purchaseDate = new Date().toISOString().split('T')[0];

    if (options.brokerFormat === 'zerodha') {
      symbol = rawRow['Instrument'] || rawRow['Symbol'] || rawRow['Trading Symbol'] || '';
      quantity = parseFloat(rawRow['Qty.'] || rawRow['Qty'] || rawRow['Quantity'] || '0');
      averagePrice = parseFloat(rawRow['Avg. cost'] || rawRow['Avg Price'] || rawRow['Buy Price'] || '0');
      name = rawRow['Instrument'] || symbol;
    } else if (options.brokerFormat === 'groww') {
      symbol = rawRow['Company Name'] || rawRow['Symbol'] || rawRow['Scheme Name'] || '';
      quantity = parseFloat(rawRow['Quantity'] || rawRow['Units'] || '0');
      averagePrice = parseFloat(rawRow['Average Price'] || rawRow['Avg NAV'] || '0');
      name = symbol;
      if (rawRow['Scheme Name'] || rawRow['Type']?.toLowerCase().includes('mutual')) {
        assetType = 'mutual_fund';
      }
    } else {
      const map = options.columnMapping || {
        symbol: 'symbol',
        quantity: 'quantity',
        averagePrice: 'averagePrice'
      };
      
      symbol = rawRow[map.symbol] || rawRow['Symbol'] || rawRow['Ticker'] || rawRow['Asset'] || '';
      name = (map.name && rawRow[map.name]) || symbol;
      quantity = parseFloat(rawRow[map.quantity] || rawRow['Quantity'] || rawRow['Qty'] || '0');
      averagePrice = parseFloat(rawRow[map.averagePrice] || rawRow['Price'] || rawRow['Average Price'] || '0');
      
      if (map.assetType && rawRow[map.assetType]) {
        const typeStr = rawRow[map.assetType].toLowerCase();
        if (typeStr.includes('fund') || typeStr.includes('mf')) assetType = 'mutual_fund';
        else if (typeStr.includes('gold')) assetType = 'gold';
        else if (typeStr.includes('silver')) assetType = 'silver';
      }
    }

    if (!symbol) errors.push('Missing symbol or instrument name');
    if (isNaN(quantity) || quantity <= 0) errors.push('Invalid quantity (must be > 0)');
    if (isNaN(averagePrice) || averagePrice <= 0) errors.push('Invalid average price (must be > 0)');

    previews.push({
      raw: rawRow,
      isValid: errors.length === 0,
      errors,
      parsedHolding: {
        symbol: symbol.toUpperCase(),
        name: name || symbol.toUpperCase(),
        quantity,
        averagePrice,
        assetType,
        purchaseDate,
        broker: options.brokerFormat.toUpperCase()
      }
    });
  });

  return previews;
}

// LocalStorage Keys for Portfolio Manager
export const STORAGE_KEYS = {
  HOLDINGS: 'portfolio_manager_holdings',
  TRANSACTIONS: 'portfolio_manager_transactions',
  CASH: 'portfolio_manager_cash_balance',
  SETUP_COMPLETED: 'portfolio_manager_setup_completed',
  WATCHLIST: 'portfolio_manager_watchlist',
  SETTINGS: 'portfolio_manager_settings',
  USER: 'portfolio_manager_user'
};

// Holdings Persistence - Never defaults to fake demo values!
export function loadStoredHoldings(): Holding[] {
  try {
    const json = localStorage.getItem(STORAGE_KEYS.HOLDINGS);
    if (!json) return [];
    const parsed = JSON.parse(json);
    // If it's an array, return it; purge any leftover demo flags
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error loading holdings from localStorage:', err);
    return [];
  }
}

export function saveHoldingsToStorage(holdings: Holding[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.HOLDINGS, JSON.stringify(holdings));
  } catch (err) {
    console.error('Error saving holdings to localStorage:', err);
  }
}

// Transactions Persistence
export function loadStoredTransactions(): Transaction[] {
  try {
    const json = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (!json) return [];
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error loading transactions from localStorage:', err);
    return [];
  }
}

export function saveTransactionsToStorage(transactions: Transaction[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  } catch (err) {
    console.error('Error saving transactions to localStorage:', err);
  }
}

// Cash Balance Persistence
export function loadStoredCash(): number {
  try {
    const val = localStorage.getItem(STORAGE_KEYS.CASH);
    return val !== null ? parseFloat(val) : 0;
  } catch {
    return 0;
  }
}

export function saveCashToStorage(cash: number) {
  try {
    localStorage.setItem(STORAGE_KEYS.CASH, cash.toString());
  } catch (err) {
    console.error('Error saving cash to localStorage:', err);
  }
}

// Check if first-time setup was completed
export function isSetupCompleted(): boolean {
  return localStorage.getItem(STORAGE_KEYS.SETUP_COMPLETED) === 'true';
}

export function markSetupCompleted() {
  localStorage.setItem(STORAGE_KEYS.SETUP_COMPLETED, 'true');
}

// JSON Complete Backup & Restore
export interface PortfolioBackupData {
  appName: 'Portfolio Manager';
  version: string;
  exportDate: string;
  cashBalance: number;
  holdings: Holding[];
  transactions: Transaction[];
  watchlist?: any[];
  user?: any;
  settings?: any;
}

export function exportPortfolioBackupJSON(
  cashBalance: number,
  holdings: Holding[],
  transactions: Transaction[],
  watchlist?: any[],
  user?: any,
  settings?: any
): string {
  const backup: PortfolioBackupData = {
    appName: 'Portfolio Manager',
    version: '2.0',
    exportDate: new Date().toISOString(),
    cashBalance,
    holdings,
    transactions,
    watchlist,
    user,
    settings
  };
  return JSON.stringify(backup, null, 2);
}

export function restorePortfolioBackupJSON(jsonString: string): PortfolioBackupData {
  const data = JSON.parse(jsonString);
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid backup file format: not a JSON object.');
  }
  if (!Array.isArray(data.holdings)) {
    throw new Error('Invalid backup file: missing holdings array.');
  }
  return data as PortfolioBackupData;
}

// CSV Export for Ledger
export function exportLedgerCSV(transactions: Transaction[]): string {
  const headers = [
    'Date',
    'Asset Name',
    'Symbol',
    'Type',
    'Quantity',
    'Price (INR)',
    'Total Value (INR)',
    'Brokerage (INR)',
    'Realized PnL (INR)',
    'Cash After (INR)',
    'Exchange',
    'Notes'
  ];

  const rows = transactions.map(t => [
    `"${t.date}"`,
    `"${t.name.replace(/"/g, '""')}"`,
    `"${t.symbol}"`,
    `"${t.type}"`,
    t.quantity,
    t.price,
    t.totalValue,
    t.brokerage || 0,
    t.realizedPnL || 0,
    t.cashBalanceAfter,
    `"${t.exchange || ''}"`,
    `"${(t.notes || '').replace(/"/g, '""')}"`
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

// CSV Export for Holdings
export function exportHoldingsCSV(holdings: Holding[]): string {
  const headers = ['Symbol', 'Name', 'Asset Type', 'Quantity', 'Avg Price (INR)', 'Invested (INR)', 'Purchase Date', 'Broker', 'Exchange'];
  const rows = holdings.map(h => [
    `"${h.symbol}"`,
    `"${h.name.replace(/"/g, '""')}"`,
    `"${h.assetType}"`,
    h.quantity,
    h.averagePrice,
    (h.quantity * h.averagePrice).toFixed(2),
    `"${h.purchaseDate}"`,
    `"${h.broker || ''}"`,
    `"${h.exchange || ''}"`
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

// Clear all portfolio storage
export function clearAllPortfolioStorage() {
  try {
    localStorage.removeItem(STORAGE_KEYS.HOLDINGS);
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem(STORAGE_KEYS.CASH);
    localStorage.removeItem(STORAGE_KEYS.SETUP_COMPLETED);
    // Also remove legacy keys
    localStorage.removeItem('nexus_wealth_holdings');
    localStorage.removeItem('nexus_user');
    localStorage.removeItem('nexus_settings');
    localStorage.removeItem('nexus_onboarded');
  } catch (err) {
    console.error('Error clearing portfolio storage:', err);
  }
}
