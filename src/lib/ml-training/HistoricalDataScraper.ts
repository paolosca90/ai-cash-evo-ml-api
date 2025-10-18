// @ts-nocheck
/**
 * Historical Data Scraper
 * Fetches historical candle data from OANDA API for ML training
 */

import { supabase } from '../../integrations/supabase/client';

export interface ScraperConfig {
  symbols: string[];
  granularities: ('M1' | 'M5' | 'M15' | 'H1' | 'H4' | 'D1')[];
  startDate: Date;
  endDate: Date;
  batchSize?: number;
}

export interface OANDACandle {
  time: string;
  volume: number;
  complete: boolean;
  mid: {
    o: string;
    h: string;
    l: string;
    c: string;
  };
}

export interface HistoricalCandle {
  symbol: string;
  granularity: string;
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class HistoricalDataScraper {
  private readonly OANDA_API_KEY: string;
  private readonly OANDA_ACCOUNT_ID: string;
  private readonly MAX_CANDLES_PER_REQUEST = 5000;
  private readonly RATE_LIMIT_DELAY = 500; // ms between requests

  constructor() {
    this.OANDA_API_KEY = import.meta.env.VITE_OANDA_API_KEY || '';
    this.OANDA_ACCOUNT_ID = import.meta.env.VITE_OANDA_ACCOUNT_ID || '';

    if (!this.OANDA_API_KEY || !this.OANDA_ACCOUNT_ID) {
      throw new Error('OANDA credentials not configured');
    }
  }

  /**
   * Main scraping function
   */
  async scrapeHistoricalData(config: ScraperConfig): Promise<{
    success: boolean;
    totalCandles: number;
    batchId?: string;
    error?: string;
  }> {
    try {
      console.log('🚀 Starting historical data scraping...');
      console.log(`📊 Symbols: ${config.symbols.join(', ')}`);
      console.log(`📈 Granularities: ${config.granularities.join(', ')}`);
      console.log(`📅 Period: ${config.startDate.toISOString()} to ${config.endDate.toISOString()}`);

      // Create batch record
      const batch = await this.createBatch(config);
      let totalCandles = 0;

      for (const symbol of config.symbols) {
        for (const granularity of config.granularities) {
          console.log(`\n📥 Fetching ${symbol} ${granularity}...`);
          
          const candles = await this.fetchCandlesInChunks(
            symbol,
            granularity,
            config.startDate,
            config.endDate
          );

          console.log(`   ✅ Fetched ${candles.length} candles`);

          // Save to database
          await this.saveCandles(candles);
          totalCandles += candles.length;

          // Rate limiting
          await this.sleep(this.RATE_LIMIT_DELAY);
        }
      }

      // Update batch status
      await this.completeBatch(batch.id, totalCandles);

      console.log(`\n✅ Scraping completed! Total candles: ${totalCandles}`);

      return {
        success: true,
        totalCandles,
        batchId: batch.id
      };

    } catch (error) {
      console.error('❌ Scraping failed:', error);
      return {
        success: false,
        totalCandles: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Fetch candles in chunks (OANDA limit: 5000 per request)
   */
  private async fetchCandlesInChunks(
    symbol: string,
    granularity: string,
    startDate: Date,
    endDate: Date
  ): Promise<HistoricalCandle[]> {
    const allCandles: HistoricalCandle[] = [];
    let currentStart = new Date(startDate);
    const end = new Date(endDate);

    while (currentStart < end) {
      const candles = await this.fetchOANDACandles(
        symbol,
        granularity,
        currentStart,
        this.MAX_CANDLES_PER_REQUEST
      );

      if (candles.length === 0) break;

      allCandles.push(...candles);

      // Update start time for next chunk
      const lastCandle = candles[candles.length - 1];
      currentStart = new Date(lastCandle.timestamp);
      currentStart.setSeconds(currentStart.getSeconds() + 1);

      console.log(`   📊 Progress: ${allCandles.length} candles fetched`);
    }

    return allCandles;
  }

  /**
   * Fetch candles from OANDA API
   */
  private async fetchOANDACandles(
    symbol: string,
    granularity: string,
    from: Date,
    count: number
  ): Promise<HistoricalCandle[]> {
    const instrument = this.formatInstrument(symbol);
    
    const url = `https://api-fxpractice.oanda.com/v3/instruments/${instrument}/candles`;
    const params = new URLSearchParams({
      granularity,
      from: from.toISOString(),
      count: count.toString(),
      price: 'M' // Mid prices
    });

    const response = await fetch(`${url}?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.OANDA_API_KEY}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`OANDA API error: ${response.statusText}`);
    }

    const data = await response.json();
    const candles: OANDACandle[] = data.candles || [];

    return candles
      .filter(c => c.complete)
      .map(c => ({
        symbol,
        granularity,
        timestamp: new Date(c.time),
        open: parseFloat(c.mid.o),
        high: parseFloat(c.mid.h),
        low: parseFloat(c.mid.l),
        close: parseFloat(c.mid.c),
        volume: c.volume
      }));
  }

  /**
   * Save candles to database (batch insert)
   */
  private async saveCandles(candles: HistoricalCandle[]): Promise<void> {
    if (candles.length === 0) return;

    const batchSize = 1000;
    for (let i = 0; i < candles.length; i += batchSize) {
      const batch = candles.slice(i, i + batchSize);
      
      const records = batch.map(c => ({
        symbol: c.symbol,
        granularity: c.granularity,
        timestamp: c.timestamp.toISOString(),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
        is_labeled: false
      }));

      const { error } = await supabase
        .from('ml_historical_candles')
        .upsert(records, {
          onConflict: 'symbol,granularity,timestamp',
          ignoreDuplicates: true
        });

      if (error) {
        console.error('Error saving candles:', error);
        throw error;
      }

      console.log(`   💾 Saved batch ${i / batchSize + 1} (${batch.length} candles)`);
    }
  }

  /**
   * Create batch record
   */
  private async createBatch(config: ScraperConfig): Promise<{ id: string }> {
    const { data, error } = await supabase
      .from('ml_training_batches')
      .insert({
        batch_name: `Scrape_${Date.now()}`,
        symbol: config.symbols.join(','),
        granularity: config.granularities.join(','),
        start_date: config.startDate.toISOString(),
        end_date: config.endDate.toISOString(),
        total_candles: 0,
        labeled_candles: 0,
        status: 'processing'
      })
      .select('id')
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Complete batch record
   */
  private async completeBatch(batchId: string, totalCandles: number): Promise<void> {
    await supabase
      .from('ml_training_batches')
      .update({
        total_candles: totalCandles,
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', batchId);
  }

  /**
   * Format symbol for OANDA API (e.g., EURUSD -> EUR_USD)
   */
  private formatInstrument(symbol: string): string {
    if (symbol.includes('_')) return symbol;
    
    // Standard forex pairs
    if (symbol.length === 6) {
      return `${symbol.slice(0, 3)}_${symbol.slice(3)}`;
    }
    
    // Already formatted or special instrument
    return symbol;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get scraping statistics
   */
  async getScrapingStats(): Promise<{
    totalCandles: number;
    symbolsCount: number;
    granularitiesCount: number;
    dateRange: { start: Date; end: Date } | null;
  }> {
    const { data, error } = await supabase
      .from('ml_historical_candles')
      .select('symbol, granularity, timestamp')
      .order('timestamp', { ascending: true })
      .limit(1);

    if (error || !data || data.length === 0) {
      return {
        totalCandles: 0,
        symbolsCount: 0,
        granularitiesCount: 0,
        dateRange: null
      };
    }

    const { count } = await supabase
      .from('ml_historical_candles')
      .select('*', { count: 'exact', head: true });

    const { data: symbols } = await supabase
      .from('ml_historical_candles')
      .select('symbol')
      .distinct();

    const { data: granularities } = await supabase
      .from('ml_historical_candles')
      .select('granularity')
      .distinct();

    const { data: lastCandle } = await supabase
      .from('ml_historical_candles')
      .select('timestamp')
      .order('timestamp', { ascending: false })
      .limit(1);

    return {
      totalCandles: count || 0,
      symbolsCount: symbols?.length || 0,
      granularitiesCount: granularities?.length || 0,
      dateRange: data[0] && lastCandle?.[0] ? {
        start: new Date(data[0].timestamp),
        end: new Date(lastCandle[0].timestamp)
      } : null
    };
  }
}
