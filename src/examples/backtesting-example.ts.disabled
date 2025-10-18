/**
 * Backtesting Framework Usage Examples
 *
 * Comprehensive examples demonstrating how to use the FinRL-style backtesting framework
 * for evaluating trading strategies with walk-forward validation and performance metrics.
 */

import {
  BacktestConfig,
  Strategy,
  OptimizationConfig,
  ComparisonConfig,
  PerformanceMetrics
} from '../types/backtesting';

// import { useBacktesting } from '../hooks/useBacktesting'; // Disabled to prevent React hooks rules violations
import { MovingAverageStrategy } from '../lib/backtesting/strategies/MovingAverageStrategy';
import { createDataIntegration } from '../lib/backtesting/DataIntegration';

// === Example 1: Basic Backtest ===

// Disabled - uses React hooks which violate rules of hooks
export async function basicBacktestExample() {
  // Disabled - useBacktesting() hook violation
  throw new Error("Function disabled - needs refactoring to remove React hooks");

  try {
    // Create configuration
    const config = createDefaultConfig({
      name: 'BTC Moving Average Strategy',
      symbols: ['BTC/USDT'],
      timeframes: ['1d'],
      initialCapital: 10000,
      startDate: new Date('2022-01-01'),
      endDate: new Date('2023-12-31')
    });

    // Get first available strategy
    const strategy = availableStrategies[0] || new MovingAverageStrategy();

    console.log('Running basic backtest...');
    console.log('Strategy:', strategy.name);
    console.log('Config:', config);

    // Run backtest
    const result = await runBacktest(strategy, config);

    // Calculate and display metrics
    const metrics = calculateMetrics(result);

    console.log('\\n=== Backtest Results ===');
    console.log('Total Return:', `${(metrics.totalReturn * 100).toFixed(2)}%`);
    console.log('Sharpe Ratio:', metrics.sharpeRatio.toFixed(2));
    console.log('Max Drawdown:', `${(metrics.maxDrawdown * 100).toFixed(2)}%`);
    console.log('Win Rate:', `${(metrics.winRate * 100).toFixed(1)}%`);
    console.log('Total Trades:', metrics.totalTrades);
    console.log('Profit Factor:', metrics.profitFactor.toFixed(2));

    return result;
  } catch (error) {
    console.error('Backtest failed:', error);
    throw error;
  }
}

// === Example 2: Walk-Forward Validation ===

export async function walkForwardExample() {
  // Disabled - useBacktesting() hook violation
  throw new Error("Function disabled - needs refactoring to remove React hooks");

  try {
    // Create walk-forward configuration
    const config = createDefaultConfig({
      name: 'ETH Walk-Forward Validation',
      symbols: ['ETH/USDT'],
      timeframes: ['4h'],
      initialCapital: 25000,
      startDate: new Date('2021-01-01'),
      endDate: new Date('2023-12-31'),
      walkForward: {
        enabled: true,
        windowSize: 90,    // 90 days training
        stepSize: 30,      // 30 days step
        testSize: 30       // 30 days testing
      }
    });

    const strategy = availableStrategies[0] || new MovingAverageStrategy();

    console.log('Running walk-forward validation...');
    console.log('Strategy:', strategy.name);
    console.log('Windows:', config.walkForward);

    // Run walk-forward validation
    const result = await runWalkForward(strategy, config);

    console.log('\\n=== Walk-Forward Results ===');
    console.log('Total Windows:', result.windows.length);
    console.log('Aggregate Sharpe:', result.aggregateMetrics.sharpeRatio.toFixed(2));
    console.log('Stability Score:', result.stabilityAnalysis.performanceStability.toFixed(2));

    // Analyze window performance
    const successfulWindows = result.windows.filter(w => w.testMetrics.sharpeRatio > 0).length;
    console.log('Successful Windows:', `${successfulWindows}/${result.windows.length} (${(successfulWindows / result.windows.length * 100).toFixed(1)}%)`);

    return result;
  } catch (error) {
    console.error('Walk-forward validation failed:', error);
    throw error;
  }
}

