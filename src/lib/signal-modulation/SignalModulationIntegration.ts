// @ts-nocheck
/**
 * Signal Modulation Integration
 *
 * Integration layer that connects the Signal Modulation System with existing
 * AI signals, LLM sentiment analysis, and other trading components.
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { SignalModulationService, ModulatedSignal, BaseSignal, SentimentAnalysis, RiskAssessment, MarketConditions } from './SignalModulationService';
import { supabase } from '@/integrations/supabase/client';
import { UnifiedFeatureEngineer, NormalizedFeatureVector } from '../feature-engineering/UnifiedFeatureEngineer';
import { MarketData, TechnicalIndicators, SmartMoneyConcepts, LLMSignals, MarketRegime, SessionInfo } from '@/types/feature-engineering';

export interface IntegrationConfig {
  enableLLMSentiment: boolean;
  enableTechnicalAnalysis: boolean;
  enableSmartMoneyAnalysis: boolean;
  enableMarketRegimeAnalysis: boolean;
  enablePerformanceTracking: boolean;
  autoSaveResults: boolean;
  modulationWeights: {
    sentiment: number;
    risk: number;
    confidence: number;
    marketConditions: number;
  };
}

export interface ModulationInput {
  baseSignal: BaseSignal;
  marketData?: MarketData;
  technicalIndicators?: TechnicalIndicators;
  sessionInfo?: SessionInfo;
  smartMoneyConcepts?: SmartMoneyConcepts;
  llmSignals?: LLMSignals;
  marketRegime?: MarketRegime;
  featureVector?: NormalizedFeatureVector;
  newsArticles?: Array<{
    title: string;
    description: string;
    source?: string;
    publishedAt?: string;
  }>;
}

export interface ModulationResult {
  modulatedSignal: ModulatedSignal;
  sentimentAnalysis: SentimentAnalysis;
  riskAssessment: RiskAssessment;
  marketConditions: MarketConditions;
  processingTime: number;
  performanceImpact: {
    expectedWinRate: number;
    expectedProfitFactor: number;
    riskAdjustedReturn: number;
  };
}

export class SignalModulationIntegration {
  private modulationService: SignalModulationService;
  private featureEngineer: UnifiedFeatureEngineer;
  private config: IntegrationConfig;
  private cache: Map<string, { data: unknown; timestamp: number; ttl: number }>;

  constructor(config: Partial<IntegrationConfig> = {}) {
    this.modulationService = new SignalModulationService();
    this.featureEngineer = new UnifiedFeatureEngineer();
    this.cache = new Map();

    this.config = {
      enableLLMSentiment: true,
      enableTechnicalAnalysis: true,
      enableSmartMoneyAnalysis: true,
      enableMarketRegimeAnalysis: true,
      enablePerformanceTracking: true,
      autoSaveResults: true,
      modulationWeights: {
        sentiment: 0.4,
        risk: 0.3,
        confidence: 0.2,
        marketConditions: 0.1,
      },
      ...config,
    };
  }

  /**
   * Main integration method - process a signal through the complete modulation pipeline
   */
  public async modulateSignal(input: ModulationInput): Promise<ModulationResult> {
    const startTime = performance.now();

    try {
      console.log(`🎯 Starting signal modulation for ${input.baseSignal.symbol}`);

      // Step 1: Extract sentiment analysis
      const sentimentAnalysis = await this.extractSentimentAnalysis(input);

      // Step 2: Extract risk assessment
      const riskAssessment = await this.extractRiskAssessment(input);

      // Step 3: Extract market conditions
      const marketConditions = await this.extractMarketConditions(input);

      // Step 4: Apply modulation
      const modulatedSignal = await this.modulationService.modulateSignal(
        input.baseSignal,
        sentimentAnalysis,
        riskAssessment,
        marketConditions
      );

      // Step 5: Calculate performance impact
      const performanceImpact = this.calculatePerformanceImpact(
        modulatedSignal,
        sentimentAnalysis,
        riskAssessment,
        marketConditions
      );

      // Step 6: Save results if enabled
      if (this.config.autoSaveResults) {
        await this.saveModulationResult({
          modulatedSignal,
          sentimentAnalysis,
          riskAssessment,
          marketConditions,
          processingTime: performance.now() - startTime,
          performanceImpact,
        });
      }

      const result: ModulationResult = {
        modulatedSignal,
        sentimentAnalysis,
        riskAssessment,
        marketConditions,
        processingTime: performance.now() - startTime,
        performanceImpact,
      };

      console.log(`✅ Signal modulation completed in ${result.processingTime.toFixed(2)}ms`);
      console.log(`📊 Final intensity: ${modulatedSignal.final_intensity.toFixed(3)}`);
      console.log(`🎯 Should execute: ${modulatedSignal.should_execute} | Quality: ${modulatedSignal.quality_score.toFixed(3)}`);

      return result;
    } catch (error) {
      console.error('❌ Signal modulation integration failed:', error);
      throw new Error(`Signal modulation integration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract sentiment analysis from various sources
   */
  private async extractSentimentAnalysis(input: ModulationInput): Promise<SentimentAnalysis> {
    try {
      // Priority 1: Use LLM sentiment analysis if enabled and available
      if (this.config.enableLLMSentiment && input.newsArticles && input.newsArticles.length > 0) {
        return await this.callLLMSentimentAnalysis(input.newsArticles, input.baseSignal.symbol);
      }

      // Priority 2: Use existing LLM signals if available
      if (input.llmSignals?.sentiment) {
        return this.convertLLMSignalsToSentimentAnalysis(input.llmSignals);
      }

      // Priority 3: Use feature vector sentiment if available
      if (input.featureVector) {
        return this.extractSentimentFromFeatureVector(input.featureVector);
      }

      // Fallback: Create default sentiment analysis
      return this.createFallbackSentimentAnalysis(input.baseSignal);
    } catch (error) {
      console.warn('⚠️ Sentiment analysis extraction failed, using fallback:', error);
      return this.createFallbackSentimentAnalysis(input.baseSignal);
    }
  }

  /**
   * Extract risk assessment from multiple sources
   */
  private async extractRiskAssessment(input: ModulationInput): Promise<RiskAssessment> {
    try {
      const riskFactors: string[] = [];
      let overallRisk = 3; // Default moderate risk
      let confidence = 0.5;

      // Technical risk
      if (input.technicalIndicators && this.config.enableTechnicalAnalysis) {
        const technicalRisk = this.calculateTechnicalRisk(input.technicalIndicators, input.baseSignal);
        overallRisk = (overallRisk + technicalRisk.level) / 2;
        riskFactors.push(...technicalRisk.factors);
        confidence = Math.max(confidence, technicalRisk.confidence);
      }

      // Market regime risk
      if (input.marketRegime && this.config.enableMarketRegimeAnalysis) {
        const regimeRisk = this.calculateRegimeRisk(input.marketRegime);
        overallRisk = (overallRisk + regimeRisk.level) / 2;
        riskFactors.push(...regimeRisk.factors);
      }

      // Smart money risk
      if (input.smartMoneyConcepts && this.config.enableSmartMoneyAnalysis) {
        const smartMoneyRisk = this.calculateSmartMoneyRisk(input.smartMoneyConcepts);
        overallRisk = (overallRisk + smartMoneyRisk.level) / 2;
        riskFactors.push(...smartMoneyRisk.factors);
      }

      // Market data risk
      if (input.marketData) {
        const marketRisk = this.calculateMarketRisk(input.marketData);
        overallRisk = (overallRisk + marketRisk.level) / 2;
        riskFactors.push(...marketRisk.factors);
      }

      return {
        overall_risk: Math.max(1, Math.min(5, Math.round(overallRisk))),
        market_volatility: this.calculateVolatilityRisk(input),
        liquidity_risk: this.calculateLiquidityRisk(input),
        sentiment_risk: this.calculateSentimentRisk(input),
        technical_risk: this.calculateTechnicalRiskLevel(input),
        factors: [...new Set(riskFactors)], // Remove duplicates
        confidence,
      };
    } catch (error) {
      console.warn('⚠️ Risk assessment extraction failed, using fallback:', error);
      return {
        overall_risk: 3,
        market_volatility: 3,
        liquidity_risk: 3,
        sentiment_risk: 3,
        technical_risk: 3,
        factors: ['Risk assessment unavailable'],
        confidence: 0.3,
      };
    }
  }

  /**
   * Extract market conditions from various sources
   */
  private async extractMarketConditions(input: ModulationInput): Promise<MarketConditions> {
    try {
      const marketData = input.marketData;
      const sessionInfo = input.sessionInfo;
      const marketRegime = input.marketRegime;

      // Determine volatility
      const volatility = this.determineVolatility(marketData, input.technicalIndicators);

      // Determine trend strength
      const trendStrength = this.determineTrendStrength(marketData, marketRegime);

      // Determine liquidity
      const liquidity = this.determineLiquidity(marketData, sessionInfo);

      // Determine session type
      const sessionType = this.determineSessionType(sessionInfo);

      // Determine market regime
      const marketRegimeType = this.determineMarketRegime(marketRegime, volatility, trendStrength);

      return {
        volatility,
        trend_strength: trendStrength,
        liquidity,
        session_type: sessionType,
        market_regime: marketRegimeType,
      };
    } catch (error) {
      console.warn('⚠️ Market conditions extraction failed, using fallback:', error);
      return {
        volatility: 'normal',
        trend_strength: 'moderate',
        liquidity: 'normal',
        session_type: 'london',
        market_regime: 'ranging',
      };
    }
  }

  /**
   * Call LLM sentiment analysis edge function
   */
  private async callLLMSentimentAnalysis(
    articles: Array<{ title: string; description: string; source?: string; publishedAt?: string }>,
    symbol?: string
  ): Promise<SentimentAnalysis> {
    const cacheKey = `llm-sentiment-${symbol}-${articles.length}`;

    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached as SentimentAnalysis;
    }

    try {
      const { data, error } = await supabase.functions.invoke('llm-sentiment', {
        body: {
          articles,
          symbol,
          context: `Trading signal modulation for ${symbol}`,
        },
      });

      if (error) {
        throw new Error(`LLM sentiment analysis failed: ${error.message}`);
      }

      // Cache the result
      this.setToCache(cacheKey, data, 5 * 60 * 1000); // 5 minute cache

      return {
        score: data.sentiment,
        confidence: data.confidence,
        reasoning: data.reasoning,
        risk: data.risk,
        key_factors: data.key_factors || [],
        market_context: data.market_context || '',
        timestamp: new Date(data.timestamp),
      };
    } catch (error) {
      console.error('LLM sentiment analysis failed:', error);
      throw error;
    }
  }

  /**
   * Convert LLM signals to sentiment analysis
   */
  private convertLLMSignalsToSentimentAnalysis(llmSignals: LLMSignals): SentimentAnalysis {
    const sentiment = llmSignals.sentiment || { score: 0, confidence: 0, label: 'neutral' };
    const risk = llmSignals.riskAssessment || { level: 0.5, confidence: 0, factors: [] };

    // Convert score from [-1,1] to [1,5]
    const normalizedScore = (sentiment.score + 1) * 2 + 1;
    // Convert level from [0,1] to [1,5]
    const normalizedRisk = risk.level * 4 + 1;

    return {
      score: Math.max(1, Math.min(5, normalizedScore)),
      confidence: sentiment.confidence,
      reasoning: `Derived from LLM signals: ${sentiment.label}`,
      risk: Math.max(1, Math.min(5, normalizedRisk)),
      key_factors: risk.factors,
      market_context: 'Derived from LLM analysis',
      timestamp: new Date(),
    };
  }

  /**
   * Extract sentiment from feature vector
   */
  private extractSentimentFromFeatureVector(featureVector: NormalizedFeatureVector): SentimentAnalysis {
    const sentimentFeatures = featureVector.sentimentFeatures;

    if (sentimentFeatures.length < 4) {
      return this.createFallbackSentimentAnalysis({ symbol: 'UNKNOWN' } as BaseSignal);
    }

    const sentimentScore = (sentimentFeatures[0] + 1) * 2 + 1; // Convert [-1,1] to [1,5]
    const sentimentConfidence = sentimentFeatures[1];
    const riskLevel = sentimentFeatures[2] * 4 + 1; // Convert [0,1] to [1,5]

    return {
      score: Math.max(1, Math.min(5, sentimentScore)),
      confidence: sentimentConfidence,
      reasoning: 'Derived from feature vector sentiment analysis',
      risk: Math.max(1, Math.min(5, riskLevel)),
      key_factors: ['Technical sentiment analysis', 'Market regime analysis'],
      market_context: 'Feature-based sentiment assessment',
      timestamp: new Date(),
    };
  }

  /**
   * Create fallback sentiment analysis
   */
  private createFallbackSentimentAnalysis(signal: BaseSignal): SentimentAnalysis {
    return {
      score: 3,
      confidence: 0.3,
      reasoning: 'Fallback sentiment analysis - using neutral values',
      risk: 3,
      key_factors: ['Limited sentiment data available'],
      market_context: 'Unknown market context',
      timestamp: new Date(),
    };
  }

  /**
   * Calculate technical risk
   */
  private calculateTechnicalRisk(indicators: TechnicalIndicators, signal: BaseSignal): { level: number; factors: string[]; confidence: number } {
    const factors: string[] = [];
    let riskScore = 3; // Default moderate risk
    const confidence = 0.7;

    // RSI risk
    if (indicators.rsi) {
      if (indicators.rsi.value < 20 || indicators.rsi.value > 80) {
        riskScore += 1;
        factors.push(`Extreme RSI (${indicators.rsi.value.toFixed(1)})`);
      }
    }

    // MACD risk
    if (indicators.macd) {
      const macdDistance = Math.abs(indicators.macd.histogram);
      if (macdDistance > 0.001) {
        riskScore += 0.5;
        factors.push('High MACD divergence');
      }
    }

    // Bollinger Bands risk
    if (indicators.bollingerBands) {
      const position = indicators.bollingerBands.position;
      if (position < 0.1 || position > 0.9) {
        riskScore += 0.5;
        factors.push('Price at Bollinger Bands extreme');
      }
    }

    return {
      level: Math.max(1, Math.min(5, riskScore)),
      factors,
      confidence,
    };
  }

  /**
   * Calculate regime risk
   */
  private calculateRegimeRisk(regime: MarketRegime): { level: number; factors: string[] } {
    const factors: string[] = [];
    let riskScore = 3;

    if (regime.volatilityState === 'extreme') {
      riskScore += 1.5;
      factors.push('Extreme market volatility');
    } else if (regime.volatilityState === 'high') {
      riskScore += 0.5;
      factors.push('High market volatility');
    }

    if (regime.momentumState === 'reversing') {
      riskScore += 1;
      factors.push('Market momentum reversing');
    }

    return {
      level: Math.max(1, Math.min(5, riskScore)),
      factors,
    };
  }

  /**
   * Calculate smart money risk
   */
  private calculateSmartMoneyRisk(smartMoney: SmartMoneyConcepts): { level: number; factors: string[] } {
    const factors: string[] = [];
    let riskScore = 3;

    const totalSignals = (smartMoney.orderBlocks?.length || 0) +
                       (smartMoney.fairValueGaps?.length || 0) +
                       (smartMoney.liquidityPools?.length || 0);

    if (totalSignals > 10) {
      riskScore += 0.5;
      factors.push('High smart money signal density');
    }

    if (totalSignals === 0) {
      riskScore += 0.5;
      factors.push('No smart money signals detected');
    }

    return {
      level: Math.max(1, Math.min(5, riskScore)),
      factors,
    };
  }

  /**
   * Calculate market risk
   */
  private calculateMarketRisk(marketData: MarketData): { level: number; factors: string[] } {
    const factors: string[] = [];
    let riskScore = 3;

    const priceRange = marketData.high - marketData.low;
    const rangePercent = (priceRange / marketData.close) * 100;

    if (rangePercent > 2) {
      riskScore += 1;
      factors.push('High intraday volatility');
    } else if (rangePercent > 1) {
      riskScore += 0.5;
      factors.push('Moderate intraday volatility');
    }

    return {
      level: Math.max(1, Math.min(5, riskScore)),
      factors,
    };
  }

  /**
   * Determine volatility from market data and indicators
   */
  private determineVolatility(
    marketData?: MarketData,
    indicators?: TechnicalIndicators
  ): 'low' | 'normal' | 'high' | 'extreme' {
    if (!marketData) return 'normal';

    const range = marketData.high - marketData.low;
    const rangePercent = (range / marketData.close) * 100;

    if (indicators?.atr) {
      const atrPercent = (indicators.atr.value / marketData.close) * 100;
      if (atrPercent > 3) return 'extreme';
      if (atrPercent > 1.5) return 'high';
      if (atrPercent > 0.5) return 'normal';
      return 'low';
    }

    if (rangePercent > 2.5) return 'extreme';
    if (rangePercent > 1.5) return 'high';
    if (rangePercent > 0.8) return 'normal';
    return 'low';
  }

  /**
   * Determine trend strength
   */
  private determineTrendStrength(
    marketData?: MarketData,
    marketRegime?: MarketRegime
  ): 'weak' | 'moderate' | 'strong' {
    if (marketRegime?.trendDirection) {
      if (marketRegime.trendDirection.includes('strong')) return 'strong';
      if (marketRegime.trendDirection.includes('moderate')) return 'moderate';
      return 'weak';
    }

    if (!marketData) return 'moderate';

    const changePercent = Math.abs((marketData.close - marketData.open) / marketData.open) * 100;
    if (changePercent > 1.5) return 'strong';
    if (changePercent > 0.5) return 'moderate';
    return 'weak';
  }

  /**
   * Determine liquidity
   */
  private determineLiquidity(
    marketData?: MarketData,
    sessionInfo?: SessionInfo
  ): 'low' | 'normal' | 'high' {
    if (!sessionInfo) return 'normal';

    // Determine session overlap (high liquidity)
    const currentHour = new Date().getUTCHours();
    const isOverlap = currentHour >= 13 && currentHour < 16; // London-NY overlap

    if (isOverlap) return 'high';
    if (sessionInfo.londonSession || sessionInfo.nySession) return 'normal';
    return 'low';
  }

  /**
   * Determine session type
   */
  private determineSessionType(sessionInfo?: SessionInfo): 'asian' | 'london' | 'new_york' | 'overlap' | 'off_hours' {
    if (!sessionInfo) {
      const currentHour = new Date().getUTCHours();
      if (currentHour >= 13 && currentHour < 16) return 'overlap';
      if (currentHour >= 8 && currentHour < 16) return 'london';
      if (currentHour >= 13 && currentHour < 21) return 'new_york';
      if (currentHour >= 0 && currentHour < 8) return 'asian';
      return 'off_hours';
    }

    const currentHour = new Date().getUTCHours();
    if (currentHour >= 13 && currentHour < 16) return 'overlap';
    if (sessionInfo.londonSession) return 'london';
    if (sessionInfo.nySession) return 'new_york';
    if (sessionInfo.asianSession) return 'asian';
    return 'off_hours';
  }

  /**
   * Determine market regime
   */
  private determineMarketRegime(
    marketRegime?: MarketRegime,
    volatility?: string,
    trendStrength?: string
  ): 'trending' | 'ranging' | 'volatile' | 'breakout' {
    if (marketRegime?.trendDirection) {
      if (marketRegime.trendDirection === 'sideways') return 'ranging';
      if (volatility === 'extreme') return 'volatile';
      if (trendStrength === 'strong') return 'breakout';
      return 'trending';
    }

    if (volatility === 'extreme') return 'volatile';
    if (trendStrength === 'strong') return 'trending';
    return 'ranging';
  }

  /**
   * Calculate volatility risk
   */
  private calculateVolatilityRisk(input: ModulationInput): number {
    if (!input.marketData) return 3;

    const range = input.marketData.high - input.marketData.low;
    const rangePercent = (range / input.marketData.close) * 100;

    if (rangePercent > 2.5) return 5;
    if (rangePercent > 1.5) return 4;
    if (rangePercent > 0.8) return 3;
    if (rangePercent > 0.3) return 2;
    return 1;
  }

  /**
   * Calculate liquidity risk
   */
  private calculateLiquidityRisk(input: ModulationInput): number {
    const sessionType = this.determineSessionType(input.sessionInfo);

    switch (sessionType) {
      case 'overlap': return 1;
      case 'london':
      case 'new_york': return 2;
      case 'asian': return 3;
      case 'off_hours': return 4;
      default: return 3;
    }
  }

  /**
   * Calculate sentiment risk
   */
  private calculateSentimentRisk(input: ModulationInput): number {
    if (input.llmSignals?.riskAssessment) {
      return Math.round(input.llmSignals.riskAssessment.level * 4 + 1);
    }
    return 3;
  }

  /**
   * Calculate technical risk level
   */
  private calculateTechnicalRiskLevel(input: ModulationInput): number {
    if (!input.technicalIndicators) return 3;

    const indicators = input.technicalIndicators;
    let riskLevel = 3;

    // RSI extremes
    if (indicators.rsi) {
      if (indicators.rsi.value < 25 || indicators.rsi.value > 75) riskLevel += 1;
    }

    // MACD divergence
    if (indicators.macd && Math.abs(indicators.macd.histogram) > 0.001) {
      riskLevel += 0.5;
    }

    return Math.max(1, Math.min(5, Math.round(riskLevel)));
  }

  /**
   * Calculate performance impact
   */
  private calculatePerformanceImpact(
    modulatedSignal: ModulatedSignal,
    sentimentAnalysis: SentimentAnalysis,
    riskAssessment: RiskAssessment,
    marketConditions: MarketConditions
  ) {
    // Expected win rate based on quality score
    const expectedWinRate = modulatedSignal.quality_score * 0.85; // Max 85% win rate

    // Expected profit factor based on risk-reward
    const expectedProfitFactor = modulatedSignal.final_intensity * 1.5; // Max 3.0 profit factor

    // Risk-adjusted return
    const riskAdjustedReturn = expectedWinRate * expectedProfitFactor * (1 - riskAssessment.overall_risk / 5);

    return {
      expectedWinRate,
      expectedProfitFactor,
      riskAdjustedReturn,
    };
  }

  /**
   * Save modulation result to database
   */
  private async saveModulationResult(result: ModulationResult): Promise<void> {
    try {
      const { error } = await supabase
        .from('signal_modulation_history')
        .insert({
          signal_id: result.modulatedSignal.id,
          symbol: result.modulatedSignal.symbol,
          signal_type: result.modulatedSignal.type,
          original_confidence: result.modulatedSignal.original_confidence,
          original_intensity: result.modulatedSignal.original_intensity,
          final_intensity: result.modulatedSignal.final_intensity,
          sentiment_score: result.sentimentAnalysis.score,
          risk_level: result.riskAssessment.overall_risk,
          quality_score: result.modulatedSignal.quality_score,
          should_execute: result.modulatedSignal.should_execute,
          processing_time: result.processingTime,
          performance_impact: result.performanceImpact,
          market_conditions: result.marketConditions,
          reasoning: result.modulatedSignal.reasoning,
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.warn('Failed to save modulation result:', error);
      }
    } catch (error) {
      console.warn('Error saving modulation result:', error);
    }
  }

  /**
   * Cache management methods
   */
  private getFromCache(key: string): unknown | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setToCache(key: string, data: unknown, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Get service performance metrics
   */
  public getPerformanceMetrics() {
    return this.modulationService.getPerformanceMetrics();
  }

  /**
   * Get service configuration
   */
  public getConfig() {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<IntegrationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const signalModulationIntegration = new SignalModulationIntegration();

export default SignalModulationIntegration;