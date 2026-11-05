import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext'
import { SettingsProvider } from './context/SettingsContext'
import { PortfolioProvider } from './context/PortfolioContext'
import { NotificationProvider } from './context/NotificationContext'
import { injectSpeedInsights } from '@vercel/speed-insights'

injectSpeedInsights()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <SettingsProvider>
        <PortfolioProvider>
          <NotificationProvider>
            <App />
          </NotificationProvider>
        </PortfolioProvider>
      </SettingsProvider>
    </AuthProvider>
  </StrictMode>,
)
