// @ts-nocheck
/**
 * RL Trading System - Main Export File
 *
 * This file exports all components of the Real RL Inference system
 * for easy integration with the existing trading system.
 *
 * Based on FinRL patterns with LLM-infused reinforcement learning
 * for automated cryptocurrency trading.
 */

// Core Types
export * from '../../types/rl-trading';

// Core Components
export { RLModelArchitecture } from './RLModelArchitecture';
export { ModelLoader } from './ModelLoader';
export { InferenceEngine } from './InferenceEngine';
export { RLTradingService } from './RLTradingService';

// React Integration
export { useRLTrading } from '../../hooks/useRLTrading';

// UI Components
export { RLTradingPanel } from '../../components/RLTradingPanel';

// Constants and Default Configurations
export const DEFAULT_RL_CONFIG = {
  model: {
    modelType: 'PPO' as const,
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
    epochs: 10,
    constraintThreshold: 0.5,
    constraintCoeff: 1.0
  },
  environment: {
    symbol: 'BTC/USD',
    timeframe: '1h',
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
    modelPath: 'BTC/USD/ppo-model',
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

// Storage Configuration
export const DEFAULT_STORAGE_CONFIG = {
  bucket: 'rl-models',
  path: 'trading-models',
  region: 'us-east-1'
};

// Supported Symbols and Models
export const SUPPORTED_SYMBOLS = [
  'BTC/USD',
  'ETH/USD',
  'SOL/USD',
  'BNB/USD',
  'XRP/USD',
  'ADA/USD',
  'DOT/USD',
  'DOGE/USD',
  'AVAX/USD',
  'MATIC/USD'
];

export const SUPPORTED_TIMEFRAMES = [
  '1m',
  '5m',
  '15m',
  '30m',
  '1h',
  '4h',
  '1d',
  '1w'
];

export const SUPPORTED_MODEL_TYPES = [
  'PPO',
  'CPPO'
];

// Import ES6 modules
import { RLTradingService } from './RLTradingService';
import { ModelLoader } from './ModelLoader';
import { InferenceEngine } from './InferenceEngine';
import { UnifiedFeatureEngineer } from '../feature-engineering/UnifiedFeatureEngineer';

// Utility Functions
export const createRLTradingService = (config: unknown = {}) => {
  const finalConfig = { ...DEFAULT_RL_CONFIG, ...config };
  return new RLTradingService(finalConfig);
};

export const createModelLoader = (config: unknown = {}) => {
  const inferenceConfig = { ...DEFAULT_RL_CONFIG.inference, ...config };
  const storageConfig = { ...DEFAULT_STORAGE_CONFIG, ...config.storage };
  return new ModelLoader(inferenceConfig, storageConfig);
};

export const createInferenceEngine = (modelLoader: unknown, config: unknown = {}) => {
  const featureEngineer = new UnifiedFeatureEngineer();
  const inferenceConfig = { ...DEFAULT_RL_CONFIG.inference, ...config };
  return new InferenceEngine(modelLoader, inferenceConfig, featureEngineer);
};

// Version Information
export const RL_TRADING_VERSION = '1.0.0';
export const RL_TRADING_COMPATIBILITY = '^1.0.0';

// Error Types
export class RLTradingError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'RLTradingError';
  }
}

export class ModelLoadError extends RLTradingError {
  constructor(message: string, details?: unknown) {
    super(message, 'MODEL_LOAD_ERROR', details);
    this.name = 'ModelLoadError';
  }
}

export class InferenceError extends RLTradingError {
  constructor(message: string, details?: unknown) {
    super(message, 'INFERENCE_ERROR', details);
    this.name = 'InferenceError';
  }
}

export class ConstraintViolationError extends RLTradingError {
  constructor(message: string, details?: unknown) {
    super(message, 'CONSTRAINT_VIOLATION', details);
    this.name = 'ConstraintViolationError';
  }
}

// Health Check Function
export const checkRLSystemHealth = async (service: unknown) => {
  try {
    const status = service.getServiceStatus();
    const stats = service.getDetailedStats();

    return {
      isHealthy: status.health === 'healthy',
      status,
      stats,
      timestamp: new Date().toISOString(),
      version: RL_TRADING_VERSION
    };
  } catch (error) {
    return {
      isHealthy: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      version: RL_TRADING_VERSION
    };
  }
};

