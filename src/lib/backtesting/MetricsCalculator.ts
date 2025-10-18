// @ts-nocheck
/**
 * Performance Metrics Calculator
 *
 * Comprehensive calculation of FinRL-style performance metrics including
 * Sharpe ratio, CVaR, Rachev ratio, and other quantitative finance metrics.
 * Based on established financial mathematics and statistical methods.
 */

import {
  PerformanceMetrics,
  RollingMetrics,
  BacktestResult,
  Trade,
  Position,
  MarketRegime,
  DrawdownAnalysis,
  TradeDistribution
} from '../../types/backtesting';

export class MetricsCalculator {
  private readonly riskFreeRate: number;
  private readonly tradingDaysPerYear: number;
  private readonly confidenceLevel: number;

  constructor(
    riskFreeRate: number = 0.02, // 2% annual risk-free rate
    tradingDaysPerYear: number = 252,
    confidenceLevel: number = 0.95
  ) {
    this.riskFreeRate = riskFreeRate;
    this.tradingDaysPerYear = tradingDaysPerYear;
    this.confidenceLevel = confidenceLevel;
  }

  /**
   * Calculate comprehensive performance metrics from backtest results
   */
  calculatePerformanceMetrics(result: BacktestResult): PerformanceMetrics {
    const returns = this.extractReturns(result);
    const trades = result.trades || [];
    const equity = result.equity || [];

    return {
      // Return Metrics
      totalReturn: this.calculateTotalReturn(equity),
      annualizedReturn: this.calculateAnnualizedReturn(returns),
      cumulativeReturn: this.calculateCumulativeReturn(returns),
      rollingReturns: this.calculateRollingReturns(returns, 30),

      // Risk Metrics
      volatility: this.calculateVolatility(returns),
      sharpeRatio: this.calculateSharpeRatio(returns),
      sortinoRatio: this.calculateSortinoRatio(returns),
      calmarRatio: this.calculateCalmarRatio(returns),
      maxDrawdown: this.calculateMaxDrawdown(equity),
      maxDrawdownDuration: this.calculateMaxDrawdownDuration(equity),
      valueAtRisk: this.calculateValueAtRisk(returns),
      conditionalValueAtRisk: this.calculateConditionalValueAtRisk(returns),

      // Trade Metrics
      totalTrades: trades.length,
      winningTrades: this.countWinningTrades(trades),
      losingTrades: this.countLosingTrades(trades),
      winRate: this.calculateWinRate(trades),
      averageWin: this.calculateAverageWin(trades),
      averageLoss: this.calculateAverageLoss(trades),
      profitFactor: this.calculateProfitFactor(trades),
      averageTrade: this.calculateAverageTrade(trades),

      // Advanced Metrics
      rachevRatio: this.calculateRachevRatio(returns),
      informationRatio: this.calculateInformationRatio(returns, result),
      treynorRatio: this.calculateTreynorRatio(returns),
      jensenAlpha: this.calculateJensenAlpha(returns, result),
      beta: this.calculateBeta(returns, result),

      // Benchmark Comparison
      benchmarkReturn: this.calculateBenchmarkReturn(result),
      trackingError: this.calculateTrackingError(returns, result),
      informationCoefficient: this.calculateInformationCoefficient(trades),
      outperformanceFrequency: this.calculateOutperformanceFrequency(returns, result),

      // Regime Analysis
      regimePerformance: this.calculateRegimePerformance(result)
    };
  }

  /**
   * Calculate rolling metrics for time-series analysis
   */
  calculateRollingMetrics(result: BacktestResult, windowSize: number = 30): RollingMetrics {
    const returns = this.extractReturns(result);
    const rollingPeriods = Math.floor(returns.length / windowSize);
    const metrics = [];

    for (let i = 0; i < rollingPeriods; i++) {
      const start = i * windowSize;
      const end = start + windowSize;
      const windowReturns = returns.slice(start, end);

      if (windowReturns.length > 0) {
        metrics.push({
          timestamp: result.equity[start + windowSize]?.timestamp || Date.now(),
          return: this.calculateCumulativeReturn(windowReturns),
          volatility: this.calculateVolatility(windowReturns),
          sharpeRatio: this.calculateSharpeRatio(windowReturns),
          maxDrawdown: this.calculateMaxDrawdownFromReturns(windowReturns),
          winRate: this.calculateWindowWinRate(result, start, end)
        });
      }
    }

    return {
      window: windowSize,
      metrics
    };
  }

