import React from 'react';
import { 
  LayoutDashboard, 
  Briefcase, 
  TrendingUp, 
  PieChart, 
  Coins, 
  ShieldCheck, 
  Eye, 
  Globe, 
  BarChart3, 
  Bot, 
  FileSpreadsheet, 
  Settings, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Zap,
  BookOpen
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', code: '01', icon: LayoutDashboard },
  { id: 'portfolio', label: 'Portfolio', code: '02', icon: Briefcase },
  { id: 'ledger', label: 'Investment Ledger', code: '03', icon: BookOpen, badge: 'AUDIT' },
  { id: 'stocks', label: 'Stocks', code: '04', icon: TrendingUp },
  { id: 'mutual_funds', label: 'Mutual Funds', code: '05', icon: PieChart },
  { id: 'gold', label: 'Gold', code: '06', icon: Coins },
  { id: 'silver', label: 'Silver', code: '07', icon: ShieldCheck },
  { id: 'watchlist', label: 'Watchlist', code: '08', icon: Eye },
  { id: 'intelligence', label: 'Market Intelligence', code: '09', icon: Globe },
  { id: 'analytics', label: 'Analytics', code: '10', icon: BarChart3 },
  { id: 'ai_advisor', label: 'AI Advisor', code: '11', icon: Bot, badge: 'CYBER' },
  { id: 'reports', label: 'Reports', code: '12', icon: FileSpreadsheet },
  { id: 'settings', label: 'Settings', code: '13', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
}) => {
  const { user, logout } = useAuth();

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 z-40 bg-[#0E1422]/95 backdrop-blur-xl border-r border-gray-800/60 transition-all duration-300 flex flex-col justify-between ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div>
        <div className="h-16 px-4 flex items-center justify-between border-b border-gray-800/60">
          {!isCollapsed ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold tracking-wider text-sm bg-gradient-to-r from-cyan-400 via-white to-violet-300 bg-clip-text text-transparent">
                  PORTFOLIO MANAGER
                </h1>
                <p className="text-[10px] text-cyan-400/80 tracking-widest font-mono uppercase">
                  WEALTH COMMAND
                </p>
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)]">
              <Zap className="w-5 h-5 text-white" />
            </div>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex p-1.5 rounded-lg bg-gray-800/40 text-gray-400 hover:text-cyan-400 hover:bg-gray-800 transition-colors"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-140px)]">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all group relative ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 to-violet-600/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <span className="text-[10px] font-mono text-gray-500 group-hover:text-cyan-400">
                  {item.code}
                </span>

                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-cyan-400 glow-text-cyan' : 'text-gray-400 group-hover:text-cyan-400'
                  }`}
                />

                {!isCollapsed && (
                  <span className="truncate flex-1 text-left">{item.label}</span>
                )}

                {!isCollapsed && item.badge && (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    {item.badge}
                  </span>
                )}

                {isActive && (
                  <div className="absolute right-0 top-2 bottom-2 w-1 rounded-l bg-cyan-400 shadow-[0_0_10px_#06B6D4]" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-gray-800/60 bg-[#0B0F17]/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'}
              alt={user.name || 'Yashwanth'}
              className="w-8 h-8 rounded-full border border-cyan-500/40 object-cover"
            />
            {!isCollapsed && (
              <div className="truncate">
                <p className="text-xs font-semibold text-gray-200 truncate">{user.name || 'Yashwanth'}</p>
                <p className="text-[10px] text-cyan-400 font-mono">{user.plan || 'PRO'}</p>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <button
              onClick={logout}
              className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-800/60 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
