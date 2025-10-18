/**
 * SIGNAL WEIGHT CALCULATION
 * Calculates multi-factor weights for trading signals combining ML confidence,
 * technical quality, market conditions, and risk factors.
 *
 * Weight Range: 0-100 (higher = stronger signal)
 */

export interface WeightComponents {
  ml_confidence: number;
  technical_quality: number;
  market_conditions: number;
  mtf_confirmation: number;
  risk_factors: number;
}

export interface WeightResult {
  total_weight: number;
  components: WeightComponents;
  recommendation: 'STRONG_BUY' | 'BUY' | 'WEAK' | 'AVOID';
  position_size_multiplier: number;
}

export interface CandleData {
  symbol: string;
  granularity?: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  rsi?: number;
  ema12?: number;
  ema21?: number;
  ema50?: number;
  adx?: number;
  atr?: number;
}

export interface MultiTFSignal {
  granularity: string;
  label: string;
  label_confidence?: number;
}

export interface RiskMetrics {
  current_drawdown_pct?: number;
  symbol_win_rate?: number;
}

/**
 * Calculates comprehensive signal weights using multiple factors:
 * 1. ML Confidence (30%): Model prediction confidence
 * 2. Technical Quality (25%): Trend strength, momentum, volatility
 * 3. Market Conditions (20%): Range vs trend, liquidity, spread
 * 4. Multi-Timeframe Confirmation (15%): Agreement across timeframes
 * 5. Risk Factors (10%): Symbol volatility, drawdown, correlation
 */
export class SignalWeightCalculator {
  private weights = {
    ml_confidence: 0.30,
    technical_quality: 0.25,
    market_conditions: 0.20,
    mtf_confirmation: 0.15,
    risk_factors: 0.10
  };

  /**
   * Calculate comprehensive signal weight
   */
  calculateWeight(
    mlConfidence: number,  // 0-100
    signalDirection: 'BUY' | 'SELL',
    candleData: CandleData,
    multiTFSignals: MultiTFSignal[] = [],
    riskMetrics: RiskMetrics = {}
  ): WeightResult {
    // 1. ML Confidence Score (30%)
    const mlScore = this.scoreMLConfidence(mlConfidence);

    // 2. Technical Quality (25%)
    const techScore = this.scoreTechnicalQuality(candleData, signalDirection);

    // 3. Market Conditions (20%)
    const marketScore = this.scoreMarketConditions(candleData);

    // 4. Multi-Timeframe Confirmation (15%)
    const mtfScore = this.scoreMTFConfirmation(signalDirection, multiTFSignals);

    // 5. Risk Factors (10%)
    const riskScore = this.scoreRiskFactors(candleData.symbol, riskMetrics);

    // Calculate weighted total
    const totalWeight =
      mlScore * this.weights.ml_confidence +
      techScore * this.weights.technical_quality +
      marketScore * this.weights.market_conditions +
      mtfScore * this.weights.mtf_confirmation +
      riskScore * this.weights.risk_factors;

    // Determine recommendation
    const recommendation = this.getRecommendation(totalWeight);
    const positionMultiplier = this.getPositionMultiplier(totalWeight);

    return {
      total_weight: Math.round(totalWeight * 100) / 100,
      components: {
        ml_confidence: Math.round(mlScore * 100) / 100,
        technical_quality: Math.round(techScore * 100) / 100,
        market_conditions: Math.round(marketScore * 100) / 100,
        mtf_confirmation: Math.round(mtfScore * 100) / 100,
        risk_factors: Math.round(riskScore * 100) / 100
      },
      recommendation,
      position_size_multiplier: positionMultiplier
    };
  }

  /**
   * Score ML model confidence (0-100)
   * - Below 50: Poor (0-40 points)
   * - 50-70: Moderate (40-70 points)
   * - 70-85: Good (70-90 points)
   * - Above 85: Excellent (90-100 points)
   */
  private scoreMLConfidence(confidence: number): number {
    if (confidence < 50) {
      return confidence * 0.8;  // 0-40
    } else if (confidence < 70) {
      return 40 + (confidence - 50) * 1.5;  // 40-70
    } else if (confidence < 85) {
      return 70 + (confidence - 70) * 1.33;  // 70-90
    } else {
      return 90 + (confidence - 85) * 0.67;  // 90-100
    }
  }

