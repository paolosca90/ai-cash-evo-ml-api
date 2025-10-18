/**
 * ML Signals Panel - Production ML Integration
 *
 * Uses TensorFlow.js ML models with real trading data
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Helper function to format prices based on symbol
const formatPrice = (price: number | undefined, symbol: string): string => {
  if (!price) return 'N/A';

  if (symbol === 'XAUUSD' || symbol === 'XAGUSD' || symbol === 'XAU_USD' || symbol === 'XAG_USD') {
    return price.toFixed(2);
  } else if (symbol.includes('JPY')) {
    return price.toFixed(3);
  } else if (symbol === 'BTCUSD' || symbol === 'ETHUSD') {
    return price.toFixed(2);
  } else {
    return price.toFixed(5);
  }
};
import {
  Bot,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react';
import { mlSignalService } from '@/services/mlSignalService';
import { useToast } from '@/components/ui/use-toast';
import type { AISignal } from '@/types/trading';

interface MLSignalsPanelProps {
  symbol: string;
  onSignalGenerated?: (signal: AISignal) => void;
}

export function MLSignalsPanel({ symbol, onSignalGenerated }: MLSignalsPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [signal, setSignal] = useState<AISignal | null>(null);
  const [uncertainty, setUncertainty] = useState<{epistemic: number; aleatoric: number; total: number} | null>(null);
  const [constraints, setConstraints] = useState<Array<{type: string; severity: string; message: string}>>([]);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const generateMLSignal = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Generate ML signal with real market data
      const result = await mlSignalService.generateSignal({
        symbol,
        timeout: 10000,
        useEnsemble: true,
        enableConstraints: true
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate ML signal');
      }

      setSignal(result.signal!);
      setUncertainty(result.uncertainty);
      setConstraints(result.constraints || []);

      // Notify parent
      if (onSignalGenerated && result.signal) {
        onSignalGenerated(result.signal);
      }

      toast({
        title: '✅ ML Signal Generated',
        description: `${result.signal!.type} ${symbol} - Confidence: ${(result.signal!.confidence * 100).toFixed(0)}%`,
      });

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);

      toast({
        title: '❌ ML Signal Failed',
        description: errorMsg,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-generate on mount
  useEffect(() => {
    generateMLSignal();
  }, [symbol, generateMLSignal]);

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'BUY':
        return <TrendingUp className="h-6 w-6 text-green-500" />;
      case 'SELL':
        return <TrendingDown className="h-6 w-6 text-red-500" />;
      default:
        return <Activity className="h-6 w-6 text-yellow-500" />;
    }
  };

  const getActionColor = (type: string) => {
    switch (type) {
      case 'BUY':
        return 'text-green-600 dark:text-green-400';
      case 'SELL':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-yellow-600 dark:text-yellow-400';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      default:
        return 'secondary';
    }
  };

  return (
    <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-blue-500/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-purple-500" />
            ML Trading Signal
            <Badge variant="outline" className="ml-2">
              TensorFlow.js
            </Badge>
          </CardTitle>
          <Button
            onClick={generateMLSignal}
            disabled={isLoading}
            size="sm"
            variant="outline"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Refresh'
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Signal Display */}
        {signal && !error && (
          <>
            {/* Main Signal */}
            <div className="flex items-center justify-between p-4 bg-background/50 rounded-lg border">
              <div className="flex items-center gap-3">
                {getActionIcon(signal.type)}
                <div>
                  <div className={`text-2xl font-bold ${getActionColor(signal.type)}`}>
                    {signal.type}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {signal.symbol}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-lg font-semibold">
                  {(signal.confidence * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground">Confidence</div>
              </div>
            </div>

            {/* Price Levels */}
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="p-2 bg-background/50 rounded border">
                <div className="text-muted-foreground text-xs">Entry</div>
                <div className="font-semibold">${formatPrice(signal.entryPrice, signal.symbol)}</div>
              </div>
              <div className="p-2 bg-background/50 rounded border">
                <div className="text-muted-foreground text-xs">Stop Loss</div>
                <div className="font-semibold text-red-500">
                  ${formatPrice(signal.stopLoss, signal.symbol)}
                </div>
              </div>
              <div className="p-2 bg-background/50 rounded border">
                <div className="text-muted-foreground text-xs">Take Profit</div>
                <div className="font-semibold text-green-500">
                  ${formatPrice(signal.takeProfit, signal.symbol)}
                </div>
              </div>
            </div>

            {/* Uncertainty */}
            {uncertainty && (
              <div className="p-3 bg-background/50 rounded-lg border space-y-2">
                <div className="text-sm font-medium">Uncertainty Analysis</div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-muted-foreground">Epistemic</div>
                    <div className="font-semibold">
                      {(uncertainty.epistemic * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Aleatoric</div>
                    <div className="font-semibold">
                      {(uncertainty.aleatoric * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Total</div>
                    <div className="font-semibold">
                      {(uncertainty.total * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Constraints */}
            {constraints.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  Safety Constraints ({constraints.length})
                </div>
                {constraints.map((constraint, idx) => (
                  <Alert key={idx} variant={getSeverityColor(constraint.severity) as "default" | "destructive"}>
                    <AlertDescription className="text-xs">
                      <div className="font-semibold">{constraint.type}</div>
                      <div>{constraint.message}</div>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            {/* Reasoning */}
            {signal.reasoning && (
              <div className="p-3 bg-background/50 rounded-lg border">
                <div className="text-sm font-medium mb-1">Analysis</div>
                <div className="text-xs text-muted-foreground">
                  {signal.reasoning}
                </div>
              </div>
            )}

            {/* ML Metadata */}
            {signal && 'mlMetadata' in signal && (signal as {mlMetadata?: {modelVersion: string}}).mlMetadata && (
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex items-center justify-between">
                  <span>Model Version:</span>
                  <Badge variant="outline" className="text-xs">
                    {(signal as {mlMetadata: {modelVersion: string}}).mlMetadata.modelVersion}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Ensemble:</span>
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                </div>
              </div>
            )}
          </>
        )}

        {/* Loading State */}
        {isLoading && !signal && (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            <div className="text-sm text-muted-foreground">
              Running ML inference with real market data...
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default MLSignalsPanel;
