// @ts-nocheck
/**
 * ATR-based Stop Loss Calculator
 *
 * Advanced stop loss calculation using Average True Range (ATR) with
 * multi-timeframe analysis and market structure considerations.
 */

import { ATRData, MarketStructure, StopLossCalculation, Timeframe } from '@/types/risk-management';

export interface ATRStopLossConfig {
  timeframes: Timeframe[];
  weights: Record<Timeframe, number>;
  smoothingPeriod: number;
  minATRMultiplier: number;
  maxATRMultiplier: number;
  defaultATRMultiplier: number;
  useMultiTimeframe: boolean;
  adjustForMarketStructure: boolean;
  adjustForVolatility: boolean;
  volatilityThreshold: number;
}

export interface MarketDataPoint {
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: Date;
}

export class ATRStopLossCalculator {
  private config: ATRStopLossConfig;

  constructor(config: Partial<ATRStopLossConfig> = {}) {
    this.config = {
      timeframes: ['M15', 'H1', 'H4'],
      weights: { M15: 0.2, M1: 0.1, M5: 0.15, H1: 0.3, H4: 0.25, D1: 0.2, W1: 0.1, MN1: 0.05 },
      smoothingPeriod: 14,
      minATRMultiplier: 0.5,
      maxATRMultiplier: 3.0,
      defaultATRMultiplier: 1.0,
      useMultiTimeframe: true,
      adjustForMarketStructure: true,
      adjustForVolatility: true,
      volatilityThreshold: 0.02,
      ...config
    };
  }

  /**
   * Calculate stop loss using ATR-based methodology
   */
  calculateStopLoss(
    entryPrice: number,
    direction: 'BUY' | 'SELL',
    atrData: ATRData[],
    marketStructure?: MarketStructure,
    currentPrice?: number
  ): StopLossCalculation {
    // Validate inputs
    if (!entryPrice || entryPrice <= 0) {
      throw new Error('Invalid entry price');
    }

    if (!atrData || atrData.length === 0) {
      throw new Error('No ATR data provided');
    }

    // Calculate multi-timeframe ATR if enabled
    let weightedATR: number;
    let primaryATR: number;
    let primaryTimeframe: Timeframe;

    if (this.config.useMultiTimeframe && atrData.length > 1) {
      const result = this.calculateWeightedATR(atrData);
      weightedATR = result.weightedATR;
      primaryATR = result.primaryATR;
      primaryTimeframe = result.primaryTimeframe;
    } else {
      weightedATR = atrData[0].value;
      primaryATR = atrData[0].value;
      primaryTimeframe = atrData[0].timeframe as Timeframe;
    }

    // Calculate ATR multiplier based on market conditions
    const atrMultiplier = this.calculateATRMultiplier(
      weightedATR,
      marketStructure,
      atrData
    );

    // Calculate initial stop loss distance
    let stopDistance = weightedATR * atrMultiplier;

    // Adjust for market structure if enabled
    let marketStructureAdjusted = false;
    if (this.config.adjustForMarketStructure && marketStructure) {
      const adjustedDistance = this.adjustForMarketStructure(
        stopDistance,
        entryPrice,
        direction,
        marketStructure
      );
      if (adjustedDistance !== stopDistance) {
        stopDistance = adjustedDistance;
        marketStructureAdjusted = true;
      }
    }

    // Calculate final stop loss price
    let stopPrice: number;
    if (direction === 'BUY') {
      stopPrice = entryPrice - stopDistance;
    } else {
      stopPrice = entryPrice + stopDistance;
    }

    // Validate stop loss is reasonable
    stopPrice = this.validateStopPrice(stopPrice, entryPrice, direction, currentPrice);

    // Convert to pips (assuming standard 4-digit broker)
    const pips = Math.abs(stopPrice - entryPrice) * 10000;

    return {
      price: stopPrice,
      pips,
      atrMultiplier,
      timeframe: primaryTimeframe,
      atrValue: primaryATR,
      reasoning: this.generateReasoning(atrMultiplier, marketStructureAdjusted, primaryTimeframe),
      marketStructureAdjusted,
      finalPrice: stopPrice
    };
  }

