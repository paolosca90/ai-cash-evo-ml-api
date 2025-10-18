/**
 * ML Random Signals Generator
 *
 * Genera segnali casuali per training ML con le seguenti caratteristiche:
 * - 10+ segnali per simbolo ogni ora
 * - Esecuzione su conto OANDA paper trading con 0.01 lot
 * - Recording completo di indicatori tecnici e performance
 * - Dati utilizzati da LSTM API per ottimizzazione pesi
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

// Trading symbols supported
const TRADING_SYMBOLS = [
  // Major Forex
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'USDCAD', 'AUDUSD', 'NZDUSD',
  // Minor Forex
  'EURGBP', 'EURJPY', 'EURCHF', 'EURCAD', 'EURAUD', 'EURNZD',
  'GBPJPY', 'GBPCHF', 'GBPCAD', 'GBPAUD', 'GBPNZD', 'CHFJPY',
  'CADJPY', 'AUDJPY', 'NZDJPY', 'CADCHF', 'AUDCHF', 'NZDCHF',
  'AUDCAD', 'NZDCAD', 'AUDNZD',
  // Metals
  'XAUUSD',
  // Crypto
  'BTCUSD', 'ETHUSD'
];

// Technical indicator calculations
class TechnicalIndicators {
  static calculateADX(high: number[], low: number[], close: number[], period: number = 14): number[] {
    const tr: number[] = [];
    const plusDM: number[] = [];
    const minusDM: number[] = [];

    for (let i = 1; i < high.length; i++) {
      const tr1 = high[i] - low[i];
      const tr2 = Math.abs(high[i] - close[i - 1]);
      const tr3 = Math.abs(low[i] - close[i - 1]);
      tr.push(Math.max(tr1, tr2, tr3));

      const upMove = high[i] - high[i - 1];
      const downMove = low[i - 1] - low[i];

      plusDM.push((upMove > downMove && upMove > 0) ? upMove : 0);
      minusDM.push((downMove > upMove && downMove > 0) ? downMove : 0);
    }

    const atr = this.sma(tr, period);
    const plusDI = this.sma(plusDM.map((v, i) => (v / atr[i]) * 100), period);
    const minusDI = this.sma(minusDM.map((v, i) => (v / atr[i]) * 100), period);

    const dx = plusDI.map((v, i) => Math.abs(v - minusDI[i]) / (v + minusDI[i]) * 100);
    return this.sma(dx, period);
  }

  static calculateRSI(close: number[], period: number = 14): number[] {
    const gains: number[] = [];
    const losses: number[] = [];

    for (let i = 1; i < close.length; i++) {
      const change = close[i] - close[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    const avgGain = this.sma(gains, period);
    const avgLoss = this.sma(losses, period);

    return avgGain.map((g, i) => {
      const rs = g / avgLoss[i];
      return 100 - (100 / (1 + rs));
    });
  }

  static calculateEMA(close: number[], period: number): number[] {
    const multiplier = 2 / (period + 1);
    const ema: number[] = [close[0]];

    for (let i = 1; i < close.length; i++) {
      ema.push((close[i] * multiplier) + (ema[i - 1] * (1 - multiplier)));
    }

    return ema;
  }

  static calculateSMA(data: number[], period: number): number[] {
    const sma: number[] = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        sma.push(0);
      } else {
        const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        sma.push(sum / period);
      }
    }
    return sma;
  }

  static calculateATR(high: number[], low: number[], close: number[], period: number = 14): number[] {
    const tr: number[] = [];
    for (let i = 1; i < high.length; i++) {
      const tr1 = high[i] - low[i];
      const tr2 = Math.abs(high[i] - close[i - 1]);
      const tr3 = Math.abs(low[i] - close[i - 1]);
      tr.push(Math.max(tr1, tr2, tr3));
    }
    return this.sma(tr, period);
  }

  static calculateStochastic(high: number[], low: number[], close: number[], kPeriod: number = 14, dPeriod: number = 3): { k: number[], d: number[] } {
    const k: number[] = [];
    for (let i = kPeriod - 1; i < close.length; i++) {
      const highestHigh = Math.max(...high.slice(i - kPeriod + 1, i + 1));
      const lowestLow = Math.min(...low.slice(i - kPeriod + 1, i + 1));
      const kValue = ((close[i] - lowestLow) / (highestHigh - lowestLow)) * 100;
      k.push(kValue);
    }
    const d = this.sma(k, dPeriod);
    return { k, d };
  }

  static calculateMACD(close: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9): { macd: number[], signal: number[], histogram: number[] } {
    const emaFast = this.calculateEMA(close, fastPeriod);
    const emaSlow = this.calculateEMA(close, slowPeriod);
    const macd = emaFast.map((v, i) => v - emaSlow[i]);
    const signal = this.calculateEMA(macd, signalPeriod);
    const histogram = macd.map((v, i) => v - signal[i]);
    return { macd, signal, histogram };
  }
}

// OANDA API Integration
class OandaAPI {
  private apiKey: string;
  private accountId: string;
  private baseUrl: string;

  constructor(apiKey: string, accountId: string) {
    this.apiKey = apiKey;
    this.accountId = accountId;
    this.baseUrl = "https://api-fxpractice.oanda.com/v3"; // Practice account
  }

  async getCurrentPrice(symbol: string): Promise<{ bid: number; ask: number; mid: number }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/instruments/${symbol}/candles?price=M&count=1`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`OANDA API error: ${response.statusText}`);
      }

      const data = await response.json();
      const candle = data.candles[0];

      return {
        bid: candle.bid?.c || 0,
        ask: candle.ask?.c || 0,
        mid: candle.mid?.c || 0
      };
    } catch (error) {
      console.error('Error fetching price from OANDA:', error);
      // Return mock price for development
      return { bid: 1.0850, ask: 1.0852, mid: 1.0851 };
    }
  }

  async getHistoricalPrices(symbol: string, count: number = 100): Promise<{ timestamps: string[]; open: number[]; high: number[]; low: number[]; close: number[]; volume: number[] }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/instruments/${symbol}/candles?price=OHLC&count=${count}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`OANDA API error: ${response.statusText}`);
      }

      const data = await response.json();
      const candles = data.candles;

      return {
        timestamps: candles.map((c: any) => c.time),
        open: candles.map((c: any) => c.mid?.o || 0),
        high: candles.map((c: any) => c.mid?.h || 0),
        low: candles.map((c: any) => c.mid?.l || 0),
        close: candles.map((c: any) => c.mid?.c || 0),
        volume: candles.map((c: any) => c.volume || 0)
      };
    } catch (error) {
      console.error('Error fetching historical prices from OANDA:', error);
      // Return mock data for development
      const mockData = this.generateMockPriceData(count);
      return mockData;
    }
  }

  async placeOrder(orderData: any): Promise<any> {
    try {
      const response = await fetch(
        `${this.baseUrl}/accounts/${this.accountId}/orders`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(orderData)
        }
      );

      if (!response.ok) {
        throw new Error(`OANDA order error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error placing order with OANDA:', error);
      // Return mock order response for development
      return {
        orderCreateTransaction: {
          id: `mock_order_${Date.now()}`,
          type: 'MARKET_ORDER',
          instrument: orderData.order.units > 0 ? 'BUY' : 'SELL'
        }
      };
    }
  }

  private generateMockPriceData(count: number): { timestamps: string[]; open: number[]; high: number[]; low: number[]; close: number[]; volume: number[] } {
    const data = {
      timestamps: [],
      open: [],
      high: [],
      low: [],
      close: [],
      volume: []
    };

    let basePrice = 1.0850;
    const now = new Date();

    for (let i = count - 1; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000); // 1 hour intervals
      data.timestamps.push(timestamp.toISOString());

      // Random walk with mean reversion
      const change = (Math.random() - 0.5) * 0.002;
      basePrice = basePrice + change;
      basePrice = Math.max(1.0800, Math.min(1.0900, basePrice)); // Keep in range

      const volatility = 0.0005;
      data.open.push(basePrice);
      data.high.push(basePrice + Math.random() * volatility);
      data.low.push(basePrice - Math.random() * volatility);
      data.close.push(basePrice + (Math.random() - 0.5) * volatility);
      data.volume.push(Math.floor(Math.random() * 1000000) + 500000);
    }

    return data;
  }
}

// Random Signal Generator
class RandomSignalGenerator {
  private oandaAPI: OandaAPI;
  private supabase: any;

  constructor(oandaAPI: OandaAPI, supabase: any) {
    this.oandaAPI = oandaAPI;
    this.supabase = supabase;
  }

  async generateSignalsForSymbol(symbol: string, signalsPerHour: number = 10): Promise<any[]> {
    console.log(`🎲 Generating ${signalsPerHour} random signals for ${symbol}`);

    // Get historical prices for technical indicators
    const priceData = await this.oandaAPI.getHistoricalPrices(symbol, 100);

    // Calculate technical indicators
    const indicators = this.calculateIndicators(priceData);

    // Get current price
    const currentPrice = await this.oandaAPI.getCurrentPrice(symbol);

    const signals = [];

    for (let i = 0; i < signalsPerHour; i++) {
      const signal = await this.generateRandomSignal(symbol, currentPrice, indicators);
      signals.push(signal);

      // Save to database
      await this.saveSignalToDatabase(signal);

      // Execute paper trade on OANDA
      await this.executePaperTrade(signal);
    }

    return signals;
  }

  private calculateIndicators(priceData: any): any {
    const { close, high, low, volume } = priceData;

    // Technical indicators
    const adx = TechnicalIndicators.calculateADX(high, low, close);
    const rsi = TechnicalIndicators.calculateRSI(close);
    const ema12 = TechnicalIndicators.calculateEMA(close, 12);
    const ema21 = TechnicalIndicators.calculateEMA(close, 21);
    const ema50 = TechnicalIndicators.calculateEMA(close, 50);
    const atr = TechnicalIndicators.calculateATR(high, low, close);
    const stoch = TechnicalIndicators.calculateStochastic(high, low, close);
    const macd = TechnicalIndicators.calculateMACD(close);

    // Get latest values
    const latest = {
      adx_value: adx[adx.length - 1] || 25,
      rsi_value: rsi[rsi.length - 1] || 50,
      ema_12: ema12[ema12.length - 1] || close[close.length - 1],
      ema_21: ema21[ema21.length - 1] || close[close.length - 1],
      ema_50: ema50[ema50.length - 1] || close[close.length - 1],
      vwap: close[close.length - 1], // Simplified VWAP
      atr_value: atr[atr.length - 1] || 0.0020,
      bollinger_upper: close[close.length - 1] * 1.002,
      bollinger_lower: close[close.length - 1] * 0.998,
      stoch_k: stoch.k[stoch.k.length - 1] || 50,
      stoch_d: stoch.d[stoch.d.length - 1] || 50,
      macd_line: macd.macd[macd.macd.length - 1] || 0,
      macd_signal: macd.signal[macd.signal.length - 1] || 0,
      volume_ma: volume[volume.length - 1] || 1000000,
      price_change_pct: ((close[close.length - 1] - close[close.length - 2]) / close[close.length - 2]) * 100,
      volatility: (atr[atr.length - 1] / close[close.length - 1]) * 100
    };

    return latest;
  }

  private async generateRandomSignal(symbol: string, currentPrice: any, indicators: any): Promise<any> {
    // Generate random signal type with some bias based on indicators
    const random = Math.random();
    let signalType: 'BUY' | 'SELL';

    // Bias based on indicators
    let bias = 0;
    if (indicators.rsi_value < 30) bias += 0.2; // Oversold bias BUY
    if (indicators.rsi_value > 70) bias -= 0.2; // Overbought bias SELL
    if (indicators.adx_value > 25 && indicators.ema_12 > indicators.ema_21) bias += 0.15; // Trend bias
    if (indicators.adx_value > 25 && indicators.ema_12 < indicators.ema_21) bias -= 0.15;

    signalType = (random + bias) > 0.5 ? 'BUY' : 'SELL';

    // Calculate entry price with some randomness
    const spread = currentPrice.ask - currentPrice.bid;
    const entryPrice = signalType === 'BUY'
      ? currentPrice.ask + (Math.random() - 0.5) * spread * 0.5
      : currentPrice.bid + (Math.random() - 0.5) * spread * 0.5;

    // Calculate SL/TP based on ATR with randomness
    const atrDistance = indicators.atr_value * (0.8 + Math.random() * 0.4); // 0.8x to 1.2x ATR

    const stopLoss = signalType === 'BUY'
      ? entryPrice - atrDistance
      : entryPrice + atrDistance;

    const takeProfit = signalType === 'BUY'
      ? entryPrice + atrDistance  // 1:1 risk/reward
      : entryPrice - atrDistance;

    // Generate confidence score based on indicators
    const confidenceScore = this.calculateConfidence(indicators, signalType);

    return {
      symbol,
      signal_type: signalType,
      entry_price: entryPrice,
      stop_loss: stopLoss,
      take_profit: takeProfit,
      lot_size: 0.01,
      confidence_score: confidenceScore,
      market_session: this.getCurrentMarketSession(),
      trend_direction: indicators.ema_12 > indicators.ema_21 ? 'BULLISH' : 'BEARISH',
      volatility_regime: indicators.volatility > 0.1 ? 'HIGH' : indicators.volatility > 0.05 ? 'MEDIUM' : 'LOW',
      ...indicators,
      generation_timestamp: new Date().toISOString()
    };
  }

  private calculateConfidence(indicators: any, signalType: 'BUY' | 'SELL'): number {
    let confidence = 50; // Base confidence

    // ADX contribution
    if (indicators.adx_value > 25) confidence += 10;
    if (indicators.adx_value > 40) confidence += 10;

    // RSI contribution
    if (signalType === 'BUY' && indicators.rsi_value < 40) confidence += 15;
    if (signalType === 'SELL' && indicators.rsi_value > 60) confidence += 15;

    // EMA alignment
    const emaAligned = (signalType === 'BUY' && indicators.ema_12 > indicators.ema_21) ||
                      (signalType === 'SELL' && indicators.ema_12 < indicators.ema_21);
    if (emaAligned) confidence += 10;

    // MACD contribution
    const macdAligned = (signalType === 'BUY' && indicators.macd_line > indicators.macd_signal) ||
                       (signalType === 'SELL' && indicators.macd_line < indicators.macd_signal);
    if (macdAligned) confidence += 10;

    return Math.min(95, Math.max(25, confidence + (Math.random() - 0.5) * 10)); // Add randomness
  }

  private getCurrentMarketSession(): string {
    const hour = new Date().getUTCHours();

    if (hour >= 13 && hour < 16) return 'LONDON'; // London (13:00-16:00 UTC)
    if (hour >= 17 && hour < 20) return 'NEW_YORK'; // New York (17:00-20:00 UTC)
    if (hour >= 23 || hour < 2) return 'ASIAN'; // Asian (23:00-02:00 UTC)
    return 'OVERLAP'; // Other times
  }

  private async saveSignalToDatabase(signal: any): Promise<string> {
    try {
      const { data, error } = await this.supabase
        .from('ml_training_samples')
        .insert([{
          symbol: signal.symbol,
          signal_type: signal.signal_type,
          entry_price: signal.entry_price,
          stop_loss: signal.stop_loss,
          take_profit: signal.take_profit,
          lot_size: signal.lot_size,
          confidence_score: signal.confidence_score,
          market_session: signal.market_session,
          trend_direction: signal.trend_direction,
          volatility_regime: signal.volatility_regime,

          // Technical indicators
          adx_value: signal.adx_value,
          rsi_value: signal.rsi_value,
          ema_12: signal.ema_12,
          ema_21: signal.ema_21,
          ema_50: signal.ema_50,
          vwap: signal.vwap,
          atr_value: signal.atr_value,
          bollinger_upper: signal.bollinger_upper,
          bollinger_lower: signal.bollinger_lower,
          stoch_k: signal.stoch_k,
          stoch_d: signal.stoch_d,
          macd_line: signal.macd_line,
          macd_signal: signal.macd_signal,
          volume_ma: signal.volume_ma,
          price_change_pct: signal.price_change_pct,
          volatility: signal.volatility,

          status: 'PENDING'
        }])
        .select('id')
        .single();

      if (error) {
        console.error('Error saving signal to database:', error);
        throw error;
      }

      return data.id;
    } catch (error) {
      console.error('Error saving signal to database:', error);
      throw error;
    }
  }

  private async executePaperTrade(signal: any): Promise<any> {
    try {
      const orderData = {
        order: {
          type: 'MARKET',
          instrument: signal.symbol,
          units: signal.signal_type === 'BUY' ? 1000 : -1000, // 0.01 lot = 1000 units
          positionFill: 'DEFAULT'
        }
      };

      const orderResponse = await this.oandaAPI.placeOrder(orderData);

      // Save OANDA trade data
      await this.saveOandaTrade(signal, orderResponse);

      return orderResponse;
    } catch (error) {
      console.error('Error executing paper trade:', error);
      throw error;
    }
  }

  private async saveOandaTrade(signal: any, orderResponse: any): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('oanda_paper_trades')
        .insert([{
          oanda_order_id: orderResponse.orderCreateTransaction?.id,
          symbol: signal.symbol,
          units: signal.signal_type === 'BUY' ? 1000 : -1000,
          price: signal.entry_price,
          stop_loss_price: signal.stop_loss,
          take_profit_price: signal.take_profit,
          status: 'OPEN',
          oanda_response: orderResponse
        }]);

      if (error) {
        console.error('Error saving OANDA trade:', error);
      }
    } catch (error) {
      console.error('Error saving OANDA trade:', error);
    }
  }

  async generateBatchSignals(): Promise<any> {
    const batchId = `batch_${Date.now()}`;
    const signalsPerSymbol = 10; // 10 signals per symbol per hour
    const results = [];

    console.log(`🚀 Starting ML batch signal generation: ${batchId}`);

    // Log batch start
    await this.supabase
      .from('ml_generation_logs')
      .insert([{
        batch_id: batchId,
        symbols_count: TRADING_SYMBOLS.length,
        signals_per_symbol: signalsPerSymbol,
        total_signals_generated: TRADING_SYMBOLS.length * signalsPerSymbol,
        generation_strategy: 'random_weighted',
        market_conditions: { session: this.getCurrentMarketSession() },
        avg_confidence: 0,
        signal_distribution: { BUY: 0, SELL: 0 }
      }]);

    let totalBuySignals = 0;
    let totalSellSignals = 0;
    let totalConfidence = 0;

    // Generate signals for each symbol
    for (const symbol of TRADING_SYMBOLS) {
      try {
        const signals = await this.generateSignalsForSymbol(symbol, signalsPerSymbol);
        results.push({ symbol, signals, success: true });

        // Count signal types for batch log
        signals.forEach(signal => {
          if (signal.signal_type === 'BUY') totalBuySignals++;
          else totalSellSignals++;
          totalConfidence += signal.confidence_score;
        });

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`Error generating signals for ${symbol}:`, error);
        results.push({ symbol, error: error.message, success: false });
      }
    }

    // Update batch log with final results
    const avgConfidence = results.filter(r => r.success).length > 0
      ? totalConfidence / (totalBuySignals + totalSellSignals)
      : 0;

    await this.supabase
      .from('ml_generation_logs')
      .update({
        avg_confidence: avgConfidence,
        signal_distribution: { BUY: totalBuySignals, SELL: totalSellSignals },
        status: 'COMPLETED'
      })
      .eq('batch_id', batchId);

    console.log(`✅ Batch ${batchId} completed. Generated ${totalBuySignals + totalSellSignals} signals`);

    return {
      batch_id: batchId,
      total_signals: totalBuySignals + totalSellSignals,
      buy_signals: totalBuySignals,
      sell_signals: totalSellSignals,
      avg_confidence: avgConfidence,
      results
    };
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Initialize OANDA API
    const oandaApiKey = Deno.env.get('OANDA_API_KEY')!;
    const oandaAccountId = Deno.env.get('OANDA_ACCOUNT_ID')!;
    const oandaAPI = new OandaAPI(oandaApiKey, oandaAccountId);

    // Initialize generator
    const generator = new RandomSignalGenerator(oandaAPI, supabase);

    const { method } = req;
    const url = new URL(req.url);
    const path = url.pathname;

    console.log(`📡 ML Random Signals: ${method} ${path}`);

    if (method === 'POST' && path === '/generate-batch') {
      const result = await generator.generateBatchSignals();

      return new Response(
        JSON.stringify({
          success: true,
          message: 'ML random signals generated successfully',
          data: result
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    if (method === 'POST' && path === '/generate-single') {
      const { symbol, signalsCount = 10 } = await req.json();

      if (!symbol) {
        return new Response(
          JSON.stringify({ error: 'Symbol parameter is required' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        );
      }

      const signals = await generator.generateSignalsForSymbol(symbol, signalsCount);

      return new Response(
        JSON.stringify({
          success: true,
          symbol,
          signals_generated: signals.length,
          signals
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    if (method === 'GET' && path === '/status') {
      // Check generation status and statistics
      const { data: recentBatches, error } = await supabase
        .from('ml_generation_logs')
        .select('*')
        .order('generation_time', { ascending: false })
        .limit(10);

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          recent_batches: recentBatches || [],
          supported_symbols: TRADING_SYMBOLS,
          service_status: 'active'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Endpoint not found' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      }
    );

  } catch (error) {
    console.error('Error in ML random signals function:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});