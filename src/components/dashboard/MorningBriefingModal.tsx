// src/components/dashboard/MorningBriefingModal.tsx
// Daily Indian Market Opening Briefing for Yashwanth

import React, { useState, useEffect } from 'react';
import {
  Sunrise,
  Volume2,
  VolumeX,
  RefreshCw,
  TrendingUp,
  Globe,
  Bell,
  CheckCircle2,
  Sparkles,
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { usePortfolio } from '../../context/PortfolioContext';
import { useAuth } from '../../context/AuthContext';
import {
  generateDailyMorningBriefing,
  type MorningBriefingData
} from '../../services/indianMarketService';
import { formatCurrency } from '../../utils/formatters';

interface MorningBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MorningBriefingModal: React.FC<MorningBriefingModalProps> = ({ isOpen, onClose }) => {
  const { holdings } = usePortfolio();
  const { user } = useAuth();

  const [briefing, setBriefing] = useState<MorningBriefingData>(() =>
    generateDailyMorningBriefing(holdings, user.name || 'Yashwanth')
  );
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Re-generate briefing on open or holdings update
  useEffect(() => {
    if (isOpen) {
      setBriefing(generateDailyMorningBriefing(holdings, user.name || 'Yashwanth'));
    }
  }, [isOpen, holdings, user.name]);

  // Clean up audio on unmount or close
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isOpen]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setBriefing(generateDailyMorningBriefing(holdings, user.name || 'Yashwanth'));
      setIsRefreshing(false);
    }, 600);
  };

  // Web Speech API text-to-speech
  const handleToggleAudio = () => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-speech audio playback is not supported in this browser.');
      return;
    }

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    const script = `Good morning ${user.name || 'Yashwanth'}. Here is your market opening briefing for ${briefing.generatedAt}. 
The overall market stance is ${briefing.overallSentiment}. 
GIFT Nifty is indicating a positive opening at ${briefing.giftNifty.points} points. 
In the US, major indices closed higher led by technology. 
Brent crude is at 74 dollars per barrel, and the dollar rupee is steady at 84 rupees and 38 paise. 
For your portfolio: ${briefing.holdingAlerts.join('. ')}. 
Have a successful trading and investing session.`;

    const utterance = new SpeechSynthesisUtterance(script);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    window.speechSynthesis.speak(utterance);
    setIsPlayingAudio(true);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Daily Market Opening Briefing" size="lg">
      <div className="space-y-5">
        {/* Header Bar */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-cyan-500/10 to-violet-500/10 border border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Sunrise className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-200">
                Pre-Market Executive Summary • {briefing.generatedAt}
              </div>
              <div className="text-[11px] text-gray-400 font-mono">
                Personalized for: <strong className="text-white">{user.name || 'Yashwanth'}</strong>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleAudio}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                isPlayingAudio
                  ? 'bg-amber-500 text-black border-amber-400 animate-pulse'
                  : 'bg-gray-800/80 hover:bg-gray-800 text-amber-300 border-amber-500/40'
              }`}
            >
              {isPlayingAudio ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span>{isPlayingAudio ? 'Stop Audio' : 'Listen Briefing'}</span>
            </button>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-gray-800/80 hover:bg-gray-800 text-gray-300 border border-gray-700 transition-all"
              title="Refresh Briefing"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Global Key Indicators Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800">
            <div className="text-[10px] text-gray-400">GIFT NIFTY</div>
            <div className="text-sm font-bold text-emerald-400 mt-0.5">
              {briefing.giftNifty.points}
            </div>
            <div className="text-[10px] text-emerald-400">+{briefing.giftNifty.percent}% early cue</div>
          </div>

          <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800">
            <div className="text-[10px] text-gray-400">US S&P 500</div>
            <div className="text-sm font-bold text-white mt-0.5">
              {briefing.usMarkets.sp500}
            </div>
            <div className="text-[10px] text-emerald-400">+0.38% overnight</div>
          </div>

          <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800">
            <div className="text-[10px] text-gray-400">BRENT CRUDE</div>
            <div className="text-sm font-bold text-cyan-300 mt-0.5">
              ${briefing.macroCues.crudeOil}
            </div>
            <div className="text-[10px] text-gray-400">Softening (benign)</div>
          </div>

          <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800">
            <div className="text-[10px] text-gray-400">USD / INR</div>
            <div className="text-sm font-bold text-white mt-0.5">
              ₹{briefing.macroCues.usdInr}
            </div>
            <div className="text-[10px] text-gray-400">Rangebound</div>
          </div>
        </div>

        {/* Indian Market Outlook Card */}
        <div className="p-4 rounded-2xl bg-[#0E1422]/80 border border-gray-800 space-y-2">
          <div className="text-xs font-bold text-cyan-300 flex items-center gap-1.5 font-sans">
            <Globe className="w-4 h-4 text-cyan-400" />
            <span>Market Sentiment & Outlook</span>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed font-sans">
            {briefing.indianOutlook}
          </p>
        </div>

        {/* Holding-Specific Morning Watch */}
        <div className="p-4 rounded-2xl bg-[#0E1422]/80 border border-gray-800 space-y-2.5">
          <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5 font-sans">
            <Bell className="w-4 h-4 text-amber-400" />
            <span>Today's Holding-Specific Radar ({holdings.length} assets monitored)</span>
          </div>
          <div className="space-y-1.5">
            {briefing.holdingAlerts.map((alert, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-gray-900/60 border border-gray-800/80 text-xs text-gray-200 flex items-start gap-2 font-sans"
              >
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span className="leading-snug">{alert}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scheduled Macro Events Today */}
        <div className="p-4 rounded-2xl bg-gray-900/40 border border-gray-800/60 space-y-2 text-xs">
          <div className="font-bold text-gray-400 font-mono text-[11px]">
            KEY MACRO EVENTS SCHEDULED FOR TODAY
          </div>
          <ul className="space-y-1 list-disc list-inside text-gray-300 font-sans">
            {briefing.keyEventsToday.map((ev, i) => (
              <li key={i}>{ev}</li>
            ))}
          </ul>
        </div>
      </div>
    </Modal>
  );
};
