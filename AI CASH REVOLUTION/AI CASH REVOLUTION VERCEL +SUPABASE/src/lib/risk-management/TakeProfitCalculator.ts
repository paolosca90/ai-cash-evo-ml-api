/**
 * Take Profit Calculator
 *
 * Advanced take profit calculation with risk-reward ratio validation,
 * multiple exit levels, and market condition adjustments.
 */

import { TakeProfitCalculation, TakeProfitLevel, MarketStructure, StopLossCalculation } from '@/types/risk-management';

export interface TakeProfitConfig {
  minRiskRewardRatio: number;
  defaultRiskRewardRatio: number;
  maxRiskRewardRatio: number;
  useMultipleLevels: boolean;
  partialExitLevels: number[];
  partialExitPercentages: number[];
  adjustForMarketStructure: boolean;
  adjustForVolatility: boolean;
  adjustForTimeOfDay: boolean;
  considerLiquidity: boolean;
  extendTrendingMarkets: boolean;
  reduceRangingMarkets: boolean;
}

export interface MarketCondition {
  volatility: 'low' | 'medium' | 'high';
  trend: 'strong' | 'moderate' | 'weak' | 'none';
  session: 'asia' | 'london' | 'new_york' | 'overlap';
  liquidity: 'high' | 'medium' | 'low';
  economicImpact: 'low' | 'medium' | 'high';
}

export class TakeProfitCalculator {
  private config: TakeProfitConfig;

  constructor(config: Partial<TakeProfitConfig> = {}) {
    this.config = {
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
      reduceRangingMarkets: true,
      ...config
    };
  }

  /**
   * Calculate take profit levels based on risk-reward ratio
   */
  calculateTakeProfit(
    entryPrice: number,
    direction: 'BUY' | 'SELL',
    stopLoss: StopLossCalculation,
    riskRewardRatio: number = this.config.defaultRiskRewardRatio,
    marketStructure?: MarketStructure,
    marketCondition?: MarketCondition
  ): TakeProfitCalculation {
    // Validate inputs
    if (!entryPrice || entryPrice <= 0) {
      throw new Error('Invalid entry price');
    }

    if (!stopLoss || !stopLoss.price) {
      throw new Error('Invalid stop loss calculation');
    }

    // Calculate risk amount in pips
    const riskPips = stopLoss.pips;
    if (riskPips <= 0) {
      throw new Error('Invalid stop loss distance');
    }

    // Adjust risk-reward ratio based on market conditions
    const adjustedRiskRewardRatio = this.adjustRiskRewardRatio(
      riskRewardRatio,
      marketStructure,
      marketCondition
    );

    // Validate minimum risk-reward ratio
    const validatedRiskRewardRatio = Math.max(adjustedRiskRewardRatio, this.config.minRiskRewardRatio);

    // Calculate take profit levels
    const levels = this.config.useMultipleLevels
      ? this.calculateMultipleLevels(entryPrice, direction, riskPips, validatedRiskRewardRatio, marketStructure)
      : [this.calculateSingleLevel(entryPrice, direction, riskPips, validatedRiskRewardRatio)];

    // Calculate primary take profit (first level)
    const primaryTP = levels[0].price;

    // Calculate average risk-reward ratio
    const averageRiskReward = this.calculateAverageRiskReward(levels, riskPips);

    return {
      levels,
      primaryTP,
      averageRiskReward: averageRiskReward.average,
      minRiskReward: averageRiskReward.min,
      maxRiskReward: averageRiskReward.max,
      partialExitStrategy: this.config.useMultipleLevels && levels.length > 1
    };
  }

