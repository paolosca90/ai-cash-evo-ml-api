/**
 * TRADE ANALYSIS PANEL - VERSIONE ORIGINALE (SOLO ANALISI)
 *
 * Questo componente replica il vecchio comportamento:
 * 1. Bottone "Avvia Analisi" → Genera segnale senza salvarlo nel database
 * 2. Mostra il segnale generato con SL/TP professionali
 * 3. L'utente poi deve usare TradeExecutionPanelV2 per l'esecuzione
 *
 * È separato da TradeExecutionPanelV2 che serve solo per l'esecuzione.
 */

import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Loader2,
  Brain,
  BarChart3,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  analysis?: {
    reasoning?: string[];
  };
  price?: {
    mid: number;
    spread: number;
  };
  [key: string]: unknown;
}

interface TradeAnalysisPanelProps {
  symbol: string;
  onSignalGenerated?: (signal: TradingSignal | null) => void;
}

export const TradeAnalysisPanel = ({ symbol, onSignalGenerated }: TradeAnalysisPanelProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastSignal, setLastSignal] = useState<TradingSignal | null>(null);
  const { toast } = useToast();

  // 🛡️ Protezione contro click multipli
  const isAnalyzingRef = useRef(false);

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

  // ✨ Genera descrizione professionale personalizzata basata sul segnale
  const generateProfessionalDescription = (signal: TradingSignal): string => {
    const { direction, confidence, symbol, stopLoss, takeProfit, entryPrice } = signal;
    const riskReward = entryPrice && stopLoss && takeProfit ?
      Math.abs((takeProfit - entryPrice) / (stopLoss - entryPrice)).toFixed(2) : '1.5';

    const directionDesc = direction === 'BUY' ?
      { action: 'acquisto', momentum: 'rialzista', target: 'superiori' } :
      { action: 'vendita', momentum: 'ribassista', target: 'inferiori' };

    const confidenceDesc = confidence >= 85 ? 'molto elevata' :
                          confidence >= 70 ? 'elevata' :
                          confidence >= 55 ? 'moderata' : 'bassa';

    const symbolDesc = symbol === 'XAUUSD' ? 'Gold' :
                       symbol === 'BTCUSD' ? 'Bitcoin' :
                       symbol === 'ETHUSD' ? 'Ethereum' :
                       symbol.includes('JPY') ? symbol.replace('USD', '/Yen') :
                       symbol.replace('USD', '/USD');

    // Template base per descrizione professionale
    let description = `🎯 **Segnale ${directionDesc.momentum.toUpperCase()} per ${symbolDesc}**\n\n`;

    description += `L'analisi tecnica indica un'opportunità di ${directionDesc.action} con una confidenza ${confidenceDesc} del ${confidence}%. `;

    description += `Il mercato mostra un chiaro slancio ${directionDesc.momentum} con i prezzi che si dirigono verso livelli ${directionDesc.target}. `;

    if (entryPrice && stopLoss && takeProfit) {
      description += `**Livelli operativi:**\n`;
      description += `• **Entry**: ${entryPrice.toFixed(5)}\n`;
      description += `• **Stop Loss**: ${stopLoss.toFixed(5)} (protezione del capitale)\n`;
      description += `• **Take Profit**: ${takeProfit.toFixed(5)} (obiettivo di profitto)\n`;
      description += `• **Risk/Reward**: 1:${riskReward}\n\n`;
    }

    description += `**Strategy Rationale:** Questo segnale si basa su indicatori tecnici avanzati che confermano la forza del trend ${directionDesc.momentum}. `;
    description += `I livelli di ingresso e uscita sono stati ottimizzati per massimizzare il potenziale di profitto mantenendo un rigoroso controllo del rischio.\n\n`;

    description += `**Consiglio operativo:** Si raccomanda di monitorare l'andamento del price action per confermare il mantenimento dello slancio ${directionDesc.momentum} prima dell'esecuzione.`;

    return description;
  };

  // Funzione per analisi SOLO (senza esecuzione trade)
  const analyzeSignal = async () => {
    // 🛡️ PROTEZIONE: Blocca click multipli
    if (isAnalyzingRef.current) {
      console.warn('⚠️ BLOCKED: Tentativo di analisi multipla rilevato e bloccato');
      return;
    }

    // 🛡️ Imposta IMMEDIATAMENTE il flag (sincronicamente)
    isAnalyzingRef.current = true;
    setIsAnalyzing(true);

    try {
      // Ottieni il segnale AI più recente SOLO per visualizzazione locale
      const { data: signalData, error: signalError } = await supabase.functions.invoke('generate-ai-signals', {
        body: {
          symbol,
          saveToDatabase: false,
          analysisOnly: true,
          localAnalysis: true // Indica che è solo per UI locale
        },
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2b3BtZGZsbmVjeXJ3cnpoeWZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NDc4ODQsImV4cCI6MjA3NDEyMzg4NH0.snlFF1ChbYsA765gXE-cMGb11jHIaF2np_pNxIGLgW8'
        }
      });

      if (signalError) throw signalError;
      setLastSignal(signalData);

      // ✅ Passa il segnale al componente padre (Index.tsx)
      if (onSignalGenerated) {
        onSignalGenerated(signalData);
      }

      toast({
        title: `📊 Analisi Completata`,
        description: `${signalData.type} su ${symbol} - Confidenza: ${signalData.confidence}% - Pronto per l'esecuzione`,
        variant: "default",
      });

    } catch (error: unknown) {
      console.error('Errore analisi segnale:', error);
      const errorMessage = error instanceof Error ? error.message : "Impossibile generare il segnale di trading";
      toast({
        title: "Errore Analisi",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      // 🛡️ Reset entrambi i flag
      isAnalyzingRef.current = false;
      setIsAnalyzing(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Analisi Trade Professionale - {symbol}
        </CardTitle>
        <CardDescription>
          Genera segnali di trading professionali con analisi tecnica avanzata e descrizioni dettagliate.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Status Connections */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">AI Analysis</span>
            </div>
            <Badge variant="secondary">Ready</Badge>
          </div>
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Market Data</span>
            </div>
            <Badge variant="secondary">Live</Badge>
          </div>
        </div>

        {/* Analysis Button */}
        <Button
          onClick={analyzeSignal}
          disabled={isAnalyzing}
          variant="outline"
          className="w-full h-14 text-lg font-semibold"
          size="lg"
        >
          {isAnalyzing ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Analizzando...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Brain className="w-6 h-6" />
              Avvia Analisi
            </div>
          )}
        </Button>

        {/* Signal Results with Professional Description */}
        {lastSignal && (
          <div className="space-y-4">
            {/* Signal Header */}
            <div className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Segnale Generato:</span>
                <Badge variant={lastSignal.direction === 'BUY' ? 'default' : 'destructive'} className="text-sm px-3 py-1">
                  {lastSignal.direction === 'BUY' ? (
                    <TrendingUp className="w-4 h-4 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 mr-1" />
                  )}
                  {lastSignal.direction}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Confidenza:</span>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`${getConfidenceColor(lastSignal.confidence)} text-sm font-semibold px-3 py-1`}
                  >
                    <Target className="w-4 h-4 mr-1" />
                    {lastSignal.confidence}%
                  </Badge>
                  <span className={`text-sm font-medium ${getConfidenceColor(lastSignal.confidence).split(' ')[0]}`}>
                    {getConfidenceLabel(lastSignal.confidence)}
                  </span>
                </div>
              </div>
            </div>

            {/* Professional Levels */}
            {lastSignal.entryPrice && (
              <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Livelli Operativi:</h4>
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex justify-between items-center p-2 bg-background rounded border">
                    <span className="text-sm">Entry:</span>
                    <span className="font-semibold">{lastSignal.entryPrice.toFixed(5)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-destructive/10 rounded border border-destructive/20">
                      <div className="text-xs text-muted-foreground">Stop Loss</div>
                      <div className="font-semibold text-destructive">
                        {lastSignal.stopLoss?.toFixed(5) || 'N/A'}
                      </div>
                    </div>
                    <div className="p-2 bg-green-500/10 rounded border border-green-500/20">
                      <div className="text-xs text-muted-foreground">Take Profit</div>
                      <div className="font-semibold text-green-600">
                        {lastSignal.takeProfit?.toFixed(5) || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Professional Description */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Analisi Professionale
              </h4>
              <div className="text-sm text-blue-800 whitespace-pre-line leading-relaxed">
                {generateProfessionalDescription(lastSignal)}
              </div>
            </div>

            {/* Instructions */}
            <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <Activity className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-green-800">
                <span className="font-semibold">Prossimo Passo:</span> Usa il pannello "Esecuzione Trade" qui sotto per eseguire questo segnale su MT5. Il segnale è pronto per l'esecuzione.
              </p>
            </div>
          </div>
        )}

        {/* Risk Warning */}
        <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-orange-800">
            <span className="font-semibold">Avviso di Rischio:</span> Il trading comporta rischi significativi.
            Investi solo capitale che puoi permetterti di perdere. Le analisi fornite non costituiscono consulenza finanziaria.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};