// @ts-nocheck
/**
 * Strategy Evaluation and Comparison System
 *
 * Comprehensive system for evaluating, comparing, and analyzing trading strategies
 * with statistical significance testing and regime-specific performance analysis.
 */

import {
  Strategy,
  BacktestResult,
  StrategyComparison,
  PerformanceMetrics,
  OptimizationResult,
  OptimizationConfig,
  ComparisonConfig,
  BacktestConfig,
  StrategyParameter,
  WalkForwardResult
} from '../../types/backtesting';

// Strategy evaluation result type
export interface StrategyEvaluationResult {
  singlePeriod: BacktestResult;
  walkForward?: WalkForwardResult;
  optimization?: OptimizationResult;
  sensitivityAnalysis?: {
    parameter: string;
    impact: number;
    optimalRange: [number, number];
  }[];
  statisticalSignificance?: {
    sharpeRatio: { pValue: number; significant: boolean };
    returns: { pValue: number; significant: boolean };
    winRate: { pValue: number; significant: boolean };
  };
}

import { BacktestEngine } from './BacktestEngine';
import { MetricsCalculator } from './MetricsCalculator';

export class StrategyEvaluator {
  private backtestEngine: BacktestEngine;
  private metricsCalculator: MetricsCalculator;

  constructor(backtestEngine: BacktestEngine, metricsCalculator: MetricsCalculator) {
    this.backtestEngine = backtestEngine;
    this.metricsCalculator = metricsCalculator;
  }

  /**
   * Evaluate a single strategy with comprehensive analysis
   */
  async evaluateStrategy(
    strategy: Strategy,
    config: BacktestConfig,
    evaluationConfig: {
      walkForward?: boolean;
      optimization?: boolean;
      sensitivityAnalysis?: boolean;
      statisticalTests?: boolean;
    } = {}
  ): Promise<StrategyEvaluationResult> {
    const results: StrategyEvaluationResult = {} as StrategyEvaluationResult;

    // Single period backtest
    results.singlePeriod = await this.backtestEngine.runBacktest(strategy, config);

    // Walk-forward validation
    if (evaluationConfig.walkForward) {
      results.walkForward = await this.backtestEngine.runWalkForward(strategy, config);
    }

    // Parameter optimization
    if (evaluationConfig.optimization) {
      const optimizationConfig: OptimizationConfig = {
        method: 'grid',
        iterations: 100,
        objective: 'sharpeRatio',
        constraints: {
          maxDrawdown: 0.2,
          minSharpeRatio: 0.5,
          minTrades: 20
        },
        parallel: false
      };

      results.optimization = await this.backtestEngine.optimizeParameters(
        strategy,
        config,
        optimizationConfig
      );
    }

    // Sensitivity analysis
    if (evaluationConfig.sensitivityAnalysis) {
      results.sensitivityAnalysis = await this.performSensitivityAnalysis(strategy, config);
    }

    // Statistical significance tests
    if (evaluationConfig.statisticalTests) {
      results.statisticalSignificance = await this.performStatisticalTests(results.singlePeriod);
    }

    return results;
  }

  /**
   * Compare multiple strategies with comprehensive analysis
   */
  async compareStrategies(
    strategies: Strategy[],
    config: BacktestConfig,
    comparisonConfig: ComparisonConfig
  ): Promise<{
    comparison: StrategyComparison;
    statisticalTests: {
      strategyPairs: {
        strategyA: string;
        strategyB: string;
        tTest: { statistic: number; pValue: number; significant: boolean };
        mannWhitney: { statistic: number; pValue: number; significant: boolean };
      }[];
    };
    regimeAnalysis: {
      regime: string;
      bestStrategy: string;
      performance: Record<string, PerformanceMetrics>;
    }[];
    recommendation: {
      overallBest: string;
      riskAdjustedBest: string;
      regimeSpecific: Record<string, string>;
      reasoning: string[];
    };
  }> {
    // Basic comparison
    const comparison = await this.backtestEngine.compareStrategies(strategies, config, comparisonConfig);

    // Statistical tests between strategy pairs
    const statisticalTests = await this.performPairwiseStatisticalTests(strategies, config);

    // Regime-specific analysis
    const regimeAnalysis = await this.performRegimeAnalysis(strategies, config);

    // Generate recommendations
    const recommendation = this.generateComparisonRecommendations(
      comparison,
      statisticalTests,
      regimeAnalysis
    );

    return {
      comparison,
      statisticalTests,
      regimeAnalysis,
      recommendation
    };
  }

