import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Brain,
  Activity,
  TrendingUp,
  TrendingDown,
  Pause,
  Play,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Zap,
  Target,
  Shield,
  Database,
  BarChart3,
  Settings
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useRLTrading } from '@/hooks/useRLTrading';

interface MarketData {
  symbol: string;
  trend?: number;
  volatility?: number;
  sentiment?: number;
  price?: number;
  volume?: number;
  timestamp?: number;
}

interface TradingAction {
  direction: 'BUY' | 'SELL' | 'HOLD';
  intensity: number;
  confidence: number;
  expectedReward: number;
  riskLevel: number;
  stopLoss?: number | null;
  takeProfit?: number | null;
  reasoning?: string;
}

interface RLTradingPanelProps {
  symbol: string;
  timeframe: string;
  marketData?: MarketData;
  onAction?: (action: TradingAction) => void;
}

export const RLTradingPanel = ({
  symbol,
  timeframe,
  marketData,
  onAction
}: RLTradingPanelProps) => {
  const { toast } = useToast();
  const [isAutoPredict, setIsAutoPredict] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const {
    isLoading,
    isActive,
    lastAction,
    uncertainty,
    constraints,
    stats,
    performance,
    error,
    processingTime,
    start,
    stop,
    predict,
    reset,
    getStatus,
    getStats,
    getFeatureImportance,
    isHealthy,
    getCacheHitRate,
    getAverageConfidence,
    getPredictionCount,
    hasActiveConstraints
  } = useRLTrading({
    symbol,
    timeframe,
    autoStart: false,
    onPrediction: (action, stats) => {
      onAction?.({ action, stats, timestamp: Date.now() });
    },
    onError: (error) => {
      toast({
        title: 'RL Trading Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Auto-prediction
  useEffect(() => {
    if (!isAutoPredict || !isActive || !marketData) return;

    const interval = setInterval(async () => {
      try {
        await predict(marketData);
      } catch (error) {
        console.error('Auto-prediction failed:', error);
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [isAutoPredict, isActive, marketData, predict]);

  const handleStart = async () => {
    try {
      await start();
      toast({
        title: 'RL Trading Started',
        description: 'Reinforcement Learning engine is now active'
      });
    } catch (error) {
      toast({
        title: 'Start Failed',
        description: 'Failed to start RL Trading engine',
        variant: 'destructive'
      });
    }
  };

  const handleStop = async () => {
    try {
      await stop();
      setIsAutoPredict(false);
      toast({
        title: 'RL Trading Stopped',
        description: 'Reinforcement Learning engine has been stopped'
      });
    } catch (error) {
      toast({
        title: 'Stop Failed',
        description: 'Failed to stop RL Trading engine',
        variant: 'destructive'
      });
    }
  };

  const handlePredict = async () => {
    if (!marketData) {
      toast({
        title: 'No Market Data',
        description: 'Market data is required for prediction',
        variant: 'destructive'
      });
      return;
    }

    try {
      await predict(marketData);
      toast({
        title: 'Prediction Complete',
        description: `Generated RL prediction in ${processingTime.toFixed(2)}ms`
      });
    } catch (error) {
      toast({
        title: 'Prediction Failed',
        description: 'Failed to generate prediction',
        variant: 'destructive'
      });
    }
  };

  const getActionColor = (direction: string) => {
    switch (direction) {
      case 'BUY': return 'text-green-600 bg-green-50 border-green-200';
      case 'SELL': return 'text-red-600 bg-red-50 border-red-200';
      case 'HOLD': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getActionIcon = (direction: string) => {
    switch (direction) {
      case 'BUY': return <TrendingUp className="w-4 h-4" />;
      case 'SELL': return <TrendingDown className="w-4 h-4" />;
      case 'HOLD': return <Activity className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getUncertaintyColor = (uncertainty: number) => {
    if (uncertainty < 0.2) return 'text-green-600';
    if (uncertainty < 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthColor = () => {
    if (!isHealthy()) return 'text-red-600';
    if (hasActiveConstraints()) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Brain className="w-5 h-5 text-primary" />
            RL Trading Engine
            <Badge variant="outline" className={getHealthColor()}>
              {isHealthy() ? 'Healthy' : hasActiveConstraints() ? 'Warning' : 'Error'}
            </Badge>
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <Settings className="w-4 h-4" />
            </Button>
            {isActive ? (
              <Button variant="outline" size="sm" onClick={handleStop}>
                <Pause className="w-4 h-4 mr-1" />
                Stop
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handleStart} disabled={isLoading}>
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-1" />
                )}
                Start
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        {/* Status Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-sm text-muted-foreground">Status</div>
            <div className={`font-medium ${isActive ? 'text-green-600' : 'text-red-600'}`}>
              {isActive ? 'Active' : 'Inactive'}
            </div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-sm text-muted-foreground">Predictions</div>
            <div className="font-medium">{getPredictionCount()}</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-sm text-muted-foreground">Confidence</div>
            <div className="font-medium">{(getAverageConfidence() * 100).toFixed(1)}%</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-sm text-muted-foreground">Cache Hit</div>
            <div className="font-medium">{(getCacheHitRate() * 100).toFixed(1)}%</div>
          </div>
        </div>

        {/* Last Action */}
        {lastAction && (
          <div className="p-4 rounded-lg border bg-card/50 space-y-3">
            <div className="flex items-center justify-between">
              <Badge
                variant="outline"
                className={`${getActionColor(lastAction.direction)} font-medium`}
              >
                {getActionIcon(lastAction.direction)}
                <span className="ml-1">{lastAction.direction}</span>
              </Badge>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Target className="w-3 h-3" />
                {(lastAction.confidence * 100).toFixed(0)}%
                <Zap className="w-3 h-3 ml-1" />
                {processingTime.toFixed(0)}ms
              </div>
            </div>

            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Intensity:</span>
                <span className="font-medium">{(lastAction.intensity * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Risk Level:</span>
                <span className="font-medium">{(lastAction.riskLevel * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expected Reward:</span>
                <span className="font-medium">{lastAction.expectedReward.toFixed(3)}</span>
              </div>
            </div>

            {lastAction.stopLoss && lastAction.takeProfit && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Stop Loss:</span>
                  <div className="font-medium">${lastAction.stopLoss.toFixed(2)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Take Profit:</span>
                  <div className="font-medium">${lastAction.takeProfit.toFixed(2)}</div>
                </div>
              </div>
            )}

            {lastAction.reasoning && (
              <div className="p-2 bg-muted/30 rounded text-xs">
                <div className="font-medium mb-1">Reasoning:</div>
                <div className="text-muted-foreground">{lastAction.reasoning}</div>
              </div>
            )}
          </div>
        )}

        {/* Uncertainty and Constraints */}
        {(uncertainty || constraints.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {uncertainty && (
              <div className="p-3 rounded-lg border bg-card/50">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-sm">Uncertainty Analysis</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total:</span>
                    <span className={getUncertaintyColor(uncertainty.total)}>
                      {uncertainty.total.toFixed(3)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Epistemic:</span>
                    <span>{uncertainty.epistemic.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Aleatoric:</span>
                    <span>{uncertainty.aleatoric.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Confidence:</span>
                    <span className="font-medium">
                      {(uncertainty.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {constraints.length > 0 && (
              <div className="p-3 rounded-lg border bg-card/50">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-sm">Constraints</span>
                </div>
                <div className="space-y-1 text-xs">
                  {constraints.slice(0, 3).map((constraint, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        constraint.severity === 'critical' ? 'bg-red-500' :
                        constraint.severity === 'high' ? 'bg-orange-500' :
                        constraint.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                      }`} />
                      <span className="text-muted-foreground flex-1 truncate">
                        {constraint.message}
                      </span>
                    </div>
                  ))}
                  {constraints.length > 3 && (
                    <div className="text-muted-foreground">
                      +{constraints.length - 3} more constraints
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePredict}
            disabled={!isActive || !marketData}
            className="flex-1"
          >
            <Brain className="w-4 h-4 mr-1" />
            Predict Action
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAutoPredict(!isAutoPredict)}
            disabled={!isActive}
          >
            {isAutoPredict ? (
              <Pause className="w-4 h-4 mr-1" />
            ) : (
              <Activity className="w-4 h-4 mr-1" />
            )}
            Auto: {isAutoPredict ? 'ON' : 'OFF'}
          </Button>
        </div>

        {/* Advanced Stats */}
        {showAdvanced && (
          <Tabs defaultValue="performance" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="performance">
                <BarChart3 className="w-4 h-4 mr-1" />
                Performance
              </TabsTrigger>
              <TabsTrigger value="cache">
                <Database className="w-4 h-4 mr-1" />
                Cache
              </TabsTrigger>
              <TabsTrigger value="features">
                <Target className="w-4 h-4 mr-1" />
                Features
              </TabsTrigger>
            </TabsList>

            <TabsContent value="performance" className="space-y-4">
              {performance && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-2 bg-muted/30 rounded">
                    <div className="text-muted-foreground">Total Returns</div>
                    <div className="font-medium">{(performance.totalReturns * 100).toFixed(2)}%</div>
                  </div>
                  <div className="p-2 bg-muted/30 rounded">
                    <div className="text-muted-foreground">Sharpe Ratio</div>
                    <div className="font-medium">{performance.sharpeRatio.toFixed(2)}</div>
                  </div>
                  <div className="p-2 bg-muted/30 rounded">
                    <div className="text-muted-foreground">Win Rate</div>
                    <div className="font-medium">{(performance.winRate * 100).toFixed(1)}%</div>
                  </div>
                  <div className="p-2 bg-muted/30 rounded">
                    <div className="text-muted-foreground">Max Drawdown</div>
                    <div className="font-medium">{(performance.maxDrawdown * 100).toFixed(2)}%</div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="cache" className="space-y-4">
              {stats && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cache Size:</span>
                    <span>{stats.cacheSize || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cache Hits:</span>
                    <span>{stats.cacheHits || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cache Misses:</span>
                    <span>{stats.cacheMisses || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hit Rate:</span>
                    <span>{(getCacheHitRate() * 100).toFixed(1)}%</span>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="features" className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Feature importance analysis will appear here as predictions are made.
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};