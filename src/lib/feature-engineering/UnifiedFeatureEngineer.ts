// @ts-nocheck
import {
  TechnicalIndicators,
  MarketData,
  ATRData,
  BollingerBandsData,
  RSIData,
  MACDData
} from '../types/technical-indicators';
import { SmartMoneyConcepts, OrderBlock, FairValueGap, LiquidityPool } from '../types/smart-money';
import { LLMSignals, SentimentAnalysis, RiskAssessment } from '../types/llm-signals';
import { SessionInfo, SessionType } from '../types/market-sessions';

export interface MarketRegime {
  trendDirection: 'strong_up' | 'moderate_up' | 'sideways' | 'moderate_down' | 'strong_down';
  volatilityState: 'low' | 'normal' | 'high' | 'extreme';
  momentumState: 'accelerating' | 'maintaining' | 'decelerating' | 'reversing';
}

export interface FeatureWeight {
  featureName: string;
  weight: number;
  importance: number;
  stability: number;
}

export interface NormalizedFeatureVector {
  technicalFeatures: number[];
  sessionFeatures: number[];
  smartMoneyFeatures: number[];
  sentimentFeatures: number[];
  regimeFeatures: number[];
  marketContextFeatures: number[];
  timestamp: number;
  symbol: string;
  timeframe: string;
}

export interface FeatureImportanceResult {
  featureName: string;
  importance: number;
  contribution: number;
  stability: number;
  recommendedAction: 'keep' | 'monitor' | 'remove';
}

export interface UnifiedFeatureEngineerConfig {
  enableTechnicalIndicators: boolean;
  enableSessionFeatures: boolean;
  enableSmartMoneyFeatures: boolean;
  enableSentimentFeatures: boolean;
  enableRegimeFeatures: boolean;
  normalizeFeatures: boolean;
  featureImportanceThreshold: number;
  maxHistoryLength: number;
  smoothingFactor: number;
}

export class UnifiedFeatureEngineer {
  private config: UnifiedFeatureEngineerConfig;
  private featureWeights: Map<string, FeatureWeight> = new Map();
  private featureHistory: Map<string, number[]> = new Map();
  private missingDataHandler: (featureName: string, timestamp: number) => number;

  constructor(config: Partial<UnifiedFeatureEngineerConfig> = {}) {
    this.config = {
      enableTechnicalIndicators: true,
      enableSessionFeatures: true,
      enableSmartMoneyFeatures: true,
      enableSentimentFeatures: true,
      enableRegimeFeatures: true,
      normalizeFeatures: true,
      featureImportanceThreshold: 0.05,
      maxHistoryLength: 100,
      smoothingFactor: 0.2,
      ...config
    };

    this.initializeFeatureWeights();
    this.initializeMissingDataHandler();
  }

