import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { requestNotificationPermission, subscribeToPushNotifications } from '../lib/firebase';
import { Bell, BellRing, X, Check, MessageCircle, Package, DollarSign } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'message' | 'job' | 'payment' | 'system';
  timestamp: Date;
  read: boolean;
  data?: any;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAll: () => void;
  requestPermission: () => Promise<void>;
  permissionGranted: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      requestNotificationPermission(user.uid).then(token => {
        setPermissionGranted(!!token);
      });

      // Subscribe to foreground messages
      const unsubscribe = subscribeToPushNotifications(user.uid, (payload) => {
        const notification = payload.notification;
        if (notification) {
          addNotification({
            title: notification.title || 'New Notification',
            body: notification.body || '',
            type: payload.data?.type || 'system',
            data: payload.data
          });
        }
      });

      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [user]);

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false
    };

    setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep only last 50

    // Show browser notification if permission granted
    if (permissionGranted && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.body,
        icon: '/icon.svg',
        tag: newNotification.id
      });
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const requestPermission = async () => {
    if (user?.uid) {
      const token = await requestNotificationPermission(user.uid);
      setPermissionGranted(!!token);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      clearNotification,
      clearAll,
      requestPermission,
      permissionGranted
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

export function NotificationDropdown() {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    clearNotification, 
    clearAll,
    requestPermission,
    permissionGranted 
  } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message': return <MessageCircle className="w-4 h-4" />;
      case 'job': return <Package className="w-4 h-4" />;
      case 'payment': return <DollarSign className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-neutral-600 dark:text-neutral-300 hover:text-primary transition-colors"
      >
        {unreadCount > 0 ? (
          <BellRing className="w-5 h-5" />
        ) : (
          <Bell className="w-5 h-5" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden z-50">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-neutral-900 dark:text-white">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
                <p className="text-neutral-500 dark:text-neutral-400">No notifications</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors ${
                    !notification.read ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      notification.type === 'message' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                      notification.type === 'job' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                      notification.type === 'payment' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' :
                      'bg-gray-100 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400'
                    }`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${
                            !notification.read ? 'text-neutral-900 dark:text-white' : 'text-neutral-700 dark:text-neutral-300'
                          }`}>
                            {notification.title}
                          </p>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                            {notification.body}
                          </p>
                          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-2">
                            {formatTime(notification.timestamp)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          {!notification.read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="p-1 text-primary hover:text-primary/80 transition-colors"
                              title="Mark as read"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={() => clearNotification(notification.id)}
                            className="p-1 text-neutral-400 hover:text-red-600 transition-colors"
                            title="Remove"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-4 border-t border-neutral-200 dark:border-neutral-800">
              <button
                onClick={clearAll}
                className="w-full text-center text-sm text-neutral-500 dark:text-neutral-400 hover:text-red-600 transition-colors"
              >
                Clear all notifications
              </button>
            </div>
          )}

          {!permissionGranted && (
            <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800">
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
                Enable push notifications to stay updated
              </p>
              <button
                onClick={requestPermission}
                className="w-full px-4 py-2 bg-primary text-white text-sm rounded-xl hover:bg-primary/90 transition-colors"
              >
                Enable Notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