  /**
   * Adjust risk-reward ratio based on market conditions
   */
  private adjustRiskRewardRatio(
    baseRatio: number,
    marketStructure?: MarketStructure,
    marketCondition?: MarketCondition
  ): number {
    let adjustedRatio = baseRatio;

    // Adjust for market structure
    if (marketStructure && this.config.adjustForMarketStructure) {
      switch (marketStructure.trend) {
        case 'uptrend':
        case 'downtrend':
          if (this.config.extendTrendingMarkets) {
            adjustedRatio *= 1.2; // 20% higher RR in trending markets
          }
          break;
        case 'sideways':
          if (this.config.reduceRangingMarkets) {
            adjustedRatio *= 0.8; // 20% lower RR in ranging markets
          }
          break;
      }

      // Adjust for volatility
      switch (marketStructure.volatility) {
        case 'high':
          adjustedRatio *= 1.1; // Higher RR for high volatility
          break;
        case 'low':
          adjustedRatio *= 0.9; // Lower RR for low volatility
          break;
      }
    }

    // Adjust for market conditions
    if (marketCondition) {
      // Adjust for trend strength
      switch (marketCondition.trend) {
        case 'strong':
          adjustedRatio *= 1.3;
          break;
        case 'moderate':
          adjustedRatio *= 1.1;
          break;
        case 'weak':
          adjustedRatio *= 0.9;
          break;
        case 'none':
          adjustedRatio *= 0.8;
          break;
      }

      // Adjust for trading session
      if (this.config.adjustForTimeOfDay) {
        switch (marketCondition.session) {
          case 'overlap':
            adjustedRatio *= 1.2; // Higher RR during session overlaps
            break;
          case 'london':
          case 'new_york':
            adjustedRatio *= 1.1; // Slightly higher RR in major sessions
            break;
          case 'asia':
            adjustedRatio *= 0.95; // Slightly lower RR in Asian session
            break;
        }
      }

      // Adjust for liquidity
      if (this.config.considerLiquidity) {
        switch (marketCondition.liquidity) {
          case 'high':
            adjustedRatio *= 1.1;
            break;
          case 'low':
            adjustedRatio *= 0.9;
            break;
        }
      }

      // Adjust for economic events
      if (marketCondition.economicImpact === 'high') {
        adjustedRatio *= 0.8; // Lower RR during high impact events
      }
    }

    // Ensure ratio stays within bounds
    return Math.max(Math.min(adjustedRatio, this.config.maxRiskRewardRatio), this.config.minRiskRewardRatio);
  }

  /**
   * Calculate multiple take profit levels for partial exits
   */
  private calculateMultipleLevels(
    entryPrice: number,
    direction: 'BUY' | 'SELL',
    riskPips: number,
    riskRewardRatio: number,
    marketStructure?: MarketStructure
  ): TakeProfitLevel[] {
    const levels: TakeProfitLevel[] = [];

    for (let i = 0; i < this.config.partialExitLevels.length; i++) {
      const levelRR = this.config.partialExitLevels[i] * riskRewardRatio;
      const percentage = this.config.partialExitPercentages[i] || (1 / this.config.partialExitLevels.length);

      let tpPrice: number;
      const tpPips = riskPips * levelRR;

      if (direction === 'BUY') {
        tpPrice = entryPrice + (tpPips / 10000);
      } else {
        tpPrice = entryPrice - (tpPips / 10000);
      }

      // Adjust for market structure if enabled
      let finalTpPrice = tpPrice;
      let reason = `Level ${i + 1} - RR: ${levelRR.toFixed(2)}:1`;

      if (this.config.adjustForMarketStructure && marketStructure) {
        const adjustedPrice = this.adjustTPForMarketStructure(
          tpPrice,
          entryPrice,
          direction,
          marketStructure
        );

        if (adjustedPrice !== tpPrice) {
          finalTpPrice = adjustedPrice;
          reason += ' (adjusted for market structure)';
        }
      }

      levels.push({
        level: i + 1,
        price: finalTpPrice,
        pips: tpPips,
        riskRewardRatio: levelRR,
        percentageOfPosition: percentage,
        reason
      });
    }

    return levels;
  }

  /**
   * Calculate single take profit level
   */
  private calculateSingleLevel(
    entryPrice: number,
    direction: 'BUY' | 'SELL',
    riskPips: number,
    riskRewardRatio: number
  ): TakeProfitLevel {
    const tpPips = riskPips * riskRewardRatio;
    let tpPrice: number;

    if (direction === 'BUY') {
      tpPrice = entryPrice + (tpPips / 10000);
    } else {
      tpPrice = entryPrice - (tpPips / 10000);
    }

    return {
      level: 1,
      price: tpPrice,
      pips: tpPips,
      riskRewardRatio,
      percentageOfPosition: 1.0,
      reason: `Primary TP - RR: ${riskRewardRatio.toFixed(2)}:1`
    };
  }

