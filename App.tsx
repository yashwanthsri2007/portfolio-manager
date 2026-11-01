import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from './context/AuthContext';
import { usePortfolio } from './context/PortfolioContext';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './components/auth/LoginPage';
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';
import { OverviewDashboard } from './components/dashboard/OverviewDashboard';
import { PortfolioPage } from './components/portfolio/PortfolioPage';
import { StocksPage } from './components/stocks/StocksPage';
import { StockAnalysis } from './components/stocks/StockAnalysis';
import { MutualFundsPage } from './components/mutualfunds/MutualFundsPage';
import { GoldDashboard } from './components/gold/GoldDashboard';
import { SilverDashboard } from './components/silver/SilverDashboard';
import { WatchlistPage } from './components/watchlist/WatchlistPage';
import { MarketIntelligence } from './components/market/MarketIntelligence';
import { AnalyticsPage } from './components/analytics/AnalyticsPage';
import { AIAdvisor } from './components/ai/AIAdvisor';
import { AIFloatingButton } from './components/ai/AIFloatingButton';
import { ReportsPage } from './components/reports/ReportsPage';
import { SettingsPage } from './components/settings/SettingsPage';
import { LedgerPage } from './components/ledger/LedgerPage';
import { AddHoldingModal } from './components/portfolio/AddHoldingModal';
import { CSVImportModal } from './components/portfolio/CSVImportModal';
import { PortfolioSetupModal } from './components/portfolio/PortfolioSetupModal';
import { CashManagementModal } from './components/portfolio/CashManagementModal';
import { RecordTransactionModal } from './components/ledger/RecordTransactionModal';
import type { Holding } from './types';

// Page transition variants
const pageVariants = {
  initial: { opacity: 0, y: 12, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -8, filter: 'blur(4px)' },
};

const pageTransition = {
  duration: 0.3,
  ease: 'easeOut' as const,
};

