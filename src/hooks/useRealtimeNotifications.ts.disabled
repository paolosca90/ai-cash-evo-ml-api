import { useEffect, useState, useCallback } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface NotificationData {
  id: string;
  user_id: string;
  type: 'trade_update' | 'system_alert' | 'connection_status';
  title: string;
  message: string;
  data?: NotificationDataPayload;
  priority: 'low' | 'medium' | 'high' | 'critical';
  read: boolean;
  created_at: string;
  read_at?: string;
}

interface NotificationDataPayload {
  symbol?: string;
  action?: string;
  amount?: number;
  profit?: number;
  details?: Record<string, unknown>;
}

interface TradeUpdatePayload {
  order_id?: string;
  position_id?: string;
  entry_price?: number;
  exit_price?: number;
  volume?: number;
  stop_loss?: number;
  take_profit?: number;
  duration?: number;
  strategy?: string;
  confidence?: number;
}

export interface TradeUpdateData {
  event_type: 'trade_opened' | 'trade_closed' | 'trade_modified' | 'trade_timeout' | 'heartbeat';
  timestamp: string;
  client_id: string;
  symbol?: string;
  order_type?: 'BUY' | 'SELL';
  profit?: number;
  user_id: string;
  data: TradeUpdatePayload;
}

export function useRealtimeNotifications() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();

  // Carica le notifiche esistenti
  const loadNotifications = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications((data || []).map(item => ({
        ...item,
        type: item.type as 'connection_status' | 'system_alert' | 'trade_update',
        priority: item.priority as 'low' | 'medium' | 'high' | 'critical'
      })));
      setUnreadCount(data?.filter(n => !n.read).length || 0);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }, []);

  // Iscriviti alle notifiche real-time
  useEffect(() => {
    let notificationChannel: RealtimeChannel;
    let dashboardChannel: RealtimeChannel;

    const setupSubscriptions = async () => {
      // Canale per notifiche utente specifiche
      notificationChannel = supabase
        .channel(`user_notifications:${supabase.auth.getUser()?.then(u => u.data.user?.id) || 'anonymous'}`)
        .on('broadcast', { event: 'notification' }, (payload) => {
          console.log('📡 Received real-time notification:', payload);

          const notification = payload.payload as NotificationData;

          // Aggiungi alla lista delle notifiche
          setNotifications(prev => [notification, ...prev.slice(0, 49)]);

          // Aggiorna contatore non letti
          if (!notification.read) {
            setUnreadCount(prev => prev + 1);
          }

          // Mostra toast notification
          const getNotificationIcon = (type: string) => {
            switch (type) {
              case 'trade_update': return '📊';
              case 'system_alert': return '⚠️';
              case 'connection_status': return '🔌';
              default: return '📢';
            }
          };

          const getToastVariant = (priority: string) => {
            switch (priority) {
              case 'critical': return 'destructive';
              case 'high': return 'destructive';
              case 'medium': return 'default';
              case 'low': return 'secondary';
              default: return 'default';
            }
          };

          toast({
            title: `${getNotificationIcon(notification.type)} ${notification.title}`,
            description: notification.message,
            variant: getToastVariant(notification.priority) as "default" | "destructive",
            duration: notification.priority === 'critical' ? 10000 : 5000,
          });

          // Richiedi permesso per notifiche browser se non già concesso
          if (notification.priority === 'high' || notification.priority === 'critical') {
            requestBrowserNotification(notification);
          }
        })
        .subscribe((status) => {
          console.log('🔔 Notification channel status:', status);
          setIsConnected(status === 'SUBSCRIBED');
        });

      // Canale per aggiornamenti dashboard (globale)
      dashboardChannel = supabase
        .channel('trading_dashboard')
        .on('broadcast', { event: 'trade_update' }, (payload) => {
          console.log('📊 Received dashboard update:', payload);

          const tradeUpdate = payload.payload as TradeUpdateData;

          // Aggiorna la dashboard o mostra un update più discreto
          if (tradeUpdate.event_type === 'trade_closed' && tradeUpdate.profit) {
            const isProfit = tradeUpdate.profit > 0;
            const emoji = isProfit ? '🎉' : '😔';
            const action = isProfit ? 'Profitto' : 'Perdita';

            toast({
              title: `${emoji} ${action} su ${tradeUpdate.symbol}`,
              description: `${tradeUpdate.order_type} - €${Math.abs(tradeUpdate.profit).toFixed(2)}`,
              variant: isProfit ? 'default' : 'destructive',
              duration: 3000,
            });
          }
        })
        .subscribe();
    };

    setupSubscriptions();

    // Carica notifiche esistenti
    loadNotifications();

    return () => {
      if (notificationChannel) {
        supabase.removeChannel(notificationChannel);
      }
      if (dashboardChannel) {
        supabase.removeChannel(dashboardChannel);
      }
    };
  }, [loadNotifications, toast]);

  // Funzione per richiedere notifiche browser
  const requestBrowserNotification = (notification: NotificationData) => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `trade-${notification.id}`,
        requireInteraction: notification.priority === 'critical',
      });
    }
  };

  // Funzione per marcare notifiche come lette
  const markAsRead = useCallback(async (notificationIds?: string[]) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) return;

      const { error } = await supabase
        .from('user_notifications')
        .update({ 
          read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('user_id', userId)
        .in('id', notificationIds || []);

      if (error) throw error;

      // Aggiorna stato locale
      if (notificationIds) {
        setNotifications(prev =>
          prev.map(n =>
            notificationIds.includes(n.id) ? { ...n, read: true, read_at: new Date().toISOString() } : n
          )
        );
      } else {
        setNotifications(prev => prev.map(n => ({ ...n, read: true, read_at: new Date().toISOString() })));
      }

      setUnreadCount(prev => Math.max(0, prev - (notificationIds?.length || prev)));
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  }, []);

  // Funzione per cancellare una notifica
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('user_notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, []);

  // Funzione per testare il sistema di notifiche
  const testNotification = useCallback(async () => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) return;

      const testNotification = {
        type: 'system_alert' as const,
        user_id: userId,
        title: '🧪 Notifica di Test',
        message: 'Il sistema di notifiche real-time è funzionante correttamente!',
        priority: 'medium' as const,
        timestamp: new Date().toISOString(),
      };

      // Invia tramite Supabase Realtime
      const channel = supabase.channel(`test_notification_${Date.now()}`);
      await channel.send({
        type: 'broadcast',
        event: 'notification',
        payload: { ...testNotification, id: `test_${Date.now()}`, read: false, created_at: testNotification.timestamp }
      });

      toast({
        title: '🧪 Test Notifica Inviato',
        description: 'Se non ricevi una notifica entro pochi secondi, controlla le impostazioni.',
      });
    } catch (error) {
      console.error('Error testing notification:', error);
      toast({
        title: '❌ Errore Test',
        description: 'Impossibile inviare la notifica di test.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  return {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    deleteNotification,
    testNotification,
    refreshNotifications: loadNotifications,
  };
}