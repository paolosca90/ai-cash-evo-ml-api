import { useCallback, useMemo, useState } from 'react';

export interface NotificationItem {
  id: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export function useRealtimeNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isConnected, setIsConnected] = useState(true);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  const markAsRead = useCallback(async (ids?: string[]) => {
    setNotifications(prev => prev.map(n => (ids ? ids.includes(n.id) : true) ? { ...n, read: true } : n));
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const testNotification = useCallback(async () => {
    const id = Math.random().toString(36).slice(2);
    setNotifications(prev => [{
      id,
      type: 'system_alert',
      priority: 'low',
      title: 'Test Notifica',
      message: 'Questa è una notifica di test',
      timestamp: new Date().toISOString(),
      read: false,
    }, ...prev]);
  }, []);

  const refreshNotifications = useCallback(async () => {
    // no-op stub
    setIsConnected(true);
  }, []);

  return { notifications, unreadCount, isConnected, markAsRead, deleteNotification, testNotification, refreshNotifications };
}
