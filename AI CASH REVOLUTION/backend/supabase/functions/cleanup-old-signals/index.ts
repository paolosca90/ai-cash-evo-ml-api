/**
 * Cleanup Old Signals
 *
 * Rimuove segnali vecchi (>30 giorni) e completati per mantenere il DB pulito
 * e performante. Viene eseguito giornalmente via cron job.
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🧹 Starting cleanup of old signals...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Data di cutoff: 30 giorni fa
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    console.log(`📅 Deleting signals older than: ${cutoffDate.toISOString()}`);

    // Elimina SOLO segnali EXPIRED (non TP/SL - quelli servono per il ML!)
    // I segnali con TP_HIT/SL_HIT vengono CONSERVATI come training data
    const { data: deletedSignals, error } = await supabase
      .from('collective_signals')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .eq('status', 'EXPIRED') // Solo expired, NON TP_HIT/SL_HIT!
      .select();

    if (error) {
      console.error('❌ Error deleting old signals:', error);
      throw error;
    }

    const deletedCount = deletedSignals?.length || 0;
    console.log(`✅ Cleanup completed: ${deletedCount} old signals deleted`);

    // Conta segnali rimanenti per tipo
    const { data: stats, error: statsError } = await supabase
      .from('collective_signals')
      .select('status, user_id')
      .is('user_id', null); // Sintetici

    if (statsError) {
      console.error('⚠️ Error fetching stats:', statsError);
    }

    const syntheticCount = stats?.length || 0;
    const openCount = stats?.filter(s => s.status === 'OPEN').length || 0;
    const closedCount = stats?.filter(s => ['TP_HIT', 'SL_HIT'].includes(s.status)).length || 0;

    return new Response(JSON.stringify({
      success: true,
      message: 'Cleanup completed successfully',
      summary: {
        deletedSignals: deletedCount,
        remainingSynthetic: syntheticCount,
        openSignals: openCount,
        closedSignals: closedCount
      },
      cutoffDate: cutoffDate.toISOString(),
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

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
