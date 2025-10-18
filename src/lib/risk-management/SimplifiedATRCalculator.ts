/**
 * Simplified ATR Calculator with ML-Optimizable Coefficients
 *
 * Sistema semplificato basato su ATR M15 con coefficiente ottimizzabile via Machine Learning.
 * L'obiettivo è avere un sistema semplice, manutenibile e facilmente ottimizzabile.
 */

export interface MLOptimizedATRConfig {
  // ATR base configuration
  atrPeriod: number;
  baseCoefficient: number;

  // ML-optimizable coefficients per scenario
  coefficients: {
    neutral: number;        // Condizioni normali di mercato
    highVolatility: number; // Alta volatilità
    lowVolatility: number;  // Bassa volatilità
    trending: number;       // Mercato in trend
    ranging: number;        // Mercato laterale
    newsImpact: number;     // Durante news importanti
  };

  // Optimization parameters
  minCoefficient: number;
  maxCoefficient: number;
  learningRate: number;

  // Risk management
  minStopDistance: number;  // Distanza minima stop (%)
  maxStopDistance: number;  // Distanza massima stop (%)
}

export interface MarketConditions {
  volatility: 'low' | 'neutral' | 'high';
  trend: 'ranging' | 'trending';
  newsImpact: boolean;
  session: 'asian' | 'london' | 'ny' | 'overlap';
}

export interface ATROptimizationData {
  timestamp: Date;
  symbol: string;
  m15ATR: number;
  marketConditions: MarketConditions;
  coefficient: number;
  outcome: 'win' | 'loss';
  profitLoss: number;
  riskReward: number;
}

export interface ATROptimizationResult {
  recommendedCoefficient: number;
  confidence: number;
  reasoning: string;
  historicalPerformance: {
    winRate: number;
    avgRR: number;
    profitFactor: number;
    tradesAnalyzed: number;
  };
}

export class SimplifiedATRCalculator {
  private config: MLOptimizedATRConfig;
  private optimizationHistory: ATROptimizationData[] = [];

  constructor(config?: Partial<MLOptimizedATRConfig>) {
    this.config = {
      atrPeriod: 14,
      baseCoefficient: 1.0,
      coefficients: {
        neutral: 1.0,        // Base coefficient
        highVolatility: 1.5, // +50% in alta volatilità
        lowVolatility: 0.7,  // -30% in bassa volatilità
        trending: 0.9,       // -10% in trend (stop più stretti)
        ranging: 1.2,        // +20% in ranging (stop più ampi)
        newsImpact: 2.0      // +100% durante news
      },
      minCoefficient: 0.5,
      maxCoefficient: 3.0,
      learningRate: 0.01,
      minStopDistance: 0.001, // 0.1%
      maxStopDistance: 0.05,  // 5%
      ...config
    };
  }

  /**
   * Calcola l'ATR semplificato basato su dati M15
   */
  calculateM15ATR(m15Candles: Array<{high: number; low: number; close: number}>): number {
    if (!m15Candles || m15Candles.length < this.config.atrPeriod + 1) {
      throw new Error(`Need at least ${this.config.atrPeriod + 1} M15 candles for ATR calculation`);
    }

    const trueRanges: number[] = [];

    for (let i = 1; i < m15Candles.length; i++) {
      const current = m15Candles[i];
      const previous = m15Candles[i - 1];

      const tr = Math.max(
        current.high - current.low,
        Math.abs(current.high - previous.close),
        Math.abs(current.low - previous.close)
      );

      trueRanges.push(tr);
    }

    // Simple moving average degli ultimi `atrPeriod` true ranges
    const recentTRs = trueRanges.slice(-this.config.atrPeriod);
    const atr = recentTRs.reduce((sum, tr) => sum + tr, 0) / recentTRs.length;

    return atr;
  }

  /**
   * Determina le condizioni di mercato dai dati M15
   */
  analyzeMarketConditions(m15Candles: Array<{high: number; low: number; close: number; volume: number}>): MarketConditions {
    if (!m15Candles || m15Candles.length < 50) {
      return {
        volatility: 'neutral',
        trend: 'ranging',
        newsImpact: false,
        session: this.getCurrentSession()
      };
    }

    const recent = m15Candles.slice(-20);
    const older = m15Candles.slice(-50, -20);

    // Analisi volatilità
    const recentRanges = recent.map(c => c.high - c.low);
    const olderRanges = older.map(c => c.high - c.low);
    const avgRecentRange = recentRanges.reduce((sum, r) => sum + r, 0) / recentRanges.length;
    const avgOlderRange = olderRanges.reduce((sum, r) => sum + r, 0) / olderRanges.length;

    let volatility: 'low' | 'neutral' | 'high';
    const volatilityRatio = avgRecentRange / avgOlderRange;
    if (volatilityRatio > 1.3) volatility = 'high';
    else if (volatilityRatio < 0.7) volatility = 'low';
    else volatility = 'neutral';

    // Analisi trend
    const firstClose = recent[0].close;
    const lastClose = recent[recent.length - 1].close;
    const priceChange = Math.abs(lastClose - firstClose) / firstClose;

    const trend: 'ranging' | 'trending' = priceChange > 0.005 ? 'trending' : 'ranging';

    return {
      volatility,
      trend,
      newsImpact: false, // Da implementare con calendar API
      session: this.getCurrentSession()
    };
  }

