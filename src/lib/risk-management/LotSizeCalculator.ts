// @ts-nocheck
/**
 * Advanced Lot Size Calculator
 *
 * Professional position sizing with account risk management,
 * portfolio correlation considerations, and MT5 compatibility.
 */

import { PositionSizeCalculation, AccountInfo, SymbolSpecs, PortfolioRisk, RiskSettings } from '@/types/risk-management';

export interface LotSizeConfig {
  maxRiskPerTrade: number;
  maxPortfolioRisk: number;
  maxAccountRisk: number;
  defaultRiskCurrency: string;
  useCompounding: boolean;
  considerCorrelation: number;
  maxPositions: number;
  useKellyCriterion: boolean;
  kellyFraction: number;
  volatilityAdjustment: boolean;
  drawdownProtection: boolean;
  maxDrawdown: number;
  scalingEnabled: boolean;
  scalingThresholds: number[];
  scalingMultipliers: number[];
}

export interface RiskCalculationInput {
  accountInfo: AccountInfo;
  symbolSpecs: SymbolSpecs;
  stopLossPips: number;
  riskAmount: number;
  portfolioRisk?: PortfolioRisk;
  currentPositions?: Array<{
    symbol: string;
    volume: number;
    direction: 'BUY' | 'SELL';
    correlation?: number;
  }>;
  marketVolatility?: number;
  accountDrawdown?: number;
}

export class LotSizeCalculator {
  private config: LotSizeConfig;

  constructor(config: Partial<LotSizeConfig> = {}) {
    this.config = {
      maxRiskPerTrade: 2.0, // 2% of account
      maxPortfolioRisk: 6.0, // 6% of account
      maxAccountRisk: 10.0, // 10% of account
      defaultRiskCurrency: 'EUR',
      useCompounding: true,
      considerCorrelation: 0.7,
      maxPositions: 10,
      useKellyCriterion: false,
      kellyFraction: 0.25, // Quarter Kelly
      volatilityAdjustment: true,
      drawdownProtection: true,
      maxDrawdown: 20.0, // 20% max drawdown
      scalingEnabled: true,
      scalingThresholds: [5000, 10000, 25000, 50000, 100000],
      scalingMultipliers: [1.0, 0.9, 0.8, 0.7, 0.6],
      ...config
    };
  }

  /**
   * Calculate optimal lot size based on risk parameters
   */
  calculateLotSize(input: RiskCalculationInput): PositionSizeCalculation {
    const {
      accountInfo,
      symbolSpecs,
      stopLossPips,
      riskAmount,
      portfolioRisk,
      currentPositions,
      marketVolatility,
      accountDrawdown
    } = input;

    // Validate inputs
    if (!accountInfo || !symbolSpecs || stopLossPips <= 0) {
      throw new Error('Invalid input parameters for lot size calculation');
    }

    // Calculate pip value per lot
    const pipValuePerLot = this.calculatePipValuePerLot(symbolSpecs);

    // Base calculation: risk_euro / (stop_pips * pip_value_per_lot)
    const baseLotSize = riskAmount / (stopLossPips * pipValuePerLot);

    // Apply account risk limits
    const maxRiskLotSize = this.calculateMaxRiskLotSize(accountInfo, stopLossPips, pipValuePerLot);

    // Apply portfolio risk constraints
    const portfolioAdjustedLotSize = portfolioRisk && currentPositions
      ? this.applyPortfolioRiskConstraints(baseLotSize, portfolioRisk, currentPositions)
      : baseLotSize;

    // Apply volatility adjustment if enabled
    const volatilityAdjustedLotSize = this.config.volatilityAdjustment && marketVolatility
      ? this.applyVolatilityAdjustment(portfolioAdjustedLotSize, marketVolatility)
      : portfolioAdjustedLotSize;

    // Apply drawdown protection if enabled
    const drawdownAdjustedLotSize = this.config.drawdownProtection && accountDrawdown
      ? this.applyDrawdownAdjustment(volatilityAdjustedLotSize, accountDrawdown)
      : volatilityAdjustedLotSize;

    // Apply Kelly Criterion if enabled
    const kellyAdjustedLotSize = this.config.useKellyCriterion
      ? this.applyKellyCriterion(drawdownAdjustedLotSize, accountInfo)
      : drawdownAdjustedLotSize;

    // Apply scaling based on account size
    const scaledLotSize = this.config.scalingEnabled
      ? this.applyAccountScaling(kellyAdjustedLotSize, accountInfo.balance)
      : kellyAdjustedLotSize;

    // Apply MT5 limits
    const finalLotSize = this.applyMT5Limits(scaledLotSize, symbolSpecs);

    return {
      lotSize: finalLotSize,
      riskAmount,
      stopLossPips,
      pipValue: pipValuePerLot,
      maxLotSize: symbolSpecs.maxLot,
      minLotSize: symbolSpecs.minLot,
      suggestedLotSize: finalLotSize
    };
  }

