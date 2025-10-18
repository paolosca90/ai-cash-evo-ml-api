import React, { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff, Activity, Users, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ConnectionData {
  id: string;
  account_number: string;
  account_name: string;
  server_name: string;
  is_active: boolean;
  last_heartbeat: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  ea_version: string;
}

interface WebhookStatus {
  configured: boolean;
  active: boolean;
  lastCheck?: string;
  responseTime?: number;
  error?: string;
  [key: string]: unknown;
}

export function ConnectionMonitor() {
  const [connections, setConnections] = useState<ConnectionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [webhookStatus, setWebhookStatus] = useState<WebhookStatus | null>(null);
  const { toast } = useToast();

  const loadConnections = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('mt5_accounts')
        .select('*')
        .order('last_heartbeat', { ascending: false })
        .limit(100);

      if (error) throw error;
      setConnections(data || []);
    } catch (error) {
      console.error('Error loading connections:', error);
      toast({
        title: '❌ Errore',
        description: 'Impossibile caricare le connessioni',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const checkWebhookStatus = useCallback(async () => {
    try {
      const response = await fetch(`https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1/realtime-trade-webhook?action=status`, {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const status = await response.json();
        setWebhookStatus(status);
      } else {
        throw new Error('Webhook service not responding');
      }
    } catch (error) {
      console.error('Error checking webhook status:', error);
      setWebhookStatus({ configured: false, active: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }, []);

  useEffect(() => {
    loadConnections();
    checkWebhookStatus();

    const interval = setInterval(() => {
      loadConnections();
      checkWebhookStatus();
    }, 30000); // Aggiorna ogni 30 secondi

    return () => clearInterval(interval);
  }, [loadConnections, checkWebhookStatus]);

  const getStatusIcon = (is_active: boolean) => {
    return is_active ? 
      <CheckCircle className="h-4 w-4 text-green-500" /> :
      <WifiOff className="h-4 w-4 text-red-500" />;
  };

  const getStatusColor = (is_active: boolean) => {
    return is_active ?
      'bg-green-100 text-green-800 border-green-200' :
      'bg-red-100 text-red-800 border-red-200';
  };
  
  const getStatusText = (is_active: boolean) => {
    return is_active ? 'Online' : 'Offline';
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMins < 1) return 'Adesso';
    if (diffMins < 60) return `${diffMins} min fa`;
    if (diffHours < 24) return `${diffHours} ore fa`;
    return date.toLocaleString();
  };

  const activeConnections = connections.filter(c => c.is_active);
  const offlineConnections = connections.filter(c => !c.is_active);

  return (
    <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Webhook Service</CardTitle>
            {webhookStatus?.status === 'online' ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {webhookStatus?.status === 'online' ? 'Online' : 'Offline'}
            </div>
            <p className="text-xs text-muted-foreground">
              {webhookStatus?.version || 'v1.0.0'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connessioni Attive</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeConnections.length}</div>
            <p className="text-xs text-muted-foreground">
              {offlineConnections.length} offline
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rate Limit</CardTitle>
            <Activity className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {webhookStatus?.rate_limits?.webhook?.requests || 100}/min
            </div>
            <p className="text-xs text-muted-foreground">
              Webhook limit
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Webhook Status Details */}
      {webhookStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Dettagli Servizio Webhook
            </CardTitle>
            <CardDescription>
              Stato del servizio per webhook real-time dei trade
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Stato</label>
                <Badge
                  variant={webhookStatus.status === 'online' ? 'default' : 'destructive'}
                >
                  {webhookStatus.status}
                </Badge>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Versione</label>
                <p className="text-sm">{webhookStatus.version || 'N/D'}</p>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Connessioni</label>
                <p className="text-sm">{webhookStatus.active_connections || 0}</p>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Ultimo Check</label>
                <p className="text-sm">
                  {webhookStatus.timestamp ? formatTimestamp(webhookStatus.timestamp) : 'N/D'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Connections */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Connessioni Attive
              <Badge variant="secondary">{activeConnections.length}</Badge>
            </div>
            <Button variant="outline" size="sm" onClick={loadConnections}>
              Aggiorna
            </Button>
          </CardTitle>
          <CardDescription>
            Monitoraggio delle connessioni MT5 EA in tempo reale
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : activeConnections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <WifiOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nessuna connessione attiva</p>
              <p className="text-sm">Le connessioni appariranno qui quando i client MT5 si connettono</p>
            </div>
          ) : (
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {activeConnections.map((connection) => (
                  <div
                    key={connection.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(connection.is_active)}
                      <div>
                        <h4 className="font-medium">{connection.account_name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            Ultimo heartbeat: {formatTimestamp(connection.last_heartbeat)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Account: {connection.account_number} | Server: {connection.server_name}
                        </p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(connection.is_active)}>
                      {getStatusText(connection.is_active)}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Offline Connections */}
      {offlineConnections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <WifiOff className="h-5 w-5" />
              Connessioni Offline
              <Badge variant="secondary">{offlineConnections.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {offlineConnections.map((connection) => (
                  <div
                    key={connection.id}
                    className="flex items-center justify-between p-4 border rounded-lg opacity-60"
                  >
                    <div className="flex items-center gap-3">
                      <WifiOff className="h-4 w-4 text-red-500" />
                      <div>
                        <h4 className="font-medium">{connection.account_name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            Ultimo heartbeat: {formatTimestamp(connection.last_heartbeat)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Account: {connection.account_number}
                        </p>
                      </div>
                    </div>
                    <Badge variant="destructive">Offline</Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}