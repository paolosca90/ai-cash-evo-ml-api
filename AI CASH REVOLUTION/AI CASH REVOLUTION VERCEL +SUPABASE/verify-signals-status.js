/**
 * Script di verifica stato segnali MT5
 *
 * Questo script controlla:
 * 1. Segnali vecchi con sent=false (possibile causa di esecuzioni inattese)
 * 2. Segnali con processed=false
 * 3. Statistiche generali dei segnali
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://rvopmdflnecyrwrzhyfy.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2b3BtZGZsbmVjeXJ3cnpoeWZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODU0Nzg4NCwiZXhwIjoyMDc0MTIzODg0fQ.SopBfRPsnDNEOuje4BUtmplVKu1awpiZes0wlQCKugA';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🔍 VERIFICA STATO SEGNALI MT5\n');

async function verifySignalsStatus() {
  try {
    // 1. Verifica segnali vecchi non inviati (sent=false)
    console.log('📊 1. SEGNALI VECCHI NON INVIATI (sent=false)');
    console.log('─'.repeat(60));

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: oldUnsentSignals, error: oldError } = await supabase
      .from('mt5_signals')
      .select('id, client_id, symbol, signal, entry, created_at, sent, processed')
      .eq('sent', false)
      .lt('created_at', tenMinutesAgo)
      .order('created_at', { ascending: false });

    if (oldError) {
      console.error('❌ Errore query:', oldError.message);
    } else {
      console.log(`Trovati ${oldUnsentSignals?.length || 0} segnali vecchi (>10 min) con sent=false`);
      if (oldUnsentSignals && oldUnsentSignals.length > 0) {
        console.log('⚠️  QUESTI SEGNALI POTREBBERO ESSERE ESEGUITI DALL\'EA!\n');
        oldUnsentSignals.forEach(s => {
          const age = Math.round((Date.now() - new Date(s.created_at).getTime()) / 60000);
          console.log(`   • ID: ${s.id.substring(0, 8)}... | ${s.symbol} ${s.signal} @ ${s.entry}`);
          console.log(`     Client: ${s.client_id} | Age: ${age} minuti | Processed: ${s.processed}`);
        });
      } else {
        console.log('✅ Nessun segnale vecchio trovato - tutto OK!');
      }
    }

    // 2. Verifica segnali non processati (processed=false)
    console.log('\n📊 2. SEGNALI NON PROCESSATI (processed=false)');
    console.log('─'.repeat(60));

    const { data: unprocessedSignals, error: procError } = await supabase
      .from('mt5_signals')
      .select('id, client_id, symbol, signal, entry, created_at, sent, processed')
      .eq('processed', false)
      .order('created_at', { ascending: false })
      .limit(20);

    if (procError) {
      console.error('❌ Errore query:', procError.message);
    } else {
      console.log(`Trovati ${unprocessedSignals?.length || 0} segnali con processed=false (ultimi 20)`);
      if (unprocessedSignals && unprocessedSignals.length > 0) {
        unprocessedSignals.forEach(s => {
          const age = Math.round((Date.now() - new Date(s.created_at).getTime()) / 60000);
          const ageStr = age < 60 ? `${age}m` : `${Math.floor(age/60)}h ${age%60}m`;
          console.log(`   • ${s.symbol} ${s.signal} | Age: ${ageStr} | Sent: ${s.sent} | ID: ${s.id.substring(0, 8)}...`);
        });
      } else {
        console.log('✅ Nessun segnale non processato!');
      }
    }

    // 3. Statistiche generali ultime 24h
    console.log('\n📊 3. STATISTICHE ULTIME 24 ORE');
    console.log('─'.repeat(60));

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentSignals, error: statsError } = await supabase
      .from('mt5_signals')
      .select('id, sent, processed, signal, created_at')
      .gte('created_at', twentyFourHoursAgo);

    if (statsError) {
      console.error('❌ Errore query:', statsError.message);
    } else {
      const total = recentSignals?.length || 0;
      const sent = recentSignals?.filter(s => s.sent).length || 0;
      const processed = recentSignals?.filter(s => s.processed).length || 0;
      const buy = recentSignals?.filter(s => s.signal === 'BUY').length || 0;
      const sell = recentSignals?.filter(s => s.signal === 'SELL').length || 0;

      console.log(`Totale segnali: ${total}`);
      console.log(`  • Inviati (sent=true): ${sent} (${total ? Math.round(sent/total*100) : 0}%)`);
      console.log(`  • Processati (processed=true): ${processed} (${total ? Math.round(processed/total*100) : 0}%)`);
      console.log(`  • BUY: ${buy} | SELL: ${sell}`);
    }

    // 4. Verifica segnali critici (sent=false ma vecchi >5 minuti)
    console.log('\n📊 4. SEGNALI CRITICI (sent=false da >5 minuti)');
    console.log('─'.repeat(60));

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: criticalSignals, error: critError } = await supabase
      .from('mt5_signals')
      .select('id, client_id, symbol, signal, entry, stop_loss, take_profit, created_at, sent, processed')
      .eq('sent', false)
      .lt('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: false });

    if (critError) {
      console.error('❌ Errore query:', critError.message);
    } else {
      console.log(`Trovati ${criticalSignals?.length || 0} segnali critici`);
      if (criticalSignals && criticalSignals.length > 0) {
        console.log('🚨 ATTENZIONE: Questi segnali dovrebbero essere già stati processati dall\'EA!\n');
        criticalSignals.forEach(s => {
          const age = Math.round((Date.now() - new Date(s.created_at).getTime()) / 60000);
          console.log(`   🔴 ${s.symbol} ${s.signal} @ ${s.entry}`);
          console.log(`      SL: ${s.stop_loss} | TP: ${s.take_profit}`);
          console.log(`      Client: ${s.client_id} | Age: ${age} minuti`);
          console.log(`      ID: ${s.id}`);
          console.log('');
        });
        console.log('💡 Suggerimento: Esegui lo script cleanup-old-signals.js per pulire questi segnali');
      } else {
        console.log('✅ Nessun segnale critico - sistema funziona correttamente!');
      }
    }

    console.log('\n' + '═'.repeat(60));
    console.log('✅ VERIFICA COMPLETATA');
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('❌ Errore durante la verifica:', error);
    process.exit(1);
  }
}

// Esegui verifica
verifySignalsStatus()
  .then(() => {
    console.log('\n✅ Script completato con successo');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Errore fatale:', error);
    process.exit(1);
  });
