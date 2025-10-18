// @ts-nocheck
/**
 * Data Labeler for ML Training
 * ON-DEMAND STRATEGY: Always labels BUY or SELL (never HOLD)
 * Confidence represents risk level, not trade/no-trade decision
 */

import { supabase } from '../../integrations/supabase/client';

export interface LabelConfig {
  lookAheadCandles: number; // How many candles to look ahead
  takeProfitPips: number; // TP in pips
  stopLossPips: number; // SL in pips
  useAdaptiveTP?: boolean; // Use ATR-based dynamic TP/SL
}

export interface CandleData {
  id: string;
  symbol: string;
  granularity: string;
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  // Technical indicators (computed separately)
  rsi?: number;
  macd?: number;
  macd_signal?: number;
  bb_upper?: number;
  bb_middle?: number;
  bb_lower?: number;
  atr?: number;
  adx?: number;
  ema_20?: number;
}

export interface TradeLabel {
  signal_type: 'BUY' | 'SELL' | 'HOLD';
  confidence: number; // 0-1
  expected_move_pips: number;
  outcome?: 'WIN' | 'LOSS' | 'BREAKEVEN';
  actual_pips?: number;
  hit_tp: boolean;
  hit_sl: boolean;
  bars_to_close: number | null;
}

export class DataLabeler {
  private readonly PIP_SIZES: Record<string, number> = {
    'EURUSD': 0.0001,
    'GBPUSD': 0.0001,
    'USDJPY': 0.01,
    'AUDUSD': 0.0001,
    'USDCAD': 0.0001,
    'NZDUSD': 0.0001
  };

