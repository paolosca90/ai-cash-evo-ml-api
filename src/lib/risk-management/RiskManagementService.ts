// @ts-nocheck
/**
 * Risk Management Service
 *
 * Comprehensive risk management system integrating ATR-based stop loss,
 * take profit calculations, and position sizing with portfolio protection.
 */

import {
  RiskManagementResult,
  TradeRiskParameters,
  MarketData,
  AccountInfo,
  SymbolSpecs,
  PortfolioRisk,
  Position,
  RiskAlert,
  RiskManagementConfig,
  RiskMetrics,
  RiskValidation
} from '@/types/risk-management';

import { atrStopLossCalculator, ATRStopLossCalculator } from './ATRStopLossCalculator';
import { takeProfitCalculator, TakeProfitCalculator } from './TakeProfitCalculator';
import { lotSizeCalculator, LotSizeCalculator } from './LotSizeCalculator';

export interface RiskManagementInput {
  symbol: string;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  accountInfo: AccountInfo;
  symbolSpecs: SymbolSpecs;
  marketData: MarketData;
  currentPositions?: Position[];
  portfolioRisk?: PortfolioRisk;
  customParameters?: Partial<TradeRiskParameters>;
  riskAmount?: number;
}

export interface RiskManagementSettings {
  enabled: boolean;
  maxRiskPerTrade: number;
  maxPortfolioRisk: number;
  maxDailyLoss: number;
  maxDrawdown: number;
  correlationThreshold: number;
  useATR: boolean;
  atrMultiplier: number;
  riskRewardRatio: number;
  trailingStop: boolean;
  partialExits: boolean;
  alertsEnabled: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

export class RiskManagementService {
  private config: RiskManagementConfig;
  private settings: RiskManagementSettings;
  private alerts: RiskAlert[] = [];
  private dailyLoss: number = 0;
  private maxDrawdown: number = 0;
  private lastUpdate: Date = new Date();

  constructor(config: Partial<RiskManagementConfig> = {}) {
    this.config = {
      atr: {
        timeframes: ['M15', 'H1', 'H4'],
        weights: { M15: 0.2, M1: 0.1, M5: 0.15, H1: 0.3, H4: 0.25, D1: 0.2, W1: 0.1, MN1: 0.05 },
        smoothingPeriod: 14,
        useMultiTimeframe: true,
        minATR: 0.0001,
        maxATR: 0.01
      },
      defaultRiskPerTrade: 2.0,
      maxRiskPerTrade: 5.0,
      minRiskRewardRatio: 1.5,
      defaultRiskRewardRatio: 2.0,
      maxTradesPerDay: 5,
      maxPositions: 10,
      correlationThreshold: 0.7,
      trailingConfig: {
        enabled: false,
        activationATR: 1.0,
        stepATR: 0.5,
        maxDistanceATR: 3.0
      },
      partialExits: {
        enabled: true,
        levels: [1.0, 2.0, 3.0],
        percentages: [0.3, 0.4, 0.3]
      },
      ...config
    };

    this.settings = {
      enabled: true,
      maxRiskPerTrade: 2.0,
      maxPortfolioRisk: 6.0,
      maxDailyLoss: 5.0,
      maxDrawdown: 20.0,
      correlationThreshold: 0.7,
      useATR: true,
      atrMultiplier: 1.0,
      riskRewardRatio: 2.0,
      trailingStop: false,
      partialExits: true,
      alertsEnabled: true,
      emailNotifications: false,
      pushNotifications: false,
      ...this.config
    };

    // Initialize sub-components with config
    atrStopLossCalculator.updateConfig({
      timeframes: this.config.atr.timeframes,
      weights: this.config.atr.weights,
      smoothingPeriod: this.config.atr.smoothingPeriod,
      useMultiTimeframe: this.config.atr.useMultiTimeframe
    });

    takeProfitCalculator.updateConfig({
      minRiskRewardRatio: this.config.minRiskRewardRatio,
      defaultRiskRewardRatio: this.config.defaultRiskRewardRatio,
      useMultipleLevels: this.config.partialExits.enabled,
      partialExitLevels: this.config.partialExits.levels,
      partialExitPercentages: this.config.partialExits.percentages
    });

    lotSizeCalculator.updateConfig({
      maxRiskPerTrade: this.config.maxRiskPerTrade,
      maxPortfolioRisk: this.config.maxPortfolioRisk,
      considerCorrelation: this.config.correlationThreshold,
      maxPositions: this.config.maxPositions
    });
  }

