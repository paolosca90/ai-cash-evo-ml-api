/**
 * Signal Modulation System
 *
 * A comprehensive trading signal modulation system that adjusts trading signals
 * based on sentiment, risk, and confidence factors for AI-powered cryptocurrency trading.
 *
 * @author Claude Code
 * @version 1.0.0
 */

// TypeScript interfaces for Signal Modulation
export interface BaseSignal {
  id: string;
  symbol: string;
  type: "BUY" | "SELL" | "HOLD";
  confidence: number; // 0-100 scale
  intensity: number; // 0-2 scale
  entry_price?: number;
  stop_loss?: number;
  take_profit?: number;
  timestamp: Date;
  source: string;
  metadata?: Record<string, unknown>;
}

export interface SentimentAnalysis {
  score: number; // 1-5 scale (1: very negative, 5: very positive)
  confidence: number; // 0-1 scale
  reasoning: string;
  risk: number; // 1-5 scale (1: very low risk, 5: very high risk)
  key_factors: string[];
  market_context: string;
  timestamp: Date;
}

export interface RiskAssessment {
  overall_risk: number; // 1-5 scale
  market_volatility: number; // 1-5 scale
  liquidity_risk: number; // 1-5 scale
  sentiment_risk: number; // 1-5 scale
  technical_risk: number; // 1-5 scale
  factors: string[];
  confidence: number;
}

export interface MarketConditions {
  volatility: 'low' | 'normal' | 'high' | 'extreme';
  trend_strength: 'weak' | 'moderate' | 'strong';
  liquidity: 'low' | 'normal' | 'high';
  session_type: 'asian' | 'london' | 'new_york' | 'overlap' | 'off_hours';
  market_regime: 'trending' | 'ranging' | 'volatile' | 'breakout';
}

export interface ModulatedSignal extends BaseSignal {
  original_confidence: number;
  original_intensity: number;
  sentiment_multiplier: number;
  risk_penalty: number;
  confidence_bonus: number;
  final_intensity: number;
  risk_adjusted_position_size: number;
  quality_score: number;
  reasoning: string[];
  should_execute: boolean;
  execution_priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface PerformanceMetrics {
  total_signals: number;
  executed_signals: number;
  successful_signals: number;
  win_rate: number;
  average_profit: number;
  average_loss: number;
  profit_factor: number;
  max_drawdown: number;
  sharpe_ratio: number;
  sortino_ratio: number;
}

export interface SignalHistory {
  signal_id: string;
  modulated_signal: ModulatedSignal;
  actual_outcome: number; // profit/loss in percentage
  execution_price: number;
  exit_price: number;
  execution_timestamp: Date;
  exit_timestamp: Date;
  market_conditions_at_execution: MarketConditions;
}

export interface ModulationConfig {
  sentiment_weight: number;
  risk_weight: number;
  confidence_weight: number;
  market_condition_weights: {
    volatility: number;
    trend: number;
    liquidity: number;
    session: number;
  };
  threshold_adjustments: {
    min_confidence: number;
    min_intensity: number;
    max_risk: number;
    quality_threshold: number;
  };
  position_sizing: {
    base_size: number;
    max_size: number;
    risk_per_trade: number;
    kelly_fraction: number;
  };
}

export class SignalModulationService {
  private config: ModulationConfig;
  private signalHistory: SignalHistory[] = [];
  private performanceMetrics: PerformanceMetrics;

  constructor(config: Partial<ModulationConfig> = {}) {
    this.config = {
      sentiment_weight: 0.4,
      risk_weight: 0.3,
      confidence_weight: 0.3,
      market_condition_weights: {
        volatility: 0.25,
        trend: 0.3,
        liquidity: 0.2,
        session: 0.25,
      },
      threshold_adjustments: {
        min_confidence: 60,
        min_intensity: 0.3,
        max_risk: 4,
        quality_threshold: 0.65,
      },
      position_sizing: {
        base_size: 0.02, // 2% of account
        max_size: 0.10, // 10% of account
        risk_per_trade: 0.01, // 1% risk per trade
        kelly_fraction: 0.25, // 25% of Kelly criterion
      },
      ...config,
    };

    this.performanceMetrics = this.initializePerformanceMetrics();
  }