// === Example 3: Parameter Optimization ===

export async function optimizationExample() {
  // Disabled - useBacktesting() hook violation
  throw new Error("Function disabled - needs refactoring to remove React hooks");

  try {
    // Create optimization configuration
    const config = createDefaultConfig({
      name: 'BNB Parameter Optimization',
      symbols: ['BNB/USDT'],
      timeframes: ['1h'],
      initialCapital: 15000,
      startDate: new Date('2022-01-01'),
      endDate: new Date('2023-06-30')
    });

    const optimizationConfig: OptimizationConfig = {
      method: 'grid',
      iterations: 50,
      objective: 'sharpeRatio',
      constraints: {
        maxDrawdown: 0.15,
        minSharpeRatio: 0.5,
        minTrades: 20
      },
      parallel: false
    };

    const strategy = availableStrategies[0] || new MovingAverageStrategy();

    console.log('Running parameter optimization...');
    console.log('Strategy:', strategy.name);
    console.log('Method:', optimizationConfig.method);
    console.log('Iterations:', optimizationConfig.iterations);

    // Run optimization
    const result = await optimizeParameters(strategy, config, optimizationConfig);

    console.log('\\n=== Optimization Results ===');
    console.log('Best Sharpe Ratio:', result.bestMetrics.sharpeRatio.toFixed(2));
    console.log('Best Parameters:', result.bestParameters);
    console.log('Convergence Rate:', result.convergence.convergenceRate.toFixed(3));
    console.log('Total Runs:', result.results.length);

    // Display parameter sensitivity
    console.log('\\n=== Parameter Sensitivity ===');
    result.sensitivity.forEach(param => {
      console.log(`${param.parameter}: Importance ${param.importance.toFixed(3)}, Range [${param.optimalRange[0].toFixed(2)}, ${param.optimalRange[1].toFixed(2)}]`);
    });

    return result;
  } catch (error) {
    console.error('Optimization failed:', error);
    throw error;
  }
}

// === Example 4: Strategy Comparison ===

export async function strategyComparisonExample() {
  // Disabled - useBacktesting() hook violation
  throw new Error("Function disabled - needs refactoring to remove React hooks");

  try {
    // Create comparison configuration
    const config = createDefaultConfig({
      name: 'Strategy Comparison',
      symbols: ['SOL/USDT'],
      timeframes: ['1d'],
      initialCapital: 20000,
      startDate: new Date('2022-01-01'),
      endDate: new Date('2023-12-31')
    });

    const comparisonConfig: ComparisonConfig = {
      metrics: ['sharpeRatio', 'sortinoRatio', 'calmarRatio', 'winRate', 'maxDrawdown'],
      weights: [0.3, 0.2, 0.2, 0.15, 0.15],
      benchmark: true,
      statisticalTest: true,
      regimeAnalysis: true
    };

    // Create multiple strategy variants
    const strategies = [
      new MovingAverageStrategy(),
      createMovingAverageStrategyVariant('Fast MA', { fastPeriod: 5, slowPeriod: 15 }),
      createMovingAverageStrategyVariant('Slow MA', { fastPeriod: 20, slowPeriod: 50 }),
      createMovingAverageStrategyVariant('RSI Enhanced', { useRSI: true, signalThreshold: 0.01 })
    ];

    console.log('Running strategy comparison...');
    console.log('Strategies:', strategies.map(s => s.name));
    console.log('Metrics:', comparisonConfig.metrics);

    // Run comparison
    const result = await compareStrategies(strategies, config, comparisonConfig);

    console.log('\\n=== Comparison Results ===');
    console.log('Best Strategy:', result.bestStrategy.strategy.name);
    console.log('Best Score:', result.bestStrategy.score.toFixed(2));

    console.log('\\n=== Strategy Rankings ===');
    result.strategies.forEach((strategy, index) => {
      const metrics = strategy.result.metrics;
      console.log(`${index + 1}. ${strategy.strategy.name}`);
      console.log(`   Return: ${(metrics.totalReturn * 100).toFixed(2)}%`);
      console.log(`   Sharpe: ${metrics.sharpeRatio.toFixed(2)}`);
      console.log(`   Max DD: ${(metrics.maxDrawdown * 100).toFixed(2)}%`);
    });

    return result;
  } catch (error) {
    console.error('Strategy comparison failed:', error);
    throw error;
  }
}