  /**
   * Calculate drawdown analysis
   */
  calculateDrawdownAnalysis(result: BacktestResult): DrawdownAnalysis {
    const equity = result.equity || [];
    if (equity.length === 0) {
      return {
        maxDrawdown: 0,
        maxDrawdownDuration: 0,
        averageDrawdown: 0,
        recoveryTime: 0,
        drawdownPeriods: []
      };
    }

    const drawdownPeriods: DrawdownAnalysis['drawdownPeriods'] = [];
    let currentDrawdown: { start: Date; peak: number } | null = null;
    let maxDrawdown = 0;
    let maxDrawdownDuration = 0;
    let totalDrawdown = 0;
    let drawdownCount = 0;

    let peak = equity[0].value;
    const startTime = new Date(equity[0].timestamp);

    for (let i = 0; i < equity.length; i++) {
      const currentValue = equity[i].value;
      const timestamp = new Date(equity[i].timestamp);

      if (currentValue > peak) {
        // New peak, end current drawdown if exists
        if (currentDrawdown) {
          const duration = timestamp.getTime() - currentDrawdown.start.getTime();
          const depth = (peak - currentValue) / peak;

          drawdownPeriods.push({
            start: currentDrawdown.start,
            end: timestamp,
            depth,
            duration
          });

          totalDrawdown += depth;
          drawdownCount++;
          maxDrawdownDuration = Math.max(maxDrawdownDuration, duration);

          currentDrawdown = null;
        }
        peak = currentValue;
      } else {
        // Current drawdown
        const drawdown = (peak - currentValue) / peak;
        maxDrawdown = Math.max(maxDrawdown, drawdown);

        if (!currentDrawdown && drawdown > 0) {
          currentDrawdown = {
            start: timestamp,
            peak
          };
        }
      }
    }

    return {
      maxDrawdown,
      maxDrawdownDuration: maxDrawdownDuration / (1000 * 60 * 60 * 24), // Convert to days
      averageDrawdown: drawdownCount > 0 ? totalDrawdown / drawdownCount : 0,
      recoveryTime: 0, // Would need more sophisticated calculation
      drawdownPeriods
    };
  }

  /**
   * Calculate trade distribution statistics
   */
  calculateTradeDistribution(trades: Trade[]): TradeDistribution {
    if (trades.length === 0) {
      return {
        winRate: 0,
        profitFactor: 0,
        averageWin: 0,
        averageLoss: 0,
        largestWin: 0,
        largestLoss: 0,
        averageHoldingPeriod: 0,
        medianHoldingPeriod: 0
      };
    }

    const winningTrades = trades.filter(t => (t.pnl || 0) > 0);
    const losingTrades = trades.filter(t => (t.pnl || 0) < 0);

    const wins = winningTrades.map(t => t.pnl || 0);
    const losses = losingTrades.map(t => t.pnl || 0);

    const holdingPeriods = trades
      .filter(t => t.exitTime)
      .map(t => (t.exitTime! - t.entryTime) / (1000 * 60 * 60 * 24)); // Convert to days

    return {
      winRate: winningTrades.length / trades.length,
      profitFactor: this.calculateProfitFactor(trades),
      averageWin: wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : 0,
      averageLoss: losses.length > 0 ? Math.abs(losses.reduce((a, b) => a + b, 0) / losses.length) : 0,
      largestWin: wins.length > 0 ? Math.max(...wins) : 0,
      largestLoss: losses.length > 0 ? Math.min(...losses) : 0,
      averageHoldingPeriod: holdingPeriods.length > 0 ? holdingPeriods.reduce((a, b) => a + b, 0) / holdingPeriods.length : 0,
      medianHoldingPeriod: holdingPeriods.length > 0 ? this.median(holdingPeriods) : 0
    };
  }

  // === Return Calculation Methods ===

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

  private calculateTotalReturn(equity: BacktestResult['equity']): number {
    if (!equity || equity.length === 0) return 0;
    const startValue = equity[0].value;
    const endValue = equity[equity.length - 1].value;
    return (endValue - startValue) / startValue;
  }

