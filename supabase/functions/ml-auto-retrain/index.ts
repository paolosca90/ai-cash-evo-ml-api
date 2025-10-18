/**
 * ML Auto Retrain Cron Job
 *
 * Eseguito ogni 6 ore per:
 * 1. Controllare se ci sono abbastanza nuovi segnali chiusi
 * 2. Triggare il retraining ML per ogni contesto (symbol, session, regime)
 * 3. Loggare i risultati
 *
 * Cron schedule: every 6 hours
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TrainingContext {
  symbol: string;
  session: string;
  regime: string;
  closedSignalsCount: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🤖 ML Auto Retrain Cron Job Started');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Trova tutti i contesti unici con segnali chiusi
    const { data: contexts, error: contextsError } = await supabase
      .from('collective_signals')
      .select('symbol, session, regime')
      .in('status', ['TP_HIT', 'SL_HIT'])
      .order('created_at', { ascending: false })
      .limit(1000);

    if (contextsError) {
      throw contextsError;
    }

    if (!contexts || contexts.length === 0) {
      console.log('⚠️ No closed signals found for training');
      return new Response(JSON.stringify({
        success: true,
        message: 'No training needed - no closed signals',
        trained: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 2. Raggruppa per contesto unico
    const uniqueContexts = new Map<string, TrainingContext>();

    for (const ctx of contexts) {
      const key = `${ctx.symbol}|${ctx.session}|${ctx.regime}`;
      if (!uniqueContexts.has(key)) {
        uniqueContexts.set(key, {
          symbol: ctx.symbol,
          session: ctx.session,
          regime: ctx.regime,
          closedSignalsCount: 1
        });
      } else {
        const existing = uniqueContexts.get(key)!;
        existing.closedSignalsCount++;
      }
    }

    console.log(`📊 Found ${uniqueContexts.size} unique contexts for potential training`);

    // 3. Controlla quali contesti hanno abbastanza dati (min 50 segnali)
    const trainingResults = [];
    let trained = 0;
    let skipped = 0;

    for (const [key, context] of uniqueContexts) {
      // Conta segnali chiusi per questo contesto specifico
      const { count, error: countError } = await supabase
        .from('collective_signals')
        .select('*', { count: 'exact', head: true })
        .eq('symbol', context.symbol)
        .eq('session', context.session)
        .eq('regime', context.regime)
        .in('status', ['TP_HIT', 'SL_HIT']);

      if (countError) {
        console.error(`❌ Error counting signals for ${key}:`, countError);
        continue;
      }

      const totalClosedSignals = count || 0;

      console.log(`📈 ${key}: ${totalClosedSignals} closed signals`);

      if (totalClosedSignals < 50) {
        console.log(`⏭️ Skipping ${key} - not enough data (need 50, have ${totalClosedSignals})`);
        skipped++;
        continue;
      }

      // 4. Controlla se è passato abbastanza tempo dall'ultimo training (min 6 ore)
      const { data: lastTraining } = await supabase
        .from('ml_weight_optimization')
        .select('last_training')
        .eq('symbol', context.symbol)
        .eq('session', context.session)
        .eq('regime', context.regime)
        .single();

      if (lastTraining?.last_training) {
        const lastTrainingTime = new Date(lastTraining.last_training).getTime();
        const now = Date.now();
        const hoursSinceLastTraining = (now - lastTrainingTime) / (1000 * 60 * 60);

        if (hoursSinceLastTraining < 6) {
          console.log(`⏭️ Skipping ${key} - trained ${hoursSinceLastTraining.toFixed(1)}h ago (need 6h)`);
          skipped++;
          continue;
        }
      }

      // 5. Trigger ML optimizer
      console.log(`🚀 Triggering ML optimization for ${key} (${totalClosedSignals} signals)...`);

      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/ml-weight-optimizer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({
            symbol: context.symbol,
            session: context.session,
            regime: context.regime,
            method: 'gradient_descent'
          })
        });

        const result = await response.json();

        if (result.success) {
          console.log(`✅ Training completed for ${key}`);
          console.log(`   Win Rate: ${result.metrics.before.winRate} → ${result.metrics.after.winRate}`);
          console.log(`   Loss: ${result.metrics.before.loss} → ${result.metrics.after.loss}`);

          trainingResults.push({
            context: key,
            success: true,
            metrics: result.metrics,
            duration: result.training.duration
          });

          trained++;
        } else {
          console.error(`❌ Training failed for ${key}:`, result.error);
          trainingResults.push({
            context: key,
            success: false,
            error: result.error
          });
        }
      } catch (err) {
        console.error(`❌ Error calling ML optimizer for ${key}:`, err);
        trainingResults.push({
          context: key,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }

      // Rate limiting: pausa 2 secondi tra training
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`✅ Auto retrain complete: ${trained} trained, ${skipped} skipped`);

    return new Response(JSON.stringify({
      success: true,
      message: 'ML auto retrain completed',
      summary: {
        totalContexts: uniqueContexts.size,
        trained,
        skipped,
        failed: trainingResults.filter(r => !r.success).length
      },
      results: trainingResults,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Auto retrain error:', error);

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