// === Example 5: Comprehensive Strategy Evaluation ===

export async function comprehensiveEvaluationExample() {
  // Disabled - useBacktesting() hook violation
  throw new Error("Function disabled - needs refactoring to remove React hooks");

  try {
    // Create evaluation configuration
    const config = createDefaultConfig({
      name: 'Comprehensive Evaluation',
      symbols: ['BTC/USDT', 'ETH/USDT'],
      timeframes: ['1d', '4h'],
      initialCapital: 50000,
      startDate: new Date('2021-01-01'),
      endDate: new Date('2023-12-31')
    });

    const strategy = availableStrategies[0] || new MovingAverageStrategy();

    console.log('Running comprehensive strategy evaluation...');

    // Run comprehensive evaluation
    const result = await evaluateStrategy(strategy, config, {
      walkForward: true,
      optimization: true,
      sensitivityAnalysis: true,
      statisticalTests: true
    });

    console.log('\\n=== Comprehensive Evaluation Results ===');

    // Single period results
    console.log('\\nSingle Period Performance:');
    const singleMetrics = result.singlePeriod.metrics;
    console.log(`Return: ${(singleMetrics.totalReturn * 100).toFixed(2)}%`);
    console.log(`Sharpe: ${singleMetrics.sharpeRatio.toFixed(2)}`);
    console.log(`Win Rate: ${(singleMetrics.winRate * 100).toFixed(1)}%`);

    // Walk-forward results
    if (result.walkForward) {
      console.log('\\nWalk-Forward Validation:');
      console.log(`Stability: ${result.walkForward.stabilityAnalysis.performanceStability.toFixed(2)}`);
      console.log(`Success Rate: ${(result.walkForward.windows.filter(w => w.testMetrics.sharpeRatio > 0).length / result.walkForward.windows.length * 100).toFixed(1)}%`);
    }

    // Optimization results
    if (result.optimization) {
      console.log('\\nParameter Optimization:');
      console.log(`Best Sharpe: ${result.optimization.bestMetrics.sharpeRatio.toFixed(2)}`);
      console.log(`Best Parameters:`, result.optimization.bestParameters);
    }

    // Sensitivity analysis
    if (result.sensitivityAnalysis) {
      console.log('\\nSensitivity Analysis:');
      result.sensitivityAnalysis.forEach(param => {
        console.log(`${param.parameter}: Impact ${param.impact.toFixed(3)}`);
      });
    }

    // Statistical tests
    if (result.statisticalSignificance) {
      console.log('\\nStatistical Significance:');
      console.log(`Sharpe Ratio: p-value=${result.statisticalSignificance.sharpeRatio.pValue.toFixed(3)}, significant=${result.statisticalSignificance.sharpeRatio.significant}`);
      console.log(`Returns: p-value=${result.statisticalSignificance.returns.pValue.toFixed(3)}, significant=${result.statisticalSignificance.returns.significant}`);
      console.log(`Win Rate: p-value=${result.statisticalSignificance.winRate.pValue.toFixed(3)}, significant=${result.statisticalSignificance.winRate.significant}`);
    }

    return result;
  } catch (error) {
    console.error('Comprehensive evaluation failed:', error);
    throw error;
  }
}

// === Example 6: Data Integration and Market Context ===