  /**
   * Perform sensitivity analysis for strategy parameters
   */
  async performSensitivityAnalysis(
    strategy: Strategy,
    config: BacktestConfig
  ): Promise<{
    parameter: string;
    impact: number;
    optimalRange: [number, number];
  }[]> {
    const sensitivityResults: {
      parameter: string;
      impact: number;
      optimalRange: [number, number];
    }[] = [];

    for (const parameter of strategy.parameters) {
      if (parameter.type !== 'number') continue;

      const originalValue = parameter.defaultValue;
      const testRange = this.generateTestRange(parameter);

      const metricScores: number[] = [];

      for (const testValue of testRange) {
        // Create modified strategy with test value
        const modifiedStrategy = this.modifyStrategyParameter(strategy, parameter.name, testValue);

        try {
          const result = await this.backtestEngine.runBacktest(modifiedStrategy, config);
          const score = this.calculateObjectiveScore(result.metrics, 'sharpeRatio');
          metricScores.push(score);
        } catch (error) {
          metricScores.push(-Infinity);
        }
      }

      // Calculate sensitivity metrics
      const impact = this.calculateParameterImpact(testRange, metricScores);
      const optimalRange = this.findOptimalRange(testRange, metricScores);

      sensitivityResults.push({
        parameter: parameter.name,
        impact,
        optimalRange
      });
    }

    return sensitivityResults;
  }

  /**
   * Perform statistical significance tests
   */
  async performStatisticalTests(result: BacktestResult): Promise<{
    sharpeRatio: { pValue: number; significant: boolean };
    returns: { pValue: number; significant: boolean };
    winRate: { pValue: number; significant: boolean };
  }> {
    const returns = this.extractReturns(result);
    const trades = result.trades || [];

    return {
      sharpeRatio: this.testSharpeRatioSignificance(returns),
      returns: this.testReturnsSignificance(returns),
      winRate: this.testWinRateSignificance(trades)
    };
  }

