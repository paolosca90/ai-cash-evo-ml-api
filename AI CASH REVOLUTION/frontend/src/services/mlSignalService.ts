/**
 * ML Signal Service - Production Integration
 *
 * Integrates TensorFlow.js ML models with real trading data
 * Replaces synthetic data with actual market information
 */

import { supabase } from '@/integrations/supabase/client';
// TODO: Fix imports
// import { TFInferenceEngine } from '@/lib/rl-trading/TFInferenceEngine';
// import { UnifiedFeatureEngineer } from '@/lib/feature-engineering/UnifiedFeatureEngineer';
// import type { RLAction } from '@/types/rl-trading';
// import { ModelInitializer } from '@/lib/rl-trading/ModelInitializer';
import type { AISignal } from '@/types/trading';
import type { TradingState, RLInferenceConfig } from '@/types/rl-trading';
import { signalWeightCalculator } from './signalWeightCalculator';
import type { WeightResult } from './signalWeightCalculator';

interface MarketDataResponse {
  price: number;
  volume: number;
  rsi?: number;
  macd?: number;
  atr?: number;
  sma_20?: number;
  ema_20?: number;
  stoch_k?: number;
  stoch_d?: number;
  avg_volume?: number;
  [key: string]: unknown;
}

export interface MLSignalOptions {
  symbol: string;
  timeout?: number;
  useEnsemble?: boolean;
  enableConstraints?: boolean;
}

export interface MLSignalResult {
  success: boolean;
  signal?: AISignal;
  error?: string;
  uncertainty?: {
    epistemic: number;
    aleatoric: number;
    total: number;
  };
  constraints?: Array<{
    type: string;
    severity: string;
    message: string;
  }>;
  weight?: WeightResult;
  processingTime: number;
}

