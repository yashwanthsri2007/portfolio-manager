// src/components/ai/AIDebateDrawer.tsx
// Multi-AI Debate Comparison Drawer: Side-by-side perspectives, consensus, and synthesis

import React from 'react';
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Brain,
  ShieldAlert,
  TrendingUp,
  X,
  Sparkles
} from 'lucide-react';
import { Modal } from '../common/Modal';
import type { MultiAIDebateResult } from '../../services/multiAiService';

interface AIDebateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  debateData: MultiAIDebateResult | null;
}

export const AIDebateDrawer: React.FC<AIDebateDrawerProps> = ({
  isOpen,
  onClose,
  debateData
}) => {
  if (!debateData) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Multi-AI Committee Debate & Consensus Analysis"
      size="xl"
    >
      <div className="space-y-6">
        {/* Consensus & Divergence Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Consensus */}
          <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 font-sans">
              <CheckCircle2 className="w-4 h-4" />
              <span>Points of Committee Consensus</span>
            </div>
            <ul className="space-y-1.5 text-xs text-gray-300 font-sans">
              {debateData.consensusPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Divergence */}
          <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-2">
            <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5 font-sans">
              <AlertTriangle className="w-4 h-4" />
              <span>Points of Dissent & Conflict</span>
            </div>
            <ul className="space-y-1.5 text-xs text-gray-300 font-sans">
              {debateData.divergencePoints.map((point, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 3 Perspectives Grid */}
        <div className="space-y-2">
          <div className="text-xs font-mono text-gray-400 uppercase tracking-wider">
            Individual AI Model Perspectives
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {debateData.perspectives.map((p, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-[#0E1422]/90 border border-gray-800 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                      {p.persona === 'Fundamental' ? (
                        <Brain className="w-4 h-4 text-cyan-400" />
                      ) : p.persona === 'Technical' ? (
                        <TrendingUp className="w-4 h-4 text-violet-400" />
                      ) : (
                        <ShieldAlert className="w-4 h-4 text-rose-400" />
                      )}
                      <span>{p.persona}</span>
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
                      {p.provider}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono mt-0.5 truncate">
                    Model: {p.model}
                  </div>

                  <p className="text-xs text-gray-300 mt-3 leading-relaxed whitespace-pre-wrap font-sans">
                    {p.analysis}
                  </p>
                </div>

                <div className="pt-2 border-t border-gray-800/60 flex items-center justify-between text-[10px] font-mono text-gray-500">
                  <span>Status: Verified</span>
                  <span className="text-emerald-400">Audited</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Synthesized Coordinator Verdict */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-gray-900/90 to-violet-950/40 border border-cyan-500/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Coordinated Advisory Verdict</span>
            </div>
            <div className="text-[11px] font-mono text-cyan-400">
              Coordinator: {debateData.coordinatorProvider.toUpperCase()} ({debateData.coordinatorModel})
            </div>
          </div>

          <div className="text-xs text-gray-200 leading-relaxed font-sans prose prose-invert max-w-none">
            <p className="whitespace-pre-wrap">{debateData.synthesis}</p>
          </div>
        </div>
      </div>
    </Modal>
  );
};
