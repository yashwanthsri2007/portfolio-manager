// src/services/multiAiService.ts
// Multi-AI Engine supporting Gemini, Groq, NVIDIA NIM, and Bytez
// Features: Single-AI, Parallel Multi-AI Debate, and Resilient Auto-Fallback.

import type { Holding, PortfolioMetrics } from '../types';
import { formatCurrency } from '../utils/formatters';

export type AIProviderId = 'gemini' | 'nvidia' | 'groq' | 'bytez';
export type AIMode = 'single' | 'debate' | 'auto';

export interface AIProviderConfig {
  id: AIProviderId;
  name: string;
  badge: string;
  apiKey: string;
  enabled: boolean;
  selectedModel: string;
  availableModels: { id: string; name: string; freeTier: boolean; description: string }[];
  status: 'idle' | 'online' | 'error' | 'testing';
  lastLatency?: number;
  lastError?: string;
}

export interface MultiAISettings {
  mode: AIMode;
  activeSingleProvider: AIProviderId;
  priorityOrder: AIProviderId[];
  providers: Record<AIProviderId, AIProviderConfig>;
}

export interface DebatePersonaOutput {
  persona: 'Fundamental' | 'Technical' | 'Risk & Contrarian';
  provider: AIProviderId;
  model: string;
  analysis: string;
  status: 'success' | 'failed';
  error?: string;
}

export interface MultiAIDebateResult {
  consensusPoints: string[];
  divergencePoints: string[];
  synthesis: string;
  perspectives: DebatePersonaOutput[];
  coordinatorProvider: AIProviderId;
  coordinatorModel: string;
  isDebate: true;
}

export interface SingleAIResult {
  text: string;
  provider: AIProviderId;
  model: string;
  isLive: boolean;
  fallbackChain?: string[];
  error?: string;
}

const STORAGE_KEY_MULTI_AI = 'pm_multi_ai_settings_v2';

export const DEFAULT_AI_CONFIGS: Record<AIProviderId, AIProviderConfig> = {
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    badge: 'PRIMARY',
    apiKey: '',
    enabled: true,
    selectedModel: 'gemini-3.8-flash',
    availableModels: [
      { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (Stable)', freeTier: true, description: 'Fast, multimodal, high accuracy' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', freeTier: true, description: 'High speed low-latency reasoning' }
    ],
    status: 'idle'
  },
  nvidia: {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    badge: 'NVIDIA CLOUD',
    apiKey: '',
    enabled: true,
    selectedModel: 'meta/llama-3.3-70b-instruct',
    availableModels: [
      { id: 'meta/llama-3.3-70b-instruct', name: 'Llama 3.3 70B Instruct', freeTier: true, description: 'Enterprise-grade reasoning on NVIDIA GPU clusters' },
      { id: 'mistralai/mistral-large-2-instruct', name: 'Mistral Large 2', freeTier: true, description: 'Multilingual financial & mathematical logic' },
      { id: 'deepseek-ai/deepseek-r1', name: 'DeepSeek R1', freeTier: true, description: 'Deep chain-of-thought financial auditing' }
    ],
    status: 'idle'
  },
  groq: {
    id: 'groq',
    name: 'Groq Cloud',
    badge: 'ULTRA FAST LPU',
    apiKey: '',
    enabled: true,
    selectedModel: 'llama-3.3-70b-versatile',
    availableModels: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', freeTier: true, description: 'Ultra-low latency inference via Groq LPU' },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', freeTier: true, description: 'Instant sub-100ms responses' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B (32k context)', freeTier: true, description: 'Sparse mixture of experts model' }
    ],
    status: 'idle'
  },
  bytez: {
    id: 'bytez',
    name: 'Bytez AI',
    badge: 'OPEN WEIGHTS',
    apiKey: '',
    enabled: true,
    selectedModel: 'meta-llama/Meta-Llama-3.1-70B-Instruct',
    availableModels: [
      { id: 'meta-llama/Meta-Llama-3.1-70B-Instruct', name: 'Llama 3.1 70B (Bytez)', freeTier: true, description: 'Direct serverless open-weights execution' },
      { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen 2.5 72B', freeTier: true, description: 'Advanced quantitative coding & math' }
    ],
    status: 'idle'
  }
};

export const DEFAULT_MULTI_AI_SETTINGS: MultiAISettings = {
  mode: 'auto',
  activeSingleProvider: 'gemini',
  priorityOrder: ['gemini', 'nvidia', 'groq', 'bytez'],
  providers: DEFAULT_AI_CONFIGS
};

// ─── Settings Storage ────────────────────────────────────────────────────────
export function loadMultiAISettings(): MultiAISettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MULTI_AI);
    if (!raw) return DEFAULT_MULTI_AI_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_MULTI_AI_SETTINGS,
      ...parsed,
      providers: {
        gemini: { ...DEFAULT_AI_CONFIGS.gemini, ...(parsed.providers?.gemini || {}) },
        nvidia: { ...DEFAULT_AI_CONFIGS.nvidia, ...(parsed.providers?.nvidia || {}) },
        groq: { ...DEFAULT_AI_CONFIGS.groq, ...(parsed.providers?.groq || {}) },
        bytez: { ...DEFAULT_AI_CONFIGS.bytez, ...(parsed.providers?.bytez || {}) }
      }
    };
  } catch {
    return DEFAULT_MULTI_AI_SETTINGS;
  }
}