class MLSignalService {
  private static instance: MLSignalService;
  // private inferenceEngine: TFInferenceEngine | null = null;
  // private featureEngineer: UnifiedFeatureEngineer;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {
    // this.featureEngineer = new UnifiedFeatureEngineer();
  }

  static getInstance(): MLSignalService {
    if (!MLSignalService.instance) {
      MLSignalService.instance = new MLSignalService();
    }
    return MLSignalService.instance;
  }

  /**
   * Initialize ML models (singleton pattern)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;
    console.log('⚠️ ML Signal Service temporarily disabled');
    return;
    /*
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = (async () => {
      try {
        console.log('🚀 Initializing ML Signal Service...');

        // Ensure models exist
        await ModelInitializer.ensureModelsExist();

        // Create inference engine
        const config: RLInferenceConfig = {
          modelPath: 'default',
          batchSize: 1,
          maxPositionSize: 0.1, // 10% max position
          uncertaintyThreshold: 0.3,
          useEnsemble: true,
          enableConstraints: true,
          timeout: 5000
        };

        this.inferenceEngine = new TFInferenceEngine(config, this.featureEngineer);
        await this.inferenceEngine.initialize();

        this.isInitialized = true;
        console.log('✅ ML Signal Service initialized');
      } catch (error) {
        console.error('❌ Failed to initialize ML Signal Service:', error);
        throw error;
      }
    })();

    return this.initializationPromise;
    */
  }

  /**
   * Generate ML-powered trading signal with real market data
   */
  async generateSignal(options: MLSignalOptions): Promise<MLSignalResult> {
    const startTime = Date.now();

    // Temporarily disabled - return error
    return {
      success: false,
      error: 'ML Signal Service temporarily disabled - missing dependencies',
      processingTime: Date.now() - startTime
    };

    /* ORIGINAL CODE - TEMPORARILY DISABLED
    const { symbol, timeout = 10000, useEnsemble = true, enableConstraints = true } = options;

    try {
      // Ensure initialized
      await this.initialize();

      if (!this.inferenceEngine) {
        throw new Error('Inference engine not initialized');
      }

      console.log(`🤖 Generating ML signal for ${symbol}...`);

      // 1. Fetch real market data
      const marketData = await this.fetchMarketData(symbol, timeout);

      // 2. Build trading state with real data
      const tradingState = await this.buildTradingState(symbol, marketData);

      // 3. Get ML prediction
      const prediction = await this.inferenceEngine.predict(tradingState);

      // 4. Convert to AISignal format
      const signal = this.convertToAISignal(prediction, symbol, marketData);

      // 5. Adjust confidence based on uncertainty and constraints
      signal.confidence = this.adjustConfidence(
        signal.confidence,
        prediction.uncertainty,
        prediction.constraints
      );

      // 6. Calculate signal weight
      const weightResult = this.calculateSignalWeight(
        signal,
        marketData,
        prediction.uncertainty
      );

      // 7. Add weight metadata to signal
      (signal as AISignal & { weight?: WeightResult }).weight = weightResult;

      // 8. Apply weight-based filtering
      const filterResult = this.applyWeightFilter(signal, weightResult);

      if (filterResult.filtered) {
        console.log(`⚠️ Signal filtered: ${filterResult.reason}`);
        // Override signal to HOLD if weight is too low
        signal.type = 'HOLD';
        signal.reasoning = `${signal.reasoning} | ${filterResult.reason}`;
      }

      const processingTime = Date.now() - startTime;
      console.log(`✅ ML signal generated in ${processingTime}ms:`, {
        action: prediction.action.type,
        finalType: signal.type,
        confidence: signal.confidence,
        uncertainty: prediction.uncertainty.total,
        weight: weightResult.total_weight,
        recommendation: weightResult.recommendation,
        filtered: filterResult.filtered
      });

      return {
        success: true,
        signal,
        uncertainty: {
          epistemic: prediction.uncertainty.epistemic,
          aleatoric: prediction.uncertainty.aleatoric,
          total: prediction.uncertainty.total
        },
        constraints: prediction.constraints.map(c => ({
          type: c.type,
          severity: c.severity,
          message: c.message
        })),
        weight: weightResult,
        processingTime
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';

      console.error('❌ ML signal generation failed:', errorMsg);

      return {
        success: false,
        error: errorMsg,
        processingTime
      };
    }
    */
  }

  /**
   * Fetch real market data from OANDA
   */
  private async fetchMarketData(symbol: string, timeout: number): Promise<Record<string, unknown>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Use OANDA Edge Function for market data
      const response = await fetch(
        `https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1/oanda-market-data`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ symbol }),
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`OANDA market data fetch failed: ${response.status}`);
      }

      const data = await response.json();
      return data as MarketDataResponse;

    } catch (error) {
      clearTimeout(timeoutId);

      // Fallback: Try to get from database cache
      console.warn('OANDA API failed, trying database cache...');

      const { data, error: dbError } = await supabase
        .from('market_data_cache')
        .select('*')
        .eq('symbol', symbol)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (dbError || !data) {
        throw new Error('No market data available from OANDA or cache');
      }

      return data;
    }
  }

  /**
   * Build TradingState from real market data
   */
  private async buildTradingState(symbol: string, marketData: Record<string, unknown>): Promise<TradingState> {
    // Extract price and indicators from market data
    const price = marketData.price || marketData.close || 0;
    const volume = marketData.volume || 0;

    // Get technical indicators
    const technicalIndicators = {
      rsi: { value: (marketData.rsi as number) || 50, signal: ((marketData.rsi as number) || 50) > 70 ? 'OVERBOUGHT' : ((marketData.rsi as number) || 50) < 30 ? 'OVERSOLD' : 'NEUTRAL' },
      macd: {
        value: marketData.macd || 0,
        signal: marketData.macd_signal || 0,
        histogram: marketData.macd_histogram || 0,
        trend: marketData.macd > marketData.macd_signal ? 'BULLISH' : 'BEARISH'
      },
      atr: { 
        value: (marketData.atr as number) || (price as number) * 0.015, 
        percentOfPrice: ((marketData.atr as number) || (price as number) * 0.015) / (price as number) 
      },
      movingAverages: {
        sma9: marketData.sma_9 || price,
        sma20: marketData.sma_20 || price,
        sma50: marketData.sma_50 || price,
        ema9: marketData.ema_9 || price,
        ema20: marketData.ema_20 || price
      },
      volumeAnalysis: {
        currentVolume: volume,
        avgVolume: marketData.avg_volume || volume,
        volumeRatio: (volume as number) / ((marketData.avg_volume as number) || (volume as number) || 1),
        trend: volume > (marketData.avg_volume || volume) ? 'INCREASING' : 'DECREASING'
      },
      stochastic: {
        k: marketData.stoch_k || 50,
        d: marketData.stoch_d || 50,
        signal: ((marketData.stoch_k as number) || 50) > 80 ? 'OVERBOUGHT' : ((marketData.stoch_k as number) || 50) < 20 ? 'OVERSOLD' : 'NEUTRAL'
      }
    };

    // Detect session
    const hour = new Date().getUTCHours();
    const sessionInfo = {
      londonSession: hour >= 8 && hour < 16,
      nySession: hour >= 13 && hour < 21,
      asianSession: hour >= 0 && hour < 8,
      overlap: hour >= 13 && hour < 16
    };

    // Detect market regime
    const trendStrength = Math.abs((price as number) - ((marketData.sma_20 as number) || (price as number))) / (price as number);
    const marketRegime = {
      trendDirection: price > (marketData.sma_20 || price) ? 'UPTREND' : price < (marketData.sma_20 || price) ? 'DOWNTREND' : 'RANGING',
      volatility: marketData.atr ? ((marketData.atr as number) / (price as number) > 0.02 ? 'HIGH' : 'LOW') : 'MEDIUM',
      trendStrength: trendStrength > 0.02 ? 'STRONG' : 'WEAK'
    };

    // Get sentiment (if available)
    const sentiment = {
      overall: marketData.sentiment || 0,
      newsImpact: marketData.news_impact || 0,
      socialSentiment: marketData.social_sentiment || 0
    };

    // Build trading state
    const tradingState: TradingState = {
      marketContext: {
        symbol,
        price: price as number,
        volume: volume as number,
        timestamp: Date.now(),
        technicalIndicators: technicalIndicators as Record<string, unknown>,
        sessionInfo,
        sentiment: sentiment as Record<string, unknown>,
        marketRegime: marketRegime as Record<string, unknown>
      },
      portfolioState: {
        totalBalance: 10000, // TODO: Get from actual portfolio
        availableBalance: 10000,
        positionSize: 0,
        openPositions: [],
        dailyPnL: 0,
        unrealizedPnL: 0
      },
      timestamp: Date.now()
    };

    return tradingState;
  }

  /**
   * Convert ML prediction to AISignal format
   */
  private convertToAISignal(
    prediction: {
      action: RLAction & { type?: string; confidence?: number; reasoning?: string; entryPrice?: number; stopLoss?: number; takeProfit?: number };
      uncertainty: {epistemic: number; aleatoric: number; total: number};
      constraints: Array<{type: string; severity: string; message: string}>
    },
    symbol: string,
    marketData: Record<string, unknown>
  ): AISignal {
    const { action, uncertainty, constraints } = prediction;

    return {
      id: crypto.randomUUID(),
      symbol,
      type: (action.type || action.direction) as "BUY" | "SELL" | "HOLD",
      confidence: action.confidence || 0,
      reasoning: action.reasoning || this.generateReasoning(action, marketData),
      entryPrice: action.entryPrice || (marketData.price as number),
      stopLoss: action.stopLoss,
      takeProfit: action.takeProfit,
      timestamp: new Date().toISOString(),
      // Additional ML-specific fields
      mlMetadata: {
        uncertainty: {
          epistemic: uncertainty.epistemic,
          aleatoric: uncertainty.aleatoric,
          total: uncertainty.total
        },
        constraints: constraints.map((c: {type: string; severity: string; message: string}) => ({
          type: c.type,
          severity: c.severity,
          message: c.message
        })),
        modelVersion: 'ppo-v1',
        ensembleUsed: true
      }
    } as AISignal;
  }

  /**
   * Generate human-readable reasoning
   */
  private generateReasoning(action: {confidence: number}, marketData: Record<string, unknown>): string {
    const reasons: string[] = [];

    // ML confidence
    if (action.confidence > 0.8) {
      reasons.push(`High ML confidence (${(action.confidence * 100).toFixed(0)}%)`);
    }

    // Technical analysis
    if (marketData.rsi) {
      if ((marketData.rsi as number) > 70) reasons.push('RSI overbought');
      else if ((marketData.rsi as number) < 30) reasons.push('RSI oversold');
    }

    if (marketData.macd && marketData.macd_signal) {
      if (marketData.macd > marketData.macd_signal) {
        reasons.push('MACD bullish crossover');
      }
    }

    // Market regime
    const hour = new Date().getUTCHours();
    if (hour >= 8 && hour < 16) reasons.push('London session');
    else if (hour >= 13 && hour < 21) reasons.push('NY session');

    // Action specific
    if (action.type === 'BUY') {
      reasons.push('ML predicts upward movement');
    } else if (action.type === 'SELL') {
      reasons.push('ML predicts downward movement');
    } else {
      reasons.push('Uncertain market conditions');
    }

    return reasons.join(' | ');
  }

  /**
   * Adjust confidence based on uncertainty and constraints
   */
  private adjustConfidence(
    baseConfidence: number,
    uncertainty: {epistemic: number; aleatoric: number},
    constraints: Array<{severity: string}>
  ): number {
    let adjusted = baseConfidence;

    // Reduce confidence based on epistemic uncertainty (model uncertainty)
    adjusted *= (1 - uncertainty.epistemic);

    // Reduce for high severity constraints
    const highSeverityCount = constraints.filter(c => c.severity === 'high').length;
    adjusted *= (1 - highSeverityCount * 0.2);

    const mediumSeverityCount = constraints.filter(c => c.severity === 'medium').length;
    adjusted *= (1 - mediumSeverityCount * 0.1);

    // Clamp to valid range (40% - 95%)
    return Math.max(0.4, Math.min(0.95, adjusted));
  }

  /**
   * Calculate comprehensive signal weight
   */
  private calculateSignalWeight(
    signal: AISignal,
    marketData: Record<string, unknown>,
    uncertainty: { epistemic: number; aleatoric: number; total: number }
  ): WeightResult {
    // Extract indicators from market data
    const candleData = {
      symbol: signal.symbol,
      granularity: 'M15', // Default, could be passed as parameter
      open: (marketData.open as number) || (signal.entryPrice || 0),
      high: (marketData.high as number) || (signal.entryPrice || 0),
      low: (marketData.low as number) || (signal.entryPrice || 0),
      close: (marketData.close as number) || (signal.entryPrice || 0),
      volume: (marketData.volume as number) || 0,
      rsi: marketData.rsi as number,
      ema12: marketData.ema_12 as number,
      ema21: marketData.ema_21 as number,
      ema50: marketData.ema_50 as number,
      adx: marketData.adx as number,
      atr: marketData.atr as number
    };

    // Convert ML confidence (0-1) to 0-100 scale
    const mlConfidence = signal.confidence * 100;

    // Adjust ML confidence based on uncertainty
    // Lower uncertainty = higher effective confidence
    const adjustedMLConfidence = mlConfidence * (1 - uncertainty.total);

    // Signal direction
    const signalDirection = signal.type === 'BUY' ? 'BUY' : 'SELL';

    // Multi-timeframe signals (TODO: fetch from database for current symbol)
    const multiTFSignals = [];

    // Risk metrics (TODO: fetch from portfolio state)
    const riskMetrics = {
      current_drawdown_pct: 0,
      symbol_win_rate: 50
    };

    // Calculate weight using the calculator
    const weightResult = signalWeightCalculator.calculateWeight(
      adjustedMLConfidence,
      signalDirection,
      candleData,
      multiTFSignals,
      riskMetrics
    );

    return weightResult;
  }

  /**
   * Apply weight-based filtering to signals
   * Based on backtest results: weight >= 70 = 100% win rate
   */
  private applyWeightFilter(
    signal: AISignal,
    weightResult: WeightResult
  ): { filtered: boolean; reason?: string } {
    const { total_weight, recommendation } = weightResult;

    // Filter based on recommendation (most strict)
    if (recommendation === 'AVOID') {
      return {
        filtered: true,
        reason: `Signal AVOIDED: Weight ${total_weight.toFixed(1)} < 40 (backtest: 0% win rate)`
      };
    }

    // Filter weak signals if they're BUY/SELL (not already HOLD)
    if (signal.type !== 'HOLD' && recommendation === 'WEAK') {
      return {
        filtered: true,
        reason: `Signal too WEAK: Weight ${total_weight.toFixed(1)} < 60 (use caution)`
      };
    }

    // Require minimum weight of 70 for strong confidence (based on backtest)
    if (signal.type !== 'HOLD' && total_weight < 70) {
      return {
        filtered: true,
        reason: `Weight ${total_weight.toFixed(1)} < 70 threshold (backtest: 100% win rate at 70+)`
      };
    }

    // Signal passes all filters
    return { filtered: false };
  }

  /**
   * Store trading sample for continuous learning
   */
  async storeTradingSample(trade: {
    symbol: string;
    features: number[];
    action: number;
    result: number; // P&L
  }): Promise<void> {
    try {
      const reward = this.calculateReward(trade.result);

      await supabase.from('ml_training_samples').insert({
        symbol: trade.symbol,
        features: trade.features,
        action: trade.action,
        reward,
        pnl: trade.result,
        timestamp: new Date().toISOString()
      });

      console.log('📝 Training sample stored for continuous learning');
    } catch (error) {
      console.error('Failed to store training sample:', error);
    }
  }

  /**
   * Calculate reward from trade result
   */
  private calculateReward(pnl: number): number {
    // Normalize P&L to reward range [-1, 1]
    // Positive reward for profit, negative for loss
    const normalizedReward = Math.tanh(pnl / 100); // Assuming $100 is significant

    return normalizedReward;
  }

  /**
   * Get ML statistics
   */
  getStatistics() {
    // Temporarily disabled
    return null;

    /* ORIGINAL CODE
    if (!this.inferenceEngine) return null;

    return {
      memoryInfo: this.inferenceEngine.getMemoryInfo(),
      isInitialized: this.isInitialized
    };
    */
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    // Temporarily disabled
    this.isInitialized = false;
    this.initializationPromise = null;

    /* ORIGINAL CODE
    if (this.inferenceEngine) {
      this.inferenceEngine.dispose();
      this.inferenceEngine = null;
    }
    this.isInitialized = false;
    this.initializationPromise = null;
    */
  }
}

// Export singleton instance
export const mlSignalService = MLSignalService.getInstance();
export default MLSignalService;
