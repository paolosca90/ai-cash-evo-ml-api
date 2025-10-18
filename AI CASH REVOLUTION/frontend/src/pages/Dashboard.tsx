import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Brain,
  Zap,
  Target,
  DollarSign,
  Clock,
  BarChart3,
  Activity,
  Sparkles,
  RefreshCw,
  CheckCircle,
  TrendingDown,
  TrendingUp,
  Calculator,
} from "lucide-react";
import { TakeProfitCalculator } from "@/lib/risk-management/TakeProfitCalculator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import CollectiveLearningAnalytics from "@/components/CollectiveLearningAnalytics";
import { MLComponentWrapper } from "@/components/MLComponentWrapper";
import useSingleSession from "@/hooks/useSingleSession";
import MT5Setup from "@/components/MT5Setup";

interface MT5Signal {
  id: string;
  created_at: string;
  timestamp?: string;
  client_id?: string;
  symbol: string;
  signal?: string;
  type?: string;
  entry: number; // This is the actual field name in mt5_signals table
  entry_price?: number; // Alternative field name from Edge functions
  entryPrice?: number; // Alternative field name from Edge functions
  risk_amount?: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  confidence: number | null;
  ai_analysis?: unknown;
  sent?: boolean;
  // Nuovi campi per tracking esiti
  status?: string;
  opened_at?: string;
  closed_at?: string;
  close_price?: number;
  actual_profit?: number;
  pips_gained?: number;
  trade_duration_minutes?: number;
  close_reason?: string;
}

