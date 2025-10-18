// @ts-nocheck
/**
 * Risk Management Types and Interfaces
 *
 * Comprehensive type definitions for professional trading risk management
 * including ATR-based calculations, position sizing, and portfolio protection.
 */

export interface ATRData {
  timeframe: string;
  value: number;
  timestamp: Date;
}

export interface MarketStructure {
  supportLevels: number[];
  resistanceLevels: number[];
  trend: 'uptrend' | 'downtrend' | 'sideways';
  volatility: 'low' | 'medium' | 'high';
}

export interface PositionSizeCalculation {
  lotSize: number;
  riskAmount: number;
  stopLossPips: number;
  pipValue: number;
  maxLotSize: number;
  minLotSize: number;
  suggestedLotSize: number;
}

export interface StopLossCalculation {
  price: number;
  pips: number;
  atrMultiplier: number;
  timeframe: string;
  atrValue: number;
  reasoning: string;
  marketStructureAdjusted: boolean;
  finalPrice: number;
}

export interface TakeProfitLevel {
  level: number;
  price: number;
  pips: number;
  riskRewardRatio: number;
  percentageOfPosition: number;
  reason: string;
}

export interface TakeProfitCalculation {
  levels: TakeProfitLevel[];
  primaryTP: number;
  averageRiskReward: number;
  minRiskReward: number;
  maxRiskReward: number;
  partialExitStrategy: boolean;
}

export interface TradeRiskParameters {
  accountBalance: number;
  riskPerTrade: number; // percentage
  maxPortfolioRisk: number; // percentage
  stopLossATRMultiplier: number;
  takeProfitRiskRewardRatio: number;
  maxDailyLoss: number;
  maxDrawdown: number;
  correlationLimit: number;
  usePartialExits: boolean;
  trailingStop: boolean;
  trailingStopATRMultiplier: number;
}

export interface RiskManagementResult {
  symbol: string;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  stopLoss: StopLossCalculation;
  takeProfit: TakeProfitCalculation;
  positionSize: PositionSizeCalculation;
  riskMetrics: RiskMetrics;
  validation: RiskValidation;
  recommendations: string[];
  timestamp: Date;
}

export interface RiskMetrics {
  riskAmount: number;
  riskPercentage: number;
  potentialReward: number;
  riskRewardRatio: number;
  winRateRequired: number;
  expectedValue: number;
  kellyCriterion: number;
  positionSizeKelly: number;
  correlationRisk: number;
  portfolioHeat: number;
}

export interface RiskValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  passesRiskManagement: boolean;
}

export interface PortfolioRisk {
  totalExposure: number;
  totalRisk: number;
  correlationMatrix: number[][];
  portfolioHeat: number;
  maxDrawdown: number;
  dailyLoss: number;
  weeklyLoss: number;
  monthlyLoss: number;
  riskBudgetUsed: number;
  recommendations: string[];
}

export interface ATRConfig {
  timeframes: string[];
  weights: Record<string, number>;
  smoothingPeriod: number;
  useMultiTimeframe: boolean;
  minATR: number;
  maxATR: number;
}

export interface RiskManagementConfig {
  atr: ATRConfig;
  defaultRiskPerTrade: number;
  maxRiskPerTrade: number;
  minRiskRewardRatio: number;
  defaultRiskRewardRatio: number;
  maxTradesPerDay: number;
  maxPositions: number;
  correlationThreshold: number;
  trailingConfig: {
    enabled: boolean;
    activationATR: number;
    stepATR: number;
    maxDistanceATR: number;
  };
  partialExits: {
    enabled: boolean;
    levels: number[];
    percentages: number[];
  };
}

export interface MarketData {
  symbol: string;
  bid: number;
  ask: number;
  spread: number;
  volume: number;
  timeframe: string;
  timestamp: Date;
  atrData: ATRData[];
  marketStructure: MarketStructure;
}

export interface AccountInfo {
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number;
  currency: string;
  leverage: number;
  hedgingAllowed: boolean;
}

export interface SymbolSpecs {
  symbol: string;
  digits: number;
  point: number;
  tickSize: number;
  tickValue: number;
  minLot: number;
  maxLot: number;
  lotStep: number;
  contractSize: number;
  currency: string;
  profitCurrency: string;
  marginCurrency: string;
}

