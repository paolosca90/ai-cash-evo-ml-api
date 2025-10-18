import { useState, useEffect, useCallback, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bot,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Target,
  Shield,
  Crown,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  WifiOff,
  Clock
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import type { AISignal } from "@/types/trading";
import { TradingError } from "@/types/trading";

interface AISignalsProps {
  symbol: string;
}

// Enhanced AI signal generator using the new AI Signal Service with fallback
const generateAISignal = async (symbol: string, useFallback = true): Promise<AISignal> => {
  try {
    // Import the AI signal service
    const { generateAISignal: generateSignal } = await import("@/services/aiSignalService");

    // Validate input
    if (!symbol || typeof symbol !== 'string') {
      throw new Error('Invalid symbol provided');
    }

    console.log(`🤖 Generating AI signal for ${symbol} with fallback enabled: ${useFallback}`);

    const result = await generateSignal({
      symbol: symbol.toUpperCase().trim(),
      timeout: 25000, // 25 seconds
      maxRetries: 2,
      useFallback,
      strategy: 'comprehensive'
    });

    if (!result.success || !result.signal) {
      throw new Error(result.error || 'Failed to generate AI signal');
    }

    console.log(`✅ AI signal generated successfully from ${result.source} strategy in ${result.processingTime}ms`);
    console.log(`📊 Signal: ${result.signal.type} ${result.signal.symbol} - Confidence: ${result.signal.confidence}%`);

    return result.signal;

  } catch (error) {
    // Enhanced error handling with specific messages
    if (error instanceof Error) {
      if (error.message.includes('Limite giornaliero')) {
        throw new Error(error.message); // Preserve Italian message for limit reached
      }

      if (error.message.includes('All signal generation strategies failed')) {
        throw new Error('All AI signal services are currently unavailable. Please try again in a few minutes.');
      }

      if (error.message.includes('timed out')) {
        throw new Error('AI signal generation timed out. The service is taking longer than expected. Please try again.');
      }

      if (error.message.includes('network') || error.message.includes('fetch')) {
        throw new Error('Network connection error. Please check your internet connection and try again.');
      }

      if (error.message.includes('429') || error.message.includes('Too many requests')) {
        throw new Error('Rate limit exceeded. Please wait a moment before generating another signal.');
      }

      // Re-throw the original error for other cases
      throw error;
    }

    // Unknown error
    throw new Error('An unexpected error occurred while generating the AI signal. Please try again.');
  }
};

// Removed mock signal generator to ensure only real analysis is used

// Component for displaying error states
const ErrorState = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <Card className="bg-card border-border">
    <CardContent className="pt-6">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <AlertTriangle className="w-12 h-12 text-destructive" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Signal Generation Error</h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
        </div>
        <Button onClick={onRetry} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Try Again
        </Button>
      </div>
    </CardContent>
  </Card>
);

// Component for displaying loading state with timeout
const LoadingState = ({ message }: { message: string }) => (
  <Card className="bg-card border-border">
    <CardContent className="pt-6">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="relative">
            <Bot className="w-12 h-12 text-primary animate-pulse" />
            <RefreshCw className="w-4 h-4 text-primary absolute -bottom-1 -right-1 animate-spin" />
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">AI Analysis in Progress</h3>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        <div className="flex justify-center items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>This may take up to 25 seconds</span>
        </div>
      </div>
    </CardContent>
  </Card>
);

