import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  TrendingUp,
  Target,
  Users,
  BarChart3,
  Sparkles,
  Trophy,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface TradingAnalytics {
  id: string;
  symbol: string;
  symbol_win_rate: number;
  symbol_avg_profit: number;
  symbol_total_trades: number;
  best_confidence_range: { min: number; max: number };
  best_time_ranges: number[];
  profitable_patterns: Array<{
    pattern_type: string;
    win_rate: number;
    frequency: number;
  }>;
  updated_at: string;
}

const CollectiveLearningAnalytics = () => {
  const [analytics, setAnalytics] = useState<TradingAnalytics[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [globalStats, setGlobalStats] = useState({
    totalTrades: 0,
    avgWinRate: 0,
    totalProfit: 0,
    bestSymbol: '',
    bestWinRate: 0
  });
  const { toast } = useToast();

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch analytics collettive
      const { data: analyticsData, error: analyticsError } = await supabase
        .from('trading_analytics')
        .select('*')
        .order('symbol_total_trades', { ascending: false });

      if (analyticsError) throw analyticsError;

      // Fetch statistiche globali dai segnali chiusi
      // NOTA: Ora questo componente mostrerà solo le statistiche dell'utente corrente per privacy
      const { data: closedSignals, error: signalsError } = await supabase
        .from('mt5_signals')
        .select('actual_profit, symbol, status')
        .eq('status', 'closed');

      if (signalsError) throw signalsError;

      // Cast Json types to proper TypeScript types
      const typedAnalytics = (analyticsData || []).map(item => ({
        ...item,
        best_confidence_range: item.best_confidence_range as { min: number; max: number } || { min: 0, max: 100 },
        best_time_ranges: item.best_time_ranges as number[] || [],
        profitable_patterns: item.profitable_patterns as Array<{
          pattern_type: string;
          win_rate: number;
          frequency: number;
        }> || []
      }));
      setAnalytics(typedAnalytics);

      // Calcola statistiche globali
      if (analyticsData && analyticsData.length > 0) {
        const totalTrades = analyticsData.reduce((sum, a) => sum + a.symbol_total_trades, 0);
        const avgWinRate = analyticsData.reduce((sum, a) => sum + a.symbol_win_rate, 0) / analyticsData.length;
        const totalProfit = closedSignals?.reduce((sum, s) => sum + (s.actual_profit || 0), 0) || 0;
        const bestSymbol = analyticsData.reduce((best, current) =>
          current.symbol_win_rate > best.symbol_win_rate ? current : best
        );

        setGlobalStats({
          totalTrades,
          avgWinRate,
          totalProfit,
          bestSymbol: bestSymbol.symbol,
          bestWinRate: bestSymbol.symbol_win_rate
        });
      }

    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare analytics collettive",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistiche Globali Collettive */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trade Totali</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{globalStats.totalTrades}</div>
            <p className="text-xs text-muted-foreground">Da tutti i clienti</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate Medio</CardTitle>
            <Target className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{typeof globalStats.avgWinRate === 'number' ? globalStats.avgWinRate.toFixed(1) : '0.0'}%</div>
            <p className="text-xs text-muted-foreground">Accuratezza collettiva</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profitto Collettivo</CardTitle>
            <TrendingUp className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">${typeof globalStats.totalProfit === 'number' ? globalStats.totalProfit.toFixed(2) : '0.00'}</div>
            <p className="text-xs text-muted-foreground">Tutti i clienti</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-danger/10 to-danger/5 border-danger/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Miglior Simbolo</CardTitle>
            <Trophy className="h-4 w-4 text-danger" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-danger">{globalStats.bestSymbol}</div>
            <p className="text-xs text-muted-foreground">{typeof globalStats.bestWinRate === 'number' ? globalStats.bestWinRate.toFixed(1) : '0.0'}% win rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics per Simbolo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Performance Collettiva per Simbolo
            </CardTitle>
            <CardDescription>
              Dati aggregati da tutti i clienti MT5
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.slice(0, 8).map((analytic) => (
                <div key={analytic.symbol} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{analytic.symbol}</span>
                    <Badge variant="outline" className="text-xs">
                      {analytic.symbol_total_trades} trades
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress value={analytic.symbol_win_rate} className="w-20 h-2" />
                    <span className="text-sm font-semibold w-12">
                      {typeof analytic.symbol_win_rate === 'number' ? analytic.symbol_win_rate.toFixed(0) : '0'}%
                    </span>
                  </div>
                </div>
              ))}
              
              {analytics.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="w-8 h-8 mx-auto mb-2" />
                  <p>Nessun dato di apprendimento collettivo ancora disponibile</p>
                  <p className="text-xs mt-1">I dati appariranno quando i trade verranno chiusi</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Profittabilità Media
            </CardTitle>
            <CardDescription>
              Profitto medio per simbolo (tutti i clienti)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics
                .filter(a => a.symbol_avg_profit !== 0)
                .sort((a, b) => b.symbol_avg_profit - a.symbol_avg_profit)
                .slice(0, 6)
                .map((analytic) => (
                  <div key={`profit-${analytic.symbol}`} className="flex items-center justify-between">
                    <span className="font-medium">{analytic.symbol}</span>
                    <span className={`text-sm font-semibold ${
                      (analytic.symbol_avg_profit || 0) > 0 ? 'text-success' : 'text-danger'
                    }`}>
                      ${typeof analytic.symbol_avg_profit === 'number' ? analytic.symbol_avg_profit.toFixed(2) : '0.00'}
                    </span>
                  </div>
                ))}
              
              {analytics.filter(a => a.symbol_avg_profit !== 0).length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <TrendingUp className="w-6 h-6 mx-auto mb-2" />
                  <p className="text-sm">Nessun dato di profittabilità disponibile</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Sistema di Apprendimento Collettivo
          </CardTitle>
          <CardDescription>
            Il sistema impara automaticamente dai risultati di tutti i clienti MT5
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-primary/5 rounded-lg">
              <Brain className="w-8 h-8 mx-auto mb-2 text-primary" />
              <div className="font-semibold">Auto-Learning</div>
              <div className="text-xs text-muted-foreground">
                Aggiornamento automatico quando i trade vengono chiusi
              </div>
            </div>
            
            <div className="text-center p-4 bg-success/5 rounded-lg">
              <Users className="w-8 h-8 mx-auto mb-2 text-success" />
              <div className="font-semibold">Dati Collettivi</div>
              <div className="text-xs text-muted-foreground">
                Apprendimento da tutti i clienti per migliorare i segnali
              </div>
            </div>
            
            <div className="text-center p-4 bg-warning/5 rounded-lg">
              <Target className="w-8 h-8 mx-auto mb-2 text-warning" />
              <div className="font-semibold">Ottimizzazione</div>
              <div className="text-xs text-muted-foreground">
                I pattern vincenti vengono utilizzati per futuri segnali
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CollectiveLearningAnalytics;