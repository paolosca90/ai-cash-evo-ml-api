/**
 * Test diretto per verificare il comportamento del trigger
 */

const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2b3BtZGZsbmVjeXJ3cnpoeWZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NDc4ODQsImV4cCI6MjA3NDEyMzg4NH0.snlFF1ChbYsA765gXE-cMGb11jHIaF2np_pNxIGLgW8';

async function testTriggerBehavior() {
  console.log('🔍 TEST COMPLETO DEL COMPORTAMENTO TRIGGER\n');

  try {
    // 1. Verifica segnali recenti con anon key
    console.log('1️⃣ Verifica segnali recenti...');
    const recentResponse = await fetch('https://rvopmdflnecyrwrzhyfy.supabase.co/rest/v1/mt5_signals?order=created_at.desc&limit=3', {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`
      }
    });

    if (recentResponse.ok) {
      const signals = await recentResponse.json();
      console.log(`   ✅ Trovati ${signals.length} segnali recenti:`);
      signals.forEach((s, i) => {
        console.log(`   ${i+1}. ${s.symbol} ${s.signal} - sent: ${s.sent}, processed: ${s.processed}`);
      });
    } else {
      console.log('   ❌ Errore query segnali:', await recentResponse.text());
      return;
    }

    // 2. Crea un segnale di test usando il backend (che ha service role)
    console.log('\n2️⃣ Creazione segnale di test via backend...');
    const testResponse = await fetch('https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1/mt5-trade-signals?email=paoloscardia@gmail.com', {
      method: 'POST',
      headers: {
        'apikey': ANON_KEY,
        'Content-Type': 'application/json',
        'x-user-email': 'paoloscardia@gmail.com'
      },
      body: JSON.stringify({
        symbol: 'EURUSD',
        signal: 'BUY',
        entry: 1.08500,
        stopLoss: 1.08000,
        takeProfit: 1.09000,
        confidence: 85,
        riskAmount: 50
      })
    });

    if (testResponse.ok) {
      const testResult = await testResponse.json();
      console.log(`   ✅ Segnale di test creato: ${testResult.signal_id?.slice(0,8)}...`);
    } else {
      console.log('   ❌ Errore creazione test:', await testResponse.text());
      return;
    }

    // 3. Attendi 2 secondi e controlla se l'EA può vederlo
    console.log('\n3️⃣ Attesa 2 secondi per verificare comportamento trigger...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 4. Controlla se l'EA può vedere il segnale
    console.log('4️⃣ Test EA endpoint per vedere se segnale è visibile...');
    const eaResponse = await fetch('https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1/mt5-trade-signals?email=paoloscardia@gmail.com', {
      headers: {
        'apikey': ANON_KEY,
        'x-user-email': 'paoloscardia@gmail.com'
      }
    });

    if (eaResponse.ok) {
      const eaData = await eaResponse.json();
      console.log(`   EA Response: success=${eaData.success}, count=${eaData.count}`);

      if (eaData.count > 0) {
        console.log('   ✅ EA VED IL SEGNALE - il trigger NON lo ha cambiato!');
        console.log('   Dettagli segnale EA:');
        eaData.signals.forEach((s, i) => {
          console.log(`     ${i+1}. ${s.symbol} ${s.action} @ ${s.entry}`);
          console.log(`        SL: ${s.stopLoss}, TP: ${s.takeProfit}`);
        });
      } else {
        console.log('   ❌ EA NON VEDE IL SEGNALE - il trigger l\'ha cambiato a sent=true');
      }
    }

    // 5. Soluzione alternativa: usa un campo diverso
    console.log('\n5️⃣ Proposta soluzione alternativa...');
    console.log('   Se il trigger non può essere disabilitato, posso:');
    console.log('   1. Aggiungere colonna "sent_to_ea" al database');
    console.log('   2. Modificare EA per cercare sent_to_ea = false');
    console.log('   3. Impostare sent_to_ea = true quando EA processa il segnale');

    console.log('\n📋 RIEPILOGO:');
    console.log('=============');
    console.log('Il problema è stato identificato come trigger del database.');
    console.log('Per risolvere permanentemente:');
    console.log('1. Vai a https://supabase.com/dashboard/project/rvopmdflnecyrwrzhyfy');
    console.log('2. Database → Triggers');
    console.log('3. Cerca trigger su mt5_signals');
    console.log('4. Disabilita o elimina il trigger che imposta sent=true');

  } catch (error) {
    console.error('❌ Errore durante test:', error.message);
  }
}

testTriggerBehavior();