// Performance Metrics
export const calculateRLPerformanceMetrics = (predictions: unknown[]) => {
  if (!predictions || predictions.length === 0) {
    return {
      totalPredictions: 0,
      averageConfidence: 0,
      averageUncertainty: 0,
      averageProcessingTime: 0,
      errorRate: 0,
      constraintViolationRate: 0
    };
  }

  const totalPredictions = predictions.length;
  const totalConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0);
  const totalUncertainty = predictions.reduce((sum, p) => sum + (p.uncertainty?.total || 0), 0);
  const totalProcessingTime = predictions.reduce((sum, p) => sum + (p.processingTime || 0), 0);
  const errors = predictions.filter(p => p.error).length;
  const constraintViolations = predictions.filter(p => p.constraints && p.constraints.length > 0).length;

  return {
    totalPredictions,
    averageConfidence: totalConfidence / totalPredictions,
    averageUncertainty: totalUncertainty / totalPredictions,
    averageProcessingTime: totalProcessingTime / totalPredictions,
    errorRate: errors / totalPredictions,
    constraintViolationRate: constraintViolations / totalPredictions
  };
};

// Migration Helpers
export const migrateFromAISignals = (aiSignal: unknown) => {
  // Convert existing AI signal format to RL trading format
  return {
    direction: aiSignal.type === 'BUY' ? 'BUY' : aiSignal.type === 'SELL' ? 'SELL' : 'HOLD',
    intensity: aiSignal.confidence / 100,
    confidence: aiSignal.confidence / 100,
    expectedReward: 0, // Would need calculation
    riskLevel: 0.5, // Would need calculation
    stopLoss: null,
    takeProfit: null,
    reasoning: `Migrated from AI Signal: ${aiSignal.reason}`,
    source: 'AI_Signals_Migration',
    timestamp: aiSignal.timestamp
  };
};

// Feature Engineering Integration
export const integrateWithFeatureEngineering = (featureVector: unknown) => {
  // Integrate with existing Unified Feature Engineering system
  return {
    technicalFeatures: featureVector.technicalFeatures || [],
    sessionFeatures: featureVector.sessionFeatures || [],
    smartMoneyFeatures: featureVector.smartMoneyFeatures || [],
    sentimentFeatures: featureVector.sentimentFeatures || [],
    regimeFeatures: featureVector.regimeFeatures || [],
    marketContextFeatures: featureVector.marketContextFeatures || [],
    timestamp: featureVector.timestamp || Date.now(),
    symbol: featureVector.symbol || 'UNKNOWN',
    timeframe: featureVector.timeframe || '1h'
  };
};

// Deployment Configuration
export const DEPLOYMENT_CONFIG = {
  // Production settings
  production: {
    cacheSize: 50,
    cacheTTL: 3600000, // 1 hour
    inferenceTimeout: 3000,
    enableMonitoring: true,
    enableCompression: true,
    confidenceThreshold: 0.7,
    maxInferenceMemory: 500 * 1024 * 1024, // 500MB
    enableFallback: true
  },

  // Development settings
  development: {
    cacheSize: 5,
    cacheTTL: 600000, // 10 minutes
    inferenceTimeout: 10000,
    enableMonitoring: true,
    enableCompression: false,
    confidenceThreshold: 0.5,
    maxInferenceMemory: 100 * 1024 * 1024, // 100MB
    enableFallback: true
  },

  // Testing settings
  testing: {
    cacheSize: 2,
    cacheTTL: 300000, // 5 minutes
    inferenceTimeout: 15000,
    enableMonitoring: false,
    enableCompression: false,
    confidenceThreshold: 0.3,
    maxInferenceMemory: 50 * 1024 * 1024, // 50MB
    enableFallback: false
  }
};

// Export everything for easy importing
export {
  // Core classes
  RLModelArchitecture,
  ModelLoader,
  InferenceEngine,
  RLTradingService,

  // React hooks
  useRLTrading,

  // UI components
  RLTradingPanel,

  // Types are already exported with the * export above
};