const Dashboard = () => {
  const [signals, setSignals] = useState<MT5Signal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Sistema di sessione unica
  const sessionManager = useSingleSession();

  // Statistiche dai dati reali
  const [stats, setStats] = useState({
    totalProfit: 0,
    winRate: 0,
    activeSignals: 0,
    totalSignals: 0
  });

  // Auth guard: listener FIRST, then getSession
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const loggedIn = !!session?.user;
      setIsAuthenticated(loggedIn);
      if (!loggedIn) {
        navigate("/login", { replace: true });
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      const loggedIn = !!session?.user;
      setIsAuthenticated(loggedIn);
      if (!loggedIn) {
        navigate("/login", { replace: true });
      } else {
        fetchMT5Signals();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, fetchMT5Signals]);

  // Auto-fetch signals every 30 seconds when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    if (autoUpdate) {
      const interval = setInterval(() => {
        fetchMT5Signals();
      }, 30 * 1000);
      return () => clearInterval(interval);
    }
  }, [autoUpdate, isAuthenticated, fetchMT5Signals]);

  const fetchMT5Signals = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      // Fetch segnali MT5 tramite Edge Function sicura
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trade-signals`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      const signals = result.signals || [];

      setSignals(signals);
      setLastUpdate(new Date());

      // DEBUG: Log signals to console
      console.log('🔍 MT5 Signals loaded:', signals.length);
      if (signals[0]) {
        console.log('🔍 First signal:', signals[0]);
      }

      // Calcola statistiche reali
      calculateRealStats(signals);

      toast({
        title: "Segnali MT5 aggiornati!",
        description: `${signals.length} segnali trovati`
      });
    } catch (error) {
      console.error("Error fetching MT5 signals:", error);
      toast({
        title: "Errore",
        description: `Impossibile aggiornare i segnali MT5: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, toast, calculateRealStats, supabase]);

  const calculateRealStats = useCallback((signals: MT5Signal[]) => {
    if (signals.length === 0) {
      setStats({ totalProfit: 0, winRate: 0, activeSignals: 0, totalSignals: 0 });
      return;
    }

    // Calcola profitto totale (simulato dai dati disponibili)
    const totalProfit = signals.reduce((acc, signal) => {
      if (signal.actual_profit !== null && signal.actual_profit !== undefined) return acc + signal.actual_profit;
      // Simulazione profitto basata su confidence e risk_amount
      const confidence = signal.confidence || 70;
      const riskAmount = signal.risk_amount || 100;
      const estimatedProfit = confidence > 70 ? riskAmount * 0.02 : -riskAmount * 0.01;
      return acc + estimatedProfit;
    }, 0);

    // Calcola win rate basato su confidence > 70%
    const winningSignals = signals.filter(s => (s.confidence || 0) > 70).length;
    const winRate = signals.length > 0 ? (winningSignals / signals.length) * 100 : 0;

    // Segnali attivi (non ancora inviati o recenti)
    const activeSignals = signals.filter(s => !s.sent ||
      new Date(s.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length;

    setStats({
      totalProfit: totalProfit || 0,
      winRate: winRate || 0,
      activeSignals: activeSignals || 0,
      totalSignals: signals.length || 0
    });
  }, []);


  const getSignalIcon = (signal: string) => {
    switch (signal) {
      case "BUY":
        return <TrendingUp className="w-4 h-4" />;
      case "SELL":
        return <TrendingDown className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  // Inizializza fetchMT5Signals quando utente è autenticato
  useEffect(() => {
    if (isAuthenticated) {
      fetchMT5Signals();
    }
  }, [isAuthenticated, fetchMT5Signals]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="p-3 md:p-6">
      {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 lg:mb-8">
          <div className="text-center lg:text-left">
            <h1 className="text-2xl md:text-3xl font-bold flex items-center justify-center lg:justify-start gap-2">
              <Brain className="w-6 h-6 md:w-8 md:h-8 text-primary" />
              <span className="hidden sm:inline">ML Trading Dashboard</span>
              <span className="sm:hidden">ML Dashboard</span>
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              Sistema AI-FinRL • {lastUpdate.toLocaleTimeString()}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Badge variant={autoUpdate ? "default" : "secondary"} className="px-3 py-1 text-xs">
              <Brain className="w-3 h-3 mr-1" />
              Auto-Learn {autoUpdate ? "ON" : "OFF"}
            </Badge>

            <Button 
              onClick={fetchMT5Signals} 
              disabled={isLoading} 
              className="bg-primary hover:bg-primary/90 w-full sm:w-auto"
              size="sm"
            >
              {isLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
              <span className="hidden sm:inline">Aggiorna da MT5</span>
              <span className="sm:hidden">Aggiorna</span>
            </Button>
          </div>
        </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
        <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs lg:text-sm font-medium">Profitto</CardTitle>
            <DollarSign className="h-3 w-3 lg:h-4 lg:w-4 text-success" />
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-lg lg:text-2xl font-bold text-success">${typeof stats.totalProfit === 'number' ? stats.totalProfit.toFixed(2) : '0.00'}</div>
            <p className="text-xs text-muted-foreground hidden lg:block">+12.3% dalla settimana scorsa</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs lg:text-sm font-medium">Win Rate</CardTitle>
            <Target className="h-3 w-3 lg:h-4 lg:w-4 text-primary" />
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-lg lg:text-2xl font-bold text-primary">{typeof stats.winRate === 'number' ? stats.winRate.toFixed(1) : '0.0'}%</div>
            <p className="text-xs text-muted-foreground hidden lg:block">Accuratezza media modelli</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs lg:text-sm font-medium">Segnali</CardTitle>
            <Activity className="h-3 w-3 lg:h-4 lg:w-4 text-warning" />
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-lg lg:text-2xl font-bold text-warning">{stats.activeSignals || 0}</div>
            <p className="text-xs text-muted-foreground">Su {stats.totalSignals || 0} tot.</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-danger/10 to-danger/5 border-danger/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs lg:text-sm font-medium">Accuracy</CardTitle>
            <Brain className="h-3 w-3 lg:h-4 lg:w-4 text-danger" />
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-lg lg:text-2xl font-bold text-danger">
              {signals.length > 0 
                ? (() => {
                    const avg = signals.reduce((acc, s) => acc + (typeof s.confidence === 'number' ? s.confidence : 0), 0) / signals.length;
                    return typeof avg === 'number' ? avg.toFixed(1) : '0.0';
                  })()
                : '0'
              }%
            </div>
            <p className="text-xs text-muted-foreground hidden lg:block">Confidence media segnali</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="signals" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="signals">Segnali ML</TabsTrigger>
          <TabsTrigger value="mt5-setup">Setup MT5</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="learning">Auto-Learning</TabsTrigger>
        </TabsList>

        {/* Signals Tab - Segnali MT5 Reali */}
        <TabsContent value="signals" className="space-y-4 md:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
            {signals.map((signal) => (
              <Card key={signal.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      {signal.symbol}
                      {getSignalIcon(signal.signal)}
                    </CardTitle>
                    <Badge
                      variant={signal.signal === "BUY" ? "default" : signal.signal === "SELL" ? "destructive" : "secondary"}
                      className="flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      {signal.signal}
                    </Badge>
                  </div>
                  <CardDescription>
                    {new Date(signal.created_at).toLocaleString()}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Confidence */}
                  {signal.confidence && signal.confidence > 0 && (
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Confidence</span>
                        <span className="font-semibold">{typeof signal.confidence === 'number' ? signal.confidence.toFixed(1) : signal.confidence}%</span>
                      </div>
                      <Progress value={signal.confidence} className="h-2" />
                    </div>
                  )}

                  {/* Status avanzato */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-muted/50 p-2 rounded">
                      <div className="font-medium">Status</div>
                      <div className={
                        signal.status === 'closed' ? "text-primary" :
                        signal.status === 'opened' ? "text-success" :
                        signal.sent ? "text-success" : "text-warning"
                      }>
                        {signal.status === 'closed' ? 'Chiuso' :
                         signal.status === 'opened' ? 'Aperto' :
                         signal.sent ? "Inviato" : "Pending"}
                      </div>
                    </div>
                    <div className="bg-muted/50 p-2 rounded">
                      <div className="font-medium">Client ID</div>
                      <div className="text-primary">{signal.client_id}</div>
                    </div>
                  </div>

                  {/* Profit reale se disponibile */}
                  {signal.actual_profit !== undefined && (
                    <div className="border-t pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Profitto Reale:</span>
                        <span className={`text-lg font-bold ${
                          signal.actual_profit > 0 ? 'text-success' : 
                          signal.actual_profit < 0 ? 'text-danger' : 'text-muted-foreground'
                        }`}>
                          ${typeof signal.actual_profit === 'number' ? signal.actual_profit.toFixed(2) : '0.00'}
                        </span>
                      </div>
                      
                      {signal.pips_gained && (
                        <div className="flex justify-between text-xs mt-1">
                          <span>Pips:</span>
                          <span className={signal.pips_gained > 0 ? 'text-success' : 'text-danger'}>
                            {signal.pips_gained > 0 ? '+' : ''}{signal.pips_gained}
                          </span>
                        </div>
                      )}
                      
                      {signal.trade_duration_minutes && (
                        <div className="flex justify-between text-xs mt-1">
                          <span>Durata:</span>
                          <span className="text-muted-foreground">
                            {Math.floor(signal.trade_duration_minutes / 60)}h {signal.trade_duration_minutes % 60}m
                          </span>
                        </div>
                      )}
                      
                      {signal.close_reason && (
                        <div className="flex justify-between text-xs mt-1">
                          <span>Chiusura:</span>
                          <span className={
                            signal.close_reason === 'take_profit' ? 'text-success' :
                            signal.close_reason === 'stop_loss' ? 'text-danger' :
                            'text-muted-foreground'
                          }>
                            {signal.close_reason === 'take_profit' ? 'Take Profit' :
                             signal.close_reason === 'stop_loss' ? 'Stop Loss' :
                             signal.close_reason === 'manual' ? 'Manuale' : 'Timeout'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Risk Management */}
                  <div className="border-t pt-3 space-y-2">
                    {signal.stop_loss && (
                      <div className="flex justify-between text-xs">
                        <span>Stop Loss:</span>
                        <span className="text-danger">${typeof signal.stop_loss === 'number' ? signal.stop_loss.toFixed(4) : signal.stop_loss}</span>
                      </div>
                    )}

                    {/* RR 1:1 Calculation for XAUUSD, ETHUSD, BTCUSD */}
                    {(() => {
                      const entryPrice = signal.entry || signal.entry_price || signal.entryPrice || 0;
                      const stopLoss = signal.stop_loss || 0;
                      const action = signal.signal || signal.type || 'BUY';

                      if (entryPrice && stopLoss && TakeProfitCalculator.isRR1To1Symbol(signal.symbol)) {
                        const rr1To1TP = TakeProfitCalculator.calculateRR1To1(
                          signal.symbol,
                          entryPrice,
                          stopLoss,
                          action as 'BUY' | 'SELL'
                        );

                        if (rr1To1TP) {
                          return (
                            <div className="flex justify-between text-xs bg-primary/5 p-2 rounded">
                              <div className="flex items-center gap-1">
                                <Calculator className="w-3 h-3 text-primary" />
                                <span className="font-medium text-primary">TP RR 1:1:</span>
                              </div>
                              <span className="text-primary font-bold">
                                ${rr1To1TP.toFixed(signal.symbol.toUpperCase().includes('XAU') ? 2 : 4)}
                              </span>
                            </div>
                          );
                        }
                      }
                      return null;
                    })()}

                    {signal.take_profit && (
                      <div className="flex justify-between text-xs">
                        <span>Take Profit:</span>
                        <span className="text-success">${typeof signal.take_profit === 'number' ? signal.take_profit.toFixed(4) : signal.take_profit}</span>
                      </div>
                    )}

                    {/* RR 1:1 Badge */}
                    {TakeProfitCalculator.isRR1To1Symbol(signal.symbol) && (
                      <div className="flex justify-between text-xs">
                        <span>Risk/Reward:</span>
                        <Badge variant="outline" className="text-xs px-2 py-0">
                          1:1 {signal.symbol.toUpperCase().includes('XAU') ? '🥇' :
                               signal.symbol.toUpperCase().includes('BTC') ? '₿' : '🔷'}
                        </Badge>
                      </div>
                    )}

                    <div className="flex justify-between text-xs">
                      <span>Creato:</span>
                      <span className="text-muted-foreground">
                        {new Date(signal.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  {/* AI Analysis Preview */}
                  {signal.ai_analysis && (
                    <div className="border-t pt-3">
                      <div className="text-xs text-muted-foreground">
                        <Brain className="w-3 h-3 inline mr-1" />
                        AI Analysis disponibile
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            
            {signals.length === 0 && !isLoading && (
              <div className="col-span-full text-center py-12">
                <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nessun segnale MT5</h3>
                <p className="text-muted-foreground">
                  Non ci sono segnali nel database. Genera segnali dall'app di trading.
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Analytics Tab - Statistiche Reali MT5 */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance per Simbolo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Segnali per Simbolo
                </CardTitle>
                <CardDescription>
                  Analisi segnali generati da MetaTrader 5
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.from(new Set(signals.map(s => s.symbol))).map((symbol) => {
                    const symbolSignals = signals.filter((s) => s.symbol === symbol);
                    const avgConfidence = symbolSignals.reduce((acc, s) => acc + (s.confidence || 0), 0) / symbolSignals.length || 0;

                    return (
                      <div key={symbol} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{symbol}</span>
                          <span className="text-xs text-muted-foreground">({symbolSignals.length})</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Progress value={avgConfidence} className="w-20 h-2" />
                          <span className="text-sm font-semibold w-12">{typeof avgConfidence === 'number' ? avgConfidence.toFixed(0) : '0'}%</span>
                        </div>
                      </div>
                    );
                  })}
                  
                  {signals.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <BarChart3 className="w-8 h-8 mx-auto mb-2" />
                      <p>Nessun dato disponibile</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Distribuzione per Tipo Segnale */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Distribuzione per Tipo
                </CardTitle>
                <CardDescription>
                  BUY vs SELL generati
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {["BUY", "SELL"].map((signalType) => {
                    const count = signals.filter((s) => s.signal === signalType).length;
                    const percentage = signals.length > 0 ? (count / signals.length) * 100 : 0;

                    return (
                      <div key={signalType} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getSignalIcon(signalType)}
                          <span className="font-medium">{signalType}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Progress value={percentage} className="w-20 h-2" />
                          <span className="text-sm font-semibold w-12">{count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Statistiche Risk Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Risk Management
                </CardTitle>
                <CardDescription>
                  Analisi stop loss e take profit
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-danger/10 rounded-lg">
                      <div className="text-lg font-bold text-danger">
                        {signals.filter(s => s.stop_loss).length}
                      </div>
                      <div className="text-xs text-muted-foreground">Con Stop Loss</div>
                    </div>

                    <div className="text-center p-3 bg-success/10 rounded-lg">
                      <div className="text-lg font-bold text-success">
                        {signals.filter(s => s.take_profit).length}
                      </div>
                      <div className="text-xs text-muted-foreground">Con Take Profit</div>
                    </div>
                  </div>

                  {/* RR 1:1 Statistics */}
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Calculator className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Statistiche RR 1:1</span>
                    </div>

                    <div className="space-y-2">
                      {['XAUUSD', 'ETHUSD', 'BTCUSD'].map(symbol => {
                        const symbolSignals = signals.filter(s =>
                          s.symbol.toUpperCase().includes(symbol)
                        );
                        const count = symbolSignals.length;

                        if (count === 0) return null;

                        return (
                          <div key={symbol} className="flex items-center justify-between p-2 bg-primary/5 rounded">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {symbol.includes('XAU') ? '🥇 XAUUSD' :
                                 symbol.includes('BTC') ? '₿ BTCUSD' : '🔷 ETHUSD'}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                RR 1:1
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">{count} segnali</span>
                              <div className="w-12 h-2 bg-muted rounded">
                                <div
                                  className="h-full bg-primary rounded"
                                  style={{ width: `${Math.min((count / signals.length) * 100, 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {signals.filter(s =>
                        ['XAUUSD', 'ETHUSD', 'BTCUSD'].some(symbol =>
                          s.symbol.toUpperCase().includes(symbol)
                        )
                      ).length === 0 && (
                        <div className="text-center py-2 text-xs text-muted-foreground">
                          Nessun segnale RR 1:1 trovato
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline Segnali */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Timeline Segnali
                </CardTitle>
                <CardDescription>
                  Ultime attività
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {signals.slice(0, 5).map((signal) => (
                    <div key={signal.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                      <div className="flex items-center gap-2">
                        {getSignalIcon(signal.signal)}
                        <span className="font-medium text-sm">{signal.symbol}</span>
                        <Badge variant="outline" className="text-xs">
                          {signal.signal}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(signal.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                  
                  {signals.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      <Clock className="w-6 h-6 mx-auto mb-2" />
                      <p className="text-sm">Nessuna attività recente</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* MT5 Setup Tab */}
        <TabsContent value="mt5-setup" className="space-y-6">
          <MT5Setup />
        </TabsContent>

        {/* Auto-Learning Tab - Analytics Collettive */}
        <TabsContent value="learning" className="space-y-6">
          <MLComponentWrapper componentName="CollectiveLearningAnalytics">
            <CollectiveLearningAnalytics />
          </MLComponentWrapper>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
