import React, { useState } from 'react';
import { Send, Play, Pause, RotateCcw, Copy, Check, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TradeEvent {
  event_type: 'trade_opened' | 'trade_closed' | 'trade_modified' | 'trade_timeout' | 'heartbeat';
  timestamp: string;
  client_id: string;
  account_number: string;
  ticket?: number;
  symbol?: string;
  order_type?: 'BUY' | 'SELL';
  volume?: number;
  price?: number;
  stop_loss?: number;
  take_profit?: number;
  profit?: number;
  swap?: number;
  comment?: string;
  magic_number?: number;
  close_reason?: 'take_profit' | 'stop_loss' | 'manual' | 'timeout' | 'balance_stop';
  modified_fields?: string[];
  connection_status?: 'online' | 'offline' | 'reconnected';
}

interface TestResult {
  id: string;
  timestamp: string;
  event: TradeEvent;
  response: unknown;
  duration: number;
  success: boolean;
}

const sampleEvents: Record<string, TradeEvent> = {
  trade_opened: {
    event_type: 'trade_opened',
    timestamp: new Date().toISOString(),
    client_id: 'MT5_Client_001',
    account_number: '12345678',
    ticket: 12345,
    symbol: 'EURUSD',
    order_type: 'BUY',
    volume: 0.1,
    price: 1.2345,
    stop_loss: 1.2300,
    take_profit: 1.2400,
    comment: 'AI Signal Trade',
    magic_number: 888777
  },
  trade_closed: {
    event_type: 'trade_closed',
    timestamp: new Date().toISOString(),
    client_id: 'MT5_Client_001',
    account_number: '12345678',
    ticket: 12345,
    symbol: 'EURUSD',
    order_type: 'BUY',
    volume: 0.1,
    price: 1.2345,
    profit: 150.50,
    close_reason: 'take_profit',
    comment: 'AI Signal Trade - Closed'
  },
  trade_modified: {
    event_type: 'trade_modified',
    timestamp: new Date().toISOString(),
    client_id: 'MT5_Client_001',
    account_number: '12345678',
    ticket: 12345,
    symbol: 'EURUSD',
    modified_fields: ['stop_loss', 'take_profit'],
    stop_loss: 1.2320,
    take_profit: 1.2380
  },
  heartbeat: {
    event_type: 'heartbeat',
    timestamp: new Date().toISOString(),
    client_id: 'MT5_Client_001',
    account_number: '12345678',
    connection_status: 'online'
  }
};

export function WebhookTestPage() {
  const [payload, setPayload] = useState(JSON.stringify(sampleEvents.trade_opened, null, 2));
  const [results, setResults] = useState<TestResult[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [autoTest, setAutoTest] = useState(false);
  const [autoTestInterval, setAutoTestInterval] = useState<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const sendWebhook = async (event: TradeEvent): Promise<TestResult> => {
    const startTime = Date.now();
    const testId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const response = await fetch(`https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1/realtime-trade-webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(event),
      });

      const duration = Date.now() - startTime;
      const responseData = await response.json();

      const result: TestResult = {
        id: testId,
        timestamp: new Date().toISOString(),
        event,
        response: responseData,
        duration,
        success: response.ok,
      };

      setResults(prev => [result, ...prev.slice(0, 19)]); // Keep last 20 results

      if (response.ok) {
        toast({
          title: '✅ Webhook Inviato',
          description: `${event.event_type} inviato con successo in ${duration}ms`,
        });
      } else {
        toast({
          title: '❌ Errore Webhook',
          description: `Status: ${response.status} - ${responseData.error || 'Unknown error'}`,
          variant: 'destructive',
        });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const result: TestResult = {
        id: testId,
        timestamp: new Date().toISOString(),
        event,
        response: { error: error instanceof Error ? error.message : 'Unknown error' },
        duration,
        success: false,
      };

      setResults(prev => [result, ...prev.slice(0, 19)]);

      toast({
        title: '❌ Errore Rete',
        description: 'Impossibile connettersi al servizio webhook',
        variant: 'destructive',
      });

      return result;
    }
  };

  const handleSendTest = async () => {
    try {
      const event = JSON.parse(payload);
      setIsTesting(true);
      await sendWebhook(event);
    } catch (error) {
      toast({
        title: '❌ JSON Invalido',
        description: 'Il payload contiene JSON non valido',
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSendSample = (eventType: string) => {
    const event = sampleEvents[eventType];
    setPayload(JSON.stringify(event, null, 2));
  };

  const toggleAutoTest = () => {
    if (autoTest) {
      if (autoTestInterval) {
        clearInterval(autoTestInterval);
        setAutoTestInterval(null);
      }
      setAutoTest(false);
      toast({
        title: '⏹️ Auto Test Fermato',
        description: 'Invio automatico test interrotto',
      });
    } else {
      setAutoTest(true);
      const interval = setInterval(async () => {
        const eventTypes = Object.keys(sampleEvents);
        const randomType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        const event = { ...sampleEvents[randomType] };
        event.timestamp = new Date().toISOString();
        event.ticket = Math.floor(Math.random() * 100000);
        await sendWebhook(event);
      }, 5000); // Send every 5 seconds

      setAutoTestInterval(interval);
      toast({
        title: '▶️ Auto Test Avviato',
        description: 'Invio automatico test ogni 5 secondi',
      });
    }
  };

  const clearResults = () => {
    setResults([]);
    toast({
      title: '🗑️ Risultati Puliti',
      description: 'Cronologia test cancellata',
    });
  };

  const copyPayload = () => {
    navigator.clipboard.writeText(payload);
    toast({
      title: '📋 Copiato',
      description: 'Payload copiato negli appunti',
    });
  };

  const stats = {
    total: results.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    avgDuration: results.length > 0
      ? Math.round(results.reduce((sum, r) => sum + r.duration, 0) / results.length)
      : 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Webhook Test Center</h1>
          <p className="text-muted-foreground">
            Testa il servizio webhook per eventi trading real-time
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={autoTest ? "destructive" : "outline"}
            onClick={toggleAutoTest}
            className="flex items-center gap-2"
          >
            {autoTest ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            Auto Test {autoTest ? 'On' : 'Off'}
          </Button>
          <Button variant="outline" onClick={clearResults}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Pulisci
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Test Totali</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Successi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.successful}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Fallimenti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Durata Media</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgDuration}ms</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payload Editor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Webhook Payload</span>
              <Button variant="ghost" size="sm" onClick={copyPayload}>
                <Copy className="h-4 w-4" />
              </Button>
            </CardTitle>
            <CardDescription>
              Modifica o utilizza uno dei payload di esempio
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {Object.entries(sampleEvents).map(([key, event]) => (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSendSample(key)}
                >
                  {key.replace('_', ' ')}
                </Button>
              ))}
            </div>

            <Textarea
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              className="font-mono text-sm min-h-64"
              placeholder="Inserisci il JSON payload..."
            />

            <Button
              onClick={handleSendTest}
              disabled={isTesting}
              className="w-full"
            >
              {isTesting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Invio...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Invia Webhook
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Test Results */}
        <Card>
          <CardHeader>
            <CardTitle>Risultati Test</CardTitle>
            <CardDescription>
              Ultimi 20 risultati dei test effettuati
            </CardDescription>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Send className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nessun test effettuato</p>
                <p className="text-sm">Invia un webhook per vedere i risultati</p>
              </div>
            ) : (
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {results.map((result) => (
                    <div
                      key={result.id}
                      className={`p-4 border rounded-lg ${
                        result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {result.success ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-600" />
                          )}
                          <Badge variant={result.success ? 'default' : 'destructive'}>
                            {result.event.event_type}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {result.duration}ms
                        </div>
                      </div>

                      <div className="text-sm font-medium mb-1">
                        {result.event.symbol || result.event.client_id}
                      </div>

                      <div className="text-xs text-muted-foreground mb-2">
                        {new Date(result.timestamp).toLocaleString()}
                      </div>

                      <details className="text-xs">
                        <summary className="cursor-pointer hover:text-foreground">
                          Vedi risposta
                        </summary>
                        <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                          {JSON.stringify(result.response, null, 2)}
                        </pre>
                      </details>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}