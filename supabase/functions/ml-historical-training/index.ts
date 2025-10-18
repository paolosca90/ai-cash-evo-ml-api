import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// @ts-nocheck
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HistoricalSignal {
  signal_id: string;
  symbol: string;
  direction: string;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  entry_time: string;
  exit_time?: string;
  exit_price?: number;
  status: string;
  pnl_percent?: number;
  confidence: number;
  
  // Confluence flags
  confluence_volume: boolean;
  confluence_session: boolean;
  confluence_pullback: boolean;
  confluence_momentum: boolean;
  confluence_key_level: boolean;
  confluence_h1_confirm: boolean;
  confluence_ema_align: boolean;
  confluence_bb_signal: boolean;
  confluence_regime_align: boolean;
  confluence_pattern: boolean;
}

interface OptimizedWeights {
  weight_volume: number;
  weight_session: number;
  weight_pullback: number;
  weight_momentum: number;
  weight_key_level: number;
  weight_h1_confirm: number;
  weight_ema_align: number;
  weight_bb_signal: number;
  weight_regime_align: number;
  weight_pattern: number;
}

const DEFAULT_WEIGHTS: OptimizedWeights = {
  weight_volume: 5,
  weight_session: 8,
  weight_pullback: 12,
  weight_momentum: 10,
  weight_key_level: 8,
  weight_h1_confirm: 5,
  weight_ema_align: 25,
  weight_bb_signal: 18,
  weight_regime_align: 12,
  weight_pattern: 15
};
interface OptimizationPeriod {
  label: string;
  start: string;
  end: string;
}

interface CycleWindow {
  label: string;
  trainingStart: string;
  trainingEnd: string;
  testStart: string;
  testEnd: string;
}

const TRAINING_MONTHS = 3;
const TEST_MONTHS = 1;
const TOTAL_MONTHS = 24;
const MIN_PERIOD_SIGNALS = 25;
const CANDLE_STEP = 6;
const OANDA_MAX_DAYS_PER_REQUEST = 30;

const DEFAULT_TEST_PERIOD = { label: "", start: "", end: "" };

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function endOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));
}

function addMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formatMonth(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function buildCycleSchedule(): CycleWindow[] {
  const schedule: CycleWindow[] = [];
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const lastCompleteMonthStart = addMonths(currentMonthStart, -1);

  const cycleLength = TRAINING_MONTHS + TEST_MONTHS;
  const cycles = Math.max(1, Math.floor(TOTAL_MONTHS / cycleLength));

  let testStart = lastCompleteMonthStart;

  for (let i = 0; i < cycles; i++) {
    const trainingStart = addMonths(testStart, -TRAINING_MONTHS);
    const trainingEndDate = endOfMonth(addMonths(testStart, -1));
    const testEndDate = endOfMonth(testStart);

    schedule.push({
      label: `${formatMonth(trainingStart)}-${formatMonth(trainingEndDate)} → ${formatMonth(testStart)}`,
      trainingStart: formatDate(trainingStart),
      trainingEnd: formatDate(trainingEndDate),
      testStart: formatDate(testStart),
      testEnd: formatDate(testEndDate)
    });

    testStart = addMonths(trainingStart, -TEST_MONTHS);
  }

  return schedule.reverse();
}

function buildMonthlyPeriods(start: string, end: string): OptimizationPeriod[] {
  const periods: OptimizationPeriod[] = [];
  let cursor = startOfMonth(new Date(`${start}T00:00:00Z`));
  const endDate = new Date(`${end}T00:00:00Z`);

  while (cursor <= endDate) {
    const periodStart = startOfMonth(cursor);
    const periodEnd = endOfMonth(cursor);
    periods.push({
      label: formatMonth(cursor),
      start: formatDate(periodStart),
      end: formatDate(periodEnd),
    });
    cursor = addMonths(cursor, 1);
  }

  return periods;
}

const CYCLE_WINDOWS = buildCycleSchedule();
const ACTIVE_CYCLE = CYCLE_WINDOWS[CYCLE_WINDOWS.length - 1];
const OPTIMIZATION_PERIODS: OptimizationPeriod[] = ACTIVE_CYCLE
  ? buildMonthlyPeriods(ACTIVE_CYCLE.trainingStart, ACTIVE_CYCLE.trainingEnd)
  : [];
const TEST_PERIOD = ACTIVE_CYCLE
  ? {
      label: formatMonth(new Date(`${ACTIVE_CYCLE.testStart}T00:00:00Z`)),
      start: ACTIVE_CYCLE.testStart,
      end: ACTIVE_CYCLE.testEnd,
    }
  : DEFAULT_TEST_PERIOD;

/**
 * GRADIENT DESCENT OPTIMIZER
 * Ottimizza i pesi per massimizzare win_rate × sharpe_ratio
 */
function optimizeWeights(
  signals: HistoricalSignal[],
  initialWeights: OptimizedWeights,
  learningRate: number = 0.1,
  iterations: number = 100
): OptimizedWeights {
  
  const weights = { ...initialWeights };
  let bestWeights = { ...weights };
  let bestScore = calculatePerformanceScore(signals, weights);

  console.log(`Starting optimization with ${signals.length} signals`);
  console.log(`Initial score: ${bestScore.toFixed(4)}`);

  for (let iter = 0; iter < iterations; iter++) {
    // Calculate gradients for each weight
    const gradients: Partial<OptimizedWeights> = {};
    
    for (const weightKey of Object.keys(weights) as Array<keyof OptimizedWeights>) {
      const epsilon = 0.01;
      
      // Forward pass: weight + epsilon
      const weightsPlus = { ...weights, [weightKey]: weights[weightKey] + epsilon };
      const scorePlus = calculatePerformanceScore(signals, weightsPlus);
      
      // Backward pass: weight - epsilon
      const weightsMinus = { ...weights, [weightKey]: weights[weightKey] - epsilon };
      const scoreMinus = calculatePerformanceScore(signals, weightsMinus);
      
      // Gradient = (scorePlus - scoreMinus) / (2 * epsilon)
      gradients[weightKey] = (scorePlus - scoreMinus) / (2 * epsilon);
    }

    // Update weights using gradient ascent (maximize score)
    for (const weightKey of Object.keys(weights) as Array<keyof OptimizedWeights>) {
      weights[weightKey] += learningRate * (gradients[weightKey] || 0);
      
      // Constrain weights to reasonable ranges
      if (weightKey === 'weight_ema_align' || weightKey === 'weight_bb_signal') {
        weights[weightKey] = Math.max(10, Math.min(40, weights[weightKey]));
      } else {
        weights[weightKey] = Math.max(1, Math.min(25, weights[weightKey]));
      }
    }

    const currentScore = calculatePerformanceScore(signals, weights);
    
    if (currentScore > bestScore) {
      bestScore = currentScore;
      bestWeights = { ...weights };
      console.log(`Iteration ${iter + 1}: New best score ${bestScore.toFixed(4)}`);
    }

    // Decay learning rate
    if ((iter + 1) % 25 === 0) {
      learningRate *= 0.9;
    }
  }

  console.log(`Optimization complete. Best score: ${bestScore.toFixed(4)}`);
  return bestWeights;
}

/**
 * Calculate performance score: win_rate × sharpe_ratio
 */
function calculatePerformanceScore(
  signals: HistoricalSignal[],
  weights: OptimizedWeights
): number {
  
  // Recalculate confidence for each signal based on weights
  const recalculatedSignals = signals.map(signal => {
    let confidence = 0;
    
    if (signal.confluence_volume) confidence += weights.weight_volume;
    if (signal.confluence_session) confidence += weights.weight_session;
    if (signal.confluence_pullback) confidence += weights.weight_pullback;
    if (signal.confluence_momentum) confidence += weights.weight_momentum;
    if (signal.confluence_key_level) confidence += weights.weight_key_level;
    if (signal.confluence_h1_confirm) confidence += weights.weight_h1_confirm;
    if (signal.confluence_ema_align) confidence += weights.weight_ema_align;
    if (signal.confluence_bb_signal) confidence += weights.weight_bb_signal;
    if (signal.confluence_regime_align) confidence += weights.weight_regime_align;
    if (signal.confluence_pattern) confidence += weights.weight_pattern;
    
    return { ...signal, recalculatedConfidence: confidence };
  });

  // Filter signals with confidence >= 65 (our threshold)
  const qualifiedSignals = recalculatedSignals.filter(s => s.recalculatedConfidence >= 65);
  
  if (qualifiedSignals.length < 10) {
    return 0; // Not enough signals to evaluate
  }

  // Calculate win rate
  const wins = qualifiedSignals.filter(s => s.status === 'TP_HIT').length;
  const losses = qualifiedSignals.filter(s => s.status === 'SL_HIT').length;
  const total = wins + losses;
  
  if (total === 0) return 0;
  
  const winRate = wins / total;

  // Calculate Sharpe Ratio
  const returns = qualifiedSignals
    .filter(s => s.pnl_percent !== null && s.pnl_percent !== undefined)
    .map(s => s.pnl_percent!);
  
  if (returns.length < 5) return winRate; // Not enough data for Sharpe

  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  
  const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;

  // Performance score = win_rate × (1 + sharpe_ratio)
  // This balances high win rate with consistent returns
  const score = winRate * (1 + Math.max(0, sharpeRatio));
  
  return score;
}

/**
 * Fetch historical OHLCV data from OANDA API for specific date range
 */
interface OandaCandle {
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

async function fetchHistoricalData(
  symbol: string,
  startDate: string,
  endDate: string
): Promise<OandaCandle[]> {
  const apiKey = Deno.env.get("OANDA_API_KEY");
  const apiUrl = (Deno.env.get("OANDA_API_URL") ?? "https://api-fxpractice.oanda.com").replace(/\/$/, "");

  if (!apiKey) {
    console.error("❌ OANDA_API_KEY non configurata. Impossibile scaricare i dati.");
    return [];
  }

  const instrument = symbol.replace("/", "").length === 6
    ? `${symbol.slice(0, 3).toUpperCase()}_${symbol.slice(3).toUpperCase()}`
    : symbol.replace("/", "_").toUpperCase();

  const headers = {
    "Authorization": `Bearer ${apiKey}`,
    "Accept-Datetime-Format": "RFC3339",
  } satisfies Record<string, string>;

  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T23:59:59Z`);

  console.log(`📊 Fetching ${symbol} from ${startDate} to ${endDate} via OANDA...`);

  const aggregated: OandaCandle[] = [];
  let currentStart = new Date(start.getTime());

  while (currentStart <= end) {
    const segmentEnd = addDays(currentStart, OANDA_MAX_DAYS_PER_REQUEST - 1);
    const currentEnd = segmentEnd > end ? new Date(end.getTime()) : segmentEnd;

    const params = new URLSearchParams({
      price: "M",
      granularity: "M5",
      from: currentStart.toISOString(),
      to: currentEnd.toISOString(),
      includeFirst: "true",
    });

    const url = `${apiUrl}/v3/instruments/${instrument}/candles?${params.toString()}`;

    try {
      const response = await fetch(url, { headers });
      if (!response.ok) {
        const text = await response.text();
        console.error(`❌ OANDA API error for ${symbol}: ${response.status} ${text}`);
        break;
      }

      const data = await response.json();
      const candles = data.candles ?? [];

      if (candles.length === 0) {
        console.warn(`⚠️  No data returned for ${symbol} between ${formatDate(currentStart)} and ${formatDate(currentEnd)}`);
      } else {
        console.log(`   Segment ${formatDate(currentStart)} → ${formatDate(currentEnd)}: ${candles.length} candles`);
        for (const candle of candles) {
          if (!candle.complete) continue;
          const mid = candle.mid ?? {};
          aggregated.push({
            datetime: candle.time,
            open: Number(mid.o ?? mid.open ?? 0),
            high: Number(mid.h ?? mid.high ?? 0),
            low: Number(mid.l ?? mid.low ?? 0),
            close: Number(mid.c ?? mid.close ?? 0),
            volume: Number(candle.volume ?? 0),
          });
        }
      }
    } catch (error) {
      console.error(`❌ Error fetching data for ${symbol} (${formatDate(currentStart)} → ${formatDate(currentEnd)}):`, error);
      break;
    }

    currentStart = addDays(currentEnd, 1);
  }

  const deduplicated = Array.from(
    new Map(aggregated.map((candle) => [candle.datetime, candle])).values()
  ).sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());

  console.log(`✅ Aggregated ${deduplicated.length} candles for ${symbol}`);

  return deduplicated.map((candle) => ({
    datetime: candle.datetime,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
  }));
}

/**
 * Calculate technical indicators from price data
 */
function calculateIndicators(candles: OandaCandle[], index: number) {
  const close = candles[index].close;
  const high = candles[index].high;
  const low = candles[index].low;
  const volume = candles[index].volume || 0;

  // Get previous candles for calculations
  const closes = candles.slice(Math.max(0, index - 200), index + 1).map(c => c.close);
  const highs = candles.slice(Math.max(0, index - 200), index + 1).map(c => c.high);
  const lows = candles.slice(Math.max(0, index - 200), index + 1).map(c => c.low);
  const volumes = candles.slice(Math.max(0, index - 200), index + 1).map(c => c.volume || 0);

  // EMA calculation
  const ema50 = closes.length >= 50 ? closes.slice(-50).reduce((a, b) => a + b) / 50 : close;
  const ema200 = closes.length >= 200 ? closes.slice(-200).reduce((a, b) => a + b) / 200 : close;

  // Bollinger Bands (20-period, 2 std dev)
  const bb20 = closes.slice(-20);
  const bbMid = bb20.reduce((a, b) => a + b) / bb20.length;
  const bbStd = Math.sqrt(bb20.reduce((sum, val) => sum + Math.pow(val - bbMid, 2), 0) / bb20.length);
  const bbUpper = bbMid + 2 * bbStd;
  const bbLower = bbMid - 2 * bbStd;

  // ATR (14-period)
  const atrPeriod = Math.min(14, highs.length - 1);
  let atr = 0;
  for (let i = 1; i < atrPeriod; i++) {
    const tr = Math.max(
      highs[highs.length - i] - lows[lows.length - i],
      Math.abs(highs[highs.length - i] - closes[closes.length - i - 1]),
      Math.abs(lows[lows.length - i] - closes[closes.length - i - 1])
    );
    atr += tr;
  }
  atr = atr / atrPeriod;

  // Volume analysis
  const avgVolume = volumes.slice(-20).reduce((a, b) => a + b) / Math.min(20, volumes.length);
  const volumeSpike = volume > avgVolume * 1.5;

  // Momentum
  const momentum = closes.length >= 10 ? close - closes[closes.length - 10] : 0;

  // Session detection (from timestamp)
  const hour = new Date(candles[index].datetime).getUTCHours();
  const isLondonSession = hour >= 7 && hour < 16;
  const isNYSession = hour >= 12 && hour < 21;
  const isPrimeSession = isLondonSession || isNYSession;

  return {
    close,
    high,
    low,
    volume,
    ema50,
    ema200,
    bbUpper,
    bbMid,
    bbLower,
    atr,
    volumeSpike,
    momentum,
    isPrimeSession,
    emaAlign: close > ema50 && ema50 > ema200,
    emaBearish: close < ema50 && ema50 < ema200,
    nearBBUpper: close > bbUpper * 0.98,
    nearBBLower: close < bbLower * 1.02,
    bbSqueeze: (bbUpper - bbLower) / bbMid < 0.02
  };
}

/**
 * Analyze a single candle and generate signal if conditions met
 */
function analyzeCandle(
  symbol: string,
  candles: OandaCandle[],
  index: number,
  weights: OptimizedWeights
): HistoricalSignal | null {
  
  if (index < 200) return null; // Need enough history for indicators

  const indicators = calculateIndicators(candles, index);
  const prevIndicators = calculateIndicators(candles, index - 1);

  let confidence = 0;
  let direction: 'BUY' | 'SELL' | null = null;

  // Confluence flags
  const confluenceFlags = {
    confluence_volume: false,
    confluence_session: false,
    confluence_pullback: false,
    confluence_momentum: false,
    confluence_key_level: false,
    confluence_h1_confirm: false,
    confluence_ema_align: false,
    confluence_bb_signal: false,
    confluence_regime_align: false,
    confluence_pattern: false
  };

  // 3. TREND ALIGNMENT CHECK (Multi-timeframe)
  // Calculate H1 trend from recent candles (last 12 candles = 1 hour on 5min)
  const h1Candles = candles.slice(Math.max(0, index - 12), index + 1);
  const h1Close = h1Candles.map(c => c.close);
  const h1Ema50 = h1Close.length >= 10 ? h1Close.slice(-10).reduce((a, b) => a + b) / 10 : indicators.close;
  const h1Trend = indicators.close > h1Ema50 ? 'BULLISH' : 'BEARISH';

  // Determine direction based on EMA alignment
  if (indicators.emaAlign && indicators.momentum > 0) {
    direction = 'BUY';
    
    // Check H1 alignment
    if (h1Trend === 'BEARISH') {
      // Counter-trend trade - reduce confidence by 30%
      confidence *= 0.7;
    } else {
      // With-trend trade - boost confidence by 20%
      confidence *= 1.2;
    }
  } else if (indicators.emaBearish && indicators.momentum < 0) {
    direction = 'SELL';
    
    // Check H1 alignment
    if (h1Trend === 'BULLISH') {
      // Counter-trend trade - reduce confidence by 30%
      confidence *= 0.7;
    } else {
      // With-trend trade - boost confidence by 20%
      confidence *= 1.2;
    }
  } else {
    return null; // No clear trend
  }

  // Volume confluence
  if (indicators.volumeSpike) {
    confidence += weights.weight_volume;
    confluenceFlags.confluence_volume = true;
  }

  // Session confluence
  if (indicators.isPrimeSession) {
    confidence += weights.weight_session;
    confluenceFlags.confluence_session = true;
  }

  // Pullback confluence (price near EMA50)
  const distanceToEma50 = Math.abs(indicators.close - indicators.ema50) / indicators.close;
  if (distanceToEma50 < 0.005) {
    confidence += weights.weight_pullback;
    confluenceFlags.confluence_pullback = true;
  }

  // Momentum confluence
  if (Math.abs(indicators.momentum) > indicators.atr * 2) {
    confidence += weights.weight_momentum;
    confluenceFlags.confluence_momentum = true;
  }

  // Key level confluence (near round numbers or BB bands)
  const roundNumber = Math.round(indicators.close * 100) / 100;
  if (Math.abs(indicators.close - roundNumber) / indicators.close < 0.0005) {
    confidence += weights.weight_key_level;
    confluenceFlags.confluence_key_level = true;
  }

  // H1 confirmation (check if H1 trend aligns - simplified)
  if ((direction === 'BUY' && indicators.momentum > 0) || 
      (direction === 'SELL' && indicators.momentum < 0)) {
    confidence += weights.weight_h1_confirm;
    confluenceFlags.confluence_h1_confirm = true;
  }

  // EMA alignment
  if ((direction === 'BUY' && indicators.emaAlign) ||
      (direction === 'SELL' && indicators.emaBearish)) {
    confidence += weights.weight_ema_align;
    confluenceFlags.confluence_ema_align = true;
  }

  // Bollinger Bands signal
  if ((direction === 'BUY' && indicators.nearBBLower) ||
      (direction === 'SELL' && indicators.nearBBUpper)) {
    confidence += weights.weight_bb_signal;
    confluenceFlags.confluence_bb_signal = true;
  }

  // Regime alignment (trending vs ranging)
  const isRanging = indicators.bbSqueeze;
  if (!isRanging) {
    confidence += weights.weight_regime_align;
    confluenceFlags.confluence_regime_align = true;
  }

  // Pattern confluence (engulfing, etc. - simplified)
  const prevClose = candles[index - 1].close;
  const prevOpen = candles[index - 1].open;
  const currClose = candles[index].close;
  const currOpen = candles[index].open;
  
  const bullishEngulfing = currClose > currOpen && prevClose < prevOpen && 
                           currClose > prevOpen && currOpen < prevClose;
  const bearishEngulfing = currClose < currOpen && prevClose > prevOpen &&
                           currClose < prevOpen && currOpen > prevClose;
  
  if ((direction === 'BUY' && bullishEngulfing) || 
      (direction === 'SELL' && bearishEngulfing)) {
    confidence += weights.weight_pattern;
    confluenceFlags.confluence_pattern = true;
  }

  // Only generate signal if confidence >= 65
  if (confidence < 65) return null;

  // Calculate SL/TP with ADAPTIVE logic
  const entryPrice = indicators.close;
  
  // 1. VOLATILITY-BASED ADAPTATION
  const volatilityRatio = indicators.atr / indicators.close;
  let slMultiplier = 1.0;
  let tpMultiplier = 2.0;
  
  if (volatilityRatio > 0.015) {
    // High volatility (>1.5%) - wider stops
    slMultiplier = 2.0;
    tpMultiplier = 3.0;
  } else if (volatilityRatio > 0.010) {
    // Medium volatility (1-1.5%)
    slMultiplier = 1.5;
    tpMultiplier = 2.5;
  } else {
    // Low volatility (<1%)
    slMultiplier = 1.0;
    tpMultiplier = 2.0;
  }
  
  // 2. SESSION-AWARE ADAPTATION
  const hour = new Date(candles[index].datetime).getUTCHours();
  
  if (hour >= 0 && hour < 7) {
    // Asian session (low volatility)
    slMultiplier *= 0.8;
    tpMultiplier *= 0.8;
  } else if (hour >= 12 && hour < 17) {
    // London/NY overlap (high volatility)
    slMultiplier *= 1.2;
    tpMultiplier *= 1.3;
  } else if (hour >= 7 && hour < 16) {
    // London session (medium volatility)
    slMultiplier *= 1.05;
    tpMultiplier *= 1.1;
  }
  
  let stopLoss: number;
  let takeProfit: number;
  
  if (direction === 'BUY') {
    stopLoss = entryPrice - (indicators.atr * slMultiplier);
    takeProfit = entryPrice + (indicators.atr * tpMultiplier);
  } else {
    stopLoss = entryPrice + (indicators.atr * slMultiplier);
    takeProfit = entryPrice - (indicators.atr * tpMultiplier);
  }

  // Simulate trade outcome by looking ahead with TRAILING STOP
  let status: 'TP_HIT' | 'SL_HIT' = 'SL_HIT';
  let pnl_percent = -1.5;
  let exitIndex = index + 1;
  
  let trailingActivated = false;
  let highestProfit = 0;
  let trailingStop = stopLoss;
  const tpDistance = Math.abs(takeProfit - entryPrice);

  // Look ahead up to 50 candles (4+ hours on 5min)
  for (let i = index + 1; i < Math.min(index + 50, candles.length); i++) {
    const futureHigh = candles[i].high;
    const futureLow = candles[i].low;
    const futureClose = candles[i].close;

    if (direction === 'BUY') {
      const currentProfit = futureClose - entryPrice;
      
      // Activate trailing after reaching 50% of TP
      if (!trailingActivated && currentProfit >= tpDistance * 0.5) {
        trailingActivated = true;
        highestProfit = currentProfit;
      }
      
      // Update trailing stop
      if (trailingActivated) {
        highestProfit = Math.max(highestProfit, futureHigh - entryPrice);
        trailingStop = entryPrice + (highestProfit * 0.5);
      }
      
      // Check SL hit
      if (futureLow <= (trailingActivated ? trailingStop : stopLoss)) {
        status = trailingActivated && trailingStop > entryPrice ? 'TP_HIT' : 'SL_HIT';
        const exitPrice = trailingActivated ? trailingStop : stopLoss;
        pnl_percent = ((exitPrice - entryPrice) / entryPrice) * 100;
        exitIndex = i;
        break;
      }
      
      // Check TP hit
      if (futureHigh >= takeProfit) {
        status = 'TP_HIT';
        pnl_percent = ((takeProfit - entryPrice) / entryPrice) * 100;
        exitIndex = i;
        break;
      }
    } else {
      const currentProfit = entryPrice - futureClose;
      
      // Activate trailing after reaching 50% of TP
      if (!trailingActivated && currentProfit >= tpDistance * 0.5) {
        trailingActivated = true;
        highestProfit = currentProfit;
      }
      
      // Update trailing stop
      if (trailingActivated) {
        highestProfit = Math.max(highestProfit, entryPrice - futureLow);
        trailingStop = entryPrice - (highestProfit * 0.5);
      }
      
      // Check SL hit
      if (futureHigh >= (trailingActivated ? trailingStop : stopLoss)) {
        status = trailingActivated && trailingStop < entryPrice ? 'TP_HIT' : 'SL_HIT';
        const exitPrice = trailingActivated ? trailingStop : stopLoss;
        pnl_percent = ((entryPrice - exitPrice) / entryPrice) * 100;
        exitIndex = i;
        break;
      }
      
      // Check TP hit
      if (futureLow <= takeProfit) {
        status = 'TP_HIT';
        pnl_percent = ((entryPrice - takeProfit) / entryPrice) * 100;
        exitIndex = i;
        break;
      }
    }
  }

  return {
    signal_id: crypto.randomUUID(),
    symbol,
    direction,
    entry_price: entryPrice,
    stop_loss: stopLoss,
    take_profit: takeProfit,
    entry_time: candles[index].datetime,
    exit_time: candles[exitIndex]?.datetime,
    exit_price: status === 'TP_HIT' ? takeProfit : stopLoss,
    status,
    pnl_percent,
    confidence,
    ...confluenceFlags
  };
}

/**
 * Generate historical signals by backtesting strategy on real data
 */
async function generateHistoricalSignals(
  symbol: string,
  startDate: string,
  endDate: string,
  weights: OptimizedWeights
): Promise<HistoricalSignal[]> {
  
  console.log(`\n========== Backtesting ${symbol} from ${startDate} to ${endDate} ==========`);
  
  // Fetch historical data for the specified period
  const candles = await fetchHistoricalData(symbol, startDate, endDate);
  
  if (candles.length < 300) {
    console.log(`Insufficient data for ${symbol}: ${candles.length} candles`);
    return [];
  }

  const signals: HistoricalSignal[] = [];

  // Analyze each candle (skip first 200 for indicator calculation)
  for (let i = 200; i < candles.length - 50; i += CANDLE_STEP) {
    const signal = analyzeCandle(symbol, candles, i, weights);
    if (signal) {
      signals.push(signal);
    }
  }

  const wins = signals.filter(s => s.status === 'TP_HIT').length;
  const total = signals.length;
  const winRate = total > 0 ? (wins / total * 100) : 0;
  
  console.log(`Generated ${total} signals for ${symbol}`);
  console.log(`Win rate: ${winRate.toFixed(2)}% (${wins}/${total})`);
  
  return signals;
}

/**
 * MAIN HANDLER
 */
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { 
      symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'GBPJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'XAUUSD'],
      learningRate = 0.1,
      iterations = 100
    } = await req.json().catch(() => ({}));

    const results = [];

    for (const symbol of symbols) {
      console.log(`\n========== Processing ${symbol} ==========`);
      console.log(`Optimization windows: ${OPTIMIZATION_PERIODS.map(p => `${p.start}→${p.end}`).join(', ')}`);
      console.log(`Test Period: ${TEST_PERIOD.start} to ${TEST_PERIOD.end}`);

      const periodSummaries: Array<{
        label: string;
        signals: number;
        baselineScore: number;
        optimizedScore: number;
        improvement: number;
        durationSeconds: number;
        status: 'SUCCESS' | 'SKIPPED';
      }> = [];

      let currentWeights: OptimizedWeights = { ...DEFAULT_WEIGHTS };
      let totalTrainingSignals = 0;
      let totalTrainingDuration = 0;
      let hasValidPeriod = false;

      for (const period of OPTIMIZATION_PERIODS) {
        console.log(`\n📚 OPTIMIZATION WINDOW ${period.label}: ${period.start} → ${period.end}`);
        const periodSignals = await generateHistoricalSignals(
          symbol,
          period.start,
          period.end,
          currentWeights
        );

        if (periodSignals.length < MIN_PERIOD_SIGNALS) {
          console.log(`   ⚠️  Insufficient data (${periodSignals.length} signals). Skipping period.`);
          periodSummaries.push({
            label: period.label,
            signals: periodSignals.length,
            baselineScore: 0,
            optimizedScore: 0,
            improvement: 0,
            durationSeconds: 0,
            status: 'SKIPPED'
          });
          continue;
        }

        hasValidPeriod = true;
        totalTrainingSignals += periodSignals.length;

        const baselineScore = calculatePerformanceScore(periodSignals, currentWeights);
        const periodStartTime = Date.now();

        const optimizedPeriodWeights = optimizeWeights(
          periodSignals,
          currentWeights,
          learningRate,
          iterations
        );

        const durationSeconds = (Date.now() - periodStartTime) / 1000;
        totalTrainingDuration += durationSeconds;

        const optimizedScore = calculatePerformanceScore(periodSignals, optimizedPeriodWeights);
        const improvement = baselineScore > 0
          ? ((optimizedScore - baselineScore) / baselineScore) * 100
          : 0;

        periodSummaries.push({
          label: period.label,
          signals: periodSignals.length,
          baselineScore,
          optimizedScore,
          improvement,
          durationSeconds,
          status: 'SUCCESS'
        });

        currentWeights = optimizedPeriodWeights;

        console.log(`   Signals: ${periodSignals.length}`);
        console.log(`   Score baseline/optimized: ${baselineScore.toFixed(4)} → ${optimizedScore.toFixed(4)} (Δ ${improvement.toFixed(2)}%)`);
        console.log(`   Duration: ${durationSeconds.toFixed(1)}s`);
      }

      if (!hasValidPeriod) {
        console.log(`No optimization periods produced enough signals for ${symbol}. Skipping testing.`);
        results.push({
          symbol,
          status: 'SKIPPED',
          reason: 'Insufficient signals across optimization periods',
          optimization: periodSummaries
        });
        continue;
      }

      const successfulPeriods = periodSummaries.filter(p => p.status === 'SUCCESS');
      const avgBaselineScore = successfulPeriods.reduce((sum, p) => sum + p.baselineScore, 0) / successfulPeriods.length;
      const avgOptimizedScore = successfulPeriods.reduce((sum, p) => sum + p.optimizedScore, 0) / successfulPeriods.length;
      const avgTrainingImprovement = avgBaselineScore > 0
        ? ((avgOptimizedScore - avgBaselineScore) / avgBaselineScore) * 100
        : 0;

      console.log(`\n🧪 TESTING ON ${TEST_PERIOD.label} DATA...`);

      const testSignalsBaseline = await generateHistoricalSignals(
        symbol,
        TEST_PERIOD.start,
        TEST_PERIOD.end,
        DEFAULT_WEIGHTS
      );

      const testSignalsOptimized = await generateHistoricalSignals(
        symbol,
        TEST_PERIOD.start,
        TEST_PERIOD.end,
        currentWeights
      );

      if (testSignalsBaseline.length < 10) {
        console.log(`Insufficient test data for ${symbol}`);
        results.push({
          symbol,
          status: 'PARTIAL',
          reason: 'Insufficient test data',
          optimization: periodSummaries,
          testSignals: testSignalsBaseline.length
        });
        continue;
      }

      const baselineTestWins = testSignalsBaseline.filter(s => s.status === 'TP_HIT').length;
      const baselineTestTotal = testSignalsBaseline.filter(s => s.status === 'TP_HIT' || s.status === 'SL_HIT').length;
      const baselineTestWinRate = baselineTestTotal > 0 ? baselineTestWins / baselineTestTotal : 0;

      const optimizedTestWins = testSignalsOptimized.filter(s => s.status === 'TP_HIT').length;
      const optimizedTestTotal = testSignalsOptimized.filter(s => s.status === 'TP_HIT' || s.status === 'SL_HIT').length;
      const optimizedTestWinRate = optimizedTestTotal > 0 ? optimizedTestWins / optimizedTestTotal : 0;

      const testImprovement = baselineTestWinRate > 0
        ? ((optimizedTestWinRate - baselineTestWinRate) / baselineTestWinRate) * 100
        : 0;

      console.log(`\n📈 ${TEST_PERIOD.label} TEST RESULTS:`);
      console.log(`   Baseline Win Rate: ${(baselineTestWinRate * 100).toFixed(2)}% (${baselineTestWins}/${baselineTestTotal})`);
      console.log(`   Optimized Win Rate: ${(optimizedTestWinRate * 100).toFixed(2)}% (${optimizedTestWins}/${optimizedTestTotal})`);
      console.log(`   Test Improvement: ${testImprovement.toFixed(2)}%`);

      const baselinePnL = testSignalsBaseline.reduce((sum, s) => sum + (s.pnl_percent || 0), 0);
      const optimizedPnL = testSignalsOptimized.reduce((sum, s) => sum + (s.pnl_percent || 0), 0);

      console.log(`   Baseline PnL: ${baselinePnL.toFixed(2)}%`);
      console.log(`   Optimized PnL: ${optimizedPnL.toFixed(2)}%`);

      const { error: insertError } = await supabaseClient
        .from('ml_weight_optimization')
        .upsert({
          symbol,
          session: 'ALL',
          regime: 'ALL',
          ...currentWeights,
          win_rate: optimizedTestWinRate,
          sharpe_ratio: avgOptimizedScore,
          samples_count: totalTrainingSignals,
          last_trained: new Date().toISOString(),
          training_context: `Multi-period optimization (${OPTIMIZATION_PERIODS.map(p => p.label).join(' + ')}) → Test ${TEST_PERIOD.label}`
        }, {
          onConflict: 'symbol,session,regime'
        });

      if (insertError) {
        console.error(`Error saving weights for ${symbol}:`, insertError);
      }

      await supabaseClient
        .from('ml_training_log')
        .insert({
          training_date: new Date().toISOString(),
          symbols_trained: [symbol],
          samples_used: totalTrainingSignals,
          win_rate_before: baselineTestWinRate,
          win_rate_after: optimizedTestWinRate,
          improvement_percentage: testImprovement,
          optimization_method: 'Gradient Descent - Multi-period historical optimization',
          training_duration_seconds: totalTrainingDuration
        });

      results.push({
        symbol,
        status: 'SUCCESS',
        optimization: periodSummaries,
        testing: {
          period: `${TEST_PERIOD.start} to ${TEST_PERIOD.end}`,
          signals: testSignalsBaseline.length,
          baselineWinRate: (baselineTestWinRate * 100).toFixed(2) + '%',
          optimizedWinRate: (optimizedTestWinRate * 100).toFixed(2) + '%',
          improvement: testImprovement.toFixed(2) + '%',
          baselinePnL: baselinePnL.toFixed(2) + '%',
          optimizedPnL: optimizedPnL.toFixed(2) + '%',
          pnlImprovement: (optimizedPnL - baselinePnL).toFixed(2) + '%'
        },
        avgTrainingImprovement: avgTrainingImprovement.toFixed(2) + '%',
        optimizedWeights: currentWeights
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Historical training and testing completed',
        methodology: 'Train on Jun-Aug 2025, Test on Sep 2025 (out-of-sample)',
        optimization_periods: OPTIMIZATION_PERIODS,
        test_period: TEST_PERIOD,
        results
      }, null, 2),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.error('Error in historical training:', error);
    return new Response(
      JSON.stringify({ 
        error: message,
        stack
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
