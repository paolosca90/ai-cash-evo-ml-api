// AI Cash Evolution - Hugging Face ML Service Integration
// Complete integration with Hugging Face Spaces ML API

export interface TradingSignal {
  symbol: string;
  signal: "BUY" | "SELL" | "HOLD";
  confidence: number;
  current_price: number;
  stop_loss: number;
  take_profit: number;
  indicators: {
    rsi: number;
    macd: {
      macd: number;
      signal: number;
      histogram: number;
    };
    bollinger_bands: {
      upper: number;
      middle: number;
      lower: number;
    };
    stochastic: {
      k: number;
      d: number;
    };
  };
  analysis_reasons: string[];
  timestamp: string;
  mode: string;
}

export interface BatchAnalysisResult {
  signals: TradingSignal[];
  processed_count: number;
  timestamp: string;
}

export interface MLServiceConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
}

class HuggingFaceMLService {
  private config: MLServiceConfig;
  private baseURL: string;

  constructor() {
    // Automatically detect Hugging Face Spaces URL or use fallback
    this.baseURL = this.detectHuggingFaceURL();

    this.config = {
      baseURL: this.baseURL,
      timeout: 30000, // 30 seconds
      retryAttempts: 3
    };
  }

  private detectHuggingFaceURL(): string {
    // Try to detect if we're running on Hugging Face Spaces
    const hostname = window.location.hostname;

    if (hostname.includes('hf.space')) {
      // We're running on Hugging Face Spaces
      return window.location.origin;
    }

    // Use environment variable or fallback to Railway
    const envURL = import.meta.env.VITE_ML_API_URL;
    if (envURL && !envURL.includes('railway.app')) {
      return envURL;
    }

    // Default placeholder for Hugging Face Spaces
    return 'https://ai-cash-evolution-ml.hf.space';
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.baseURL}${endpoint}`;

    const defaultHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'AI-Cash-Evolution/1.0'
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`ML Service request failed: ${endpoint}`, error);
      throw error;
    }
  }

  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      const result = await this.makeRequest<{ status: string; timestamp: string }>('/health');
      return result;
    } catch (error) {
      console.error('Health check failed:', error);
      return { status: 'unhealthy', timestamp: new Date().toISOString() };
    }
  }

  async getSingleSignal(symbol: string): Promise<TradingSignal> {
    try {
      // Normalize symbol format
      const normalizedSymbol = this.normalizeSymbol(symbol);
      const result = await this.makeRequest<TradingSignal>(`/predict?symbol=${normalizedSymbol}`);
      return result;
    } catch (error) {
      console.error(`Failed to get signal for ${symbol}:`, error);
      // Return safe fallback
      return this.createFallbackSignal(symbol);
    }
  }

  async getBatchSignals(symbols: string[]): Promise<BatchAnalysisResult> {
    try {
      const normalizedSymbols = symbols.map(s => this.normalizeSymbol(s));
      const result = await this.makeRequest<BatchAnalysisResult>('/predict/batch', {
        method: 'POST',
        body: JSON.stringify({ symbols: normalizedSymbols }),
      });
      return result;
    } catch (error) {
      console.error('Failed to get batch signals:', error);
      // Return fallback results
      return {
        signals: symbols.map(s => this.createFallbackSignal(s)),
        processed_count: symbols.length,
        timestamp: new Date().toISOString()
      };
    }
  }

  async getAvailableSymbols(): Promise<{
    symbols: {
      forex: string[];
      commodities: string[];
      crypto: string[];
      indices: string[];
    };
    total_count: number;
    categories: string[];
  }> {
    try {
      const result = await this.makeRequest('/symbols');
      return result;
    } catch (error) {
      console.error('Failed to get available symbols:', error);
      // Return fallback symbols
      return {
        symbols: {
          forex: ['EURUSD=X', 'GBPUSD=X', 'USDJPY=X', 'USDCHF=X'],
          commodities: ['GC=F', 'SI=F', 'CL=F'],
          crypto: ['BTC-USD', 'ETH-USD'],
          indices: ['^GSPC', '^DJI', '^IXIC']
        },
        total_count: 12,
        categories: ['forex', 'commodities', 'crypto', 'indices']
      };
    }
  }

  private normalizeSymbol(symbol: string): string {
    // Normalize symbol for Yahoo Finance API
    symbol = symbol.toUpperCase().trim();

    // Add '=X' for forex pairs if missing
    if (this.isForexPair(symbol) && !symbol.endsWith('=X')) {
      return `${symbol}=X`;
    }

    return symbol;
  }

  private isForexPair(symbol: string): boolean {
    const forexCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD'];
    const parts = symbol.split('');

    // Simple heuristic: if it contains 3-letter currency codes
    return forexCurrencies.some(currency => symbol.includes(currency));
  }

  private createFallbackSignal(symbol: string): TradingSignal {
    return {
      symbol: symbol,
      signal: 'HOLD',
      confidence: 0.5,
      current_price: 0,
      stop_loss: 0,
      take_profit: 0,
      indicators: {
        rsi: 50,
        macd: { macd: 0, signal: 0, histogram: 0 },
        bollinger_bands: { upper: 0, middle: 0, lower: 0 },
        stochastic: { k: 50, d: 50 }
      },
      analysis_reasons: ['Service unavailable - using fallback'],
      timestamp: new Date().toISOString(),
      mode: 'fallback'
    };
  }

  // Utility methods for signal processing
  getSignalStrength(signal: TradingSignal): 'WEAK' | 'MODERATE' | 'STRONG' {
    if (signal.confidence < 0.6) return 'WEAK';
    if (signal.confidence < 0.8) return 'MODERATE';
    return 'STRONG';
  }

  getSignalEmoji(signal: TradingSignal): string {
    switch (signal.signal) {
      case 'BUY': return '🟢';
      case 'SELL': return '🔴';
      case 'HOLD': return '🟡';
      default: return '⚪';
    }
  }

  formatSignalForDisplay(signal: TradingSignal): {
    symbol: string;
    action: string;
    confidence: string;
    price: string;
    stopLoss: string;
    takeProfit: string;
    emoji: string;
    strength: string;
    time: string;
  } {
    return {
      symbol: signal.symbol.replace('=X', ''),
      action: signal.signal,
      confidence: `${(signal.confidence * 100).toFixed(1)}%`,
      price: signal.current_price ? `$${signal.current_price.toFixed(5)}` : 'N/A',
      stopLoss: signal.stop_loss ? `$${signal.stop_loss.toFixed(5)}` : 'N/A',
      takeProfit: signal.take_profit ? `$${signal.take_profit.toFixed(5)}` : 'N/A',
      emoji: this.getSignalEmoji(signal),
      strength: this.getSignalStrength(signal),
      time: new Date(signal.timestamp).toLocaleTimeString()
    };
  }

  // Configuration method
  updateConfig(newConfig: Partial<MLServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getBaseURL(): string {
    return this.baseURL;
  }

  isUsingHuggingFace(): boolean {
    return this.baseURL.includes('hf.space');
  }

  async testConnection(): Promise<{
    success: boolean;
    url: string;
    responseTime: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      const health = await this.healthCheck();
      const responseTime = Date.now() - startTime;

      return {
        success: health.status === 'healthy',
        url: this.baseURL,
        responseTime,
        error: health.status !== 'healthy' ? 'Service unhealthy' : undefined
      };
    } catch (error) {
      return {
        success: false,
        url: this.baseURL,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const mlService = new HuggingFaceMLService();

// Export type for React hooks
export type { TradingSignal, BatchAnalysisResult, MLServiceConfig };

// Export utility functions
export const createMLService = (config?: Partial<MLServiceConfig>) => {
  return new HuggingFaceMLService();
};