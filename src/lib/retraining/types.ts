// Core types and interfaces for the Continuous Retraining System

export interface RetrainingConfig {
  // Schedule configuration
  schedule: {
    enabled: boolean;
    cronExpression: string;
    timezone: string;
    runOnStartup: boolean;
  };

  // Data collection settings
  dataCollection: {
    lookbackDays: number;
    minTradesThreshold: number;
    maxTradesPerBatch: number;
    includeIncompleteTrades: boolean;
    dataQualityThreshold: number;
  };

  // Model training settings
  training: {
    epochs: number;
    batchSize: number;
    learningRate: number;
    validationSplit: number;
    earlyStoppingPatience: number;
    hyperparameterOptimization: {
      enabled: boolean;
      maxTrials: number;
      optimizationMetric: 'sharpe_ratio' | 'win_rate' | 'profit_factor' | 'total_return';
    };
  };

  // Model evaluation criteria
  evaluation: {
    minWinRate: number;
    minProfitFactor: number;
    maxDrawdownThreshold: number;
    minTradesForValidation: number;
    performanceDecayThreshold: number;
  };

  // Deployment settings
  deployment: {
    autoDeploy: boolean;
    abTesting: {
      enabled: boolean;
      trafficSplit: number;
      minConfidenceThreshold: number;
    };
    rollbackOnDegradation: boolean;
    cooldownPeriodHours: number;
  };

  // Monitoring settings
  monitoring: {
    alertsEnabled: boolean;
    performanceTracking: boolean;
    modelDriftDetection: {
      enabled: boolean;
      sensitivity: number;
      checkIntervalHours: number;
    };
  };
}

export interface TradeData {
  id: string;
  symbol: string;
  signal: 'BUY' | 'SELL';
  entry: number;
  stopLoss: number;
  takeProfit: number;
  timestamp: string;
  closedAt?: string;
  closePrice?: number;
  actualProfit?: number;
  pipsGained?: number;
  tradeDurationMinutes?: number;
  confidence?: number;
  mlConfidenceScore?: number;
  featureVector?: Record<string, unknown>;
  marketRegime?: string;
  volatilityState?: string;
  sessionInfo?: string;
  userId?: string;
  clientId: string;
  aiModelVersion?: string;
  rlModelVersion?: string;
}

export interface FeatureVector {
  // Technical indicators
  rsi: number;
  macd: number;
  bb_position: number;
  atr: number;

  // Market structure
  trend_strength: number;
  volatility_rank: number;
  market_regime: number;

  // Time features
  day_of_week: number;
  hour_of_day: number;
  session_bias: number;

  // Risk metrics
  risk_reward_ratio: number;
  position_size: number;

  // Smart money concepts
  smart_money_score: number;
  institutional_bias: number;

  // News impact
  news_sentiment: number;
  news_impact: number;

  // Performance tracking
  win_probability: number;
  confidence_score: number;
}

export interface TrainingSample {
  features: FeatureVector;
  action: number; // 0: HOLD, 1: BUY, 2: SELL
  reward: number;
  next_state: FeatureVector;
  done: boolean;
  timestamp: string;
  symbol: string;
  trade_id?: string;
}

export interface ModelMetrics {
  total_trades: number;
  winning_trades: number;
  win_rate: number;
  total_profit: number;
  total_loss: number;
  net_profit: number;
  profit_factor: number;
  sharpe_ratio: number;
  max_drawdown: number;
  average_win: number;
  average_loss: number;
  largest_win: number;
  largest_loss: number;
  consistency_score: number;
  trade_distribution: {
    profitable: number;
    breakeven: number;
    unprofitable: number;
  };
}

export interface ModelVersion {
  id: string;
  version: string;
  modelType: 'PPO' | 'CPPO';
  createdAt: string;
  trainedOn: string;
  dataPoints: number;
  metrics: ModelMetrics;
  config: RetrainingConfig;
  hyperparameters: Record<string, unknown>;
  status: 'training' | 'evaluating' | 'ready' | 'deployed' | 'rolled_back';
  deployedAt?: string;
  rollbackReason?: string;
  performanceScore: number;
  fileUrl?: string;
  checksum: string;
}