  /**
   * Calculate comprehensive risk management for a trade
   */
  async calculateTradeRisk(input: RiskManagementInput): Promise<RiskManagementResult> {
    if (!this.settings.enabled) {
      throw new Error('Risk management is disabled');
    }

    const {
      symbol,
      direction,
      entryPrice,
      accountInfo,
      symbolSpecs,
      marketData,
      currentPositions,
      portfolioRisk,
      customParameters,
      riskAmount
    } = input;

    // Validate inputs
    this.validateInputs(input);

    // Get risk parameters
    const riskParams = this.getRiskParameters(customParameters);

    // Calculate stop loss
    const stopLoss = atrStopLossCalculator.calculateStopLoss(
      entryPrice,
      direction,
      marketData.atrData,
      marketData.marketStructure,
      marketData.bid // Current price
    );

    // Calculate take profit
    const takeProfit = takeProfitCalculator.calculateTakeProfit(
      entryPrice,
      direction,
      stopLoss,
      riskParams.takeProfitRiskRewardRatio,
      marketData.marketStructure,
      this.getMarketCondition(marketData)
    );

    // Calculate position size
    const positionSize = lotSizeCalculator.calculateLotSize({
      accountInfo,
      symbolSpecs,
      stopLossPips: stopLoss.pips,
      riskAmount: riskAmount || this.calculateRiskAmount(accountInfo, riskParams),
      portfolioRisk,
      currentPositions: currentPositions?.map(pos => ({
        symbol: pos.symbol,
        volume: pos.volume,
        direction: pos.type,
        correlation: this.calculateCorrelation(symbol, pos.symbol)
      })),
      marketVolatility: marketData.marketStructure.volatility === 'high' ? 0.02 :
                       marketData.marketStructure.volatility === 'medium' ? 0.01 : 0.005,
      accountDrawdown: this.maxDrawdown
    });

    // Calculate risk metrics
    const riskMetrics = this.calculateRiskMetrics(
      accountInfo,
      stopLoss,
      takeProfit,
      positionSize,
      riskParams
    );

    // Validate risk management
    const validation = this.validateRiskManagement(
      riskMetrics,
      riskParams,
      portfolioRisk,
      currentPositions
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      stopLoss,
      takeProfit,
      positionSize,
      validation,
      riskMetrics
    );

    // Create alerts if needed
    if (this.settings.alertsEnabled) {
      this.generateAlerts(validation, riskMetrics, symbol);
    }

    return {
      symbol,
      direction,
      entryPrice,
      stopLoss,
      takeProfit,
      positionSize,
      riskMetrics,
      validation,
      recommendations,
      timestamp: new Date()
    };
  }

  /**
   * Validate input parameters
   */
  private validateInputs(input: RiskManagementInput): void {
    const { symbol, direction, entryPrice, accountInfo, symbolSpecs, marketData } = input;

    if (!symbol || !direction || !entryPrice || !accountInfo || !symbolSpecs || !marketData) {
      throw new Error('Missing required input parameters');
    }

    if (entryPrice <= 0) {
      throw new Error('Entry price must be positive');
    }

    if (accountInfo.balance <= 0 || accountInfo.equity <= 0) {
      throw new Error('Invalid account information');
    }

    if (!marketData.atrData || marketData.atrData.length === 0) {
      throw new Error('Market data missing ATR information');
    }
  }

  /**
   * Get risk parameters with defaults
   */
  private getRiskParameters(custom?: Partial<TradeRiskParameters>): TradeRiskParameters {
    return {
      accountBalance: 0, // Will be set from account info
      riskPerTrade: this.settings.maxRiskPerTrade,
      maxPortfolioRisk: this.settings.maxPortfolioRisk,
      stopLossATRMultiplier: this.settings.atrMultiplier,
      takeProfitRiskRewardRatio: this.settings.riskRewardRatio,
      maxDailyLoss: this.settings.maxDailyLoss,
      maxDrawdown: this.settings.maxDrawdown,
      correlationLimit: this.settings.correlationThreshold,
      usePartialExits: this.settings.partialExits,
      trailingStop: this.settings.trailingStop,
      trailingStopATRMultiplier: this.config.trailingConfig.activationATR,
      ...custom
    };
  }

  /**
   * Calculate risk amount based on account balance
   */
  private calculateRiskAmount(accountInfo: AccountInfo, params: TradeRiskParameters): number {
    params.accountBalance = accountInfo.balance;
    return (accountInfo.balance * params.riskPerTrade) / 100;
  }

  /**
   * Get market condition from market data
   */
  private getMarketCondition(marketData: MarketData): unknown {
    return {
      volatility: marketData.marketStructure.volatility,
      trend: marketData.marketStructure.trend === 'uptrend' || marketData.marketStructure.trend === 'downtrend' ? 'moderate' : 'none',
      session: 'london', // Default - could be determined from time
      liquidity: 'medium',
      economicImpact: 'low'
    };
  }

