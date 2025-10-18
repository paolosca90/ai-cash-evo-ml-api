import {
  MarketRegime,
  AgentType,
  AgentPerformanceMetrics,
  VolatilityAnalysis,
  TrendAnalysis,
  AgentRecommendation
} from '../types/market-regime-detection';

export interface PPOConfig {
  learningRate: number;
  clipRange: number;
  epochs: number;
  batchSize: number;
  gamma: number;
  gaeLambda: number;
  entropyCoeff: number;
  valueLossCoeff: number;
  maxGradNorm: number;
}

export interface CPPOConfig extends PPOConfig {
  riskThreshold: number;
  constraintBound: number;
  safetyMargin: number;
  drawdownLimit: number;
  maxPositionSize: number;
}

export interface AgentDecision {
  agent: 'PPO' | 'CPPO';
  confidence: number;
  reasoning: string;
  riskAssessment: {
    level: number;
    factors: string[];
  };
  expectedReturn: number;
  expectedRisk: number;
}

export interface PerformanceComparison {
  ppoMetrics: AgentPerformanceMetrics;
  cppoMetrics: AgentPerformanceMetrics;
  advantagePPO: number;
  advantageCPPO: number;
  regimeComparison: Record<string, { ppo: number; cppo: number }>;
  marketConditions: {
    favorPPO: string[];
    favorCPPO: string[];
  };
}

export class PPOCPPOAgentSelector {
  private ppoConfig: PPOConfig;
  private cppoConfig: CPPOConfig;
  private decisionHistory: AgentDecision[] = [];
  private performanceHistory: PerformanceComparison[] = [];

  constructor(
    ppoConfig: Partial<PPOConfig> = {},
    cppoConfig: Partial<CPPOConfig> = {}
  ) {
    // Default PPO configuration optimized for trading
    this.ppoConfig = {
      learningRate: 0.0003,
      clipRange: 0.2,
      epochs: 10,
      batchSize: 64,
      gamma: 0.99,
      gaeLambda: 0.95,
      entropyCoeff: 0.01,
      valueLossCoeff: 0.5,
      maxGradNorm: 0.5,
      ...ppoConfig
    };

    // Default CPPO configuration with safety constraints
    this.cppoConfig = {
      ...this.ppoConfig,
      riskThreshold: 0.15,
      constraintBound: 0.1,
      safetyMargin: 0.05,
      drawdownLimit: 0.02,
      maxPositionSize: 0.1,
      ...cppoConfig
    };
  }

  /**
   * Main selection logic - chooses between PPO and CPPO based on market conditions
   */
  public selectAgent(
    regime: MarketRegime,
    volatility: VolatilityAnalysis,
    trend: TrendAnalysis,
    ppoPerformance: AgentPerformanceMetrics,
    cppoPerformance: AgentPerformanceMetrics
  ): AgentDecision {
    // Analyze market conditions
    const marketConditions = this.analyzeMarketConditions(regime, volatility, trend);

    // Calculate agent scores
    const ppoScore = this.calculatePPScore(marketConditions, ppoPerformance);
    const cppoScore = this.calculateCPPOScore(marketConditions, cppoPerformance);

    // Determine the best agent
    const selectedAgent = this.determineBestAgent(ppoScore, cppoScore, marketConditions);

    // Generate reasoning
    const reasoning = this.generateReasoning(selectedAgent, marketConditions, ppoScore, cppoScore);

    // Assess risk
    const riskAssessment = this.assessRisk(selectedAgent, marketConditions);

    // Calculate expected returns and risk
    const { expectedReturn, expectedRisk } = this.calculateExpectedOutcomes(
      selectedAgent,
      marketConditions,
      selectedAgent === 'PPO' ? ppoPerformance : cppoPerformance
    );

    const decision: AgentDecision = {
      agent: selectedAgent,
      confidence: Math.abs(ppoScore - cppoScore),
      reasoning,
      riskAssessment,
      expectedReturn,
      expectedRisk
    };

    // Store decision
    this.decisionHistory.push(decision);

    // Update performance comparison
    this.updatePerformanceComparison(ppoPerformance, cppoPerformance);

    return decision;
  }