function App() {
  const { user } = useAuth();
  const { isFirstTimeUser } = usePortfolio();
  const [activePage, setActivePage] = useState<string>(() => {
    const hash = window.location.hash.replace('#', '');
    return hash || 'overview';
  });
  const [_pageData, setPageData] = useState<any>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isAddHoldingOpen, setIsAddHoldingOpen] = useState(false);
  const [isCSVImportOpen, setIsCSVImportOpen] = useState(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [isRecordTxModalOpen, setIsRecordTxModalOpen] = useState(false);
  const [editHolding, setEditHolding] = useState<Holding | undefined>(undefined);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [selectedStockSymbol, setSelectedStockSymbol] = useState<string | undefined>(undefined);

  // Sync hash on page change
  useEffect(() => {
    window.location.hash = activePage;
  }, [activePage]);

  // Listen for hash changes (browser back/forward)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) setActivePage(hash);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Check if onboarding or initial setup should show
  useEffect(() => {
    const hasOnboarded = localStorage.getItem('portfolio_manager_onboarded') || localStorage.getItem('nexus_onboarded');
    if (!hasOnboarded && user.isLoggedIn) {
      setShowOnboarding(true);
    } else if (isFirstTimeUser && user.isLoggedIn) {
      // If user hasn't configured initial portfolio & cash, prompt setup modal
      setIsSetupModalOpen(true);
    }
  }, [user.isLoggedIn, isFirstTimeUser]);

  const handleOnboardingComplete = () => {
    localStorage.setItem('portfolio_manager_onboarded', 'true');
    setShowOnboarding(false);
    if (isFirstTimeUser) {
      setIsSetupModalOpen(true);
    }
  };

  // Navigation handler that supports passing data (e.g. stock symbol)
  const handleNavigate = useCallback((page: string, data?: any) => {
    if (page === 'stocks' && data?.symbol) {
      setSelectedStockSymbol(data.symbol);
      setActivePage('stock_analysis');
    } else {
      setSelectedStockSymbol(undefined);
      setActivePage(page);
    }
    setPageData(data || null);
  }, []);

  // If user is not logged in, show login page
  if (!user.isLoggedIn) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="login"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <LoginPage />
        </motion.div>
      </AnimatePresence>
    );
  }

  // Render active page content
  const renderPage = () => {
    switch (activePage) {
      case 'overview':
        return (
          <OverviewDashboard
            onNavigate={handleNavigate}
            onOpenAddHolding={() => setIsAddHoldingOpen(true)}
            onOpenCSVImport={() => setIsCSVImportOpen(true)}
            onOpenCashModal={() => setIsCashModalOpen(true)}
            onOpenSetupModal={() => setIsSetupModalOpen(true)}
          />
        );
      case 'portfolio':
        return <PortfolioPage onNavigate={handleNavigate} />;
      case 'ledger':
        return (
          <LedgerPage
            onNavigate={handleNavigate}
            onOpenRecordTransaction={() => setIsRecordTxModalOpen(true)}
          />
        );
      case 'stocks':
        return <StocksPage onNavigate={handleNavigate} />;
      case 'stock_analysis':
        return (
          <StockAnalysis
            symbol={selectedStockSymbol}
            onNavigate={handleNavigate}
          />
        );
      case 'mutual_funds':
        return <MutualFundsPage onNavigate={handleNavigate} />;
      case 'gold':
        return <GoldDashboard onNavigate={handleNavigate} />;
      case 'silver':
        return <SilverDashboard onNavigate={handleNavigate} />;
      case 'watchlist':
        return <WatchlistPage onNavigate={handleNavigate} />;
      case 'intelligence':
        return <MarketIntelligence onNavigate={handleNavigate} />;
      case 'analytics':
        return <AnalyticsPage onNavigate={handleNavigate} />;
      case 'ai_advisor':
        return <AIAdvisor onNavigate={handleNavigate} />;
      case 'reports':
        return <ReportsPage onNavigate={handleNavigate} />;
      case 'settings':
        return <SettingsPage onNavigate={handleNavigate} />;
      default:
        return (
          <OverviewDashboard
            onNavigate={handleNavigate}
            onOpenAddHolding={() => setIsAddHoldingOpen(true)}
            onOpenCSVImport={() => setIsCSVImportOpen(true)}
            onOpenCashModal={() => setIsCashModalOpen(true)}
            onOpenSetupModal={() => setIsSetupModalOpen(true)}
          />
        );
    }
  };

  return (
    <>
      <AppShell
        activePage={activePage}
        onNavigate={handleNavigate}
        onOpenCashModal={() => setIsCashModalOpen(true)}
        onOpenSetupModal={() => setIsSetupModalOpen(true)}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activePage}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </AppShell>

      {/* Floating AI Chat Button (visible on all pages except ai_advisor) */}
      {activePage !== 'ai_advisor' && (
        <>
          <AIFloatingButton
            onClick={() => setIsAIChatOpen(!isAIChatOpen)}
            isOpen={isAIChatOpen}
          />
          <AnimatePresence>
            {isAIChatOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ duration: 0.2 }}
                className="fixed bottom-24 right-6 z-50 w-[380px] h-[520px] max-h-[70vh]"
              >
                <AIAdvisor onNavigate={handleNavigate} isFloating={true} />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Global Modals */}
      <AddHoldingModal
        isOpen={isAddHoldingOpen}
        onClose={() => {
          setIsAddHoldingOpen(false);
          setEditHolding(undefined);
        }}
        editHolding={editHolding}
      />

      <CSVImportModal
        isOpen={isCSVImportOpen}
        onClose={() => setIsCSVImportOpen(false)}
      />

      <PortfolioSetupModal
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
      />

      <CashManagementModal
        isOpen={isCashModalOpen}
        onClose={() => setIsCashModalOpen(false)}
      />

      <RecordTransactionModal
        isOpen={isRecordTxModalOpen}
        onClose={() => setIsRecordTxModalOpen(false)}
      />

      {/* Onboarding Wizard */}
      <OnboardingWizard
        isOpen={showOnboarding}
        onComplete={handleOnboardingComplete}
      />
    </>
  );
}

export default App;