  private initializeFeatureWeights(): void {
    // Technical indicator weights
    this.featureWeights.set('atr_normalized', { featureName: 'atr_normalized', weight: 0.15, importance: 0.8, stability: 0.9 });
    this.featureWeights.set('bollinger_position', { featureName: 'bollinger_position', weight: 0.12, importance: 0.7, stability: 0.85 });
    this.featureWeights.set('bollinger_width', { featureName: 'bollinger_width', weight: 0.10, importance: 0.6, stability: 0.8 });
    this.featureWeights.set('rsi_value', { featureName: 'rsi_value', weight: 0.13, importance: 0.75, stability: 0.82 });
    this.featureWeights.set('rsi_divergence', { featureName: 'rsi_divergence', weight: 0.08, importance: 0.65, stability: 0.7 });
    this.featureWeights.set('macd_line', { featureName: 'macd_line', weight: 0.11, importance: 0.72, stability: 0.83 });
    this.featureWeights.set('macd_signal', { featureName: 'macd_signal', weight: 0.09, importance: 0.68, stability: 0.8 });
    this.featureWeights.set('macd_histogram', { featureName: 'macd_histogram', weight: 0.07, importance: 0.6, stability: 0.75 });

    // Session features weights
    this.featureWeights.set('london_session', { featureName: 'london_session', weight: 0.08, importance: 0.5, stability: 0.95 });
    this.featureWeights.set('ny_session', { featureName: 'ny_session', weight: 0.08, importance: 0.5, stability: 0.95 });
    this.featureWeights.set('asian_session', { featureName: 'asian_session', weight: 0.06, importance: 0.4, stability: 0.95 });
    this.featureWeights.set('session_overlap', { featureName: 'session_overlap', weight: 0.10, importance: 0.6, stability: 0.9 });

    // Smart money features weights
    this.featureWeights.set('order_block_density', { featureName: 'order_block_density', weight: 0.12, importance: 0.7, stability: 0.75 });
    this.featureWeights.set('fvg_density', { featureName: 'fvg_density', weight: 0.11, importance: 0.68, stability: 0.72 });
    this.featureWeights.set('liquidity_pool_pressure', { featureName: 'liquidity_pool_pressure', weight: 0.10, importance: 0.65, stability: 0.7 });
    this.featureWeights.set('smart_money_confluence', { featureName: 'smart_money_confluence', weight: 0.15, importance: 0.8, stability: 0.78 });

    // Sentiment features weights
    this.featureWeights.set('sentiment_score', { featureName: 'sentiment_score', weight: 0.14, importance: 0.75, stability: 0.65 });
    this.featureWeights.set('sentiment_confidence', { featureName: 'sentiment_confidence', weight: 0.08, importance: 0.6, stability: 0.7 });
    this.featureWeights.set('risk_level', { featureName: 'risk_level', weight: 0.12, importance: 0.7, stability: 0.72 });
    this.featureWeights.set('market_fear_greed', { featureName: 'market_fear_greed', weight: 0.10, importance: 0.65, stability: 0.68 });

    // Market regime features weights
    this.featureWeights.set('trend_strength', { featureName: 'trend_strength', weight: 0.13, importance: 0.78, stability: 0.8 });
    this.featureWeights.set('volatility_regime', { featureName: 'volatility_regime', weight: 0.11, importance: 0.72, stability: 0.82 });
    this.featureWeights.set('momentum_state', { featureName: 'momentum_state', weight: 0.09, importance: 0.65, stability: 0.75 });
    this.featureWeights.set('regime_stability', { featureName: 'regime_stability', weight: 0.08, importance: 0.6, stability: 0.78 });
  }

  private initializeMissingDataHandler(): void {
    this.missingDataHandler = (featureName: string, timestamp: number): number => {
      const history = this.featureHistory.get(featureName) || [];

      if (history.length === 0) {
        // Use feature-specific default values
        const defaults: Record<string, number> = {
          'atr_normalized': 0.5,
          'bollinger_position': 0.5,
          'bollinger_width': 0.5,
          'rsi_value': 0.5,
          'rsi_divergence': 0,
          'macd_line': 0,
          'macd_signal': 0,
          'macd_histogram': 0,
          'london_session': 0,
          'ny_session': 0,
          'asian_session': 0,
          'session_overlap': 0,
          'order_block_density': 0,
          'fvg_density': 0,
          'liquidity_pool_pressure': 0,
          'smart_money_confluence': 0,
          'sentiment_score': 0.5,
          'sentiment_confidence': 0,
          'risk_level': 0.5,
          'market_fear_greed': 0.5,
          'trend_strength': 0,
          'volatility_regime': 0.5,
          'momentum_state': 0,
          'regime_stability': 0.5
        };

        return defaults[featureName] || 0;
      }

      // Use exponential smoothing of recent values
      const recentValues = history.slice(-10);
      const alpha = 0.3;
      let weightedSum = 0;
      let weightSum = 0;

      for (let i = 0; i < recentValues.length; i++) {
        const weight = Math.pow(1 - alpha, recentValues.length - 1 - i);
        weightedSum += recentValues[i] * weight;
        weightSum += weight;
      }

      return weightSum > 0 ? weightedSum / weightSum : 0;
    };
  }

