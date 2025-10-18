// @ts-nocheck
/**
 * Data Integration Module
 *
 * Comprehensive data integration for OHLCV, news sentiment, and economic calendar data.
 * Supports multiple data sources with caching, normalization, and market regime detection.
 */

import {
  DataProvider,
  OHLCVData,
  NewsSentiment,
  EconomicEvent,
  MarketContext,
  MarketRegime,
  BacktestError,
  DataError
} from '../../types/backtesting';

interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class DataIntegration implements DataProvider {
  private cache: Map<string, CacheEntry> = new Map();
  private apiKeys: Map<string, string> = new Map();
  private dataSources: Map<string, DataSourceConfig> = new Map();

  constructor(config: DataIntegrationConfig) {
    this.initializeDataSources(config);
    this.initializeApiKeys(config.apiKeys || {});
  }

  /**
   * Get OHLCV data for the specified symbol and timeframe
   */
  async getOHLCV(
    symbol: string,
    timeframe: string,
    start: Date,
    end: Date
  ): Promise<OHLCVData[]> {
    const cacheKey = `ohlcv_${symbol}_${timeframe}_${start.getTime()}_${end.getTime()}`;

    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    // Get from primary source
    const dataSource = this.getDataSourceForSymbol(symbol);
    if (!dataSource) {
      throw new DataError(`No data source configured for symbol: ${symbol}`);
    }

    try {
      let data: OHLCVData[] = [];

      switch (dataSource.type) {
        case 'binance':
          data = await this.fetchBinanceOHLCV(symbol, timeframe, start, end, dataSource);
          break;
        case 'coingecko':
          data = await this.fetchCoinGeckoOHLCV(symbol, timeframe, start, end, dataSource);
          break;
        case 'alpha_vantage':
          data = await this.fetchAlphaVantageOHLCV(symbol, timeframe, start, end, dataSource);
          break;
        case 'yahoo_finance':
          data = await this.fetchYahooFinanceOHLCV(symbol, timeframe, start, end, dataSource);
          break;
        case 'custom':
          data = await this.fetchCustomOHLCV(symbol, timeframe, start, end, dataSource);
          break;
        default:
          throw new DataError(`Unsupported data source type: ${dataSource.type}`);
      }

      // Validate and normalize data
      data = this.validateAndNormalizeOHLCV(data, symbol, timeframe);

      // Cache the result
      this.setCache(cacheKey, data, this.getCacheTTL(timeframe));

      return data;
    } catch (error) {
      throw new DataError(`Failed to fetch OHLCV data for ${symbol}: ${error.message}`, error);
    }
  }

  /**
   * Get news sentiment data for the specified symbols
   */
  async getNewsSentiment(symbols: string[], start: Date, end: Date): Promise<NewsSentiment[]> {
    const cacheKey = `news_${symbols.join('_')}_${start.getTime()}_${end.getTime()}`;

    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const newsPromises = symbols.map(symbol => this.fetchNewsForSymbol(symbol, start, end));
      const newsArrays = await Promise.all(newsPromises);
      const allNews = newsArrays.flat();

      // Sort by timestamp
      allNews.sort((a, b) => a.timestamp - b.timestamp);

      // Cache the result
      this.setCache(cacheKey, allNews, 3600000); // 1 hour TTL

      return allNews;
    } catch (error) {
      throw new DataError(`Failed to fetch news sentiment: ${error.message}`, error);
    }
  }

  /**
   * Get economic events for the specified currency
   */
  async getEconomicEvents(currency: string, start: Date, end: Date): Promise<EconomicEvent[]> {
    const cacheKey = `economic_${currency}_${start.getTime()}_${end.getTime()}`;

    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const events = await this.fetchEconomicEvents(currency, start, end);

      // Sort by timestamp
      events.sort((a, b) => a.timestamp - b.timestamp);

      // Cache the result
      this.setCache(cacheKey, events, 86400000); // 24 hour TTL

      return events;
    } catch (error) {
      throw new DataError(`Failed to fetch economic events: ${error.message}`, error);
    }
  }

  /**
   * Get market context for a specific timestamp and symbol
   */
  async getMarketContext(timestamp: number, symbol: string): Promise<MarketContext> {
    const cacheKey = `context_${symbol}_${timestamp}`;

    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Get data for context calculation
      const contextDate = new Date(timestamp);
      const startDate = new Date(contextDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days back
      const endDate = new Date(contextDate.getTime() + 24 * 60 * 60 * 1000); // 1 day forward

      const [ohlcvData, newsData, economicData] = await Promise.all([
        this.getOHLCV(symbol, '1d', startDate, endDate),
        this.getNewsSentiment([symbol], startDate, endDate),
        this.getEconomicEvents('USD', startDate, endDate) // Default to USD
      ]);

      // Calculate market context
      const context = await this.calculateMarketContext(timestamp, symbol, ohlcvData, newsData, economicData);

      // Cache the result
      this.setCache(cacheKey, context, 300000); // 5 minute TTL

      return context;
    } catch (error) {
      throw new DataError(`Failed to get market context: ${error.message}`, error);
    }
  }

  /**
   * Get available symbols for backtesting
   */
  async getAvailableSymbols(): Promise<string[]> {
    const symbols: string[] = [];

    for (const [sourceName, sourceConfig] of this.dataSources) {
      try {
        const sourceSymbols = await this.fetchSymbolsFromSource(sourceConfig);
        symbols.push(...sourceSymbols);
      } catch (error) {
        console.error(`Failed to fetch symbols from ${sourceName}:`, error);
      }
    }

    // Remove duplicates
    return [...new Set(symbols)];
  }

  /**
   * Get market regime for a specific time period
   */
  async getMarketRegime(symbol: string, start: Date, end: Date): Promise<MarketRegime[]> {
    try {
      const ohlcvData = await this.getOHLCV(symbol, '1d', start, end);
      return this.detectMarketRegimes(ohlcvData);
    } catch (error) {
      throw new DataError(`Failed to detect market regimes: ${error.message}`, error);
    }
  }

  // === Private Data Fetching Methods ===

  private async fetchBinanceOHLCV(
    symbol: string,
    timeframe: string,
    start: Date,
    end: Date,
    config: DataSourceConfig
  ): Promise<OHLCVData[]> {
    // Map timeframe to Binance intervals
    const intervalMap: Record<string, string> = {
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '30m': '30m',
      '1h': '1h',
      '4h': '4h',
      '1d': '1d',
      '1w': '1w'
    };

    const interval = intervalMap[timeframe] || '1h';
    const binanceSymbol = symbol.replace('/', '');

    // In a real implementation, this would make actual API calls
    // For now, return mock data
    return this.generateMockOHLCV(symbol, timeframe, start, end);
  }

  private async fetchCoinGeckoOHLCV(
    symbol: string,
    timeframe: string,
    start: Date,
    end: Date,
    config: DataSourceConfig
  ): Promise<OHLCVData[]> {
    // CoinGecko API implementation
    return this.generateMockOHLCV(symbol, timeframe, start, end);
  }

  private async fetchAlphaVantageOHLCV(
    symbol: string,
    timeframe: string,
    start: Date,
    end: Date,
    config: DataSourceConfig
  ): Promise<OHLCVData[]> {
    // Alpha Vantage API implementation
    return this.generateMockOHLCV(symbol, timeframe, start, end);
  }

  private async fetchYahooFinanceOHLCV(
    symbol: string,
    timeframe: string,
    start: Date,
    end: Date,
    config: DataSourceConfig
  ): Promise<OHLCVData[]> {
    // Yahoo Finance API implementation
    return this.generateMockOHLCV(symbol, timeframe, start, end);
  }

  private async fetchCustomOHLCV(
    symbol: string,
    timeframe: string,
    start: Date,
    end: Date,
    config: DataSourceConfig
  ): Promise<OHLCVData[]> {
    // Custom data source implementation
    return this.generateMockOHLCV(symbol, timeframe, start, end);
  }

  private async fetchNewsForSymbol(symbol: string, start: Date, end: Date): Promise<NewsSentiment[]> {
    // Mock news data generation
    const news: NewsSentiment[] = [];
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    for (let i = 0; i < Math.min(daysDiff, 50); i++) {
      const timestamp = start.getTime() + i * 24 * 60 * 60 * 1000 + Math.random() * 24 * 60 * 60 * 1000;

      news.push({
        timestamp,
        title: `Market news for ${symbol} - Day ${i + 1}`,
        content: `This is sample news content about ${symbol} market developments.`,
        sentiment: Math.random() * 2 - 1, // -1 to 1
        confidence: Math.random() * 0.5 + 0.5, // 0.5 to 1
        source: 'NewsAPI',
        symbols: [symbol],
        impact: Math.random() > 0.7 ? 'high' : Math.random() > 0.3 ? 'medium' : 'low'
      });
    }

    return news;
  }

  private async fetchEconomicEvents(currency: string, start: Date, end: Date): Promise<EconomicEvent[]> {
    // Mock economic events
    const events: EconomicEvent[] = [];
    const commonEvents = [
      'Interest Rate Decision',
      'GDP Release',
      'Inflation Report',
      'Employment Data',
      'Retail Sales',
      'Manufacturing PMI',
      'Consumer Confidence',
      'Trade Balance'
    ];

    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    for (let i = 0; i < Math.min(daysDiff / 7, 20); i++) {
      const timestamp = start.getTime() + i * 7 * 24 * 60 * 60 * 1000 + Math.random() * 24 * 60 * 60 * 1000;

      events.push({
        timestamp,
        title: commonEvents[Math.floor(Math.random() * commonEvents.length)],
        description: `Monthly ${commonEvents[Math.floor(Math.random() * commonEvents.length)]} data release`,
        country: currency === 'USD' ? 'United States' : 'Euro Area',
        impact: Math.random() > 0.8 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low',
        actual: Math.random() * 10,
        forecast: Math.random() * 10,
        previous: Math.random() * 10,
        currency
      });
    }

    return events;
  }

  // === Market Context and Regime Detection ===

  private async calculateMarketContext(
    timestamp: number,
    symbol: string,
    ohlcvData: OHLCVData[],
    newsData: NewsSentiment[],
    economicData: EconomicEvent[]
  ): Promise<MarketContext> {
    // Filter data around the timestamp
    const relevantOHLCV = ohlcvData.filter(d =>
      Math.abs(d.timestamp - timestamp) <= 7 * 24 * 60 * 60 * 1000 // 7 days window
    );

    const relevantNews = newsData.filter(n =>
      Math.abs(n.timestamp - timestamp) <= 3 * 24 * 60 * 60 * 1000 // 3 days window
    );

    const relevantEvents = economicData.filter(e =>
      Math.abs(e.timestamp - timestamp) <= 7 * 24 * 60 * 60 * 1000 // 7 days window
    );

    // Calculate volatility
    const volatility = this.calculateVolatility(relevantOHLCV);

    // Calculate sentiment
    const sentiment = this.calculateSentiment(relevantNews);

    // Detect market regime
    const regime = this.detectRegime(relevantOHLCV, volatility);

    // Calculate liquidity (simplified)
    const liquidity = this.calculateLiquidity(relevantOHLCV);

    // Calculate correlation (simplified)
    const correlation = this.calculateCorrelation(relevantOHLCV);

    return {
      timestamp,
      regime,
      volatility,
      liquidity,
      correlation,
      sentiment,
      economicEvents: relevantEvents,
      newsSentiment: relevantNews
    };
  }

  private calculateVolatility(ohlcvData: OHLCVData[]): number {
    if (ohlcvData.length < 2) return 0;

    const returns = [];
    for (let i = 1; i < ohlcvData.length; i++) {
      const returnRate = (ohlcvData[i].close - ohlcvData[i - 1].close) / ohlcvData[i - 1].close;
      returns.push(returnRate);
    }

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((acc, ret) => acc + Math.pow(ret - mean, 2), 0) / returns.length;

    return Math.sqrt(variance) * Math.sqrt(252); // Annualized volatility
  }

  private calculateSentiment(newsData: NewsSentiment[]): number {
    if (newsData.length === 0) return 0;

    const weightedSentiment = newsData.reduce((acc, news) => {
      const impactWeight = news.impact === 'high' ? 3 : news.impact === 'medium' ? 2 : 1;
      return acc + news.sentiment * news.confidence * impactWeight;
    }, 0);

    const totalWeight = newsData.reduce((acc, news) => {
      const impactWeight = news.impact === 'high' ? 3 : news.impact === 'medium' ? 2 : 1;
      return acc + news.confidence * impactWeight;
    }, 0);

    return totalWeight > 0 ? weightedSentiment / totalWeight : 0;
  }

  private detectRegime(ohlcvData: OHLCVData[], volatility: number): MarketRegime {
    if (ohlcvData.length < 20) return 'ranging';

    // Simple regime detection based on price action and volatility
    const prices = ohlcvData.map(d => d.close);
    const recentPrices = prices.slice(-20);
    const olderPrices = prices.slice(-40, -20);

    const recentTrend = this.calculateTrend(recentPrices);
    const volatilityLevel = volatility;

    if (volatilityLevel > 0.3) {
      return 'volatile';
    } else if (Math.abs(recentTrend) > 0.05) {
      return recentTrend > 0 ? 'trending_up' : 'trending_down';
    } else if (volatilityLevel < 0.1) {
      return 'low_volatility';
    } else {
      return 'ranging';
    }
  }

  private calculateTrend(prices: number[]): number {
    if (prices.length < 2) return 0;

    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];

    return (lastPrice - firstPrice) / firstPrice;
  }

  private calculateLiquidity(ohlcvData: OHLCVData[]): number {
    if (ohlcvData.length === 0) return 0;

    // Simplified liquidity calculation based on volume and price range
    const avgVolume = ohlcvData.reduce((acc, d) => acc + d.volume, 0) / ohlcvData.length;
    const avgPriceRange = ohlcvData.reduce((acc, d) => acc + (d.high - d.low), 0) / ohlcvData.length;

    // Normalize liquidity score (0-1)
    return Math.min(1, (avgVolume / 1000000) / (avgPriceRange || 1));
  }

  private calculateCorrelation(ohlcvData: OHLCVData[]): number {
    // Simplified correlation calculation
    // In practice, this would calculate correlation with market index
    return Math.random() * 0.6 + 0.2; // Mock correlation between 0.2 and 0.8
  }

  private detectMarketRegimes(ohlcvData: OHLCVData[]): MarketRegime[] {
    const regimes: MarketRegime[] = [];
    const windowSize = 30; // 30-day windows

    for (let i = 0; i < ohlcvData.length; i += windowSize) {
      const windowData = ohlcvData.slice(i, i + windowSize);
      if (windowData.length < 10) continue;

      const volatility = this.calculateVolatility(windowData);
      const regime = this.detectRegime(windowData, volatility);

      // Assign regime to all data points in the window
      for (let j = i; j < Math.min(i + windowSize, ohlcvData.length); j++) {
        regimes.push(regime);
      }
    }

    return regimes;
  }

  // === Data Validation and Normalization ===

  private validateAndNormalizeOHLCV(data: OHLCVData[], symbol: string, timeframe: string): OHLCVData[] {
    return data.map(item => ({
      ...item,
      symbol,
      timeframe,
      // Ensure price data is valid
      open: Math.max(0, item.open),
      high: Math.max(item.open, item.high, item.low, item.close),
      low: Math.min(item.open, item.high, item.low, item.close),
      close: Math.max(0, item.close),
      volume: Math.max(0, item.volume)
    }));
  }

  // === Cache Management ===

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  private setCache<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });

    // Clean up old cache entries if cache is too large
    if (this.cache.size > 1000) {
      this.cleanupCache();
    }
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > value.ttl) {
        this.cache.delete(key);
      }
    }
  }

  private getCacheTTL(timeframe: string): number {
    const ttlMap: Record<string, number> = {
      '1m': 60000, // 1 minute
      '5m': 300000, // 5 minutes
      '15m': 900000, // 15 minutes
      '30m': 1800000, // 30 minutes
      '1h': 3600000, // 1 hour
      '4h': 14400000, // 4 hours
      '1d': 86400000, // 1 day
      '1w': 604800000 // 1 week
    };

    return ttlMap[timeframe] || 3600000; // Default 1 hour
  }

  // === Utility Methods ===

  private generateMockOHLCV(
    symbol: string,
    timeframe: string,
    start: Date,
    end: Date
  ): OHLCVData[] {
    const data: OHLCVData[] = [];
    const now = Date.now();

    // Generate mock data based on timeframe
    const intervalMs = this.getTimeframeIntervalMs(timeframe);
    const currentPrice = 50000 + Math.random() * 10000; // Random base price

    for (let timestamp = start.getTime(); timestamp <= end.getTime(); timestamp += intervalMs) {
      const volatility = 0.02; // 2% daily volatility
      const drift = 0.0001; // Small upward drift

      const randomShock = (Math.random() - 0.5) * volatility;
      const priceChange = drift + randomShock;

      const prevClose = data.length > 0 ? data[data.length - 1].close : currentPrice;
      const close = prevClose * (1 + priceChange);

      const high = close * (1 + Math.random() * 0.01);
      const low = close * (1 - Math.random() * 0.01);
      const open = data.length > 0 ? data[data.length - 1].close : close * (1 - Math.random() * 0.005);

      data.push({
        timestamp,
        open: Math.max(0, open),
        high: Math.max(open, high, low, close),
        low: Math.min(open, high, low, close),
        close: Math.max(0, close),
        volume: Math.floor(Math.random() * 1000000) + 100000,
        symbol,
        timeframe
      });
    }

    return data;
  }

  private getTimeframeIntervalMs(timeframe: string): number {
    const intervalMap: Record<string, number> = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000
    };

    return intervalMap[timeframe] || 60 * 60 * 1000; // Default 1 hour
  }

  private getDataSourceForSymbol(symbol: string): DataSourceConfig | null {
    // Find the best data source for the symbol
    for (const [sourceName, sourceConfig] of this.dataSources) {
      if (sourceConfig.symbols.includes(symbol) || sourceConfig.symbols.includes('*')) {
        return sourceConfig;
      }
    }
    return null;
  }

  private async fetchSymbolsFromSource(config: DataSourceConfig): Promise<string[]> {
    // Mock implementation - in practice, this would query the data source
    return config.symbols.filter(s => s !== '*');
  }

  private initializeDataSources(config: DataIntegrationConfig): void {
    // Initialize default data sources
    const defaultSources: DataSourceConfig[] = [
      {
        name: 'binance',
        type: 'binance',
        baseUrl: 'https://api.binance.com/api/v3',
        symbols: ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'ADA/USDT'],
        rateLimit: 1200, // requests per minute
        enabled: true
      },
      {
        name: 'coingecko',
        type: 'coingecko',
        baseUrl: 'https://api.coingecko.com/api/v3',
        symbols: ['bitcoin', 'ethereum', 'binancecoin', 'solana', 'cardano'],
        rateLimit: 50,
        enabled: true
      },
      {
        name: 'alpha_vantage',
        type: 'alpha_vantage',
        baseUrl: 'https://www.alphavantage.co/query',
        symbols: ['SPY', 'QQQ', 'IWM', 'DIA'],
        rateLimit: 5,
        enabled: true
      }
    ];

    // Add user-configured sources
    if (config.dataSources) {
      defaultSources.push(...config.dataSources);
    }

    // Register sources
    defaultSources.forEach(source => {
      this.dataSources.set(source.name, source);
    });
  }

  private initializeApiKeys(apiKeys: Record<string, string>): void {
    Object.entries(apiKeys).forEach(([service, key]) => {
      this.apiKeys.set(service, key);
    });
  }

  private getApiKey(service: string): string | null {
    return this.apiKeys.get(service) || null;
  }
}

// === Configuration Interfaces ===

export interface DataIntegrationConfig {
  dataSources?: DataSourceConfig[];
  apiKeys?: Record<string, string>;
  cacheConfig?: {
    maxSize: number;
    defaultTTL: number;
  };
  rateLimits?: {
    default: number;
    perService: Record<string, number>;
  };
}

export interface DataSourceConfig {
  name: string;
  type: 'binance' | 'coingecko' | 'alpha_vantage' | 'yahoo_finance' | 'custom';
  baseUrl: string;
  symbols: string[];
  rateLimit: number;
  enabled: boolean;
  apiKey?: string;
  additionalConfig?: Record<string, unknown>;
}

// === Export Factory Function ===

export function createDataIntegration(config: DataIntegrationConfig): DataIntegration {
  return new DataIntegration(config);
}