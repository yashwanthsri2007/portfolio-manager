import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Send,
  Sparkles,
  Zap,
  Shield,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Terminal,
  Cpu,
  Trash2,
  ExternalLink,
  Key,
  Radio,
  CheckCircle2
} from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { askCyberFinanceAI, testGeminiConnection, type AIAdvisorResponse } from '../../services/aiService';
import { formatCurrency, formatPercent } from '../../utils/formatters';

export interface AIAdvisorProps {
  onNavigate?: (page: string, data?: any) => void;
  isFloating?: boolean;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  source?: 'gemini' | 'heuristic';
  isLive?: boolean;
  model?: string;
  error?: string;
}

const QUICK_ACTIONS = [
  '🧪 Test Gemini Connection',
  'What is my current portfolio value?',
  'How much cash do I have available?',
  'What is my realized & unrealized P/L?',
  'Analyze my risk & diversification',
  'Summarize my investment ledger'
];

// Helper to render markdown-like text safely with styles
const FormattedMessage: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');

  return (
    <div className="space-y-1.5 text-xs sm:text-sm leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        // Section Headers
        if (trimmed.startsWith('###') || trimmed.startsWith('##') || trimmed.startsWith('===')) {
          const headerText = trimmed.replace(/^#+\s*|===/g, '').trim();
          return (
            <h4 key={idx} className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-300 pt-1 pb-0.5 border-b border-cyan-500/20">
              {headerText}
            </h4>
          );
        }

        // Bullet points
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const bulletText = trimmed.substring(2);
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="text-cyan-400 mt-1 shrink-0 font-bold">•</span>
              <span dangerouslySetInnerHTML={{
                __html: bulletText.replace(/\*\*(.*?)\*\*/g, '<strong class="text-cyan-200 font-semibold">$1</strong>')
              }} />
            </div>
          );
        }

        // Numbered list
        const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numberedMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="text-violet-400 font-mono font-bold shrink-0">{numberedMatch[1]}.</span>
              <span dangerouslySetInnerHTML={{
                __html: numberedMatch[2].replace(/\*\*(.*?)\*\*/g, '<strong class="text-violet-200 font-semibold">$1</strong>')
              }} />
            </div>
          );
        }

        // Regular paragraph with bold replacement
        return (
          <p key={idx} dangerouslySetInnerHTML={{
            __html: trimmed.replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-100 font-semibold">$1</strong>')
          }} />
        );
      })}
    </div>
  );
};

