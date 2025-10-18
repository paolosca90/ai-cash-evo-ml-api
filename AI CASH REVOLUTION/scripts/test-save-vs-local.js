/**
 * TEST SAVE VS LOCAL ANALYSIS CONFLICT
 *
 * Verifica che localAnalysis abbia la precedenza su saveToDatabase
 */

const SUPABASE_URL = 'https://rvopmdflnecyrwrzhyfy.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2b3BtZGZsbmVjeXJ3cnloeWZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc0MDAzMjksImV4cCI6MjA1Mjk3NjMyOX0.Lp6hR_o4xSbPFHs_1yvFZrC_Dqja8s9Lx_Qk5a1p3eU'

async function testSaveVsLocal() {
  console.log('\n🔬 TEST SAVE VS LOCAL ANALYSIS CONFLICT')
  console.log('==========================================')

  console.log('\n🧪 Test 1: saveToDatabase: true, localAnalysis: false (SHOULD SAVE)')
  try {
    const response1 = await fetch(
      `${SUPABASE_URL}/functions/v1/generate-ai-signals`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symbol: 'AUDUSD',
          saveToDatabase: true,
          analysisOnly: false,
          localAnalysis: false
        })
      }
    )

    if (response1.ok) {
      const signal1 = await response1.json()
      console.log(`✅ Signal 1: ${signal1.type} @ ${signal1.entryPrice}`)
      console.log('   This signal SHOULD be saved to database')
    } else {
      console.log('❌ Test 1 failed:', response1.status)
    }
  } catch (error) {
    console.log('❌ Test 1 error:', error.message)
  }

  console.log('\n🧪 Test 2: saveToDatabase: true, localAnalysis: true (SHOULD NOT SAVE)')
  try {
    const response2 = await fetch(
      `${SUPABASE_URL}/functions/v1/generate-ai-signals`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symbol: 'NZDUSD',
          saveToDatabase: true,
          analysisOnly: false,
          localAnalysis: true  // DOVREBBE BLOCCARE IL SALVATAGGIO
        })
      }
    )

    if (response2.ok) {
      const signal2 = await response2.json()
      console.log(`✅ Signal 2: ${signal2.type} @ ${signal2.entryPrice}`)
      console.log('   This signal should NOT be saved (localAnalysis blocks save)')
    } else {
      console.log('❌ Test 2 failed:', response2.status)
    }
  } catch (error) {
    console.log('❌ Test 2 error:', error.message)
  }

  console.log('\n🧪 Test 3: saveToDatabase: false, localAnalysis: true (SHOULD NOT SAVE)')
  try {
    const response3 = await fetch(
      `${SUPABASE_URL}/functions/v1/generate-ai-signals`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symbol: 'EURCAD',
          saveToDatabase: false,
          analysisOnly: true,
          localAnalysis: true
        })
      }
    )

    if (response3.ok) {
      const signal3 = await response3.json()
      console.log(`✅ Signal 3: ${signal3.type} @ ${signal3.entryPrice}`)
      console.log('   This signal should NOT be saved (both params prevent saving)')
    } else {
      console.log('❌ Test 3 failed:', response3.status)
    }
  } catch (error) {
    console.log('❌ Test 3 error:', error.message)
  }

  console.log('\n🧪 Test 4: All default parameters (should NOT save)')
  try {
    const response4 = await fetch(
      `${SUPABASE_URL}/functions/v1/generate-ai-signals`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symbol: 'CHFJPY'
          // No parameters - defaults: saveToDatabase: false, analysisOnly: true, localAnalysis: false
        })
      }
    )

    if (response4.ok) {
      const signal4 = await response4.json()
      console.log(`✅ Signal 4: ${signal4.type} @ ${signal4.entryPrice}`)
      console.log('   This signal should NOT be saved (defaults prevent saving)')
    } else {
      console.log('❌ Test 4 failed:', response4.status)
    }
  } catch (error) {
    console.log('❌ Test 4 error:', error.message)
  }

  console.log('\n🔍 CHECKING DATABASE STATE...')

  // Attendi per assicurarsi che le operazioni siano completate
  await new Promise(resolve => setTimeout(resolve, 2000))

  try {
    const checkResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/mt5_signals?select=*&order=timestamp.desc&limit=10`,
      {
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY
        }
      }
    )

    if (checkResponse.ok) {
      const recentSignals = await checkResponse.json()
      console.log(`\n📋 Recent signals in database: ${recentSignals.length}`)

      if (recentSignals.length > 0) {
        console.log('\nLast 10 signals in database:')
        recentSignals.forEach((sig, index) => {
          const timestamp = new Date(sig.timestamp).toLocaleString()
          console.log(`${index + 1}. ${sig.symbol} ${sig.signal} @ ${sig.entry} - ${timestamp}`)
        })

        // Filtra i segnali dei nostri test
        const testSymbols = ['AUDUSD', 'NZDUSD', 'EURCAD', 'CHFJPY']
        const testSignals = recentSignals.filter(sig => testSymbols.includes(sig.symbol))

        console.log(`\n🔍 Test symbols found in database: ${testSignals.length}`)
        testSignals.forEach((sig, index) => {
          const timestamp = new Date(sig.timestamp).toLocaleString()
          console.log(`${index + 1}. ${sig.symbol} ${sig.signal} @ ${sig.entry} - ${timestamp}`)
        })

        if (testSignals.length === 1 && testSignals[0].symbol === 'AUDUSD') {
          console.log('✅ PERFETTO: Solo AUDUSD è stato salvato (come previsto!)')
          console.log('✅ NZDUSD, EURCAD, CHFJPY NON sono stati salvati (localAnalysis working!)')
        } else if (testSignals.length === 0) {
          console.log('⚠️  NESSUN segnale di test salvato (forse anche AUDUSD è stato bloccato?)')
        } else {
          console.log('❌ ERRORE: Troppi segnali di test salvati!')
        }
      } else {
        console.log('ℹ️  Nessun segnale nel database (potrebbe essere normale se pulito di recente)')
      }
    } else {
      console.log('⚠️  Impossibile verificare il database')
    }
  } catch (error) {
    console.log('⚠️  Verifica database fallita:', error.message)
  }

  console.log('\n✅ TEST COMPLETATO')
  console.log('✅ localAnalysis dovrebbe avere la precedenza assoluta')
  console.log('✅ Solo il Test 1 (AUDUSD) dovrebbe essere salvato')
}

// Esegui il test
testSaveVsLocal().catch(console.error)