  /**
   * Adjust take profit price based on market structure
   */
  private adjustTPForMarketStructure(
    tpPrice: number,
    entryPrice: number,
    direction: 'BUY' | 'SELL',
    marketStructure: MarketStructure
  ): number {
    let adjustedPrice = tpPrice;

    if (direction === 'BUY') {
      // For long positions, check nearby resistance levels
      const nearbyResistance = marketStructure.resistanceLevels
        .filter(level => level > entryPrice)
        .sort((a, b) => a - b)[0]; // Lowest resistance above entry

      if (nearbyResistance) {
        const distanceToResistance = nearbyResistance - entryPrice;
        const originalDistance = tpPrice - entryPrice;

        // If resistance is close to our TP, use resistance instead
        if (Math.abs(distanceToResistance - originalDistance) <= originalDistance * 0.3) {
          adjustedPrice = nearbyResistance;
        }
      }
    } else {
      // For short positions, check nearby support levels
      const nearbySupport = marketStructure.supportLevels
        .filter(level => level < entryPrice)
        .sort((a, b) => b - a)[0]; // Highest support below entry

      if (nearbySupport) {
        const distanceToSupport = entryPrice - nearbySupport;
        const originalDistance = entryPrice - tpPrice;

        // If support is close to our TP, use support instead
        if (Math.abs(distanceToSupport - originalDistance) <= originalDistance * 0.3) {
          adjustedPrice = nearbySupport;
        }
      }
    }

    return adjustedPrice;
  }

  /**
   * Calculate average risk-reward ratio from multiple levels
   */
  private calculateAverageRiskReward(
    levels: TakeProfitLevel[],
    riskPips: number
  ): { average: number; min: number; max: number } {
    if (levels.length === 0) {
      return { average: 0, min: 0, max: 0 };
    }

    let weightedSum = 0;
    let weightSum = 0;
    const ratios = levels.map(level => level.riskRewardRatio);

    for (const level of levels) {
      weightedSum += level.riskRewardRatio * level.percentageOfPosition;
      weightSum += level.percentageOfPosition;
    }

    return {
      average: weightedSum / weightSum,
      min: Math.min(...ratios),
      max: Math.max(...ratios)
    };
  }

  /**
   * Validate risk-reward ratio
   */
  validateRiskRewardRatio(ratio: number): {
    isValid: boolean;
    isMinimumMet: boolean;
    isReasonable: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];

    const isMinimumMet = ratio >= this.config.minRiskRewardRatio;
    const isReasonable = ratio <= this.config.maxRiskRewardRatio;
    const isValid = isMinimumMet && isReasonable;

    if (!isMinimumMet) {
      warnings.push(`Risk-reward ratio ${ratio.toFixed(2)}:1 is below minimum ${this.config.minRiskRewardRatio}:1`);
    }

    if (!isReasonable) {
      warnings.push(`Risk-reward ratio ${ratio.toFixed(2)}:1 is unrealistically high`);
    }

    if (ratio < 1.0) {
      warnings.push('Risk-reward ratio below 1:1 - high risk trade');
    }