  public generateFeatureVector(
    marketData: MarketData,
    technicalIndicators: TechnicalIndicators,
    sessionInfo: SessionInfo,
    smartMoneyConcepts: SmartMoneyConcepts,
    llmSignals: LLMSignals,
    marketRegime: MarketRegime,
    timestamp: number = Date.now()
  ): NormalizedFeatureVector {
    const technicalFeatures = this.extractTechnicalFeatures(technicalIndicators, marketData);
    const sessionFeatures = this.extractSessionFeatures(sessionInfo, timestamp);
    const smartMoneyFeatures = this.extractSmartMoneyFeatures(smartMoneyConcepts, marketData);
    const sentimentFeatures = this.extractSentimentFeatures(llmSignals);
    const regimeFeatures = this.extractRegimeFeatures(marketRegime);
    const marketContextFeatures = this.extractMarketContextFeatures(marketData, technicalIndicators, sessionInfo);

    const featureVector: NormalizedFeatureVector = {
      technicalFeatures: this.config.normalizeFeatures ? this.normalizeFeatures(technicalFeatures, 'technical') : technicalFeatures,
      sessionFeatures: this.config.normalizeFeatures ? this.normalizeFeatures(sessionFeatures, 'session') : sessionFeatures,
      smartMoneyFeatures: this.config.normalizeFeatures ? this.normalizeFeatures(smartMoneyFeatures, 'smart_money') : smartMoneyFeatures,
      sentimentFeatures: this.config.normalizeFeatures ? this.normalizeFeatures(sentimentFeatures, 'sentiment') : sentimentFeatures,
      regimeFeatures: this.config.normalizeFeatures ? this.normalizeFeatures(regimeFeatures, 'regime') : regimeFeatures,
      marketContextFeatures: this.config.normalizeFeatures ? this.normalizeFeatures(marketContextFeatures, 'context') : marketContextFeatures,
      timestamp,
      symbol: marketData.symbol,
      timeframe: marketData.timeframe
    };

    this.updateFeatureHistory(featureVector);
    return featureVector;
  }

  private extractTechnicalFeatures(indicators: TechnicalIndicators, marketData: MarketData): number[] {
    if (!this.config.enableTechnicalIndicators) {
      return new Array(8).fill(0);
    }

    const atr = indicators.atr || { value: 0, normalized: 0.5 };
    const bollinger = indicators.bollingerBands || { upper: 0, middle: 0, lower: 0, position: 0.5, width: 0.5 };
    const rsi = indicators.rsi || { value: 50, divergence: 0 };
    const macd = indicators.macd || { line: 0, signal: 0, histogram: 0 };

    return [
      this.handleMissingData('atr_normalized', atr.normalized || this.normalizeATR(atr.value, marketData)),
      this.handleMissingData('bollinger_position', bollinger.position || 0.5),
      this.handleMissingData('bollinger_width', bollinger.width || 0.5),
      this.handleMissingData('rsi_value', this.normalizeRSI(rsi.value)),
      this.handleMissingData('rsi_divergence', Math.max(-1, Math.min(1, rsi.divergence || 0))),
      this.handleMissingData('macd_line', this.normalizeMACD(macd.line, marketData)),
      this.handleMissingData('macd_signal', this.normalizeMACD(macd.signal, marketData)),
      this.handleMissingData('macd_histogram', this.normalizeMACD(macd.histogram, marketData))
    ];
  }

  private extractSessionFeatures(sessionInfo: SessionInfo, timestamp: number): number[] {
    if (!this.config.enableSessionFeatures) {
      return new Array(4).fill(0);
    }

    const currentHour = new Date(timestamp).getUTCHours();

    return [
      this.handleMissingData('london_session', this.isSessionActive(currentHour, 8, 16) ? 1 : 0),
      this.handleMissingData('ny_session', this.isSessionActive(currentHour, 13, 21) ? 1 : 0),
      this.handleMissingData('asian_session', this.isSessionActive(currentHour, 0, 8) ? 1 : 0),
      this.handleMissingData('session_overlap', this.getSessionOverlapScore(currentHour))
    ];
  }