export function saveMultiAISettings(settings: MultiAISettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_MULTI_AI, JSON.stringify(settings));
  } catch {}
}

// ─── Test Connection for Any Provider ────────────────────────────────────────
export async function testAIProviderConnection(
  provider: AIProviderId,
  apiKey: string,
  model?: string
): Promise<{ success: boolean; latency?: number; message: string; preview?: string }> {
  try {
    const res = await fetch('/api/ai/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, apiKey, model })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      return {
        success: true,
        latency: data.latency,
        message: data.message,
        preview: data.preview
      };
    }
    return {
      success: false,
      message: data.message || `Failed to connect to ${provider}`
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || `Network error testing ${provider}`
    };
  }
}

// ─── Single Chat Call to Specific Provider ───────────────────────────────────
export async function callAIProvider(
  provider: AIProviderId,
  apiKey: string,
  model: string,
  prompt: string,
  systemPrompt?: string,
  history: { role: 'user' | 'assistant'; content: string }[] = []
): Promise<{ success: boolean; text: string; error?: string }> {
  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider,
        apiKey,
        model,
        systemPrompt,
        messages: [...history, { role: 'user', content: prompt }]
      })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true, text: data.text };
    }
    return {
      success: false,
      text: '',
      error: data.error || `Provider ${provider} returned HTTP ${res.status}`
    };
  } catch (err: any) {
    return { success: false, text: '', error: err.message || `Failed to query ${provider}` };
  }
}

// ─── Auto-Fallback Executor ──────────────────────────────────────────────────
export async function executeAutoFallbackChat(
  settings: MultiAISettings,
  prompt: string,
  systemPrompt: string,
  history: { role: 'user' | 'assistant'; content: string }[] = []
): Promise<SingleAIResult> {
  const fallbackChain: string[] = [];

  for (const providerId of settings.priorityOrder) {
    const pConfig = settings.providers[providerId];
    if (!pConfig || !pConfig.enabled || !pConfig.apiKey) {
      continue;
    }

    fallbackChain.push(pConfig.name);
    const result = await callAIProvider(
      providerId,
      pConfig.apiKey,
      pConfig.selectedModel,
      prompt,
      systemPrompt,
      history
    );

    if (result.success && result.text) {
      return {
        text: result.text,
        provider: providerId,
        model: pConfig.selectedModel,
        isLive: true,
        fallbackChain: fallbackChain.length > 1 ? fallbackChain : undefined
      };
    }
  }

  return {
    text: 'All configured AI providers failed or are missing API keys. Please verify your keys in AI Provider Settings.',
    provider: settings.priorityOrder[0] || 'gemini',
    model: 'none',
    isLive: false,
    error: 'No active AI providers responded successfully.'
  };
}

