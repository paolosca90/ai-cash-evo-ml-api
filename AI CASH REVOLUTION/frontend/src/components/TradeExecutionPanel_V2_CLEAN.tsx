/**
 * TRADE EXECUTION PANEL - VERSIONE 2 (SOLO ESECUZIONE)
 *
 * LOGICA SEMPLICISSIMA:
 *
 * - Prende il segnale generato da AIAnalysisPanel
 * - UN SOLO PULSANTE: "ESEGUI SU MT5"
 * - Quando premuto → mt5-trade-signals-v2 (POST)
 *   - Salva nel database con sent=false
 *   - EA lo prenderà al prossimo polling
 *
 * SEPARAZIONE CHIARA:
 * - AIAnalysisPanel = Genera e visualizza (NO DB)
 * - TradeExecutionPanel = Solo esecuzione (SI DB)
 */

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Play,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TradeExecutionPanelProps {
  symbol: string;
  signal: any; // Signal from AIAnalysisPanel
}

interface AnalysisResult {
  type: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  price: { mid: number; spread: number };
  stopLoss: number;
  takeProfit: number;
  analysis?: {
    reasoning?: string[];
  };
}

export const TradeExecutionPanelV2 = ({ symbol, signal }: TradeExecutionPanelProps) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showExecutionPopup, setShowExecutionPopup] = useState(false);
  const { toast } = useToast();

  // Converti il segnale al formato corretto
  const analysisResult: AnalysisResult | null = signal ? {
    type: signal.type,
    confidence: signal.confidence,
    price: signal.price || { mid: signal.entryPrice || 0, spread: 0 },
    stopLoss: signal.stopLoss,
    takeProfit: signal.takeProfit,
    analysis: signal.analysis
  } : null;

  // ========================================================
  // ESECUZIONE SU MT5 (Salva nel DB → EA)
  // ========================================================
  const handleExecuteOnMT5 = async () => {
    if (!analysisResult) {
      toast({
        title: "❌ Nessun Segnale",
        description: "Prima esegui un'analisi dall'AI Analysis Panel",
        variant: "destructive",
      });
      return;
    }

    setIsExecuting(true);
    setShowExecutionPopup(true);

    try {
      console.log(`🚀 [ESECUZIONE] Salvataggio segnale per MT5: ${analysisResult.type} ${symbol}`);

      // Ottieni email utente
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        throw new Error('User email not found');
      }

      // Ottieni tasso EURUSD
      let eurusdRate = 1.10;
      try {
        const { data: eurusdData } = await supabase.functions.invoke('generate-ai-signals', {
          body: { symbol: 'EUR_USD', priceOnly: true, localAnalysis: true }
        });
        if (eurusdData?.price?.mid) eurusdRate = eurusdData.price.mid;
      } catch (err) {
        console.warn('Using fallback EURUSD rate:', eurusdRate);
      }

      // Chiama la NUOVA edge function V2
      const { data, error } = await supabase.functions.invoke('mt5-trade-signals-v2', {
        body: {
          symbol,
          signal: analysisResult.type,
          entry: analysisResult.price.mid,
          stopLoss: analysisResult.stopLoss,
          takeProfit: analysisResult.takeProfit,
          confidence: analysisResult.confidence,
          eurusdRate,
        },
        headers: {
          'x-user-email': user.email,
        },
      });

      if (error) throw error;

      console.log(`✅ [ESECUZIONE] Segnale salvato con successo:`, data);

      toast({
        title: "✅ Segnale Salvato!",
        description: `${analysisResult.type} su ${symbol} salvato. L'EA lo eseguirà automaticamente.`,
        duration: 5000,
      });

    } catch (error) {
      console.error('❌ [ESECUZIONE] Errore:', error);
      toast({
        title: "Errore Esecuzione",
        description: error instanceof Error ? error.message : "Impossibile salvare il segnale",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
      setShowConfirmDialog(false);
      setShowExecutionPopup(false);
    }
  };

  // ========================================================
  // RENDERING
  // ========================================================
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Esecuzione Trade - {symbol}
        </CardTitle>
        <CardDescription>
          ⚠️ Usa l'AI Analysis Panel per generare un segnale, poi eseguilo qui su MT5
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* STATUS CONNECTIONS */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">AI Engine</span>
            </div>
            <Badge variant="secondary">Ready</Badge>
          </div>
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">MT5 EA</span>
            </div>
            <Badge variant="secondary">Polling</Badge>
          </div>
        </div>

        {/* SEGNALE DISPONIBILE */}
        {analysisResult && (
          <Alert className="border-2 border-primary">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Segnale Pronto:</span>
                  <Badge
                    variant={analysisResult.type === 'BUY' ? 'default' : 'destructive'}
                    className="flex items-center gap-1"
                  >
                    {analysisResult.type === 'BUY' ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {analysisResult.type}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Confidenza:</span>
                  <Badge variant="outline">
                    <Target className="w-3 h-3 mr-1" />
                    {analysisResult.confidence}%
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-destructive/10 rounded">
                    <div className="text-muted-foreground">Stop Loss</div>
                    <div className="font-semibold">${analysisResult.stopLoss?.toFixed(5) || 'N/A'}</div>
                  </div>
                  <div className="p-2 bg-green-500/10 rounded">
                    <div className="text-muted-foreground">Take Profit</div>
                    <div className="font-semibold">${analysisResult.takeProfit?.toFixed(5) || 'N/A'}</div>
                  </div>
                </div>
                {analysisResult.analysis?.reasoning && (
                  <div className="text-xs text-muted-foreground">
                    💡 {analysisResult.analysis.reasoning.slice(0, 2).join(' • ')}
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* BUTTON: ESEGUI SU MT5 (solo se c'è un segnale) */}
        {analysisResult ? (
          <Button
            onClick={() => setShowConfirmDialog(true)}
            disabled={isExecuting}
            className="w-full h-14 text-lg font-semibold bg-green-600 hover:bg-green-700"
            size="lg"
          >
            <div className="flex items-center gap-2">
              <Play className="w-5 h-5" />
              ESEGUI SU MT5 ({analysisResult.type})
            </div>
          </Button>
        ) : (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Nessun segnale disponibile.</strong><br/>
              Usa il pannello "Analisi AI Trading" qui sopra per generare un segnale prima.
            </AlertDescription>
          </Alert>
        )}

        {/* RISK WARNING */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Avviso:</strong> Il pulsante "ESEGUI SU MT5" salverà il segnale nel database. L'EA lo eseguirà automaticamente entro 10 secondi.
          </AlertDescription>
        </Alert>
      </CardContent>

      {/* CONFIRMATION DIALOG */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Esecuzione Trade</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per inviare questo segnale all'EA MT5 per l'esecuzione automatica:

              <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Simbolo:</span>
                  <span>{symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Direzione:</span>
                  <Badge variant={analysisResult?.type === 'BUY' ? 'default' : 'destructive'}>
                    {analysisResult?.type}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Confidenza:</span>
                  <span>{analysisResult?.confidence}%</span>
                </div>
              </div>

              <Alert className="mt-4" variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Questa azione salverà il segnale nel database. L'EA lo eseguirà automaticamente al prossimo polling (entro 10 secondi).
                </AlertDescription>
              </Alert>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExecuteOnMT5}
              className="bg-green-600 hover:bg-green-700"
            >
              Conferma Esecuzione
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* EXECUTION LOADING POPUP */}
      <Dialog open={showExecutionPopup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Loader2 className="w-5 h-5 animate-spin text-green-600" />
              Inserimento Trade in Corso
            </DialogTitle>
            <DialogDescription className="space-y-3">
              <p className="text-sm">
                Stiamo inserendo il tuo ordine nel mercato...
              </p>
              <div className="bg-muted/50 p-3 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Simbolo:</span>
                  <span>{symbol}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Direzione:</span>
                  <Badge variant={analysisResult?.type === 'BUY' ? 'default' : 'destructive'}>
                    {analysisResult?.type}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Stato:</span>
                  <span className="text-green-600">Inserimento in corso...</span>
                </div>
              </div>
              <div className="flex items-center justify-center py-2">
                <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                L'Expert Advisor MT5 riceverà il segnale e eseguirà l'ordine automaticamente entro pochi secondi.
              </p>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
