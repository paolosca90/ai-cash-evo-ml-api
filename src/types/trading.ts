// @ts-nocheck
// Add these extended interfaces for MT5 system compatibility

export interface ExtendedMT5ExecutionResult {
  success: boolean;
  orderId?: number;
  positionId?: number;
  price?: number;
  volume?: number;
  error?: MT5Error;
  timestamp: Date;
  profit?: number;
  symbol?: string;
  total_commands?: number;
  successful_commands?: number;
  failed_commands?: number;
  overall_success?: boolean;
}

export interface ExtendedMT5Integration {
  initialize: () => Promise<void>;
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  executeTrade: (command: MT5Command) => Promise<MT5ExecutionResult>;
  getPosition: (symbol: string) => Promise<MT5Position | null>;
  getAllPositions: () => Promise<MT5Position[]>;
  getAccountInfo: () => Promise<MT5AccountInfo>;
  isConnected: () => boolean;
  executeTradeSignal: (signal: TradeSignalDataExtended) => Promise<ExtendedMT5ExecutionResult>;
  executeBatchSignals: (signals: TradeSignalDataExtended[]) => Promise<BatchExecutionResult>;
  closePosition: (userId: string, positionTicket: number, symbol: string, volume?: number) => Promise<ExtendedMT5ExecutionResult>;
  getTradingStatistics: (userId?: string) => Promise<TradingStatistics>;
  getAccountPositions: (userId: string) => Promise<PositionUpdate[]>;
  getSystemHealth: () => Promise<SystemHealthExtended>;
  updateRiskManagement: (settings: RiskManagementUpdate, userId?: string) => void;
  shutdown: () => Promise<void>;
  subscribeToTradeCallbacks: (callback: (callback: TradeCallbackExtended) => void) => string;
  subscribeToPositionUpdates: (callback: (update: PositionUpdate) => void) => string;
  subscribeToOrderUpdates: (callback: (update: OrderUpdate) => void) => string;
  subscribeToErrors: (callback: (error: MT5Error) => void) => string;
}

export interface TradeSignalDataExtended {
  id?: string;
  symbol: string;
  action: 'BUY' | 'SELL' | 'BUY_STOP' | 'SELL_STOP' | 'BUY_LIMIT' | 'SELL_LIMIT';
  lot_size: number;
  stop_loss?: number;
  take_profit?: number;
  confidence?: number;
  strategy?: string;
  timestamp: Date;
  user_id?: string;
}

export interface BatchExecutionResult {
  success: boolean;
  total_commands: number;
  successful_commands: number;
  failed_commands: number;
  overall_success: boolean;
  execution_time_ms: number;
  results?: ExtendedMT5ExecutionResult[];
}

export interface TradeCallbackExtended {
  request_id: string;
  account_id: string;
  success: boolean;
  order_ticket?: number;
  position_ticket?: number;
  execution_price?: number;
  executed_volume?: number;
  execution_time?: Date;
  error_code?: number;
  error_message?: string;
  broker_comment?: string;
  commission?: number;
  swap?: number;
  profit?: number;
  margin_used?: number;
  timestamp: Date;
  symbol?: string;
}

export interface SystemHealthExtended {
  overall_status: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    http_connection: boolean;
    websocket_connection: boolean;
    database: boolean;
    authentication: boolean;
    risk_management: boolean;
  };
  last_check: Date;
  issues: string[];
  recommendations: string[];
}

export interface RiskManagementUpdate {
  max_risk_per_trade?: number;
  max_daily_risk?: number;
  max_concurrent_trades?: number;
  max_positions_per_symbol?: number;
  use_dynamic_risk?: boolean;
  stop_loss_pips?: number;
  take_profit_pips?: number;
}

// Add the missing interfaces for MT5 command builder
export interface ExtendedMT5CommandBuilder {
  createBuyStopOrder: (
    accountId: string,
    symbol: string,
    lotSize: number,
    price: number,
    stopLoss?: number,
    takeProfit?: number,
    expiration?: Date,
    comment?: string
  ) => TradeSignalDataExtended;

  createSellLimitOrder: (
    accountId: string,
    symbol: string,
    lotSize: number,
    price: number,
    stopLoss?: number,
    takeProfit?: number,
    expiration?: Date,
    comment?: string
  ) => TradeSignalDataExtended;