  private calculateAnnualizedReturn(returns: number[]): number {
    if (returns.length === 0) return 0;

    const totalReturn = this.calculateCumulativeReturn(returns);
    const years = returns.length / this.tradingDaysPerYear;
    return Math.pow(1 + totalReturn, 1 / years) - 1;
  }

  private calculateCumulativeReturn(returns: number[]): number {
    if (returns.length === 0) return 0;
    return returns.reduce((acc, ret) => acc * (1 + ret), 1) - 1;
  }

  private calculateRollingReturns(returns: number[], window: number): number[] {
    const rollingReturns: number[] = [];
    for (let i = window; i < returns.length; i++) {
      const windowReturns = returns.slice(i - window, i);
      rollingReturns.push(this.calculateCumulativeReturn(windowReturns));
    }
    return rollingReturns;
  }

  // === Risk Metrics ===

  private calculateVolatility(returns: number[]): number {
    if (returns.length === 0) return 0;

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((acc, ret) => acc + Math.pow(ret - mean, 2), 0) / returns.length;
    const dailyVolatility = Math.sqrt(variance);

    // Annualize volatility
    return dailyVolatility * Math.sqrt(this.tradingDaysPerYear);
  }

  private calculateSharpeRatio(returns: number[]): number {
    if (returns.length === 0) return 0;

    const annualizedReturn = this.calculateAnnualizedReturn(returns);
    const volatility = this.calculateVolatility(returns);

    return volatility > 0 ? (annualizedReturn - this.riskFreeRate) / volatility : 0;
  }

  private calculateSortinoRatio(returns: number[]): number {
    if (returns.length === 0) return 0;

    const annualizedReturn = this.calculateAnnualizedReturn(returns);
    const negativeReturns = returns.filter(r => r < 0);

    if (negativeReturns.length === 0) return Infinity;

    const downsideVariance = negativeReturns.reduce((acc, ret) => acc + Math.pow(ret, 2), 0) / negativeReturns.length;
    const downsideDeviation = Math.sqrt(downsideVariance) * Math.sqrt(this.tradingDaysPerYear);

    return downsideDeviation > 0 ? (annualizedReturn - this.riskFreeRate) / downsideDeviation : 0;
  }

  private calculateCalmarRatio(returns: number[]): number {
    if (returns.length === 0) return 0;

    const annualizedReturn = this.calculateAnnualizedReturn(returns);
    const maxDrawdown = this.calculateMaxDrawdownFromReturns(returns);

    return maxDrawdown > 0 ? annualizedReturn / maxDrawdown : 0;
  }