  /**
   * Calculate pip value per lot
   */
  private calculatePipValuePerLot(symbolSpecs: SymbolSpecs): number {
    const { symbol, tickValue, tickSize, contractSize } = symbolSpecs;

    // For most forex pairs, 1 pip = 0.0001
    const pipSize = 0.0001;

    // Calculate pip value based on tick value and tick size
    const pipValue = (tickValue / tickSize) * pipSize * contractSize;

    return pipValue;
  }

  /**
   * Calculate maximum lot size based on account risk limits
   */
  private calculateMaxRiskLotSize(
    accountInfo: AccountInfo,
    stopLossPips: number,
    pipValuePerLot: number
  ): number {
    const { balance, equity } = accountInfo;
    const accountValue = this.config.useCompounding ? equity : balance;

    // Calculate max lot size based on max risk per trade
    const maxRiskAmount = accountValue * (this.config.maxRiskPerTrade / 100);
    const maxRiskLotSize = maxRiskAmount / (stopLossPips * pipValuePerLot);

    return maxRiskLotSize;
  }

  /**
   * Apply portfolio risk constraints
   */
  private applyPortfolioRiskConstraints(
    baseLotSize: number,
    portfolioRisk: PortfolioRisk,
    currentPositions: Array<{
      symbol: string;
      volume: number;
      direction: 'BUY' | 'SELL';
      correlation?: number;
    }>
  ): number {
    // Check if adding this position would exceed portfolio risk limits
    const currentPortfolioHeat = portfolioRisk.portfolioHeat;
    const maxPortfolioHeat = this.config.maxPortfolioRisk;

    if (currentPortfolioHeat >= maxPortfolioHeat) {
      return 0; // No new positions allowed
    }

    // Calculate remaining risk budget
    const remainingRiskBudget = (maxPortfolioHeat - currentPortfolioHeat) / 100;

    // Adjust lot size based on correlation with existing positions
    let correlationAdjustment = 1.0;
    if (currentPositions.length > 0) {
      const avgCorrelation = currentPositions.reduce((sum, pos) => {
        return sum + (pos.correlation || 0);
      }, 0) / currentPositions.length;

      if (avgCorrelation > this.config.considerCorrelation) {
        // High correlation - reduce position size
        correlationAdjustment = 1.0 - (avgCorrelation - this.config.considerCorrelation);
      }
    }

    // Check maximum positions limit
    if (currentPositions.length >= this.config.maxPositions) {
      correlationAdjustment *= 0.5; // Further reduce if at max positions
    }

    return baseLotSize * Math.min(correlationAdjustment, remainingRiskBudget / (this.config.maxRiskPerTrade / 100));
  }

