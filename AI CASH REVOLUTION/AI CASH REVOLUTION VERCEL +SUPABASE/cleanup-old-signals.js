/**
 * Script di pulizia segnali MT5 vecchi
 *
 * Questo script pulisce i segnali che:
 * 1. Hanno sent=false e sono più vecchi di 10 minuti (non saranno mai eseguiti)
 * 2. Hanno processed=false e sent=true (anomalia - già inviati ma non processati)
 *
 * USO:
 * - node cleanup-old-signals.js --dry-run  (mostra cosa verrà eliminato senza eliminare)
 * - node cleanup-old-signals.js            (elimina effettivamente)
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://rvopmdflnecyrwrzhyfy.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2b3BtZGZsbmVjeXJ3cnpoeWZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODU0Nzg4NCwiZXhwIjoyMDc0MTIzODg0fQ.SopBfRPsnDNEOuje4BUtmplVKu1awpiZes0wlQCKugA';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Verifica se è modalità dry-run
const isDryRun = process.argv.includes('--dry-run');

console.log(`🧹 PULIZIA SEGNALI MT5 VECCHI ${isDryRun ? '(DRY RUN - Nessuna modifica effettiva)' : ''}\n`);

async function cleanupOldSignals() {
  try {
    // 1. Trova segnali vecchi con sent=false (più vecchi di 10 minuti)
    console.log('📊 1. RICERCA SEGNALI VECCHI NON INVIATI (sent=false, >10 min)');
    console.log('─'.repeat(70));

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: oldUnsentSignals, error: queryError } = await supabase
      .from('mt5_signals')
      .select('id, client_id, symbol, signal, entry, created_at, sent, processed')
      .eq('sent', false)
      .lt('created_at', tenMinutesAgo)
      .order('created_at', { ascending: false });

    if (queryError) {
      throw new Error(`Errore query: ${queryError.message}`);
    }

    const oldCount = oldUnsentSignals?.length || 0;
    console.log(`Trovati ${oldCount} segnali vecchi da pulire\n`);

    if (oldCount > 0) {
      console.log('Dettagli segnali da eliminare:');
      oldUnsentSignals.forEach((s, idx) => {
        const age = Math.round((Date.now() - new Date(s.created_at).getTime()) / 60000);
        console.log(`  ${idx+1}. ${s.symbol} ${s.signal} @ ${s.entry} | Client: ${s.client_id} | Age: ${age} min`);
        console.log(`     ID: ${s.id} | Created: ${new Date(s.created_at).toLocaleString()}`);
      });
      console.log('');

      if (!isDryRun) {
        const signalIds = oldUnsentSignals.map(s => s.id);
        const { error: deleteError } = await supabase
          .from('mt5_signals')
          .delete()
          .in('id', signalIds);

        if (deleteError) {
          throw new Error(`Errore eliminazione: ${deleteError.message}`);
        }

        console.log(`✅ ${oldCount} segnali vecchi eliminati con successo!`);
      } else {
        console.log(`🔍 [DRY RUN] Sarebbero stati eliminati ${oldCount} segnali`);
      }
    } else {
      console.log('✅ Nessun segnale vecchio da pulire!');
    }

    // 2. Trova segnali anomali (sent=true, processed=false, >30 min)
    console.log('\n📊 2. RICERCA SEGNALI ANOMALI (sent=true, processed=false, >30 min)');
    console.log('─'.repeat(70));

    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: anomalousSignals, error: anomalyError } = await supabase
      .from('mt5_signals')
      .select('id, client_id, symbol, signal, entry, created_at, sent, processed')
      .eq('sent', true)
      .eq('processed', false)
      .lt('created_at', thirtyMinutesAgo)
      .order('created_at', { ascending: false });

    if (anomalyError) {
      console.warn(`⚠️  Errore query anomalie: ${anomalyError.message}`);
    } else {
      const anomalyCount = anomalousSignals?.length || 0;
      console.log(`Trovati ${anomalyCount} segnali anomali\n`);

      if (anomalyCount > 0) {
        console.log('⚠️  Questi segnali sono stati marcati come sent=true ma mai processati dall\'EA:');
        anomalousSignals.forEach((s, idx) => {
          const age = Math.round((Date.now() - new Date(s.created_at).getTime()) / 60000);
          console.log(`  ${idx+1}. ${s.symbol} ${s.signal} @ ${s.entry} | Client: ${s.client_id} | Age: ${age} min`);
          console.log(`     ID: ${s.id}`);
        });
        console.log('');

        if (!isDryRun) {
          // Invece di eliminarli, li marca come processed per sicurezza
          const signalIds = anomalousSignals.map(s => s.id);
          const { error: updateError } = await supabase
            .from('mt5_signals')
            .update({ processed: true })
            .in('id', signalIds);

          if (updateError) {
            console.warn(`⚠️  Errore aggiornamento: ${updateError.message}`);
          } else {
            console.log(`✅ ${anomalyCount} segnali anomali marcati come processed=true`);
          }
        } else {
          console.log(`🔍 [DRY RUN] Sarebbero stati marcati come processed=true ${anomalyCount} segnali`);
        }
      } else {
        console.log('✅ Nessun segnale anomalo trovato!');
      }
    }

    // 3. Statistiche finali
    console.log('\n📊 3. STATISTICHE FINALI');
    console.log('─'.repeat(70));

    const { data: currentSignals, error: statsError } = await supabase
      .from('mt5_signals')
      .select('id, sent, processed')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (statsError) {
      console.warn(`⚠️  Errore query statistiche: ${statsError.message}`);
    } else {
      const total = currentSignals?.length || 0;
      const pending = currentSignals?.filter(s => !s.sent).length || 0;
      const sentNotProcessed = currentSignals?.filter(s => s.sent && !s.processed).length || 0;
      const fullyProcessed = currentSignals?.filter(s => s.sent && s.processed).length || 0;

      console.log('Segnali ultime 24 ore:');
      console.log(`  • Totale: ${total}`);
      console.log(`  • Pending (sent=false): ${pending}`);
      console.log(`  • Inviati ma non processati: ${sentNotProcessed}`);
      console.log(`  • Completamente processati: ${fullyProcessed}`);
    }

    console.log('\n' + '═'.repeat(70));
    console.log(`✅ PULIZIA COMPLETATA ${isDryRun ? '(DRY RUN - Nessuna modifica effettuata)' : ''}`);
    console.log('═'.repeat(70));

    if (isDryRun) {
      console.log('\n💡 Per eseguire effettivamente la pulizia, esegui:');
      console.log('   node cleanup-old-signals.js');
    }

  } catch (error) {
    console.error('\n❌ Errore durante la pulizia:', error);
    process.exit(1);
  }
}

// Esegui pulizia
cleanupOldSignals()
  .then(() => {
    console.log('\n✅ Script completato con successo');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Errore fatale:', error);
    process.exit(1);
  });