  /**
   * Perform pairwise statistical tests between strategies
   */
  async performPairwiseStatisticalTests(
    strategies: Strategy[],
    config: BacktestConfig
  ): Promise<{
    strategyPairs: {
      strategyA: string;
      strategyB: string;
      tTest: { statistic: number; pValue: number; significant: boolean };
      mannWhitney: { statistic: number; pValue: number; significant: boolean };
    }[];
  }> {
    const pairs: {
      strategyA: string;
      strategyB: string;
      tTest: { statistic: number; pValue: number; significant: boolean };
      mannWhitney: { statistic: number; pValue: number; significant: boolean };
    }[] = [];

    // Run backtests for all strategies
    const results: BacktestResult[] = [];
    for (const strategy of strategies) {
      try {
        const result = await this.backtestEngine.runBacktest(strategy, config);
        results.push(result);
      } catch (error) {
        console.error(`Backtest failed for ${strategy.name}:`, error);
      }
    }

    // Compare all pairs
    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        const returnsA = this.extractReturns(results[i]);
        const returnsB = this.extractReturns(results[j]);

        const tTest = this.performTTest(returnsA, returnsB);
        const mannWhitney = this.performMannWhitneyTest(returnsA, returnsB);

        pairs.push({
          strategyA: strategies[i].name,
          strategyB: strategies[j].name,
          tTest,
          mannWhitney
        });
      }
    }

    return { strategyPairs: pairs };
  }

  /**
   * Perform regime-specific analysis
   */
  async performRegimeAnalysis(
    strategies: Strategy[],
    config: BacktestConfig
  ): Promise<{
    regime: string;
    bestStrategy: string;
    performance: Record<string, PerformanceMetrics>;
  }[]> {
    // This would require regime data to be available
    // For now, create a placeholder implementation

    const regimes = ['trending', 'ranging', 'volatile', 'low_volatility'];
    const analysis: {
      regime: string;
      bestStrategy: string;
      performance: Record<string, PerformanceMetrics>;
    }[] = [];

    for (const regime of regimes) {
      // Modify config for regime-specific testing
      const regimeConfig = {
        ...config,
        name: `${config.name} - ${regime}`
      };

      const regimeResults: Record<string, PerformanceMetrics> = {};

      for (const strategy of strategies) {
        try {
          const result = await this.backtestEngine.runBacktest(strategy, regimeConfig);
          regimeResults[strategy.name] = result.metrics;
        } catch (error) {
          console.error(`Regime analysis failed for ${strategy.name} in ${regime}:`, error);
        }
      }

      // Find best strategy for this regime
      const bestStrategy = this.findBestStrategyForRegime(regimeResults);

      analysis.push({
        regime,
        bestStrategy,
        performance: regimeResults
      });
    }

    return analysis;
  }

  /**
   * Analyze strategy robustness across different market conditions
   */
  async analyzeRobustness(
    strategy: Strategy,
    baseConfig: BacktestConfig,
    robustnessTests: {
      marketConditions: ('bullish' | 'bearish' | 'sideways')[];
      timeframes: string[];
      volatilityRegimes: ('low' | 'medium' | 'high')[];
      liquidityConditions: ('high' | 'medium' | 'low')[];
    }
  ): Promise<{
    overallRobustnessScore: number;
    conditionScores: Record<string, number>;
    weaknesses: string[];
    strengths: string[];
    recommendations: string[];
  }> {
    const scores: Record<string, number> = {};
    const results: {
      condition: string;
      score: number;
      result: BacktestResult;
    }[] = [];

    // Test different market conditions
    for (const condition of robustnessTests.marketConditions) {
      const config = this.createConditionConfig(baseConfig, 'marketCondition', condition);
      try {
        const result = await this.backtestEngine.runBacktest(strategy, config);
        const score = this.calculateRobustnessScore(result.metrics);
        scores[`market_${condition}`] = score;
        results.push({ condition: `market_${condition}`, score, result });
      } catch (error) {
        scores[`market_${condition}`] = 0;
      }
    }

    // Test different timeframes
    for (const timeframe of robustnessTests.timeframes) {
      const config = { ...baseConfig, timeframes: [timeframe] };
      try {
        const result = await this.backtestEngine.runBacktest(strategy, config);
        const score = this.calculateRobustnessScore(result.metrics);
        scores[`timeframe_${timeframe}`] = score;
        results.push({ condition: `timeframe_${timeframe}`, score, result });
      } catch (error) {
        scores[`timeframe_${timeframe}`] = 0;
      }
    }

    // Analyze results
    const overallScore = Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length;
    const weaknesses = this.identifyWeaknesses(scores, results);
    const strengths = this.identifyStrengths(scores, results);
    const recommendations = this.generateRobustnessRecommendations(overallScore, weaknesses, strengths);

    return {
      overallRobustnessScore: overallScore,
      conditionScores: scores,
      weaknesses,
      strengths,
      recommendations
    };
  }

  /**
   * Generate strategy performance report
   */
  generatePerformanceReport(
    result: BacktestResult,
    includeDetails: boolean = true
  ): {
    summary: {
      overallScore: number;
      recommendation: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
      keyStrengths: string[];
      keyWeaknesses: string[];
    };
    metrics: PerformanceMetrics;
    analysis: {
      riskRewardAnalysis: string;
      consistencyAnalysis: string;
      regimeAnalysis: string;
      comparisonToBenchmark: string;
    };
    recommendations: string[];
    riskFactors: string[];
  } {
    const metrics = result.metrics;
    const overallScore = this.calculateOverallScore(metrics);
    const recommendation = this.generateRecommendation(metrics);

    return {
      summary: {
        overallScore,
        recommendation,
        keyStrengths: this.identifyStrengthsFromMetrics(metrics),
        keyWeaknesses: this.identifyWeaknessesFromMetrics(metrics)
      },
      metrics,
      analysis: {
        riskRewardAnalysis: this.analyzeRiskReward(metrics),
        consistencyAnalysis: this.analyzeConsistency(metrics),
        regimeAnalysis: this.analyzeRegimePerformance(metrics),
        comparisonToBenchmark: this.analyzeBenchmarkComparison(metrics)
      },
      recommendations: this.generateStrategyRecommendations(metrics),
      riskFactors: this.identifyRiskFactors(metrics)
    };
  }

  // === Private Helper Methods ===

  private generateTestRange(parameter: StrategyParameter): number[] {
    const min = parameter.min || parameter.defaultValue * 0.5;
    const max = parameter.max || parameter.defaultValue * 1.5;
    const step = parameter.step || (max - min) / 10;

    const range: number[] = [];
    for (let value = min; value <= max; value += step) {
      range.push(value);
    }
    return range;
  }

  private modifyStrategyParameter(strategy: Strategy, parameterName: string, value: unknown): Strategy {
    // Create a deep copy of the strategy
    const modifiedStrategy = JSON.parse(JSON.stringify(strategy));

    // Find and modify the parameter
    const parameter = modifiedStrategy.parameters.find((p: StrategyParameter) => p.name === parameterName);
    if (parameter) {
      parameter.defaultValue = value;
    }

    return modifiedStrategy;
  }

  private calculateObjectiveScore(metrics: PerformanceMetrics, objective: keyof PerformanceMetrics | string): number {
    if (typeof objective === 'string' && objective in metrics) {
      return metrics[objective as keyof PerformanceMetrics] as number;
    }
    return 0;
  }

  private calculateParameterImpact(testRange: number[], metricScores: number[]): number {
    // Calculate the impact as the range of scores
    const maxScore = Math.max(...metricScores);
    const minScore = Math.min(...metricScores);
    return maxScore - minScore;
  }

  private findOptimalRange(testRange: number[], metricScores: number[]): [number, number] {
    // Find the range where scores are within 90% of the maximum score
    const maxScore = Math.max(...metricScores);
    const threshold = maxScore * 0.9;

    const optimalIndices = metricScores
      .map((score, index) => ({ score, index }))
      .filter(item => item.score >= threshold)
      .map(item => item.index);

    if (optimalIndices.length === 0) {
      return [testRange[0], testRange[testRange.length - 1]];
    }

    const minIndex = Math.min(...optimalIndices);
    const maxIndex = Math.max(...optimalIndices);

    return [testRange[minIndex], testRange[maxIndex]];
  }

  private extractReturns(result: BacktestResult): number[] {
    const equity = result.equity || [];
    if (equity.length < 2) return [];

    const returns: number[] = [];
    for (let i = 1; i < equity.length; i++) {
      const returnRate = (equity[i].value - equity[i - 1].value) / equity[i - 1].value;
      returns.push(returnRate);
    }
    return returns;
  }

  private testSharpeRatioSignificance(returns: number[]): { pValue: number; significant: boolean } {
    // Simplified t-test for Sharpe ratio
    if (returns.length < 2) {
      return { pValue: 1, significant: false };
    }

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const std = Math.sqrt(returns.reduce((acc, ret) => acc + Math.pow(ret - mean, 2), 0) / (returns.length - 1));
    const tStat = mean / (std / Math.sqrt(returns.length));
    const pValue = this.calculatePValue(tStat, returns.length - 1);

    return {
      pValue,
      significant: pValue < 0.05
    };
  }

  private testReturnsSignificance(returns: number[]): { pValue: number; significant: boolean } {
    // One-sample t-test against zero returns
    if (returns.length < 2) {
      return { pValue: 1, significant: false };
    }

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const std = Math.sqrt(returns.reduce((acc, ret) => acc + Math.pow(ret - mean, 2), 0) / (returns.length - 1));
    const tStat = mean / (std / Math.sqrt(returns.length));
    const pValue = this.calculatePValue(tStat, returns.length - 1);

    return {
      pValue,
      significant: pValue < 0.05
    };
  }

  private testWinRateSignificance(trades: { pnl?: number }[]): { pValue: number; significant: boolean } {
    // Binomial test for win rate significance
    if (trades.length === 0) {
      return { pValue: 1, significant: false };
    }

    const wins = trades.filter(t => (t.pnl || 0) > 0).length;
    const winRate = wins / trades.length;

    // Simplified binomial test
    const expectedWinRate = 0.5; // Null hypothesis: 50% win rate
    const zStat = (winRate - expectedWinRate) / Math.sqrt(expectedWinRate * (1 - expectedWinRate) / trades.length);
    const pValue = 2 * (1 - this.normalCDF(Math.abs(zStat)));

    return {
      pValue,
      significant: pValue < 0.05
    };
  }

  private performTTest(sampleA: number[], sampleB: number[]): { statistic: number; pValue: number; significant: boolean } {
    // Two-sample t-test
    const meanA = sampleA.reduce((a, b) => a + b, 0) / sampleA.length;
    const meanB = sampleB.reduce((a, b) => a + b, 0) / sampleB.length;

    const varA = sampleA.reduce((acc, x) => acc + Math.pow(x - meanA, 2), 0) / (sampleA.length - 1);
    const varB = sampleB.reduce((acc, x) => acc + Math.pow(x - meanB, 2), 0) / (sampleB.length - 1);

    const pooledStd = Math.sqrt(((sampleA.length - 1) * varA + (sampleB.length - 1) * varB) / (sampleA.length + sampleB.length - 2));
    const tStat = (meanA - meanB) / (pooledStd * Math.sqrt(1 / sampleA.length + 1 / sampleB.length));

    const df = sampleA.length + sampleB.length - 2;
    const pValue = this.calculatePValue(tStat, df);

    return {
      statistic: tStat,
      pValue,
      significant: pValue < 0.05
    };
  }

  private performMannWhitneyTest(sampleA: number[], sampleB: number[]): { statistic: number; pValue: number; significant: boolean } {
    // Mann-Whitney U test (simplified implementation)
    const combined = [...sampleA, ...sampleB].sort((a, b) => a - b);

    const ranks = combined.map((value, index) => ({
      value,
      rank: index + 1
    }));

    const rankSumA = ranks.slice(0, sampleA.length).reduce((sum, r) => sum + r.rank, 0);
    const rankSumB = ranks.slice(sampleA.length).reduce((sum, r) => sum + r.rank, 0);

    const nA = sampleA.length;
    const nB = sampleB.length;

    const uA = rankSumA - nA * (nA + 1) / 2;
    const uB = rankSumB - nB * (nB + 1) / 2;

    const uStatistic = Math.min(uA, uB);

    // Simplified p-value calculation (would need proper implementation)
    const pValue = this.calculateMannWhitneyPValue(uStatistic, nA, nB);

    return {
      statistic: uStatistic,
      pValue,
      significant: pValue < 0.05
    };
  }

  private calculateRobustnessScore(metrics: PerformanceMetrics): number {
    // Calculate a composite score for robustness
    const sharpeWeight = 0.3;
    const sortinoWeight = 0.2;
    const profitFactorWeight = 0.2;
    const winRateWeight = 0.15;
    const maxDrawdownWeight = 0.15;

    const normalizedSharpe = Math.max(0, Math.min(1, metrics.sharpeRatio / 2));
    const normalizedSortino = Math.max(0, Math.min(1, metrics.sortinoRatio / 2));
    const normalizedProfitFactor = Math.max(0, Math.min(1, metrics.profitFactor / 2));
    const normalizedWinRate = metrics.winRate;
    const normalizedDrawdown = Math.max(0, 1 - Math.abs(metrics.maxDrawdown));

    return (
      normalizedSharpe * sharpeWeight +
      normalizedSortino * sortinoWeight +
      normalizedProfitFactor * profitFactorWeight +
      normalizedWinRate * winRateWeight +
      normalizedDrawdown * maxDrawdownWeight
    );
  }

  private createConditionConfig(baseConfig: BacktestConfig, conditionType: string, condition: string): BacktestConfig {
    // Create modified config for specific conditions
    return {
      ...baseConfig,
      name: `${baseConfig.name} - ${conditionType}_${condition}`
    };
  }

  private identifyWeaknesses(scores: Record<string, number>, results: {
    condition: string;
    score: number;
    result: BacktestResult;
  }[]): string[] {
    const weaknesses: string[] = [];
    const threshold = 0.5; // Below 50% score is considered weak

    Object.entries(scores).forEach(([condition, score]) => {
      if (score < threshold) {
        weaknesses.push(`Poor performance in ${condition} (score: ${score.toFixed(2)})`);
      }
    });

    return weaknesses;
  }

  private identifyStrengths(scores: Record<string, number>, results: {
    condition: string;
    score: number;
    result: BacktestResult;
  }[]): string[] {
    const strengths: string[] = [];
    const threshold = 0.8; // Above 80% score is considered strong

    Object.entries(scores).forEach(([condition, score]) => {
      if (score > threshold) {
        strengths.push(`Excellent performance in ${condition} (score: ${score.toFixed(2)})`);
      }
    });

    return strengths;
  }

  private generateRobustnessRecommendations(overallScore: number, weaknesses: string[], strengths: string[]): string[] {
    const recommendations: string[] = [];

    if (overallScore > 0.8) {
      recommendations.push('Strategy shows excellent robustness across all tested conditions.');
    } else if (overallScore > 0.6) {
      recommendations.push('Strategy shows good robustness but has room for improvement.');
    } else {
      recommendations.push('Strategy shows poor robustness and requires significant improvement.');
    }

    if (weaknesses.length > 0) {
      recommendations.push('Focus on addressing specific weak conditions: ' + weaknesses.join(', '));
    }

    if (strengths.length > 0) {
      recommendations.push('Leverage strengths in: ' + strengths.join(', '));
    }

    return recommendations;
  }

  private findBestStrategyForRegime(performance: Record<string, PerformanceMetrics>): string {
    let bestStrategy = '';
    let bestScore = -Infinity;

    Object.entries(performance).forEach(([strategyName, metrics]) => {
      const score = this.calculateRobustnessScore(metrics);
      if (score > bestScore) {
        bestScore = score;
        bestStrategy = strategyName;
      }
    });

    return bestStrategy;
  }

  private calculateOverallScore(metrics: PerformanceMetrics): number {
    return this.calculateRobustnessScore(metrics);
  }

  private generateRecommendation(metrics: PerformanceMetrics): 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell' {
    const score = this.calculateOverallScore(metrics);

    if (score > 0.8) return 'strong_buy';
    if (score > 0.6) return 'buy';
    if (score > 0.4) return 'hold';
    if (score > 0.2) return 'sell';
    return 'strong_sell';
  }

  private identifyStrengthsFromMetrics(metrics: PerformanceMetrics): string[] {
    const strengths: string[] = [];

    if (metrics.sharpeRatio > 1.5) strengths.push('Excellent risk-adjusted returns');
    if (metrics.winRate > 0.6) strengths.push('High win rate');
    if (metrics.profitFactor > 1.5) strengths.push('Strong profit factor');
    if (metrics.maxDrawdown < 0.1) strengths.push('Low maximum drawdown');
    if (metrics.sortinoRatio > 1.2) strengths.push('Good downside protection');

    return strengths;
  }

  private identifyWeaknessesFromMetrics(metrics: PerformanceMetrics): string[] {
    const weaknesses: string[] = [];

    if (metrics.sharpeRatio < 0.5) weaknesses.push('Poor risk-adjusted returns');
    if (metrics.winRate < 0.4) weaknesses.push('Low win rate');
    if (metrics.profitFactor < 1.0) weaknesses.push('Negative profit factor');
    if (metrics.maxDrawdown > 0.3) weaknesses.push('High maximum drawdown');
    if (metrics.volatility > 0.3) weaknesses.push('High volatility');

    return weaknesses;
  }

  private analyzeRiskReward(metrics: PerformanceMetrics): string {
    if (metrics.sharpeRatio > 1.5) {
      return 'Excellent risk-reward profile with high returns relative to risk.';
    } else if (metrics.sharpeRatio > 1.0) {
      return 'Good risk-reward profile with adequate returns relative to risk.';
    } else if (metrics.sharpeRatio > 0.5) {
      return 'Moderate risk-reward profile with acceptable returns relative to risk.';
    } else {
      return 'Poor risk-reward profile with insufficient returns relative to risk.';
    }
  }

  private analyzeConsistency(metrics: PerformanceMetrics): string {
    if (metrics.winRate > 0.6 && metrics.volatility < 0.2) {
      return 'Highly consistent performance with stable returns.';
    } else if (metrics.winRate > 0.5 && metrics.volatility < 0.3) {
      return 'Moderately consistent performance with some volatility.';
    } else {
      return 'Inconsistent performance with high volatility.';
    }
  }

  private analyzeRegimePerformance(metrics: PerformanceMetrics): string {
    // This would require regime data
    return 'Regime-specific analysis requires additional data.';
  }

  private analyzeBenchmarkComparison(metrics: PerformanceMetrics): string {
    if (metrics.informationRatio && metrics.informationRatio > 0.5) {
      return 'Strategy consistently outperforms benchmark.';
    } else if (metrics.informationRatio && metrics.informationRatio > 0) {
      return 'Strategy moderately outperforms benchmark.';
    } else {
      return 'Strategy underperforms or matches benchmark.';
    }
  }

  private generateStrategyRecommendations(metrics: PerformanceMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.maxDrawdown > 0.2) {
      recommendations.push('Consider implementing stricter risk management to reduce drawdowns.');
    }

    if (metrics.winRate < 0.4) {
      recommendations.push('Improve entry/exit criteria to increase win rate.');
    }

    if (metrics.volatility > 0.3) {
      recommendations.push('Consider position sizing adjustments to reduce volatility.');
    }

    if (metrics.sharpeRatio < 0.5) {
      recommendations.push('Review strategy logic and risk management to improve risk-adjusted returns.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Strategy shows good performance across most metrics.');
    }

    return recommendations;
  }

  private identifyRiskFactors(metrics: PerformanceMetrics): string[] {
    const risks: string[] = [];

    if (metrics.maxDrawdown > 0.2) risks.push('High maximum drawdown risk');
    if (metrics.volatility > 0.3) risks.push('High volatility risk');
    if (metrics.winRate < 0.4) risks.push('Low win rate risk');
    if (metrics.profitFactor < 1.0) risks.push('Negative expectancy risk');
    if (metrics.conditionalValueAtRisk > 0.1) risks.push('High tail risk');

    return risks;
  }

  private generateComparisonRecommendations(
    comparison: StrategyComparison,
    statisticalTests: {
      strategyPairs: {
        strategyA: string;
        strategyB: string;
        tTest: { statistic: number; pValue: number; significant: boolean };
        mannWhitney: { statistic: number; pValue: number; significant: boolean };
      }[];
    },
    regimeAnalysis: {
      regime: string;
      bestStrategy: string;
      performance: Record<string, PerformanceMetrics>;
    }[]
  ): {
    overallBest: string;
    riskAdjustedBest: string;
    regimeSpecific: Record<string, string>;
    reasoning: string[];
  } {
    const bestStrategy = comparison.bestStrategy.strategy.name;
    const reasoning: string[] = [];

    // Add reasoning based on statistical tests
    const significantPairs = statisticalTests.strategyPairs.filter(
      (pair) => pair.tTest.significant || pair.mannWhitney.significant
    );

    if (significantPairs.length > 0) {
      reasoning.push('Statistically significant performance differences detected between strategies.');
    }

    // Add reasoning based on regime analysis
    if (regimeAnalysis.length > 0) {
      reasoning.push('Different strategies show varying performance across market regimes.');
    }

    // Find risk-adjusted best strategy
    const riskAdjustedBest = comparison.strategies.reduce((best, current) => {
      const bestScore = this.calculateRobustnessScore(best.result.metrics);
      const currentScore = this.calculateRobustnessScore(current.result.metrics);
      return currentScore > bestScore ? current : best;
    }, comparison.strategies[0]).strategy.name;

    // Build regime-specific recommendations
    const regimeSpecific: Record<string, string> = {};
    regimeAnalysis.forEach(regime => {
      regimeSpecific[regime.regime] = regime.bestStrategy;
    });

    return {
      overallBest: bestStrategy,
      riskAdjustedBest,
      regimeSpecific,
      reasoning
    };
  }

  // === Statistical Helper Methods ===

  private calculatePValue(tStat: number, df: number): number {
    // Simplified p-value calculation for t-test
    return 2 * (1 - this.tCDF(Math.abs(tStat), df));
  }

  private tCDF(t: number, df: number): number {
    // Simplified t-distribution CDF
    // In practice, use a proper statistical library
    return 0.5 + 0.5 * Math.sign(t) * Math.sqrt(1 - Math.exp(-2 * t * t / (df + 1)));
  }

  private normalCDF(z: number): number {
    // Standard normal CDF approximation
    return 0.5 * (1 + this.erf(z / Math.sqrt(2)));
  }

  private erf(x: number): number {
    // Error function approximation
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
  }

  private calculateMannWhitneyPValue(u: number, n1: number, n2: number): number {
    // Simplified p-value calculation for Mann-Whitney test
    // In practice, use proper statistical tables or functions
    const mean = n1 * n2 / 2;
    const std = Math.sqrt(n1 * n2 * (n1 + n2 + 1) / 12);
    const z = (u - mean) / std;
    return 2 * (1 - this.normalCDF(Math.abs(z)));
  }
}