  /**
   * Apply volatility adjustment
   */
  private applyVolatilityAdjustment(lotSize: number, volatility: number): number {
    if (volatility <= 0) return lotSize;

    // Normalize volatility (assuming volatility is standard deviation)
    const normalVolatility = 0.01; // 1% normal volatility
    const volatilityRatio = volatility / normalVolatility;

    // Adjust position size inversely to volatility
    let adjustmentFactor = 1.0 / Math.sqrt(volatilityRatio);
    adjustmentFactor = Math.max(adjustmentFactor, 0.3); // Minimum 30% of original size
    adjustmentFactor = Math.min(adjustmentFactor, 1.5); // Maximum 150% of original size

    return lotSize * adjustmentFactor;
  }

  /**
   * Apply drawdown protection
   */
  private applyDrawdownAdjustment(lotSize: number, drawdown: number): number {
    if (drawdown <= 0) return lotSize;

    // Apply progressive reduction as drawdown increases
    const maxDrawdown = this.config.maxDrawdown;
    const drawdownRatio = drawdown / maxDrawdown;

    let adjustmentFactor = 1.0;

    if (drawdownRatio > 0.5) { // 50% of max drawdown
      adjustmentFactor = Math.max(1.0 - (drawdownRatio - 0.5), 0.1);
    }

    return lotSize * adjustmentFactor;
  }

  /**
   * Apply Kelly Criterion adjustment
   */
  private applyKellyCriterion(lotSize: number, accountInfo: AccountInfo): number {
    // This is a simplified Kelly Criterion implementation
    // In practice, you'd need win rate and average win/loss ratios

    const kellyFraction = this.config.kellyFraction; // Quarter Kelly for safety
    return lotSize * kellyFraction;
  }

  /**
   * Apply account size scaling
   */
  private applyAccountScaling(lotSize: number, accountBalance: number): number {
    if (!this.config.scalingEnabled) return lotSize;

    let scalingMultiplier = 1.0;

    for (let i = 0; i < this.config.scalingThresholds.length; i++) {
      if (accountBalance >= this.config.scalingThresholds[i]) {
        scalingMultiplier = this.config.scalingMultipliers[i];
      }
    }

    return lotSize * scalingMultiplier;
  }

  /**
   * Apply MT5 broker limits
   */
  private applyMT5Limits(lotSize: number, symbolSpecs: SymbolSpecs): number {
    const { minLot, maxLot, lotStep } = symbolSpecs;

    // Ensure minimum lot size
    let finalLotSize = Math.max(lotSize, minLot);

    // Ensure maximum lot size
    finalLotSize = Math.min(finalLotSize, maxLot);

    // Round to nearest lot step
    const steps = Math.round(finalLotSize / lotStep);
    finalLotSize = steps * lotStep;

    return finalLotSize;
  }

  /**
   * Calculate risk amount based on account percentage
   */
  calculateRiskAmount(
    accountInfo: AccountInfo,
    riskPercentage: number = this.config.maxRiskPerTrade
  ): number {
    const accountValue = this.config.useCompounding ? accountInfo.equity : accountInfo.balance;
    return accountValue * (riskPercentage / 100);
  }

  /**
   * Calculate maximum risk amount for current conditions
   */
  calculateMaxRiskAmount(
    accountInfo: AccountInfo,
    portfolioRisk?: PortfolioRisk,
    accountDrawdown?: number
  ): number {
    let maxRisk = this.calculateRiskAmount(accountInfo, this.config.maxRiskPerTrade);

    // Reduce based on portfolio risk
    if (portfolioRisk) {
      const portfolioHeat = portfolioRisk.portfolioHeat;
      const maxPortfolioHeat = this.config.maxPortfolioRisk;

      if (portfolioHeat > 0) {
        const reductionFactor = 1.0 - (portfolioHeat / maxPortfolioHeat);
        maxRisk *= Math.max(reductionFactor, 0.1);
      }
    }

    // Reduce based on drawdown
    if (accountDrawdown && this.config.drawdownProtection) {
      const drawdownRatio = accountDrawdown / this.config.maxDrawdown;
      if (drawdownRatio > 0.5) {
        maxRisk *= Math.max(1.0 - (drawdownRatio - 0.5), 0.1);
      }
    }

    return maxRisk;
  }