  private extractSmartMoneyFeatures(smartMoney: SmartMoneyConcepts, marketData: MarketData): number[] {
    if (!this.config.enableSmartMoneyFeatures) {
      return new Array(4).fill(0);
    }

    const orderBlockDensity = this.calculateOrderBlockDensity(smartMoney.orderBlocks || [], marketData);
    const fvgDensity = this.calculateFVGDensity(smartMoney.fairValueGaps || [], marketData);
    const liquidityPressure = this.calculateLiquidityPressure(smartMoney.liquidityPools || [], marketData);
    const confluence = this.calculateSmartMoneyConfluence(smartMoney, marketData);

    return [
      this.handleMissingData('order_block_density', orderBlockDensity),
      this.handleMissingData('fvg_density', fvgDensity),
      this.handleMissingData('liquidity_pool_pressure', liquidityPressure),
      this.handleMissingData('smart_money_confluence', confluence)
    ];
  }

  private extractSentimentFeatures(llmSignals: LLMSignals): number[] {
    if (!this.config.enableSentimentFeatures) {
      return new Array(4).fill(0);
    }

    const sentiment = llmSignals.sentiment || { score: 0.5, confidence: 0, label: 'neutral' };
    const risk = llmSignals.riskAssessment || { level: 0.5, confidence: 0, factors: [] };
    const fearGreed = llmSignals.marketFearGreed || { value: 50, classification: 'neutral' };

    return [
      this.handleMissingData('sentiment_score', Math.max(-1, Math.min(1, sentiment.score))),
      this.handleMissingData('sentiment_confidence', sentiment.confidence),
      this.handleMissingData('risk_level', risk.level),
      this.handleMissingData('market_fear_greed', fearGreed.value / 100)
    ];
  }

  private extractRegimeFeatures(regime: MarketRegime): number[] {
    if (!this.config.enableRegimeFeatures) {
      return new Array(4).fill(0);
    }

    const trendStrength = this.getTrendStrength(regime.trendDirection);
    const volatilityLevel = this.getVolatilityLevel(regime.volatilityState);
    const momentumLevel = this.getMomentumLevel(regime.momentumState);
    const regimeStability = this.calculateRegimeStability(regime);

    return [
      this.handleMissingData('trend_strength', trendStrength),
      this.handleMissingData('volatility_regime', volatilityLevel),
      this.handleMissingData('momentum_state', momentumLevel),
      this.handleMissingData('regime_stability', regimeStability)
    ];
  }

  private extractMarketContextFeatures(marketData: MarketData, indicators: TechnicalIndicators, sessionInfo: SessionInfo): number[] {
    const priceChange = marketData.close - marketData.open;
    const priceRange = marketData.high - marketData.low;
    const volumeNormalized = marketData.volume ? Math.log(marketData.volume + 1) / 20 : 0;
    const atrNormalized = indicators.atr ? indicators.atr.normalized || 0.5 : 0.5;
    const sessionVolatility = sessionInfo.volatility || 0.5;

    return [
      Math.tanh(priceChange / (marketData.close * 0.01)), // Normalized price change
      Math.min(1, priceRange / marketData.close * 100), // Normalized range
      Math.min(1, volumeNormalized),
      atrNormalized,
      sessionVolatility
    ];
  }

  private normalizeATR(atr: number, marketData: MarketData): number {
    if (!atr || !marketData.close) return 0.5;
    return Math.min(1, atr / marketData.close * 100);
  }

  private normalizeRSI(rsi: number): number {
    if (!rsi) return 0.5;
    return Math.max(0, Math.min(1, rsi / 100));
  }

  private normalizeMACD(macd: number, marketData: MarketData): number {
    if (!macd || !marketData.close) return 0;
    return Math.tanh(macd / (marketData.close * 0.001));
  }

  private isSessionActive(currentHour: number, startHour: number, endHour: number): boolean {
    if (startHour <= endHour) {
      return currentHour >= startHour && currentHour < endHour;
    } else {
      return currentHour >= startHour || currentHour < endHour;
    }
  }

