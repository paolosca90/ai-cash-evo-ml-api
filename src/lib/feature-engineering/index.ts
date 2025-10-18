// @ts-nocheck
// Main export
export { UnifiedFeatureEngineer } from './UnifiedFeatureEngineer';

// Types
export type {
  NormalizedFeatureVector,
  FeatureWeight,
  FeatureImportanceResult,
  MarketRegime,
  UnifiedFeatureEngineerConfig
} from './UnifiedFeatureEngineer';

// Configuration helpers
export const defaultFeatureEngineeringConfig = {
  enableTechnicalIndicators: true,
  enableSessionFeatures: true,
  enableSmartMoneyFeatures: true,
  enableSentimentFeatures: true,
  enableRegimeFeatures: true,
  normalizeFeatures: true,
  featureImportanceThreshold: 0.05,
  maxHistoryLength: 100,
  smoothingFactor: 0.2
};

export const aggressiveFeatureEngineeringConfig = {
  ...defaultFeatureEngineeringConfig,
  featureImportanceThreshold: 0.1,
  maxHistoryLength: 200,
  smoothingFactor: 0.1
};

export const conservativeFeatureEngineeringConfig = {
  ...defaultFeatureEngineeringConfig,
  featureImportanceThreshold: 0.02,
  maxHistoryLength: 50,
  smoothingFactor: 0.3
};

// Utility functions
export const createFeatureEngineer = (config = defaultFeatureEngineeringConfig) => {
  return new UnifiedFeatureEngineer(config);
};

export const validateFeatureVector = (vector: Partial<NormalizedFeatureVector>): boolean => {
  return (
    vector &&
    Array.isArray(vector.technicalFeatures) &&
    Array.isArray(vector.sessionFeatures) &&
    Array.isArray(vector.smartMoneyFeatures) &&
    Array.isArray(vector.sentimentFeatures) &&
    Array.isArray(vector.regimeFeatures) &&
    Array.isArray(vector.marketContextFeatures) &&
    typeof vector.timestamp === 'number' &&
    typeof vector.symbol === 'string' &&
    typeof vector.timeframe === 'string'
  );
};

export const getFeatureVectorSize = (): number => {
  // 8 technical + 4 session + 4 smart money + 4 sentiment + 4 regime + 5 context = 29 features
  return 29;
};

export const getFeatureDescriptions = (): Record<string, string> => {
  return {
    // Technical features
    atr_normalized: 'Average True Range normalized by price',
    bollinger_position: 'Position relative to Bollinger Bands (0=lower, 1=upper)',
    bollinger_width: 'Bollinger Bands width normalized',
    rsi_value: 'Relative Strength Index normalized to 0-1',
    rsi_divergence: 'RSI divergence detection (-1 to 1)',
    macd_line: 'MACD line normalized',
    macd_signal: 'MACD signal line normalized',
    macd_histogram: 'MACD histogram normalized',

    // Session features
    london_session: 'London trading session active (0 or 1)',
    ny_session: 'New York trading session active (0 or 1)',
    asian_session: 'Asian trading session active (0 or 1)',
    session_overlap: 'Trading session overlap intensity',

    // Smart money features
    order_block_density: 'Density of order blocks near current price',
    fvg_density: 'Density of Fair Value Gaps near current price',
    liquidity_pool_pressure: 'Liquidity pool pressure (-1 to 1)',
    smart_money_confluence: 'Overall smart money confluence score',

    // Sentiment features
    sentiment_score: 'LLM sentiment score (-1 to 1)',
    sentiment_confidence: 'Sentiment analysis confidence (0-1)',
    risk_level: 'Risk assessment level (0-1)',
    market_fear_greed: 'Market fear/greed index normalized',

    // Regime features
    trend_strength: 'Market trend strength (-1 to 1)',
    volatility_regime: 'Volatility regime level (0-1)',
    momentum_state: 'Momentum state indicator',
    regime_stability: 'Market regime stability (0-1)',

    // Context features
    price_change: 'Normalized price change',
    range: 'Normalized price range',
    volume: 'Normalized trading volume',
    atr: 'Normalized ATR value',
    session_volatility: 'Session-specific volatility'
  };
};