export interface RiskAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  category: 'position_size' | 'stop_loss' | 'take_profit' | 'portfolio' | 'correlation';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  resolved: boolean;
  actionRequired: boolean;
  suggestedAction: string;
}

export interface RiskManagementStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  maxDrawdown: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  riskAdjustedReturn: number;
}

export interface BacktestResult {
  symbol: string;
  strategy: string;
  startDate: Date;
  endDate: Date;
  totalReturn: number;
  annualizedReturn: number;
  volatility: number;
  maxDrawdown: number;
  sharpeRatio: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  riskManagementStats: RiskManagementStats;
}

export interface RiskSettings {
  enabled: boolean;
  maxRiskPerTrade: number;
  maxPortfolioRisk: number;
  maxDailyLoss: number;
  maxDrawdown: number;
  correlationThreshold: number;
  useATR: boolean;
  atrMultiplier: number;
  riskRewardRatio: number;
  trailingStop: boolean;
  partialExits: boolean;
  alertsEnabled: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

export interface Position {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  volume: number;
  openPrice: number;
  currentPrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
  unrealizedPL: number;
  realizedPL: number;
  openTime: Date;
  closeTime: Date | null;
  duration: number;
  riskAmount: number;
  maxRisk: number;
  trailingStop: number | null;
  margin: number;
  commission: number;
  swap: number;
  comment: string;
}

export interface Order {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL' | 'BUY_LIMIT' | 'SELL_LIMIT' | 'BUY_STOP' | 'SELL_STOP';
  volume: number;
  price: number;
  stopLoss: number | null;
  takeProfit: number | null;
  expiration: Date | null;
  state: 'pending' | 'filled' | 'cancelled' | 'rejected';
  filledPrice: number | null;
  filledTime: Date | null;
  comment: string;
}

export interface TradingSession {
  session: 'asia' | 'london' | 'new_york' | 'sydney' | 'overlap';
  startTime: string;
  endTime: string;
  volatilityMultiplier: number;
  riskAdjustment: number;
  isActive: boolean;
}

export interface EconomicEvent {
  id: string;
  time: Date;
  currency: string;
  impact: 'low' | 'medium' | 'high';
  event: string;
  forecast: number | null;
  previous: number | null;
  actual: number | null;
  marketImpact: number;
}

export interface NewsRiskAdjustment {
  beforeEvent: number;
  duringEvent: number;
  afterEvent: number;
  impactMultiplier: number;
}

export interface LiquidityInfo {
  available: boolean;
  spreadMultiplier: number;
  volumeMultiplier: number;
  slippageMultiplier: number;
  lastUpdate: Date;
}

// Type guards
export function isRiskManagementResult(obj: unknown): obj is RiskManagementResult {
  return obj &&
    typeof obj.symbol === 'string' &&
    typeof obj.entryPrice === 'number' &&
    obj.stopLoss && obj.takeProfit && obj.positionSize &&
    obj.riskMetrics && obj.validation;
}

export function isValidTradeDirection(direction: string): direction is 'BUY' | 'SELL' {
  return direction === 'BUY' || direction === 'SELL';
}

export function isValidTimeframe(timeframe: string): boolean {
  const validTimeframes = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1', 'MN1'];
  return validTimeframes.includes(timeframe);
}

export function isAcceptableRisk(riskPercentage: number, maxRisk: number): boolean {
  return riskPercentage <= maxRisk;
}

export function hasValidRiskReward(riskRewardRatio: number, minRatio: number): boolean {
  return riskRewardRatio >= minRatio;
}

// Utility types
export type RiskLevel = 'low' | 'medium' | 'high' | 'extreme';
export type Timeframe = 'M1' | 'M5' | 'M15' | 'M30' | 'H1' | 'H4' | 'D1' | 'W1' | 'MN1';
export type TradeDirection = 'BUY' | 'SELL';
export type AlertType = 'warning' | 'error' | 'info';
export type AlertCategory = 'position_size' | 'stop_loss' | 'take_profit' | 'portfolio' | 'correlation';