// @ts-nocheck
/**
 * Risk Management Module
 *
 * Comprehensive risk management system for professional trading
 * with ATR-based stop loss, take profit calculations, and position sizing.
 */

// Main service
export { riskManagementService, RiskManagementService } from './RiskManagementService';
export type {
  RiskManagementInput,
  RiskManagementSettings
} from './RiskManagementService';

// Core calculators
export { atrStopLossCalculator, ATRStopLossCalculator } from './ATRStopLossCalculator';
export { simplifiedATRCalculator, SimplifiedATRCalculator } from './SimplifiedATRCalculator';
export { takeProfitCalculator, TakeProfitCalculator } from './TakeProfitCalculator';
export { lotSizeCalculator, LotSizeCalculator } from './LotSizeCalculator';

// Calculator types
export type {
  ATRStopLossConfig,
  MarketDataPoint
} from './ATRStopLossCalculator';

export type {
  MLOptimizedATRConfig,
  MarketConditions,
  ATROptimizationData,
  ATROptimizationResult
} from './SimplifiedATRCalculator';

export type {
  TakeProfitConfig,
  MarketCondition
} from './TakeProfitCalculator';

export type {
  LotSizeConfig,
  RiskCalculationInput
} from './LotSizeCalculator';

// Type exports
export * from '@/types/risk-management';

// Re-export commonly used types
export type {
  RiskManagementResult,
  StopLossCalculation,
  TakeProfitCalculation,
  PositionSizeCalculation,
  RiskMetrics,
  RiskValidation,
  PortfolioRisk,
  AccountInfo,
  SymbolSpecs,
  MarketData,
  MarketStructure,
  RiskAlert,
  RiskSettings
} from '@/types/risk-management';

// Utility functions
export {
  isRiskManagementResult,
  isValidTradeDirection,
  isValidTimeframe,
  isAcceptableRisk,
  hasValidRiskReward
} from '@/types/risk-management';

// Default configurations
export const DEFAULT_RISK_CONFIG = {
  maxRiskPerTrade: 2.0,
  maxPortfolioRisk: 6.0,
  minRiskRewardRatio: 1.5,
  defaultRiskRewardRatio: 2.0,
  maxPositions: 10,
  correlationThreshold: 0.7,
  trailingStop: false,
  partialExits: true
};

// ATR Configuration
export const DEFAULT_ATR_CONFIG = {
  timeframes: ['M15', 'H1', 'H4'],
  weights: {
    M15: 0.2, M1: 0.1, M5: 0.15, H1: 0.3, H4: 0.25, D1: 0.2, W1: 0.1, MN1: 0.05
  },
  smoothingPeriod: 14,
  minATRMultiplier: 0.5,
  maxATRMultiplier: 3.0,
  defaultATRMultiplier: 1.0,
  useMultiTimeframe: true,
  adjustForMarketStructure: true,
  adjustForVolatility: true,
  volatilityThreshold: 0.02
};

// Simplified ATR Configuration (ML-Optimized)
export const DEFAULT_SIMPLIFIED_ATR_CONFIG = {
  atrPeriod: 14,
  baseCoefficient: 1.0,
  coefficients: {
    neutral: 1.0,        // Condizioni normali
    highVolatility: 1.5, // +50% in alta volatilità
    lowVolatility: 0.7,  // -30% in bassa volatilità
    trending: 0.9,       // -10% in trend (stop più stretti)
    ranging: 1.2,        // +20% in ranging (stop più ampi)
    newsImpact: 2.0      // +100% durante news
  },
  minCoefficient: 0.5,
  maxCoefficient: 3.0,
  learningRate: 0.01,
  minStopDistance: 0.001, // 0.1%
  maxStopDistance: 0.05   // 5%
};

// Take Profit Configuration
export const DEFAULT_TAKE_PROFIT_CONFIG = {
  minRiskRewardRatio: 1.5,
  defaultRiskRewardRatio: 2.0,
  maxRiskRewardRatio: 5.0,
  useMultipleLevels: true,
  partialExitLevels: [1.0, 2.0, 3.0],
  partialExitPercentages: [0.3, 0.4, 0.3],
  adjustForMarketStructure: true,
  adjustForVolatility: true,
  adjustForTimeOfDay: true,
  considerLiquidity: true,
  extendTrendingMarkets: true,
  reduceRangingMarkets: true
};