  /**
   * Main modulation function that adjusts trading signals based on multiple factors
   */
  public async modulateSignal(
    baseSignal: BaseSignal,
    sentimentAnalysis: SentimentAnalysis,
    riskAssessment: RiskAssessment,
    marketConditions: MarketConditions
  ): Promise<ModulatedSignal> {
    try {
      // Calculate modulation factors
      const sentimentMultiplier = this.calculateSentimentMultiplier(sentimentAnalysis);
      const riskPenalty = this.calculateRiskPenalty(riskAssessment);
      const confidenceBonus = this.calculateConfidenceBonus(baseSignal, sentimentAnalysis);

      // Apply modulation formula: final_intensity = base_intensity * sentiment_multiplier * (1 + risk_penalty + confidence_bonus)
      let finalIntensity = baseSignal.intensity;
      finalIntensity *= sentimentMultiplier;
      finalIntensity *= (1 + riskPenalty + confidenceBonus);

      // Clamp final intensity to [0.1, 2.0] range as specified
      finalIntensity = Math.max(0.1, Math.min(2.0, finalIntensity));

      // Calculate risk-adjusted position size
      const riskAdjustedPositionSize = this.calculatePositionSize(
        finalIntensity,
        riskAssessment,
        marketConditions
      );

      // Calculate signal quality score
      const qualityScore = this.calculateSignalQuality(
        baseSignal,
        sentimentAnalysis,
        riskAssessment,
        marketConditions,
        finalIntensity
      );

      // Generate reasoning for modulation decisions
      const reasoning = this.generateModulationReasoning(
        baseSignal,
        sentimentMultiplier,
        riskPenalty,
        confidenceBonus,
        finalIntensity,
        qualityScore
      );

      // Determine if signal should be executed
      const shouldExecute = this.shouldExecuteSignal(finalIntensity, qualityScore, riskAssessment);

      // Determine execution priority
      const executionPriority = this.determineExecutionPriority(finalIntensity, qualityScore, shouldExecute);

      const modulatedSignal: ModulatedSignal = {
        ...baseSignal,
        original_confidence: baseSignal.confidence,
        original_intensity: baseSignal.intensity,
        sentiment_multiplier: sentimentMultiplier,
        risk_penalty: riskPenalty,
        confidence_bonus: confidenceBonus,
        final_intensity: finalIntensity,
        risk_adjusted_position_size: riskAdjustedPositionSize,
        quality_score: qualityScore,
        reasoning,
        should_execute: shouldExecute,
        execution_priority: executionPriority,
      };

      console.log(`🎯 Signal Modulated: ${baseSignal.symbol} ${baseSignal.type}`);
      console.log(`📊 Original Intensity: ${baseSignal.intensity.toFixed(3)} → Final: ${finalIntensity.toFixed(3)}`);
      console.log(`🎨 Multipliers: Sentiment(${sentimentMultiplier.toFixed(3)}) Risk(${riskPenalty.toFixed(3)}) Confidence(${confidenceBonus.toFixed(3)})`);
      console.log(`📈 Quality Score: ${qualityScore.toFixed(3)} | Should Execute: ${shouldExecute}`);

      return modulatedSignal;
    } catch (error) {
      console.error('❌ Signal modulation failed:', error);
      throw new Error(`Signal modulation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate sentiment multiplier: (sentiment-3)*0.1
   */
  private calculateSentimentMultiplier(sentimentAnalysis: SentimentAnalysis): number {
    const { score, confidence } = sentimentAnalysis;

    // Apply formula: (sentiment-3)*0.1
    let multiplier = (score - 3) * 0.1;

    // Adjust by confidence
    multiplier *= (0.5 + confidence * 0.5); // Scale by confidence (0.5-1.0)

    return multiplier;
  }

  /**
   * Calculate risk penalty: risk>3?-0.15:0
   */
  private calculateRiskPenalty(riskAssessment: RiskAssessment): number {
    const { overall_risk, confidence } = riskAssessment;

    // Apply formula: risk>3?-0.15:0
    let penalty = overall_risk > 3 ? -0.15 : 0;

    // Adjust by confidence in risk assessment
    penalty *= confidence;

    return penalty;
  }

  /**
   * Calculate confidence bonus: confidence>70?0.05:0
   */
  private calculateConfidenceBonus(baseSignal: BaseSignal, sentimentAnalysis: SentimentAnalysis): number {
    // Apply formula: confidence>70?0.05:0
    const baseConfidence = baseSignal.confidence > 70 ? 0.05 : 0;
    const sentimentConfidence = sentimentAnalysis.confidence > 0.7 ? 0.03 : 0;

    return baseConfidence + sentimentConfidence;
  }

  /**
   * Calculate risk-adjusted position size
   */
  private calculatePositionSize(
    intensity: number,
    riskAssessment: RiskAssessment,
    marketConditions: MarketConditions
  ): number {
    const { base_size, max_size, risk_per_trade } = this.config.position_sizing;

    // Base size adjusted by intensity
    let positionSize = base_size * intensity;

    // Adjust by risk level (lower risk = larger position)
    const riskAdjustment = Math.max(0.5, 1 - (riskAssessment.overall_risk - 1) / 4);
    positionSize *= riskAdjustment;

    // Adjust by market conditions
    const volatilityAdjustment = this.getVolatilityAdjustment(marketConditions.volatility);
    const liquidityAdjustment = this.getLiquidityAdjustment(marketConditions.liquidity);

    positionSize *= volatilityAdjustment;
    positionSize *= liquidityAdjustment;

    // Apply maximum position size constraint
    positionSize = Math.min(max_size, positionSize);

    // Ensure we don't exceed risk per trade
    const maxRiskSize = risk_per_trade / (riskAssessment.overall_risk / 5);
    positionSize = Math.min(maxRiskSize, positionSize);

    return positionSize;
  }

  /**
   * Calculate signal quality score (0-1 scale)
   */
  private calculateSignalQuality(
    signal: BaseSignal,
    sentiment: SentimentAnalysis,
    risk: RiskAssessment,
    market: MarketConditions,
    finalIntensity: number
  ): number {
    const { sentiment_weight, risk_weight, confidence_weight } = this.config;

    // Sentiment quality
    const sentimentQuality = (sentiment.score - 3) / 2; // Normalize to [-1, 1]
    const weightedSentiment = sentimentQuality * sentiment_weight * sentiment.confidence;

    // Risk quality (inverse of risk)
    const riskQuality = (5 - risk.overall_risk) / 4; // Normalize to [0, 1]
    const weightedRisk = riskQuality * risk_weight * risk.confidence;

    // Confidence quality
    const confidenceQuality = signal.confidence / 100; // Normalize to [0, 1]
    const weightedConfidence = confidenceQuality * confidence_weight;

    // Market conditions quality
    const marketQuality = this.calculateMarketQuality(market);

    // Combine all factors
    let qualityScore = weightedSentiment + weightedRisk + weightedConfidence + marketQuality;

    // Adjust by final intensity (moderate intensity is preferred)
    const intensityAdjustment = 1 - Math.abs(finalIntensity - 1) * 0.3;
    qualityScore *= intensityAdjustment;

    // Normalize to [0, 1]
    return Math.max(0, Math.min(1, qualityScore));
  }

  /**
   * Generate detailed reasoning for modulation decisions
   */
  private generateModulationReasoning(
    signal: BaseSignal,
    sentimentMultiplier: number,
    riskPenalty: number,
    confidenceBonus: number,
    finalIntensity: number,
    qualityScore: number
  ): string[] {
    const reasoning: string[] = [];

    // Sentiment reasoning
    if (Math.abs(sentimentMultiplier - 1) > 0.01) {
      if (sentimentMultiplier > 1) {
        reasoning.push(`Positive sentiment multiplier (+${((sentimentMultiplier - 1) * 100).toFixed(1)}%)`);
      } else {
        reasoning.push(`Negative sentiment multiplier (${((sentimentMultiplier - 1) * 100).toFixed(1)}%)`);
      }
    }

    // Risk reasoning
    if (riskPenalty !== 0) {
      reasoning.push(`Risk penalty applied (${(riskPenalty * 100).toFixed(1)}%)`);
    }

    // Confidence reasoning
    if (confidenceBonus > 0) {
      reasoning.push(`High confidence bonus (+${(confidenceBonus * 100).toFixed(1)}%)`);
    }

    // Intensity reasoning
    if (Math.abs(finalIntensity - signal.intensity) > 0.1) {
      const change = ((finalIntensity - signal.intensity) / signal.intensity * 100);
      reasoning.push(`Intensity adjusted ${change > 0 ? 'up' : 'down'} ${Math.abs(change).toFixed(1)}%`);
    }

    // Quality reasoning
    if (qualityScore >= 0.8) {
      reasoning.push('High quality signal');
    } else if (qualityScore >= 0.65) {
      reasoning.push('Good quality signal');
    } else if (qualityScore >= 0.5) {
      reasoning.push('Moderate quality signal');
    } else {
      reasoning.push('Low quality signal');
    }

    return reasoning;
  }

  /**
   * Determine if signal should be executed
   */
  private shouldExecuteSignal(
    intensity: number,
    qualityScore: number,
    riskAssessment: RiskAssessment
  ): boolean {
    const { min_confidence, min_intensity, max_risk, quality_threshold } = this.config.threshold_adjustments;

    // Check minimum requirements
    if (intensity < min_intensity) return false;
    if (qualityScore < quality_threshold) return false;
    if (riskAssessment.overall_risk > max_risk) return false;

    return true;
  }

  /**
   * Determine execution priority
   */
  private determineExecutionPriority(
    intensity: number,
    qualityScore: number,
    shouldExecute: boolean
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (!shouldExecute) return 'low';

    if (qualityScore >= 0.85 && intensity >= 1.5) return 'critical';
    if (qualityScore >= 0.75 && intensity >= 1.2) return 'high';
    if (qualityScore >= 0.65 && intensity >= 0.8) return 'medium';
    return 'low';
  }

  /**
   * Calculate market quality score
   */
  private calculateMarketQuality(market: MarketConditions): number {
    const weights = this.config.market_condition_weights;

    let score = 0;

    // Volatility score (normal volatility preferred)
    const volatilityScore = market.volatility === 'normal' ? 1 :
                          market.volatility === 'low' ? 0.8 :
                          market.volatility === 'high' ? 0.6 : 0.3;
    score += volatilityScore * weights.volatility;

    // Trend score (moderate to strong trend preferred)
    const trendScore = market.trend_strength === 'strong' ? 1 :
                      market.trend_strength === 'moderate' ? 0.9 : 0.6;
    score += trendScore * weights.trend;

    // Liquidity score (high liquidity preferred)
    const liquidityScore = market.liquidity === 'high' ? 1 :
                           market.liquidity === 'normal' ? 0.8 : 0.5;
    score += liquidityScore * weights.liquidity;

    // Session score (overlap and major sessions preferred)
    const sessionScore = market.session_type === 'overlap' ? 1 :
                        market.session_type === 'london' || market.session_type === 'new_york' ? 0.9 :
                        market.session_type === 'asian' ? 0.7 : 0.5;
    score += sessionScore * weights.session;

    return score;
  }

  /**
   * Get volatility adjustment factor
   */
  private getVolatilityAdjustment(volatility: string): number {
    switch (volatility) {
      case 'low': return 1.2;
      case 'normal': return 1.0;
      case 'high': return 0.7;
      case 'extreme': return 0.4;
      default: return 1.0;
    }
  }

  /**
   * Get liquidity adjustment factor
   */
  private getLiquidityAdjustment(liquidity: string): number {
    switch (liquidity) {
      case 'low': return 0.6;
      case 'normal': return 1.0;
      case 'high': return 1.3;
      default: return 1.0;
    }
  }

  /**
   * Initialize performance metrics
   */
  private initializePerformanceMetrics(): PerformanceMetrics {
    return {
      total_signals: 0,
      executed_signals: 0,
      successful_signals: 0,
      win_rate: 0,
      average_profit: 0,
      average_loss: 0,
      profit_factor: 0,
      max_drawdown: 0,
      sharpe_ratio: 0,
      sortino_ratio: 0,
    };
  }

  /**
   * Record signal execution and outcome
   */
  public recordSignalOutcome(
    modulatedSignal: ModulatedSignal,
    executionPrice: number,
    exitPrice: number,
    exitTimestamp: Date,
    marketConditions: MarketConditions
  ): void {
    const outcome = ((exitPrice - executionPrice) / executionPrice) * 100;
    const isBuySignal = modulatedSignal.type === 'BUY';
    const actualOutcome = isBuySignal ? outcome : -outcome;

    const historyEntry: SignalHistory = {
      signal_id: modulatedSignal.id,
      modulated_signal: modulatedSignal,
      actual_outcome: actualOutcome,
      execution_price: executionPrice,
      exit_price: exitPrice,
      execution_timestamp: new Date(),
      exit_timestamp: exitTimestamp,
      market_conditions_at_execution: marketConditions,
    };

    this.signalHistory.push(historyEntry);
    this.updatePerformanceMetrics();
  }

  /**
   * Update performance metrics based on signal history
   */
  private updatePerformanceMetrics(): void {
    const executedSignals = this.signalHistory.filter(h =>
      h.modulated_signal.should_execute
    );

    const totalSignals = this.signalHistory.length;
    const executedCount = executedSignals.length;
    const successfulSignals = executedSignals.filter(h => h.actual_outcome > 0);

    const winRate = executedCount > 0 ? successfulSignals.length / executedCount : 0;

    const profits = executedSignals.filter(h => h.actual_outcome > 0).map(h => h.actual_outcome);
    const losses = executedSignals.filter(h => h.actual_outcome < 0).map(h => Math.abs(h.actual_outcome));

    const avgProfit = profits.length > 0 ? profits.reduce((a, b) => a + b, 0) / profits.length : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / losses.length : 0;

    const totalProfit = profits.reduce((a, b) => a + b, 0);
    const totalLoss = losses.reduce((a, b) => a + b, 0);
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : 0;

    // Calculate drawdown
    const cumulativeReturns = this.signalHistory.map((h, i) =>
      this.signalHistory.slice(0, i + 1).reduce((sum, curr) => sum + curr.actual_outcome, 0)
    );
    const maxDrawdown = Math.max(0, Math.max(...cumulativeReturns) - Math.min(...cumulativeReturns));

    // Calculate Sharpe ratio (simplified)
    const returns = executedSignals.map(h => h.actual_outcome);
    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const stdReturn = returns.length > 1 ? Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (returns.length - 1)
    ) : 0;
    const sharpeRatio = stdReturn > 0 ? avgReturn / stdReturn * Math.sqrt(252) : 0;

    // Calculate Sortino ratio (simplified)
    const negativeReturns = returns.filter(r => r < 0);
    const downsideStd = negativeReturns.length > 1 ? Math.sqrt(
      negativeReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / negativeReturns.length
    ) : 0;
    const sortinoRatio = downsideStd > 0 ? avgReturn / downsideStd * Math.sqrt(252) : 0;

    this.performanceMetrics = {
      total_signals: totalSignals,
      executed_signals: executedCount,
      successful_signals: successfulSignals.length,
      win_rate: winRate,
      average_profit: avgProfit,
      average_loss: avgLoss,
      profit_factor: profitFactor,
      max_drawdown: maxDrawdown,
      sharpe_ratio: sharpeRatio,
      sortino_ratio: sortinoRatio,
    };
  }

  /**
   * Get current performance metrics
   */
  public getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Get signal history
   */
  public getSignalHistory(): SignalHistory[] {
    return [...this.signalHistory];
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<ModulationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  public getConfig(): ModulationConfig {
    return { ...this.config };
  }

  /**
   * Reset service state
   */
  public reset(): void {
    this.signalHistory = [];
    this.performanceMetrics = this.initializePerformanceMetrics();
  }

  /**
   * Export service state
   */
  public exportState(): {
    config: ModulationConfig;
    signalHistory: SignalHistory[];
    performanceMetrics: PerformanceMetrics;
  } {
    return {
      config: this.config,
      signalHistory: this.signalHistory,
      performanceMetrics: this.performanceMetrics,
    };
  }

  /**
   * Import service state
   */
  public importState(state: {
    config: ModulationConfig;
    signalHistory: SignalHistory[];
    performanceMetrics: PerformanceMetrics;
  }): void {
    this.config = state.config;
    this.signalHistory = state.signalHistory;
    this.performanceMetrics = state.performanceMetrics;
  }
}

// Export singleton instance
export const signalModulationService = new SignalModulationService();

// Export utility functions
export const createDefaultSentimentAnalysis = (): SentimentAnalysis => ({
  score: 3,
  confidence: 0.5,
  reasoning: 'Default neutral sentiment',
  risk: 3,
  key_factors: ['No sentiment data available'],
  market_context: 'Unknown',
  timestamp: new Date(),
});

export const createDefaultRiskAssessment = (): RiskAssessment => ({
  overall_risk: 3,
  market_volatility: 3,
  liquidity_risk: 3,
  sentiment_risk: 3,
  technical_risk: 3,
  factors: ['Default risk assessment'],
  confidence: 0.5,
});

export const createDefaultMarketConditions = (): MarketConditions => ({
  volatility: 'normal',
  trend_strength: 'moderate',
  liquidity: 'normal',
  session_type: 'london',
  market_regime: 'ranging',
});

export default SignalModulationService;