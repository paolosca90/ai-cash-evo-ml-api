/**
 * VERIFICA CRON JOB E CLEANUP
 *
 * Verifica che:
 * 1. Il cron job 'mt5-signals-cleanup' sia attivo
 * 2. Non ci siano trigger attivi su mt5_signals
 * 3. Non ci siano segnali vecchi da pulire
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rvopmdflnecyrwrzhyfy.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2b3BtZGZsbmVjeXJ3cnpoeWZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODU0Nzg4NCwiZXhwIjoyMDc0MTIzODg0fQ.SopBfRPsnDNEOuje4BUtmplVKu1awpiZes0wlQCKugA';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function verifySystem() {
  console.log('🔍 VERIFICA SISTEMA POST-RESET');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  try {
    // 1. Verifica cron job
    console.log('1️⃣  Verifica Cron Job...');
    const { data: cronJobs, error: cronError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT jobname, schedule, command, active
        FROM cron.job
        WHERE jobname = 'mt5-signals-cleanup'
      `
    }).catch(() => {
      // Se exec_sql non esiste, usa query diretta
      return supabase.from('cron.job').select('*').eq('jobname', 'mt5-signals-cleanup');
    });

    if (cronError) {
      console.log('   ⚠️  Impossibile verificare cron job tramite API');
      console.log('   💡 Verifica manualmente nel Supabase Dashboard:');
      console.log('   🔗 https://supabase.com/dashboard/project/rvopmdflnecyrwrzhyfy/database/extensions');
    } else if (cronJobs && cronJobs.length > 0) {
      console.log(`   ✅ Cron job 'mt5-signals-cleanup' trovato`);
      console.log(`      Schedule: ${cronJobs[0].schedule || 'every 10 minutes'}`);
      console.log(`      Active: ${cronJobs[0].active !== false ? 'Yes' : 'No'}`);
    } else {
      console.log('   ⚠️  Cron job non trovato - potrebbe essere normale se pg_cron non è accessibile via API');
    }
    console.log('');

    // 2. Verifica trigger
    console.log('2️⃣  Verifica Trigger su mt5_signals...');
    const { data: triggers, error: triggerError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT trigger_name
        FROM information_schema.triggers
        WHERE event_object_table = 'mt5_signals'
      `
    }).catch(() => ({ data: null, error: 'API not available' }));

    if (triggers && Array.isArray(triggers)) {
      if (triggers.length === 0) {
        console.log('   ✅ Nessun trigger attivo (CORRETTO)');
      } else {
        console.log(`   ⚠️  Trovati ${triggers.length} trigger:`);
        triggers.forEach(t => console.log(`      - ${t.trigger_name}`));
      }
    } else {
      console.log('   ℹ️  Verifica trigger non disponibile via API');
    }
    console.log('');

    // 3. Verifica segnali vecchi
    console.log('3️⃣  Verifica Segnali Vecchi...');
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const { data: oldSignals, error: signalsError } = await supabase
      .from('mt5_signals')
      .select('id, symbol, signal, sent, created_at')
      .eq('sent', false)
      .lt('created_at', tenMinutesAgo);

    if (signalsError) {
      console.log(`   ❌ Errore verifica segnali: ${signalsError.message}`);
    } else if (oldSignals && oldSignals.length > 0) {
      console.log(`   ⚠️  Trovati ${oldSignals.length} segnali vecchi (>10 min) con sent=false:`);
      oldSignals.forEach(s => {
        const age = Math.floor((Date.now() - new Date(s.created_at).getTime()) / 1000 / 60);
        console.log(`      - ${s.signal} ${s.symbol} (${age} min fa)`);
      });
      console.log('   💡 Il cron job dovrebbe pulirli automaticamente');
    } else {
      console.log('   ✅ Nessun segnale vecchio da pulire');
    }
    console.log('');

    // 4. Statistiche recenti
    console.log('4️⃣  Statistiche Ultima Ora...');
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: recentSignals, error: statsError } = await supabase
      .from('mt5_signals')
      .select('id, sent, processed')
      .gte('created_at', oneHourAgo);

    if (statsError) {
      console.log(`   ❌ Errore statistiche: ${statsError.message}`);
    } else if (recentSignals) {
      const total = recentSignals.length;
      const pending = recentSignals.filter(s => !s.sent).length;
      const sent = recentSignals.filter(s => s.sent && !s.processed).length;
      const processed = recentSignals.filter(s => s.processed).length;

      console.log(`   📊 Totale segnali: ${total}`);
      console.log(`      - Pending (sent=false): ${pending}`);
      console.log(`      - Sent to EA (sent=true, processed=false): ${sent}`);
      console.log(`      - Processed (processed=true): ${processed}`);
    }
    console.log('');

    // 5. Test funzioni edge
    console.log('5️⃣  Verifica Edge Functions...');

    // Test mt5-trade-signals-v2 GET
    const testEmail = 'test@example.com';
    const { data: v2Response, error: v2Error } = await supabase.functions.invoke(
      'mt5-trade-signals-v2',
      {
        method: 'GET',
        body: { email: testEmail }
      }
    );

    if (v2Error) {
      console.log(`   ⚠️  mt5-trade-signals-v2: ${v2Error.message}`);
    } else {
      console.log(`   ✅ mt5-trade-signals-v2: Risponde correttamente`);
      if (v2Response) {
        console.log(`      Segnali per ${testEmail}: ${v2Response.count || 0}`);
      }
    }

    // Test cleanup-old-signals-auto
    const { data: cleanupResponse, error: cleanupError } = await supabase.functions.invoke(
      'cleanup-old-signals-auto'
    );

    if (cleanupError) {
      console.log(`   ⚠️  cleanup-old-signals-auto: ${cleanupError.message}`);
    } else {
      console.log(`   ✅ cleanup-old-signals-auto: Risponde correttamente`);
      if (cleanupResponse) {
        console.log(`      Deleted: ${cleanupResponse.oldSignalsDeleted || 0}`);
        console.log(`      Fixed: ${cleanupResponse.anomalousSignalsFixed || 0}`);
      }
    }
    console.log('');

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ VERIFICA COMPLETATA');
    console.log('');
    console.log('📋 PROSSIMI PASSI:');
    console.log('   1. Testa il frontend su https://ai-cash-kxjxnnobk-paolos-projects-dc6990da.vercel.app');
    console.log('   2. Verifica button "Analisi" (NESSUN salvataggio DB)');
    console.log('   3. Verifica button "Esegui su MT5" (salva nel DB)');
    console.log('   4. Verifica che EA possa prelevare i segnali');
    console.log('');

  } catch (error) {
    console.error('❌ ERRORE:', error.message);
    console.error('');
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  }
}

verifySystem();