  private calculateMaxDrawdown(equity: BacktestResult['equity']): number {
    if (!equity || equity.length === 0) return 0;

    let peak = equity[0].value;
    let maxDrawdown = 0;

    for (const point of equity) {
      if (point.value > peak) {
        peak = point.value;
      }
      const drawdown = (peak - point.value) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    return maxDrawdown;
  }

  private calculateMaxDrawdownFromReturns(returns: number[]): number {
    if (returns.length === 0) return 0;

    let cumulative = 1;
    let peak = cumulative;
    let maxDrawdown = 0;

    for (const ret of returns) {
      cumulative *= (1 + ret);
      if (cumulative > peak) {
        peak = cumulative;
      }
      const drawdown = (peak - cumulative) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    return maxDrawdown;
  }

  private calculateMaxDrawdownDuration(equity: BacktestResult['equity']): number {
    if (!equity || equity.length === 0) return 0;

    let peak = equity[0].value;
    let drawdownStart: number | null = null;
    let maxDuration = 0;

    for (let i = 0; i < equity.length; i++) {
      const currentValue = equity[i].value;

      if (currentValue > peak) {
        if (drawdownStart !== null) {
          const duration = i - drawdownStart;
          maxDuration = Math.max(maxDuration, duration);
          drawdownStart = null;
        }
        peak = currentValue;
      } else if (currentValue < peak) {
        if (drawdownStart === null) {
          drawdownStart = i;
        }
      }
    }

    // Convert to days (assuming daily data)
    return maxDuration;
  }

  private calculateValueAtRisk(returns: number[]): number {
    if (returns.length === 0) return 0;

    const sortedReturns = [...returns].sort((a, b) => a - b);
    const index = Math.floor((1 - this.confidenceLevel) * sortedReturns.length);
    return Math.abs(sortedReturns[index]);
  }

  private calculateConditionalValueAtRisk(returns: number[]): number {
    if (returns.length === 0) return 0;

    const sortedReturns = [...returns].sort((a, b) => a - b);
    const varIndex = Math.floor((1 - this.confidenceLevel) * sortedReturns.length);
    const tailReturns = sortedReturns.slice(0, varIndex + 1);

    return tailReturns.length > 0 ? Math.abs(tailReturns.reduce((a, b) => a + b, 0) / tailReturns.length) : 0;
  }

  private calculateRachevRatio(returns: number[]): number {
    if (returns.length === 0) return 0;

    const alpha = 0.05; // Upper tail
    const beta = 0.05; // Lower tail

    const sortedReturns = [...returns].sort((a, b) => a - b);
    const lowerTail = sortedReturns.slice(0, Math.floor(beta * sortedReturns.length));
    const upperTail = sortedReturns.slice(-Math.floor(alpha * sortedReturns.length));

    const expectedLower = lowerTail.length > 0 ? lowerTail.reduce((a, b) => a + b, 0) / lowerTail.length : 0;
    const expectedUpper = upperTail.length > 0 ? upperTail.reduce((a, b) => a + b, 0) / upperTail.length : 0;

    return expectedLower !== 0 ? Math.abs(expectedUpper / expectedLower) : 0;
  }

  // === Trade Metrics ===

  private countWinningTrades(trades: Trade[]): number {
    return trades.filter(t => (t.pnl || 0) > 0).length;
  }

  private countLosingTrades(trades: Trade[]): number {
    return trades.filter(t => (t.pnl || 0) < 0).length;
  }

  private calculateWinRate(trades: Trade[]): number {
    if (trades.length === 0) return 0;
    return this.countWinningTrades(trades) / trades.length;
  }

  private calculateAverageWin(trades: Trade[]): number {
    const wins = trades.filter(t => (t.pnl || 0) > 0).map(t => t.pnl || 0);
    return wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
  }

  private calculateAverageLoss(trades: Trade[]): number {
    const losses = trades.filter(t => (t.pnl || 0) < 0).map(t => t.pnl || 0);
    return losses.length > 0 ? Math.abs(losses.reduce((a, b) => a + b, 0) / losses.length) : 0;
  }

  private calculateProfitFactor(trades: Trade[]): number {
    const wins = trades.filter(t => (t.pnl || 0) > 0).reduce((sum, t) => sum + (t.pnl || 0), 0);
    const losses = Math.abs(trades.filter(t => (t.pnl || 0) < 0).reduce((sum, t) => sum + (t.pnl || 0), 0));
    return losses > 0 ? wins / losses : 0;
  }

  private calculateAverageTrade(trades: Trade[]): number {
    if (trades.length === 0) return 0;
    const totalPnL = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    return totalPnL / trades.length;
  }

  // === Advanced Metrics ===

  private calculateInformationRatio(returns: number[], result: BacktestResult): number {
    if (!result.benchmark || returns.length === 0) return 0;

    const benchmarkReturns = this.extractBenchmarkReturns(result);
    if (benchmarkReturns.length === 0) return 0;

    const excessReturns = returns.map((r, i) => r - (benchmarkReturns[i] || 0));
    const trackingError = this.calculateVolatility(excessReturns);
    const excessReturn = this.calculateAnnualizedReturn(excessReturns);

    return trackingError > 0 ? excessReturn / trackingError : 0;
  }

  private calculateTreynorRatio(returns: number[]): number {
    // Simplified Treynor ratio - would need market data for proper beta
    const annualizedReturn = this.calculateAnnualizedReturn(returns);
    const beta = 1.0; // Assume market beta of 1.0
    return beta !== 0 ? (annualizedReturn - this.riskFreeRate) / beta : 0;
  }

  private calculateJensenAlpha(returns: number[], result: BacktestResult): number {
    // Simplified Jensen alpha - would need market data for proper calculation
    const annualizedReturn = this.calculateAnnualizedReturn(returns);
    const expectedReturn = this.riskFreeRate + 1.0 * (0.08 - this.riskFreeRate); // Assume 8% market return
    return annualizedReturn - expectedReturn;
  }

  private calculateBeta(returns: number[], result: BacktestResult): number {
    if (!result.benchmark || returns.length === 0) return 1.0;

    const benchmarkReturns = this.extractBenchmarkReturns(result);
    if (benchmarkReturns.length === 0) return 1.0;

    // Calculate covariance and variance
    const covariance = this.calculateCovariance(returns, benchmarkReturns);
    const benchmarkVariance = this.calculateVariance(benchmarkReturns);

    return benchmarkVariance > 0 ? covariance / benchmarkVariance : 1.0;
  }

  // === Benchmark Comparison ===

  private calculateBenchmarkReturn(result: BacktestResult): number | undefined {
    if (!result.benchmark) return undefined;

    const benchmarkEquity = result.benchmark.equity;
    if (!benchmarkEquity || benchmarkEquity.length < 2) return undefined;

    const startValue = benchmarkEquity[0].value;
    const endValue = benchmarkEquity[benchmarkEquity.length - 1].value;
    return (endValue - startValue) / startValue;
  }

  private calculateTrackingError(returns: number[], result: BacktestResult): number | undefined {
    if (!result.benchmark || returns.length === 0) return undefined;

    const benchmarkReturns = this.extractBenchmarkReturns(result);
    if (benchmarkReturns.length === 0) return undefined;

    const excessReturns = returns.map((r, i) => r - (benchmarkReturns[i] || 0));
    return this.calculateVolatility(excessReturns);
  }

  private calculateInformationCoefficient(trades: Trade[]): number {
    // Calculate correlation between signal strength and trade outcomes
    // This is a simplified implementation
    if (trades.length === 0) return 0;

    // Would need signal strength data in trades for proper calculation
    return 0;
  }

  private calculateOutperformanceFrequency(returns: number[], result: BacktestResult): number | undefined {
    if (!result.benchmark || returns.length === 0) return undefined;

    const benchmarkReturns = this.extractBenchmarkReturns(result);
    if (benchmarkReturns.length === 0) return undefined;

    let outperformanceCount = 0;
    for (let i = 0; i < Math.min(returns.length, benchmarkReturns.length); i++) {
      if (returns[i] > (benchmarkReturns[i] || 0)) {
        outperformanceCount++;
      }
    }

    return outperformanceCount / Math.min(returns.length, benchmarkReturns.length);
  }

  // === Regime Analysis ===

  private calculateRegimePerformance(result: BacktestResult): Record<MarketRegime, Partial<PerformanceMetrics>> {
    // This would require regime data to be included in the backtest result
    // For now, return empty object
    return {} as Record<MarketRegime, Partial<PerformanceMetrics>>;
  }

  // === Helper Methods ===

  private extractBenchmarkReturns(result: BacktestResult): number[] {
    if (!result.benchmark || !result.benchmark.equity) return [];

    const equity = result.benchmark.equity;
    if (equity.length < 2) return [];

    const returns: number[] = [];
    for (let i = 1; i < equity.length; i++) {
      const returnRate = (equity[i].value - equity[i - 1].value) / equity[i - 1].value;
      returns.push(returnRate);
    }
    return returns;
  }

  private calculateWindowWinRate(result: BacktestResult, start: number, end: number): number {
    const trades = result.trades || [];
    const windowTrades = trades.filter(t => {
      const entryTime = new Date(t.entryTime).getTime();
      return entryTime >= start && entryTime <= end;
    });

    if (windowTrades.length === 0) return 0;
    const wins = windowTrades.filter(t => (t.pnl || 0) > 0).length;
    return wins / windowTrades.length;
  }

  private calculateCovariance(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;

    const meanX = x.reduce((a, b) => a + b, 0) / x.length;
    const meanY = y.reduce((a, b) => a + b, 0) / y.length;

    let covariance = 0;
    for (let i = 0; i < x.length; i++) {
      covariance += (x[i] - meanX) * (y[i] - meanY);
    }

    return covariance / x.length;
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
    return variance;
  }

  private median(values: number[]): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }
}