export const AIAdvisor: React.FC<AIAdvisorProps> = ({ onNavigate, isFloating = false }) => {
  const { user } = useAuth();
  const { metrics, holdings } = usePortfolio();
  const { settings } = useSettings();

  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [telemetryState, setTelemetryState] = useState<'checking' | 'online' | 'offline'>('checking');
  const [telemetryMessage, setTelemetryMessage] = useState<string>('Verifying neural connection...');
  const [isPinging, setIsPinging] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initial welcome message
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'msg-welcome',
      sender: 'ai',
      text: `### PORTFOLIO MANAGER AI
Hello **${user.name || 'Yashwanth'}**! I am your personal wealth intelligence advisor.

- **Total Net Worth**: **${formatCurrency(metrics.totalNetWorth, settings.currency)}**
- **Available Liquid Cash**: **${formatCurrency(metrics.availableCash, settings.currency)}**
- **Holdings**: **${holdings.length} assets** (Valuation: ${formatCurrency(metrics.holdingsValue, settings.currency)})
- **Diversification Health**: **${metrics.diversificationScore}/100**

Ask any question about your assets, risk concentration, ledger history, or click **Test Gemini Connection** below to verify live inference.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      source: 'heuristic'
    }
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Check actual Gemini connection state
  const checkTelemetry = useCallback(async () => {
    setTelemetryState('checking');
    try {
      const res = await testGeminiConnection(settings.geminiKey);
      if (res.success) {
        setTelemetryState('online');
        setTelemetryMessage(res.message);
      } else {
        setTelemetryState('offline');
        setTelemetryMessage(res.message);
      }
    } catch {
      setTelemetryState('offline');
      setTelemetryMessage('Could not reach Gemini neural endpoint.');
    }
  }, [settings.geminiKey]);

  useEffect(() => {
    checkTelemetry();
  }, [checkTelemetry]);

  // Manual ping test from header button
  const handlePingTest = async () => {
    setIsPinging(true);
    const start = Date.now();
    try {
      const res = await testGeminiConnection(settings.geminiKey);
      if (res.success) {
        setTelemetryState('online');
        setTelemetryMessage(res.message);
        setMessages(prev => [
          ...prev,
          {
            id: `test_${Date.now()}`,
            sender: 'ai',
            text: `### 🧪 GEMINI AI TELEMETRY TEST SUCCESSFUL
- **Neural Model**: **gemini-3.8-flash**
- **Response Latency**: **${res.latency || Date.now() - start}ms**
- **Live Response**: "${res.preview || 'PONG'}"
- **Status**: Live Google Gemini inference is active and verified!`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            source: 'gemini',
            isLive: true,
            model: 'gemini-3.8-flash'
          }
        ]);
      } else {
        setTelemetryState('offline');
        setTelemetryMessage(res.message);
        setMessages(prev => [
          ...prev,
          {
            id: `test_${Date.now()}`,
            sender: 'ai',
            text: `### ⚠️ GEMINI AI CONNECTION TEST FAILED
- **Error**: ${res.message}
- **Operating Mode**: Operating in **verified local heuristic mode** using your real portfolio data.
- **Remedy**: Update your Gemini API key in Settings or add \`GEMINI_API_KEY\` to your \`.env\` file.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            source: 'heuristic',
            error: res.message
          }
        ]);
      }
    } catch (err: any) {
      setTelemetryState('offline');
      setTelemetryMessage(err?.message || 'Connection failed');
    } finally {
      setIsPinging(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || inputPrompt).trim();
    if (!prompt || isLoading) return;

    if (prompt === '🧪 Test Gemini Connection') {
      await handlePingTest();
      setInputPrompt('');
      return;
    }

    const userMessage: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputPrompt('');
    setIsLoading(true);

    try {
      const response: AIAdvisorResponse = await askCyberFinanceAI(
        prompt,
        metrics,
        holdings,
        settings.geminiKey,
        user.name || 'Yashwanth'
      );

      if (response.isLive) {
        setTelemetryState('online');
      } else if (response.error) {
        setTelemetryState('offline');
      }

      const aiMessage: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: response.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: response.source,
        isLive: response.isLive,
        model: response.model,
        error: response.error
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `err_${Date.now()}`,
        sender: 'ai',
        text: `### TELEMETRY ERROR
Could not complete inference: ${err?.message || 'Network error'}.
Please verify your Gemini API key in Settings or review your network connection.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'heuristic',
        error: err?.message
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: `clear_${Date.now()}`,
        sender: 'ai',
        text: '### SESSION RESET\nChat log cleared. Enter any question or select an intelligence chip below.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  return (
    <div className={`flex flex-col ${isFloating ? 'h-[580px]' : 'h-[calc(100vh-8.5rem)]'} max-w-5xl mx-auto space-y-4 pb-4`}>
      {/* Advisor Header */}
      <div className="glass-card p-4 rounded-2xl border border-white/[0.08] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(6,182,212,0.5)]">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black tracking-wider text-gray-100">
                CYBERFINANCE <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">AI</span>
              </h2>

              {/* Dynamic verified status pill */}
              {telemetryState === 'online' && (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#10B981]" />
                  Gemini 3.8 Flash • Live
                </span>
              )}
              {telemetryState === 'offline' && (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30" title={telemetryMessage}>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Offline • Heuristic Mode
                </span>
              )}
              {telemetryState === 'checking' && (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                  Checking Telemetry...
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-400 font-mono">Portfolio Intelligence Engine • Verified Neural Architecture</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Test Connection Button */}
          <button
            onClick={handlePingTest}
            disabled={isPinging}
            title="Test Gemini AI Connection"
            className="px-2.5 py-1.5 rounded-xl bg-gray-900/60 hover:bg-gray-800 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <Radio className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isPinging ? 'Pinging...' : 'Test Connection'}</span>
          </button>

          <button
            onClick={clearChat}
            title="Clear Chat Log"
            className="p-2 rounded-xl bg-gray-900/60 hover:bg-gray-800 text-gray-400 hover:text-red-400 border border-white/[0.05] transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          {onNavigate && (
            <button
              onClick={() => onNavigate('settings')}
              title="Configure API Keys"
              className="p-2 rounded-xl bg-gray-900/60 hover:bg-gray-800 text-gray-400 hover:text-cyan-400 border border-white/[0.05] transition-all"
            >
              <Key className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Offline API Key Warning Banner if not live */}
      {telemetryState === 'offline' && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-amber-300 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              {telemetryMessage || 'Gemini API is not connected. Operating in verified local heuristic mode using your real portfolio records.'}
            </span>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('settings')}
              className="ml-2 font-mono underline font-bold hover:text-amber-200 shrink-0"
            >
              Settings →
            </button>
          )}
        </div>
      )}

      {/* Chat Messages Container */}
      <div className="flex-1 overflow-y-auto glass-card rounded-2xl p-4 space-y-4 border border-white/[0.08] shadow-inner">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] md:max-w-[75%] p-4 rounded-2xl shadow-lg transition-all ${
                  isUser
                    ? 'bg-gradient-to-r from-cyan-600/30 to-cyan-500/20 text-cyan-50 border border-cyan-500/40 rounded-tr-none'
                    : 'glass-card bg-[#111827]/85 text-gray-200 border-white/[0.1] rounded-tl-none shadow-[0_4px_20px_rgba(0,0,0,0.3)]'
                }`}
              >
                {!isUser && (
                  <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-gray-800 text-[11px] font-mono">
                    <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>CyberFinance AI</span>
                    </div>

                    {/* Source Badge */}
                    {msg.source === 'gemini' && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Gemini 3.8 Flash (Live)
                      </span>
                    )}
                    {msg.source === 'heuristic' && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        Local Heuristic Ledger
                      </span>
                    )}
                  </div>
                )}

                <FormattedMessage text={msg.text} />

                {/* Display specific error details if any */}
                {msg.error && (
                  <div className="mt-2.5 p-2 rounded-lg bg-red-950/30 border border-red-500/30 text-[11px] text-red-300 flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                    <span>{msg.error}</span>
                  </div>
                )}

                <div
                  className={`mt-2 text-[10px] font-mono text-right ${
                    isUser ? 'text-cyan-300/60' : 'text-gray-500'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* Typing Indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-3.5 rounded-2xl glass-card max-w-xs border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
          >
            <div className="w-6 h-6 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400 animate-spin">
              <Cpu className="w-3.5 h-3.5" />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-mono text-cyan-300">Synthesizing telemetry...</div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Action Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar shrink-0">
        {QUICK_ACTIONS.map((action, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(action)}
            disabled={isLoading}
            className={`px-3 py-1.5 rounded-xl border text-[11px] font-medium transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 disabled:opacity-50 ${
              action.startsWith('🧪')
                ? 'bg-violet-950/60 hover:bg-violet-900/60 border-violet-500/50 text-violet-200'
                : 'bg-gray-900/80 hover:bg-cyan-950/60 hover:border-cyan-500/50 border-white/[0.07] text-gray-300 hover:text-cyan-300'
            }`}
          >
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>{action}</span>
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <div className="glass-card p-2 rounded-2xl border border-white/[0.08] flex items-center gap-2 shrink-0">
        <input
          type="text"
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask CyberFinance AI anything about your assets, risk, or returns..."
          disabled={isLoading}
          className="flex-1 bg-transparent px-3 py-2 text-xs sm:text-sm text-gray-100 placeholder-gray-500 focus:outline-none"
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={isLoading || !inputPrompt.trim()}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-black font-bold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Send</span>
        </button>
      </div>

      {/* Disclaimer */}
      <div className="text-center text-[10px] text-gray-500 font-mono shrink-0">
        AI insights are informational only. Not financial advice. Always verify with certified investment advisors.
      </div>
    </div>
  );
};

export default AIAdvisor;
