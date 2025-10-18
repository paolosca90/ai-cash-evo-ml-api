import React, { useState } from 'react';
import { Bell, X, Check, CheckCheck, Settings, Trash2, Clock, AlertTriangle } from 'lucide-react';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

interface NotificationCenterProps {
  className?: string;
}

export function NotificationCenter({ className }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    deleteNotification,
    testNotification,
    refreshNotifications
  } = useRealtimeNotifications();

  const { toast } = useToast();

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'trade_update': return '📊';
      case 'system_alert': return '⚠️';
      case 'connection_status': return '🔌';
      default: return '📢';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Adesso';
    if (diffMins < 60) return `${diffMins} min fa`;
    if (diffHours < 24) return `${diffHours} ore fa`;
    if (diffDays < 7) return `${diffDays} giorni fa`;
    return date.toLocaleDateString();
  };

  const handleMarkAllAsRead = async () => {
    await markAsRead();
    toast({
      title: '✅ Tutte lette',
      description: 'Tutte le notifiche sono state marcate come lette.',
    });
  };

  const handleDeleteAllRead = async () => {
    const readNotifications = notifications.filter(n => n.read);
    for (const notification of readNotifications) {
      await deleteNotification(notification.id);
    }
    toast({
      title: '🗑️ Pulite',
      description: `${readNotifications.length} notifiche lette sono state cancellate.`,
    });
  };

  const handleTestNotification = async () => {
    await testNotification();
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={`relative ${className}`}>
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
          {!isConnected && (
            <div className="absolute -bottom-1 -right-1 h-2 w-2 bg-red-500 rounded-full" />
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between p-4 pb-2">
          <div>
            <DropdownMenuLabel className="text-lg font-semibold">Notifiche</DropdownMenuLabel>
            <p className="text-sm text-muted-foreground">
              {unreadCount} non lette • {notifications.length} totali
              <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                <div className={`w-2 h-2 rounded-full mr-1 ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`} />
                {isConnected ? 'Online' : 'Offline'}
              </span>
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Separator />

        <div className="p-2 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
            className="flex-1"
          >
            <CheckCheck className="h-4 w-4 mr-1" />
            Leggi tutte
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeleteAllRead}
            disabled={!notifications.some(n => n.read)}
            className="flex-1"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Pulisci lette
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestNotification}
            className="flex-1"
          >
            <AlertTriangle className="h-4 w-4 mr-1" />
            Test
          </Button>
        </div>

        <Separator />

        <ScrollArea className="h-96">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">Nessuna notifica</p>
              <p className="text-sm mt-1">Le notifiche appariranno qui</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestNotification}
                className="mt-4"
              >
                Testa notifiche
              </Button>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`relative cursor-pointer transition-colors ${
                    !notification.read ? 'bg-muted/50 border-l-4 border-l-blue-500' : ''
                  } hover:bg-muted/30`}
                  onClick={() => !notification.read && markAsRead([notification.id])}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                          <h4 className="font-medium text-sm truncate">{notification.title}</h4>
                          <div className={`w-2 h-2 rounded-full ${getPriorityColor(notification.priority)}`} />
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                        {notification.data && (
                          <div className="mt-2 p-2 bg-muted/50 rounded text-xs font-mono">
                            {JSON.stringify(notification.data, null, 2).substring(0, 150)}
                            {JSON.stringify(notification.data).length > 150 && '...'}
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatTimestamp(notification.created_at)}
                          </div>
                          {!notification.read && (
                            <Badge variant="secondary" className="text-xs">
                              Non letta
                            </Badge>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="h-6 w-6 ml-2 flex-shrink-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>

        <Separator />

        <div className="p-2 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshNotifications}
            className="flex-1"
          >
            <Settings className="h-4 w-4 mr-1" />
            Aggiorna
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}