export async function dataIntegrationExample() {
  try {
    // Initialize data integration
    const dataIntegration = createDataIntegration({
      dataSources: [
        {
          name: 'binance',
          type: 'binance',
          baseUrl: 'https://api.binance.com/api/v3',
          symbols: ['BTC/USDT', 'ETH/USDT', 'BNB/USDT'],
          rateLimit: 1200,
          enabled: true
        }
      ],
      apiKeys: {},
      cacheConfig: {
        maxSize: 1000,
        defaultTTL: 3600000 // 1 hour
      }
    });

    console.log('Testing data integration...');

    // Get available symbols
    const symbols = await dataIntegration.getAvailableSymbols();
    console.log('Available symbols:', symbols.slice(0, 10), '...');

    // Get OHLCV data
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

    const ohlcvData = await dataIntegration.getOHLCV('BTC/USDT', '1d', startDate, endDate);
    console.log(`\\nOHLCV data points: ${ohlcvData.length}`);

    // Get news sentiment
    const newsData = await dataIntegration.getNewsSentiment(['BTC/USDT'], startDate, endDate);
    console.log(`News articles: ${newsData.length}`);

    // Get economic events
    const economicData = await dataIntegration.getEconomicEvents('USD', startDate, endDate);
    console.log(`Economic events: ${economicData.length}`);

    // Get market context
    const marketContext = await dataIntegration.getMarketContext(Date.now(), 'BTC/USDT');
    console.log('\\nCurrent Market Context:');
    console.log(`Regime: ${marketContext.regime}`);
    console.log(`Volatility: ${marketContext.volatility.toFixed(3)}`);
    console.log(`Sentiment: ${marketContext.sentiment.toFixed(3)}`);
    console.log(`Liquidity: ${marketContext.liquidity.toFixed(3)}`);

    return {
      symbols,
      ohlcvData,
      newsData,
      economicData,
      marketContext
    };
  } catch (error) {
    console.error('Data integration test failed:', error);
    throw error;
  }
}

// === Example 7: Advanced Performance Analysis ===

export function performanceAnalysisExample() {
  // Disabled - useBacktesting() hook violation
  throw new Error("Function disabled - needs refactoring to remove React hooks");

  // Example metrics analysis
  const sampleMetrics: PerformanceMetrics = {
    totalReturn: 0.45,
    annualizedReturn: 0.23,
    cumulativeReturn: 0.45,
    rollingReturns: [],
    volatility: 0.18,
    sharpeRatio: 1.24,
    sortinoRatio: 1.45,
    calmarRatio: 2.1,
    maxDrawdown: 0.11,
    maxDrawdownDuration: 45,
    valueAtRisk: 0.025,
    conditionalValueAtRisk: 0.018,
    totalTrades: 156,
    winningTrades: 89,
    losingTrades: 67,
    winRate: 0.57,
    averageWin: 0.032,
    averageLoss: 0.021,
    profitFactor: 1.89,
    averageTrade: 0.008,
    rachevRatio: 1.34,
    informationRatio: 0.67,
    treynorRatio: 0.18,
    jensenAlpha: 0.042,
    beta: 0.89,
    regimePerformance: {} as Record<string, PerformanceMetrics>
  };

  console.log('=== Performance Analysis Example ===');
  console.log('Risk-Adjusted Performance:');
  console.log(`Sharpe Ratio: ${sampleMetrics.sharpeRatio.toFixed(2)} (${sampleMetrics.sharpeRatio > 1 ? 'Excellent' : sampleMetrics.sharpeRatio > 0.5 ? 'Good' : 'Poor'})`);
  console.log(`Sortino Ratio: ${sampleMetrics.sortinoRatio.toFixed(2)} (${sampleMetrics.sortinoRatio > 1.2 ? 'Excellent' : 'Good'})`);
  console.log(`Calmar Ratio: ${sampleMetrics.calmarRatio.toFixed(2)} (${sampleMetrics.calmarRatio > 2 ? 'Excellent' : 'Good'})`);

  console.log('\\nRisk Analysis:');
  console.log(`Max Drawdown: ${(sampleMetrics.maxDrawdown * 100).toFixed(1)}% (${sampleMetrics.maxDrawdown < 0.1 ? 'Low' : sampleMetrics.maxDrawdown < 0.2 ? 'Moderate' : 'High'})`);
  console.log(`VaR (95%): ${(sampleMetrics.valueAtRisk * 100).toFixed(1)}%`);
  console.log(`CVaR (95%): ${(sampleMetrics.conditionalValueAtRisk * 100).toFixed(1)}%`);

  console.log('\\nTrading Performance:');
  console.log(`Win Rate: ${(sampleMetrics.winRate * 100).toFixed(1)}% (${sampleMetrics.winRate > 0.6 ? 'Excellent' : sampleMetrics.winRate > 0.5 ? 'Good' : 'Poor'})`);
  console.log(`Profit Factor: ${sampleMetrics.profitFactor.toFixed(2)} (${sampleMetrics.profitFactor > 1.5 ? 'Excellent' : sampleMetrics.profitFactor > 1.2 ? 'Good' : 'Poor'})`);
  console.log(`Average Trade: ${(sampleMetrics.averageTrade * 100).toFixed(1)}%`);

  // Calculate custom score
  const customScore = calculateCustomScore(sampleMetrics);
  console.log(`\\nCustom Strategy Score: ${customScore.toFixed(2)}/100`);

  return sampleMetrics;
}

