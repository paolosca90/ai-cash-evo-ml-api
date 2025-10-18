/**
 * React Hook for Backtesting Integration
 *
 * Comprehensive React hook for integrating the backtesting framework
 * with React components, providing state management, and handling
 * asynchronous operations.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  BacktestConfig,
  Strategy,
  BacktestResult,
  WalkForwardResult,
  OptimizationResult,
  StrategyComparison,
  PerformanceMetrics,
  BacktestProgress,
  OptimizationConfig,
  ComparisonConfig
} from '../types/backtesting';

import { BacktestEngine } from '../lib/backtesting/BacktestEngine';
import { StrategyEvaluator } from '../lib/backtesting/StrategyEvaluator';
import { MetricsCalculator } from '../lib/backtesting/MetricsCalculator';
import { DataIntegration } from '../lib/backtesting/DataIntegration';
import { MovingAverageStrategy } from '../lib/backtesting/strategies/MovingAverageStrategy';

interface BacktestingState {
  isLoading: boolean;
  error: string | null;
  results: BacktestResult | WalkForwardResult | OptimizationResult | StrategyComparison | null;
  progress: BacktestProgress | null;
  availableStrategies: Strategy[];
  availableSymbols: string[];
  history: BacktestHistory[];
}

interface BacktestHistory {
  id: string;
  timestamp: Date;
  type: 'single' | 'walkforward' | 'optimization' | 'comparison';
  config: BacktestConfig;
  results: BacktestResult | WalkForwardResult | OptimizationResult | StrategyComparison;
  name: string;
}

interface UseBacktestingOptions {
  autoSaveHistory?: boolean;
  maxHistoryItems?: number;
  enableCache?: boolean;
  defaultConfig?: Partial<BacktestConfig>;
}

export function useBacktesting(options: UseBacktestingOptions = {}) {
  const {
    autoSaveHistory = true,
    maxHistoryItems = 20,
    enableCache = true,
    defaultConfig = {}
  } = options;

  // State
  const [state, setState] = useState<BacktestingState>({
    isLoading: false,
    error: null,
    results: null,
    progress: null,
    availableStrategies: [],
    availableSymbols: [],
    history: []
  });

  // Refs for maintaining instances
  const dataIntegrationRef = useRef<DataIntegration | null>(null);
  const backtestEngineRef = useRef<BacktestEngine | null>(null);
  const evaluatorRef = useRef<StrategyEvaluator | null>(null);
  const metricsCalculatorRef = useRef<MetricsCalculator | null>(null);

  // Initialize backtesting components
  useEffect(() => {
    const initializeComponents = async () => {
      try {
        // Initialize data integration
        dataIntegrationRef.current = new DataIntegration({
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
            defaultTTL: 3600000
          }
        });

        // Initialize other components
        metricsCalculatorRef.current = new MetricsCalculator();
        backtestEngineRef.current = new BacktestEngine(dataIntegrationRef.current);
        evaluatorRef.current = new StrategyEvaluator(
          backtestEngineRef.current,
          metricsCalculatorRef.current
        );

        // Load available symbols
        const symbols = await dataIntegrationRef.current.getAvailableSymbols();

        // Load available strategies
        const strategies = [
          new MovingAverageStrategy(),
          // Add more strategies here
        ];

        setState(prev => ({
          ...prev,
          availableStrategies: strategies,
          availableSymbols: symbols
        }));

        // Load history from localStorage
        if (autoSaveHistory) {
          const savedHistory = localStorage.getItem('backtesting_history');
          if (savedHistory) {
            try {
              const history = JSON.parse(savedHistory).map((item: Omit<BacktestHistory, 'timestamp'> & { timestamp: string }) => ({
                ...item,
                timestamp: new Date(item.timestamp)
              }));
              setState(prev => ({
                ...prev,
                history: history.slice(-maxHistoryItems)
              }));
            } catch (error) {
              console.error('Failed to load backtesting history:', error);
            }
          }
        }
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: `Initialization failed: ${error.message}`
        }));
      }
    };

    initializeComponents();

    // Cleanup
    return () => {
      // Cleanup resources if needed
    };
  }, [autoSaveHistory, maxHistoryItems]);

  // === Core Backtesting Operations ===

  const runBacktest = useCallback(async (
    strategy: Strategy,
    config: BacktestConfig
  ): Promise<BacktestResult> => {
    if (!backtestEngineRef.current) {
      throw new Error('Backtest engine not initialized');
    }

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      progress: null
    }));

    try {
      // Set up progress callback
      const progressCallback = (progress: BacktestProgress) => {
        setState(prev => ({ ...prev, progress }));
      };

      backtestEngineRef.current.onProgress(progressCallback);

      const result = await backtestEngineRef.current.runBacktest(strategy, config);

      // Save to history
      if (autoSaveHistory) {
        const historyItem: BacktestHistory = {
          id: `bt_${Date.now()}`,
          timestamp: new Date(),
          type: 'single',
          config,
          results: result,
          name: `${strategy.name} - ${config.name}`
        };

        setState(prev => ({
          ...prev,
          history: [...prev.history.slice(-maxHistoryItems + 1), historyItem]
        }));

        // Save to localStorage
        try {
          localStorage.setItem(
            'backtesting_history',
            JSON.stringify([...state.history.slice(-maxHistoryItems + 1), historyItem])
          );
        } catch (error) {
          console.error('Failed to save backtesting history:', error);
        }
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        results: result,
        progress: null
      }));

      return result;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message,
        progress: null
      }));
      throw error;
    }
  }, [autoSaveHistory, maxHistoryItems, state.history]);

  const runWalkForward = useCallback(async (
    strategy: Strategy,
    config: BacktestConfig
  ): Promise<WalkForwardResult> => {
    if (!backtestEngineRef.current) {
      throw new Error('Backtest engine not initialized');
    }

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      progress: null
    }));

    try {
      const result = await backtestEngineRef.current.runWalkForward(strategy, config);

      setState(prev => ({
        ...prev,
        isLoading: false,
        results: result,
        progress: null
      }));

      return result;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message,
        progress: null
      }));
      throw error;
    }
  }, []);

  const optimizeParameters = useCallback(async (
    strategy: Strategy,
    config: BacktestConfig,
    optimizationConfig: OptimizationConfig
  ): Promise<OptimizationResult> => {
    if (!backtestEngineRef.current) {
      throw new Error('Backtest engine not initialized');
    }

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      progress: null
    }));

    try {
      const result = await backtestEngineRef.current.optimizeParameters(
        strategy,
        config,
        optimizationConfig
      );

      setState(prev => ({
        ...prev,
        isLoading: false,
        results: result,
        progress: null
      }));

      return result;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message,
        progress: null
      }));
      throw error;
    }
  }, []);

  const compareStrategies = useCallback(async (
    strategies: Strategy[],
    config: BacktestConfig,
    comparisonConfig: ComparisonConfig
  ): Promise<StrategyComparison> => {
    if (!backtestEngineRef.current) {
      throw new Error('Backtest engine not initialized');
    }

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      progress: null
    }));

    try {
      const result = await backtestEngineRef.current.compareStrategies(
        strategies,
        config,
        comparisonConfig
      );

      setState(prev => ({
        ...prev,
        isLoading: false,
        results: result,
        progress: null
      }));

      return result;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message,
        progress: null
      }));
      throw error;
    }
  }, []);

  // === Strategy Evaluation ===

  const evaluateStrategy = useCallback(async (
    strategy: Strategy,
    config: BacktestConfig,
    options: {
      walkForward?: boolean;
      optimization?: boolean;
      sensitivityAnalysis?: boolean;
      statisticalTests?: boolean;
    } = {}
  ) => {
    if (!evaluatorRef.current) {
      throw new Error('Strategy evaluator not initialized');
    }

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      progress: null
    }));

    try {
      const result = await evaluatorRef.current.evaluateStrategy(strategy, config, options);

      setState(prev => ({
        ...prev,
        isLoading: false,
        results: result.singlePeriod, // Show single period as main result
        progress: null
      }));

      return result;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message,
        progress: null
      }));
      throw error;
    }
  }, []);

  // === Data Operations ===

  const getAvailableSymbols = useCallback(async (): Promise<string[]> => {
    if (!dataIntegrationRef.current) {
      throw new Error('Data integration not initialized');
    }

    try {
      const symbols = await dataIntegrationRef.current.getAvailableSymbols();
      setState(prev => ({ ...prev, availableSymbols: symbols }));
      return symbols;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: `Failed to get symbols: ${error.message}`
      }));
      throw error;
    }
  }, []);

  const previewData = useCallback(async (
    symbol: string,
    timeframe: string,
    startDate: Date,
    endDate: Date
  ) => {
    if (!dataIntegrationRef.current) {
      throw new Error('Data integration not initialized');
    }

    try {
      const ohlcv = await dataIntegrationRef.current.getOHLCV(symbol, timeframe, startDate, endDate);
      return ohlcv.slice(0, 100); // Return first 100 records for preview
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: `Failed to preview data: ${error.message}`
      }));
      throw error;
    }
  }, []);

  // === History Management ===

  const clearHistory = useCallback(() => {
    setState(prev => ({ ...prev, history: [] }));
    if (autoSaveHistory) {
      localStorage.removeItem('backtesting_history');
    }
  }, [autoSaveHistory]);

  const loadHistoryItem = useCallback((historyItem: BacktestHistory) => {
    setState(prev => ({
      ...prev,
      results: historyItem.results
    }));
  }, []);

  const deleteHistoryItem = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      history: prev.history.filter(item => item.id !== id)
    }));

    if (autoSaveHistory) {
      try {
        localStorage.setItem(
          'backtesting_history',
          JSON.stringify(state.history.filter(item => item.id !== id))
        );
      } catch (error) {
        console.error('Failed to save backtesting history:', error);
      }
    }
  }, [autoSaveHistory, state.history]);

  // === Utility Functions ===

  const createDefaultConfig = useCallback((overrides: Partial<BacktestConfig> = {}): BacktestConfig => {
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

    return {
      name: 'Backtest',
      description: 'Default backtest configuration',
      symbols: ['BTC/USDT'],
      timeframes: ['1d'],
      startDate: oneYearAgo,
      endDate: now,
      initialCapital: 10000,
      baseCurrency: 'USD',
      leverage: 1,
      commission: {
        type: 'percentage',
        value: 0.001,
        currency: 'USD'
      },
      slippage: {
        type: 'percentage',
        value: 0.0005
      },
      riskManagement: {
        maxPositionSize: 0.1,
        maxDrawdown: 0.2,
        maxDailyLoss: 0.05,
        stopLoss: 0.02,
        takeProfit: 0.04
      },
      walkForward: {
        enabled: false,
        windowSize: 180,
        stepSize: 30,
        testSize: 60
      },
      ...defaultConfig,
      ...overrides
    };
  }, [defaultConfig]);

  const exportResults = useCallback((
    format: 'json' | 'csv' | 'pdf',
    results: BacktestResult | WalkForwardResult | OptimizationResult | StrategyComparison = state.results
  ): string => {
    if (!results) {
      throw new Error('No results to export');
    }

    switch (format) {
      case 'json':
        return JSON.stringify(results, null, 2);

      case 'csv':
        return exportToCSV(results);

      case 'pdf':
        // In a real implementation, this would generate a PDF
        return 'PDF export would be implemented here';

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }, [state.results]);

  const calculateMetrics = useCallback((result: BacktestResult): PerformanceMetrics => {
    if (!metricsCalculatorRef.current) {
      throw new Error('Metrics calculator not initialized');
    }

    return metricsCalculatorRef.current.calculatePerformanceMetrics(result);
  }, []);

  // === State and Actions ===

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const clearResults = useCallback(() => {
    setState(prev => ({ ...prev, results: null }));
  }, []);

  return {
    // State
    isLoading: state.isLoading,
    error: state.error,
    results: state.results,
    progress: state.progress,
    availableStrategies: state.availableStrategies,
    availableSymbols: state.availableSymbols,
    history: state.history,

    // Actions
    runBacktest,
    runWalkForward,
    optimizeParameters,
    compareStrategies,
    evaluateStrategy,
    getAvailableSymbols,
    previewData,
    clearHistory,
    loadHistoryItem,
    deleteHistoryItem,
    createDefaultConfig,
    exportResults,
    calculateMetrics,
    clearError,
    clearResults,

    // Components
    dataIntegration: dataIntegrationRef.current,
    backtestEngine: backtestEngineRef.current,
    evaluator: evaluatorRef.current,
    metricsCalculator: metricsCalculatorRef.current
  };
}

// === Helper Functions ===

function exportToCSV(results: BacktestResult | WalkForwardResult | OptimizationResult | StrategyComparison): string {
  let csv = '';

  if (results.equity) {
    csv += 'Equity Curve\\n';
    csv += 'Timestamp,Value,Returns,Drawdown\\n';
    ('equity' in results ? results.equity : []).forEach((point: { timestamp: number; value: number; returns: number; drawdown: number }) => {
      csv += `${new Date(point.timestamp).toISOString()},${point.value},${point.returns},${point.drawdown}\\n`;
    });
    csv += '\\n';
  }

  if (results.trades) {
    csv += 'Trades\\n';
    csv += 'ID,Symbol,Direction,EntryPrice,ExitPrice,Quantity,PnL,Fees,EntryTime,ExitTime\\n';
    ('trades' in results ? results.trades : []).forEach((trade: { id: string; symbol: string; direction: string; entryPrice: number; exitPrice?: number; quantity: number; pnl?: number; fees?: number; entryTime: number; exitTime?: number }) => {
      csv += `${trade.id},${trade.symbol},${trade.direction},${trade.entryPrice},${trade.exitPrice || ''},${trade.quantity},${trade.pnl || ''},${trade.fees || ''},${new Date(trade.entryTime).toISOString()},${trade.exitTime ? new Date(trade.exitTime).toISOString() : ''}\\n`;
    });
  }

  if (results.metrics) {
    csv += '\\nPerformance Metrics\\n';
    csv += 'Metric,Value\\n';
    Object.entries('metrics' in results ? results.metrics : {}).forEach(([key, value]) => {
      if (typeof value === 'number') {
        csv += `${key},${value}\\n`;
      }
    });
  }

  return csv;
}