  /**
   * Calculate risk metrics
   */
  private calculateRiskMetrics(
    accountInfo: AccountInfo,
    stopLoss: unknown,
    takeProfit: unknown,
    positionSize: unknown,
    params: TradeRiskParameters
  ): RiskMetrics {
    const riskAmount = positionSize.riskAmount;
    const avgRiskReward = takeProfit.averageRiskReward;
    const potentialReward = riskAmount * avgRiskReward;

    // Calculate win rate required for break-even
    const winRateRequired = 1 / (1 + avgRiskReward);

    // Calculate expected value (simplified)
    const expectedValue = (potentialReward * 0.5) - (riskAmount * 0.5); // Assuming 50% win rate

    // Calculate Kelly Criterion (simplified)
    const kellyCriterion = ((avgRiskReward * 0.5) - 0.5) / avgRiskReward;

    return {
      riskAmount,
      riskPercentage: (riskAmount / accountInfo.balance) * 100,
      potentialReward,
      riskRewardRatio: avgRiskReward,
      winRateRequired,
      expectedValue,
      kellyCriterion: Math.max(kellyCriterion, 0),
      positionSizeKelly: positionSize.lotSize * Math.max(kellyCriterion, 0),
      correlationRisk: 0, // Would need actual correlation calculation
      portfolioHeat: 0, // Would need portfolio risk calculation
    };
  }

  /**
   * Validate risk management against rules
   */
  private validateRiskManagement(
    riskMetrics: RiskMetrics,
    params: TradeRiskParameters,
    portfolioRisk?: PortfolioRisk,
    currentPositions?: Position[]
  ): RiskValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check risk per trade
    if (riskMetrics.riskPercentage > params.maxPortfolioRisk) {
      errors.push(`Risk per trade ${riskMetrics.riskPercentage.toFixed(2)}% exceeds maximum ${params.maxPortfolioRisk}%`);
    }

    // Check risk-reward ratio
    if (riskMetrics.riskRewardRatio < this.config.minRiskRewardRatio) {
      errors.push(`Risk-reward ratio ${riskMetrics.riskRewardRatio.toFixed(2)}:1 below minimum ${this.config.minRiskRewardRatio}:1`);
    }

    // Check portfolio heat
    if (portfolioRisk && portfolioRisk.portfolioHeat + riskMetrics.riskPercentage > params.maxPortfolioRisk) {
      errors.push('Portfolio risk limit would be exceeded');
    }

    // Check maximum positions
    if (currentPositions && currentPositions.length >= this.config.maxPositions) {
      errors.push(`Maximum positions limit ${this.config.maxPositions} reached`);
    }

    // Check daily loss limit
    if (this.dailyLoss + riskMetrics.riskAmount > params.maxDailyLoss) {
      errors.push('Daily loss limit would be exceeded');
    }

    // Warnings
    if (riskMetrics.riskPercentage > params.riskPerTrade * 1.5) {
      warnings.push('High risk per trade - consider reducing position size');
    }

    if (riskMetrics.riskRewardRatio < 2.0) {
      warnings.push('Moderate risk-reward ratio - higher targets preferred');
    }

