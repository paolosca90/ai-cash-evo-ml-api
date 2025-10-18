/**
 * MONTHLY WEIGHT OPTIMIZATION
 * Runs every 1st of the month to re-optimize signal weights
 * Based on last month's signal performance
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[Monthly Optimization] Starting weight optimization...');

    // Load last 3 months of labeled signals
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const { data: signals, error } = await supabase
      .from('ml_historical_candles')
      .select('id, label, trade_outcome, win_pips, loss_pips, label_confidence')
      .eq('is_labeled', true)
      .not('label', 'is', null)
      .not('trade_outcome', 'is', null)
      .gte('created_at', threeMonthsAgo.toISOString())
      .limit(50000);

    if (error || !signals || signals.length < 100) {
      console.error('[Monthly Optimization] Not enough data:', error);
      return new Response(
        JSON.stringify({
          error: 'Not enough data for optimization',
          signals_found: signals?.length || 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Monthly Optimization] Analyzing ${signals.length} signals`);

    // Test different thresholds
    const thresholds = [50, 55, 60, 65, 70, 75, 80, 85, 90, 92, 95];
    const results = [];

    for (const threshold of thresholds) {
      const qualified = signals.filter(s => (s.label_confidence || 0) >= threshold);

      if (qualified.length < 10) continue;

      const wins = qualified.filter(s => s.trade_outcome === 'WIN').length;
      const winrate = (wins / qualified.length) * 100;

      const totalPips = qualified.reduce((sum, s) => {
        const pips = s.trade_outcome === 'WIN'
          ? (s.win_pips || 0)
          : -(s.loss_pips || 0);
        return sum + pips;
      }, 0);

      const avgPips = totalPips / qualified.length;
      const score = winrate * 0.6 + avgPips * 0.4;

      results.push({
        threshold,
        signals: qualified.length,
        winrate,
        avgPips,
        totalPips,
        score
      });

      console.log(`  Threshold ${threshold}: ${qualified.length} signals, ${winrate.toFixed(1)}% win, ${avgPips.toFixed(2)} pips`);
    }

    // Find optimal
    const optimal = results.reduce((best, curr) =>
      curr.score > best.score ? curr : best
    );

    console.log('[Monthly Optimization] Optimal threshold:', optimal.threshold);

    // Calculate BUY/SELL breakdown
    const qualifiedSignals = signals.filter(s =>
      (s.label_confidence || 0) >= optimal.threshold
    );

    const buySignals = qualifiedSignals.filter(s => s.label === 'BUY');
    const sellSignals = qualifiedSignals.filter(s => s.label === 'SELL');

    const buyWins = buySignals.filter(s => s.trade_outcome === 'WIN').length;
    const sellWins = sellSignals.filter(s => s.trade_outcome === 'WIN').length;

    const buyStats = {
      count: buySignals.length,
      winrate: buySignals.length > 0 ? (buyWins / buySignals.length) * 100 : 0,
      avgPips: buySignals.length > 0
        ? buySignals.reduce((sum, s) => {
            const pips = s.trade_outcome === 'WIN' ? (s.win_pips || 0) : -(s.loss_pips || 0);
            return sum + pips;
          }, 0) / buySignals.length
        : 0
    };

    const sellStats = {
      count: sellSignals.length,
      winrate: sellSignals.length > 0 ? (sellWins / sellSignals.length) * 100 : 0,
      avgPips: sellSignals.length > 0
        ? sellSignals.reduce((sum, s) => {
            const pips = s.trade_outcome === 'WIN' ? (s.win_pips || 0) : -(s.loss_pips || 0);
            return sum + pips;
          }, 0) / sellSignals.length
        : 0
    };

    // Save to optimization_history table
    const optimizationRecord = {
      timestamp: new Date().toISOString(),
      optimal_threshold: optimal.threshold,
      performance_winrate: optimal.winrate,
      performance_avg_pips: optimal.avgPips,
      qualified_signals: optimal.signals,
      total_signals: signals.length,
      buy_count: buyStats.count,
      buy_winrate: buyStats.winrate,
      buy_avg_pips: buyStats.avgPips,
      sell_count: sellStats.count,
      sell_winrate: sellStats.winrate,
      sell_avg_pips: sellStats.avgPips,
      all_thresholds: results,
      active: true
    };

    // Deactivate previous optimizations
    await supabase
      .from('weight_optimization_history')
      .update({ active: false })
      .eq('active', true);

    // Insert new optimization
    const { error: insertError } = await supabase
      .from('weight_optimization_history')
      .insert(optimizationRecord);

    if (insertError) {
      console.error('[Monthly Optimization] Error saving:', insertError);
    } else {
      console.log('[Monthly Optimization] Saved to database');
    }

    return new Response(
      JSON.stringify({
        success: true,
        optimal_threshold: optimal.threshold,
        performance: {
          winrate: optimal.winrate,
          avg_pips: optimal.avgPips,
          qualified_signals: optimal.signals,
          total_signals: signals.length
        },
        by_direction: {
          BUY: buyStats,
          SELL: sellStats
        },
        all_thresholds: results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Monthly Optimization] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