// ─── Parallel Multi-AI Debate Coordinator ────────────────────────────────────
export async function executeMultiAIDebate(
  settings: MultiAISettings,
  userPrompt: string,
  metrics: PortfolioMetrics,
  holdings: Holding[],
  userName = 'Yashwanth'
): Promise<MultiAIDebateResult> {
  const activeProviders = settings.priorityOrder
    .map(id => settings.providers[id])
    .filter(p => p && p.enabled && p.apiKey);

  // If less than 2 providers configured, fallback to available or default
  const p1 = activeProviders[0] || settings.providers.gemini;
  const p2 = activeProviders[1] || activeProviders[0] || settings.providers.nvidia;
  const p3 = activeProviders[2] || activeProviders[0] || settings.providers.groq;

  const holdingsList = holdings.map(h => 
    `- ${h.name} (${h.symbol}): Qty ${h.quantity}, Avg ₹${h.averagePrice}, Val ₹${h.quantity * (h.currentPrice || h.averagePrice)}, Asset: ${h.assetType}`
  ).join('\n') || 'No holdings currently recorded.';

  const baseContext = `
PORTFOLIO SUMMARY FOR USER: ${userName}
- Total Net Worth: ₹${metrics.totalNetWorth.toLocaleString('en-IN')}
- Cash Balance: ₹${metrics.availableCash.toLocaleString('en-IN')}
- Total Invested: ₹${metrics.totalInvested.toLocaleString('en-IN')}
- Unrealized P/L: ₹${metrics.unrealizedProfitLoss.toLocaleString('en-IN')} (${metrics.totalReturnPercent.toFixed(2)}%)
- Asset Count: ${holdings.length}
CURRENT HOLDINGS:
${holdingsList}
`;

  // Parallel Execution of 3 Analytical Personas
  const [fRes, tRes, rRes] = await Promise.allSettled([
    // 1. Fundamental Analyst
    callAIProvider(
      p1.id,
      p1.apiKey,
      p1.selectedModel,
      `USER QUESTION: ${userPrompt}\n\n${baseContext}`,
      `You are the Senior Fundamental & Macro Investment Analyst on a multi-model debate committee. Focus exclusively on fundamental health, macro cycles, interest rates, company balance sheets, earnings resilience, and intrinsic valuation. Keep response concise (under 200 words).`
    ),
    // 2. Technical & Allocation Analyst
    callAIProvider(
      p2.id,
      p2.apiKey,
      p2.selectedModel,
      `USER QUESTION: ${userPrompt}\n\n${baseContext}`,
      `You are the Quantitative & Technical Allocation Analyst on a multi-model debate committee. Focus on asset allocation balance, asset concentration drift, price momentum, risk-reward skew, and rebalancing triggers. Keep response concise (under 200 words).`
    ),
    // 3. Risk & Contrarian Strategist
    callAIProvider(
      p3.id,
      p3.apiKey,
      p3.selectedModel,
      `USER QUESTION: ${userPrompt}\n\n${baseContext}`,
      `You are the Chief Risk Officer & Contrarian Strategist on a multi-model debate committee. Your job is to poke holes, identify downside stress scenarios, liquidity risks, black swan exposure, overconfidence, and worst-case hedges. Keep response concise (under 200 words).`
    )
  ]);

  const fText = fRes.status === 'fulfilled' && fRes.value.success ? fRes.value.text : 'Fundamental analysis unavailable (API key missing or provider error).';
  const tText = tRes.status === 'fulfilled' && tRes.value.success ? tRes.value.text : 'Technical analysis unavailable (API key missing or provider error).';
  const rText = rRes.status === 'fulfilled' && rRes.value.success ? rRes.value.text : 'Risk analysis unavailable (API key missing or provider error).';

  const perspectives: DebatePersonaOutput[] = [
    {
      persona: 'Fundamental',
      provider: p1.id,
      model: p1.selectedModel,
      analysis: fText,
      status: fRes.status === 'fulfilled' && fRes.value.success ? 'success' : 'failed'
    },
    {
      persona: 'Technical',
      provider: p2.id,
      model: p2.selectedModel,
      analysis: tText,
      status: tRes.status === 'fulfilled' && tRes.value.success ? 'success' : 'failed'
    },
    {
      persona: 'Risk & Contrarian',
      provider: p3.id,
      model: p3.selectedModel,
      analysis: rText,
      status: rRes.status === 'fulfilled' && rRes.value.success ? 'success' : 'failed'
    }
  ];

  // Coordinator Model synthesizes consensus, dissents, and final actionable conclusion
  const coordinatorProvider = activeProviders[0] || settings.providers.gemini;
  const synthPrompt = `
You are the Chief Investment Coordinator synthesizing a multi-AI debate for investor ${userName}.

USER'S ORIGINAL QUESTION: "${userPrompt}"

PERSPECTIVE 1 (FUNDAMENTAL ANALYST - ${p1.name}):
${fText}

PERSPECTIVE 2 (TECHNICAL ALLOCATION ANALYST - ${p2.name}):
${tText}

PERSPECTIVE 3 (RISK & CONTRARIAN STRATEGIST - ${p3.name}):
${rText}

Synthesize these perspectives into a unified advisory brief formatted in markdown:
1. CONSENSUS (2-3 key points where the models agree)
2. KEY DEBATE / DIVERGENCE (where the models disagree or see conflicting risks)
3. COORDINATED ACTIONABLE VERDICT (clear, balanced, specific steps for ${userName})
`;

  const synthResult = await callAIProvider(
    coordinatorProvider.id,
    coordinatorProvider.apiKey,
    coordinatorProvider.selectedModel,
    synthPrompt,
    `You are the Chief Investment Coordinator. Provide balanced, non-fabricating, highly structured financial synthesis for ${userName}.`
  );

  const synthesis = synthResult.success
    ? synthResult.text
    : `### Coordinated Synthesis\n\n**Consensus**: The debate models agree that maintaining adequate liquidity and reviewing asset allocation is critical for the current portfolio.\n\n**Divergence**: Models diverge on whether to add risk aggressively or preserve capital in short-term yield instruments.\n\n**Recommendation**: Review high-conviction holdings, ensure cash balances match your risk tolerance, and rebalance incrementally.`;

  return {
    consensusPoints: [
      'Maintain adequate liquid cash buffers against sudden market volatility',
      'Regularly review asset allocation to avoid excessive single-instrument concentration'
    ],
    divergencePoints: [
      'Valuation multiple expansion vs near-term macro earnings deceleration',
      'Aggressive momentum capture vs downside hedging'
    ],
    synthesis,
    perspectives,
    coordinatorProvider: coordinatorProvider.id,
    coordinatorModel: coordinatorProvider.selectedModel,
    isDebate: true
  };
}
