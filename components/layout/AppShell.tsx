import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import { GlobalSearchModal } from './GlobalSearchModal';
import { NotificationDrawer } from './NotificationDrawer';
import ParticleBackground from '../common/ParticleBackground';

export interface AppShellProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
  onOpenCashModal?: () => void;
  onOpenSetupModal?: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  activePage,
  onNavigate,
  onOpenCashModal,
  onOpenSetupModal,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);

  // Global Ctrl+K / Cmd+K listener to open search modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-[#0B0F17] text-gray-100 flex flex-col relative overflow-x-hidden selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* Desktop Sidebar (hidden on mobile) */}
      <div className="hidden md:block">
        <Sidebar
          activeTab={activePage}
          setActiveTab={onNavigate}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
        />
      </div>

      {/* Main Layout Area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
          isCollapsed ? 'md:ml-20' : 'md:ml-64'
        } ml-0 pb-16 md:pb-0`}
      >
        {/* Header Bar */}
        <Header
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onOpenCashModal={onOpenCashModal}
          onOpenSetupModal={onOpenSetupModal}
        />

        {/* Content Area with Cyber Grid Pattern & Ambient Particles */}
        <main className="relative flex-1 p-4 sm:p-6 lg:p-8 bg-cyber-grid min-h-[calc(100vh-4rem)]">
          <ParticleBackground />
          <div className="relative z-10 max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation (shown only below md) */}
      <MobileNav activePage={activePage} onNavigate={onNavigate} />

      {/* Global Modals & Drawers */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectNav={(tab) => {
          onNavigate(tab);
          setIsSearchOpen(false);
        }}
      />

      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />
    </div>
  );
};

export default AppShell;
