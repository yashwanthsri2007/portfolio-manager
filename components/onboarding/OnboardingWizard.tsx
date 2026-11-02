import React, { useState } from 'react';
import { Zap, ArrowRight, ShieldCheck, Database, Sliders, Bot, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';

export interface OnboardingWizardProps {
  isOpen: boolean;
  onComplete: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ isOpen, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      title: 'Welcome to Portfolio Manager',
      subtitle: 'See your entire financial universe.',
      description: 'Your personal wealth management system with real-time Finnhub telemetry, cash management, weekly & monthly investment ledgers, and CyberFinance AI.',
      icon: Zap,
      accent: 'from-cyan-500 to-violet-600'
    },
    {
      title: 'Step 1: Add Your Holdings',
      subtitle: 'Stocks, Mutual Funds, Gold & Silver',
      description: 'Import broker CSV statements (Zerodha, Groww, Generic) or manually add holdings to construct your unified portfolio net worth.',
      icon: Database,
      accent: 'from-emerald-500 to-cyan-600'
    },
    {
      title: 'Step 2: Connect Market Data',
      subtitle: 'Finnhub & Indian MF API Integration',
      description: 'Configure custom API keys in Settings or rely on automated market data proxies to fetch live stock prices, 52W ranges, and mutual fund NAVs.',
      icon: ShieldCheck,
      accent: 'from-violet-500 to-purple-600'
    },
    {
      title: 'Step 3: Financial Intelligence',
      subtitle: 'CYBERFINANCE AI Advisor',
      description: 'Interact with our floating AI assistant powered by Google Gemini (gemini-3.8-flash) to evaluate concentration risk, top gainers, and sector exposure.',
      icon: Bot,
      accent: 'from-amber-500 to-orange-600'
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {
        // ignore
      }
      onComplete();
    }
  };

  const StepIcon = steps[currentStep].icon;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="w-full max-w-lg glass-card border-cyan-500/30 rounded-3xl p-8 shadow-[0_0_60px_rgba(6,182,212,0.25)] relative overflow-hidden">
        {/* Background Ambient Radial */}
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Step Progress Dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentStep
                  ? 'w-8 bg-cyan-400 shadow-[0_0_10px_#06B6D4]'
                  : idx < currentStep
                  ? 'w-3 bg-emerald-400'
                  : 'w-3 bg-gray-800'
              }`}
            />
          ))}
        </div>

        {/* Hero Icon */}
        <div className="flex justify-center mb-6">
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${steps[currentStep].accent} flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.4)]`}>
            <StepIcon className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Content */}
        <div className="text-center space-y-3 mb-8">
          <h2 className="text-xl font-bold text-gray-100">{steps[currentStep].title}</h2>
          <p className="text-xs font-mono text-cyan-400 uppercase tracking-widest">{steps[currentStep].subtitle}</p>
          <p className="text-sm text-gray-400 leading-relaxed max-w-sm mx-auto">
            {steps[currentStep].description}
          </p>
        </div>

        {/* Bottom Button */}
        <button
          onClick={handleNext}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-bold text-sm shadow-[0_0_25px_rgba(6,182,212,0.35)] transition-all flex items-center justify-center gap-2 group"
        >
          <span>{currentStep === steps.length - 1 ? 'Enter Command Center' : 'Continue Step'}</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};