  /**
   * Calculate weighted ATR from multiple timeframes
   */
  private calculateWeightedATR(atrData: ATRData[]): {
    weightedATR: number;
    primaryATR: number;
    primaryTimeframe: Timeframe;
  } {
    let weightedSum = 0;
    let weightSum = 0;
    let primaryATR = 0;
    let primaryTimeframe: Timeframe = 'H1';
    let maxWeight = 0;

    for (const data of atrData) {
      const timeframe = data.timeframe as Timeframe;
      const weight = this.config.weights[timeframe] || 0.1;

      weightedSum += data.value * weight;
      weightSum += weight;

      if (weight > maxWeight) {
        maxWeight = weight;
        primaryATR = data.value;
        primaryTimeframe = timeframe;
      }
    }

    return {
      weightedATR: weightedSum / weightSum,
      primaryATR,
      primaryTimeframe
    };
  }

  /**
   * Calculate dynamic ATR multiplier based on market conditions
   */
  private calculateATRMultiplier(
    atrValue: number,
    marketStructure?: MarketStructure,
    atrData?: ATRData[]
  ): number {
    let multiplier = this.config.defaultATRMultiplier;

    // Adjust for volatility
    if (this.config.adjustForVolatility && atrData && atrData.length > 0) {
      const avgATR = atrData.reduce((sum, data) => sum + data.value, 0) / atrData.length;
      const volatilityRatio = atrValue / avgATR;

      if (volatilityRatio > 1.5) {
        // High volatility - use larger multiplier
        multiplier = Math.min(multiplier * 1.3, this.config.maxATRMultiplier);
      } else if (volatilityRatio < 0.7) {
        // Low volatility - use smaller multiplier
        multiplier = Math.max(multiplier * 0.8, this.config.minATRMultiplier);
      }
    }

    // Adjust for market trend
    if (marketStructure) {
      switch (marketStructure.trend) {
        case 'uptrend':
          // In strong trends, we can use slightly tighter stops
          multiplier = Math.max(multiplier * 0.9, this.config.minATRMultiplier);
          break;
        case 'downtrend':
          multiplier = Math.max(multiplier * 0.9, this.config.minATRMultiplier);
          break;
        case 'sideways':
          // In ranging markets, we need wider stops
          multiplier = Math.min(multiplier * 1.2, this.config.maxATRMultiplier);
          break;
      }

      // Adjust for volatility regime
      switch (marketStructure.volatility) {
        case 'high':
          multiplier = Math.min(multiplier * 1.2, this.config.maxATRMultiplier);
          break;
        case 'low':
          multiplier = Math.max(multiplier * 0.8, this.config.minATRMultiplier);
          break;
      }
    }

    return Math.max(Math.min(multiplier, this.config.maxATRMultiplier), this.config.minATRMultiplier);
  }

  /**
   * Adjust stop distance based on market structure
   */
  private adjustForMarketStructure(
    stopDistance: number,
    entryPrice: number,
    direction: 'BUY' | 'SELL',
    marketStructure: MarketStructure
  ): number {
    let adjustedDistance = stopDistance;

    if (direction === 'BUY') {
      // For long positions, check nearby support levels
      const nearbySupport = marketStructure.supportLevels
        .filter(level => level < entryPrice)
        .sort((a, b) => b - a)[0]; // Highest support below entry

      if (nearbySupport) {
        const supportDistance = entryPrice - nearbySupport;
        // If support is within reasonable range, use it
        if (supportDistance <= stopDistance * 1.5 && supportDistance >= stopDistance * 0.5) {
          adjustedDistance = supportDistance;
        }
      }
    } else {
      // For short positions, check nearby resistance levels
      const nearbyResistance = marketStructure.resistanceLevels
        .filter(level => level > entryPrice)
        .sort((a, b) => a - b)[0]; // Lowest resistance above entry

      if (nearbyResistance) {
        const resistanceDistance = nearbyResistance - entryPrice;
        // If resistance is within reasonable range, use it
        if (resistanceDistance <= stopDistance * 1.5 && resistanceDistance >= stopDistance * 0.5) {
          adjustedDistance = resistanceDistance;
        }
      }
    }

    return adjustedDistance;
  }