    return {
      isValid,
      isMinimumMet,
      isReasonable,
      warnings
    };
  }

  /**
   * Calculate optimal risk-reward ratio based on win rate
   */
  calculateOptimalRiskReward(
    winRate: number,
    targetProfitFactor: number = 2.0
  ): number {
    // Calculate minimum RR ratio to break even
    const breakEvenRR = (1 - winRate) / winRate;

    // Apply target profit factor
    const optimalRR = breakEvenRR * targetProfitFactor;

    // Ensure it meets minimum requirements
    return Math.max(optimalRR, this.config.minRiskRewardRatio);
  }

  /**
   * Generate take profit recommendations
   */
  generateRecommendations(
    calculation: TakeProfitCalculation,
    winRate?: number
  ): string[] {
    const recommendations: string[] = [];

    // Risk-reward ratio recommendations
    if (calculation.averageRiskReward < this.config.minRiskRewardRatio) {
      recommendations.push('Consider higher probability setup or tighter stop loss');
    }

    if (calculation.averageRiskReward > this.config.maxRiskRewardRatio) {
      recommendations.push('Take profit target may be unrealistic - consider partial exits');
    }

    // Multiple levels recommendations
    if (calculation.partialExitStrategy && calculation.levels.length > 1) {
      recommendations.push('Multiple take profit levels will help lock in profits and manage risk');
    }

    // Win rate based recommendations
    if (winRate) {
      const optimalRR = this.calculateOptimalRiskReward(winRate);
      if (calculation.averageRiskReward < optimalRR) {
        recommendations.push(`For your ${Math.round(winRate * 100)}% win rate, consider RR ratio of ${optimalRR.toFixed(2)}:1 or higher`);
      }
    }

    // Market condition recommendations
    if (calculation.levels.length > 2) {
      recommendations.push('Consider reducing number of take profit levels for better execution');
    }

    if (calculation.levels.some(level => level.riskRewardRatio > 4.0)) {
      recommendations.push('High RR targets may have lower probability - consider scaling out earlier');
    }

    return recommendations;
  }

  /**
   * Calculate trailing stop loss levels
   */
  calculateTrailingLevels(
    entryPrice: number,
    direction: 'BUY' | 'SELL',
    currentPrice: number,
    stopLoss: StopLossCalculation,
    trailActivationRR: number = 1.0,
    trailStepRR: number = 0.5
  ): {
    activationPrice: number;
    trailStep: number;
    levels: Array<{ price: number; rr: number; percentage: number }>;
  } {
    const riskPips = stopLoss.pips;
    const activationPips = riskPips * trailActivationRR;
    const trailStepPips = riskPips * trailStepRR;

    let activationPrice: number;
    let trailStep: number;

    if (direction === 'BUY') {
      activationPrice = entryPrice + (activationPips / 10000);
      trailStep = trailStepPips / 10000;
    } else {
      activationPrice = entryPrice - (activationPips / 10000);
      trailStep = trailStepPips / 10000;
    }

    // Generate trailing levels
    const levels = [];
    for (let i = 1; i <= 5; i++) {
      const levelRR = trailActivationRR + (trailStepRR * i);
      let levelPrice: number;

      if (direction === 'BUY') {
        levelPrice = entryPrice + ((riskPips * levelRR) / 10000);
      } else {
        levelPrice = entryPrice - ((riskPips * levelRR) / 10000);
      }

      levels.push({
        price: levelPrice,
        rr: levelRR,
        percentage: 0.2 // 20% position at each level
      });
    }

    return {
      activationPrice,
      trailStep,
      levels
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<TakeProfitConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Calculate RR 1:1 take profit for specific symbols (XAUUSD, ETHUSD, BTCUSD)
   * Simple calculation: distance from entry to stop loss = take profit distance
   */
  static calculateRR1To1(
    symbol: string,
    entryPrice: number,
    stopLoss: number,
    action: 'BUY' | 'SELL'
  ): number | null {
    // Apply RR 1:1 only for XAUUSD, ETHUSD, BTCUSD as requested
    const isRR1To1Symbol = (
      symbol.toUpperCase().includes('XAUUSD') ||
      symbol.toUpperCase().includes('ETHUSD') ||
      symbol.toUpperCase().includes('BTCUSD')
    );

    if (!isRR1To1Symbol) {
      return null; // Don't modify TP for other symbols
    }

    // Validate inputs
    if (!entryPrice || !stopLoss || entryPrice <= 0 || stopLoss <= 0) {
      console.warn('Invalid parameters for RR 1:1 calculation', { symbol, entryPrice, stopLoss });
      return null;
    }

    // Calculate risk distance (entry -> stop loss)
    const riskDistance = Math.abs(entryPrice - stopLoss);

    if (riskDistance <= 0) {
      console.warn('Invalid risk distance for RR 1:1 calculation', { symbol, riskDistance });
      return null;
    }

    // Calculate take profit with RR 1:1
    let takeProfit: number;
    if (action === 'BUY') {
      takeProfit = entryPrice + riskDistance;
    } else { // SELL
      takeProfit = entryPrice - riskDistance;
    }

    // Normalize price based on symbol type
    const decimals = this.getSymbolDecimals(symbol);
    takeProfit = Number(takeProfit.toFixed(decimals));

    console.log(`🎯 RR 1:1 Take Profit calculated for ${symbol}:`, {
      symbol,
      action,
      entry: entryPrice,
      stopLoss: stopLoss,
      riskDistance: riskDistance,
      takeProfit: takeProfit,
      decimals: decimals
    });

    return takeProfit;
  }

  /**
   * Get decimal precision for symbol
   */
  private static getSymbolDecimals(symbol: string): number {
    if (symbol.toUpperCase().includes('JPY')) {
      return 3; // JPY pairs have 3 decimal places
    } else if (symbol.toUpperCase().includes('XAU') || symbol.toUpperCase().includes('XAG')) {
      return 2; // Gold and silver have 2 decimal places
    } else if (symbol.toUpperCase().includes('BTC') || symbol.toUpperCase().includes('ETH')) {
      return 2; // Crypto typically has 2 decimal places for display
    } else {
      return 4; // Standard forex pairs have 4 decimal places
    }
  }

  /**
   * Check if symbol uses RR 1:1 calculation
   */
  static isRR1To1Symbol(symbol: string): boolean {
    return (
      symbol.toUpperCase().includes('XAUUSD') ||
      symbol.toUpperCase().includes('ETHUSD') ||
      symbol.toUpperCase().includes('BTCUSD')
    );
  }

  /**
   * Get current configuration
   */
  getConfig(): TakeProfitConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const takeProfitCalculator = new TakeProfitCalculator();