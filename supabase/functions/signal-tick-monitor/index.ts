/**
 * Signal Tick-by-Tick Monitor
 *
 * Monitora tutti i segnali OPEN e aggiorna il loro stato
 * ogni volta che arriva un nuovo prezzo da TradingView
 *
 * Chiamato ogni secondo per ogni simbolo attivo
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OpenSignal {
  id: string;
  symbol: string;
  signal_type: 'BUY' | 'SELL';
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  highest_price: number | null;
  lowest_price: number | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { symbol, currentPrice } = await req.json();

    if (!symbol || !currentPrice) {
      throw new Error('Missing symbol or currentPrice');
    }

    console.log(`🔍 Monitoring ${symbol} at price ${currentPrice}`);

    // Get all OPEN signals for this symbol
    const { data: openSignals, error: fetchError } = await supabase
      .from('collective_signals')
      .select('*')
      .eq('symbol', symbol)
      .eq('status', 'OPEN');

    if (fetchError) {
      throw fetchError;
    }

    if (!openSignals || openSignals.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: `No open signals for ${symbol}`,
        monitored: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📊 Found ${openSignals.length} open signals for ${symbol}`);

    // Update each signal tick by tick
    let tpHits = 0;
    let slHits = 0;
    let updated = 0;

    for (const signal of openSignals) {
      const { error: updateError } = await supabase.rpc('update_signal_tick', {
        p_signal_id: signal.id,
        p_current_price: currentPrice
      });

      if (updateError) {
        console.error(`❌ Error updating signal ${signal.id}:`, updateError);
        continue;
      }

      // Check if hit TP/SL
      if (signal.signal_type === 'BUY') {
        if (currentPrice >= signal.take_profit) {
          tpHits++;
          console.log(`✅ TP HIT for signal ${signal.id} (BUY ${symbol})`);
        } else if (currentPrice <= signal.stop_loss) {
          slHits++;
          console.log(`❌ SL HIT for signal ${signal.id} (BUY ${symbol})`);
        }
      } else { // SELL
        if (currentPrice <= signal.take_profit) {
          tpHits++;
          console.log(`✅ TP HIT for signal ${signal.id} (SELL ${symbol})`);
        } else if (currentPrice >= signal.stop_loss) {
          slHits++;
          console.log(`❌ SL HIT for signal ${signal.id} (SELL ${symbol})`);
        }
      }

      updated++;
    }

    // Trigger ML retraining if enough signals closed
    if (tpHits + slHits >= 10) {
      console.log(`🤖 Triggering ML retraining (${tpHits + slHits} signals closed)`);

      // Call ML optimizer in background
      fetch(`${supabaseUrl}/functions/v1/ml-weight-optimizer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({
          trigger: 'signal_batch_closed',
          symbol: symbol,
          count: tpHits + slHits
        })
      }).catch(err => console.error('Failed to trigger ML optimizer:', err));
    }

    return new Response(JSON.stringify({
      success: true,
      symbol,
      currentPrice,
      monitored: updated,
      tpHits,
      slHits,
      message: `Updated ${updated} signals (${tpHits} TP, ${slHits} SL)`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error:', error);

    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
