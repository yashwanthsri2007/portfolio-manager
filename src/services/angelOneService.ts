// src/services/angelOneService.ts
// Secure Angel One SmartAPI Client & Synchronization Service (Read-Only)

import type { Holding } from '../types';

export interface AngelOneCredentials {
  apiKey: string;
  clientCode: string;
  mpin: string;
  totp: string;
}

export interface AngelOneSession {
  jwtToken: string;
  refreshToken: string;
  feedToken: string;
  clientCode: string;
  lastSyncedAt: string;
}

export interface AngelOneRawHolding {
  tradingsymbol: string;
  symboltoken: string;
  exchange: string;
  isin: string;
  t1quantity?: number;
  realisedquantity?: number;
  quantity: number;
  authorisedquantity?: number;
  profitandloss?: number;
  pnlpercentage?: number;
  close?: number;
  avgprice: number;
}

export interface AngelOneRMS {
  availablecash: number;
  net: number;
  collateral: number;
  m2munrealized?: number;
  m2mrealized?: number;
}

export interface AngelOneHoldingCandidate extends AngelOneRawHolding {
  selected: boolean;
  isExisting: boolean;
  cleanName: string;
}

const STORAGE_KEY_SESSION = 'pm_angel_one_session';
const STORAGE_KEY_LAST_SYNC = 'pm_angel_one_last_sync';

// Retrieve active session if saved
export function getStoredAngelOneSession(): AngelOneSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_SESSION) || localStorage.getItem(STORAGE_KEY_SESSION);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Save active session
export function saveAngelOneSession(session: AngelOneSession, persist = false): void {
  try {
    sessionStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
    if (persist) {
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
    }
  } catch {}
}

// Disconnect / Clear Angel One session
export function clearAngelOneSession(): void {
  sessionStorage.removeItem(STORAGE_KEY_SESSION);
  localStorage.removeItem(STORAGE_KEY_SESSION);
}

// Get last sync time
export function getAngelOneLastSync(): string | null {
  return localStorage.getItem(STORAGE_KEY_LAST_SYNC);
}

// Save last sync time
export function setAngelOneLastSync(isoDate: string): void {
  localStorage.setItem(STORAGE_KEY_LAST_SYNC, isoDate);
}

// ─── 1. Authenticate with SmartAPI (Read-Only) ───────────────────────────────
export async function loginAngelOne(creds: AngelOneCredentials): Promise<{
  success: boolean;
  session?: AngelOneSession;
  error?: string;
}> {
  try {
    const res = await fetch('/api/angelone/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(creds)
    });

    const result = await res.json();
    if (result.success && result.data) {
      const session: AngelOneSession = {
        jwtToken: result.data.jwtToken,
        refreshToken: result.data.refreshToken,
        feedToken: result.data.feedToken,
        clientCode: result.data.clientCode || creds.clientCode,
        lastSyncedAt: new Date().toISOString()
      };
      saveAngelOneSession(session, true);
      setAngelOneLastSync(session.lastSyncedAt);
      return { success: true, session };
    }

    return {
      success: false,
      error: result.message || 'Authentication with Angel One failed. Check credentials.'
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network error connecting to Angel One proxy.'
    };
  }
}

// ─── 2. Fetch Live Delivery Holdings (Read-Only) ─────────────────────────────
export async function fetchAngelOneHoldings(
  session: AngelOneSession,
  apiKey: string
): Promise<{
  success: boolean;
  holdings?: AngelOneRawHolding[];
  error?: string;
}> {
  try {
    const res = await fetch('/api/angelone/holdings', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.jwtToken}`,
        'x-privatekey': apiKey,
        'Content-Type': 'application/json'
      }
    });

    const result = await res.json();
    if (result.success && Array.isArray(result.holdings)) {
      return { success: true, holdings: result.holdings };
    }

    return {
      success: false,
      error: result.message || 'Unable to fetch holdings from Angel One SmartAPI.'
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network error fetching Angel One holdings.'
    };
  }
}

// ─── 3. Fetch RMS Available Funds ───────────────────────────────────────────
export async function fetchAngelOneFunds(
  session: AngelOneSession,
  apiKey: string
): Promise<{
  success: boolean;
  funds?: AngelOneRMS;
  error?: string;
}> {
  try {
    const res = await fetch('/api/angelone/funds', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.jwtToken}`,
        'x-privatekey': apiKey,
        'Content-Type': 'application/json'
      }
    });

    const result = await res.json();
    if (result.success && result.funds) {
      return { success: true, funds: result.funds };
    }

    return {
      success: false,
      error: result.message || 'Unable to fetch RMS funds from Angel One.'
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network error fetching Angel One funds.'
    };
  }
}

// ─── 4. Convert and Merge Holdings (Prevent Duplicates) ──────────────────────
export function mergeAngelOneHoldings(
  existingHoldings: Holding[],
  importedAngelHoldings: AngelOneHoldingCandidate[]
): {
  updatedHoldings: Holding[];
  addedCount: number;
  updatedCount: number;
} {
  let addedCount = 0;
  let updatedCount = 0;
  const nowStr = new Date().toISOString().split('T')[0];

  // Clone existing
  const currentList = [...existingHoldings];

  importedAngelHoldings
    .filter(item => item.selected)
    .forEach(item => {
      const cleanSymbol = item.tradingsymbol.toUpperCase().replace(/-EQ$/, '');
      const cleanName = item.cleanName || cleanSymbol;

      // Check if this holding already exists in the portfolio (by symbol & brokerSource OR symbol)
      const existingIdx = currentList.findIndex(
        h => h.symbol.toUpperCase() === cleanSymbol || (h.broker === 'Angel One' && h.symbol === item.tradingsymbol)
      );

      if (existingIdx !== -1) {
        // Update existing holding with latest Angel One metrics
        currentList[existingIdx] = {
          ...currentList[existingIdx],
          quantity: Number(item.quantity),
          averagePrice: Number(item.avgprice),
          currentPrice: Number(item.close || item.avgprice),
          broker: 'Angel One',
          exchange: item.exchange || 'NSE',
          lastPriceType: 'live'
        };
        updatedCount++;
      } else {
        // Insert new holding
        const newHolding: Holding = {
          id: `h-ao-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          assetType: 'stock',
          symbol: cleanSymbol,
          name: cleanName,
          quantity: Number(item.quantity),
          averagePrice: Number(item.avgprice),
          currentPrice: Number(item.close || item.avgprice),
          purchaseDate: nowStr,
          broker: 'Angel One',
          exchange: item.exchange || 'NSE',
          lastPriceType: 'live',
          notes: `Imported via Angel One SmartAPI (Token: ${item.symboltoken || ''})`
        };
        currentList.push(newHolding);
        addedCount++;
      }
    });

  return {
    updatedHoldings: currentList,
    addedCount,
    updatedCount
  };
}
