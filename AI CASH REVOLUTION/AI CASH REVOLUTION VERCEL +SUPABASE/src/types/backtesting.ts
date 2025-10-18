/**
 * Backtesting Framework Types
 *
 * Comprehensive type definitions for the FinRL-style backtesting framework
 * with performance metrics, strategy evaluation, and data integration.
 */

import {
  MarketRegime,
  RiskMetrics,
  Position,
  Trade,
  Order,
  OrderType,
  OrderSide
} from './risk-management';

// === Core Backtesting Types ===

export interface OHLCVData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  symbol: string;
  timeframe: string;
}

export interface NewsSentiment {
  timestamp: number;
  title: string;
  content: string;
  sentiment: number; // -1 to 1
  confidence: number; // 0 to 1
  source: string;
  symbols: string[];
  impact: 'low' | 'medium' | 'high';
}

export interface EconomicEvent {
  timestamp: number;
  title: string;
  description: string;
  country: string;
  impact: 'low' | 'medium' | 'high';
  actual?: number;
  forecast?: number;
  previous?: number;
  currency: string;
}

export interface MarketContext {
  timestamp: number;
  regime: MarketRegime;
  volatility: number;
  liquidity: number;
  correlation: number;
  sentiment: number;
  economicEvents: EconomicEvent[];
  newsSentiment: NewsSentiment[];
}

// === Backtesting Configuration ===

export interface BacktestConfig {
  name: string;
  description?: string;
  symbols: string[];
  timeframes: string[];
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  baseCurrency: string;
  leverage: number;
  commission: {
    type: 'percentage' | 'fixed' | 'tiered';
    value: number;
    currency: string;
  };
  slippage: {
    type: 'percentage' | 'fixed' | 'adaptive';
    value: number;
    volatilityAdjustment?: boolean;
  };
  riskManagement: {
    maxPositionSize: number;
    maxDrawdown: number;
    maxDailyLoss: number;
    stopLoss: number;
    takeProfit: number;
    trailingStop?: number;
  };
  walkForward: {
    enabled: boolean;
    windowSize: number; // in days
    stepSize: number; // in days
    testSize: number; // in days
  };
  benchmark?: {
    symbol: string;
    type: 'index' | 'etf' | 'crypto';
  };
}

// === Strategy Interface ===

export interface Strategy {
  id: string;
  name: string;
  description: string;
  version: string;
  parameters: StrategyParameter[];
  initialize: (config: BacktestConfig) => Promise<void>;
  onData: (data: OHLCVData, context: MarketContext) => Promise<Signal[]>;
  onNews?: (news: NewsSentiment, context: MarketContext) => Promise<Signal[]>;
  onEconomicEvent?: (event: EconomicEvent, context: MarketContext) => Promise<Signal[]>;
  cleanup?: () => Promise<void>;
}

export interface StrategyParameter {
  name: string;
  type: 'number' | 'boolean' | 'string' | 'select';
  defaultValue: unknown;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  description: string;
}

export interface Signal {
  timestamp: number;
  symbol: string;
  direction: 'BUY' | 'SELL' | 'HOLD';
  strength: number; // 0 to 1
  confidence: number; // 0 to 1
  price: number;
  stopLoss?: number;
  takeProfit?: number;
  reasoning: string;
  metadata?: Record<string, unknown>;
}

// === Performance Metrics ===

export interface PerformanceMetrics {
  // Return Metrics
  totalReturn: number;
  annualizedReturn: number;
  cumulativeReturn: number;
  rollingReturns: number[];

  // Risk Metrics
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  maxDrawdown: number;
  maxDrawdownDuration: number;
  valueAtRisk: number;
  conditionalValueAtRisk: number;

  // Trade Metrics
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  averageTrade: number;

  // Advanced Metrics
  rachevRatio: number;
  informationRatio: number;
  treynorRatio?: number;
  jensenAlpha?: number;
  beta?: number;

  // Benchmark Comparison
  benchmarkReturn?: number;
  trackingError?: number;
  informationCoefficient?: number;
  outperformanceFrequency?: number;

  // Regime Analysis
  regimePerformance: Record<MarketRegime, {
    return: number;
    volatility: number;
    sharpeRatio: number;
    maxDrawdown: number;
    trades: number;
    winRate: number;
  }>;
}

export interface RollingMetrics {
  window: number;
  metrics: {
    timestamp: number;
    return: number;
    volatility: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
  }[];
}

// === Backtest Results ===

export interface BacktestResult {
  id: string;
  strategy: Strategy;
  config: BacktestConfig;
  metrics: PerformanceMetrics;
  rollingMetrics: RollingMetrics;
  trades: Trade[];
  equity: {
    timestamp: number;
    value: number;
    returns: number;
    drawdown: number;
  }[];
  positions: Position[];
  orders: Order[];
  signals: Signal[];
  benchmark?: {
    equity: { timestamp: number; value: number }[];
    metrics: Partial<PerformanceMetrics>;
  };
  regimeAnalysis: {
    regimes: MarketRegime[];
    performance: Record<MarketRegime, PerformanceMetrics>;
  };
  metadata: {
    startTime: Date;
    endTime: Date;
    processingTime: number;
    dataPoints: number;
    memoryUsage: number;
    warnings: string[];
  };
}

// === Walk-Forward Results ===

export interface WalkForwardResult {
  id: string;
  strategy: Strategy;
  config: BacktestConfig;
  windows: WalkForwardWindow[];
  aggregateMetrics: PerformanceMetrics;
  parameterEvolution: {
    parameter: string;
    values: number[];
    timestamps: number[];
  }[];
  stabilityAnalysis: {
    parameterStability: number;
    performanceStability: number;
    regimeAdaptation: number;
  };
}

export interface WalkForwardWindow {
  windowId: number;
  trainStart: Date;
  trainEnd: Date;
  testStart: Date;
  testEnd: Date;
  trainMetrics: PerformanceMetrics;
  testMetrics: PerformanceMetrics;
  parameters: Record<string, unknown>;
  trades: Trade[];
  equity: { timestamp: number; value: number }[];
}

// === Strategy Comparison ===

export interface StrategyComparison {
  id: string;
  name: string;
  strategies: {
    strategy: Strategy;
    result: BacktestResult;
    rank: number;
  }[];
  comparisonMetrics: {
    metric: keyof PerformanceMetrics;
    weights: number[];
    scores: number[];
  }[];
  bestStrategy: {
    strategy: Strategy;
    score: number;
    reasons: string[];
  };
  recommendation: string;
}

// === Optimization Results ===

export interface OptimizationResult {
  id: string;
  strategy: Strategy;
  config: BacktestConfig;
  parameters: StrategyParameter[];
  results: OptimizationRun[];
  bestParameters: Record<string, unknown>;
  bestMetrics: PerformanceMetrics;
  convergence: {
    iterations: number;
    bestScore: number;
    convergenceRate: number;
  };
  sensitivity: {
    parameter: string;
    importance: number;
    optimalRange: [number, number];
  }[];
}

export interface OptimizationRun {
  id: string;
  parameters: Record<string, unknown>;
  metrics: PerformanceMetrics;
  score: number;
  iteration: number;
}

// === Data Provider Interface ===

export interface DataProvider {
  name: string;
  getOHLCV: (symbol: string, timeframe: string, start: Date, end: Date) => Promise<OHLCVData[]>;
  getNewsSentiment: (symbols: string[], start: Date, end: Date) => Promise<NewsSentiment[]>;
  getEconomicEvents: (currency: string, start: Date, end: Date) => Promise<EconomicEvent[]>;
  getMarketContext: (timestamp: number, symbol: string) => Promise<MarketContext>;
}

// === Backtesting Engine Interface ===

