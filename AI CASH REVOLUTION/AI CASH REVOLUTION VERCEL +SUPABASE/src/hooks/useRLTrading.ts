import { useState, useEffect, useCallback, useRef } from 'react';
import { RLAgentConfig, RLAction, InferenceStats, UncertaintyEstimate, ConstraintViolation } from '../types/rl-trading';
import { RLTradingService } from '../lib/rl-trading/RLTradingService';
import { MarketData } from '../types/trading';

/**
 * React Hook for RL Trading Integration
 * Provides easy integration with the RL trading system
 */
interface UseRLTradingProps {
  symbol: string;
  timeframe: string;
  autoStart?: boolean;
  config?: Partial<RLAgentConfig>;
  onPrediction?: (action: RLAction, stats: PredictionStats) => void;
}

interface PredictionStats {
  confidence: number;
  processingTime: number;
  uncertainty: number;
  constraints: number;
}

interface PerformanceMetrics {
  totalPredictions: number;
  successfulPredictions: number;
  averageConfidence: number;
  averageProcessingTime: number;
  totalProfit: number;
  winRate: number;
  sharpeRatio: number;
  maxDrawdown: number;
  uptime: number;
}


interface RLTradingState {
  isLoading: boolean;
  isActive: boolean;
  lastAction: RLAction | null;
  uncertainty: UncertaintyEstimate | null;
  constraints: ConstraintViolation[];
  stats: InferenceStats | null;
  performance: PerformanceMetrics;
  error: Error | null;
  processingTime: number;
}

