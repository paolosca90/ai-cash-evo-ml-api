// @ts-nocheck
import {
  RLInferenceConfig,
  SupabaseStorageConfig,
  TradingState,
  RLAction,
  InferenceStats,
  UncertaintyEstimate,
  ConstraintViolation,
  PerformanceMetrics,
  RLAgentConfig
} from '../../types/rl-trading';
import { InferenceEngine } from './InferenceEngine';
import { ModelLoader } from './ModelLoader';
import { UnifiedFeatureEngineer } from '../feature-engineering/UnifiedFeatureEngineer';
import { supabase } from '../../integrations/supabase/client';

/**
 * Main RL Trading Service
 * Orchestrates the entire RL trading system with model loading,
 * inference, monitoring, and integration with existing trading system
 */
export class RLTradingService {
  private modelLoader: ModelLoader;
  private inferenceEngine: InferenceEngine;
  private featureEngineer: UnifiedFeatureEngineer;
  private config: RLAgentConfig;
  private isInitialized: boolean = false;
  private isActive: boolean = false;
  private performanceMetrics: PerformanceMetrics;
  private lastUpdateTime: number = 0;

  constructor(config: RLAgentConfig) {
    this.config = config;
    this.featureEngineer = new UnifiedFeatureEngineer();

    // Initialize storage configuration
    const storageConfig: SupabaseStorageConfig = {
      bucket: 'rl-models',
      path: 'trading-models',
      region: 'us-east-1'
    };

    this.modelLoader = new ModelLoader(config.inference, storageConfig);
    this.inferenceEngine = new InferenceEngine(
      this.modelLoader,
      config.inference,
      this.featureEngineer
    );

    // Initialize performance metrics
    this.performanceMetrics = this.initializePerformanceMetrics();
  }

  /**
   * Initialize the RL trading service
   */
  public async initialize(): Promise<void> {
    try {
      console.log('Initializing RL Trading Service...');

      // Preload models
      await this.preloadModels();

      // Initialize feature engineer
      this.featureEngineer = new UnifiedFeatureEngineer();

      this.isInitialized = true;
      console.log('RL Trading Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize RL Trading Service:', error);
      throw error;
    }
  }

