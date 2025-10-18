// @ts-nocheck
/**
 * RL Trading System Types and Interfaces
 * Based on FinRL patterns with LLM-infused reinforcement learning
 */

export interface RLModelConfig {
  modelType: 'PPO' | 'CPPO';
  stateDim: number;
  actionDim: number;
  hiddenLayers: number[];
  learningRate: number;
  gamma: number;
  clipRatio: number;
  entropyCoeff: number;
  valueCoeff: number;
  maxGradNorm: number;
  batchSize: number;
  epochs: number;
  constraintThreshold?: number; // For CPPO
  constraintCoeff?: number; // For CPPO
}

export interface TradingState {
  features: number[];
  timestamp: number;
  symbol: string;
  timeframe: string;
  marketContext: MarketContext;
  positionState: PositionState;
  portfolioState: PortfolioState;
}

export interface MarketContext {
  price: number;
  volume: number;
  volatility: number;
  trend: number;
  marketRegime: MarketRegime;
  sessionInfo: SessionInfo;
  technicalIndicators: TechnicalIndicators;
  sentiment: SentimentData;
}

export interface PositionState {
  currentPosition: 'LONG' | 'SHORT' | 'NONE';
  entryPrice: number | null;
  positionSize: number;
  unrealizedPnL: number;
  positionAge: number; // in seconds
  stopLoss: number | null;
  takeProfit: number | null;
}

export interface PortfolioState {
  totalValue: number;
  availableBalance: number;
  marginUsed: number;
  leverage: number;
  riskLevel: number;
  dailyPnL: number;
  winRate: number;
  maxDrawdown: number;
}

export interface RLAction {
  type?: string; // Action type for compatibility
  direction: 'BUY' | 'SELL' | 'HOLD';
  intensity: number; // 0-1 representing position size
  confidence: number; // 0-1 representing model confidence
  stopLoss?: number;
  takeProfit?: number;
  expectedReward: number;
  riskLevel: number;
  reasoning?: string;
}

export interface ModelMetadata {
  version: string;
  trainingDate: string;
  trainingDuration: number; // in seconds
  trainingEpisodes: number;
  finalReward: number;
  accuracy: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  symbols: string[];
  timeframes: string[];
  modelSize: number; // in bytes
  checksum: string;
}

export interface ModelWeights {
  policyNet: number[][][];
  valueNet: number[][][];
  constraintNet?: number[][][]; // For CPPO
  optimizerState?: unknown;
  metadata: ModelMetadata;
}

export interface InferenceStats {
  inferenceTime: number;
  memoryUsage: number;
  predictionCount: number;
  averageConfidence: number;
  cacheHitRate: number;
  errorCount: number;
  lastPredictionTime: number;
}

export interface RLTrainingHistory {
  episode: number;
  totalReward: number;
  averageReward: number;
  loss: number;
  policyLoss: number;
  valueLoss: number;
  entropyLoss: number;
  constraintLoss?: number; // For CPPO
  accuracy: number;
  portfolioValue: number;
  sharpeRatio: number;
  maxDrawdown: number;
  timestamp: number;
}

export interface PerformanceMetrics {
  totalReturns: number;
  annualizedReturns: number;
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  calmarRatio: number;
  winRate: number;
  profitFactor: number;
  averageTrade: number;
  tradeCount: number;
  bestTrade: number;
  worstTrade: number;
  averageHoldingPeriod: number;
}

export interface RLInferenceConfig {
  modelPath: string;
  cacheSize: number;
  cacheTTL: number; // in milliseconds
  inferenceTimeout: number; // in milliseconds
  enableFallback: boolean;
  fallbackModel: string;
  enableMonitoring: boolean;
  enableUncertaintyQuantification: boolean;
  confidenceThreshold: number;
  maxInferenceMemory: number; // in bytes
  enableCompression: boolean;
  maxPositionSize?: number; // Maximum position size for risk management
  batchSize?: number; // Batch size for inference
}

export interface SupabaseStorageConfig {
  bucket: string;
  path: string;
  region: string;
  endpoint?: string;
  apiKey?: string;
}

export interface ModelCache {
  key: string;
  weights: ModelWeights;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
}

export interface UncertaintyEstimate {
  epistemic: number; // Model uncertainty
  aleatoric: number; // Data uncertainty
  total: number;
  confidence: number;
  entropy: number;
  predictionSet: string[];
}

export interface ConstraintViolation {
  type: 'risk_limit' | 'drawdown' | 'leverage' | 'position_size' | 'market_hours';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  value: number;
  limit: number;
  recommendedAction: string;
}

export interface TradingEnvironment {
  symbol: string;
  timeframe: string;
  initialBalance: number;
  leverage: number;
  riskPerTrade: number;
  maxDailyLoss: number;
  maxPositionSize: number;
  tradingHours: {
    start: string;
    end: string;
    timezone: string;
  };
  allowedDays: string[];
  constraints: {
    maxLeverage: number;
    maxDrawdown: number;
    maxConcurrentTrades: number;
    minTradeInterval: number; // in seconds
  };
}

export interface RLModelMetrics {
  trainingProgress: number;
  convergenceRate: number;
  stabilityScore: number;
  generalizationScore: number;
  overfittingRisk: number;
  modelHealth: number;
  predictionAccuracy: number;
  riskAdjustedReturns: number;
  constraintSatisfaction: number;
}

// Action space definition
export interface ActionSpace {
  type: 'discrete' | 'continuous';
  actions: string[];
  bounds: {
    min: number;
    max: number;
  };
  constraints: {
    maxPositionSize: number;
    maxLeverage: number;
    riskLimit: number;
  };
}

// State space definition
export interface StateSpace {
  dimensions: number;
  features: string[];
  normalization: {
    type: 'minmax' | 'zscore' | 'tanh';
    params: unknown;
  };
  featureGroups: {
    technical: string[];
    fundamental: string[];
    sentiment: string[];
    market: string[];
  };
}

// Model versioning
export interface ModelVersion {
  version: string;
  createdAt: string;
  isActive: boolean;
  isStable: boolean;
  performance: PerformanceMetrics;
  trainingConfig: RLModelConfig;
  dataSources: string[];
  tags: string[];
  changelog: string;
}

// RL Agent configuration
export interface RLAgentConfig {
  model: RLModelConfig;
  environment: TradingEnvironment;
  inference: RLInferenceConfig;
  training: {
    maxEpisodes: number;
    maxStepsPerEpisode: number;
    saveInterval: number;
    evalInterval: number;
    checkpointDir: string;
    tensorboardDir: string;
  };
  monitoring: {
    enableTensorboard: boolean;
    enableWandb: boolean;
    enableCustomMetrics: boolean;
    metricsInterval: number;
  };
}