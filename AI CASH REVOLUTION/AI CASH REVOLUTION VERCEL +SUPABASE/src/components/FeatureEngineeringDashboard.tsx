import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useFeatureEngineering } from '../hooks/useFeatureEngineering';
import type {
  MarketData,
  TechnicalIndicators,
  SmartMoneyConcepts,
  LLMSignals,
  MarketRegime,
  SessionInfo
} from '../types/feature-engineering';
import type { SimulationDataPoint } from '../types/trading';

interface FeatureEngineeringDashboardProps {
  symbol: string;
  timeframe: string;
  onFeatureVectorGenerated?: (vector: number[]) => void;
}

export const FeatureEngineeringDashboard: React.FC<FeatureEngineeringDashboardProps> = ({
  symbol,
  timeframe,
  onFeatureVectorGenerated
}) => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationData, setSimulationData] = useState<SimulationDataPoint[]>([]);

  const {
    featureVector,
    mlVector,
    isCalculating,
    error,
    lastUpdate,
    featureWeights,
    featureStatistics,
    calculateFeatureVector,
    calculateFeatureImportance,
    exportFeatureVector,
    resetFeatureHistory,
    updateFeatureWeights
  } = useFeatureEngineering({
    symbol,
    timeframe,
    enableAutoUpdate: true,
    updateInterval: 30000, // 30 seconds
    config: {
      enableTechnicalIndicators: true,
      enableSessionFeatures: true,
      enableSmartMoneyFeatures: true,
      enableSentimentFeatures: true,
      enableRegimeFeatures: true,
      normalizeFeatures: true,
      featureImportanceThreshold: 0.05
    }
  });

  // Generate sample data for demonstration
  const generateSampleData = () => {
    const marketData: MarketData = {
      symbol,
      timeframe,
      timestamp: Date.now(),
      open: 45000 + Math.random() * 2000,
      high: 45200 + Math.random() * 2000,
      low: 44800 + Math.random() * 2000,
      close: 45100 + Math.random() * 2000,
      volume: 1000000 + Math.random() * 1000000
    };

    const technicalIndicators: TechnicalIndicators = {
      atr: {
        value: 200 + Math.random() * 200,
        normalized: 0.3 + Math.random() * 0.4
      },
      bollingerBands: {
        upper: 45300 + Math.random() * 2000,
        middle: 45000 + Math.random() * 2000,
        lower: 44700 + Math.random() * 2000,
        position: 0.3 + Math.random() * 0.4,
        width: 0.2 + Math.random() * 0.4
      },
      rsi: {
        value: 30 + Math.random() * 40,
        divergence: Math.random() * 0.6
      },
      macd: {
        line: Math.random() * 200 - 100,
        signal: Math.random() * 200 - 100,
        histogram: Math.random() * 100 - 50
      }
    };

    const sessionInfo: SessionInfo = {
      londonSession: Math.random() > 0.5,
      nySession: Math.random() > 0.5,
      asianSession: Math.random() > 0.5,
      sessionOverlap: Math.random() > 0.7,
      volatility: Math.random()
    };

    const smartMoneyConcepts: SmartMoneyConcepts = {
      orderBlocks: [
        {
          id: 'ob1',
          price: marketData.close * (0.98 + Math.random() * 0.04),
          type: Math.random() > 0.5 ? 'buy' : 'sell',
          strength: Math.random(),
          timestamp: Date.now() - Math.random() * 3600000,
          timeframe
        }
      ],
      fairValueGaps: [
        {
          id: 'fvg1',
          high: marketData.close * (1 + Math.random() * 0.02),
          low: marketData.close * (1 - Math.random() * 0.02),
          type: Math.random() > 0.5 ? 'bullish' : 'bearish',
          strength: Math.random(),
          timestamp: Date.now() - Math.random() * 3600000,
          timeframe
        }
      ],
      liquidityPools: [
        {
          id: 'lp1',
          price: marketData.close * (0.99 + Math.random() * 0.02),
          type: Math.random() > 0.5 ? 'buy' : 'sell',
          size: 500000 + Math.random() * 1000000,
          timestamp: Date.now() - Math.random() * 3600000,
          timeframe
        }
      ]
    };

    const llmSignals: LLMSignals = {
      sentiment: {
        score: Math.random() * 2 - 1,
        confidence: Math.random(),
        label: Math.random() > 0.5 ? 'bullish' : 'bearish'
      },
      riskAssessment: {
        level: Math.random(),
        confidence: Math.random(),
        factors: ['market_volatility', 'liquidity_risk']
      },
      marketFearGreed: {
        value: Math.random() * 100,
        classification: 'neutral'
      }
    };

    const marketRegime: MarketRegime = {
      trendDirection: ['strong_up', 'moderate_up', 'sideways', 'moderate_down', 'strong_down'][Math.floor(Math.random() * 5)] as MarketRegime['trendDirection'],
      volatilityState: ['low', 'normal', 'high', 'extreme'][Math.floor(Math.random() * 4)] as MarketRegime['volatilityState'],
      momentumState: ['accelerating', 'maintaining', 'decelerating', 'reversing'][Math.floor(Math.random() * 4)] as MarketRegime['momentumState']
    };

    return {
      marketData,
      technicalIndicators,
      sessionInfo,
      smartMoneyConcepts,
      llmSignals,
      marketRegime
    };
  };

  const handleCalculateFeatureVector = async () => {
    const sampleData = generateSampleData();
    await calculateFeatureVector(
      sampleData.marketData,
      sampleData.technicalIndicators,
      sampleData.sessionInfo,
      sampleData.smartMoneyConcepts,
      sampleData.llmSignals,
      sampleData.marketRegime
    );

    if (mlVector && onFeatureVectorGenerated) {
      onFeatureVectorGenerated(mlVector);
    }
  };

  const handleSimulateDataStream = async () => {
    setIsSimulating(true);
    const dataPoints = [];

    for (let i = 0; i < 50; i++) {
      const sampleData = generateSampleData();
      await calculateFeatureVector(
        sampleData.marketData,
        sampleData.technicalIndicators,
        sampleData.sessionInfo,
        sampleData.smartMoneyConcepts,
        sampleData.llmSignals,
        sampleData.marketRegime
      );

      if (featureVector) {
        dataPoints.push({
          timestamp: i,
          ...featureVector
        });
      }

      // Add delay for visualization
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setSimulationData(dataPoints);
    setIsSimulating(false);
  };

  const getFeatureCategoryData = (category: string) => {
    if (!featureVector) return [];

    const features = featureVector[category as keyof typeof featureVector] as number[];
    const featureNames = {
      technicalFeatures: ['ATR', 'BB Pos', 'BB Width', 'RSI', 'RSI Div', 'MACD', 'Signal', 'Histogram'],
      sessionFeatures: ['London', 'NY', 'Asian', 'Overlap'],
      smartMoneyFeatures: ['OB Density', 'FVG Density', 'Liquidity', 'Confluence'],
      sentimentFeatures: ['Sentiment', 'Confidence', 'Risk', 'Fear/Greed'],
      regimeFeatures: ['Trend', 'Volatility', 'Momentum', 'Stability'],
      marketContextFeatures: ['Price Change', 'Range', 'Volume', 'ATR', 'Session Vol']
    };

    return features.map((value, index) => ({
      name: featureNames[category as keyof typeof featureNames][index] || `Feature ${index}`,
      value: value * 100 // Scale for better visualization
    }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Unified Feature Engineering Dashboard</CardTitle>
          <CardDescription>
            Real-time feature vector generation for ML model training and inference
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6">
            <Button
              onClick={handleCalculateFeatureVector}
              disabled={isCalculating}
              className="min-w-[200px]"
            >
              {isCalculating ? 'Calculating...' : 'Generate Feature Vector'}
            </Button>
            <Button
              onClick={handleSimulateDataStream}
              disabled={isSimulating}
              variant="outline"
              className="min-w-[200px]"
            >
              {isSimulating ? 'Simulating...' : 'Simulate Data Stream'}
            </Button>
            <Button
              onClick={resetFeatureHistory}
              variant="outline"
              className="min-w-[200px]"
            >
              Reset History
            </Button>
            <Button
              onClick={() => {
                const exported = exportFeatureVector();
                if (exported) {
                  navigator.clipboard.writeText(exported);
                  alert('Feature vector exported to clipboard!');
                }
              }}
              variant="outline"
              className="min-w-[200px]"
            >
              Export Vector
            </Button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Feature Count</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {mlVector ? mlVector.length : 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Last Update</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : 'Never'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant={isCalculating ? 'secondary' : 'default'}>
                  {isCalculating ? 'Processing' : 'Ready'}
                </Badge>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {featureVector && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="technical">Technical</TabsTrigger>
            <TabsTrigger value="session">Session</TabsTrigger>
            <TabsTrigger value="smartMoney">Smart Money</TabsTrigger>
            <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
            <TabsTrigger value="regime">Regime</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Feature Vector Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">ML-Ready Vector</h4>
                    <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm max-h-32 overflow-y-auto">
                      {mlVector ? mlVector.slice(0, 20).map((v, i) => v.toFixed(3)).join(', ') + '...' : 'No data'}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Feature Categories</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      <div className="bg-blue-50 p-2 rounded">
                        <div className="text-sm font-medium">Technical</div>
                        <div className="text-lg">{featureVector.technicalFeatures.length}</div>
                      </div>
                      <div className="bg-green-50 p-2 rounded">
                        <div className="text-sm font-medium">Session</div>
                        <div className="text-lg">{featureVector.sessionFeatures.length}</div>
                      </div>
                      <div className="bg-purple-50 p-2 rounded">
                        <div className="text-sm font-medium">Smart Money</div>
                        <div className="text-lg">{featureVector.smartMoneyFeatures.length}</div>
                      </div>
                      <div className="bg-orange-50 p-2 rounded">
                        <div className="text-sm font-medium">Sentiment</div>
                        <div className="text-lg">{featureVector.sentimentFeatures.length}</div>
                      </div>
                      <div className="bg-red-50 p-2 rounded">
                        <div className="text-sm font-medium">Regime</div>
                        <div className="text-lg">{featureVector.regimeFeatures.length}</div>
                      </div>
                      <div className="bg-gray-50 p-2 rounded">
                        <div className="text-sm font-medium">Context</div>
                        <div className="text-lg">{featureVector.marketContextFeatures.length}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="technical">
            <Card>
              <CardHeader>
                <CardTitle>Technical Indicators</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getFeatureCategoryData('technicalFeatures')}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="session">
            <Card>
              <CardHeader>
                <CardTitle>Session Features</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getFeatureCategoryData('sessionFeatures')}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="smartMoney">
            <Card>
              <CardHeader>
                <CardTitle>Smart Money Concepts</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getFeatureCategoryData('smartMoneyFeatures')}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sentiment">
            <Card>
              <CardHeader>
                <CardTitle>Sentiment Features</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getFeatureCategoryData('sentimentFeatures')}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="regime">
            <Card>
              <CardHeader>
                <CardTitle>Market Regime Features</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getFeatureCategoryData('regimeFeatures')}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {featureWeights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Feature Weights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {featureWeights.map((weight, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{weight.featureName}</span>
                    <span className="text-sm text-gray-600">
                      {weight.weight.toFixed(3)} (importance: {weight.importance.toFixed(3)})
                    </span>
                  </div>
                  <Progress value={weight.weight * 100} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};