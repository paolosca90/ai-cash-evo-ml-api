/**
 * Historical Data Cache Manager
 *
 * Gestisce dati storici da Twelve Data in modo intelligente:
 * - Chiamata batch ogni 15 minuti per tutti i simboli
 * - Cache su Supabase Storage (JSON)
 * - Integrazione con TradingView per aggiornamenti real-time
 * - Limite: 800 chiamate/giorno (33/ora, ~1 ogni 2 minuti)
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minuti
const SYMBOLS = ['XAUUSD', 'EURUSD', 'GBPUSD', 'BTCUSD', 'ETHUSD']; // Simboli principali

interface HistoricalCandle {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume?: string;
}

interface CachedData {
  symbol: string;
  interval: string;
  candles: HistoricalCandle[];
  lastUpdate: string;
  source: 'twelve_data' | 'tradingview_update';
}

class TwelveDataClient {
  /**
   * Fetch historical data from Twelve Data API
   * Endpoint: /time_series
   */
  static async fetchHistoricalData(
    symbol: string,
    interval: string = '5min',
    outputsize: number = 50
  ): Promise<HistoricalCandle[]> {
    try {
      const apiKey = Deno.env.get('TWELVE_DATA_API_KEY');

      if (!apiKey) {
        throw new Error('TWELVE_DATA_API_KEY not configured');
      }

      // Twelve Data time_series endpoint
      const url = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=${interval}&outputsize=${outputsize}&apikey=${apiKey}`;

      console.log(`📡 Fetching ${symbol} from Twelve Data (${interval}, ${outputsize} candles)`);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Twelve Data API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'error') {
        throw new Error(`Twelve Data error: ${data.message || 'Unknown error'}`);
      }

      if (!data.values || !Array.isArray(data.values)) {
        throw new Error('Invalid response format from Twelve Data');
      }

      console.log(`✅ Fetched ${data.values.length} candles for ${symbol}`);

      return data.values as HistoricalCandle[];
    } catch (error) {
      console.error(`❌ Error fetching ${symbol} from Twelve Data:`, error);
      return [];
    }
  }

  /**
   * Fetch multiple symbols in sequence (to avoid rate limits)
   * Delay between requests: 2 seconds
   */
  static async fetchBatchHistoricalData(
    symbols: string[],
    interval: string = '5min',
    outputsize: number = 50
  ): Promise<Map<string, HistoricalCandle[]>> {
    const results = new Map<string, HistoricalCandle[]>();

    for (const symbol of symbols) {
      const candles = await this.fetchHistoricalData(symbol, interval, outputsize);
      results.set(symbol, candles);

      // Delay 2 seconds between requests (rate limit protection)
      if (symbols.indexOf(symbol) < symbols.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return results;
  }
}

class CacheManager {
  private supabase: Record<string, unknown>;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Get cached data from Supabase Storage
   */
  async getCachedData(symbol: string, interval: string): Promise<CachedData | null> {
    try {
      const filename = `historical_${symbol}_${interval}.json`;

      const { data, error } = await this.supabase.storage
        .from('trading-cache')
        .download(filename);

      if (error) {
        console.log(`⚠️ No cache found for ${symbol} (${interval})`);
        return null;
      }

      const text = await data.text();
      const cached: CachedData = JSON.parse(text);

      // Check if cache is still valid (< 15 min old)
      const lastUpdate = new Date(cached.lastUpdate).getTime();
      const now = Date.now();

      if (now - lastUpdate > CACHE_DURATION_MS) {
        console.log(`⏰ Cache expired for ${symbol} (age: ${Math.floor((now - lastUpdate) / 60000)} min)`);
        return null;
      }

      console.log(`✅ Using cached data for ${symbol} (age: ${Math.floor((now - lastUpdate) / 60000)} min)`);
      return cached;
    } catch (error) {
      console.error(`❌ Error reading cache for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Save data to Supabase Storage
   */
  async saveCachedData(data: CachedData): Promise<void> {
    try {
      const filename = `historical_${data.symbol}_${data.interval}.json`;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });

      const { error } = await this.supabase.storage
        .from('trading-cache')
        .upload(filename, blob, { upsert: true });

      if (error) {
        throw error;
      }

      console.log(`💾 Cached ${data.symbol} (${data.candles.length} candles)`);
    } catch (error) {
      console.error(`❌ Error saving cache for ${data.symbol}:`, error);
    }
  }

  /**
   * Update cache with new TradingView data (append latest candle)
   */
  async updateCacheWithRealtime(
    symbol: string,
    interval: string,
    newCandle: HistoricalCandle
  ): Promise<void> {
    try {
      const cached = await this.getCachedData(symbol, interval);

      if (!cached) {
        console.log(`⚠️ No cache to update for ${symbol}`);
        return;
      }

      // Add new candle at the beginning (most recent)
      cached.candles.unshift(newCandle);

      // Keep only last 50 candles
      cached.candles = cached.candles.slice(0, 50);

      cached.lastUpdate = new Date().toISOString();
      cached.source = 'tradingview_update';

      await this.saveCachedData(cached);

      console.log(`🔄 Updated cache for ${symbol} with real-time data`);
    } catch (error) {
      console.error(`❌ Error updating cache for ${symbol}:`, error);
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const cacheManager = new CacheManager(supabaseUrl, supabaseKey);

    const { action, symbol, symbols, interval = '5min', realtimeData } = await req.json();

    // ACTION 1: Get cached data (or fetch if expired)
    if (action === 'get') {
      const targetSymbols = symbols || [symbol];
      const results: Record<string, number[]> = {};

      for (const sym of targetSymbols) {
        let cached = await cacheManager.getCachedData(sym, interval);

        // If cache expired or missing, fetch fresh data from Twelve Data
        if (!cached) {
          console.log(`📥 Fetching fresh data for ${sym} from Twelve Data`);

          const candles = await TwelveDataClient.fetchHistoricalData(sym, interval, 50);

          if (candles.length > 0) {
            cached = {
              symbol: sym,
              interval,
              candles,
              lastUpdate: new Date().toISOString(),
              source: 'twelve_data'
            };

            await cacheManager.saveCachedData(cached);
          }
        }

        // Extract close prices
        if (cached) {
          results[sym] = cached.candles.map(c => parseFloat(c.close));
        }
      }

      return new Response(JSON.stringify({
        success: true,
        data: results,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ACTION 2: Batch update (called every 15 min via cron)
    if (action === 'batch_update') {
      console.log(`🔄 Starting batch update for ${SYMBOLS.length} symbols`);

      const batchData = await TwelveDataClient.fetchBatchHistoricalData(SYMBOLS, interval, 50);

      for (const [sym, candles] of batchData.entries()) {
        if (candles.length > 0) {
          const cached: CachedData = {
            symbol: sym,
            interval,
            candles,
            lastUpdate: new Date().toISOString(),
            source: 'twelve_data'
          };

          await cacheManager.saveCachedData(cached);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        message: `Updated ${batchData.size} symbols`,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ACTION 3: Update with real-time data from TradingView
    if (action === 'update_realtime') {
      if (!symbol || !realtimeData) {
        throw new Error('Missing symbol or realtimeData');
      }

      await cacheManager.updateCacheWithRealtime(symbol, interval, realtimeData);

      return new Response(JSON.stringify({
        success: true,
        message: `Updated ${symbol} with real-time data`,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    throw new Error('Invalid action. Use: get, batch_update, or update_realtime');

  } catch (error) {
    console.error('❌ Error:', error);

    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
