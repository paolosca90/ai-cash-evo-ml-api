export interface MarketData {
  symbol: string;
  timeframe: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface TechnicalIndicators {
  atr?: {
    value: number;
    normalized: number;
  };
  bollingerBands?: {
    upper: number;
    middle: number;
    lower: number;
    position: number; // 0-1, where 0.5 is middle band
    width: number; // normalized width
  };
  rsi?: {
    value: number;
    divergence: number; // -1 to 1
  };
  macd?: {
    line: number;
    signal: number;
    histogram: number;
  };
}

export interface SmartMoneyConcepts {
  orderBlocks?: OrderBlock[];
  fairValueGaps?: FairValueGap[];
  liquidityPools?: LiquidityPool[];
}

export interface OrderBlock {
  id: string;
  price: number;
  type: 'buy' | 'sell';
  strength: number; // 0-1
  timestamp: number;
  timeframe: string;
}

export interface FairValueGap {
  id: string;
  high: number;
  low: number;
  type: 'bullish' | 'bearish';
  strength: number; // 0-1
  timestamp: number;
  timeframe: string;
}

export interface LiquidityPool {
  id: string;
  price: number;
  type: 'buy' | 'sell';
  size: number;
  timestamp: number;
  timeframe: string;
}

export interface LLMSignals {
  sentiment?: {
    score: number; // -1 to 1
    confidence: number; // 0-1
    label: 'bullish' | 'bearish' | 'neutral';
  };
  riskAssessment?: {
    level: number; // 0-1
    confidence: number; // 0-1
    factors: string[];
  };
  marketFearGreed?: {
    value: number; // 0-100
    classification: 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed';
  };
}

export interface SessionInfo {
  londonSession: boolean;
  nySession: boolean;
  asianSession: boolean;
  sessionOverlap: boolean;
  volatility: number; // 0-1
}

export interface MarketRegime {
  trendDirection: 'strong_up' | 'moderate_up' | 'sideways' | 'moderate_down' | 'strong_down';
  volatilityState: 'low' | 'normal' | 'high' | 'extreme';
  momentumState: 'accelerating' | 'maintaining' | 'decelerating' | 'reversing';
}