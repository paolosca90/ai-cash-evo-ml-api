import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Target,
  BarChart3,
  Database,
  RefreshCw,
  Play,
  Pause,
  Zap,
  Filter,
  ArrowRight,
  Settings,
  Shield,
  Lock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface MLStatus {
  systemActive: boolean;
  lastTraining: string | null;
  totalSignals: number;
  activeSignals: number;
  completedSignals: number;
  winRate: number;
  avgProfit: number;
  lastUpdate: string;
  // New ML confirmation fields
  mlConfirmed: number;
  mlRejected: number;
  mlSamplesAvailable: number;
  hasSufficientData: boolean;
  avgMLConfidence: number;
  avgBaseConfidence: number;
}

interface RecentSignal {
  id: string;
  symbol: string;
  signal: 'BUY' | 'SELL';
  confidence: number; // Base confidence
  ml_confidence: number | null;
  ml_status: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'INSUFFICIENT_DATA';
  ml_weight_score: number | null;
  status: string;
  profit_loss: number | null;
  created_at: string;
  ml_analysis?: any;
}

interface WeightInfo {
  indicator_name: string;
  current_weight: number;
  weight_category: string;
  last_updated: string;
}

interface MLStats {
  total_signals: number;
  ml_confirmed: number;
  ml_rejected: number;
  ml_samples_available: number;
  has_sufficient_data: boolean;
  avg_ml_confidence: number;
  avg_base_confidence: number;
}