  /**
   * Label a batch of candles
   */
  async labelBatch(
    batchId: string,
    config: LabelConfig
  ): Promise<{
    success: boolean;
    labeled: number;
    error?: string;
  }> {
    try {
      console.log('🏷️  Starting labeling process...');
      console.log(`   Batch ID: ${batchId}`);
      console.log(`   Look-ahead: ${config.lookAheadCandles} candles`);
      console.log(`   TP/SL: ${config.takeProfitPips}/${config.stopLossPips} pips\n`);

      // Get unlabeled candles from batch
      const candles = await this.getUnlabeledCandles(batchId);
      console.log(`📊 Found ${candles.length} unlabeled candles`);

      let labeledCount = 0;

      // Process in chunks to avoid memory issues
      const chunkSize = 1000;
      for (let i = 0; i < candles.length; i += chunkSize) {
        const chunk = candles.slice(i, i + chunkSize);
        
        for (const candle of chunk) {
          const label = await this.labelCandle(candle, config);
          await this.saveLabel(candle.id, label);
          labeledCount++;

          if (labeledCount % 100 === 0) {
            console.log(`   ✓ Labeled ${labeledCount}/${candles.length} candles`);
          }
        }
      }

      // Update batch
      await this.updateBatchProgress(batchId, labeledCount);

      console.log(`\n✅ Labeling completed! ${labeledCount} candles labeled`);

      return {
        success: true,
        labeled: labeledCount
      };

    } catch (error) {
      console.error('❌ Labeling failed:', error);
      return {
        success: false,
        labeled: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Label a single candle based on future price action
   * ON-DEMAND STRATEGY: Always returns BUY or SELL, never HOLD
   */
  private async labelCandle(
    candle: CandleData,
    config: LabelConfig
  ): Promise<TradeLabel> {
    // Get future candles
    const futureCandles = await this.getFutureCandles(
      candle.symbol,
      candle.granularity,
      candle.timestamp,
      config.lookAheadCandles
    );

    if (futureCandles.length === 0) {
      // Not enough future data - return neutral with low confidence
      return {
        signal_type: 'BUY', // Default direction
        confidence: 0.25, // Very low confidence
        expected_move_pips: 0,
        hit_tp: false,
        hit_sl: false,
        bars_to_close: null
      };
    }

    // Simulate BUY trade
    const buyResult = this.simulateTrade(
      'BUY',
      candle.close,
      futureCandles,
      config,
      this.getPipSize(candle.symbol)
    );

    // Simulate SELL trade
    const sellResult = this.simulateTrade(
      'SELL',
      candle.close,
      futureCandles,
      config,
      this.getPipSize(candle.symbol)
    );

    // ALWAYS choose a direction (never HOLD)
    // Choose direction with better outcome
    const chooseBuy = buyResult.pips > Math.abs(sellResult.pips);
    
    if (chooseBuy) {
      return {
        signal_type: 'BUY',
        confidence: this.calculateConfidence(
          buyResult.pips,
          Math.abs(sellResult.pips),
          buyResult.outcome,
          candle
        ),
        expected_move_pips: buyResult.pips,
        outcome: buyResult.outcome,
        actual_pips: buyResult.pips,
        hit_tp: buyResult.hit_tp,
        hit_sl: buyResult.hit_sl,
        bars_to_close: buyResult.bars_to_close
      };
    } else {
      return {
        signal_type: 'SELL',
        confidence: this.calculateConfidence(
          Math.abs(sellResult.pips),
          buyResult.pips,
          sellResult.outcome,
          candle
        ),
        expected_move_pips: Math.abs(sellResult.pips),
        outcome: sellResult.outcome,
        actual_pips: Math.abs(sellResult.pips),
        hit_tp: sellResult.hit_tp,
        hit_sl: sellResult.hit_sl,
        bars_to_close: sellResult.bars_to_close
      };
    }
  }

  /**
   * Simulate a trade on future candles
   */
  private simulateTrade(
    direction: 'BUY' | 'SELL',
    entryPrice: number,
    futureCandles: CandleData[],
    config: LabelConfig,
    pipSize: number
  ): {
    pips: number;
    outcome: 'WIN' | 'LOSS' | 'BREAKEVEN';
    hit_tp: boolean;
    hit_sl: boolean;
    bars_to_close: number;
  } {
    const tpPrice = direction === 'BUY'
      ? entryPrice + (config.takeProfitPips * pipSize)
      : entryPrice - (config.takeProfitPips * pipSize);

    const slPrice = direction === 'BUY'
      ? entryPrice - (config.stopLossPips * pipSize)
      : entryPrice + (config.stopLossPips * pipSize);

    let hit_tp = false;
    let hit_sl = false;
    let bars_to_close = futureCandles.length;

    // Simulate tick-by-tick execution
    for (let i = 0; i < futureCandles.length; i++) {
      const candle = futureCandles[i];

      if (direction === 'BUY') {
        // Check SL hit first (conservative)
        if (candle.low <= slPrice) {
          hit_sl = true;
          bars_to_close = i + 1;
          break;
        }
        // Check TP hit
        if (candle.high >= tpPrice) {
          hit_tp = true;
          bars_to_close = i + 1;
          break;
        }
      } else {
        // SELL
        // Check SL hit first
        if (candle.high >= slPrice) {
          hit_sl = true;
          bars_to_close = i + 1;
          break;
        }
        // Check TP hit
        if (candle.low <= tpPrice) {
          hit_tp = true;
          bars_to_close = i + 1;
          break;
        }
      }
    }

    // Calculate final outcome
    let finalPrice = futureCandles[futureCandles.length - 1].close;
    let pips: number;
    let outcome: 'WIN' | 'LOSS' | 'BREAKEVEN';

    if (hit_tp) {
      pips = config.takeProfitPips;
      outcome = 'WIN';
    } else if (hit_sl) {
      pips = -config.stopLossPips;
      outcome = 'LOSS';
    } else {
      // Close at last candle
      if (direction === 'BUY') {
        pips = (finalPrice - entryPrice) / pipSize;
      } else {
        pips = (entryPrice - finalPrice) / pipSize;
      }
      outcome = pips > 0 ? 'WIN' : pips < 0 ? 'LOSS' : 'BREAKEVEN';
    }

    return {
      pips,
      outcome,
      hit_tp,
      hit_sl,
      bars_to_close
    };
  }

  /**
   * Calculate confidence for ON-DEMAND system
   * Based on: pip advantage, win/loss outcome, and technical indicators
   */
  private calculateConfidence(
    winnerPips: number,
    loserPips: number,
    outcome: 'WIN' | 'LOSS' | 'BREAKEVEN',
    candle: CandleData
  ): number {
    // 1. Pip Advantage Score (0-1): How much better is winner vs loser
    const pipDiff = Math.abs(winnerPips - loserPips);
    const pipAdvantageScore = Math.min(1, pipDiff / 40); // 40 pips diff = max score
    
    // 2. Outcome Score (0-1): Did it actually win?
    const outcomeScore = outcome === 'WIN' ? 1.0 : outcome === 'LOSS' ? 0.2 : 0.5;
    
    // 3. Winner Quality Score (0-1): How many pips did winner make?
    const winnerQualityScore = Math.min(1, Math.abs(winnerPips) / 30); // 30 pips = max
    
    // 4. Technical Indicator Score (0-1): Alignment of indicators
    const technicalScore = this.calculateTechnicalScore(candle);
    
    // Weighted combination
    const finalScore = (
      pipAdvantageScore * 0.3 +    // 30%: pip difference matters
      outcomeScore * 0.35 +         // 35%: actual outcome is most important
      winnerQualityScore * 0.20 +   // 20%: absolute profit matters
      technicalScore * 0.15         // 15%: technical confirmation
    );
    
    // Convert to 0-1 scale with realistic distribution
    // Map [0-1] to [0.25-0.95] (never give 0% or 100%)
    return Math.max(0.25, Math.min(0.95, 0.25 + finalScore * 0.70));
  }

  /**
   * Calculate technical indicator alignment score
   */
  private calculateTechnicalScore(candle: CandleData): number {
    let score = 0.5; // Neutral baseline
    let count = 0;
    
    // RSI (overbought/oversold)
    if (candle.rsi) {
      if (candle.rsi < 30) score += 0.15; // Oversold = bullish
      else if (candle.rsi > 70) score -= 0.15; // Overbought = bearish
      count++;
    }
    
    // MACD (momentum)
    if (candle.macd && candle.macd_signal) {
      if (candle.macd > candle.macd_signal) score += 0.15; // Bullish crossover
      else score -= 0.15; // Bearish crossover
      count++;
    }
    
    // ADX (trend strength)
    if (candle.adx) {
      if (candle.adx > 25) score += 0.10; // Strong trend
      else score -= 0.10; // Weak trend
      count++;
    }
    
    // Bollinger Bands (volatility)
    if (candle.bb_upper && candle.bb_lower && candle.close) {
      const bbPosition = (candle.close - candle.bb_lower) / (candle.bb_upper - candle.bb_lower);
      if (bbPosition < 0.2) score += 0.10; // Near lower band = bullish
      else if (bbPosition > 0.8) score -= 0.10; // Near upper band = bearish
      count++;
    }
    
    // Normalize to 0-1
    return count > 0 ? Math.max(0, Math.min(1, score)) : 0.5;
  }

  /**
   * Get unlabeled candles from batch
   */
  private async getUnlabeledCandles(batchId: string): Promise<CandleData[]> {
    // Get batch info
    const { data: batch } = await supabase
      .from('ml_training_batches')
      .select('symbol, granularity, start_date, end_date')
      .eq('id', batchId)
      .single();

    if (!batch) throw new Error('Batch not found');

    const symbols = batch.symbol.split(',');
    const granularities = batch.granularity.split(',');

    // Query candles (use direct query since types not updated yet)
    const { data, error } = await supabase
      .from('ml_historical_candles' as any)
      .select('*')
      .in('symbol', symbols)
      .in('granularity', granularities)
      .eq('is_labeled', false)
      .gte('timestamp', batch.start_date)
      .lte('timestamp', batch.end_date)
      .order('timestamp', { ascending: true })
      .limit(10000);

    if (error) throw error;

    return (data as any[]).map(c => ({
      id: c.id,
      symbol: c.symbol,
      granularity: c.granularity,
      timestamp: new Date(c.timestamp),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
      rsi: c.rsi,
      macd: c.macd,
      macd_signal: c.macd_signal,
      bb_upper: c.bb_upper,
      bb_middle: c.bb_middle,
      bb_lower: c.bb_lower,
      atr: c.atr,
      adx: c.adx,
      ema_20: c.ema_20
    }));
  }

  /**
   * Get future candles for labeling
   */
  private async getFutureCandles(
    symbol: string,
    granularity: string,
    fromTimestamp: Date,
    count: number
  ): Promise<CandleData[]> {
    const { data, error } = await supabase
      .from('ml_historical_candles' as any)
      .select('*')
      .eq('symbol', symbol)
      .eq('granularity', granularity)
      .gt('timestamp', fromTimestamp.toISOString())
      .order('timestamp', { ascending: true })
      .limit(count);

    if (error) throw error;

    return (data as any[]).map(c => ({
      id: c.id,
      symbol: c.symbol,
      granularity: c.granularity,
      timestamp: new Date(c.timestamp),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume
    }));
  }

  /**
   * Save label to database
   */
  private async saveLabel(candleId: string, label: TradeLabel): Promise<void> {
    await supabase
      .from('ml_historical_candles' as any)
      .update({
        is_labeled: true,
        ml_label_signal: label.signal_type,
        ml_label_confidence: label.confidence,
        ml_expected_move_pips: label.expected_move_pips,
        ml_trade_outcome: label.outcome,
        ml_actual_pips: label.actual_pips,
        ml_hit_tp: label.hit_tp,
        ml_hit_sl: label.hit_sl,
        ml_bars_to_close: label.bars_to_close
      })
      .eq('id', candleId);
  }

  /**
   * Update batch progress
   */
  private async updateBatchProgress(batchId: string, labeledCount: number): Promise<void> {
    await supabase
      .from('ml_training_batches' as any)
      .update({
        labeled_candles: labeledCount
      })
      .eq('id', batchId);
  }

  /**
   * Get pip size for symbol
   */
  private getPipSize(symbol: string): number {
    return this.PIP_SIZES[symbol] || 0.0001;
  }

  /**
   * Get labeling statistics
   */
  async getLabelingStats(): Promise<{
    totalLabeled: number;
    buySignals: number;
    sellSignals: number;
    holdSignals: number;
    avgConfidence: number;
    winRate: number;
  }> {
    const { data, error } = await supabase
      .from('ml_historical_candles' as any)
      .select('ml_label_signal, ml_label_confidence, ml_trade_outcome')
      .eq('is_labeled', true);

    if (error || !data) {
      return {
        totalLabeled: 0,
        buySignals: 0,
        sellSignals: 0,
        holdSignals: 0,
        avgConfidence: 0,
        winRate: 0
      };
    }

    const candles = data as any[];
    const buySignals = candles.filter(c => c.ml_label_signal === 'BUY').length;
    const sellSignals = candles.filter(c => c.ml_label_signal === 'SELL').length;
    const holdSignals = candles.filter(c => c.ml_label_signal === 'HOLD').length;
    
    const avgConfidence = candles.reduce((sum, c) => sum + (c.ml_label_confidence || 0), 0) / candles.length;
    
    const tradesWithOutcome = candles.filter(c => c.ml_trade_outcome);
    const wins = tradesWithOutcome.filter(c => c.ml_trade_outcome === 'WIN').length;
    const winRate = tradesWithOutcome.length > 0 ? wins / tradesWithOutcome.length : 0;

    return {
      totalLabeled: candles.length,
      buySignals,
      sellSignals,
      holdSignals,
      avgConfidence,
      winRate
    };
  }
}
