/**
 * EDGE FUNCTION: Pulizia Automatica Segnali Vecchi
 *
 * Questa funzione viene eseguita automaticamente ogni 10 minuti tramite cron job
 * per pulire segnali vecchi che potrebbero causare esecuzioni inattese.
 *
 * COSA FA:
 * 1. Elimina segnali con sent=false più vecchi di 10 minuti
 * 2. Marca come processed=true segnali anomali (sent=true, processed=false, >30 min)
 *
 * CRON JOB: Configurare in Supabase Dashboard:
 * Schedule: every 10 minutes
 * URL: https://YOUR_PROJECT.supabase.co/functions/v1/cleanup-old-signals-auto
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🧹 [AUTO CLEANUP] Starting automatic signal cleanup...');

    const results = {
      oldSignalsDeleted: 0,
      anomalousSignalsFixed: 0,
      timestamp: new Date().toISOString(),
      success: true,
      message: ''
    };

    // 1. Elimina segnali vecchi non inviati (sent=false, >10 minuti)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const { data: oldSignals, error: queryError } = await supabase
      .from('mt5_signals')
      .select('id, symbol, signal, client_id')
      .eq('sent', false)
      .lt('created_at', tenMinutesAgo);

    if (queryError) {
      throw new Error(`Query error: ${queryError.message}`);
    }

    if (oldSignals && oldSignals.length > 0) {
      console.log(`📊 Found ${oldSignals.length} old unsent signals to delete`);

      const signalIds = oldSignals.map(s => s.id);
      const { error: deleteError } = await supabase
        .from('mt5_signals')
        .delete()
        .in('id', signalIds);

      if (deleteError) {
        console.error(`⚠️ Delete error: ${deleteError.message}`);
      } else {
        results.oldSignalsDeleted = oldSignals.length;
        console.log(`✅ Deleted ${oldSignals.length} old signals`);
      }
    } else {
      console.log('✅ No old signals to delete');
    }

    // 2. Marca segnali anomali (sent=true, processed=false, >30 minuti)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    const { data: anomalousSignals, error: anomalyError } = await supabase
      .from('mt5_signals')
      .select('id, symbol, signal, client_id')
      .eq('sent', true)
      .eq('processed', false)
      .lt('created_at', thirtyMinutesAgo);

    if (anomalyError) {
      console.warn(`⚠️ Anomaly query error: ${anomalyError.message}`);
    } else if (anomalousSignals && anomalousSignals.length > 0) {
      console.log(`📊 Found ${anomalousSignals.length} anomalous signals to fix`);

      const signalIds = anomalousSignals.map(s => s.id);
      const { error: updateError } = await supabase
        .from('mt5_signals')
        .update({ processed: true })
        .in('id', signalIds);

      if (updateError) {
        console.warn(`⚠️ Update error: ${updateError.message}`);
      } else {
        results.anomalousSignalsFixed = anomalousSignals.length;
        console.log(`✅ Fixed ${anomalousSignals.length} anomalous signals`);
      }
    } else {
      console.log('✅ No anomalous signals to fix');
    }

    // 3. Statistiche finali
    const { data: stats } = await supabase
      .from('mt5_signals')
      .select('id, sent, processed')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // Ultima ora

    const totalLastHour = stats?.length || 0;
    const pendingLastHour = stats?.filter(s => !s.sent).length || 0;
    const unprocessedLastHour = stats?.filter(s => s.sent && !s.processed).length || 0;

    results.message = `Cleanup completed: ${results.oldSignalsDeleted} deleted, ${results.anomalousSignalsFixed} fixed. Last hour stats: ${totalLastHour} total, ${pendingLastHour} pending, ${unprocessedLastHour} unprocessed.`;

    console.log(`📊 Stats last hour: ${totalLastHour} total, ${pendingLastHour} pending, ${unprocessedLastHour} unprocessed`);
    console.log('✅ [AUTO CLEANUP] Cleanup completed successfully');

    return new Response(
      JSON.stringify(results),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ [AUTO CLEANUP] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