  createOCOCommand: (
    accountId: string,
    symbol: string,
    buyStopPrice: number,
    sellStopPrice: number,
    lotSize: number,
    stopLoss?: number,
    takeProfit?: number,
    expiration?: Date
  ) => TradeSignalDataExtended;
}

// Add extended error handler interface
export interface ExtendedMT5ErrorHandler {
  registerErrorHandler: (type: string, handler: (error: MT5Error, context?: string) => void) => void;
  getErrorStatistics: () => ErrorStatistics;
  handleError: (error: MT5Error, context?: string) => void;
  logError: (error: MT5Error, context?: string) => void;
  retry: (operation: () => Promise<unknown>, maxRetries?: number) => Promise<unknown>;
  isRecoverable: (error: MT5Error) => boolean;
}

export interface ErrorStatistics {
  totalErrors: number;
  errorRate: number;
  recentErrors: MT5Error[];
}

export interface PositionUpdateExtended {
  position_ticket: number;
  symbol: string;
  type: 'BUY' | 'SELL';
  volume: number;
  open_price: number;
  current_price: number;
  unrealized_pnl: number;
}

export interface OrderUpdateExtended {
  order_ticket: number;
  state: 'FILLED' | 'PENDING' | 'CANCELLED' | 'EXECUTED' | 'REJECTED';
  symbol: string;
}

export interface AccountData {
  id: string;
  user_id: string;
  account_number: string;
  is_active: boolean;
  currency: string;
}

export interface ExportData {
  user_id: string;
  export_date: string;
  statistics: TradingStatistics;
  positions: PositionUpdate[];
  system_health: SystemHealthExtended;
  total_positions: number;
  account_summary: {
    total_trades: number;
    win_rate: number;
    net_profit: number;
    current_positions: number;
    current_unrealized_pnl: number;
  };
}

export interface AdvancedOrderData {
  type: 'BUY_STOP' | 'SELL_LIMIT' | 'OCO' | string;
  symbol: string;
  buy_stop_price?: number;
  sell_stop_price?: number;
  lot_size: number;
  stop_loss?: number;
  take_profit?: number;
  price?: number;
  expiration?: Date;
  comment?: string;
  user_id: string;
}

// Utility function to get extended MT5 Integration type
export type ExtendedMT5IntegrationType = ExtendedMT5Integration;

// Comprehensive TypeScript interfaces for AI Trading System
// Replaces all 'unknown' types with proper type definitions

// MT5 Integration Interfaces
export interface MT5Integration {
  initialize: () => Promise<void>;
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  executeTrade: (command: MT5Command) => Promise<MT5ExecutionResult>;
  getPosition: (symbol: string) => Promise<MT5Position | null>;
  getAllPositions: () => Promise<MT5Position[]>;
  getAccountInfo: () => Promise<MT5AccountInfo>;
  isConnected: () => boolean;
}

export interface MT5CommandBuilder {
  buildMarketOrder: (params: MarketOrderParams) => MT5Command;
  buildPendingOrder: (params: PendingOrderParams) => MT5Command;
  buildModifyOrder: (params: ModifyOrderParams) => MT5Command;
  buildCloseOrder: (params: CloseOrderParams) => MT5Command;
  validateCommand: (command: MT5Command) => boolean;
}

export interface MT5ErrorHandler {
  handleError: (error: MT5Error) => void;
  logError: (error: MT5Error, context?: string) => void;
  retry: (operation: () => Promise<unknown>, maxRetries?: number) => Promise<unknown>;
  isRecoverable: (error: MT5Error) => boolean;
}

export interface MT5Command {
  symbol: string;
  action: 'BUY' | 'SELL' | 'MODIFY' | 'CLOSE';
  volume: number;
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
  comment?: string;
  magicNumber?: number;
  expiration?: Date;
  type?: 'MARKET' | 'LIMIT' | 'STOP';
}

export interface MT5ExecutionResult {
  success: boolean;
  orderId?: number;
  positionId?: number;
  price?: number;
  volume?: number;
  error?: string;
  timestamp: Date;
}

export interface MT5Position {
  ticket: number;
  symbol: string;
  type: 'BUY' | 'SELL';
  volume: number;
  openPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  profit: number;
  swap: number;
  comment: string;
  magicNumber: number;
  openTime: Date;
}

export interface MT5AccountInfo {
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number;
  profit: number;
}