  /**
   * Score technical indicator quality
   * Components:
   * - Trend alignment (RSI, EMA)
   * - Momentum (ADX)
   * - Volatility appropriateness
   */
  private scoreTechnicalQuality(candle: CandleData, direction: 'BUY' | 'SELL'): number {
    let score = 50.0;  // Neutral baseline

    const { rsi, ema12, ema21, adx } = candle;

    // RSI alignment (±15 points)
    if (rsi !== undefined) {
      if (direction === 'BUY') {
        if (rsi < 30) {
          score += 15;  // Oversold, strong buy
        } else if (rsi < 50) {
          score += 10;
        } else if (rsi > 70) {
          score -= 15;  // Overbought, risky buy
        }
      } else {  // SELL
        if (rsi > 70) {
          score += 15;  // Overbought, strong sell
        } else if (rsi > 50) {
          score += 10;
        } else if (rsi < 30) {
          score -= 15;  // Oversold, risky sell
        }
      }
    }

    // EMA trend alignment (±20 points)
    if (ema12 !== undefined && ema21 !== undefined) {
      const emaBullish = ema12 > ema21;
      if (direction === 'BUY' && emaBullish) {
        score += 20;
      } else if (direction === 'SELL' && !emaBullish) {
        score += 20;
      } else {
        score -= 10;  // Counter-trend
      }
    }

    // ADX momentum (±15 points)
    if (adx !== undefined) {
      if (adx > 25) {
        score += 15;  // Strong trend
      } else if (adx > 20) {
        score += 10;
      } else if (adx < 15) {
        score -= 10;  // Weak/choppy market
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Score market conditions favorability
   * - Volatility level
   * - Range vs trending
   * - Time of day (if available)
   */
  private scoreMarketConditions(candle: CandleData): number {
    let score = 50.0;

    const { high, low, close, granularity } = candle;

    // Calculate ATR-based volatility
    if (high && low && close) {
      const candleRange = high - low;
      const volatilityPct = close > 0 ? (candleRange / close) * 100 : 0;

      // Optimal volatility: 0.05-0.15% (not too tight, not too wild)
      if (volatilityPct >= 0.05 && volatilityPct <= 0.15) {
        score += 20;
      } else if (volatilityPct >= 0.03 && volatilityPct <= 0.20) {
        score += 10;
      } else if (volatilityPct > 0.30) {
        score -= 15;  // Too volatile
      } else if (volatilityPct < 0.02) {
        score -= 10;  // Too tight
      }
    }

    // Spread/liquidity proxy (granularity matters)
    if (granularity) {
      if (['M5', 'M15', 'H1'].includes(granularity)) {
        score += 15;  // Good liquidity timeframes
      } else if (granularity === 'M1') {
        score -= 5;  // Noisy
      } else if (granularity === 'H4') {
        score += 10;  // Less liquid but cleaner
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Score multi-timeframe confirmation
   * - Same direction on higher TF = bonus
   * - Conflicting signals = penalty
   */
  private scoreMTFConfirmation(
    direction: 'BUY' | 'SELL',
    multiTFSignals: MultiTFSignal[]
  ): number {
    if (!multiTFSignals || multiTFSignals.length === 0) {
      return 50.0;  // Neutral if no MTF data
    }

    let score = 50.0;

    // Count agreements
    const agreements = multiTFSignals.filter(s => s.label === direction).length;
    const disagreements = multiTFSignals.length - agreements;

    // Award points for confirmation
    score += agreements * 15;
    score -= disagreements * 10;

    // Bonus if higher timeframes agree
    const higherTFOrder = ['H4', 'H1', 'M15', 'M5', 'M1'];
    for (const signal of multiTFSignals) {
      const sigTF = signal.granularity;
      if (higherTFOrder.slice(0, 2).includes(sigTF) && signal.label === direction) {
        score += 10;  // Bonus for H4/H1 agreement
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Score risk-adjusted factors
   * - Symbol volatility
   * - Current drawdown
   * - Correlation exposure
   */
  private scoreRiskFactors(symbol: string, riskMetrics: RiskMetrics): number {
    let score = 50.0;

    // Symbol risk tiers
    const volatileSymbols = ['XAUUSD', 'GBPUSD'];
    const stableSymbols = ['EURUSD', 'USDCAD'];

    if (stableSymbols.includes(symbol)) {
      score += 20;
    } else if (volatileSymbols.includes(symbol)) {
      score += 5;  // Can trade but with caution
    }

    // Account for current drawdown (if provided)
    const drawdownPct = riskMetrics.current_drawdown_pct || 0;
    if (drawdownPct > 10) {
      score -= 20;  // High drawdown, reduce risk
    } else if (drawdownPct > 5) {
      score -= 10;
    }

    // Win rate on this symbol (if available)
    const symbolWinRate = riskMetrics.symbol_win_rate || 50;
    if (symbolWinRate > 60) {
      score += 15;
    } else if (symbolWinRate < 40) {
      score -= 15;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Determine trading recommendation based on total weight
   */
  private getRecommendation(totalWeight: number): 'STRONG_BUY' | 'BUY' | 'WEAK' | 'AVOID' {
    if (totalWeight >= 75) {
      return 'STRONG_BUY';
    } else if (totalWeight >= 60) {
      return 'BUY';
    } else if (totalWeight >= 40) {
      return 'WEAK';
    } else {
      return 'AVOID';
    }
  }

  /**
   * Calculate position size multiplier based on signal weight
   * Range: 0.25 - 2.0
   */
  private getPositionMultiplier(totalWeight: number): number {
    if (totalWeight >= 80) {
      return 2.0;  // Double size for very strong signals
    } else if (totalWeight >= 70) {
      return 1.5;
    } else if (totalWeight >= 60) {
      return 1.0;  // Normal size
    } else if (totalWeight >= 50) {
      return 0.75;
    } else if (totalWeight >= 40) {
      return 0.5;
    } else {
      return 0.25;  // Minimum size for weak signals
    }
  }
}

// Export singleton instance
export const signalWeightCalculator = new SignalWeightCalculator();