  /**
   * Analyze current market conditions for agent selection
   */
  private analyzeMarketConditions(
    regime: MarketRegime,
    volatility: VolatilityAnalysis,
    trend: TrendAnalysis
  ): {
    riskLevel: number;
    trendStrength: number;
    volatilityLevel: number;
    marketStability: number;
    profitPotential: number;
    riskRewardRatio: number;
    constraintsNeeded: boolean;
  } {
    const riskLevel = this.calculateRiskLevel(regime, volatility);
    const trendStrength = this.calculateTrendStrength(regime, trend);
    const volatilityLevel = this.calculateVolatilityScore(volatility);
    const marketStability = this.calculateMarketStability(regime, volatility);
    const profitPotential = this.calculateProfitPotential(regime, trend);
    const riskRewardRatio = this.calculateRiskRewardRatio(profitPotential, riskLevel);
    const constraintsNeeded = this.needsConstraints(riskLevel, volatilityLevel);

    return {
      riskLevel,
      trendStrength,
      volatilityLevel,
      marketStability,
      profitPotential,
      riskRewardRatio,
      constraintsNeeded
    };
  }

  private calculateRiskLevel(regime: MarketRegime, volatility: VolatilityAnalysis): number {
    let risk = 0.5;

    // Base risk from regime
    switch (regime.trendDirection) {
      case 'strong_up':
      case 'strong_down':
        risk += 0.2;
        break;
      case 'moderate_up':
      case 'moderate_down':
        risk += 0.1;
        break;
      case 'sideways':
        risk -= 0.1;
        break;
    }

    // Volatility risk
    switch (volatility.currentLevel) {
      case 'extreme':
        risk += 0.3;
        break;
      case 'high':
        risk += 0.2;
        break;
      case 'medium':
        risk += 0.1;
        break;
      case 'low':
        risk -= 0.1;
        break;
    }

    // Regime stability
    risk += (1 - regime.stability) * 0.2;

    return Math.max(0, Math.min(1, risk));
  }

  private calculateTrendStrength(regime: MarketRegime, trend: TrendAnalysis): number {
    const trendStrengthMap = {
      'strong_up': 1.0,
      'moderate_up': 0.7,
      'sideways': 0.0,
      'moderate_down': 0.7,
      'strong_down': 1.0
    };

    const regimeStrength = trendStrengthMap[regime.trendDirection];
    const technicalStrength = trend.strength;

    return (regimeStrength + technicalStrength) / 2;
  }

  private calculateVolatilityScore(volatility: VolatilityAnalysis): number {
    const volatilityMap = {
      'low': 0.2,
      'medium': 0.5,
      'high': 0.8,
      'extreme': 1.0
    };

    return volatilityMap[volatility.currentLevel];
  }

  private calculateMarketStability(regime: MarketRegime, volatility: VolatilityAnalysis): number {
    const regimeStability = regime.stability;
    const volatilityStability = volatility.regimeStability;

    return (regimeStability + volatilityStability) / 2;
  }

  private calculateProfitPotential(regime: MarketRegime, trend: TrendAnalysis): number {
    let potential = 0.5;

    // Trend potential
    if (regime.trendDirection !== 'sideways') {
      potential += 0.3;
    }

    // Momentum potential
    if (regime.momentumState === 'accelerating') {
      potential += 0.2;
    }

    // Technical strength
    potential += trend.strength * 0.2;

    return Math.min(1, potential);
  }

  private calculateRiskRewardRatio(profitPotential: number, riskLevel: number): number {
    return profitPotential / Math.max(riskLevel, 0.1);
  }

  private needsConstraints(riskLevel: number, volatilityLevel: number): boolean {
    return riskLevel > 0.7 || volatilityLevel > 0.8;
  }