// === Helper Functions ===

function createMovingAverageStrategyVariant(name: string, params: Record<string, number | string | boolean>): Strategy {
  const strategy = new MovingAverageStrategy();
  strategy.name = name;

  // Override parameters
  Object.entries(params).forEach(([key, value]) => {
    const param = strategy.parameters.find(p => p.name === key);
    if (param) {
      param.defaultValue = value;
    }
  });

  return strategy;
}

function calculateCustomScore(metrics: PerformanceMetrics): number {
  // Custom scoring algorithm
  const sharpeWeight = 0.25;
  const sortinoWeight = 0.2;
  const calmarWeight = 0.15;
  const profitFactorWeight = 0.15;
  const winRateWeight = 0.15;
  const drawdownWeight = 0.1;

  const normalizedSharpe = Math.min(2, Math.max(0, metrics.sharpeRatio)) / 2;
  const normalizedSortino = Math.min(2, Math.max(0, metrics.sortinoRatio)) / 2;
  const normalizedCalmar = Math.min(3, Math.max(0, metrics.calmarRatio)) / 3;
  const normalizedProfitFactor = Math.min(3, Math.max(0, metrics.profitFactor)) / 3;
  const normalizedWinRate = metrics.winRate;
  const normalizedDrawdown = Math.max(0, 1 - Math.abs(metrics.maxDrawdown));

  const score =
    normalizedSharpe * sharpeWeight +
    normalizedSortino * sortinoWeight +
    normalizedCalmar * calmarWeight +
    normalizedProfitFactor * profitFactorWeight +
    normalizedWinRate * winRateWeight +
    normalizedDrawdown * drawdownWeight;

  return score * 100;
}

// === Main Function to Run All Examples ===

export async function runAllExamples() {
  console.log('=== Running Backtesting Framework Examples ===\\n');

  try {
    // Example 6: Data Integration (only working example)
    console.log('1. Running Data Integration Example...');
    await dataIntegrationExample();
    console.log('✓ Data integration completed\\n');

    console.log('Note: Other examples are disabled due to React hooks violations');
    console.log('These functions need to be refactored to not use React hooks');
    console.log('=== Available Example Completed ===');

  } catch (error) {
    console.error('Example execution failed:', error);
    throw error;
  }
}

// Export for use in other modules
export {
  createMovingAverageStrategyVariant,
  calculateCustomScore
};