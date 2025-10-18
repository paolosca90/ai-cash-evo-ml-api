/**
 * ML Production Service - Integration with Railway ML API
 * Connects frontend to the production ML system on Railway
 */

import { AISignal } from '@/types/trading';

interface MLProductionConfig {
  apiUrl: string;
  timeout: number;
  retries: number;
}

interface MarketData {
  symbol: string;
  close: number;
  rsi?: number;
  ema12?: number;
  ema21?: number;
  ema50?: number;
  atr?: number;
  adx?: number;
  volume?: number;
  macd?: number;
  stoch_k?: number;
  [key: string]: number | undefined;
}

interface MLPredictionRequest {
  symbol: string;
  market_data: MarketData;
}

interface MLPredictionResponse {
  status: string;
  symbol: string;
  prediction: {
    signal: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    reasoning: string;
    indicators: Record<string, any>;
    weight: {
      weight: number;
      recommendation: 'STRONG' | 'MODERATE' | 'WEAK' | 'AVOID';
      multiplier: number;
    };
    model_used: string;
  };
  model_version: string;
  timestamp: string;
}

interface ModelInfo {
  model_loaded: boolean;
  model_type: string;
  has_scaler: boolean;
  model_version: string;
  features_count: number;
}

interface PerformanceMetrics {
  period_days: number;
  total_signals: number;
  winning_signals: number;
  win_rate: number;
  total_pnl: number;
  avg_pnl: number;
  max_drawdown: number;
  by_recommendation: Record<string, {
    count: number;
    win_rate: number;
    avg_pnl: number;
  }>;
}

class MLProductionService {
  private static instance: MLProductionService;
  private config: MLProductionConfig;
  private initialized = false;

  private constructor() {
    this.config = {
      apiUrl: import.meta.env.VITE_ML_API_URL || 'https://web-production-31235.up.railway.app',
      timeout: 15000,
      retries: 3
    };
  }

  static getInstance(): MLProductionService {
    if (!MLProductionService.instance) {
      MLProductionService.instance = new MLProductionService();
    }
    return MLProductionService.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Test connection to ML API
      const health = await this.checkHealth();
      if (health.status === 'healthy') {
        this.initialized = true;
        console.log('✅ ML Production Service initialized');
        console.log(`🤖 Model loaded: ${health.services?.model_loaded || false}`);
      } else {
        throw new Error('ML API health check failed');
      }
    } catch (error) {
      console.error('❌ Failed to initialize ML Production Service:', error);
      throw error;
    }
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.config.apiUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async checkHealth(): Promise<any> {
    return this.makeRequest('/health');
  }

  async getModelInfo(): Promise<ModelInfo> {
    const response = await this.makeRequest<{ status: string; model_info: ModelInfo }>('/model/info');
    return response.model_info;
  }

  async generateSignal(symbol: string, marketData: MarketData): Promise<AISignal> {
    try {
      const request: MLPredictionRequest = {
        symbol,
        market_data: marketData
      };

      const response = await this.makeRequest<MLPredictionResponse>('/predict', {
        method: 'POST',
        body: JSON.stringify(request),
      });

      if (response.status !== 'success') {
        throw new Error(response.error || 'Prediction failed');
      }

      const prediction = response.prediction;

      // Convert to AISignal format
      return {
        id: crypto.randomUUID(),
        symbol: response.symbol,
        type: prediction.signal,
        confidence: prediction.confidence / 100, // Convert to 0-1 scale
        reasoning: prediction.reasoning,
        entryPrice: marketData.close,
        stopLoss: this.calculateStopLoss(marketData.close, prediction.signal),
        takeProfit: this.calculateTakeProfit(marketData.close, prediction.signal),
        timestamp: response.timestamp,
        mlMetadata: {
          confidence: prediction.confidence,
          indicators: prediction.indicators,
          weight: prediction.weight,
          model_version: response.model_version,
          model_used: prediction.model_used,
          recommendation: prediction.weight.recommendation,
          position_multiplier: prediction.weight.multiplier
        }
      } as AISignal;

    } catch (error) {
      console.error('Error generating ML signal:', error);
      throw error;
    }
  }

  async calculateIndicators(marketData: MarketData): Promise<Record<string, any>> {
    const response = await this.makeRequest<{ status: string; indicators: Record<string, any> }>('/indicators/calculate', {
      method: 'POST',
      body: JSON.stringify({ market_data: marketData }),
    });

    return response.indicators;
  }

  async getPerformanceMetrics(days: number = 30): Promise<PerformanceMetrics> {
    const response = await this.makeRequest<{ status: string; performance: PerformanceMetrics }>(`/performance?days=${days}`);
    return response.performance;
  }

  async generateBatchSignals(symbols: string[], marketDataMap: Record<string, MarketData>): Promise<AISignal[]> {
    const signals: AISignal[] = [];

    for (const symbol of symbols) {
      const marketData = marketDataMap[symbol];
      if (marketData) {
        try {
          const signal = await this.generateSignal(symbol, marketData);
          signals.push(signal);
        } catch (error) {
          console.error(`Failed to generate signal for ${symbol}:`, error);
          // Continue with other symbols
        }
      }
    }

    return signals;
  }

  async testConnection(): Promise<boolean> {
    try {
      const health = await this.checkHealth();
      return health.status === 'healthy';
    } catch {
      return false;
    }
  }

  private calculateStopLoss(price: number, signal: 'BUY' | 'SELL' | 'HOLD'): number {
    const atrPercent = 0.02; // 2% ATR assumption
    const stopDistance = price * atrPercent;

    if (signal === 'BUY') {
      return price - stopDistance;
    } else if (signal === 'SELL') {
      return price + stopDistance;
    }
    return price;
  }

  private calculateTakeProfit(price: number, signal: 'BUY' | 'SELL' | 'HOLD'): number {
    const atrPercent = 0.03; // 3% ATR assumption
    const profitDistance = price * atrPercent;

    if (signal === 'BUY') {
      return price + profitDistance;
    } else if (signal === 'SELL') {
      return price - profitDistance;
    }
    return price;
  }

  // Utility methods for dashboard integration
  isSignalStrong(signal: AISignal): boolean {
    const weight = signal.mlMetadata?.weight?.weight || 0;
    const recommendation = signal.mlMetadata?.recommendation;
    return weight >= 70 && recommendation === 'STRONG';
  }

  shouldExecuteTrade(signal: AISignal): boolean {
    const weight = signal.mlMetadata?.weight?.weight || 0;
    const recommendation = signal.mlMetadata?.recommendation;

    if (recommendation === 'AVOID') return false;
    if (recommendation === 'WEAK') return false;
    if (weight < 60) return false;

    return true;
  }

  calculatePositionSize(baseSize: number, signal: AISignal): number {
    const multiplier = signal.mlMetadata?.position_multiplier || 1.0;
    return baseSize * multiplier;
  }

  getConfig(): MLProductionConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<MLProductionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Export singleton instance
export const mlProductionService = MLProductionService.getInstance();
export default MLProductionService;