export const AISignals = ({ symbol }: AISignalsProps) => {
  const [signals, setSignals] = useState<AISignal[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Analyzing market data...");
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadInitialSignals = useCallback(async () => {
    setError(null);
    setLoadingMessage("Fetching initial AI signals...");
    try {
      const first = await generateAISignal(symbol);
      setSignals([first]);
    } catch (e) {
      console.error('Initial AI signal fetch failed:', e);
      const errorMessage = e instanceof Error ? e.message : 'Failed to load initial signals';
      setError(errorMessage);
      setSignals([]);
    }
  }, [symbol]);

  useEffect(() => {
    loadInitialSignals();

    // Generate new signals periodically with AI analysis
    const interval = setInterval(async () => {
      try {
        const newSignal = await generateAISignal(symbol);
        setSignals(prev => [newSignal, ...prev.slice(0, 4)]);
      } catch (error) {
        console.error('Error generating periodic signal:', error);
      }
    }, 45000); // Every 45 seconds for more comprehensive analysis

    return () => clearInterval(interval);
  }, [symbol, loadInitialSignals]);

  const generateNewSignal = async () => {
    setIsGenerating(true);
    setLimitReached(false);
    setError(null);
    setLoadingMessage("Generating new AI signal...");
    try {
      const newSignal = await generateAISignal(symbol);
      setSignals(prev => [newSignal, ...prev.slice(0, 4)]);
      toast({
        title: "✅ Nuovo segnale generato",
        description: `${newSignal.type} ${newSignal.symbol} con confidence ${newSignal.confidence}%`
      });
    } catch (error) {
      console.error('Error generating new signal:', error);

      // Controlla se è un errore di limite raggiunto
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('Limite giornaliero segnali raggiunto')) {
        setLimitReached(true);
        toast({
          title: "🚫 Limite giornaliero raggiunto",
          description: "Fai upgrade per continuare a generare segnali",
          variant: "destructive"
        });
      } else {
        setError(errorMessage);
        toast({
          title: "❌ Errore generazione segnale",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Retry function for error recovery
  const retryGeneration = async () => {
    setIsRetrying(true);
    setError(null);
    setLoadingMessage("Retrying AI signal generation...");
    try {
      const newSignal = await generateAISignal(symbol);
      setSignals(prev => [newSignal, ...prev.slice(0, 4)]);
      setError(null);
      toast({
        title: "✅ Generazione riuscita",
        description: `Segnale ${newSignal.type} generato con successo`,
        variant: "default"
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Retry failed';
      setError(errorMessage);
      toast({
        title: "❌ Riprova fallita",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsRetrying(false);
    }
  };

  const getSignalColor = (type: string) => {
    switch (type) {
      case "BUY": return "text-success bg-success/10 border-success/20";
      case "SELL": return "text-danger bg-danger/10 border-danger/20";
      case "HOLD": return "text-warning bg-warning/10 border-warning/20";
      default: return "text-muted-foreground";
    }
  };

  // 🎨 Get confidence color based on distribution
  // 🟢 85-95%: Excellent signals (all factors aligned)
  // 🟡 70-84%: Good signals (most confluences)
  // 🟠 55-69%: Fair signals (basic alignment)
  // 🔴 40-54%: Weak signals (few confluences)
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) {
      return "text-green-500 bg-green-500/10 border-green-500/20"; // Excellent
    } else if (confidence >= 70) {
      return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20"; // Good
    } else if (confidence >= 55) {
      return "text-orange-500 bg-orange-500/10 border-orange-500/20"; // Fair
    } else {
      return "text-red-500 bg-red-500/10 border-red-500/20"; // Weak
    }
  };

  // Get confidence label
  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 85) return "Eccellente";
    else if (confidence >= 70) return "Buono";
    else if (confidence >= 55) return "Discreto";
    else return "Debole";
  };

  const getSignalIcon = (type: string) => {
    switch (type) {
      case "BUY": return <TrendingUp className="w-4 h-4" />;
      case "SELL": return <TrendingDown className="w-4 h-4" />;
      case "HOLD": return <Activity className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  // Show error state if there's an error and no signals
  if (error && signals.length === 0) {
    return <ErrorState error={error} onRetry={retryGeneration} />;
  }

  // Show loading state during initial generation
  if (isGenerating && signals.length === 0) {
    return <LoadingState message={loadingMessage} />;
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Bot className="w-5 h-5 text-primary" />
            AI Signals
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={generateNewSignal}
              disabled={isGenerating || isRetrying}
              className="text-xs"
            >
              {(isGenerating || isRetrying) ? (
                <>
                  <Zap className="w-3 h-3 mr-1 animate-spin" />
                  {isRetrying ? 'Retrying...' : 'Analyzing...'}
                </>
              ) : (
                <>
                  <Zap className="w-3 h-3 mr-1" />
                  Generate
                </>
              )}
            </Button>

            {limitReached && (
              <Button
                size="sm"
                onClick={() => navigate('/payment-setup')}
                className="bg-gradient-primary text-xs"
              >
                <Crown className="w-3 h-3 mr-1" />
                Upgrade Now
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Error notification within the card */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <div>
                  <p className="text-sm font-medium text-destructive">Error</p>
                  <p className="text-xs text-muted-foreground">{error}</p>
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={retryGeneration} className="text-xs">
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Limit reached notification */}
        {limitReached && (
          <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-warning" />
                <div>
                  <p className="text-sm font-medium text-warning">Limite segnali raggiunto</p>
                  <p className="text-xs text-muted-foreground">Fai upgrade per segnali illimitati</p>
                </div>
              </div>
              <Button size="sm" onClick={() => navigate('/payment-setup')}>
                <ExternalLink className="w-3 h-3 mr-1" />
                Upgrade
              </Button>
            </div>
          </div>
        )}

        {signals.length === 0 && !isGenerating ? (
          <div className="text-center text-muted-foreground py-4">
            <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No AI signals available</p>
          </div>
        ) : (
          signals.map((signal) => (
            <div
              key={signal.id}
              className="p-3 rounded-lg border bg-card/50 space-y-2"
            >
              <div className="flex items-center justify-between">
                <Badge 
                  variant="outline" 
                  className={`${getSignalColor(signal.type)} font-medium`}
                >
                  {getSignalIcon(signal.type)}
                  <span className="ml-1">{signal.type}</span>
                </Badge>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline"
                    className={`${getConfidenceColor(signal.confidence)} text-xs font-semibold px-2 py-0.5`}
                  >
                    <Target className="w-3 h-3 mr-1" />
                    {typeof signal.confidence === 'number' ? signal.confidence.toFixed(0) : signal.confidence}%
                  </Badge>
                  <span className={`text-xs font-medium ${getConfidenceColor(signal.confidence).split(' ')[0]}`}>
                    {getConfidenceLabel(signal.confidence)}
                  </span>
                </div>
              </div>

              <div className="text-sm">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-muted-foreground">Price Target:</span>
                  <span className="font-medium text-foreground">
                    ${signal.price.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  {signal.reason}
                </p>
              </div>

              <div className="flex flex-wrap gap-1 mb-2">
                {signal.indicators.map((indicator) => (
                  <Badge key={indicator} variant="secondary" className="text-xs">
                    {indicator}
                  </Badge>
                ))}
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  {signal.aiModel}
                </div>
                  <span>{new Date(signal.timestamp as unknown as string).toLocaleTimeString()}</span>
              </div>
            </div>
          ))
        )}

        <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-2 text-primary text-sm font-medium mb-1">
            <Bot className="w-4 h-4" />
            AI Analysis Engine
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Advanced multi-timeframe analysis with Gemini AI • Pattern recognition • News sentiment • Volatility modeling
          </p>
          
          {/* Confidence Legend */}
          <div className="mt-3 pt-3 border-t border-primary/10">
            <div className="text-xs font-medium text-muted-foreground mb-2">Livelli Confidence:</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-green-500 font-medium">85-95%</span>
                <span className="text-muted-foreground">Eccellente</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                <span className="text-yellow-500 font-medium">70-84%</span>
                <span className="text-muted-foreground">Buono</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                <span className="text-orange-500 font-medium">55-69%</span>
                <span className="text-muted-foreground">Discreto</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-red-500 font-medium">40-54%</span>
                <span className="text-muted-foreground">Debole</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};