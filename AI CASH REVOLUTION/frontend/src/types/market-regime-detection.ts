export interface TimeframeData {
  timeframe: string;
  data: MarketData[];
  indicators: TechnicalIndicators;
}

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
    position: number;
    width: number;
  };
  rsi?: {
    value: number;
    divergence: number;
  };
  macd?: {
    line: number;
    signal: number;
    histogram: number;
  };
  ema?: {
    short: number;
    medium: number;
    long: number;
  };
  adx?: {
    value: number;
    trend: 'uptrend' | 'downtrend' | 'sideways';
  };
}

export interface MarketRegime {
  trendDirection: 'strong_up' | 'moderate_up' | 'sideways' | 'moderate_down' | 'strong_down';
  volatilityState: 'low' | 'medium' | 'high' | 'extreme';
  momentumState: 'accelerating' | 'maintaining' | 'decelerating' | 'reversing';
  marketPhase: 'accumulation' | 'trend' | 'distribution';
  confidence: number;
  stability: number;
  lastUpdated: number;
}

export interface RegimeTransition {
  fromRegime: MarketRegime;
  toRegime: MarketRegime;
  probability: number;
  expectedDuration: number;
  triggerFactors: string[];
}

export interface AgentType {
  id: 'PPO' | 'CPPO' | 'DQN' | 'SAC' | 'TD3' | 'A2C' | 'FALLBACK';
  name: string;
  description: string;
  specialties: string[];
  riskProfile: 'conservative' | 'balanced' | 'aggressive';
  performanceMetrics: AgentPerformanceMetrics;
}

export interface AgentPerformanceMetrics {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  averageReturn: number;
  regimePerformance: Record<string, number>;
  stabilityScore: number;
  lastUpdated: number;
}

export interface AgentRecommendation {
  agent: AgentType;
  confidence: number;
  reasoning: string;
  expectedPerformance: number;
  riskAssessment: {
    level: number;
    factors: string[];
  };
  fallbackAgent?: AgentType;
}

export interface MultiTimeframeAnalysis {
  timeframes: string[];
  primaryRegime: MarketRegime;
  timeframeRegimes: Record<string, MarketRegime>;
  confluenceScore: number;
  strength: number;
  divergenceDetected: boolean;
}

export interface VolatilityAnalysis {
  currentLevel: 'low' | 'medium' | 'high' | 'extreme';
  atrNormalized: number;
  bollingerWidth: number;
  historicalVolatility: number;
  impliedVolatility?: number;
  regimeStability: number;
  transitionProbability: Record<string, number>;
}

export interface TrendAnalysis {
  direction: 'bullish' | 'bearish' | 'ranging';
  strength: number;
  sustainability: number;
  higherHighsHigherLows: boolean;
  lowerHighsLowerLows: boolean;
  pricePosition: number;
  volumeConfirmation: boolean;
}

export interface TradingEnvironment {
  symbol: string;
  currentTime: number;
  marketData: MarketData;
  regime: MarketRegime;
  volatility: VolatilityAnalysis;
  trend: TrendAnalysis;
  accountBalance: number;
  positionSize: number;
  riskParameters: RiskParameters;
}

export interface RiskParameters {
  maxPositionSize: number;
  maxDrawdown: number;
  stopLoss: number;
  takeProfit: number;
  riskPerTrade: number;
}

export interface AgentAction {
  agent: AgentType;
  action: 'buy' | 'sell' | 'hold';
  confidence: number;
  positionSize?: number;
  stopLoss?: number;
  takeProfit?: number;
  reasoning: string;
  timestamp: number;
}

export interface SystemConfiguration {
  analysisTimeframes: string[];
  regimeUpdateInterval: number;
  agentSelectionThreshold: number;
  fallbackMechanismEnabled: boolean;
  performanceTrackingEnabled: boolean;
  loggingEnabled: boolean;
  riskManagementEnabled: boolean;
}

export interface SystemMetrics {
  uptime: number;
  totalSignalsGenerated: number;
  successfulSignals: number;
  averageSignalConfidence: number;
  regimeTransitions: number;
  agentSwitches: number;
  currentDrawdown: number;
  peakBalance: number;
  systemHealth: 'excellent' | 'good' | 'warning' | 'critical';
}

export interface SystemLog {
  timestamp: number;
  level: 'info' | 'warning' | 'error' | 'debug';
  component: string;
  message: string;
  data?: unknown;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
  contribution: number;
  stability: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface MarketContext {
  overallSentiment: 'bullish' | 'bearish' | 'neutral';
  riskOnOff: 'risk_on' | 'risk_off' | 'neutral';
  marketLiquidity: 'high' | 'medium' | 'low';
  correlationWithBTC: number;
  institutionalActivity: 'high' | 'medium' | 'low';
}