  private getSessionOverlapScore(currentHour: number): number {
    // London-New York overlap (13:00-16:00 UTC)
    if (currentHour >= 13 && currentHour < 16) return 1;
    // Asian-London overlap (7:00-9:00 UTC)
    if (currentHour >= 7 && currentHour < 9) return 0.8;
    // Session transitions
    if (currentHour >= 21 || currentHour < 1) return 0.3; // NY close to Asian open
    if (currentHour >= 7 && currentHour < 8) return 0.5; // Asian to London transition
    return 0;
  }

  private calculateOrderBlockDensity(orderBlocks: OrderBlock[], marketData: MarketData): number {
    if (orderBlocks.length === 0) return 0;

    const currentPrice = marketData.close;
    const relevantBlocks = orderBlocks.filter(block =>
      Math.abs(block.price - currentPrice) / currentPrice < 0.02 // Within 2% of current price
    );

    return Math.min(1, relevantBlocks.length * 0.3);
  }

  private calculateFVGDensity(fvgs: FairValueGap[], marketData: MarketData): number {
    if (fvgs.length === 0) return 0;

    const currentPrice = marketData.close;
    const relevantFVGs = fvgs.filter(fvg =>
      currentPrice >= fvg.low && currentPrice <= fvg.high
    );

    return Math.min(1, relevantFVGs.length * 0.4);
  }

  private calculateLiquidityPressure(liquidityPools: LiquidityPool[], marketData: MarketData): number {
    if (liquidityPools.length === 0) return 0;

    const currentPrice = marketData.close;
    let totalPressure = 0;

    liquidityPools.forEach(pool => {
      const distance = Math.abs(pool.price - currentPrice) / currentPrice;
      if (distance < 0.01) { // Within 1% of current price
        totalPressure += pool.type === 'buy' ? 1 : -1;
      }
    });

    return Math.tanh(totalPressure * 0.5);
  }

  private calculateSmartMoneyConfluence(smartMoney: SmartMoneyConcepts, marketData: MarketData): number {
    const orderBlockScore = this.calculateOrderBlockDensity(smartMoney.orderBlocks || [], marketData);
    const fvgScore = this.calculateFVGDensity(smartMoney.fairValueGaps || [], marketData);
    const liquidityScore = Math.abs(this.calculateLiquidityPressure(smartMoney.liquidityPools || [], marketData));

    return (orderBlockScore + fvgScore + liquidityScore) / 3;
  }

  private getTrendStrength(trendDirection: string): number {
    const strengthMap: Record<string, number> = {
      'strong_up': 1,
      'moderate_up': 0.6,
      'sideways': 0,
      'moderate_down': -0.6,
      'strong_down': -1
    };
    return strengthMap[trendDirection] || 0;
  }

  private getVolatilityLevel(volatilityState: string): number {
    const volatilityMap: Record<string, number> = {
      'low': 0.2,
      'normal': 0.5,
      'high': 0.8,
      'extreme': 1
    };
    return volatilityMap[volatilityState] || 0.5;
  }

  private getMomentumLevel(momentumState: string): number {
    const momentumMap: Record<string, number> = {
      'accelerating': 0.8,
      'maintaining': 0.5,
      'decelerating': 0.2,
      'reversing': -0.5
    };
    return momentumMap[momentumState] || 0;
  }

  private calculateRegimeStability(regime: MarketRegime): number {
    const trendStability = regime.trendDirection === 'sideways' ? 0.8 : 0.6;
    const volatilityStability = regime.volatilityState === 'normal' ? 0.8 : 0.5;
    const momentumStability = regime.momentumState === 'maintaining' ? 0.8 : 0.4;

    return (trendStability + volatilityStability + momentumStability) / 3;
  }

  private normalizeFeatures(features: number[], category: string): number[] {
    return features.map(feature => {
      const normalized = Math.tanh(feature); // Squash to [-1, 1] range
      return isNaN(normalized) ? 0 : normalized;
    });
  }

