import { GoogleGenAI } from '@google/genai';
import type { PortfolioMetrics, Holding } from '../types';
import { formatCurrency, formatPercent } from '../utils/formatters';

export interface AIAdvisorResponse {
  text: string;
  isLive: boolean;
  model?: string;
  error?: string;
  source: 'gemini' | 'heuristic';
}

/**
 * Retrieve the active Gemini API key from:
 * 1. Explicit parameter override
 * 2. User settings in localStorage
 * 3. Environment variable VITE_GEMINI_API_KEY
 */
export function getStoredGeminiKey(apiKeyOverride?: string): string {
  if (apiKeyOverride && apiKeyOverride.trim()) {
    return apiKeyOverride.trim();
  }
  try {
    const stored = localStorage.getItem('portfolio_manager_settings');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.geminiKey && parsed.geminiKey.trim()) {
        return parsed.geminiKey.trim();
      }
    }
  } catch {}
  return import.meta.env.VITE_GEMINI_API_KEY || '';
}

/**
 * Test Google Gemini connection via backend proxy (or direct fallback)
 */
export async function testGeminiConnection(apiKeyOverride?: string): Promise<{
  success: boolean;
  message: string;
  latency?: number;
  model?: string;
  preview?: string;
}> {
  const token = getStoredGeminiKey(apiKeyOverride);

  // 1. Try secure backend proxy first (/api/gemini/test-connection)
  try {
    const headers: Record<string, string> = {};
    if (token) headers['x-gemini-key'] = token;

    const res = await fetch('/api/gemini/test-connection', { headers });
    const data = await res.json();

    if (res.ok && data.success) {
      return data;
    }
    if (data && data.message) {
      return { success: false, message: data.message };
    }
  } catch (proxyErr) {
    console.warn('Backend Gemini test-connection proxy error, attempting direct check:', proxyErr);
  }

  // 2. Direct fallback (e.g. if running client-only static hosting without proxy)
  if (!token) {
    return {
      success: false,
      message: 'No Google Gemini API key found. Enter your key in Settings or add GEMINI_API_KEY to your .env file.'
    };
  }

  try {
    const start = Date.now();
    const ai = new GoogleGenAI({ apiKey: token });
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ role: 'user', parts: [{ text: 'Ping. Reply with exactly the single word: PONG.' }] }]
    });

    const latency = Date.now() - start;
    const replyText = response.text?.trim() || 'PONG';

    return {
      success: true,
      message: `Connected to Google Gemini successfully (${latency}ms). Model: gemini-3.8-flash`,
      latency,
      model: 'gemini-2.5-flash',
      preview: replyText
    };
  } catch (err: any) {
    const errMsg = err?.message || '';
    if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('400') || errMsg.includes('403')) {
      return { success: false, message: 'Invalid Gemini API Key. Authentication failed (400/403).' };
    }
    if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
      return { success: false, message: 'Gemini API Rate Limit / Quota exceeded (429). Check your Google AI Studio plan.' };
    }
    return { success: false, message: errMsg || 'Failed to connect to Google Gemini API.' };
  }
}

/**
 * Ask CyberFinance AI with real portfolio context, strictly preferring real Gemini API
 * and transparently reporting status/errors.
 */
