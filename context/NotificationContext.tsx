import React, { createContext, useContext, useState, useEffect } from 'react';
import { NotificationItem } from '../types';

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addNotification: (n: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => void;
  clearNotifications: () => void;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n-1',
    title: 'Market Movement Alert',
    message: 'Reliance Industries moved +1.54% today following green energy announcement.',
    timestamp: '10 minutes ago',
    type: 'info',
    read: false
  },
  {
    id: 'n-2',
    title: 'Gold Price Record',
    message: 'Gold reached ₹74,500 per 10g (+0.61% today). Your gold holdings updated.',
    timestamp: '1 hour ago',
    type: 'success',
    read: false
  },
  {
    id: 'n-3',
    title: 'Sector Allocation Warning',
    message: 'Your IT sector exposure is currently 24.5%. Consider rebalancing into metals or banking.',
    timestamp: '3 hours ago',
    type: 'warning',
    read: false
  },
  {
    id: 'n-4',
    title: 'Monthly Report Ready',
    message: 'Your Portfolio Manager monthly portfolio PDF report is ready for download.',
    timestamp: 'Yesterday',
    type: 'info',
    read: true
  }
];

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const stored = localStorage.getItem('portfolio_manager_notifications') || localStorage.getItem('nexus_notifications');
      return stored ? JSON.parse(stored) : INITIAL_NOTIFICATIONS;
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  });

  useEffect(() => {
    localStorage.setItem('portfolio_manager_notifications', JSON.stringify(notifications));
  }, [notifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const addNotification = (n: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => {
    const item: NotificationItem = {
      ...n,
      id: `n_${Date.now()}`,
      timestamp: 'Just now',
      read: false
    };
    setNotifications(prev => [item, ...prev]);
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      addNotification,
      clearNotifications
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within NotificationProvider');
  return context;
};
