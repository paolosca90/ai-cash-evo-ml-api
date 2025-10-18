/**
 * SIGNAL WEIGHT CALCULATOR - Deno/Edge Function Version
 *
 * Calculates comprehensive signal weights using 5 components:
 * 1. ML Confidence (30%)
 * 2. Technical Quality (25%)
 * 3. Market Conditions (20%)
 * 4. Multi-Timeframe Confirmation (15%)
 * 5. Risk Factors (10%)
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

export interface SignalData {
  symbol: string;
  type: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;  // 0-100
  entry_price?: number;
  analysis?: {
    indicators?: {
      rsi?: number;
      ema12?: number;
      ema21?: number;
      adx?: number;
      atr?: number;
    };
    regime?: string;
    session?: string;
  };
}

const WEIGHTS = {
  ml_confidence: 0.30,
  technical_quality: 0.25,
  market_conditions: 0.20,
  mtf_confirmation: 0.15,
  risk_factors: 0.10
};

export function calculateSignalWeight(signal: SignalData): WeightResult {
  // 1. ML Confidence Score (30%)
  const mlScore = scoreMLConfidence(signal.confidence);

  // 2. Technical Quality (25%)
  const techScore = scoreTechnicalQuality(signal);

  // 3. Market Conditions (20%)
  const marketScore = scoreMarketConditions(signal);

  // 4. Multi-Timeframe Confirmation (15%)
  const mtfScore = 50.0; // Neutral (not implemented yet)

  // 5. Risk Factors (10%)
  const riskScore = scoreRiskFactors(signal.symbol);

  // Calculate weighted total
  const totalWeight =
    mlScore * WEIGHTS.ml_confidence +
    techScore * WEIGHTS.technical_quality +
    marketScore * WEIGHTS.market_conditions +
    mtfScore * WEIGHTS.mtf_confirmation +
    riskScore * WEIGHTS.risk_factors;

  // Determine recommendation
  const recommendation = getRecommendation(totalWeight);
  const positionMultiplier = getPositionMultiplier(totalWeight);

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

function scoreMLConfidence(confidence: number): number {
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

function scoreTechnicalQuality(signal: SignalData): number {
  let score = 50.0;  // Neutral baseline

  const indicators = signal.analysis?.indicators;
  if (!indicators) return score;

  const { rsi, ema12, ema21, adx } = indicators;
  const direction = signal.type;

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
    } else if (direction === 'SELL') {
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

function scoreMarketConditions(signal: SignalData): number {
  let score = 50.0;

  // Regime scoring
  const regime = signal.analysis?.regime;
  if (regime === 'TREND') {
    score += 20;  // Trend is good
  } else if (regime === 'RANGE') {
    score += 10;  // Range can work with mean reversion
  } else if (regime === 'UNCERTAIN') {
    score -= 10;  // Uncertainty is bad
  }

  // Session scoring
  const session = signal.analysis?.session;
  if (session === 'LONDON' || session === 'NY') {
    score += 15;  // High liquidity sessions
  } else if (session === 'OVERLAP') {
    score += 20;  // Best liquidity
  } else if (session === 'ASIAN') {
    score += 5;  // Lower liquidity
  }

  // ATR volatility check
  const atr = signal.analysis?.indicators?.atr;
  const price = signal.entry_price || 1;
  if (atr && price) {
    const atrPercent = (atr / price) * 100;
    if (atrPercent >= 0.05 && atrPercent <= 0.15) {
      score += 15;  // Optimal volatility
    } else if (atrPercent > 0.30) {
      score -= 15;  // Too volatile
    } else if (atrPercent < 0.02) {
      score -= 10;  // Too tight
    }
  }

  return Math.max(0, Math.min(100, score));
}

function scoreRiskFactors(symbol: string): number {
  let score = 50.0;

  // Symbol risk tiers
  const volatileSymbols = ['XAUUSD', 'GBPUSD'];
  const stableSymbols = ['EURUSD', 'USDCAD'];

  if (stableSymbols.includes(symbol)) {
    score += 20;
  } else if (volatileSymbols.includes(symbol)) {
    score += 5;  // Can trade but with caution
  }

  return Math.max(0, Math.min(100, score));
}

function getRecommendation(totalWeight: number): 'STRONG_BUY' | 'BUY' | 'WEAK' | 'AVOID' {
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

function getPositionMultiplier(totalWeight: number): number {
  if (totalWeight >= 80) {
    return 2.0;
  } else if (totalWeight >= 70) {
    return 1.5;
  } else if (totalWeight >= 60) {
    return 1.0;
  } else if (totalWeight >= 50) {
    return 0.75;
  } else if (totalWeight >= 40) {
    return 0.5;
  } else {
    return 0.25;
  }
}