  private handleMissingData(featureName: string, value: number): number {
    if (isNaN(value) || !isFinite(value)) {
      return this.missingDataHandler(featureName, Date.now());
    }
    return value;
  }

  private updateFeatureHistory(featureVector: NormalizedFeatureVector): void {
    const updateCategory = (features: number[], prefix: string) => {
      features.forEach((value, index) => {
        const featureName = `${prefix}_${index}`;
        let history = this.featureHistory.get(featureName) || [];
        history.push(value);

        if (history.length > this.config.maxHistoryLength) {
          history = history.slice(-this.config.maxHistoryLength);
        }

        this.featureHistory.set(featureName, history);
      });
    };

    updateCategory(featureVector.technicalFeatures, 'technical');
    updateCategory(featureVector.sessionFeatures, 'session');
    updateCategory(featureVector.smartMoneyFeatures, 'smart_money');
    updateCategory(featureVector.sentimentFeatures, 'sentiment');
    updateCategory(featureVector.regimeFeatures, 'regime');
    updateCategory(featureVector.marketContextFeatures, 'context');
  }

  public calculateFeatureImportance(
    featureVectors: NormalizedFeatureVector[],
    targetVariable: number[]
  ): FeatureImportanceResult[] {
    if (featureVectors.length !== targetVariable.length) {
      throw new Error('Feature vectors and target variable must have the same length');
    }

    const featureNames = [
      'atr_normalized', 'bollinger_position', 'bollinger_width', 'rsi_value',
      'rsi_divergence', 'macd_line', 'macd_signal', 'macd_histogram',
      'london_session', 'ny_session', 'asian_session', 'session_overlap',
      'order_block_density', 'fvg_density', 'liquidity_pool_pressure', 'smart_money_confluence',
      'sentiment_score', 'sentiment_confidence', 'risk_level', 'market_fear_greed',
      'trend_strength', 'volatility_regime', 'momentum_state', 'regime_stability'
    ];

    const results: FeatureImportanceResult[] = [];

    featureNames.forEach(featureName => {
      const correlation = this.calculateCorrelation(featureVectors, targetVariable, featureName);
      const stability = this.calculateFeatureStability(featureName);
      const weight = this.featureWeights.get(featureName)?.weight || 0.1;

      const importance = Math.abs(correlation) * weight * stability;
      const contribution = importance * stability;

      let recommendedAction: 'keep' | 'monitor' | 'remove' = 'keep';
      if (importance < this.config.featureImportanceThreshold) {
        recommendedAction = 'remove';
      } else if (stability < 0.3) {
        recommendedAction = 'monitor';
      }

      results.push({
        featureName,
        importance,
        contribution,
        stability,
        recommendedAction
      });
    });

    return results.sort((a, b) => b.importance - a.importance);
  }

  private calculateCorrelation(
    featureVectors: NormalizedFeatureVector[],
    targetVariable: number[],
    featureName: string
  ): number {
    const featureValues = featureVectors.map(vector => {
      const category = this.getFeatureCategory(featureName);
      const index = this.getFeatureIndex(featureName);
      return vector[category][index];
    });

    return this.pearsonCorrelation(featureValues, targetVariable);
  }

  private getFeatureCategory(featureName: string): keyof NormalizedFeatureVector {
    if (featureName.startsWith('atr') || featureName.startsWith('bollinger') ||
        featureName.startsWith('rsi') || featureName.startsWith('macd')) {
      return 'technicalFeatures';
    } else if (featureName.includes('session')) {
      return 'sessionFeatures';
    } else if (featureName.includes('order_block') || featureName.includes('fvg') ||
               featureName.includes('liquidity') || featureName.includes('smart_money')) {
      return 'smartMoneyFeatures';
    } else if (featureName.includes('sentiment') || featureName.includes('risk') ||
               featureName.includes('fear_greed')) {
      return 'sentimentFeatures';
    } else if (featureName.includes('trend') || featureName.includes('volatility') ||
               featureName.includes('momentum') || featureName.includes('regime')) {
      return 'regimeFeatures';
    }
    return 'marketContextFeatures';
  }