export default function MLDashboard() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [mlStatus, setMlStatus] = useState<MLStatus>({
    systemActive: false,
    lastTraining: null,
    totalSignals: 0,
    activeSignals: 0,
    completedSignals: 0,
    winRate: 0,
    avgProfit: 0,
    lastUpdate: new Date().toISOString()
  });

  const [recentSignals, setRecentSignals] = useState<RecentSignal[]>([]);
  const [weights, setWeights] = useState<WeightInfo[]>([]);
  const [mlStats, setMLStats] = useState<MLStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showMLOnly, setShowMLOnly] = useState(false);
  const { toast } = useToast();

  // Controllo autenticazione admin
  useEffect(() => {
    const checkAdminAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          toast({
            title: "Accesso Negato",
            description: "Devi essere autenticato per accedere a questa pagina",
            variant: "destructive"
          });
          navigate('/login');
          return;
        }

        // Controlla se l'utente è admin (solo tua email)
        const userEmail = user.email;
        const adminEmails = ['paoloscardia@gmail.com']; // Solo admin autorizzato

        if (adminEmails.includes(userEmail || '')) {
          setIsAdmin(true);
          setAuthChecked(true);
        } else {
          toast({
            title: "Accesso Negato",
            description: "Non hai i permessi per accedere a questa pagina",
            variant: "destructive"
          });
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        toast({
          title: "Errore Autenticazione",
          description: "Impossibile verificare i permessi",
          variant: "destructive"
        });
        navigate('/login');
      }
    };

    checkAdminAuth();
  }, [navigate, toast]);

  // Se non è admin o non è stato controllato, mostra schermata di caricamento o redirect
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <p className="text-lg font-medium">Verifica permessi...</p>
          <p className="text-sm text-muted-foreground mt-2">Accesso riservato agli amministratori</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <Lock className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h1 className="text-2xl font-bold mb-2">Accesso Negato</h1>
          <p className="text-muted-foreground mb-4">
            Questa pagina è riservata agli amministratori del sistema.
          </p>
          <Button onClick={() => navigate('/dashboard')}>
            Torna alla Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Funzione per caricare i dati ML
  const fetchMLData = async () => {
    try {
      setLoading(true);

      // 1. Status generale del sistema ML (dual-component)
      const [trainingResponse, mlStatsResponse, signalsResponse, weightsResponse] = await Promise.all([
        // Status training
        supabase
          .from('ml_model_performance')
          .select('training_date, model_version, is_active')
          .order('training_date', { ascending: false })
          .limit(1)
          .single(),

        // Stats ML confirmation
        fetch(`${window.location.origin}/functions/v1/ml-confirmation/stats`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
          }
        }),

        // Segnali recenti (dual-component)
        supabase
          .from('mt5_signals')
          .select('id, symbol, signal, confidence, ml_confidence, ml_status, ml_weight_score, status, profit_loss, created_at, ml_analysis')
          .order('created_at', { ascending: false })
          .limit(15),

        // Pesi ottimizzati
        supabase
          .from('ml_indicator_weights')
          .select('*')
          .order('importance_rank', { ascending: true })
          .limit(8)
      ]);

      const trainingData = trainingResponse.data;
      const mlStatsData = mlStatsResponse.ok ? await mlStatsResponse.json() : { stats: null };
      const signalsData = signalsResponse.data;
      const weightsData = weightsResponse.data;

      // Calcola statistiche base
      const completedSignals = signalsData?.filter(s => ['SL_HIT', 'TP_HIT'].includes(s.status)).length || 0;
      const profitableSignals = signalsData?.filter(s =>
        ['SL_HIT', 'TP_HIT'].includes(s.status) && s.profit_loss && s.profit_loss > 0
      ).length || 0;

      const winRate = completedSignals > 0 ? (profitableSignals / completedSignals) * 100 : 0;
      const avgProfit = signalsData?.filter(s => s.profit_loss !== null)
        .reduce((sum, s) => sum + (s.profit_loss || 0), 0) / (signalsData?.filter(s => s.profit_loss !== null).length || 1) || 0;

      // Verifica se il sistema è attivo
      const isSystemActive = trainingData?.is_active &&
        new Date(trainingData.training_date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Setup ML status con dati dual-component
      const stats = mlStatsData.stats || {};
      setMlStatus({
        systemActive: isSystemActive,
        lastTraining: trainingData?.training_date || null,
        totalSignals: stats.total_signals || 0,
        activeSignals: signalsData?.filter(s => s.status === 'PENDING').length || 0,
        completedSignals,
        winRate,
        avgProfit,
        lastUpdate: new Date().toISOString(),
        // ML confirmation stats
        mlConfirmed: stats.ml_confirmed || 0,
        mlRejected: stats.ml_rejected || 0,
        mlSamplesAvailable: stats.ml_samples_available || 0,
        hasSufficientData: stats.has_sufficient_data || false,
        avgMLConfidence: stats.avg_ml_confidence || 0,
        avgBaseConfidence: stats.avg_base_confidence || 0
      });

      setRecentSignals(signalsData || []);
      setWeights(weightsData || []);
      setMLStats(stats);

    } catch (error) {
      console.error('Error fetching ML data:', error);
      toast({
        title: "Errore Caricamento Dati",
        description: "Impossibile caricare i dati del sistema ML",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Funzione per generare segnali manualmente
  const generateSignals = async () => {
    try {
      toast({
        title: "Generazione Segnali",
        description: "Avvio generazione segnali casuali...",
      });

      const response = await fetch(`${window.location.origin}/functions/v1/ml-random-signals/generate-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        }
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "✅ Segnali Generati",
          description: `Generati ${result.data.total_signals} segnali con successo`,
        });
        fetchMLData(); // Ricarica i dati
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      console.error('Error generating signals:', error);
      toast({
        title: "❌ Errore Generazione",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Funzione per processare segnali pending con ML
  const processPendingSignals = async () => {
    try {
      toast({
        title: "Processing ML Confirmation",
        description: "Analisi segnali pending con ML...",
      });

      const response = await fetch(`${window.location.origin}/functions/v1/ml-confirmation/process-pending`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ limit: 10 })
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "✅ ML Processing Complete",
          description: `Processed ${result.processed} signals: ${result.confirmed} confirmed, ${result.rejected} rejected`,
        });
        fetchMLData(); // Ricarica i dati
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      console.error('Error processing ML signals:', error);
      toast({
        title: "❌ Errore ML Processing",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Auto refresh ogni 30 secondi
  useEffect(() => {
    fetchMLData();

    if (autoRefresh) {
      const interval = setInterval(fetchMLData, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'TP_HIT': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'SL_HIT': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'PENDING': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'TP_HIT': return <CheckCircle className="w-4 h-4" />;
      case 'SL_HIT': return <AlertCircle className="w-4 h-4" />;
      case 'PENDING': return <Clock className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  // ML Status helpers
  const getMLStatusColor = (mlStatus: string) => {
    switch (mlStatus) {
      case 'CONFIRMED': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'REJECTED': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'INSUFFICIENT_DATA': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'PENDING': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getMLStatusIcon = (mlStatus: string) => {
    switch (mlStatus) {
      case 'CONFIRMED': return <Zap className="w-4 h-4" />;
      case 'REJECTED': return <AlertCircle className="w-4 h-4" />;
      case 'INSUFFICIENT_DATA': return <Database className="w-4 h-4" />;
      case 'PENDING': return <Clock className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  // Filtra segnali in base al toggle
  const filteredSignals = showMLOnly
    ? recentSignals.filter(s => s.ml_status === 'CONFIRMED' || s.ml_status === 'REJECTED')
    : recentSignals;

  const getWeightCategoryColor = (category: string) => {
    switch (category) {
      case 'trend': return 'bg-blue-500/10 text-blue-500';
      case 'momentum': return 'bg-purple-500/10 text-purple-500';
      case 'volatility': return 'bg-orange-500/10 text-orange-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Brain className="w-8 h-8 text-purple-600" />
              ML Trading Dashboard
            </h1>
            <p className="text-muted-foreground">
              Sistema di Machine Learning per ottimizzazione segnali di trading
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              Auto Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchMLData}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Aggiorna
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMLOnly(!showMLOnly)}
            >
              <Filter className="w-4 h-4 mr-2" />
              {showMLOnly ? 'Tutti Segnali' : 'Solo ML'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={processPendingSignals}
              disabled={!mlStatus.hasSufficientData}
              className={!mlStatus.hasSufficientData ? 'opacity-50' : ''}
            >
              <Zap className="w-4 h-4 mr-2" />
              Process ML
            </Button>
            <Button
              size="sm"
              onClick={generateSignals}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Target className="w-4 h-4 mr-2" />
              Genera Segnali
            </Button>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Sistema ML Dual-Component */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Sistema Dual-Component</p>
                  <p className="text-2xl font-bold mt-1">
                    {mlStatus.hasSufficientData ? 'ML Attivo' : 'Base Only'}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  mlStatus.hasSufficientData ? 'bg-green-100' : 'bg-orange-100'
                }`}>
                  {mlStatus.hasSufficientData ? (
                    <Zap className="w-6 h-6 text-green-600" />
                  ) : (
                    <Brain className="w-6 h-6 text-orange-600" />
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Dati ML: {mlStatus.mlSamplesAvailable}/100
              </p>
            </CardContent>
          </Card>

          {/* Segnali Totali */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Segnali Totali</p>
                  <p className="text-2xl font-bold mt-1">{mlStatus.totalSignals}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div>
                  <p className="text-xs text-muted-foreground">Attivi</p>
                  <p className="text-sm font-semibold text-yellow-600">{mlStatus.activeSignals}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Completati</p>
                  <p className="text-sm font-semibold text-green-600">{mlStatus.completedSignals}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ML Confirmation Stats */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">ML Confirmation</p>
                  <p className="text-2xl font-bold mt-1">
                    {mlStatus.mlConfirmed > 0 ? `${mlStatus.mlConfirmed}` : 'N/D'}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div>
                  <p className="text-xs text-muted-foreground">Confermati</p>
                  <p className="text-sm font-semibold text-green-600">{mlStatus.mlConfirmed}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Respinti</p>
                  <p className="text-sm font-semibold text-red-600">{mlStatus.mlRejected}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Confronto Confidenze */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Confidenza Media</p>
                  <p className="text-2xl font-bold mt-1">
                    {mlStatus.avgMLConfidence > 0 ? `${mlStatus.avgMLConfidence.toFixed(1)}%` : 'N/D'}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  mlStatus.avgMLConfidence > mlStatus.avgBaseConfidence ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  <ArrowRight className={`w-6 h-6 ${
                    mlStatus.avgMLConfidence > mlStatus.avgBaseConfidence ? 'text-green-600' : 'text-gray-600'
                  }`} />
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 text-xs">
                <span className="text-muted-foreground">Base: {mlStatus.avgBaseConfidence.toFixed(1)}%</span>
                <span className="text-muted-foreground">ML: {mlStatus.avgMLConfidence.toFixed(1)}%</span>
              </div>
            </CardContent>
          </Card>

          {/* Profit Medio */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Profit Medio</p>
                  <p className={`text-2xl font-bold mt-1 ${
                    mlStatus.avgProfit >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    ${mlStatus.avgProfit >= 0 ? '+' : ''}{mlStatus.avgProfit.toFixed(2)}$
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  mlStatus.avgProfit >= 0 ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  <TrendingUp className={`w-6 h-6 ${
                    mlStatus.avgProfit >= 0 ? 'text-green-600' : 'text-red-600'
                  }`} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Per trade (0.01 lot)
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Segnali Recenti */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Segnali Recenti
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Caricamento...</span>
                </div>
              ) : filteredSignals.length > 0 ? (
                <div className="space-y-3">
                  {filteredSignals.map((signal) => (
                    <div key={signal.id} className={`p-3 rounded-lg border ${getStatusColor(signal.status)}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(signal.status)}
                          <span className="font-medium">{signal.symbol}</span>
                          {signal.ml_status && (
                            <div className="flex items-center gap-1">
                              {getMLStatusIcon(signal.ml_status)}
                              <Badge
                                variant="outline"
                                className={`text-xs ${getMLStatusColor(signal.ml_status)}`}
                              >
                                {signal.ml_status}
                              </Badge>
                            </div>
                          )}
                        </div>
                        <Badge
                          variant={signal.signal === 'BUY' ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {signal.signal}
                        </Badge>
                      </div>

                      {/* Confronto Confidenze */}
                      <div className="flex items-center justify-between mt-2 text-sm">
                        <span className="text-muted-foreground">
                          {new Date(signal.created_at).toLocaleString('it-IT')}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <span className="text-xs text-muted-foreground">Base</span>
                            <span className="ml-2 font-medium">{signal.confidence}%</span>
                          </div>
                          {signal.ml_confidence && (
                            <>
                              <ArrowRight className="w-3 h-3 text-muted-foreground" />
                              <div className="text-right">
                                <span className="text-xs text-muted-foreground">ML</span>
                                <span className={`ml-2 font-medium ${
                                  signal.ml_confidence > signal.confidence ? 'text-green-600' : 'text-gray-600'
                                }`}>
                                  {signal.ml_confidence}%
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* ML Weight Score */}
                      {signal.ml_weight_score !== null && (
                        <div className="flex items-center justify-between mt-1 text-xs">
                          <span className="text-muted-foreground">ML Score:</span>
                          <span className={`font-medium ${
                            signal.ml_weight_score > 0 ? 'text-green-600' :
                            signal.ml_weight_score < 0 ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {signal.ml_weight_score.toFixed(3)}
                          </span>
                        </div>
                      )}

                      {signal.profit_loss !== null && (
                        <div className="text-sm mt-1">
                          P/L: <span className={`font-semibold ${signal.profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${signal.profit_loss.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nessun segnale disponibile</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pesi Ottimizzati */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Pesi Ottimizzati
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Caricamento...</span>
                </div>
              ) : weights.length > 0 ? (
                <div className="space-y-3">
                  {weights.map((weight, index) => (
                    <div key={weight.indicator_name} className="flex items-center justify-between p-2 rounded bg-muted/50">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono">{index + 1}.</span>
                        <span className="text-sm font-medium">{weight.indicator_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`text-xs ${getWeightCategoryColor(weight.weight_category)}`}
                        >
                          {weight.weight_category}
                        </Badge>
                        <span className="text-sm font-semibold">
                          {weight.current_weight.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div className="text-xs text-muted-foreground mt-4 text-center">
                    Ultimo aggiornamento: {new Date(weights[0]?.last_updated || '').toLocaleString('it-IT')}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nessun peso ottimizzato disponibile</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Info Footer */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-sm text-muted-foreground">
              <p className="mb-2">
                <strong>Sistema Dual-Component:</strong>
                {mlStatus.hasSufficientData ?
                  '✅ Base + ML Confirmation attivi' :
                  '⚠️ Solo sistema Base (in attesa dati ML)'
                }
              </p>
              <p className="mb-2">
                <strong>Dati ML disponibili:</strong> {mlStatus.mlSamplesAvailable}/100 (minimo per ML attivo)
              </p>
              <div className="flex items-center justify-center gap-4 mb-2">
                <span>
                  <strong>Confidenza Base:</strong> {mlStatus.avgBaseConfidence.toFixed(1)}%
                </span>
                {mlStatus.avgMLConfidence > 0 && (
                  <>
                    <ArrowRight className="w-4 h-4" />
                    <span>
                      <strong>Confidenza ML:</strong> {mlStatus.avgMLConfidence.toFixed(1)}%
                    </span>
                  </>
                )}
              </div>
              <p className="mb-2">
                <strong>Ultimo aggiornamento:</strong> {new Date(mlStatus.lastUpdate).toLocaleString('it-IT')}
              </p>
              <p>
                Architettura sicura a due componenti: generate-ai-signals (sistema base) + ml-confirmation (enhancement ML).
                I segnali base vengono generati con logica collaudata, ML conferma solo quando ci sono dati sufficienti.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}