export const useRLTrading = ({
  symbol,
  timeframe,
  autoStart = false,
  config = {},
  onPrediction,
  onError
}: UseRLTradingProps) => {
  const serviceRef = useRef<RLTradingService | null>(null);
  const [state, setState] = useState<RLTradingState>({
    isLoading: true,
    isActive: false,
    lastAction: null,
    uncertainty: null,
    constraints: [],
    stats: null,
    performance: null,
    error: null,
    processingTime: 0
  });

  // Initialize RL Trading Service
  useEffect(() => {
    const initializeService = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        const defaultConfig: RLAgentConfig = {
          model: {
            modelType: 'PPO',
            stateDim: 128,
            actionDim: 3,
            hiddenLayers: [128, 64, 32],
            learningRate: 0.001,
            gamma: 0.99,
            clipRatio: 0.2,
            entropyCoeff: 0.01,
            valueCoeff: 0.5,
            maxGradNorm: 0.5,
            batchSize: 32,
            epochs: 10
          },
          environment: {
            symbol,
            timeframe,
            initialBalance: 10000,
            leverage: 1,
            riskPerTrade: 0.02,
            maxDailyLoss: 0.1,
            maxPositionSize: 0.1,
            tradingHours: {
              start: '00:00',
              end: '23:59',
              timezone: 'UTC'
            },
            allowedDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
            constraints: {
              maxLeverage: 10,
              maxDrawdown: 0.2,
              maxConcurrentTrades: 3,
              minTradeInterval: 300
            }
          },
          inference: {
            modelPath: `${symbol}/ppo-model`,
            cacheSize: 10,
            cacheTTL: 1800000, // 30 minutes
            inferenceTimeout: 5000,
            enableFallback: true,
            fallbackModel: 'default/ppo-model',
            enableMonitoring: true,
            enableUncertaintyQuantification: true,
            confidenceThreshold: 0.6,
            maxInferenceMemory: 100 * 1024 * 1024, // 100MB
            enableCompression: true
          },
          training: {
            maxEpisodes: 1000,
            maxStepsPerEpisode: 1000,
            saveInterval: 100,
            evalInterval: 50,
            checkpointDir: './checkpoints',
            tensorboardDir: './logs'
          },
          monitoring: {
            enableTensorboard: false,
            enableWandb: false,
            enableCustomMetrics: true,
            metricsInterval: 60000
          }
        };

        const finalConfig = { ...defaultConfig, ...config };
        finalConfig.environment.symbol = symbol;
        finalConfig.environment.timeframe = timeframe;
        finalConfig.inference.modelPath = `${symbol}/ppo-model`;

        const service = new RLTradingService(finalConfig);
        await service.initialize();

        serviceRef.current = service;

        if (autoStart) {
          await service.start();
        }

        setState(prev => ({
          ...prev,
          isLoading: false,
          isActive: autoStart,
          stats: service.getServiceStatus().engineStats.inferenceStats,
          performance: service.getServiceStatus().performanceMetrics
        }));

      } catch (error) {
        const err = error as Error;
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: err
        }));
        onError?.(err);
      }
    };

    initializeService();

    return () => {
      if (serviceRef.current) {
        serviceRef.current.stop();
      }
    };
  }, [symbol, timeframe, autoStart, config, onError]);

  // Start trading service
  const start = useCallback(async () => {
    if (!serviceRef.current) return;

    try {
      await serviceRef.current.start();
      setState(prev => ({ ...prev, isActive: true }));
    } catch (error) {
      const err = error as Error;
      setState(prev => ({ ...prev, error: err }));
      onError?.(err);
    }
  }, [onError]);

  // Stop trading service
  const stop = useCallback(async () => {
    if (!serviceRef.current) return;

    try {
      await serviceRef.current.stop();
      setState(prev => ({ ...prev, isActive: false }));
    } catch (error) {
      const err = error as Error;
      setState(prev => ({ ...prev, error: err }));
      onError?.(err);
    }
  }, [onError]);

  // Make prediction
  const predict = useCallback(async (marketData: MarketData) => {
    if (!serviceRef.current || !state.isActive) {
      throw new Error('Service not active');
    }

    try {
      const prediction = await serviceRef.current.predictTradingAction(marketData);

      setState(prev => ({
        ...prev,
        lastAction: prediction.action,
        uncertainty: prediction.uncertainty,
        constraints: prediction.constraints,
        processingTime: prediction.processingTime,
        stats: serviceRef.current?.getServiceStatus().engineStats.inferenceStats || null
      }));

      onPrediction?.(prediction.action, {
        confidence: prediction.confidence,
        processingTime: prediction.processingTime,
        uncertainty: prediction.uncertainty.total,
        constraints: prediction.constraints.length
      });

      return prediction;
    } catch (error) {
      const err = error as Error;
      setState(prev => ({ ...prev, error: err }));
      onError?.(err);
      throw err;
    }
  }, [state.isActive, onPrediction, onError]);

  // Get service status
  const getStatus = useCallback(() => {
    if (!serviceRef.current) return null;
    return serviceRef.current.getServiceStatus();
  }, []);

  // Get detailed stats
  const getStats = useCallback(() => {
    if (!serviceRef.current) return null;
    return serviceRef.current.getDetailedStats();
  }, []);

  // Get feature importance
  const getFeatureImportance = useCallback(async () => {
    if (!serviceRef.current) return null;
    return await serviceRef.current.getFeatureImportance(symbol, timeframe);
  }, [symbol, timeframe]);

  // Reset service
  const reset = useCallback(async () => {
    if (!serviceRef.current) return;

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      await serviceRef.current.reset();

      setState(prev => ({
        ...prev,
        isLoading: false,
        lastAction: null,
        uncertainty: null,
        constraints: [],
        stats: serviceRef.current?.getServiceStatus().engineStats.inferenceStats || null,
        performance: serviceRef.current?.getServiceStatus().performanceMetrics || null
      }));
    } catch (error) {
      const err = error as Error;
      setState(prev => ({ ...prev, isLoading: false, error: err }));
      onError?.(err);
    }
  }, [onError]);

  // Update configuration
  const updateConfig = useCallback((newConfig: Partial<RLAgentConfig>) => {
    if (!serviceRef.current) return;
    serviceRef.current.updateConfig(newConfig);
  }, []);

  // Auto-refresh stats
  useEffect(() => {
    if (!state.isActive) return;

    const interval = setInterval(() => {
      if (serviceRef.current) {
        setState(prev => ({
          ...prev,
          stats: serviceRef.current?.getServiceStatus().engineStats.inferenceStats || null,
          performance: serviceRef.current?.getServiceStatus().performanceMetrics || null
        }));
      }
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [state.isActive]);

  return {
    // State
    isLoading: state.isLoading,
    isActive: state.isActive,
    lastAction: state.lastAction,
    uncertainty: state.uncertainty,
    constraints: state.constraints,
    stats: state.stats,
    performance: state.performance,
    error: state.error,
    processingTime: state.processingTime,

    // Actions
    start,
    stop,
    predict,
    reset,
    updateConfig,

    // Data
    getStatus,
    getStats,
    getFeatureImportance,

    // Derived state
    isHealthy: () => {
      const status = getStatus();
      return status?.health === 'healthy';
    },
    getCacheHitRate: () => {
      const stats = getStats();
      return stats?.cacheStats.hitRate || 0;
    },
    getAverageConfidence: () => {
      return state.stats?.averageConfidence || 0;
    },
    getPredictionCount: () => {
      return state.stats?.predictionCount || 0;
    },
    hasActiveConstraints: () => {
      return state.constraints.some(c => c.severity === 'high' || c.severity === 'critical');
    }
  };
};