    if (riskMetrics.expectedValue < 0) {
      warnings.push('Negative expected value - reconsider trade setup');
    }

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'extreme' = 'low';
    if (riskMetrics.riskPercentage > 3) riskLevel = 'medium';
    if (riskMetrics.riskPercentage > 4) riskLevel = 'high';
    if (riskMetrics.riskPercentage > 5) riskLevel = 'extreme';

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      riskLevel,
      passesRiskManagement: errors.length === 0
    };
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    stopLoss: unknown,
    takeProfit: unknown,
    positionSize: unknown,
    validation: RiskValidation,
    riskMetrics: RiskMetrics
  ): string[] {
    const recommendations: string[] = [];

    // Stop loss recommendations
    if (stopLoss.atrMultiplier > 2) {
      recommendations.push('Wide stop loss - ensure sufficient price momentum');
    }

    // Take profit recommendations
    if (takeProfit.averageRiskReward > 3) {
      recommendations.push('High risk-reward ratio - consider partial exits');
    }

    // Position size recommendations
    if (positionSize.lotSize === positionSize.minLotSize) {
      recommendations.push('Minimum lot size - consider smaller stops or more capital');
    }

    // Risk-based recommendations
    if (validation.warnings.length > 0) {
      recommendations.push(...validation.warnings);
    }

    // Expected value recommendations
    if (riskMetrics.expectedValue > 0 && riskMetrics.kellyCriterion > 0.1) {
      recommendations.push('Positive expected value - consider full position size');
    }

    return recommendations;
  }

  /**
   * Generate risk alerts
   */
  private generateAlerts(validation: RiskValidation, riskMetrics: RiskMetrics, symbol: string): void {
    const now = new Date();

    if (validation.errors.length > 0) {
      this.alerts.push({
        id: `alert_${now.getTime()}_error`,
        type: 'error',
        category: 'portfolio',
        message: `Risk validation failed for ${symbol}: ${validation.errors[0]}`,
        severity: 'critical',
        timestamp: now,
        resolved: false,
        actionRequired: true,
        suggestedAction: 'Review risk parameters or skip trade'
      });
    }

    if (validation.riskLevel === 'high' || validation.riskLevel === 'extreme') {
      this.alerts.push({
        id: `alert_${now.getTime()}_warning`,
        type: 'warning',
        category: 'position_size',
        message: `High risk level (${validation.riskLevel}) for ${symbol}: ${riskMetrics.riskPercentage.toFixed(2)}%`,
        severity: validation.riskLevel,
        timestamp: now,
        resolved: false,
        actionRequired: false,
        suggestedAction: 'Consider reducing position size'
      });
    }

    // Clean up old alerts
    this.alerts = this.alerts.filter(alert =>
      now.getTime() - alert.timestamp.getTime() < 24 * 60 * 60 * 1000 // Keep last 24 hours
    );
  }

  /**
   * Calculate correlation between symbols (simplified)
   */
  private calculateCorrelation(symbol1: string, symbol2: string): number {
    // Simplified correlation calculation
    // In practice, this would use historical price data
    if (symbol1 === symbol2) return 1.0;

    // Base correlation for same currency pairs
    const baseCorrelation = 0.3;

    // Adjust for major pairs
    const majorPairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF'];
    if (majorPairs.includes(symbol1) && majorPairs.includes(symbol2)) {
      return baseCorrelation + 0.4;
    }

    return baseCorrelation;
  }

  /**
   * Update portfolio risk metrics
   */
  updatePortfolioRisk(trades: Position[]): PortfolioRisk {
    const totalExposure = trades.reduce((sum, trade) => sum + Math.abs(trade.volume), 0);
    const totalRisk = trades.reduce((sum, trade) => sum + trade.riskAmount, 0);

    // Simplified portfolio heat calculation
    const portfolioHeat = totalRisk / 1000; // Placeholder - would need account balance

    return {
      totalExposure,
      totalRisk,
      correlationMatrix: [], // Would need actual correlation matrix
      portfolioHeat,
      maxDrawdown: this.maxDrawdown,
      dailyLoss: this.dailyLoss,
      weeklyLoss: 0,
      monthlyLoss: 0,
      riskBudgetUsed: portfolioHeat * 100,
      recommendations: []
    };
  }

  /**
   * Get current risk alerts
   */
  getAlerts(): RiskAlert[] {
    return [...this.alerts];
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
    }
  }

  /**
   * Update risk management settings
   */
  updateSettings(newSettings: Partial<RiskManagementSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  /**
   * Get current settings
   */
  getSettings(): RiskManagementSettings {
    return { ...this.settings };
  }

  /**
   * Get risk management statistics
   */
  getStatistics() {
    return {
      totalAlerts: this.alerts.length,
      unresolvedAlerts: this.alerts.filter(a => !a.resolved).length,
      dailyLoss: this.dailyLoss,
      maxDrawdown: this.maxDrawdown,
      lastUpdate: this.lastUpdate
    };
  }

  /**
   * Reset daily metrics
   */
  resetDailyMetrics(): void {
    this.dailyLoss = 0;
    this.alerts = this.alerts.filter(alert =>
      alert.category !== 'daily_loss'
    );
  }

  /**
   * Check if trade is allowed based on risk rules
   */
  isTradeAllowed(
    symbol: string,
    accountInfo: AccountInfo,
    currentPositions: Position[],
    portfolioRisk: PortfolioRisk
  ): { allowed: boolean; reason?: string } {
    // Check maximum positions
    if (currentPositions.length >= this.config.maxPositions) {
      return { allowed: false, reason: 'Maximum positions limit reached' };
    }

    // Check portfolio heat
    if (portfolioRisk.portfolioHeat >= this.config.maxPortfolioRisk) {
      return { allowed: false, reason: 'Portfolio risk limit reached' };
    }

    // Check daily loss limit
    if (this.dailyLoss >= this.settings.maxDailyLoss) {
      return { allowed: false, reason: 'Daily loss limit reached' };
    }

    // Check drawdown limit
    if (this.maxDrawdown >= this.settings.maxDrawdown) {
      return { allowed: false, reason: 'Maximum drawdown reached' };
    }

    return { allowed: true };
  }
}

// Export singleton instance
export const riskManagementService = new RiskManagementService();