  /**
   * Validate stop price to ensure it's reasonable
   */
  private validateStopPrice(
    stopPrice: number,
    entryPrice: number,
    direction: 'BUY' | 'SELL',
    currentPrice?: number
  ): number {
    const minDistance = entryPrice * 0.001; // 0.1% minimum
    const maxDistance = entryPrice * 0.1; // 10% maximum

    let validatedStop = stopPrice;

    // Ensure minimum distance
    if (Math.abs(stopPrice - entryPrice) < minDistance) {
      validatedStop = direction === 'BUY' ? entryPrice - minDistance : entryPrice + minDistance;
    }

    // Ensure maximum distance
    if (Math.abs(stopPrice - entryPrice) > maxDistance) {
      validatedStop = direction === 'BUY' ? entryPrice - maxDistance : entryPrice + maxDistance;
    }

    // If current price is provided, ensure stop is on the correct side
    if (currentPrice) {
      if (direction === 'BUY' && validatedStop >= currentPrice) {
        validatedStop = currentPrice * 0.999; // 0.1% below current price
      } else if (direction === 'SELL' && validatedStop <= currentPrice) {
        validatedStop = currentPrice * 1.001; // 0.1% above current price
      }
    }

    return validatedStop;
  }

  /**
   * Generate reasoning for stop loss calculation
   */
  private generateReasoning(
    atrMultiplier: number,
    marketStructureAdjusted: boolean,
    primaryTimeframe: Timeframe
  ): string {
    const reasoning = [`ATR-based stop loss using ${primaryTimeframe} timeframe`];
    reasoning.push(`ATR multiplier: ${atrMultiplier.toFixed(2)}`);

    if (marketStructureAdjusted) {
      reasoning.push('Adjusted for market structure (support/resistance)');
    }

    if (atrMultiplier > this.config.defaultATRMultiplier * 1.2) {
      reasoning.push('Increased multiplier for high volatility conditions');
    } else if (atrMultiplier < this.config.defaultATRMultiplier * 0.8) {
      reasoning.push('Decreased multiplier for low volatility conditions');
    }

    return reasoning.join('. ');
  }

  /**
   * Calculate True Range for a single candle
   */
  calculateTrueRange(high: number, low: number, previousClose: number): number {
    return Math.max(
      high - low,
      Math.abs(high - previousClose),
      Math.abs(low - previousClose)
    );
  }

  /**
   * Calculate ATR from price data
   */
  calculateATR(data: MarketDataPoint[], period: number = 14): number {
    if (data.length < period + 1) {
      throw new Error(`Insufficient data for ATR calculation. Need ${period + 1} points, got ${data.length}`);
    }

    const trueRanges: number[] = [];
    for (let i = 1; i < data.length; i++) {
      const tr = this.calculateTrueRange(
        data[i].high,
        data[i].low,
        data[i - 1].close
      );
      trueRanges.push(tr);
    }

    // Simple moving average of true ranges
    const recentTRs = trueRanges.slice(-period);
    return recentTRs.reduce((sum, tr) => sum + tr, 0) / recentTRs.length;
  }

  /**
   * Get recommended timeframe priority based on trading style
   */
  getTimeframePriority(tradingStyle: 'scalp' | 'day' | 'swing' | 'position'): Timeframe[] {
    switch (tradingStyle) {
      case 'scalp':
        return ['M1', 'M5', 'M15'];
      case 'day':
        return ['M5', 'M15', 'H1'];
      case 'swing':
        return ['M15', 'H1', 'H4'];
      case 'position':
        return ['H1', 'H4', 'D1'];
      default:
        return this.config.timeframes;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ATRStopLossConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): ATRStopLossConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const atrStopLossCalculator = new ATRStopLossCalculator();