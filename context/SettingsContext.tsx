import React, { createContext, useContext, useState, useEffect } from 'react';
import type { AppSettings } from '../types';

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  finnhubKey: import.meta.env.VITE_FINNHUB_API_KEY || '',
  geminiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
  newsKey: import.meta.env.VITE_NEWS_API_KEY || '',
  currency: 'INR',
  theme: 'obsidian',
  isDemoMode: false, // Default to FALSE - real user portfolio!
  enableNotifications: true,
  autoRefreshInterval: 30,
  lastApiCheck: {
    status: 'unconfigured',
    message: 'Finnhub API connection not checked yet.',
    timestamp: ''
  }
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const stored = localStorage.getItem('portfolio_manager_settings') || localStorage.getItem('nexus_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_SETTINGS, ...parsed, isDemoMode: false };
      }
      return DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  useEffect(() => {
    localStorage.setItem('portfolio_manager_settings', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within SettingsProvider');
  return context;
};
