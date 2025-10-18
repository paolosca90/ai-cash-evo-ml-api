import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, TrendingUp, TrendingDown, Activity, Target, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from 'zod';

interface TradingSignal {
  id?: string;
  symbol: string;
  direction: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  riskLevel: number;
  intensity: number;
  expectedReward: number;
  reasoning?: string;
  timestamp?: number;
  [key: string]: unknown;
}

interface TradeExecutionPanelProps {
  symbol: string;
}

// Schema di validazione per i dati di trading
const tradeSchema = z.object({
  riskAmount: z.number().min(1, "L'importo minimo è €1").max(10000, "L'importo massimo è €10,000"),
  symbol: z.string().min(1, "Simbolo richiesto"),
});

export const TradeExecutionPanel = ({ symbol }: TradeExecutionPanelProps) => {
  const [riskAmount, setRiskAmount] = useState<string>('100');
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastSignal, setLastSignal] = useState<TradingSignal | null>(null);
  const [aggressiveMode, setAggressiveMode] = useState(false);
  const { toast } = useToast();

  // 🎨 Get confidence color based on distribution
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

  // Validazione input
  const validateInput = () => {
    try {
      const riskValue = parseFloat(riskAmount);
      tradeSchema.parse({
        riskAmount: riskValue,
        symbol: symbol
      });
      return { valid: true, riskValue };
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Errore di Validazione",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
      return { valid: false, riskValue: 0 };
    }
  };

  // Esegui il test trade con segnale BUY forzato - DIRETTO a MT5
  const executeTestTrade = async () => {
    const validation = validateInput();
    if (!validation.valid) return;

    setIsExecuting(true);
    
    try {
      // Crea segnale BUY ottimale direttamente (senza API generate-ai-signals)
      const perfectBuySignal: TradingSignal = {
        id: 'test_' + Math.random().toString(36).substr(2, 9),
        symbol: symbol,
        direction: 'BUY',
        confidence: 92,
        riskLevel: 2,
        intensity: 8,
        expectedReward: 2.0,
        reasoning: 'TEST SIGNAL: Perfect BUY setup for MT5 execution test',
        timestamp: Date.now(),
        execution: {
          entry: 1.1330,    // PREZZO REALE AGGIORNATO
          stopLoss: 1.1305,  // -25 pips
          takeProfit: 1.1380 // +50 pips (1:2 RR)
        },
        analysis: {
          aiInsights: {
            reasoning: 'Perfect bullish confluence test signal for MT5 validation',
            marketBias: 'STRONG_BUY_BIAS'
          }
        },
        keyFactors: [
          'TEST: All technical indicators aligned BUY',
          'TEST: Perfect institutional breakout setup',
          'TEST: Optimal session timing',
          'TEST: 5/5 confluence factors'
        ]
      };

      setLastSignal(perfectBuySignal);

      // Recupera email utente per autorizzare la creazione del segnale
      const { data: userData } = await supabase.auth.getUser();
      const userEmail = userData?.user?.email;
      if (!userEmail) {
        throw new Error('Nessun utente autenticato: effettua il login per eseguire il trade');
      }

      // Invia DIRETTAMENTE il segnale BUY perfetto a MT5 con header email
      const { data, error} = await supabase.functions.invoke('mt5-trade-signals', {
        body: {
          symbol,
          signal: 'BUY',  // FORZATO BUY
          confidence: 92,
          entry: 1.1330,    // PREZZO REALE
          stopLoss: 1.1305,  // -25 pips SL
          takeProfit: 1.1380, // +50 pips TP
          // Rischio in EUR - invia tutti gli alias comuni per massima compatibilità con l'EA
          riskAmount: validation.riskValue,
          risk_amount: validation.riskValue,
          risk_eur: validation.riskValue,
          amount_to_risk_eur: validation.riskValue,
          riskCurrency: 'EUR',
          positionSizing: { mode: 'FIXED_EUR', risk_eur: validation.riskValue },
          timestamp: new Date().toISOString(),
          clientId: 'MT5_Client_001',
          aiAnalysis: {
            reasoning: 'Perfect bullish test signal for MT5 execution validation',
            keyFactors: [
              'TEST: Technical Confluence BUY',
              'TEST: Pattern Quality Perfect',
              'TEST: Market Structure STRONG_BUY',
              'TEST: Session Optimal',
              'TEST: Volatility Perfect for breakout'
            ],
            marketBias: 'STRONG_BUY_BIAS'
          }
        },
        headers: {
          'x-user-email': userEmail,
        }
      });

      if (error) throw error;

      toast({
        title: `🧪 TEST BUY SIGNAL → MT5 ✅`,
        description: `BUY ${symbol} @ 1.1330 - Rischio: €${validation.riskValue} - SL: 1.1305 - TP: 1.1380`,
        variant: "default",
      });

      console.log('🧪 TEST SIGNAL SENT TO MT5:', {
        symbol,
        signal: 'BUY',
        entry: 1.1330,
        stopLoss: 1.1305,
        takeProfit: 1.1380,
        riskAmount: validation.riskValue
      });

    } catch (error: unknown) {
      console.error('Errore test trade:', error);
      const errorMessage = error instanceof Error ? error.message : "Impossibile inviare il segnale di test";
      toast({
        title: "Errore Test Signal",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };
  const executeTrade = async () => {
    const validation = validateInput();
    if (!validation.valid) return;

    setIsExecuting(true);
    
    try {
      // Recupera email utente
      const { data: userData } = await supabase.auth.getUser();
      const userEmail = userData?.user?.email;
      if (!userEmail) {
        throw new Error('Nessun utente autenticato: effettua il login per eseguire il trade');
      }

      // Genera segnale AI e invia a MT5 in una sola chiamata
      const { data: signalData, error: signalError } = await supabase.functions.invoke('generate-ai-signals', {
        body: { 
          symbol, 
          aggressive: aggressiveMode,
          // Parametri per MT5
          riskAmount: validation.riskValue,
          risk_amount: validation.riskValue,
          risk_eur: validation.riskValue,
          amount_to_risk_eur: validation.riskValue,
          riskCurrency: 'EUR',
          executeOnMT5: true, // Flag per dire alla funzione di eseguire su MT5
        },
        headers: {
          'x-user-email': userEmail,
        }
      });

      if (signalError) throw signalError;
      
      setLastSignal(signalData);

      toast({
        title: `🚀 Trade Eseguito ${aggressiveMode ? '(Modalità Aggressiva)' : ''}`,
        description: `${signalData.type} su ${symbol} - Rischio: €${validation.riskValue} - Confidenza: ${signalData.confidence}%`,
        variant: "default",
      });

    } catch (error: unknown) {
      console.error('Errore esecuzione trade:', error);
      const errorMessage = error instanceof Error ? error.message : "Impossibile eseguire il trade";
      toast({
        title: "Errore Esecuzione",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Esecuzione Trade - {symbol}
        </CardTitle>
        <CardDescription>
          Connesso a MetaTrader 5 tramite Expert Advisor
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Status Connection */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">MetaTrader 5</span>
          </div>
          <Badge variant="secondary">Connesso</Badge>
        </div>

        <Separator />

        {/* Modalità Aggressiva */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
          <div className="flex items-center gap-3">
            {aggressiveMode ? (
              <Zap className="w-5 h-5 text-orange-500" />
            ) : (
              <Target className="w-5 h-5 text-blue-500" />
            )}
            <div>
              <Label className="text-sm font-medium">
                {aggressiveMode ? "Modalità Aggressiva" : "Modalità Conservativa"}
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {aggressiveMode 
                  ? "Soglie più basse - Più segnali BUY/SELL" 
                  : "Soglie elevate - Solo segnali di alta qualità"
                }
              </p>
            </div>
          </div>
          <Switch
            checked={aggressiveMode}
            onCheckedChange={setAggressiveMode}
          />
        </div>

        <Separator />

        {/* Risk Amount Input */}
        <div className="space-y-2">
          <Label htmlFor="risk-amount">Importo da Rischiare (EUR)</Label>
          <Input
            id="risk-amount"
            type="number"
            value={riskAmount}
            onChange={(e) => setRiskAmount(e.target.value)}
            placeholder="100"
            min="1"
            max="10000"
            step="1"
            className="text-lg font-semibold"
          />
          <p className="text-xs text-muted-foreground">
            Importo massimo che sei disposto a perdere su questo trade
          </p>
        </div>

        {/* Test Signal Button for AUDNZD */}
        {symbol === 'AUDNZD' && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Test Signal</span>
            </div>
            <p className="text-xs text-blue-700 mb-3">
              Simula un segnale BUY perfetto per testare l'EA MT5
            </p>
            <Button
              onClick={() => executeTestTrade()}
              disabled={isExecuting || !riskAmount || parseFloat(riskAmount) < 1}
              variant="outline"
              size="sm"
              className="w-full border-blue-300 text-blue-700 hover:bg-blue-100"
            >
              🧪 Test BUY Signal su AUDNZD
            </Button>
          </div>
        )}

        {/* Last Signal Info */}
        {lastSignal && (
          <div className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Ultimo Segnale:</span>
              <Badge variant={lastSignal.direction === 'BUY' ? 'default' : 'destructive'}>
                {lastSignal.direction === 'BUY' ? (
                  <TrendingUp className="w-3 h-3 mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1" />
                )}
                {lastSignal.direction}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Confidence:</span>
              <div className="flex items-center gap-2">
                <Badge 
                  variant="outline"
                  className={`${getConfidenceColor(lastSignal.confidence)} text-xs font-semibold px-2 py-0.5`}
                >
                  <Target className="w-3 h-3 mr-1" />
                  {lastSignal.confidence}%
                </Badge>
                <span className={`text-xs font-medium ${getConfidenceColor(lastSignal.confidence).split(' ')[0]}`}>
                  {getConfidenceLabel(lastSignal.confidence)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Execute Button */}
        <Button 
          onClick={executeTrade}
          disabled={isExecuting || !riskAmount || parseFloat(riskAmount) < 1}
          className="w-full h-12 text-lg font-semibold"
          size="lg"
        >
          {isExecuting ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Analizzando & Inviando...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Esegui Trade su MT5
            </div>
          )}
        </Button>

        {/* Risk Warning */}
        <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-orange-800">
            <span className="font-semibold">Avviso di Rischio:</span> Il trading comporta 
            rischi significativi. Investi solo quello che puoi permetterti di perdere. 
            L'Expert Advisor eseguirà automaticamente i trade su MetaTrader 5.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};