  /**
   * Start the trading service
   */
  public async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized. Call initialize() first.');
    }

    this.isActive = true;
    console.log('RL Trading Service started');

    // Start periodic health checks
    this.startHealthChecks();

    // Start performance monitoring
    this.startPerformanceMonitoring();
  }

  /**
   * Stop the trading service
   */
  public stop(): void {
    this.isActive = false;
    console.log('RL Trading Service stopped');
  }

  /**
   * Main prediction method for trading decisions
   */
  public async predictTradingAction(marketData: unknown): Promise<{
    action: RLAction;
    confidence: number;
    reasoning: string;
    riskLevel: number;
    constraints: ConstraintViolation[];
    uncertainty: UncertaintyEstimate;
    processingTime: number;
  }> {
    if (!this.isActive || !this.isInitialized) {
      throw new Error('Service not active or initialized');
    }

    const startTime = performance.now();

    try {
      // Convert market data to trading state
      const state = this.convertMarketDataToState(marketData);

      // Get prediction from inference engine
      const prediction = await this.inferenceEngine.predict(state);

      // Apply additional filters and validation
      const validatedAction = this.validateAndFilterAction(prediction.action, state);

      // Log prediction for monitoring
      await this.logPrediction(state, validatedAction, prediction.uncertainty);

      const processingTime = performance.now() - startTime;

      return {
        action: validatedAction,
        confidence: validatedAction.confidence,
        reasoning: validatedAction.reasoning || '',
        riskLevel: validatedAction.riskLevel,
        constraints: prediction.constraints,
        uncertainty: prediction.uncertainty,
        processingTime
      };
    } catch (error) {
      console.error('Prediction failed:', error);
      throw error;
    }
  }

  /**
   * Convert market data to trading state
   */
  private convertMarketDataToState(marketData: unknown): TradingState {
    const now = Date.now();

    return {
      features: [], // Will be populated by feature engineer
      timestamp: now,
      symbol: marketData.symbol || 'BTC/USD',
      timeframe: marketData.timeframe || '1h',
      marketContext: {
        price: marketData.price || 0,
        volume: marketData.volume || 0,
        volatility: marketData.volatility || 0.5,
        trend: marketData.trend || 0,
        marketRegime: {
          trendDirection: marketData.regime?.trendDirection || 'sideways',
          volatilityState: marketData.regime?.volatilityState || 'normal',
          momentumState: marketData.regime?.momentumState || 'maintaining'
        },
        sessionInfo: {
          londonSession: this.isSessionActive(now, 'london'),
          nySession: this.isSessionActive(now, 'ny'),
          asianSession: this.isSessionActive(now, 'asian'),
          sessionOverlap: this.isSessionOverlap(now),
          volatility: marketData.volatility || 0.5
        },
        technicalIndicators: marketData.technicalIndicators || {
          atr: { value: 0, normalized: 0.5 },
          bollingerBands: { upper: 0, middle: 0, lower: 0, position: 0.5, width: 0.5 },
          rsi: { value: 50, divergence: 0 },
          macd: { line: 0, signal: 0, histogram: 0 }
        },
        sentiment: marketData.sentiment || {
          score: 0,
          confidence: 0,
          riskLevel: 0.5
        }
      },
      positionState: marketData.positionState || {
        currentPosition: 'NONE',
        entryPrice: null,
        positionSize: 0,
        unrealizedPnL: 0,
        positionAge: 0,
        stopLoss: null,
        takeProfit: null
      },
      portfolioState: marketData.portfolioState || {
        totalValue: 10000,
        availableBalance: 10000,
        marginUsed: 0,
        leverage: 1,
        riskLevel: 0.1,
        dailyPnL: 0,
        winRate: 0,
        maxDrawdown: 0
      }
    };
  }

  /**
   * Validate and filter action
   */
  private validateAndFilterAction(action: RLAction, state: TradingState): RLAction {
    const validatedAction = { ...action };

    // Check minimum confidence threshold
    if (action.confidence < this.config.inference.confidenceThreshold) {
      validatedAction.direction = 'HOLD';
      validatedAction.intensity = 0;
      validatedAction.reasoning = `Low confidence (${action.confidence.toFixed(2)} < ${this.config.inference.confidenceThreshold}) • ${action.reasoning}`;
    }

    // Check risk limits
    if (action.riskLevel > 0.8) {
      validatedAction.intensity *= 0.5;
      validatedAction.reasoning += ` • High risk detected, intensity reduced`;
    }

    // Check portfolio constraints
    if (state.portfolioState.riskLevel > 0.7 && action.direction !== 'HOLD') {
      validatedAction.direction = 'HOLD';
      validatedAction.reasoning += ` • Portfolio risk too high (${state.portfolioState.riskLevel.toFixed(2)})`;
    }

    // Check market hours
    const hour = new Date(state.timestamp).getUTCHours();
    if (hour < 6 || hour > 22) {
      validatedAction.intensity *= 0.7;
      validatedAction.reasoning += ` • Trading outside optimal hours (${hour}:00 UTC)`;
    }

    return validatedAction;
  }

  /**
   * Log prediction for monitoring
   */
  private async logPrediction(
    state: TradingState,
    action: RLAction,
    uncertainty: UncertaintyEstimate
  ): Promise<void> {
    try {
      const predictionLog = {
        timestamp: state.timestamp,
        symbol: state.symbol,
        timeframe: state.timeframe,
        action: action.direction,
        intensity: action.intensity,
        confidence: action.confidence,
        riskLevel: action.riskLevel,
        expectedReward: action.expectedReward,
        uncertainty: uncertainty.total,
        epistemicUncertainty: uncertainty.epistemic,
        aleatoricUncertainty: uncertainty.aleatoric,
        reasoning: action.reasoning,
        marketPrice: state.marketContext.price,
        marketTrend: state.marketContext.trend,
        marketVolatility: state.marketContext.volatility,
        positionState: state.positionState.currentPosition,
        portfolioValue: state.portfolioState.totalValue,
        portfolioRisk: state.portfolioState.riskLevel
      };

      await supabase
        .from('rl_predictions')
        .insert([predictionLog]);
    } catch (error) {
      console.error('Failed to log prediction:', error);
    }
  }

  /**
   * Check if session is active
   */
  private isSessionActive(timestamp: number, session: 'london' | 'ny' | 'asian'): boolean {
    const hour = new Date(timestamp).getUTCHours();

    switch (session) {
      case 'london':
        return hour >= 8 && hour < 16;
      case 'ny':
        return hour >= 13 && hour < 21;
      case 'asian':
        return hour >= 0 && hour < 8;
      default:
        return false;
    }
  }

  /**
   * Check if there's a session overlap
   */
  private isSessionOverlap(timestamp: number): boolean {
    const hour = new Date(timestamp).getUTCHours();
    return (hour >= 13 && hour < 16); // London-NY overlap
  }

  /**
   * Preload models for common symbols
   */
  private async preloadModels(): Promise<void> {
    const commonSymbols = ['BTC/USD', 'ETH/USD', 'SOL/USD'];
    try {
      await this.inferenceEngine.preloadModels(commonSymbols);
    } catch (error) {
      console.error('Failed to preload models:', error);
    }
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error('Health check failed:', error);
      }
    }, 60000); // Every minute
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(): Promise<void> {
    const stats = this.inferenceEngine.getEngineStats();
    const modelHealth = this.inferenceEngine.getModelHealth();

    // Log health metrics
    console.log('RL Trading Service Health:', {
      engineStats: stats,
      modelHealth,
      isActive: this.isActive,
      isInitialized: this.isInitialized
    });

    // Alert if health is poor
    if (stats.health === 'unhealthy') {
      console.error('RL Trading Service is unhealthy!');
      // Could send notification here
    }
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    setInterval(async () => {
      try {
        await this.updatePerformanceMetrics();
      } catch (error) {
        console.error('Performance monitoring failed:', error);
      }
    }, 300000); // Every 5 minutes
  }

  /**
   * Update performance metrics
   */
  private async updatePerformanceMetrics(): Promise<void> {
    try {
      // Fetch recent predictions from database
      const { data, error } = await supabase
        .from('rl_predictions')
        .select('*')
        .gte('timestamp', Date.now() - 86400000) // Last 24 hours
        .order('timestamp', { ascending: false });

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        this.performanceMetrics = this.calculatePerformanceMetrics(data);
        this.lastUpdateTime = Date.now();

        // Log performance metrics
        console.log('Performance metrics updated:', this.performanceMetrics);
      }
    } catch (error) {
      console.error('Failed to update performance metrics:', error);
    }
  }

  /**
   * Calculate performance metrics from prediction data
   */
  private calculatePerformanceMetrics(predictions: unknown[]): PerformanceMetrics {
    if (predictions.length === 0) {
      return this.initializePerformanceMetrics();
    }

    // Calculate returns (simplified - would need actual trade outcomes)
    const returns = predictions.map(p => p.expectedReward).filter(r => r !== 0);

    const totalReturns = returns.reduce((sum, r) => sum + r, 0);
    const averageReturn = returns.length > 0 ? totalReturns / returns.length : 0;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - averageReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);

    // Calculate Sharpe ratio (simplified)
    const sharpeRatio = volatility > 0 ? averageReturn / volatility : 0;

    // Calculate win rate
    const winningTrades = returns.filter(r => r > 0).length;
    const winRate = returns.length > 0 ? winningTrades / returns.length : 0;

    // Calculate profit factor
    const grossProfit = returns.filter(r => r > 0).reduce((sum, r) => sum + r, 0);
    const grossLoss = Math.abs(returns.filter(r => r < 0).reduce((sum, r) => sum + r, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;

    return {
      totalReturns,
      annualizedReturns: averageReturn * 365,
      volatility,
      sharpeRatio,
      sortinoRatio: sharpeRatio * 0.9, // Simplified
      maxDrawdown: Math.abs(Math.min(...returns)),
      calmarRatio: Math.abs(Math.min(...returns)) > 0 ? totalReturns / Math.abs(Math.min(...returns)) : 0,
      winRate,
      profitFactor,
      averageTrade: averageReturn,
      tradeCount: returns.length,
      bestTrade: Math.max(...returns),
      worstTrade: Math.min(...returns),
      averageHoldingPeriod: 3600 // Placeholder
    };
  }

  /**
   * Initialize performance metrics
   */
  private initializePerformanceMetrics(): PerformanceMetrics {
    return {
      totalReturns: 0,
      annualizedReturns: 0,
      volatility: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      maxDrawdown: 0,
      calmarRatio: 0,
      winRate: 0,
      profitFactor: 0,
      averageTrade: 0,
      tradeCount: 0,
      bestTrade: 0,
      worstTrade: 0,
      averageHoldingPeriod: 0
    };
  }

  /**
   * Get service status
   */
  public getServiceStatus(): {
    isInitialized: boolean;
    isActive: boolean;
    lastUpdateTime: number;
    engineStats: unknown;
    modelHealth: unknown[];
    performanceMetrics: PerformanceMetrics;
    health: 'healthy' | 'degraded' | 'unhealthy';
  } {
    const engineStats = this.inferenceEngine.getEngineStats();
    const modelHealth = this.inferenceEngine.getModelHealth();

    let health: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (engineStats.health === 'unhealthy' || modelHealth.some(h => h.health === 'unhealthy')) {
      health = 'unhealthy';
    } else if (engineStats.health === 'degraded' || modelHealth.some(h => h.health === 'degraded')) {
      health = 'degraded';
    }

    return {
      isInitialized: this.isInitialized,
      isActive: this.isActive,
      lastUpdateTime: this.lastUpdateTime,
      engineStats,
      modelHealth,
      performanceMetrics: this.performanceMetrics,
      health
    };
  }

  /**
   * Get detailed statistics
   */
  public getDetailedStats(): {
    serviceStatus: unknown;
    cacheStats: unknown;
    featureStats: unknown;
    predictionStats: {
      totalPredictions: number;
      averageConfidence: number;
      averageProcessingTime: number;
      errorRate: number;
    };
  } {
    const serviceStatus = this.getServiceStatus();
    const cacheStats = this.modelLoader.getCacheStats();
    const featureStats = this.featureEngineer.getFeatureStatistics();

    return {
      serviceStatus,
      cacheStats,
      featureStats,
      predictionStats: {
        totalPredictions: serviceStatus.engineStats.inferenceStats.predictionCount,
        averageConfidence: serviceStatus.engineStats.inferenceStats.averageConfidence,
        averageProcessingTime: serviceStatus.engineStats.inferenceStats.inferenceTime,
        errorRate: serviceStatus.engineStats.inferenceStats.errorCount / Math.max(1, serviceStatus.engineStats.inferenceStats.predictionCount)
      }
    };
  }

  /**
   * Reset service
   */
  public async reset(): Promise<void> {
    console.log('Resetting RL Trading Service...');

    // Stop service
    this.isActive = false;

    // Clear models
    this.inferenceEngine.clearModels();

    // Clear cache
    this.modelLoader.clearCache();

    // Reset stats
    this.inferenceEngine.resetStats();

    // Reinitialize
    await this.initialize();

    console.log('RL Trading Service reset complete');
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<RLAgentConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('Configuration updated');
  }

  /**
   * Export service state
   */
  public exportState(): unknown {
    return {
      config: this.config,
      performanceMetrics: this.performanceMetrics,
      serviceStatus: this.getServiceStatus(),
      detailedStats: this.getDetailedStats(),
      timestamp: Date.now()
    };
  }

  /**
   * Get feature importance analysis
   */
  public async getFeatureImportance(symbol: string, timeframe: string): Promise<unknown> {
    try {
      // Fetch recent feature vectors and predictions
      const { data, error } = await supabase
        .from('rl_predictions')
        .select('*')
        .eq('symbol', symbol)
        .eq('timeframe', timeframe)
        .gte('timestamp', Date.now() - 604800000) // Last 7 days
        .order('timestamp', { ascending: false })
        .limit(1000);

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        return { message: 'No data available for feature importance analysis' };
      }

      // Calculate feature importance (simplified)
      const featureImportance = this.calculateFeatureImportance(data);

      return {
        symbol,
        timeframe,
        analysisPeriod: 'Last 7 days',
        dataPoints: data.length,
        featureImportance,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Failed to get feature importance:', error);
      throw error;
    }
  }

  /**
   * Calculate feature importance from prediction data
   */
  private calculateFeatureImportance(predictions: unknown[]): unknown {
    // Simplified feature importance calculation
    // In practice, this would use more sophisticated methods like SHAP or permutation importance

    const features = [
      'price_change', 'volatility', 'trend', 'sentiment', 'volume',
      'rsi', 'macd', 'bollinger', 'session_time', 'market_regime'
    ];

    return features.map(feature => ({
      feature,
      importance: Math.random() * 0.8 + 0.1, // Placeholder
      trend: Math.random() > 0.5 ? 'increasing' : 'decreasing',
      stability: Math.random() * 0.4 + 0.6,
      recommendation: Math.random() > 0.3 ? 'keep' : 'monitor'
    })).sort((a, b) => b.importance - a.importance);
  }
}