export async function askCyberFinanceAI(
  userPrompt: string,
  metrics: PortfolioMetrics,
  holdings: Holding[],
  apiKeyOverride?: string,
  userName = 'Yashwanth'
): Promise<AIAdvisorResponse> {
  const token = getStoredGeminiKey(apiKeyOverride);

  // Build dynamic real portfolio context
  const holdingsSummary = holdings.map(h => 
    `- ${h.name} (${h.symbol}): Qty ${h.quantity}, Avg Cost ${formatCurrency(h.averagePrice)}, Current Valuation: ${formatCurrency(h.quantity * (h.currentPrice || h.averagePrice))}, Asset: ${h.assetType}${h.exchange ? ` [${h.exchange}]` : ''}`
  ).join('\n');

  const allocationSummary = metrics.assetAllocation.map(a => 
    `- ${a.category}: ${formatCurrency(a.amount)} (${a.percentage.toFixed(1)}%)`
  ).join('\n');

  const concentrationSummary = metrics.concentrationRisk.slice(0, 3).map(c => 
    `- ${c.name} (${c.symbol}): ${c.weight.toFixed(1)}% of total portfolio`
  ).join('\n');

  const contextText = `
=== CURRENT PORTFOLIO MANAGER CONTEXT FOR ${userName.toUpperCase()} ===
- Total Net Worth (Liquid + Assets): ${formatCurrency(metrics.totalNetWorth)}
- Available Liquid Cash: ${formatCurrency(metrics.availableCash)}
- Holdings Market Valuation: ${formatCurrency(metrics.holdingsValue)}
- Invested Capital (Cost Basis): ${formatCurrency(metrics.totalInvested)}
- Unrealized Profit/Loss: ${formatCurrency(metrics.unrealizedProfitLoss)}
- Realized Profit/Loss (Closed Trades): ${formatCurrency(metrics.realizedProfitLoss)}
- Total Portfolio Profit/Loss: ${formatCurrency(metrics.totalProfitLoss)} (${formatPercent(metrics.totalReturnPercent)})
- Today's Performance: ${formatCurrency(metrics.todayProfitLoss)} (${formatPercent(metrics.todayReturnPercent)})
- Total Net Cash Flow: ${formatCurrency(metrics.netCashFlow)}
- Diversification Health Score: ${metrics.diversificationScore}/100
- Portfolio Sentiment Score: ${metrics.portfolioSentimentScore}/100

ASSET ALLOCATION:
${allocationSummary || 'No allocations yet.'}

TOP CONCENTRATIONS:
${concentrationSummary || 'None.'}

TOP GAINER: ${metrics.topGainer ? `${metrics.topGainer.name} (${formatPercent(metrics.topGainer.changePercent)})` : 'N/A'}
TOP LOSER: ${metrics.topLoser ? `${metrics.topLoser.name} (${formatPercent(metrics.topLoser.changePercent)})` : 'N/A'}

CURRENT RECORDED HOLDINGS (${holdings.length} total):
${holdingsSummary || 'No holdings currently added. Portfolio is awaiting setup or cash deposits.'}
==========================================================
  `;

  const systemInstruction = `You are CyberFinance AI, personal investment advisor for ${userName} in the Portfolio Manager application. Analyze only the real portfolio context provided. Clearly distinguish calculated portfolio metrics from external market information. Do not invent holdings, fictional profits, or money. If the user asks about their value, cash, or performance, refer directly to the real metrics. If the portfolio is empty, guide them on setting starting cash or recording their first holding. Tone: sharp, analytical, professional, and supportive.`;

  // 1. If no key is set at all, use verified heuristic calculations and label clearly
  if (!token) {
    const localText = generateLocalAIResponse(userPrompt, metrics, holdings, userName);
    return {
      text: localText,
      isLive: false,
      source: 'heuristic',
      error: 'No Gemini API key configured. Enter your key in Settings or .env to activate neural inference.'
    };
  }

  // 2. Try proxy /api/gemini/generate first
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-gemini-key': token
    };

    const proxyRes = await fetch('/api/gemini/generate', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        prompt: userPrompt,
        systemInstruction,
        contextText,
        model: 'gemini-2.5-flash'
      })
    });

    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (data.success && data.text) {
        return {
          text: data.text,
          isLive: true,
          model: data.model || 'gemini-3.8-flash',
          source: 'gemini'
        };
      }
    } else {
      const errData = await proxyRes.json().catch(() => ({}));
      const reason = errData.error || `HTTP ${proxyRes.status}`;
      console.warn('Gemini proxy error:', reason);
      return {
        text: `### ❌ GEMINI API ERROR\n**Model**: \`gemini-3.8-flash\`\n**Status**: Failed\n**Details**: ${reason}\n\n*Please verify your Gemini API key in Settings or check your Google AI Studio plan quota.*`,
        isLive: false,
        source: 'heuristic',
        error: reason
      };
    }
  } catch (proxyError: any) {
    console.warn('Proxy fetch failed, attempting direct Gemini call:', proxyError);
  }

  // 3. Direct client fallback with official GoogleGenAI SDK
  try {
    const ai = new GoogleGenAI({ apiKey: token });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: `${systemInstruction}\n\n${contextText}\n\nUSER QUESTION: ${userPrompt}` }] }
      ]
    });

    if (response.text) {
      return {
        text: response.text,
        isLive: true,
        model: 'gemini-2.5-flash',
        source: 'gemini'
      };
    }
  } catch (sdkError: any) {
    console.warn('Direct Gemini SDK Error:', sdkError);
    const reason = sdkError?.message || 'Inference error';
    return {
      text: `### ❌ GEMINI API ERROR\n**Model**: \`gemini-3.8-flash\`\n**Details**: ${reason}\n\n*Please verify your Gemini API key in Settings or check your Google AI Studio plan quota.*`,
      isLive: false,
      source: 'heuristic',
      error: reason
    };
  }

  // Fallback
  return {
    text: generateLocalAIResponse(userPrompt, metrics, holdings, userName),
    isLive: false,
    source: 'heuristic'
  };
}