  /**
   * Seleziona il coefficiente ottimale basato sulle condizioni di mercato
   */
  selectOptimalCoefficient(conditions: MarketConditions): number {
    let coefficient = this.config.baseCoefficient;

    // Applica i moltiplicatori basati sulle condizioni
    switch (conditions.volatility) {
      case 'high':
        coefficient *= this.config.coefficients.highVolatility;
        break;
      case 'low':
        coefficient *= this.config.coefficients.lowVolatility;
        break;
      default:
        coefficient *= this.config.coefficients.neutral;
    }

    switch (conditions.trend) {
      case 'trending':
        coefficient *= this.config.coefficients.trending;
        break;
      case 'ranging':
        coefficient *= this.config.coefficients.ranging;
        break;
    }

    if (conditions.newsImpact) {
      coefficient *= this.config.coefficients.newsImpact;
    }

    // Applica limiti min/max
    return Math.max(
      this.config.minCoefficient,
      Math.min(this.config.maxCoefficient, coefficient)
    );
  }

  /**
   * Calcola lo stop loss usando il sistema semplificato
   */
  calculateStopLoss(
    entryPrice: number,
    direction: 'BUY' | 'SELL',
    m15Candles: Array<{high: number; low: number; close: number; volume?: number}>
  ): {
    stopLoss: number;
    atr: number;
    coefficient: number;
    reasoning: string;
    marketConditions: MarketConditions;
  } {
    // 1. Calcola ATR M15
    const atr = this.calculateM15ATR(m15Candles);

    // 2. Analizza condizioni di mercato
    const marketConditions = this.analyzeMarketConditions(m15Candles as Array<{close: number; high: number; low: number; volume: number}>);

    // 3. Seleziona coefficiente ottimale
    const coefficient = this.selectOptimalCoefficient(marketConditions);

    // 4. Calcola distanza stop loss
    let stopDistance = atr * coefficient;

    // 5. Applica limiti percentuali minimi/massimi
    const minDistance = entryPrice * this.config.minStopDistance;
    const maxDistance = entryPrice * this.config.maxStopDistance;

    stopDistance = Math.max(minDistance, Math.min(maxDistance, stopDistance));

    // 6. Calcola prezzo stop loss
    const stopLoss = direction === 'BUY'
      ? entryPrice - stopDistance
      : entryPrice + stopDistance;

    // 7. Genera spiegazione
    const reasoning = this.generateReasoning(atr, coefficient, marketConditions);

    return {
      stopLoss,
      atr,
      coefficient,
      reasoning,
      marketConditions
    };
  }

  /**
   * Calcola take profit usando RR ratio ottimale
   */
  calculateTakeProfit(
    entryPrice: number,
    stopLoss: number,
    direction: 'BUY' | 'SELL',
    targetRR: number = 2.0
  ): {
    takeProfit: number;
    riskReward: number;
    reasoning: string;
  } {
    const risk = Math.abs(entryPrice - stopLoss);
    const reward = risk * targetRR;

    const takeProfit = direction === 'BUY'
      ? entryPrice + reward
      : entryPrice - reward;

    const riskReward = reward / risk;

    return {
      takeProfit,
      riskReward,
      reasoning: `Take profit set at ${targetRR}:1 Risk/Reward ratio based on ATR calculation`
    };
  }

  /**
   * Aggiunge dati per ottimizzazione ML
   */
  addOptimizationData(data: Omit<ATROptimizationData, 'timestamp'>): void {
    this.optimizationHistory.push({
      ...data,
      timestamp: new Date()
    });

    // Mantiene solo gli ultimi 1000 record per performance
    if (this.optimizationHistory.length > 1000) {
      this.optimizationHistory = this.optimizationHistory.slice(-1000);
    }
  }

  /**
   * Ottimizza i coefficienti basandosi sui dati storici
   */
  optimizeCoefficients(): ATROptimizationResult {
    if (this.optimizationHistory.length < 50) {
      return {
        recommendedCoefficient: this.config.baseCoefficient,
        confidence: 0,
        reasoning: 'Insufficient data for ML optimization',
        historicalPerformance: {
          winRate: 0,
          avgRR: 0,
          profitFactor: 0,
          tradesAnalyzed: 0
        }
      };
    }

    // Analizza performance per tipo di condizione
    const performanceByCondition = this.analyzePerformanceByCondition();

    // Calcola coefficienti ottimizzati
    const optimizedCoeffs = this.calculateOptimizedCoefficients(performanceByCondition);

    // Applica gradualmente i nuovi coefficienti (learning rate)
    this.applyOptimizedCoefficients(optimizedCoeffs);

    const overallPerformance = this.calculateOverallPerformance();

    return {
      recommendedCoefficient: this.config.baseCoefficient,
      confidence: Math.min(this.optimizationHistory.length / 100, 0.95),
      reasoning: `Coefficients optimized based on ${this.optimizationHistory.length} historical trades`,
      historicalPerformance: overallPerformance
    };
  }