  /**
   * Calculate PPO score based on market conditions
   */
  private calculatePPScore(
    conditions: ReturnType<typeof this.analyzeMarketConditions>,
    performance: AgentPerformanceMetrics
  ): number {
    let score = 0.5;

    // PPO performs better in stable, trending conditions
    if (conditions.marketStability > 0.7) {
      score += 0.2;
    }

    if (conditions.trendStrength > 0.6) {
      score += 0.2;
    }

    // PPO can handle moderate volatility
    if (conditions.volatilityLevel < 0.7) {
      score += 0.1;
    }

    // Performance-based adjustment
    score += performance.sharpeRatio * 0.1;
    score += performance.stabilityScore * 0.1;

    // High risk-reward favors PPO
    if (conditions.riskRewardRatio > 2) {
      score += 0.1;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Calculate CPPO score based on market conditions
   */
  private calculateCPPOScore(
    conditions: ReturnType<typeof this.analyzeMarketConditions>,
    performance: AgentPerformanceMetrics
  ): number {
    let score = 0.5;

    // CPPO performs better in high-risk, volatile conditions
    if (conditions.riskLevel > 0.6) {
      score += 0.3;
    }

    if (conditions.volatilityLevel > 0.7) {
      score += 0.2;
    }

    // CPPO excels when constraints are needed
    if (conditions.constraintsNeeded) {
      score += 0.2;
    }

    // Performance in high-risk scenarios
    const highRiskPerformance = this.getHighRiskPerformance(performance);
    score += highRiskPerformance * 0.15;

    // Stability in volatile conditions
    if (conditions.marketStability < 0.5) {
      score += performance.stabilityScore * 0.15;
    }

    return Math.max(0, Math.min(1, score));
  }

  private getHighRiskPerformance(performance: AgentPerformanceMetrics): number {
    // Calculate performance in high-risk regimes
    const highRiskRegimes = ['strong_up', 'strong_down'];
    let totalPerformance = 0;
    let count = 0;

    highRiskRegimes.forEach(regime => {
      if (performance.regimePerformance[regime] !== undefined) {
        totalPerformance += performance.regimePerformance[regime];
        count++;
      }
    });

    return count > 0 ? totalPerformance / count : 0.5;
  }

  /**
   * Determine the best agent based on scores and conditions
   */
  private determineBestAgent(
    ppoScore: number,
    cppoScore: number,
    conditions: ReturnType<typeof this.analyzeMarketConditions>
  ): 'PPO' | 'CPPO' {
    // Always use CPPO if constraints are strongly needed
    if (conditions.constraintsNeeded && conditions.riskLevel > 0.8) {
      return 'CPPO';
    }

    // Use CPPO in extreme volatility
    if (conditions.volatilityLevel > 0.9) {
      return 'CPPO';
    }

    // Use PPO in stable, trending conditions
    if (conditions.marketStability > 0.8 && conditions.trendStrength > 0.7) {
      return 'PPO';
    }

    // Default to higher score
    return ppoScore > cppoScore ? 'PPO' : 'CPPO';
  }

  /**
   * Generate detailed reasoning for agent selection
   */
  private generateReasoning(
    selectedAgent: 'PPO' | 'CPPO',
    conditions: ReturnType<typeof this.analyzeMarketConditions>,
    ppoScore: number,
    cppoScore: number
  ): string {
    const reasons = [];

    // Market condition reasoning
    if (selectedAgent === 'CPPO') {
      if (conditions.constraintsNeeded) {
        reasons.push('Safety constraints required due to high market risk');
      }
      if (conditions.volatilityLevel > 0.7) {
        reasons.push('Constrained policy optimal for current volatility levels');
      }
      if (conditions.riskLevel > 0.7) {
        reasons.push('CPPO better suited for high-risk market conditions');
      }
    } else {
      if (conditions.marketStability > 0.7) {
        reasons.push('Stable market conditions favor standard PPO');
      }
      if (conditions.trendStrength > 0.6) {
        reasons.push('Strong trend benefits from unconstrained exploration');
      }
      if (conditions.volatilityLevel < 0.5) {
        reasons.push('Low volatility environment suitable for standard PPO');
      }
    }

    // Performance reasoning
    if (Math.abs(ppoScore - cppoScore) > 0.2) {
      reasons.push(`Clear performance advantage for ${selectedAgent}`);
    }

    // Risk-reward reasoning
    if (conditions.riskRewardRatio > 2 && selectedAgent === 'PPO') {
      reasons.push('Favorable risk-reward ratio supports aggressive approach');
    } else if (conditions.riskRewardRatio < 1 && selectedAgent === 'CPPO') {
      reasons.push('Unfavorable risk-reward ratio requires conservative approach');
    }

    return reasons.join('. ');
  }

  /**
   * Risk assessment for the selected agent
   */
  private assessRisk(
    selectedAgent: 'PPO' | 'CPPO',
    conditions: ReturnType<typeof this.analyzeMarketConditions>
  ): { level: number; factors: string[] } {
    const factors = [];
    let level = conditions.riskLevel;

    if (selectedAgent === 'PPO') {
      // PPO-specific risks
      if (conditions.constraintsNeeded) {
        level += 0.2;
        factors.push('Unconstrained policy in high-risk environment');
      }
      if (conditions.volatilityLevel > 0.7) {
        level += 0.1;
        factors.push('Standard policy may struggle with high volatility');
      }
    } else {
      // CPPO-specific risks (generally lower)
      level *= 0.8;
      factors.push('Constrained policy reduces risk exposure');
    }

    // General risk factors
    if (conditions.marketStability < 0.3) {
      level += 0.15;
      factors.push('High market instability detected');
    }

    if (conditions.volatilityLevel > 0.8) {
      level += 0.1;
      factors.push('Extreme volatility conditions');
    }

    return {
      level: Math.max(0, Math.min(1, level)),
      factors
    };
  }

  /**
   * Calculate expected returns and risk
   */
  private calculateExpectedOutcomes(
    selectedAgent: 'PPO' | 'CPPO',
    conditions: ReturnType<typeof this.analyzeMarketConditions>,
    performance: AgentPerformanceMetrics
  ): { expectedReturn: number; expectedRisk: number } {
    const baseReturn = performance.averageReturn || 0;
    const baseRisk = 1 - performance.stabilityScore;

    let expectedReturn = baseReturn;
    let expectedRisk = baseRisk;

    // Adjust based on market conditions
    if (selectedAgent === 'PPO') {
      // PPO performs better in trending conditions
      expectedReturn *= (1 + conditions.trendStrength * 0.3);
      expectedRisk *= (1 + conditions.volatilityLevel * 0.2);
    } else {
      // CPPO more consistent in volatile conditions
      expectedReturn *= (1 - conditions.volatilityLevel * 0.1);
      expectedRisk *= (1 - conditions.volatilityLevel * 0.3);
    }

    return {
      expectedReturn: Math.max(-1, Math.min(1, expectedReturn)),
      expectedRisk: Math.max(0, Math.min(1, expectedRisk))
    };
  }

  /**
   * Update performance comparison tracking
   */
  private updatePerformanceComparison(
    ppoPerformance: AgentPerformanceMetrics,
    cppoPerformance: AgentPerformanceMetrics
  ): void {
    const comparison: PerformanceComparison = {
      ppoMetrics: ppoPerformance,
      cppoMetrics: cppoPerformance,
      advantagePPO: this.calculateAdvantage(ppoPerformance, cppoPerformance, 'PPO'),
      advantageCPPO: this.calculateAdvantage(cppoPerformance, ppoPerformance, 'CPPO'),
      regimeComparison: this.createRegimeComparison(ppoPerformance, cppoPerformance),
      marketConditions: this.getMarketConditionsPreference()
    };

    this.performanceHistory.push(comparison);

    // Keep only recent history
    if (this.performanceHistory.length > 100) {
      this.performanceHistory = this.performanceHistory.slice(-100);
    }
  }

  private calculateAdvantage(
    performance1: AgentPerformanceMetrics,
    performance2: AgentPerformanceMetrics,
    agent: 'PPO' | 'CPPO'
  ): number {
    const sharpeAdvantage = performance1.sharpeRatio - performance2.sharpeRatio;
    const stabilityAdvantage = performance1.stabilityScore - performance2.stabilityScore;
    const returnAdvantage = (performance1.averageReturn || 0) - (performance2.averageReturn || 0);

    // Agent-specific weighting
    const weights = agent === 'PPO' ?
      { sharpe: 0.4, stability: 0.3, returns: 0.3 } :
      { sharpe: 0.3, stability: 0.5, returns: 0.2 };

    return (sharpeAdvantage * weights.sharpe +
            stabilityAdvantage * weights.stability +
            returnAdvantage * weights.returns);
  }

  private createRegimeComparison(
    ppoPerformance: AgentPerformanceMetrics,
    cppoPerformance: AgentPerformanceMetrics
  ): Record<string, { ppo: number; cppo: number }> {
    const regimes = ['strong_up', 'moderate_up', 'sideways', 'moderate_down', 'strong_down'];
    const comparison: Record<string, { ppo: number; cppo: number }> = {};

    regimes.forEach(regime => {
      comparison[regime] = {
        ppo: ppoPerformance.regimePerformance[regime] || 0.5,
        cppo: cppoPerformance.regimePerformance[regime] || 0.5
      };
    });

    return comparison;
  }

  private getMarketConditionsPreference(): { favorPPO: string[]; favorCPPO: string[] } {
    const recentDecisions = this.decisionHistory.slice(-20);
    const ppoConditions = new Set<string>();
    const cppoConditions = new Set<string>();

    recentDecisions.forEach(decision => {
      if (decision.agent === 'PPO') {
        ppoConditions.add('stable_markets');
        ppoConditions.add('trending_conditions');
        ppoConditions.add('moderate_volatility');
      } else {
        cppoConditions.add('high_volatility');
        cppoConditions.add('risky_markets');
        cppoConditions.add('constrained_needed');
      }
    });

    return {
      favorPPO: Array.from(ppoConditions),
      favorCPPO: Array.from(cppoConditions)
    };
  }

  /**
   * Public API methods
   */
  public getDecisionHistory(): AgentDecision[] {
    return [...this.decisionHistory];
  }

  public getPerformanceComparison(): PerformanceComparison | null {
    return this.performanceHistory.length > 0 ?
      this.performanceHistory[this.performanceHistory.length - 1] : null;
  }

  public getAverageConfidence(): number {
    if (this.decisionHistory.length === 0) return 0;

    const recentDecisions = this.decisionHistory.slice(-50);
    const avgConfidence = recentDecisions.reduce((sum, d) => sum + d.confidence, 0) / recentDecisions.length;

    return avgConfidence;
  }

  public getAgentSelectionFrequency(): { PPO: number; CPPO: number } {
    const recentDecisions = this.decisionHistory.slice(-100);
    const ppoCount = recentDecisions.filter(d => d.agent === 'PPO').length;
    const cppoCount = recentDecisions.filter(d => d.agent === 'CPPO').length;

    return {
      PPO: ppoCount / recentDecisions.length,
      CPPO: cppoCount / recentDecisions.length
    };
  }

  public getConfig(): { ppo: PPOConfig; cppo: CPPOConfig } {
    return {
      ppo: { ...this.ppoConfig },
      cppo: { ...this.cppoConfig }
    };
  }

  public updatePPOConfig(newConfig: Partial<PPOConfig>): void {
    this.ppoConfig = { ...this.ppoConfig, ...newConfig };
  }

  public updateCPPOConfig(newConfig: Partial<CPPOConfig>): void {
    this.cppoConfig = { ...this.cppoConfig, ...newConfig };
  }

  public reset(): void {
    this.decisionHistory = [];
    this.performanceHistory = [];
  }

  public exportState(): string {
    return JSON.stringify({
      ppoConfig: this.ppoConfig,
      cppoConfig: this.cppoConfig,
      decisionHistory: this.decisionHistory,
      performanceHistory: this.performanceHistory,
      timestamp: Date.now()
    }, null, 2);
  }

  public importState(jsonString: string): boolean {
    try {
      const state = JSON.parse(jsonString);
      this.ppoConfig = state.ppoConfig || this.ppoConfig;
      this.cppoConfig = state.cppoConfig || this.cppoConfig;
      this.decisionHistory = state.decisionHistory || [];
      this.performanceHistory = state.performanceHistory || [];
      return true;
    } catch (error) {
      console.error('Failed to import PPO-CPPO selector state:', error);
      return false;
    }
  }
}