// Lot Size Configuration
export const DEFAULT_LOT_SIZE_CONFIG = {
  maxRiskPerTrade: 2.0,
  maxPortfolioRisk: 6.0,
  maxAccountRisk: 10.0,
  defaultRiskCurrency: 'EUR',
  useCompounding: true,
  considerCorrelation: 0.7,
  maxPositions: 10,
  useKellyCriterion: false,
  kellyFraction: 0.25,
  volatilityAdjustment: true,
  drawdownProtection: true,
  maxDrawdown: 20.0,
  scalingEnabled: true,
  scalingThresholds: [5000, 10000, 25000, 50000, 100000],
  scalingMultipliers: [1.0, 0.9, 0.8, 0.7, 0.6]
};

// Helper functions for common use cases

/**
 * Quick risk calculation for basic usage
 */
export async function calculateQuickRisk(
  symbol: string,
  direction: 'BUY' | 'SELL',
  entryPrice: number,
  accountBalance: number,
  atrValue: number,
  riskPercentage: number = 2.0
) {
  const accountInfo: AccountInfo = {
    balance: accountBalance,
    equity: accountBalance,
    margin: 0,
    freeMargin: accountBalance,
    marginLevel: 100,
    currency: 'EUR',
    leverage: 100,
    hedgingAllowed: false
  };

  const symbolSpecs: SymbolSpecs = {
    symbol,
    digits: 4,
    point: 0.0001,
    tickSize: 0.0001,
    tickValue: 10,
    minLot: 0.01,
    maxLot: 100,
    lotStep: 0.01,
    contractSize: 100000,
    currency: 'USD',
    profitCurrency: 'EUR',
    marginCurrency: 'EUR'
  };

  const marketData: MarketData = {
    symbol,
    bid: entryPrice,
    ask: entryPrice + 0.0001,
    spread: 0.0001,
    volume: 1000,
    timeframe: 'H1',
    timestamp: new Date(),
    atrData: [{
      timeframe: 'H1',
      value: atrValue,
      timestamp: new Date()
    }],
    marketStructure: {
      supportLevels: [],
      resistanceLevels: [],
      trend: 'sideways',
      volatility: 'medium'
    }
  };

  return await riskManagementService.calculateTradeRisk({
    symbol,
    direction,
    entryPrice,
    accountInfo,
    symbolSpecs,
    marketData,
    riskAmount: (accountBalance * riskPercentage) / 100
  });
}

/**
 * Validate risk parameters before trade execution
 */
