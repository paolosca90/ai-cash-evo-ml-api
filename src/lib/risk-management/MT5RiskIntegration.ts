// @ts-nocheck
/**
 * MT5 Risk Management Integration
 *
 * Integration layer between the risk management system and MT5 Expert Advisor
 * providing enhanced risk calculations and real-time monitoring.
 */

import {
  RiskManagementResult,
  AccountInfo,
  SymbolSpecs,
  MarketData,
  Position,
  RiskAlert,
  StopLossCalculation,
  TakeProfitCalculation
} from '@/types/risk-management';

import { riskManagementService } from './RiskManagementService';

export interface MT5TradeRequest {
  symbol: string;
  direction: 'BUY' | 'SELL';
  volume: number;
  price: number;
  stopLoss: number;
  takeProfit: number;
  comment: string;
  magicNumber: number;
  riskAmount?: number;
  confidence?: number;
  aiAnalysis?: unknown;
}

export interface MT5PositionInfo {
  ticket: number;
  symbol: string;
  type: 'BUY' | 'SELL';
  volume: number;
  openPrice: number;
  currentPrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
  profit: number;
  swap: number;
  commission: number;
  magicNumber: number;
  comment: string;
  openTime: Date;
  riskAmount: number;
  unrealizedPL: number;
}

export interface EnhancedMT5Signal {
  id: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  entry: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number;
  risk_amount: number;
  lot_size: number;
  risk_metrics: {
    riskPercentage: number;
    riskRewardRatio: number;
    expectedValue: number;
    kellyCriterion: number;
  };
  validation: {
    isValid: boolean;
    riskLevel: string;
    warnings: string[];
  };
  recommendations: string[];
  timestamp: string;
  aiAnalysis?: unknown;
  risk_management: {
    atrMultiplier: number;
    atrTimeframe: string;
    partialExits: boolean;
    trailingStop: boolean;
  };
}

export class MT5RiskIntegration {
  private readonly magicNumber: number = 888777;
  private maxConcurrentTrades: number = 5;
  private maxDailyTrades: number = 10;
  private activePositions: Map<string, MT5PositionInfo> = new Map();
  private dailyTradeCount: number = 0;
  private lastResetDate: Date = new Date();

  constructor(magicNumber?: number) {
    if (magicNumber) {
      this.magicNumber = magicNumber;
    }
  }

