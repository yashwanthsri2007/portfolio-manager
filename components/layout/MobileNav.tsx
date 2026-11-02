import React, { useState } from 'react';
import {
  LayoutDashboard,
  Briefcase,
  TrendingUp,
  Eye,
  MoreHorizontal,
  PieChart,
  Coins,
  ShieldCheck,
  Globe,
  BarChart3,
  Bot,
  FileSpreadsheet,
  Settings,
  X,
  LucideIcon,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface MobileNavProps {
  activePage: string;
  onNavigate: (page: string) => void;
}

interface NavItemConfig {
  id: string;
  label: string;
  icon: LucideIcon;
}

const PRIMARY_NAV_ITEMS: NavItemConfig[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'portfolio', label: 'Portfolio', icon: Briefcase },
  { id: 'stocks', label: 'Stocks', icon: TrendingUp },
  { id: 'watchlist', label: 'Watchlist', icon: Eye },
  { id: 'more', label: 'More', icon: MoreHorizontal },
];

const MORE_NAV_ITEMS: NavItemConfig[] = [
  { id: 'ledger', label: 'Investment Ledger', icon: BookOpen },
  { id: 'mutual_funds', label: 'Mutual Funds', icon: PieChart },
  { id: 'gold', label: 'Gold Bullion', icon: Coins },
  { id: 'silver', label: 'Silver Reserve', icon: ShieldCheck },
  { id: 'intelligence', label: 'Market Intelligence', icon: Globe },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'ai_advisor', label: 'AI Advisor', icon: Bot },
  { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const MobileNav: React.FC<MobileNavProps> = ({ activePage, onNavigate }) => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const primaryIds = PRIMARY_NAV_ITEMS.map((item) => item.id).filter((id) => id !== 'more');
  const isMoreActive = !primaryIds.includes(activePage);

  const handleSelect = (id: string) => {
    if (id === 'more') {
      setIsMoreOpen((prev) => !prev);
    } else {
      onNavigate(id);
      setIsMoreOpen(false);
    }
  };

  return (
    <>
      {/* Slide-up More Menu Drawer */}
      <AnimatePresence>
        {isMoreOpen && (
          <div className="fixed inset-0 z-40 md:hidden flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMoreOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="relative z-50 bg-[#111827] border-t border-gray-800 rounded-t-3xl p-5 pb-24 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-gray-800/80">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Additional Navigation
                </span>
                <button
                  onClick={() => setIsMoreOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-gray-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {MORE_NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activePage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                        isActive
                          ? 'bg-cyan-500/15 border border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                          : 'bg-gray-850/60 border border-gray-800 hover:bg-gray-800 text-gray-300'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-gray-400'}`} />
                      <span className="text-xs font-semibold">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Bottom Nav Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[#0E1422]/95 backdrop-blur-xl border-t border-gray-800/80 px-2 py-1.5 safe-area-bottom shadow-2xl">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {PRIMARY_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.id === 'more'
                ? isMoreActive || isMoreOpen
                : activePage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all ${
                  isActive ? 'text-cyan-400' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {/* Active Indicator Top Glow */}
                {isActive && (
                  <motion.span
                    layoutId="activeTabIndicator"
                    className="absolute -top-1.5 w-6 h-0.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.9)]"
                  />
                )}

                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                <span className="text-[10px] font-medium tracking-tight mt-1">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default MobileNav;
