// src/services/alertService.ts
// Portfolio Risk & Vulnerability Alert Engine

import type { Holding, PortfolioMetrics } from '../types';
import { CORPORATE_EVENTS_CALENDAR } from './indianMarketService';

export interface PortfolioAlert {
  id: string;
  type: 'CONCENTRATION' | 'VOLATILITY' | 'DRAWDOWN' | 'CASH_BUFFER' | 'CORPORATE_ACTION';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  description: string;
  timestamp: string;
  actionLabel?: string;
  actionTab?: string;
}

export function evaluatePortfolioRiskAlerts(
  metrics: PortfolioMetrics,
  holdings: Holding[]
): PortfolioAlert[] {
  const alerts: PortfolioAlert[] = [];
  const now = new Date().toISOString();

  if (holdings.length === 0 && metrics.availableCash === 0) {
    return [
      {
        id: 'alert-setup-needed',
        type: 'CASH_BUFFER',
        severity: 'INFO',
        title: 'Empty Portfolio State',
        description: 'No active holdings or cash balance recorded. Run Portfolio Setup or record your assets to enable risk monitoring.',
        timestamp: now,
        actionLabel: 'Setup Portfolio',
        actionTab: 'portfolio'
      }
    ];
  }

  // 1. Single Asset Concentration Risk (> 25% of total net worth)
  if (metrics.totalNetWorth > 0) {
    holdings.forEach(h => {
      const holdingVal = h.quantity * (h.currentPrice || h.averagePrice);
      const ratio = (holdingVal / metrics.totalNetWorth) * 100;
      if (ratio > 25 && holdings.length > 2) {
        alerts.push({
          id: `alert-conc-${h.id}`,
          type: 'CONCENTRATION',
          severity: 'WARNING',
          title: `High Concentration in ${h.name}`,
          description: `${h.name} (${h.symbol}) accounts for ${ratio.toFixed(1)}% of your total net worth. Consider rebalancing across uncorrelated sectors.`,
          timestamp: now,
          actionLabel: 'View Asset',
          actionTab: 'portfolio'
        });
      }
    });
  }

  // 2. Liquid Cash Buffer Alert (< 5% of net worth when invested)
  if (metrics.totalNetWorth > 50000) {
    const cashRatio = (metrics.availableCash / metrics.totalNetWorth) * 100;
    if (cashRatio < 5) {
      alerts.push({
        id: 'alert-cash-buffer',
        type: 'CASH_BUFFER',
        severity: 'WARNING',
        title: 'Low Liquid Cash Buffer',
        description: `Liquid cash is only ${cashRatio.toFixed(1)}% (₹${metrics.availableCash.toLocaleString('en-IN')}) of total net worth. Having at least 5-10% liquid cash reserves provides drawdown cushion.`,
        timestamp: now,
        actionLabel: 'Deposit Cash',
        actionTab: 'portfolio'
      });
    }
  }

  // 3. Position Drawdown Alert (> 12% unrealized loss)
  holdings.forEach(h => {
    if (h.currentPrice && h.averagePrice && h.averagePrice > 0) {
      const pnlPct = ((h.currentPrice - h.averagePrice) / h.averagePrice) * 100;
      if (pnlPct < -12) {
        alerts.push({
          id: `alert-drawdown-${h.id}`,
          type: 'DRAWDOWN',
          severity: 'CRITICAL',
          title: `Position Drawdown: ${h.symbol} (${pnlPct.toFixed(1)}%)`,
          description: `Unrealized loss on ${h.name} has crossed -12%. Review fundamental thesis or set stop-loss parameters.`,
          timestamp: now,
          actionLabel: 'Review Holding',
          actionTab: 'stocks'
        });
      }
    }
  });

  // 4. Upcoming Corporate Action Alert (within next 14 days)
  const heldSymbols = new Set(
    holdings.map(h => h.symbol.toUpperCase().replace(/-EQ$/, ''))
  );

  CORPORATE_EVENTS_CALENDAR.forEach(ev => {
    if (heldSymbols.has(ev.symbol.toUpperCase())) {
      alerts.push({
        id: `alert-event-${ev.id}`,
        type: 'CORPORATE_ACTION',
        severity: 'INFO',
        title: `${ev.eventType}: ${ev.symbol} (${ev.eventDate})`,
        description: `${ev.companyName} has an upcoming ${ev.eventType.toLowerCase()} event: ${ev.details}.`,
        timestamp: now,
        actionLabel: 'Events Calendar',
        actionTab: 'intelligence'
      });
    }
  });

  return alerts;
}