export interface RetrainingJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime?: string;
  endTime?: string;
  config: RetrainingConfig;
  inputVersion?: string;
  outputVersion?: string;
  dataStats: {
    totalTrades: number;
    profitableTrades: number;
    avgProfit: number;
    timeRange: {
      start: string;
      end: string;
    };
  };
  error?: string;
  warnings: string[];
  logs: RetrainingLog[];
}

export interface RetrainingLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  details?: Record<string, unknown>;
}

export interface ABRollout {
  id: string;
  modelAVersion: string;
  modelBVersion: string;
  trafficSplit: number;
  startTime: string;
  endTime?: string;
  status: 'active' | 'completed' | 'terminated';
  metrics: {
    modelA: ModelMetrics;
    modelB: ModelMetrics;
    statisticalSignificance: boolean;
    pValue: number;
  };
  winner?: 'modelA' | 'modelB' | 'inconclusive';
}

export interface PerformanceAlert {
  id: string;
  type: 'performance_degradation' | 'model_drift' | 'training_failure' | 'data_quality';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  message: string;
  details: Record<string, unknown>;
  acknowledged: boolean;
  resolvedAt?: string;
  resolution?: string;
}

export interface RetrainingSystem {
  config: RetrainingConfig;
  currentModel: ModelVersion | null;
  availableVersions: ModelVersion[];
  activeRollout?: ABRollout;
  recentJobs: RetrainingJob[];
  alerts: PerformanceAlert[];
  systemHealth: {
    status: 'healthy' | 'warning' | 'error';
    lastCheck: string;
    issues: string[];
  };
}

// Event types for the retraining system
export type RetrainingEvent =
  | { type: 'job_started'; jobId: string; config: RetrainingConfig }
  | { type: 'job_completed'; jobId: string; version: ModelVersion }
  | { type: 'job_failed'; jobId: string; error: string }
  | { type: 'model_deployed'; version: ModelVersion }
  | { type: 'model_rolled_back'; version: ModelVersion; reason: string }
  | { type: 'ab_test_started'; rollout: ABRollout }
  | { type: 'ab_test_completed'; rollout: ABRollout; winner: string }
  | { type: 'alert_triggered'; alert: PerformanceAlert }
  | { type: 'performance_monitored'; metrics: ModelMetrics; version: string };

export type RetrainingEventHandler = (event: RetrainingEvent) => Promise<void> | void;

// Service interfaces
export interface IDataCollector {
  collectTradeData(startDate: string, endDate: string): Promise<TradeData[]>;
  validateDataQuality(trades: TradeData[]): Promise<{ valid: boolean; score: number; issues: string[] }>;
  generateFeatureVectors(trades: TradeData[]): Promise<TrainingSample[]>;
}

export interface IModelTrainer {
  train(samples: TrainingSample[], config: RetrainingConfig): Promise<ModelVersion>;
  evaluate(model: ModelVersion, testData: TrainingSample[]): Promise<ModelMetrics>;
  hyperparameterOptimization(samples: TrainingSample[], config: RetrainingConfig): Promise<Record<string, unknown>>;
}

export interface IModelRepository {
  saveModel(model: ModelVersion): Promise<void>;
  loadModel(version: string): Promise<ModelVersion>;
  listVersions(): Promise<ModelVersion[]>;
  deleteModel(version: string): Promise<void>;
  getCurrentModel(): Promise<ModelVersion | null>;
  setCurrentModel(version: string): Promise<void>;
}

export interface IDeploymentManager {
  deployModel(version: string): Promise<void>;
  rollbackModel(reason: string): Promise<void>;
  startABTest(modelA: string, modelB: string, trafficSplit: number): Promise<ABRollout>;
  endABTest(rolloutId: string, winner?: string): Promise<void>;
  getDeploymentStatus(): Promise<{ current: string; status: string }>;
}

export interface IMonitoringService {
  trackPerformance(version: string, trades: TradeData[]): Promise<ModelMetrics>;
  detectDrift(currentMetrics: ModelMetrics, baseline: ModelMetrics): Promise<boolean>;
  createAlert(alert: Omit<PerformanceAlert, 'id' | 'timestamp'>): Promise<PerformanceAlert>;
  acknowledgeAlert(alertId: string): Promise<void>;
  resolveAlert(alertId: string, resolution: string): Promise<void>;
  getSystemHealth(): Promise<{ status: 'healthy' | 'warning' | 'error'; issues: string[] }>;
}