export function validateRiskParameters(
  riskAmount: number,
  accountBalance: number,
  stopLossPips: number,
  maxRiskPercentage: number = 2.0
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check risk amount
  if (riskAmount <= 0) {
    errors.push('Risk amount must be positive');
  }

  // Check risk percentage
  const riskPercentage = (riskAmount / accountBalance) * 100;
  if (riskPercentage > maxRiskPercentage) {
    errors.push(`Risk percentage ${riskPercentage.toFixed(2)}% exceeds maximum ${maxRiskPercentage}%`);
  }

  // Check stop loss distance
  if (stopLossPips <= 0) {
    errors.push('Stop loss distance must be positive');
  }

  // Check account balance
  if (accountBalance <= 0) {
    errors.push('Account balance must be positive');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Calculate position size using simplified method
 */
export function calculateSimplePositionSize(
  accountBalance: number,
  riskPercentage: number,
  stopLossPips: number,
  pipValue: number = 10
): number {
  const riskAmount = (accountBalance * riskPercentage) / 100;
  const lotSize = riskAmount / (stopLossPips * pipValue);

  // Round to 2 decimal places
  return Math.round(lotSize * 100) / 100;
}

/**
 * Calculate risk-reward ratio
 */
export function calculateRiskRewardRatio(
  entryPrice: number,
  stopLoss: number,
  takeProfit: number,
  direction: 'BUY' | 'SELL'
): number {
  const risk = Math.abs(entryPrice - stopLoss);
  const reward = Math.abs(takeProfit - entryPrice);

  return reward / risk;
}

/**
 * Quick risk calculation using simplified ATR system
 */
export function calculateQuickRiskSimplified(
  entryPrice: number,
  direction: 'BUY' | 'SELL',
  m15Candles: Array<{high: number; low: number; close: number; volume?: number}>,
  riskPercentage: number = 2.0,
  accountBalance: number = 10000
) {
  // Calculate stop loss using simplified ATR
  const stopLossResult = simplifiedATRCalculator.calculateStopLoss(
    entryPrice,
    direction,
    m15Candles
  );

  // Calculate take profit with 2:1 RR
  const takeProfitResult = simplifiedATRCalculator.calculateTakeProfit(
    entryPrice,
    stopLossResult.stopLoss,
    direction,
    2.0
  );

  // Calculate position size
  const riskAmount = (accountBalance * riskPercentage) / 100;
  const stopDistance = Math.abs(entryPrice - stopLossResult.stopLoss);
  const pipValue = 10; // Standard for major pairs
  const positionSize = riskAmount / (stopDistance * 10000 * pipValue);

  return {
    entryPrice,
    stopLoss: stopLossResult.stopLoss,
    takeProfit: takeProfitResult.takeProfit,
    atr: stopLossResult.atr,
    coefficient: stopLossResult.coefficient,
    riskReward: takeProfitResult.riskReward,
    positionSize: Math.max(0.01, Math.round(positionSize * 100) / 100),
    riskAmount,
    riskPercentage,
    reasoning: {
      stopLoss: stopLossResult.reasoning,
      takeProfit: takeProfitResult.reasoning
    },
    marketConditions: stopLossResult.marketConditions
  };
}

/**
 * Generate risk assessment summary
 */
export function generateRiskSummary(result: RiskManagementResult): {
  overall: 'low' | 'medium' | 'high' | 'extreme';
  keyPoints: string[];
  recommendations: string[];
  riskScore: number;
} {
  const { riskMetrics, validation, stopLoss, takeProfit, positionSize } = result;

  // Calculate risk score (0-100)
  const riskScore = Math.min(
    (riskMetrics.riskPercentage / 5) * 100 + // Risk percentage weight
    (validation.riskLevel === 'extreme' ? 40 :
     validation.riskLevel === 'high' ? 30 :
     validation.riskLevel === 'medium' ? 20 : 10) + // Risk level weight
    (riskMetrics.riskRewardRatio < 1.5 ? 20 :
     riskMetrics.riskRewardRatio < 2.0 ? 10 : 0), // RR ratio weight
    100
  );

  // Determine overall risk level
  let overall: 'low' | 'medium' | 'high' | 'extreme' = 'low';
  if (riskScore > 75) overall = 'extreme';
  else if (riskScore > 50) overall = 'high';
  else if (riskScore > 25) overall = 'medium';

  // Generate key points
  const keyPoints = [
    `Risk: ${riskMetrics.riskPercentage.toFixed(2)}% of account`,
    `Stop Loss: ${stopLoss.pips.toFixed(1)} pips (${stopLoss.atrMultiplier.toFixed(1)}x ATR)`,
    `Take Profit: ${takeProfit.averageRiskReward.toFixed(2)}:1 average RR ratio`,
    `Position Size: ${positionSize.lotSize} lots`
  ];

  if (validation.warnings.length > 0) {
    keyPoints.push(`Warnings: ${validation.warnings.length}`);
  }

  return {
    overall,
    keyPoints,
    recommendations: result.recommendations,
    riskScore
  };
}

// Version information
export const RISK_MANAGEMENT_VERSION = '1.0.0';
export const BUILD_DATE = new Date().toISOString();

/**
 * Risk Management System
 *
 * Features:
 * - ATR-based stop loss calculation with multi-timeframe analysis
 * - Take profit calculation with risk-reward ratio validation
 * - Advanced position sizing with portfolio risk management
 * - Real-time risk monitoring and alerts
 * - Market structure and volatility adjustments
 * - Professional trading risk standards
 *
 * @example
 * ```typescript
 * import { riskManagementService, calculateQuickRisk } from './lib/risk-management';
 *
 * // Quick calculation
 * const result = await calculateQuickRisk('EURUSD', 'BUY', 1.1000, 10000, 0.0010);
 *
 * // Advanced calculation
 * const detailed = await riskManagementService.calculateTradeRisk({
 *   symbol: 'EURUSD',
 *   direction: 'BUY',
 *   entryPrice: 1.1000,
 *   accountInfo,
 *   symbolSpecs,
 *   marketData,
 *   riskAmount: 200
 * });
 *
 * // Check if trade is allowed
 * const allowed = riskManagementService.isTradeAllowed('EURUSD', accountInfo, positions, portfolioRisk);
 * ```
 */