export interface MT5Error {
  code: number;
  message: string;
  type: 'CONNECTION' | 'EXECUTION' | 'AUTHENTICATION' | 'SYSTEM';
  timestamp: Date;
}

export interface MarketOrderParams {
  symbol: string;
  action: 'BUY' | 'SELL';
  volume: number;
  stopLoss?: number;
  takeProfit?: number;
  comment?: string;
}

export interface PendingOrderParams {
  symbol: string;
  type: 'LIMIT' | 'STOP';
  action: 'BUY' | 'SELL';
  volume: number;
  price: number;
  stopLoss?: number;
  takeProfit?: number;
  expiration?: Date;
  comment?: string;
}

export interface ModifyOrderParams {
  orderId: number;
  stopLoss?: number;
  takeProfit?: number;
  price?: number;
}

export interface CloseOrderParams {
  orderId: number;
  volume?: number;
}

export interface TradeSignalData {
  symbol: string;
  action: 'BUY' | 'SELL';
  volume: number;
  stopLoss?: number;
  takeProfit?: number;
  confidence: number;
  timestamp: Date;
}

// FinRL DeepSeek Interfaces
export interface MarketData {
  symbol: string;
  price: number;
  volume: number;
  timestamp: Date;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
}

export interface MarketState {
  symbol: string;
  price: number;
  volume: number;
  technicalIndicators: {
    rsi: number;
    macd: number;
    bollinger: number;
    atr: number;
  };
  sentiment: number;
  volatility: number;
  trend: 'UP' | 'DOWN' | 'SIDEWAYS';
}

export interface RLAction {
  action: 'BUY' | 'SELL' | 'HOLD' | 'PARTIAL_BUY' | 'PARTIAL_SELL';
  confidence: number;
  positionSize?: number;
  expectedReturn: number;
  risk: number;
}

export interface FinRLSignal {
  symbol: string;
  action: string;
  confidence: number;
  positionSize: number;
  expectedReturn: number;
  risk: number;
  algorithm: string;
  timestamp: Date;
}

export interface AISignal {
  id: string;
  symbol: string;
  type: "BUY" | "SELL" | "HOLD";
  confidence: number;
  price: number;
  timestamp: Date | string;
  reason: string;
  reasoning?: string; // Alias for reason for compatibility
  indicators: string[];
  aiModel: string;
  riskRewardRatio?: number;
  stopLoss?: number;
  takeProfit?: number;
  entryPrice?: number;
  timeFrame?: string;
  marketRegime?: string;
  mlMetadata?: {
    modelVersion: string;
    ensembleUsed?: boolean;
    mlAction?: string;
    mlConfidence?: number;
    uncertainty?: {
      epistemic: number;
      aleatoric: number;
      total: number;
    };
    constraints?: Array<{
      type: string;
      severity: string;
      message: string;
    }>;
  };
}

export interface MarketData {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  spread: number;
  volume: number;
  timestamp: Date | string;
  high24h: number;
  low24h: number;
  change24h: number;
  changePercent24h: number;
  marketCap?: number;
  circulatingSupply?: number;
}

export interface TechnicalIndicators {
  rsi: number;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
  sma: {
    sma20: number;
    sma50: number;
    sma200: number;
  };
  ema: {
    ema12: number;
    ema26: number;
    ema50: number;
  };
  stochastic: {
    k: number;
    d: number;
  };
  atr: number;
  adx: number;
  cci: number;
  williamsR: number;
}

export interface SmartMoneyAnalysis {
  choc: boolean; // Change of Character
  bos: boolean;  // Break of Structure
  liquiditySwept: boolean;
  institutionalBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  sessionBias: 'LONDON' | 'NEW_YORK' | 'ASIAN' | 'TOKYO' | 'SYDNEY';
  fairValueGap?: boolean;
  orderBlock?: boolean;
  premiumDiscount?: boolean;
  mitigation?: boolean;
}

export interface SessionData {
  initialBalance: { high: number; low: number };
  previousDayHigh: number;
  previousDayLow: number;
  previousWeekHigh?: number;
  previousWeekLow?: number;
  previousMonthHigh?: number;
  previousMonthLow?: number;
  currentTrend: 'BULLISH' | 'BEARISH' | 'RANGING';
  liquidityLevels: number[];
  sessionType?: 'LONDON_IB' | 'WALLSTREET_IB' | 'ASIAN_ESTIMATED' | 'TOKYO_SESSION' | 'SYDNEY_SESSION';
  sessionTime?: string;
  movingAverages?: {
    sma20: number;
    sma50: number;
    sma200: number;
    ema21: number;
    ema50: number;
  };
  maAlignment?: {
    trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    crossSignal: string;
    alignment: string;
    strength: string;
  };
}

