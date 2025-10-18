import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, BarChart3, TrendingUp, TrendingDown, Target, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Helper function to format prices based on symbol
const formatPrice = (price: number | undefined, symbol: string): string => {
  if (!price || typeof price !== 'number' || !isFinite(price)) return 'N/A';

  if (symbol === 'XAUUSD' || symbol === 'XAGUSD' || symbol === 'XAU_USD' || symbol === 'XAG_USD') {
    // Gold/Silver: 2 decimals
    return price.toFixed(2);
  } else if (symbol.includes('JPY')) {
    // JPY pairs: 3 decimals
    return price.toFixed(3);
  } else if (symbol === 'BTCUSD' || symbol === 'ETHUSD') {
    // Crypto: 2 decimals
    return price.toFixed(2);
  } else {
    // Forex (EURUSD, GBPUSD, etc): 5 decimals
    return price.toFixed(5);
  }
};

interface AIAnalysisPanelProps {
  symbol: string;
  onSignalGenerated?: (signal: AnalysisResult | null) => void;
}

interface TechnicalIndicator {
  name: string;
  value: number;
  signal: string;
  timeframe: string;
}

interface Pattern {
  type: string;
  direction: string;
  reliability: number;
  timeframe: string;
}

interface PriceAction {
  trend: string;
  momentum: string;
  support: number;
  resistance: number;
}

interface NewsItem {
  title: string;
  sentiment: string;
  impact: string;
  publishedAt: string;
}

interface AnalysisResult {
  type: "BUY" | "SELL" | "HOLD";
  confidence: number;
  confidencePercent?: string;
  price: number;
  reason?: string;
  reasoning?: string[];
  stopLoss?: number;
  takeProfit?: number;
  riskReward?: string;
  analysis?: {
    technical?: TechnicalIndicator[];
    patterns?: Pattern;
    priceAction?: PriceAction;
    news?: NewsItem[];
    volatility?: {
      stopLoss: number;
      takeProfit: number;
      riskReward: string;
    };
    riskAmount?: string;
    rewardAmount?: string;
    riskRewardRatio?: string;
  };
}

export const AIAnalysisPanel = ({ symbol, onSignalGenerated }: AIAnalysisPanelProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const { toast } = useToast();

  const handleAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-ai-signals', {
        body: { symbol, saveToDatabase: false, analysisOnly: true, localAnalysis: true },
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2b3BtZGZsbmVjeXJ3cnpoeWZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NDc4ODQsImV4cCI6MjA3NDEyMzg4NH0.snlFF1ChbYsA765gXE-cMGb11jHIaF2np_pNxIGLgW8'
        }
      });

      if (error) {
        throw error;
      }

      setAnalysisResult(data);

      // ✅ Passa il segnale al componente padre (Index.tsx)
      if (onSignalGenerated) {
        onSignalGenerated(data);
      }

      toast({
        title: "Analisi completata",
        description: `Segnale ${data.type} generato per ${symbol}`,
      });
    } catch (error) {
      console.error('Errore durante l\'analisi AI:', error);
      toast({
        title: "Errore",
        description: "Errore durante l'analisi AI. Riprova.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Confidence color helper functions
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return "text-green-500 bg-green-500/10 border-green-500/20";
    else if (confidence >= 70) return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
    else if (confidence >= 55) return "text-orange-500 bg-orange-500/10 border-orange-500/20";
    else return "text-red-500 bg-red-500/10 border-red-500/20";
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 85) return "Eccellente";
    else if (confidence >= 70) return "Buono";
    else if (confidence >= 55) return "Discreto";
    else return "Debole";
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
          Analisi AI Trading
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Visualizza i segnali AI generati dal pannello "Analisi Trade Professionale" e pronti per l'esecuzione su MT5.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">

        {isAnalyzing ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 animate-pulse text-purple-600" />
              <span className="text-sm">Analisi {symbol} in corso...</span>
            </div>
            <Progress value={33} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Analisi multi-timeframe con Gemini AI
            </p>
            <div className="space-y-1 text-xs">
              <p>• Analisi tecnica M1, M5, M15</p>
              <p>• Riconoscimento pattern grafici</p>
              <p>• Analisi price action e volatilità</p>
              <p>• Sentiment news ultime 24h</p>
            </div>
          </div>
        ) : analysisResult ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {analysisResult.type === 'BUY' ? (
                  <TrendingUp className="w-4 h-4 text-success" />
                ) : analysisResult.type === 'SELL' ? (
                  <TrendingDown className="w-4 h-4 text-danger" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="font-medium">Segnale: {analysisResult.type}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`${getConfidenceColor(analysisResult.confidence)} text-xs font-semibold px-2 py-0.5 border`}
                >
                  <Target className="w-3 h-3 mr-1" />
                  {analysisResult.confidencePercent ?? `${typeof analysisResult.confidence === 'number' ? analysisResult.confidence.toFixed(0) : 0}%`}
                </Badge>
                <span className={`text-xs font-medium ${getConfidenceColor(analysisResult.confidence).split(' ')[0]}`}>
                  {getConfidenceLabel(analysisResult.confidence)}
                </span>
              </div>
            </div>

            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-xs font-medium text-muted-foreground mb-1">Analisi:</p>
              <p className="text-sm">{analysisResult.reason ?? 'No reason provided'}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-danger/5 border border-danger/20 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">Stop Loss</p>
                <p className="font-semibold text-danger">${formatPrice(analysisResult.stopLoss ?? analysisResult.analysis?.volatility?.stopLoss, symbol)}</p>
              </div>
              <div className="bg-success/5 border border-success/20 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">Take Profit</p>
                <p className="font-semibold text-success">${formatPrice(analysisResult.takeProfit ?? analysisResult.analysis?.volatility?.takeProfit, symbol)}</p>
              </div>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
              <div className="flex items-center gap-2 text-primary text-sm font-medium mb-2">
                <Shield className="w-4 h-4" />
                Dettagli Analisi
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>• Pattern riconosciuto: {analysisResult.analysis?.patterns?.type ?? 'N/A'}</p>
                <p>• Trend attuale: {analysisResult.analysis?.priceAction?.trend ?? 'N/A'}</p>
                <p>• Indicatori tecnici: {analysisResult.analysis?.technical?.filter(t => t.signal !== 'NEUTRAL').length ?? 0} segnali</p>
                <p>• News sentiment: {analysisResult.analysis?.news?.filter(n => n.sentiment !== 'NEUTRAL').length ?? 0} eventi rilevanti</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setAnalysisResult(null);
                  if (onSignalGenerated) {
                    onSignalGenerated(null); // Reset signal in parent
                  }
                }}
              >
                Nuova Analisi
              </Button>
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                onClick={() => {
                  if (onSignalGenerated) {
                    onSignalGenerated(analysisResult);
                  }
                }}
              >
                Esegui su MT5
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};