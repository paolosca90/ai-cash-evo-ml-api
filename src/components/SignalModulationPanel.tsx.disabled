/**
 * Signal Modulation Panel Component
 *
 * React component for displaying and managing modulated trading signals.
 * Provides real-time visualization of signal modulation results with
 * sentiment, risk, and confidence factors.
 *
 * @author Claude Code
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Target,
  Shield,
  Brain,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  Settings,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useSignalModulation, ModulationResult, MODULATION_PRESETS } from '@/hooks/useSignalModulation';
import { BaseSignal } from '@/lib/signal-modulation/SignalModulationService';

interface ExecutionSignal {
  symbol: string;
  direction: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  riskLevel: number;
  intensity: number;
  expectedReward: number;
  reasoning?: string;
  timestamp?: number;
}

interface SignalModulationPanelProps {
  symbol: string;
  onSignalModulated?: (result: ModulationResult) => void;
  onExecutionRequested?: (signal: ExecutionSignal) => void;
  className?: string;
}

export const SignalModulationPanel: React.FC<SignalModulationPanelProps> = ({
  symbol,
  onSignalModulated,
  onExecutionRequested,
  className = '',
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('BALANCED');
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);

  const {
    modulateSignal,
    modulateAISignal,
    currentResult,
    performanceMetrics,
    isModulating,
    error,
    lastModulationTime,
    clearError,
    resetModulation,
    updateConfig,
    recordSignalOutcome,
  } = useSignalModulation({
    symbol,
    enableAutoModulation: false,
    config: MODULATION_PRESETS.BALANCED,
  });

  const { toast } = useToast();

  // Handle preset change
  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    updateConfig(MODULATION_PRESETS[preset as keyof typeof MODULATION_PRESETS]);
    toast({
      title: "Preset Updated",
      description: `Switched to ${preset} modulation preset`,
      variant: "default",
    });
  };

  // Handle manual modulation
  const handleManualModulation = async () => {
    try {
      const testSignal: BaseSignal = {
        id: `manual-${Date.now()}`,
        symbol,
        type: 'BUY',
        confidence: 75,
        intensity: 1.0,
        timestamp: new Date(),
        source: 'Manual Test',
      };

      const result = await modulateSignal(testSignal);
      onSignalModulated?.(result);
    } catch (error) {
      console.error('Manual modulation failed:', error);
    }
  };

  // Handle execution request
  const handleExecutionRequest = () => {
    if (currentResult?.modulatedSignal.should_execute) {
      onExecutionRequested?.(currentResult.modulatedSignal);
      toast({
        title: "Execution Requested",
        description: `Signal execution requested for ${symbol}`,
        variant: "default",
      });
    } else {
      toast({
        title: "Signal Not Executable",
        description: "This signal does not meet execution criteria",
        variant: "destructive",
      });
    }
  };

  // Format timestamp
  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleTimeString();
  };

  // Get signal color
  const getSignalColor = (type: string) => {
    switch (type) {
      case 'BUY': return 'text-green-600 bg-green-50 border-green-200';
      case 'SELL': return 'text-red-600 bg-red-50 border-red-200';
      case 'HOLD': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Get signal icon
  const getSignalIcon = (type: string) => {
    switch (type) {
      case 'BUY': return <TrendingUp className="w-4 h-4" />;
      case 'SELL': return <TrendingDown className="w-4 h-4" />;
      case 'HOLD': return <Activity className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  // Get quality color
  const getQualityColor = (quality: number) => {
    if (quality >= 0.8) return 'text-green-600';
    if (quality >= 0.65) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header Controls */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-600" />
              Signal Modulation - {symbol}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualModulation}
                disabled={isModulating}
              >
                {isModulating ? (
                  <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-1" />
                )}
                Modulate Signal
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
              >
                <Settings className="w-4 h-4 mr-1" />
                {showDetails ? 'Hide' : 'Show'} Details
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
              <Button variant="ghost" size="sm" onClick={clearError} className="ml-auto">
                <XCircle className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Modulation Result */}
      {currentResult && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Current Modulated Signal</CardTitle>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={getSignalColor(currentResult.modulatedSignal.type)}
                >
                  {getSignalIcon(currentResult.modulatedSignal.type)}
                  <span className="ml-1">{currentResult.modulatedSignal.type}</span>
                </Badge>
                <Badge
                  variant="outline"
                  className={`${getPriorityColor(currentResult.modulatedSignal.execution_priority)} text-white`}
                >
                  {currentResult.modulatedSignal.execution_priority.toUpperCase()}
                </Badge>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              Processed in {currentResult.processingTime.toFixed(2)}ms • {formatTime(lastModulationTime)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Intensity Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Signal Intensity</span>
                  <span className="text-sm text-gray-600">
                    {currentResult.modulatedSignal.final_intensity.toFixed(3)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress
                    value={currentResult.modulatedSignal.final_intensity * 50}
                    className="flex-1"
                  />
                  <span className="text-xs text-gray-500">
                    {((currentResult.modulatedSignal.final_intensity - currentResult.modulatedSignal.original_intensity) / currentResult.modulatedSignal.original_intensity * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  Original: {currentResult.modulatedSignal.original_intensity.toFixed(3)}
                </div>
              </div>

              {/* Quality Score */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Quality Score</span>
                  <span className={`text-sm font-medium ${getQualityColor(currentResult.modulatedSignal.quality_score)}`}>
                    {(currentResult.modulatedSignal.quality_score * 100).toFixed(1)}%
                  </span>
                </div>
                <Progress
                  value={currentResult.modulatedSignal.quality_score * 100}
                  className="flex-1"
                />
                <div className="text-xs text-gray-500">
                  {currentResult.modulatedSignal.quality_score >= 0.8 ? 'High Quality' :
                   currentResult.modulatedSignal.quality_score >= 0.65 ? 'Good Quality' : 'Low Quality'}
                </div>
              </div>

              {/* Position Size */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Position Size</span>
                  <span className="text-sm font-medium">
                    {(currentResult.modulatedSignal.risk_adjusted_position_size * 100).toFixed(2)}%
                  </span>
                </div>
                <Progress
                  value={currentResult.modulatedSignal.risk_adjusted_position_size * 1000}
                  className="flex-1"
                />
                <div className="text-xs text-gray-500">
                  Risk-adjusted sizing
                </div>
              </div>
            </div>

            {/* Modulation Factors */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-sm font-medium text-blue-600">Sentiment</div>
                <div className="text-lg font-bold text-blue-800">
                  {currentResult.sentimentAnalysis.score.toFixed(1)}
                </div>
                <div className="text-xs text-blue-600">
                  Multiplier: {currentResult.modulatedSignal.sentiment_multiplier.toFixed(3)}
                </div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-sm font-medium text-red-600">Risk Level</div>
                <div className="text-lg font-bold text-red-800">
                  {currentResult.riskAssessment.overall_risk.toFixed(1)}
                </div>
                <div className="text-xs text-red-600">
                  Penalty: {currentResult.modulatedSignal.risk_penalty.toFixed(3)}
                </div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-sm font-medium text-green-600">Confidence</div>
                <div className="text-lg font-bold text-green-800">
                  {currentResult.modulatedSignal.original_confidence}%
                </div>
                <div className="text-xs text-green-600">
                  Bonus: {currentResult.modulatedSignal.confidence_bonus.toFixed(3)}
                </div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-sm font-medium text-purple-600">Execution</div>
                <div className="text-lg font-bold">
                  {currentResult.modulatedSignal.should_execute ? (
                    <CheckCircle className="w-6 h-6 text-green-600 mx-auto" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-600 mx-auto" />
                  )}
                </div>
                <div className="text-xs text-purple-600">
                  {currentResult.modulatedSignal.should_execute ? 'Execute' : 'Hold'}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant={currentResult.modulatedSignal.should_execute ? "default" : "outline"}
                size="sm"
                onClick={handleExecutionRequest}
                disabled={!currentResult.modulatedSignal.should_execute}
              >
                <Target className="w-4 h-4 mr-1" />
                Execute Signal
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => recordSignalOutcome(currentResult.modulatedSignal.id, Math.random() * 10 - 5)}
              >
                <BarChart3 className="w-4 h-4 mr-1" />
                Simulate Outcome
              </Button>
            </div>

            {/* Reasoning */}
            {currentResult.modulatedSignal.reasoning.length > 0 && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-700 mb-2">Modulation Reasoning:</div>
                <div className="flex flex-wrap gap-1">
                  {currentResult.modulatedSignal.reasoning.map((reason, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {reason}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Detailed View */}
      {showDetails && (
        <Tabs defaultValue="analysis" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="risk">Risk Assessment</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="config">Configuration</TabsTrigger>
          </TabsList>

          <TabsContent value="analysis" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Market Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center">
                    <div className="text-sm text-gray-600">Volatility</div>
                    <div className="font-medium">{currentResult?.marketConditions.volatility}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-600">Trend</div>
                    <div className="font-medium">{currentResult?.marketConditions.trend_strength}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-600">Liquidity</div>
                    <div className="font-medium">{currentResult?.marketConditions.liquidity}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-600">Session</div>
                    <div className="font-medium">{currentResult?.marketConditions.session_type}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-600">Regime</div>
                    <div className="font-medium">{currentResult?.marketConditions.market_regime}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {currentResult && (
              <Card>
                <CardHeader>
                  <CardTitle>Sentiment Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>Sentiment Score:</span>
                      <span className="font-medium">{currentResult.sentimentAnalysis.score.toFixed(1)}/5</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Confidence:</span>
                      <span className="font-medium">{(currentResult.sentimentAnalysis.confidence * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Risk Level:</span>
                      <span className="font-medium">{currentResult.sentimentAnalysis.risk.toFixed(1)}/5</span>
                    </div>
                    <div className="mt-3">
                      <div className="text-sm font-medium mb-1">Reasoning:</div>
                      <p className="text-sm text-gray-600">{currentResult.sentimentAnalysis.reasoning}</p>
                    </div>
                    {currentResult.sentimentAnalysis.key_factors.length > 0 && (
                      <div>
                        <div className="text-sm font-medium mb-1">Key Factors:</div>
                        <div className="flex flex-wrap gap-1">
                          {currentResult.sentimentAnalysis.key_factors.map((factor, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {factor}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="risk" className="space-y-4">
            {currentResult && (
              <Card>
                <CardHeader>
                  <CardTitle>Risk Assessment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-sm font-medium text-red-600">Overall Risk</div>
                      <div className="text-2xl font-bold text-red-800">
                        {currentResult.riskAssessment.overall_risk.toFixed(1)}
                      </div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <div className="text-sm font-medium text-orange-600">Market Volatility</div>
                      <div className="text-2xl font-bold text-orange-800">
                        {currentResult.riskAssessment.market_volatility.toFixed(1)}
                      </div>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <div className="text-sm font-medium text-yellow-600">Liquidity Risk</div>
                      <div className="text-2xl font-bold text-yellow-800">
                        {currentResult.riskAssessment.liquidity_risk.toFixed(1)}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-2">Risk Factors:</div>
                    <div className="flex flex-wrap gap-1">
                      {currentResult.riskAssessment.factors.map((factor, index) => (
                        <Badge key={index} variant="destructive" className="text-xs">
                          {factor}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            {performanceMetrics && (
              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-sm font-medium text-blue-600">Win Rate</div>
                      <div className="text-xl font-bold text-blue-800">
                        {(performanceMetrics.win_rate * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-sm font-medium text-green-600">Profit Factor</div>
                      <div className="text-xl font-bold text-green-800">
                        {performanceMetrics.profit_factor.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-sm font-medium text-purple-600">Sharpe Ratio</div>
                      <div className="text-xl font-bold text-purple-800">
                        {performanceMetrics.sharpe_ratio.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-sm font-medium text-red-600">Max Drawdown</div>
                      <div className="text-xl font-bold text-red-800">
                        {(performanceMetrics.max_drawdown * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentResult && (
              <Card>
                <CardHeader>
                  <CardTitle>Expected Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-indigo-50 rounded-lg">
                      <div className="text-sm font-medium text-indigo-600">Expected Win Rate</div>
                      <div className="text-xl font-bold text-indigo-800">
                        {(currentResult.performanceImpact.expectedWinRate * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="text-center p-3 bg-teal-50 rounded-lg">
                      <div className="text-sm font-medium text-teal-600">Expected Profit Factor</div>
                      <div className="text-xl font-bold text-teal-800">
                        {currentResult.performanceImpact.expectedProfitFactor.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-center p-3 bg-amber-50 rounded-lg">
                      <div className="text-sm font-medium text-amber-600">Risk-Adjusted Return</div>
                      <div className="text-xl font-bold text-amber-800">
                        {currentResult.performanceImpact.riskAdjustedReturn.toFixed(3)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="config" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Modulation Presets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {Object.keys(MODULATION_PRESETS).map((preset) => (
                    <Button
                      key={preset}
                      variant={selectedPreset === preset ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePresetChange(preset)}
                      className="text-xs"
                    >
                      {preset}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-600">Last Modulation</div>
                    <div className="text-sm">{formatTime(lastModulationTime)}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-600">Processing Status</div>
                    <div className="text-sm">
                      {isModulating ? (
                        <span className="text-yellow-600">Processing</span>
                      ) : (
                        <span className="text-green-600">Ready</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Status Footer */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Signal Modulation System v1.0.0
            </div>
            <div className="flex items-center gap-4">
              <span>Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}</span>
              <span>Preset: {selectedPreset}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignalModulationPanel;