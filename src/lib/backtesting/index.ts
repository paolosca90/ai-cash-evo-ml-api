// @ts-nocheck
/**
 * FinRL-Style Backtesting Framework
 *
 * Comprehensive backtesting framework for evaluating trading strategies with
 * walk-forward validation, performance metrics, and strategy comparison capabilities.
 * Based on FinRL patterns and quantitative finance best practices.
 *
 * Main export file for easy integration with the existing trading system.
 */

// === Core Types and Interfaces ===
export * from '../../types/backtesting';

import { BacktestEngine } from './BacktestEngine';
import { MetricsCalculator } from './MetricsCalculator';
import { StrategyEvaluator } from './StrategyEvaluator';
import { DataIntegration, createDataIntegration } from './DataIntegration';
import {
  MovingAverageStrategy,
  createMovingAverageStrategy,
  createMovingAverageStrategyWithParams
} from './strategies/MovingAverageStrategy';
import { DataProvider } from '../../types/backtesting';
import { BacktestConfig, Strategy, PerformanceMetrics, Signal } from '../../types/backtesting';
import type { AISignal } from '../../types/trading';

// === Core Components ===
export { BacktestEngine } from './BacktestEngine';
export { MetricsCalculator } from './MetricsCalculator';
export { StrategyEvaluator } from './StrategyEvaluator';
export { DataIntegration, createDataIntegration } from './DataIntegration';

// === React Integration ===
export { useBacktesting } from '../../hooks/useBacktesting';
export { BacktestingDashboard } from '../../components/backtesting/BacktestingDashboard';

// === Strategy Implementations ===
export {
  MovingAverageStrategy,
  createMovingAverageStrategy,
  createMovingAverageStrategyWithParams
} from './strategies/MovingAverageStrategy';

// === Constants and Default Configurations ===

export const DEFAULT_BACKTEST_CONFIG = {
  name: 'Default Backtest',
  description: 'Default backtest configuration',
  symbols: ['BTC/USDT'],
  timeframes: ['1d'],
  startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
  endDate: new Date(),
  initialCapital: 10000,
  baseCurrency: 'USD',
  leverage: 1,
  commission: {
    type: 'percentage' as const,
    value: 0.001,
    currency: 'USD'
  },
  slippage: {
    type: 'percentage' as const,
    value: 0.0005
  },
  riskManagement: {
    maxPositionSize: 0.1,
    maxDrawdown: 0.2,
    maxDailyLoss: 0.05,
    stopLoss: 0.02,
    takeProfit: 0.04
  },
  walkForward: {
    enabled: false,
    windowSize: 180,
    stepSize: 30,
    testSize: 60
  }
};

export const DEFAULT_OPTIMIZATION_CONFIG = {
  method: 'grid' as const,
  iterations: 100,
  objective: 'sharpeRatio' as const,
  constraints: {
    maxDrawdown: 0.2,
    minSharpeRatio: 0.5,
    minTrades: 20
  },
  parallel: false
};

export const DEFAULT_COMPARISON_CONFIG = {
  metrics: ['sharpeRatio', 'sortinoRatio', 'calmarRatio', 'winRate', 'maxDrawdown'] as const,
  weights: [0.3, 0.2, 0.2, 0.15, 0.15],
  benchmark: true,
  statisticalTest: true,
  regimeAnalysis: true
};

export const SUPPORTED_TIMEFRAMES = [
  '1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'
] as const;

export const SUPPORTED_OPTIMIZATION_METHODS = [
  'grid', 'random', 'bayesian', 'genetic'
] as const;

export const PERFORMANCE_METRICS_CATEGORIES = {
  RETURNS: [
    'totalReturn',
    'annualizedReturn',
    'cumulativeReturn',
    'rollingReturns'
  ],
  RISK: [
    'volatility',
    'sharpeRatio',
    'sortinoRatio',
    'calmarRatio',
    'maxDrawdown',
    'maxDrawdownDuration',
    'valueAtRisk',
    'conditionalValueAtRisk'
  ],
  TRADING: [
    'totalTrades',
    'winningTrades',
    'losingTrades',
    'winRate',
    'averageWin',
    'averageLoss',
    'profitFactor',
    'averageTrade'
  ],
  ADVANCED: [
    'rachevRatio',
    'informationRatio',
    'treynorRatio',
    'jensenAlpha',
    'beta'
  ],
  BENCHMARK: [
    'benchmarkReturn',
    'trackingError',
    'informationCoefficient',
    'outperformanceFrequency'
  ]
};

// === Factory Functions ===

export function createBacktestEngine(dataProvider: DataProvider) {
  return new BacktestEngine(dataProvider);
}

export function createMetricsCalculator(
  riskFreeRate: number = 0.02,
  tradingDaysPerYear: number = 252,
  confidenceLevel: number = 0.95
) {
  return new MetricsCalculator(riskFreeRate, tradingDaysPerYear, confidenceLevel);
}

export function createStrategyEvaluator(
  backtestEngine: BacktestEngine,
  metricsCalculator: MetricsCalculator
) {
  return new StrategyEvaluator(backtestEngine, metricsCalculator);
}

export function createDataIntegrationWrapper(config: BacktestConfig) {
  return createDataIntegration(config);
}

// === Strategy Factory Functions ===

export function createStrategy(type: string, params?: Record<string, unknown>): Strategy {
  switch (type.toLowerCase()) {
    case 'moving_average':
    case 'ma':
    case 'sma':
      if (params) {
        return createMovingAverageStrategyWithParams(params as Record<string, number>);
      }
      return new MovingAverageStrategy();

    default:
      throw new Error(`Unknown strategy type: ${type}`);
  }
}

// === Utility Functions ===

export function validateBacktestConfig(config: unknown): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config || typeof config !== 'object') {
    errors.push('Configuration must be an object');
    return { isValid: false, errors };
  }

  const configObj = config as Record<string, unknown>;

  // Required fields
  if (!configObj.name || typeof configObj.name !== 'string') {
    errors.push('Configuration must have a valid name');
  }

  if (!configObj.symbols || !Array.isArray(configObj.symbols) || (configObj.symbols as unknown[]).length === 0) {
    errors.push('Configuration must include at least one symbol');
  }

  if (!configObj.timeframes || !Array.isArray(configObj.timeframes) || (configObj.timeframes as unknown[]).length === 0) {
    errors.push('Configuration must include at least one timeframe');
  }

  if (!configObj.startDate || !(configObj.startDate instanceof Date)) {
    errors.push('Configuration must have a valid start date');
  }

  if (!configObj.endDate || !(configObj.endDate instanceof Date)) {
    errors.push('Configuration must have a valid end date');
  }

  // Date validation
  if (configObj.startDate && configObj.endDate && configObj.startDate >= configObj.endDate) {
    errors.push('Start date must be before end date');
  }

  // Financial validation
  if (typeof configObj.initialCapital !== 'number' || (configObj.initialCapital as number) <= 0) {
    errors.push('Initial capital must be a positive number');
  }

  if (typeof configObj.leverage !== 'number' || (configObj.leverage as number) <= 0) {
    errors.push('Leverage must be a positive number');
  }

  // Commission validation
  const commission = configObj.commission as Record<string, unknown>;
  if (!commission || !['percentage', 'fixed', 'tiered'].includes(commission.type as string)) {
    errors.push('Commission type must be percentage, fixed, or tiered');
  }

  if (typeof commission.value !== 'number' || (commission.value as number) < 0) {
    errors.push('Commission value must be a non-negative number');
  }

  // Slippage validation
  const slippage = configObj.slippage as Record<string, unknown>;
  if (!slippage || !['percentage', 'fixed', 'adaptive'].includes(slippage.type as string)) {
    errors.push('Slippage type must be percentage, fixed, or adaptive');
  }

  if (typeof slippage.value !== 'number' || (slippage.value as number) < 0) {
    errors.push('Slippage value must be a non-negative number');
  }

  // Risk management validation
  const riskManagement = configObj.riskManagement as Record<string, unknown>;
  if (!riskManagement) {
    errors.push('Risk management configuration is required');
  } else {
    if (typeof riskManagement.maxPositionSize !== 'number' || (riskManagement.maxPositionSize as number) <= 0) {
      errors.push('Max position size must be a positive number');
    }

    if (typeof riskManagement.maxDrawdown !== 'number' || (riskManagement.maxDrawdown as number) <= 0) {
      errors.push('Max drawdown must be a positive number');
    }

    if (typeof riskManagement.maxDailyLoss !== 'number' || (riskManagement.maxDailyLoss as number) <= 0) {
      errors.push('Max daily loss must be a positive number');
    }
  }

  // Walk-forward validation
  const walkForward = configObj.walkForward as Record<string, unknown>;
  if (walkForward && (walkForward.enabled as boolean)) {
    if (!walkForward.windowSize || (walkForward.windowSize as number) <= 0) {
      errors.push('Walk-forward window size must be a positive number');
    }

    if (!walkForward.stepSize || (walkForward.stepSize as number) <= 0) {
      errors.push('Walk-forward step size must be a positive number');
    }

    if (!walkForward.testSize || (walkForward.testSize as number) <= 0) {
      errors.push('Walk-forward test size must be a positive number');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function calculatePerformanceScore(metrics: PerformanceMetrics): number {
  // Calculate a comprehensive performance score (0-100)
  const weights = {
    sharpeRatio: 0.25,
    sortinoRatio: 0.2,
    calmarRatio: 0.15,
    profitFactor: 0.15,
    winRate: 0.15,
    maxDrawdown: 0.1
  };

  const normalizedSharpe = Math.min(2, Math.max(0, metrics.sharpeRatio)) / 2;
  const normalizedSortino = Math.min(2, Math.max(0, metrics.sortinoRatio)) / 2;
  const normalizedCalmar = Math.min(3, Math.max(0, metrics.calmarRatio)) / 3;
  const normalizedProfitFactor = Math.min(3, Math.max(0, metrics.profitFactor)) / 3;
  const normalizedWinRate = metrics.winRate;
  const normalizedDrawdown = Math.max(0, 1 - Math.abs(metrics.maxDrawdown));

  const score =
    normalizedSharpe * weights.sharpeRatio +
    normalizedSortino * weights.sortinoRatio +
    normalizedCalmar * weights.calmarRatio +
    normalizedProfitFactor * weights.profitFactor +
    normalizedWinRate * weights.winRate +
    normalizedDrawdown * weights.maxDrawdown;

  return Math.round(score * 100);
}

export function formatMetric(value: number, metric: string): string {
  switch (metric) {
    case 'totalReturn':
    case 'annualizedReturn':
    case 'cumulativeReturn':
    case 'averageWin':
    case 'averageLoss':
    case 'averageTrade':
    case 'maxDrawdown':
    case 'valueAtRisk':
    case 'conditionalValueAtRisk':
    case 'benchmarkReturn':
    case 'trackingError':
      return `${(value * 100).toFixed(2)}%`;

    case 'sharpeRatio':
    case 'sortinoRatio':
    case 'calmarRatio':
    case 'rachevRatio':
    case 'informationRatio':
    case 'treynorRatio':
    case 'jensenAlpha':
    case 'beta':
    case 'profitFactor':
      return value.toFixed(2);

    case 'winRate':
    case 'outperformanceFrequency':
      return `${(value * 100).toFixed(1)}%`;

    case 'volatility':
      return `${(value * 100).toFixed(1)}%`;

    case 'maxDrawdownDuration':
      return `${Math.round(value)} days`;

    case 'totalTrades':
    case 'winningTrades':
    case 'losingTrades':
      return value.toString();

    default:
      return value.toString();
  }
}

export function generateBacktestId(): string {
  return `bt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// === Migration and Compatibility ===

export function migrateFromAISignals(aiSignal: AISignal): Signal {
  // Convert existing AI signal format to backtesting framework format
  return {
    timestamp: aiSignal.timestamp || Date.now(),
    symbol: aiSignal.symbol || 'BTC/USDT',
    direction: aiSignal.type === 'BUY' ? 'BUY' : aiSignal.type === 'SELL' ? 'SELL' : 'HOLD',
    strength: (aiSignal.confidence || 50) / 100,
    confidence: (aiSignal.confidence || 50) / 100,
    price: aiSignal.price || 0,
    stopLoss: aiSignal.stopLoss,
    takeProfit: aiSignal.takeProfit,
    reasoning: aiSignal.reason || 'Migrated from AI Signal',
    metadata: {
      source: 'AI_Signals_Migration',
      originalSignal: aiSignal
    }
  };
}

// === Error Handling ===

export class BacktestingError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'BacktestingError';
  }
}

export class ValidationError extends BacktestingError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class DataError extends BacktestingError {
  constructor(message: string, details?: unknown) {
    super(message, 'DATA_ERROR', details);
    this.name = 'DataError';
  }
}

export class StrategyError extends BacktestingError {
  constructor(message: string, details?: unknown) {
    super(message, 'STRATEGY_ERROR', details);
    this.name = 'StrategyError';
  }
}

// === Version Information ===

export const BACKTESTING_FRAMEWORK_VERSION = '1.0.0';
export const BACKTESTING_FRAMEWORK_COMPATIBILITY = '^1.0.0';

// === Export Everything for Easy Import ===

// Core classes and functions
export {
  // Classes are already exported above
  validateBacktestConfig,
  calculatePerformanceScore,
  formatMetric,
  generateBacktestId,
  migrateFromAISignals,
  createBacktestEngine,
  createMetricsCalculator,
  createStrategyEvaluator,
  createDataIntegration,
  createStrategy
};

// Error classes
export {
  BacktestingError,
  ValidationError,
  DataError,
  StrategyError
};

// Version info
export {
  BACKTESTING_FRAMEWORK_VERSION,
  BACKTESTING_FRAMEWORK_COMPATIBILITY
};