  /**
   * Validate lot size against trading rules
   */
  validateLotSize(
    lotSize: number,
    accountInfo: AccountInfo,
    symbolSpecs: SymbolSpecs
  ): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check MT5 limits
    if (lotSize < symbolSpecs.minLot) {
      errors.push(`Lot size ${lotSize} is below minimum ${symbolSpecs.minLot}`);
    }

    if (lotSize > symbolSpecs.maxLot) {
      errors.push(`Lot size ${lotSize} exceeds maximum ${symbolSpecs.maxLot}`);
    }

    // Check margin requirements
    const requiredMargin = this.calculateRequiredMargin(lotSize, symbolSpecs);
    if (requiredMargin > accountInfo.freeMargin) {
      errors.push(`Insufficient margin. Required: ${requiredMargin.toFixed(2)}, Available: ${accountInfo.freeMargin.toFixed(2)}`);
    }

    // Check risk percentage
    const riskPercentage = (lotSize * symbolSpecs.minLot * 1000) / accountInfo.balance * 100; // Simplified
    if (riskPercentage > this.config.maxRiskPerTrade) {
      warnings.push(`Risk percentage ${riskPercentage.toFixed(2)}% exceeds recommended ${this.config.maxRiskPerTrade}%`);
    }

    // Warnings for large positions
    if (lotSize > symbolSpecs.maxLot * 0.8) {
      warnings.push('Large position size - consider scaling in');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Calculate required margin for position
   */
  private calculateRequiredMargin(lotSize: number, symbolSpecs: SymbolSpecs): number {
    // Simplified margin calculation
    const notionalValue = lotSize * symbolSpecs.contractSize;
    return notionalValue / symbolSpecs.leverage;
  }

  /**
   * Generate position sizing recommendations
   */
  generateRecommendations(calculation: PositionSizeCalculation): string[] {
    const recommendations: string[] = [];

    // Lot size recommendations
    if (calculation.lotSize === calculation.minLotSize) {
      recommendations.push('Position size at minimum lot - consider higher probability setups or smaller stops');
    }

    if (calculation.lotSize === calculation.maxLotSize) {
      recommendations.push('Position size at maximum lot - consider scaling into position');
    }

    // Risk-based recommendations
    const riskRatio = calculation.riskAmount / (calculation.stopLossPips * calculation.pipValue);
    if (riskRatio > calculation.maxLotSize * 0.8) {
      recommendations.push('High risk exposure - consider reducing position size or tightening stop loss');
    }

    // Account size recommendations
    if (calculation.lotSize < 0.01) {
      recommendations.push('Small position size due to account constraints - consider account funding');
    }

    return recommendations;
  }

  /**
   * Calculate position scaling plan
   */
  calculateScalingPlan(
    targetLotSize: number,
    symbolSpecs: SymbolSpecs,
    scalingLevels: number = 3
  ): Array<{
    level: number;
    lotSize: number;
    triggerPrice?: number;
    reason: string;
  }> {
    const scalingPlan = [];
    const lotStep = symbolSpecs.lotStep;
    const minLot = symbolSpecs.minLot;

    for (let i = 1; i <= scalingLevels; i++) {
      const levelLotSize = (targetLotSize / scalingLevels) * i;
      const roundedLotSize = Math.max(
        Math.round(levelLotSize / lotStep) * lotStep,
        minLot
      );

      scalingPlan.push({
        level: i,
        lotSize: roundedLotSize,
        reason: `Scaling level ${i} - ${Math.round((i / scalingLevels) * 100)}% of position`
      });
    }

    return scalingPlan;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<LotSizeConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): LotSizeConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const lotSizeCalculator = new LotSizeCalculator();