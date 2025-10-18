/**
 * Price Tick Cron Job
 *
 * Eseguito ogni minuto per:
 * 1. Fetch prezzi correnti da TradingView per tutti i simboli attivi
 * 2. Trigger signal-tick-monitor per ogni simbolo
 * 3. Aggiornare status dei segnali aperti (TP/SL hit detection)
 *
 * Cron schedule: every minute
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simboli da monitorare
const ACTIVE_SYMBOLS = ['XAUUSD', 'EURUSD', 'GBPUSD', 'BTCUSD', 'ETHUSD'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Price Tick Cron Job Started');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Controlla quali simboli hanno segnali aperti
    const { data: openSignals, error: signalsError } = await supabase
      .from('collective_signals')
      .select('symbol')
      .eq('status', 'OPEN');

    if (signalsError) {
      throw signalsError;
    }

    if (!openSignals || openSignals.length === 0) {
      console.log('⚠️ No open signals found - skipping tick monitoring');
      return new Response(JSON.stringify({
        success: true,
        message: 'No open signals to monitor',
        monitored: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 2. Estrai simboli unici con segnali aperti
    const symbolsWithOpenSignals = Array.from(new Set(openSignals.map(s => s.symbol)));
    console.log(`📊 Symbols with open signals: ${symbolsWithOpenSignals.join(', ')}`);

    // 3. Fetch prezzi correnti da TradingView
    console.log(`📡 Fetching current prices from TradingView...`);

    const priceResponse = await fetch(`${supabaseUrl}/functions/v1/tradingview-market-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({
        symbols: symbolsWithOpenSignals
      })
    });

    if (!priceResponse.ok) {
      throw new Error(`TradingView API error: ${priceResponse.status}`);
    }

    const priceData = await priceResponse.json();

    if (!priceData.success || !priceData.data) {
      throw new Error('Invalid TradingView response');
    }

    console.log(`✅ Fetched prices for ${priceData.count} symbols`);

    // 4. Trigger tick monitor per ogni simbolo
    const monitorResults = [];

    for (const marketData of priceData.data) {
      const { symbol, price } = marketData;

      console.log(`🔍 Monitoring ${symbol} at price ${price}`);

      try {
        const monitorResponse = await fetch(`${supabaseUrl}/functions/v1/signal-tick-monitor`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({
            symbol,
            currentPrice: price
          })
        });

        const monitorResult = await monitorResponse.json();

        if (monitorResult.success) {
          console.log(`✅ ${symbol}: Updated ${monitorResult.monitored} signals (${monitorResult.tpHits} TP, ${monitorResult.slHits} SL)`);

          monitorResults.push({
            symbol,
            success: true,
            monitored: monitorResult.monitored,
            tpHits: monitorResult.tpHits,
            slHits: monitorResult.slHits,
            price
          });
        } else {
          console.error(`❌ ${symbol}: Monitor failed -`, monitorResult.error);
          monitorResults.push({
            symbol,
            success: false,
            error: monitorResult.error
          });
        }
      } catch (err) {
        console.error(`❌ Error monitoring ${symbol}:`, err);
        monitorResults.push({
          symbol,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }

      // Rate limiting: pausa 200ms tra chiamate
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const totalMonitored = monitorResults.reduce((sum, r) => sum + (r.monitored || 0), 0);
    const totalTPHits = monitorResults.reduce((sum, r) => sum + (r.tpHits || 0), 0);
    const totalSLHits = monitorResults.reduce((sum, r) => sum + (r.slHits || 0), 0);

    console.log(`✅ Tick monitoring complete: ${totalMonitored} signals updated (${totalTPHits} TP, ${totalSLHits} SL)`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Price tick monitoring completed',
      summary: {
        symbolsMonitored: symbolsWithOpenSignals.length,
        signalsUpdated: totalMonitored,
        tpHits: totalTPHits,
        slHits: totalSLHits
      },
      results: monitorResults,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Price tick cron error:', error);

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