  /**
   * Process trade signal with risk management
   */
  async processTradeSignal(
    signal: {
      symbol: string;
      direction: 'BUY' | 'SELL';
      entryPrice: number;
      confidence: number;
      accountInfo: AccountInfo;
      symbolSpecs: SymbolSpecs;
      marketData: MarketData;
      riskAmount?: number;
      aiAnalysis?: unknown;
    }
  ): Promise<{
    success: boolean;
    enhancedSignal?: EnhancedMT5Signal;
    error?: string;
    riskResult?: RiskManagementResult;
  }> {
    try {
      // Reset daily counter if needed
      this.resetDailyCounters();

      // Check trading limits
      const limitCheck = this.checkTradingLimits(signal.symbol);
      if (!limitCheck.allowed) {
        return {
          success: false,
          error: limitCheck.reason
        };
      }

      // Calculate risk management
      const riskResult = await riskManagementService.calculateTradeRisk({
        symbol: signal.symbol,
        direction: signal.direction,
        entryPrice: signal.entryPrice,
        accountInfo: signal.accountInfo,
        symbolSpecs: signal.symbolSpecs,
        marketData: signal.marketData,
        currentPositions: Array.from(this.activePositions.values()).map(pos => ({
          id: pos.ticket.toString(),
          symbol: pos.symbol,
          type: pos.type,
          volume: pos.volume,
          openPrice: pos.openPrice,
          currentPrice: pos.currentPrice,
          stopLoss: pos.stopLoss,
          takeProfit: pos.takeProfit,
          unrealizedPL: pos.unrealizedPL,
          realizedPL: pos.profit,
          openTime: pos.openTime,
          closeTime: null,
          duration: 0,
          riskAmount: pos.riskAmount,
          maxRisk: pos.riskAmount,
          trailingStop: null,
          margin: 0,
          commission: pos.commission,
          swap: pos.swap,
          comment: pos.comment
        })),
        riskAmount: signal.riskAmount
      });

      // Check if trade is allowed
      const tradeAllowed = riskManagementService.isTradeAllowed(
        signal.symbol,
        signal.accountInfo,
        Array.from(this.activePositions.values()),
        riskManagementService.updatePortfolioRisk(Array.from(this.activePositions.values()).map(pos => ({
          id: pos.ticket.toString(),
          symbol: pos.symbol,
          type: pos.type,
          volume: pos.volume,
          openPrice: pos.openPrice,
          currentPrice: pos.currentPrice,
          stopLoss: pos.stopLoss,
          takeProfit: pos.takeProfit,
          unrealizedPL: pos.unrealizedPL,
          realizedPL: pos.profit,
          openTime: pos.openTime,
          closeTime: null,
          duration: 0,
          riskAmount: pos.riskAmount,
          maxRisk: pos.riskAmount,
          trailingStop: null,
          margin: 0,
          commission: pos.commission,
          swap: pos.swap,
          comment: pos.comment
        })))
      );

      if (!tradeAllowed.allowed) {
        return {
          success: false,
          error: tradeAllowed.reason,
          riskResult
        };
      }

      // Check validation result
      if (!riskResult.validation.isValid) {
        return {
          success: false,
          error: `Risk validation failed: ${riskResult.validation.errors.join(', ')}`,
          riskResult
        };
      }

      // Create enhanced signal
      const enhancedSignal: EnhancedMT5Signal = {
        id: `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        symbol: signal.symbol,
        action: signal.direction,
        entry: signal.entryPrice,
        stopLoss: riskResult.stopLoss.price,
        takeProfit: riskResult.takeProfit.primaryTP,
        confidence: signal.confidence,
        risk_amount: riskResult.positionSize.riskAmount,
        lot_size: riskResult.positionSize.lotSize,
        risk_metrics: {
          riskPercentage: riskResult.riskMetrics.riskPercentage,
          riskRewardRatio: riskResult.riskMetrics.riskRewardRatio,
          expectedValue: riskResult.riskMetrics.expectedValue,
          kellyCriterion: riskResult.riskMetrics.kellyCriterion
        },
        validation: {
          isValid: riskResult.validation.isValid,
          riskLevel: riskResult.validation.riskLevel,
          warnings: riskResult.validation.warnings
        },
        recommendations: riskResult.recommendations,
        timestamp: new Date().toISOString(),
        aiAnalysis: signal.aiAnalysis,
        risk_management: {
          atrMultiplier: riskResult.stopLoss.atrMultiplier,
          atrTimeframe: riskResult.stopLoss.timeframe,
          partialExits: riskResult.takeProfit.partialExitStrategy,
          trailingStop: false // Could be enabled based on settings
        }
      };

      // Check lot size limits
      if (enhancedSignal.lot_size < signal.symbolSpecs.minLot) {
        return {
          success: false,
          error: `Calculated lot size ${enhancedSignal.lot_size} is below minimum ${signal.symbolSpecs.minLot}`,
          riskResult
        };
      }

      if (enhancedSignal.lot_size > signal.symbolSpecs.maxLot) {
        return {
          success: false,
          error: `Calculated lot size ${enhancedSignal.lot_size} exceeds maximum ${signal.symbolSpecs.maxLot}`,
          riskResult
        };
      }

      return {
        success: true,
        enhancedSignal,
        riskResult
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in risk management'
      };
    }
  }

  /**
   * Update position tracking
   */
  updatePosition(position: MT5PositionInfo): void {
    this.activePositions.set(position.ticket.toString(), position);
  }

  /**
   * Remove position from tracking
   */
  removePosition(ticket: number): void {
    this.activePositions.delete(ticket.toString());
    this.dailyTradeCount++;
  }

  /**
   * Get all active positions
   */
  getActivePositions(): MT5PositionInfo[] {
    return Array.from(this.activePositions.values());
  }

  /**
   * Get portfolio risk summary
   */
  getPortfolioRiskSummary(): {
    totalExposure: number;
    totalRisk: number;
    openPositions: number;
    dailyTrades: number;
    riskLevel: 'low' | 'medium' | 'high' | 'extreme';
    warnings: string[];
  } {
    const positions = Array.from(this.activePositions.values());
    const totalExposure = positions.reduce((sum, pos) => sum + pos.volume, 0);
    const totalRisk = positions.reduce((sum, pos) => sum + pos.riskAmount, 0);

    // Calculate risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'extreme' = 'low';
    if (positions.length > 3) riskLevel = 'medium';
    if (totalRisk > 1000) riskLevel = 'high';
    if (positions.length >= this.maxConcurrentTrades) riskLevel = 'extreme';

    const warnings: string[] = [];
    if (positions.length >= this.maxConcurrentTrades - 1) {
      warnings.push('Approaching maximum concurrent trades limit');
    }
    if (this.dailyTradeCount >= this.maxDailyTrades - 2) {
      warnings.push('Approaching daily trade limit');
    }

    return {
      totalExposure,
      totalRisk,
      openPositions: positions.length,
      dailyTrades: this.dailyTradeCount,
      riskLevel,
      warnings
    };
  }

  /**
   * Check trading limits
   */
  private checkTradingLimits(symbol: string): { allowed: boolean; reason?: string } {
    // Check concurrent trades limit
    if (this.activePositions.size >= this.maxConcurrentTrades) {
      return {
        allowed: false,
        reason: `Maximum concurrent trades limit (${this.maxConcurrentTrades}) reached`
      };
    }

    // Check daily trades limit
    if (this.dailyTradeCount >= this.maxDailyTrades) {
      return {
        allowed: false,
        reason: `Maximum daily trades limit (${this.maxDailyTrades}) reached`
      };
    }

    // Check if already have position for this symbol
    const existingPosition = Array.from(this.activePositions.values())
      .find(pos => pos.symbol === symbol);

    if (existingPosition) {
      return {
        allowed: false,
        reason: `Already have open position for ${symbol}`
      };
    }

    return { allowed: true };
  }

  /**
   * Reset daily counters
   */
  private resetDailyCounters(): void {
    const today = new Date();
    if (today.toDateString() !== this.lastResetDate.toDateString()) {
      this.dailyTradeCount = 0;
      this.lastResetDate = today;
    }
  }

  /**
   * Generate MT5 trade request from enhanced signal
   */
  generateTradeRequest(enhancedSignal: EnhancedMT5Signal): MT5TradeRequest {
    return {
      symbol: enhancedSignal.symbol,
      direction: enhancedSignal.action,
      volume: enhancedSignal.lot_size,
      price: enhancedSignal.entry,
      stopLoss: enhancedSignal.stopLoss,
      takeProfit: enhancedSignal.takeProfit,
      comment: `AI Risk Managed ${enhancedSignal.validation.riskLevel} Risk`,
      magicNumber: this.magicNumber,
      riskAmount: enhancedSignal.risk_amount,
      confidence: enhancedSignal.confidence,
      aiAnalysis: enhancedSignal.aiAnalysis
    };
  }

  /**
   * Validate MT5 trade request against risk rules
   */
  validateTradeRequest(request: MT5TradeRequest, accountInfo: AccountInfo): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check risk amount
    if (request.riskAmount && request.riskAmount > accountInfo.balance * 0.05) {
      errors.push('Risk amount exceeds 5% of account balance');
    }

    // Check position size
    const riskPercentage = (request.riskAmount || 0) / accountInfo.balance * 100;
    if (riskPercentage > 2) {
      warnings.push(`Risk percentage ${riskPercentage.toFixed(2)}% is above recommended 2%`);
    }

    // Check stop loss distance
    const stopDistance = Math.abs(request.price - request.stopLoss);
    const atrValue = 0.0010; // Would get from market data
    const atrMultiplier = stopDistance / atrValue;

    if (atrMultiplier > 3) {
      warnings.push('Wide stop loss - ensure sufficient price momentum');
    } else if (atrMultiplier < 0.5) {
      errors.push('Stop loss too tight - likely to be hit by noise');
    }

    // Check risk-reward ratio
    const risk = Math.abs(request.price - request.stopLoss);
    const reward = Math.abs(request.takeProfit - request.price);
    const rrRatio = reward / risk;

    if (rrRatio < 1.5) {
      errors.push('Risk-reward ratio below minimum 1.5:1');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Generate trading statistics
   */
  generateStatistics(): {
    totalTrades: number;
    dailyTrades: number;
    activePositions: number;
    totalExposure: number;
    totalRisk: number;
    averageRiskPerTrade: number;
    riskDistribution: {
      low: number;
      medium: number;
      high: number;
      extreme: number;
    };
  } {
    const positions = Array.from(this.activePositions.values());
    const totalExposure = positions.reduce((sum, pos) => sum + pos.volume, 0);
    const totalRisk = positions.reduce((sum, pos) => sum + pos.riskAmount, 0);

    const riskDistribution = {
      low: positions.filter(p => p.riskAmount < 50).length,
      medium: positions.filter(p => p.riskAmount >= 50 && p.riskAmount < 100).length,
      high: positions.filter(p => p.riskAmount >= 100 && p.riskAmount < 200).length,
      extreme: positions.filter(p => p.riskAmount >= 200).length
    };

    return {
      totalTrades: this.dailyTradeCount + positions.length,
      dailyTrades: this.dailyTradeCount,
      activePositions: positions.length,
      totalExposure,
      totalRisk,
      averageRiskPerTrade: positions.length > 0 ? totalRisk / positions.length : 0,
      riskDistribution
    };
  }

  /**
   * Update settings
   */
  updateSettings(settings: {
    maxConcurrentTrades?: number;
    maxDailyTrades?: number;
    magicNumber?: number;
  }): void {
    if (settings.maxConcurrentTrades) {
      this.maxConcurrentTrades = settings.maxConcurrentTrades;
    }
    if (settings.maxDailyTrades) {
      this.maxDailyTrades = settings.maxDailyTrades;
    }
    if (settings.magicNumber) {
      this.magicNumber = settings.magicNumber;
    }
  }

  /**
   * Get current settings
   */
  getSettings() {
    return {
      magicNumber: this.magicNumber,
      maxConcurrentTrades: this.maxConcurrentTrades,
      maxDailyTrades: this.maxDailyTrades,
      dailyTradeCount: this.dailyTradeCount,
      activePositions: this.activePositions.size
    };
  }
}

// Export singleton instance
export const mt5RiskIntegration = new MT5RiskIntegration();