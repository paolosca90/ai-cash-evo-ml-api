/**
 * OANDA Data Service
 * Unified data provider using OANDA REST API v20
 * Replaces: TradingView, Twelve Data, Alpha Vantage, Polygon
 */

const OANDA_API_KEY = '5c973356b8d3d02c28162fd3f3afe8aa-1416e27af60c960fedb8d61c98e917b5';
const OANDA_ACCOUNT_ID = '101-004-37254450-002';
const OANDA_BASE_URL = 'https://api-fxpractice.oanda.com'; // Practice environment
const OANDA_STREAM_URL = 'https://stream-fxpractice.oanda.com';

// For production:
// const OANDA_BASE_URL = 'https://api-fxtrade.oanda.com';
// const OANDA_STREAM_URL = 'https://stream-fxtrade.oanda.com';

export interface OandaCandle {
  time: string;
  bid: { o: string; h: string; l: string; c: string };
  mid: { o: string; h: string; l: string; c: string };
  ask: { o: string; h: string; l: string; c: string };
  volume: number;
  complete: boolean;
}

export interface OandaPrice {
  instrument: string;
  time: string;
  closeoutBid: string;
  closeoutAsk: string;
  bids: Array<{ price: string; liquidity: number }>;
  asks: Array<{ price: string; liquidity: number }>;
}

export interface MarketData {
  symbol: string;
  price: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
  bid: number;
  ask: number;
  spread: number;
}

export interface TechnicalIndicators {
  rsi: number;
  macd: number;
  macd_signal: number;
  macd_histogram: number;
  atr: number;
  sma_9: number;
  sma_20: number;
  sma_50: number;
  ema_9: number;
  ema_20: number;
  stoch_k: number;
  stoch_d: number;
  bollinger_upper: number;
  bollinger_middle: number;
  bollinger_lower: number;
}

class OandaDataService {
  private static instance: OandaDataService;

  static getInstance(): OandaDataService {
    if (!OandaDataService.instance) {
      OandaDataService.instance = new OandaDataService();
    }
    return OandaDataService.instance;
  }

  /**
   * Get current price for instrument
   */
  async getCurrentPrice(instrument: string): Promise<OandaPrice> {
    const url = `${OANDA_BASE_URL}/v3/accounts/${OANDA_ACCOUNT_ID}/pricing?instruments=${instrument}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${OANDA_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`OANDA pricing API failed: ${response.status}`);
    }

    const data = await response.json();
    return data.prices[0];
  }

  /**
   * Get historical candles
   */
  async getCandles(
    instrument: string,
    granularity: string = 'M5', // M1, M5, M15, M30, H1, H4, D
    count: number = 500
  ): Promise<OandaCandle[]> {
    const url = `${OANDA_BASE_URL}/v3/accounts/${OANDA_ACCOUNT_ID}/instruments/${instrument}/candles`;

    const params = new URLSearchParams({
      granularity,
      count: count.toString(),
      price: 'MBA' // Mid, Bid, Ask
    });

    const response = await fetch(`${url}?${params}`, {
      headers: {
        'Authorization': `Bearer ${OANDA_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`OANDA candles API failed: ${response.status}`);
    }