export interface BacktestEngine {
  runBacktest: (strategy: Strategy, config: BacktestConfig) => Promise<BacktestResult>;
  runWalkForward: (strategy: Strategy, config: BacktestConfig) => Promise<WalkForwardResult>;
  optimizeParameters: (
    strategy: Strategy,
    config: BacktestConfig,
    optimizationConfig: OptimizationConfig
  ) => Promise<OptimizationResult>;
  compareStrategies: (
    strategies: Strategy[],
    config: BacktestConfig,
    comparisonConfig: ComparisonConfig
  ) => Promise<StrategyComparison>;
}

export interface OptimizationConfig {
  method: 'grid' | 'random' | 'bayesian' | 'genetic';
  iterations: number;
  objective: keyof PerformanceMetrics | ((metrics: PerformanceMetrics) => number);
  constraints: {
    maxDrawdown?: number;
    minSharpeRatio?: number;
    minTrades?: number;
  };
  parallel: boolean;
}

export interface ComparisonConfig {
  metrics: (keyof PerformanceMetrics)[];
  weights: number[];
  benchmark: boolean;
  statisticalTest: boolean;
  regimeAnalysis: boolean;
}

// === Event Types ===

export interface BacktestEvent {
  timestamp: number;
  type: 'trade' | 'signal' | 'position' | 'order' | 'metric' | 'error' | 'warning';
  data: unknown;
  metadata?: Record<string, unknown>;
}

export interface BacktestProgress {
  current: number;
  total: number;
  percentage: number;
  stage: string;
  estimatedTimeRemaining: number;
  currentWindow?: number;
  totalWindows?: number;
}

// === Error Types ===

export class BacktestError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'BacktestError';
  }
}

export class DataError extends BacktestError {
  constructor(message: string, details?: unknown) {
    super(message, 'DATA_ERROR', details);
    this.name = 'DataError';
  }
}

export class StrategyError extends BacktestError {
  constructor(message: string, details?: unknown) {
    super(message, 'STRATEGY_ERROR', details);
    this.name = 'StrategyError';
  }
}

export class OptimizationError extends BacktestError {
  constructor(message: string, details?: unknown) {
    super(message, 'OPTIMIZATION_ERROR', details);
    this.name = 'OptimizationError';
  }
}

export class ConfigurationError extends BacktestError {
  constructor(message: string, details?: unknown) {
    super(message, 'CONFIGURATION_ERROR', details);
    this.name = 'ConfigurationError';
  }
}

// === Utility Types ===

export type TimeFrame = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w' | '1M';
export type MarketRegimeType = MarketRegime;
export type SignalDirection = 'BUY' | 'SELL' | 'HOLD';
export type OptimizationMethod = 'grid' | 'random' | 'bayesian' | 'genetic';
export type CommissionType = 'percentage' | 'fixed' | 'tiered';
export type SlippageType = 'percentage' | 'fixed' | 'adaptive';

export interface DataRange {
  start: Date;
  end: Date;
}

export interface ParameterSpace {
  [key: string]: {
    min: number;
    max: number;
    step: number;
    type: 'continuous' | 'discrete';
  };
}

export interface TradeDistribution {
  winRate: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  averageHoldingPeriod: number;
  medianHoldingPeriod: number;
}

export interface DrawdownAnalysis {
  maxDrawdown: number;
  maxDrawdownDuration: number;
  averageDrawdown: number;
  recoveryTime: number;
  drawdownPeriods: {
    start: Date;
    end: Date;
    depth: number;
    duration: number;
  }[];
}

// === Export All Types ===

export type {
  OHLCVData,
  NewsSentiment,
  EconomicEvent,
  MarketContext,
  BacktestConfig,
  Strategy,
  StrategyParameter,
  Signal,
  PerformanceMetrics,
  RollingMetrics,
  BacktestResult,
  WalkForwardResult,
  WalkForwardWindow,
  StrategyComparison,
  OptimizationResult,
  OptimizationRun,
  DataProvider,
  BacktestEngine,
  OptimizationConfig,
  ComparisonConfig,
  BacktestEvent,
  BacktestProgress,
  DataRange,
  ParameterSpace,
  TradeDistribution,
  DrawdownAnalysis
};