export interface NewsAnalysis {
  sentiment: number; // -100 to +100
  impactScore: number; // 0 to 100
  relevantNews: NewsItem[];
  timeToNextNews: number; // minutes
  newsImpact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface NewsItem {
  title: string;
  description: string;
  publishedAt: Date | string;
  source: string;
  impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  category?: string;
  currency?: string;
}

export interface PatternRecognition {
  pattern: string;
  confidence: number;
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  timeframe: string;
  reliability: number;
  description: string;
}

export interface VolatilityAnalysis {
  currentVolatility: number;
  volatilityPercentile: number;
  volatilityRegime: 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREME';
  atrMultiple: number;
  expectedRange: {
    high: number;
    low: number;
  };
}

export interface RiskAnalysis {
  riskScore: number;
  maxPositionSize: number;
  recommendedStopLoss: number;
  recommendedTakeProfit: number;
  riskRewardRatio: number;
  accountRiskPercent: number;
  volatilityAdjusted: boolean;
}

export interface AISignalResponse {
  signal: AISignal;
  analysis: {
    technical: TechnicalIndicators;
    smartMoney: SmartMoneyAnalysis;
    session: SessionData;
    news: NewsAnalysis;
    patterns: PatternRecognition[];
    volatility: VolatilityAnalysis;
    risk: RiskAnalysis;
  };
  confidence: number;
  reasoning: string[];
  timestamp: Date | string;
}

export interface TradingStrategy {
  id: string;
  name: string;
  description: string;
  type: 'TREND_FOLLOWING' | 'MEAN_REVERSION' | 'BREAKOUT' | 'MOMENTUM' | 'ARBITRAGE';
  timeframe: string[];
  symbols: string[];
  riskPerTrade: number;
  maxConcurrentTrades: number;
  indicators: string[];
  parameters: Record<string, number | string | boolean>;
  performance: {
    totalTrades: number;
    winRate: number;
    profitFactor: number;
    sharpeRatio: number;
    maxDrawdown: number;
    netProfit: number;
  };
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface BacktestResult {
  id: string;
  strategyId: string;
  symbol: string;
  timeframe: string;
  startDate: Date | string;
  endDate: Date | string;
  initialBalance: number;
  finalBalance: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  maxDrawdownPeriod: number;
  calmarRatio: number;
  totalReturn: number;
  annualizedReturn: number;
  volatility: number;
  beta?: number;
  alpha?: number;
  trades: BacktestTrade[];
  equityCurve: EquityPoint[];
  drawdownCurve: DrawdownPoint[];
}

export interface BacktestTrade {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice: number;
  entryTime: Date | string;
  exitTime: Date | string;
  quantity: number;
  profitLoss: number;
  profitLossPercent: number;
  commission: number;
  slippage: number;
  duration: number; // in minutes
  maxAdverseExcursion: number;
  maxFavorableExcursion: number;
  exitReason: string;
  confidence?: number;
}

export interface EquityPoint {
  timestamp: Date | string;
  equity: number;
  balance: number;
  drawdown: number;
}

export interface DrawdownPoint {
  timestamp: Date | string;
  drawdown: number;
  peak: number;
  trough: number;
}

export interface OptimizationResult {
  parameterSet: Record<string, number | string | boolean>;
  performance: {
    totalTrades: number;
    winRate: number;
    profitFactor: number;
    sharpeRatio: number;
    maxDrawdown: number;
    netProfit: number;
  };
  robustnessScore: number;
  stabilityScore: number;
  rank: number;
}

export interface MLModel {
  id: string;
  name: string;
  type: 'CLASSIFICATION' | 'REGRESSION' | 'CLUSTERING' | 'ENSEMBLE';
  algorithm: string;
  version: string;
  trainingDate: Date | string;
  features: string[];
  target: string;
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  mse?: number;
  mae?: number;
  r2Score?: number;
  featureImportance?: FeatureImportance[];
  isActive: boolean;
  description: string;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
  direction: 'POSITIVE' | 'NEGATIVE';
}

export interface TrainingData {
  id: string;
  symbol: string;
  timeframe: string;
  startDate: Date | string;
  endDate: Date | string;
  features: Record<string, number[]>;
  targets: Record<string, number[]>;
  sampleCount: number;
  featureCount: number;
  qualityScore: number;
  isBalanced: boolean;
  splitRatio: {
    train: number;
    validation: number;
    test: number;
  };
}

export interface PredictionResult {
  id: string;
  modelId: string;
  symbol: string;
  timestamp: Date | string;
  prediction: number | string;
  confidence: number;
  features: Record<string, number>;
  actual?: number | string;
  accuracy?: number;
  horizon: number; // prediction horizon in minutes/hours/days
}

export interface APIError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date | string;
  retryable: boolean;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: APIError;
  timestamp: Date | string;
  requestId: string;
}

export interface WebSocketMessage {
  type: 'SIGNAL' | 'MARKET_DATA' | 'TRADE_UPDATE' | 'ERROR' | 'HEARTBEAT';
  payload: AISignal | MarketData | TradeUpdate | APIError | object;
  timestamp: Date | string;
  messageId: string;
  symbol?: string;
}

export interface TradeUpdate {
  id: string;
  symbol: string;
  status: 'PENDING' | 'EXECUTED' | 'CANCELLED' | 'REJECTED';
  direction: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  executedPrice?: number;
  timestamp: Date | string;
  orderId?: string;
  errorMessage?: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  defaultTimeframe: string;
  riskTolerance: 'LOW' | 'MEDIUM' | 'HIGH';
  notifications: {
    email: boolean;
    push: boolean;
    signals: boolean;
    trades: boolean;
    news: boolean;
  };
  dashboardLayout: string[];
  defaultSymbols: string[];
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: {
    monthly: number;
    yearly: number;
  };
  features: string[];
  limits: {
    signalsPerDay: number;
    strategies: number;
    backtests: number;
    apiCalls: number;
  };
  isActive: boolean;
  createdAt: Date | string;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'SUSPENDED';
  currentPeriodStart: Date | string;
  currentPeriodEnd: Date | string;
  cancelAtPeriodEnd: boolean;
  trialEnd?: Date | string;
  metadata?: Record<string, unknown>;
}

export interface UsageStatistics {
  signalsGenerated: number;
  signalsLimit: number;
  apiCallsMade: number;
  apiCallsLimit: number;
  backtestsRun: number;
  backtestsLimit: number;
  storageUsed: number;
  storageLimit: number;
  periodStart: Date | string;
  periodEnd: Date | string;
}

export interface SystemHealth {
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  components: {
    api: boolean;
    database: boolean;
    websocket: boolean;
    mlModels: boolean;
    marketData: boolean;
  };
  metrics: {
    uptime: number;
    responseTime: number;
    errorRate: number;
    throughput: number;
  };
  lastUpdate: Date | string;
}

// Utility types for common patterns
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Error handling types
export class TradingError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'TradingError';
  }
}

export class APIValidationError extends TradingError {
  constructor(
    message: string,
    public field: string,
    public value: unknown
  ) {
    super(message, 'VALIDATION_ERROR', { field, value });
    this.name = 'APIValidationError';
  }
}

export class RateLimitError extends TradingError {
  constructor(
    message: string,
    public retryAfter: number
  ) {
    super(message, 'RATE_LIMIT_ERROR', { retryAfter });
    this.name = 'RateLimitError';
  }
}

// Simulation data types
export interface SimulationDataPoint {
  timestamp: number;
  [key: string]: number | string;
}

// Type guards
export function isAISignal(obj: unknown): obj is AISignal {
  return typeof obj === 'object' && obj !== null &&
    'id' in obj && 'symbol' in obj && 'type' in obj &&
    'confidence' in obj && 'price' in obj;
}

export function isMarketData(obj: unknown): obj is MarketData {
  return typeof obj === 'object' && obj !== null &&
    'symbol' in obj && 'price' in obj && 'bid' in obj &&
    'ask' in obj && 'timestamp' in obj;
}

export function isAPIError(obj: unknown): obj is APIError {
  return typeof obj === 'object' && obj !== null &&
    'code' in obj && 'message' in obj && 'timestamp' in obj;
}