    const data = await response.json();
    return data.candles;
  }

  /**
   * Get market data with technical indicators (calculated)
   */
  async getMarketDataWithIndicators(
    instrument: string,
    granularity: string = 'M5'
  ): Promise<{ marketData: MarketData; indicators: TechnicalIndicators }> {
    // 1. Get current price
    const currentPrice = await this.getCurrentPrice(instrument);

    // 2. Get historical candles for indicator calculation
    const candles = await this.getCandles(instrument, granularity, 200); // 200 candles for indicators

    // 3. Parse candles
    const closes = candles.map(c => parseFloat(c.mid.c));
    const highs = candles.map(c => parseFloat(c.mid.h));
    const lows = candles.map(c => parseFloat(c.mid.l));
    const opens = candles.map(c => parseFloat(c.mid.o));
    const volumes = candles.map(c => c.volume);

    // 4. Calculate indicators using TA library
    const indicators = await this.calculateIndicators(closes, highs, lows, opens, volumes);

    // 5. Build market data
    const latestCandle = candles[candles.length - 1];
    const marketData: MarketData = {
      symbol: instrument,
      price: parseFloat(currentPrice.closeoutBid),
      open: parseFloat(latestCandle.mid.o),
      high: parseFloat(latestCandle.mid.h),
      low: parseFloat(latestCandle.mid.l),
      close: parseFloat(latestCandle.mid.c),
      volume: latestCandle.volume,
      timestamp: new Date(currentPrice.time).getTime(),
      bid: parseFloat(currentPrice.closeoutBid),
      ask: parseFloat(currentPrice.closeoutAsk),
      spread: parseFloat(currentPrice.closeoutAsk) - parseFloat(currentPrice.closeoutBid)
    };

    return { marketData, indicators };
  }

  /**
   * Calculate technical indicators
   * TODO: Use Python TA-Lib via Edge Function for professional indicators
   */
  private async calculateIndicators(
    closes: number[],
    highs: number[],
    lows: number[],
    opens: number[],
    volumes: number[]
  ): Promise<TechnicalIndicators> {
    // For now, use simple calculations
    // TODO: Replace with TA-Lib via Supabase Edge Function

    const rsi = this.calculateRSI(closes, 14);
    const { macd, signal, histogram } = this.calculateMACD(closes);
    const atr = this.calculateATR(highs, lows, closes, 14);
    const sma_9 = this.calculateSMA(closes, 9);
    const sma_20 = this.calculateSMA(closes, 20);
    const sma_50 = this.calculateSMA(closes, 50);
    const ema_9 = this.calculateEMA(closes, 9);
    const ema_20 = this.calculateEMA(closes, 20);
    const { k, d } = this.calculateStochastic(highs, lows, closes, 14, 3);
    const { upper, middle, lower } = this.calculateBollinger(closes, 20, 2);

    return {
      rsi,
      macd,
      macd_signal: signal,
      macd_histogram: histogram,
      atr,
      sma_9,
      sma_20,
      sma_50,
      ema_9,
      ema_20,
      stoch_k: k,
      stoch_d: d,
      bollinger_upper: upper,
      bollinger_middle: middle,
      bollinger_lower: lower
    };
  }

  // Simple RSI calculation
  private calculateRSI(closes: number[], period: number = 14): number {
    const gains: number[] = [];
    const losses: number[] = [];

    for (let i = 1; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  // Simple MACD calculation
  private calculateMACD(closes: number[]): { macd: number; signal: number; histogram: number } {
    const ema12 = this.calculateEMA(closes, 12);
    const ema26 = this.calculateEMA(closes, 26);
    const macd = ema12 - ema26;

    // Signal line (9-period EMA of MACD)
    const macdLine = [macd]; // Simplified
    const signal = this.calculateEMA(macdLine, 9);
    const histogram = macd - signal;

    return { macd, signal, histogram };
  }

  // ATR calculation
  private calculateATR(highs: number[], lows: number[], closes: number[], period: number = 14): number {
    const trs: number[] = [];

    for (let i = 1; i < closes.length; i++) {
      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      );
      trs.push(tr);
    }

    return trs.slice(-period).reduce((a, b) => a + b, 0) / period;
  }

  // SMA calculation
  private calculateSMA(data: number[], period: number): number {
    const slice = data.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
  }

  // EMA calculation
  private calculateEMA(data: number[], period: number): number {
    const k = 2 / (period + 1);
    let ema = data[0];

    for (let i = 1; i < data.length; i++) {
      ema = data[i] * k + ema * (1 - k);
    }

    return ema;
  }

  // Stochastic calculation
  private calculateStochastic(
    highs: number[],
    lows: number[],
    closes: number[],
    period: number = 14,
    kPeriod: number = 3
  ): { k: number; d: number } {
    const recentHighs = highs.slice(-period);
    const recentLows = lows.slice(-period);
    const currentClose = closes[closes.length - 1];

    const highestHigh = Math.max(...recentHighs);
    const lowestLow = Math.min(...recentLows);

    const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
    const d = k; // Simplified

    return { k, d };
  }

  // Bollinger Bands calculation
  private calculateBollinger(
    closes: number[],
    period: number = 20,
    stdDev: number = 2
  ): { upper: number; middle: number; lower: number } {
    const middle = this.calculateSMA(closes, period);
    const slice = closes.slice(-period);

    const variance = slice.reduce((sum, val) => sum + Math.pow(val - middle, 2), 0) / period;
    const std = Math.sqrt(variance);

    return {
      upper: middle + (stdDev * std),
      middle,
      lower: middle - (stdDev * std)
    };
  }

  /**
   * Convert OANDA instrument format to standard
   * EUR_USD → EURUSD
   */
  toOandaInstrument(symbol: string): string {
    if (symbol.includes('_')) return symbol;
    return symbol.slice(0, 3) + '_' + symbol.slice(3);
  }

  /**
   * Convert standard format to OANDA
   * EURUSD → EUR_USD
   */
  fromOandaInstrument(instrument: string): string {
    return instrument.replace('_', '');
  }
}

export const oandaDataService = OandaDataService.getInstance();
export default OandaDataService;