  private getFeatureIndex(featureName: string): number {
    const featureOrder = [
      'atr_normalized', 'bollinger_position', 'bollinger_width', 'rsi_value',
      'rsi_divergence', 'macd_line', 'macd_signal', 'macd_histogram',
      'london_session', 'ny_session', 'asian_session', 'session_overlap',
      'order_block_density', 'fvg_density', 'liquidity_pool_pressure', 'smart_money_confluence',
      'sentiment_score', 'sentiment_confidence', 'risk_level', 'market_fear_greed',
      'trend_strength', 'volatility_regime', 'momentum_state', 'regime_stability'
    ];
    return featureOrder.indexOf(featureName);
  }

  private calculateFeatureStability(featureName: string): number {
    const history = this.featureHistory.get(featureName) || [];
    if (history.length < 10) return 0.5;

    const recentValues = history.slice(-20);
    const mean = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    const variance = recentValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recentValues.length;
    const standardDeviation = Math.sqrt(variance);

    // Lower variance = higher stability
    return Math.max(0, 1 - standardDeviation);
  }

  private pearsonCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  public createMLReadyVector(featureVector: NormalizedFeatureVector): number[] {
    return [
      ...featureVector.technicalFeatures,
      ...featureVector.sessionFeatures,
      ...featureVector.smartMoneyFeatures,
      ...featureVector.sentimentFeatures,
      ...featureVector.regimeFeatures,
      ...featureVector.marketContextFeatures
    ];
  }

  public getFeatureWeights(): FeatureWeight[] {
    return Array.from(this.featureWeights.values());
  }

  public updateFeatureWeights(updates: Partial<FeatureWeight>[]): void {
    updates.forEach(update => {
      if (update.featureName && this.featureWeights.has(update.featureName)) {
        const existing = this.featureWeights.get(update.featureName)!;
        this.featureWeights.set(update.featureName, { ...existing, ...update });
      }
    });
  }

  public getFeatureStatistics(): Record<string, { mean: number; std: number; min: number; max: number }> {
    const stats: Record<string, { mean: number; std: number; min: number; max: number }> = {};

    this.featureHistory.forEach((history, featureName) => {
      if (history.length > 0) {
        const mean = history.reduce((sum, val) => sum + val, 0) / history.length;
        const variance = history.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / history.length;
        const std = Math.sqrt(variance);
        const min = Math.min(...history);
        const max = Math.max(...history);

        stats[featureName] = { mean, std, min, max };
      }
    });

    return stats;
  }

  public resetFeatureHistory(): void {
    this.featureHistory.clear();
  }

  public exportFeatureVector(featureVector: NormalizedFeatureVector): string {
    return JSON.stringify({
      ...featureVector,
      metadata: {
        generatedAt: new Date().toISOString(),
        featureCount: featureVector.technicalFeatures.length +
                      featureVector.sessionFeatures.length +
                      featureVector.smartMoneyFeatures.length +
                      featureVector.sentimentFeatures.length +
                      featureVector.regimeFeatures.length +
                      featureVector.marketContextFeatures.length,
        config: this.config
      }
    }, null, 2);
  }

  public importFeatureVector(jsonString: string): NormalizedFeatureVector {
    try {
      const data = JSON.parse(jsonString);
      return {
        technicalFeatures: data.technicalFeatures || [],
        sessionFeatures: data.sessionFeatures || [],
        smartMoneyFeatures: data.smartMoneyFeatures || [],
        sentimentFeatures: data.sentimentFeatures || [],
        regimeFeatures: data.regimeFeatures || [],
        marketContextFeatures: data.marketContextFeatures || [],
        timestamp: data.timestamp || Date.now(),
        symbol: data.symbol || 'UNKNOWN',
        timeframe: data.timeframe || '1h'
      };
    } catch (error) {
      throw new Error(`Failed to import feature vector: ${error}`);
    }
  }
}