export function generateLocalAIResponse(
  userPrompt: string,
  metrics: PortfolioMetrics,
  holdings: Holding[],
  userName: string
): string {
  const promptLower = userPrompt.toLowerCase();

  if (holdings.length === 0 && metrics.availableCash === 0) {
    return `Hello ${userName}! Your portfolio is currently at **₹0.00** with no active holdings or cash recorded.

**Getting Started:**
1. Click **Manage Cash** to enter your available uninvested funds.
2. Click **Add Holding** or **Import CSV** to record your stocks, mutual funds, or gold.
3. Every transaction will update your weekly and monthly ledger automatically!`;
  }

  if (promptLower.includes('value') || promptLower.includes('net worth') || promptLower.includes('how much')) {
    return `**Current Portfolio Valuation for ${userName}**:
- **Total Net Worth**: **${formatCurrency(metrics.totalNetWorth)}**
- **Available Liquid Cash**: ${formatCurrency(metrics.availableCash)}
- **Invested Capital (Cost Basis)**: ${formatCurrency(metrics.totalInvested)}
- **Holdings Valuation**: ${formatCurrency(metrics.holdingsValue)}
- **Unrealized P&L**: ${metrics.unrealizedProfitLoss >= 0 ? '+' : ''}${formatCurrency(metrics.unrealizedProfitLoss)}
- **Realized P&L**: ${metrics.realizedProfitLoss >= 0 ? '+' : ''}${formatCurrency(metrics.realizedProfitLoss)}`;
  }

  if (promptLower.includes('cash') || promptLower.includes('balance') || promptLower.includes('liquid')) {
    return `**Available Cash & Liquidity**:
- **Current Cash Balance**: **${formatCurrency(metrics.availableCash)}**
- **Net Deposits / Withdrawals**: ${formatCurrency(metrics.netCashFlow)}
- Use the **Manage Cash** button in the top bar to deposit or withdraw capital anytime.`;
  }

  if (promptLower.includes('profit') || promptLower.includes('loss') || promptLower.includes('p&l') || promptLower.includes('returns')) {
    return `**Portfolio Profit & Loss Breakdown**:
- **Total Portfolio Return**: **${formatPercent(metrics.totalReturnPercent)}** (${metrics.totalProfitLoss >= 0 ? '+' : ''}${formatCurrency(metrics.totalProfitLoss)})
- **Unrealized Gains / Losses (Open)**: ${metrics.unrealizedProfitLoss >= 0 ? '+' : ''}${formatCurrency(metrics.unrealizedProfitLoss)}
- **Realized Gains / Losses (Closed)**: ${metrics.realizedProfitLoss >= 0 ? '+' : ''}${formatCurrency(metrics.realizedProfitLoss)}
- **Today's Movement**: ${metrics.todayProfitLoss >= 0 ? '+' : ''}${formatCurrency(metrics.todayProfitLoss)} (${formatPercent(metrics.todayReturnPercent)})`;
  }

  if (promptLower.includes('risk') || promptLower.includes('diversification') || promptLower.includes('health')) {
    const topConcentration = metrics.concentrationRisk[0];
    return `**Risk & Diversification Health Report**:
- **Diversification Score**: **${metrics.diversificationScore}/100**
${topConcentration ? `- **Largest Position**: **${topConcentration.name}** (${topConcentration.weight.toFixed(1)}% of total wealth)` : ''}
- **Active Holdings Count**: ${holdings.length} assets
- **Target Guidelines**: Ensure no single asset exceeds 25-30% of your total net worth to guard against sector-specific drawdowns.`;
  }

  if (promptLower.includes('ledger') || promptLower.includes('week') || promptLower.includes('month') || promptLower.includes('transaction')) {
    return `**Investment Ledger Overview**:
- You can inspect your complete audit trail in the **Investment Ledger** tab (code 03 in the sidebar).
- Review transactions grouped by **Weekly** or **Monthly** windows with realized P&L and cash balance tracking after each trade.
- You can export the ledger to CSV anytime for tax or accounting audits.`;
  }

  // General Summary
  return `**Portfolio Manager Summary for ${userName}**:
- **Net Worth**: ${formatCurrency(metrics.totalNetWorth)} (Cash: ${formatCurrency(metrics.availableCash)}, Assets: ${formatCurrency(metrics.holdingsValue)})
- **Total P&L**: ${metrics.totalProfitLoss >= 0 ? '+' : ''}${formatCurrency(metrics.totalProfitLoss)} (${formatPercent(metrics.totalReturnPercent)})
- **Health Score**: ${metrics.diversificationScore}/100 across ${holdings.length} holdings.

Feel free to ask me about your asset breakdown, risk concentration, recent gains/losses, or cash management!`;
}
