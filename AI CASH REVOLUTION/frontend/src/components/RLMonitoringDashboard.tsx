import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity,
  Brain,
  Database,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Target,
  Shield,
  BarChart3,
  RefreshCw,
  Settings,
  Download
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface RLMonitoringDashboardProps {
  service: RLService;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface RLService {
  getServiceStatus(): ServiceStatus;
  getDetailedStats(): DetailedStats;
}

interface ServiceStatus {
  health: 'healthy' | 'degraded' | 'unhealthy';
  isActive: boolean;
  isInitialized: boolean;
  modelsLoaded: number;
  lastUpdateTime: number;
  performanceMetrics: PerformanceMetrics;
  modelHealth: ModelHealth[];
}

interface DetailedStats {
  predictionStats: PredictionStats;
  cacheStats: CacheStats;
}

interface PredictionStats {
  totalPredictions: number;
  averageConfidence: number;
  averageProcessingTime: number;
  errorRate: number;
}

interface CacheStats {
  hitRate: number;
  cacheSize: number;
  hits: number;
  misses: number;
}

interface PerformanceMetrics {
  totalReturns: number;
  sharpeRatio: number;
  winRate: number;
  maxDrawdown: number;
  tradeCount: number;
}

interface ModelHealth {
  symbol: string;
  health: 'healthy' | 'degraded' | 'unhealthy';
  lastUsed: number;
  predictionCount: number;
}

interface Prediction {
  id: string;
  timestamp: number;
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  uncertainty: number;
  processingTime: number;
  constraints: Constraint[];
}

interface Constraint {
  type: string;
  severity: string;
  message: string;
}

interface MonitoringData {
  serviceStatus: ServiceStatus;
  detailedStats: DetailedStats;
  performanceMetrics: PerformanceMetrics;
  modelHealth: ModelHealth[];
  recentPredictions: Prediction[];
  alerts: Alert[];
  timestamp: number;
}

interface Alert {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  timestamp: number;
}

export const RLMonitoringDashboard = ({
  service,
  autoRefresh = true,
  refreshInterval = 5000
}: RLMonitoringDashboardProps) => {
  const { toast } = useToast();
  const [data, setData] = useState<MonitoringData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  const fetchMonitoringData = useCallback(async () => {
    if (!service) return;

    setIsLoading(true);
    try {
      const serviceStatus = service.getServiceStatus();
      const detailedStats = service.getDetailedStats();
      const performanceMetrics = serviceStatus.performanceMetrics;
      const modelHealth = serviceStatus.modelHealth;

      // Fetch recent predictions (mock implementation)
      const recentPredictions = await fetchRecentPredictions();

      // Generate alerts based on current state
      const alerts = generateAlerts(serviceStatus, detailedStats, performanceMetrics);

      setData({
        serviceStatus,
        detailedStats,
        performanceMetrics,
        modelHealth,
        recentPredictions,
        alerts,
        timestamp: Date.now()
      });

      setLastUpdate(Date.now());
    } catch (error) {
      console.error('Failed to fetch monitoring data:', error);
      toast({
        title: 'Monitoring Error',
        description: 'Failed to fetch monitoring data',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [service, toast]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      fetchMonitoringData();
      const interval = setInterval(fetchMonitoringData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, fetchMonitoringData]);

  // Initial fetch
  useEffect(() => {
    fetchMonitoringData();
  }, [fetchMonitoringData]);

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'unhealthy': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return <CheckCircle className="w-4 h-4" />;
      case 'degraded': return <AlertTriangle className="w-4 h-4" />;
      case 'unhealthy': return <AlertTriangle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-500 bg-red-50';
      case 'high': return 'border-orange-500 bg-orange-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      case 'low': return 'border-blue-500 bg-blue-50';
      default: return 'border-gray-500 bg-gray-50';
    }
  };

  // Mock function to fetch recent predictions
  const fetchRecentPredictions = async () => {
    // In a real implementation, this would fetch from your database
    return [
      {
        id: '1',
        timestamp: Date.now() - 60000,
        symbol: 'BTC/USD',
        action: 'BUY',
        confidence: 0.85,
        uncertainty: 0.12,
        processingTime: 45,
        constraints: []
      },
      {
        id: '2',
        timestamp: Date.now() - 120000,
        symbol: 'ETH/USD',
        action: 'HOLD',
        confidence: 0.72,
        uncertainty: 0.18,
        processingTime: 38,
        constraints: [
          { type: 'market_hours', severity: 'low', message: 'Trading outside optimal hours' }
        ]
      }
    ];
  };

  // Generate alerts based on system state
  const generateAlerts = (serviceStatus: ServiceStatus, detailedStats: DetailedStats, performanceMetrics: PerformanceMetrics) => {
    const alerts = [];

    // Service health alerts
    if (serviceStatus.health === 'unhealthy') {
      alerts.push({
        id: 'service_unhealthy',
        type: 'system',
        severity: 'critical',
        message: 'RL Trading Service is unhealthy',
        timestamp: Date.now()
      });
    }

    // Performance alerts
    if (detailedStats.predictionStats.errorRate > 0.1) {
      alerts.push({
        id: 'high_error_rate',
        type: 'performance',
        severity: 'high',
        message: `High error rate: ${(detailedStats.predictionStats.errorRate * 100).toFixed(1)}%`,
        timestamp: Date.now()
      });
    }

    // Cache performance alerts
    if (detailedStats.cacheStats.hitRate < 0.5) {
      alerts.push({
        id: 'low_cache_hit_rate',
        type: 'performance',
        severity: 'medium',
        message: `Low cache hit rate: ${(detailedStats.cacheStats.hitRate * 100).toFixed(1)}%`,
        timestamp: Date.now()
      });
    }

    // Model health alerts
    const unhealthyModels = serviceStatus.modelHealth.filter((m: ModelHealth) => m.health === 'unhealthy');
    if (unhealthyModels.length > 0) {
      alerts.push({
        id: 'model_health',
        type: 'model',
        severity: 'high',
        message: `${unhealthyModels.length} model(s) are unhealthy`,
        timestamp: Date.now()
      });
    }

    return alerts.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  };

  const exportData = () => {
    if (!data) return;

    const exportObj = {
      exportTime: new Date().toISOString(),
      rlTradingVersion: '1.0.0',
      ...data
    };

    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rl-monitoring-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Export Complete',
      description: 'Monitoring data exported successfully'
    });
  };

  if (!data) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
            <p>Loading monitoring data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">RL Trading Monitor</h2>
          <p className="text-muted-foreground">
            Real-time monitoring of Reinforcement Learning Trading System
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMonitoringData}
            disabled={isLoading}
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-1" />
            )}
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportData}>
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Service Status</p>
                <div className={`flex items-center gap-2 ${getHealthColor(data.serviceStatus.health)}`}>
                  {getHealthIcon(data.serviceStatus.health)}
                  <span className="font-medium">{data.serviceStatus.health}</span>
                </div>
              </div>
              <Activity className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Predictions</p>
                <p className="text-2xl font-bold">{data.detailedStats.predictionStats.totalPredictions}</p>
              </div>
              <Brain className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Confidence</p>
                <p className="text-2xl font-bold">
                  {(data.detailedStats.predictionStats.averageConfidence * 100).toFixed(1)}%
                </p>
              </div>
              <Target className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Alerts</p>
                <p className="text-2xl font-bold text-red-600">{data.alerts.length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Monitoring Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            <BarChart3 className="w-4 h-4 mr-1" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="performance">
            <TrendingUp className="w-4 h-4 mr-1" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="models">
            <Brain className="w-4 h-4 mr-1" />
            Models
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <AlertTriangle className="w-4 h-4 mr-1" />
            Alerts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Service Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Service Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active:</span>
                  <Badge variant={data.serviceStatus.isActive ? 'default' : 'secondary'}>
                    {data.serviceStatus.isActive ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Initialized:</span>
                  <Badge variant={data.serviceStatus.isInitialized ? 'default' : 'secondary'}>
                    {data.serviceStatus.isInitialized ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Models Loaded:</span>
                  <span>{data.serviceStatus.modelsLoaded}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Update:</span>
                  <span className="text-sm">
                    {new Date(data.serviceStatus.lastUpdateTime).toLocaleTimeString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Cache Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Cache Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hit Rate:</span>
                    <span>{(data.detailedStats.cacheStats.hitRate * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={data.detailedStats.cacheStats.hitRate * 100} className="h-2" />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cache Size:</span>
                  <span>{data.detailedStats.cacheStats.cacheSize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hits:</span>
                  <span>{data.detailedStats.cacheStats.hits}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Misses:</span>
                  <span>{data.detailedStats.cacheStats.misses}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Predictions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Recent Predictions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.recentPredictions.map((prediction) => (
                  <div key={prediction.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">
                        {prediction.action}
                      </Badge>
                      <div>
                        <p className="font-medium">{prediction.symbol}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(prediction.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">
                        <span className="text-muted-foreground">Confidence:</span>
                        <span className="ml-1 font-medium">
                          {(prediction.confidence * 100).toFixed(0)}%
                        </span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {prediction.processingTime}ms
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Prediction Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Prediction Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Predictions:</span>
                    <span className="font-medium">{data.detailedStats.predictionStats.totalPredictions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Average Confidence:</span>
                    <span className="font-medium">
                      {(data.detailedStats.predictionStats.averageConfidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Average Processing Time:</span>
                    <span className="font-medium">
                      {data.detailedStats.predictionStats.averageProcessingTime.toFixed(0)}ms
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Error Rate:</span>
                    <span className={`font-medium ${
                      data.detailedStats.predictionStats.errorRate > 0.1 ? 'text-red-600' : ''
                    }`}>
                      {(data.detailedStats.predictionStats.errorRate * 100).toFixed(2)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Trading Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.performanceMetrics ? (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Returns:</span>
                      <span className="font-medium">
                        {(data.performanceMetrics.totalReturns * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sharpe Ratio:</span>
                      <span className="font-medium">
                        {data.performanceMetrics.sharpeRatio.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Win Rate:</span>
                      <span className="font-medium">
                        {(data.performanceMetrics.winRate * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max Drawdown:</span>
                      <span className="font-medium text-red-600">
                        {(data.performanceMetrics.maxDrawdown * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Trade Count:</span>
                      <span className="font-medium">
                        {data.performanceMetrics.tradeCount}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No performance data available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Model Health Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.modelHealth.map((model, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getHealthIcon(model.health)}
                      <div>
                        <p className="font-medium">{model.symbol}</p>
                        <p className="text-sm text-muted-foreground">
                          Last used: {new Date(model.lastUsed).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className={getHealthColor(model.health)}>
                        {model.health}
                      </Badge>
                      <p className="text-sm text-muted-foreground mt-1">
                        {model.predictionCount} predictions
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Active Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.alerts.length > 0 ? (
                <div className="space-y-3">
                  {data.alerts.map((alert) => (
                    <div key={alert.id} className={`p-4 rounded-lg border ${getAlertColor(alert.severity)}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="font-medium">{alert.message}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{alert.type}</Badge>
                          <Badge variant="outline">{alert.severity}</Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-600" />
                  <p>No active alerts</p>
                  <p className="text-sm">System is operating normally</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span>Last updated: {new Date(lastUpdate).toLocaleTimeString()}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>RL Trading v1.0.0</span>
        </div>
      </div>
    </div>
  );
};