  /**
   * Ottiene la sessione di trading corrente
   */
  private getCurrentSession(): MarketConditions['session'] {
    const hour = new Date().getUTCHours();

    if (hour >= 0 && hour < 7) return 'asian';
    if (hour >= 7 && hour < 12) return 'london';
    if (hour >= 12 && hour < 16) return 'overlap';
    if (hour >= 16 && hour < 21) return 'ny';
    return 'asian';
  }

  /**
   * Genera spiegazione del calcolo
   */
  private generateReasoning(
    atr: number,
    coefficient: number,
    conditions: MarketConditions
  ): string {
    const parts = [
      `M15 ATR: ${atr.toFixed(5)}`,
      `Coefficient: ${coefficient.toFixed(2)} (${conditions.volatility} volatility, ${conditions.trend} market)`
    ];

    if (conditions.newsImpact) {
      parts.push('News impact detected - widened stop');
    }

    parts.push(`Session: ${conditions.session}`);

    return parts.join(' | ');
  }

  /**
   * Analizza performance per condizione di mercato
   */
  private analyzePerformanceByCondition(): Record<string, {winRate: number; avgProfit: number; count: number; avgRR?: number; trades?: number}> {
    const analysis: Record<string, {winRate: number; avgProfit: number; count: number; avgRR?: number; trades?: number}> = {};

    // Raggruppa per condizione di volatilità
    ['low', 'neutral', 'high'].forEach(vol => {
      const trades = this.optimizationHistory.filter(d => d.marketConditions.volatility === vol);
      if (trades.length > 0) {
        const wins = trades.filter(t => t.outcome === 'win').length;
        const avgProfit = trades.reduce((sum, t) => sum + (t.outcome === 'win' ? t.riskReward : -1), 0) / trades.length;
        analysis[`volatility_${vol}`] = {
          winRate: wins / trades.length,
          avgProfit: avgProfit,
          count: trades.length,
          avgRR: trades.reduce((sum, t) => sum + t.riskReward, 0) / trades.length,
          trades: trades.length
        };
      }
    });

    return analysis;
  }

  /**
   * Calcola coefficienti ottimizzati
   */
  private calculateOptimizedCoefficients(performance: Record<string, {winRate: number; avgProfit: number}>): Partial<MLOptimizedATRConfig['coefficients']> {
    const optimized: Record<string, number> = {};

    // Esempio: se alta volatilità ha win rate basso, aumenta il coefficiente
    const highVolPerf = performance.volatility_high;
    if (highVolPerf && highVolPerf.winRate < 0.4) {
      optimized.highVolatility = this.config.coefficients.highVolatility * 1.1;
    }

    return optimized;
  }

  /**
   * Applica gradualmente i coefficienti ottimizzati
   */
  private applyOptimizedCoefficients(optimized: Partial<MLOptimizedATRConfig['coefficients']>): void {
    Object.entries(optimized).forEach(([key, newValue]) => {
      const currentValue = this.config.coefficients[key as keyof MLOptimizedATRConfig['coefficients']];
      const adjustedValue = currentValue + (newValue - currentValue) * this.config.learningRate;
      this.config.coefficients[key as keyof MLOptimizedATRConfig['coefficients']] = adjustedValue;
    });
  }

  /**
   * Calcola performance complessiva
   */
  private calculateOverallPerformance(): ATROptimizationResult['historicalPerformance'] {
    const trades = this.optimizationHistory;
    const wins = trades.filter(t => t.outcome === 'win');
    const losses = trades.filter(t => t.outcome === 'loss');

    const winRate = wins.length / trades.length;
    const avgRR = trades.reduce((sum, t) => sum + t.riskReward, 0) / trades.length;
    const totalProfit = wins.reduce((sum, t) => sum + t.profitLoss, 0);
    const totalLoss = Math.abs(losses.reduce((sum, t) => sum + t.profitLoss, 0));
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0;

    return {
      winRate,
      avgRR,
      profitFactor,
      tradesAnalyzed: trades.length
    };
  }

  /**
   * Getters e setters
   */
  getConfig(): MLOptimizedATRConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<MLOptimizedATRConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getOptimizationHistory(): ATROptimizationData[] {
    return [...this.optimizationHistory];
  }
}

// Export singleton instance
export const simplifiedATRCalculator = new SimplifiedATRCalculator();