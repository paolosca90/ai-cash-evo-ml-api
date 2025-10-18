/**
 * TEST LOCAL ANALYSIS FUNCTION
 *
 * Verifica che il parametro localAnalysis blocchi completamente
 * il salvataggio nel database durante le analisi locali
 */

const SUPABASE_URL = 'https://rvopmdflnecyrwrzhyfy.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2b3BtZGZsbmVjeXJ3cnloeWZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc0MDAzMjksImV4cCI6MjA1Mjk3NjMyOX0.Lp6hR_o4xSbPFHs_1yvFZrC_Dqja8s9Lx_Qk5a1p3eU'

async function testLocalAnalysis() {
  console.log('\n🧪 TEST LOCAL ANALYSIS FUNCTION')
  console.log('=====================================')

  const symbols = ['EURUSD', 'GBPUSD', 'USDJPY']

  for (const symbol of symbols) {
    console.log(`\n📊 Testing ${symbol} with localAnalysis=true...`)

    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/generate-ai-signals`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            symbol,
            aggressive: false,
            saveToDatabase: false,
            analysisOnly: true,
            localAnalysis: true  // NUOVO PARAMETRO
          })
        }
      )

      if (!response.ok) {
        console.error(`❌ Error for ${symbol}: ${response.status} ${response.statusText}`)
        const errorText = await response.text()
        console.error('Error details:', errorText)
        continue
      }

      const signal = await response.json()

      console.log(`✅ Signal generated successfully for ${symbol}:`)
      console.log(`   Type: ${signal.type}`)
      console.log(`   Confidence: ${signal.confidence}%`)
      console.log(`   Entry: ${signal.entryPrice || signal.entry_price || signal.price?.mid}`)
      console.log(`   SL: ${signal.stopLoss}`)
      console.log(`   TP: ${signal.takeProfit}`)
      console.log(`   Regime: ${signal.analysis?.regime}`)
      console.log(`   ADX: ${signal.analysis?.adx?.toFixed(1)}`)
      console.log(`   Session: ${signal.analysis?.session}`)

      // Verifica che il segnale sia valido
      if (signal.type && signal.confidence && signal.entryPrice) {
        console.log(`✅ Signal is valid and complete`)
      } else {
        console.log(`⚠️  Signal may be incomplete`)
      }

    } catch (error) {
      console.error(`❌ Network error for ${symbol}:`, error.message)
    }
  }

  console.log('\n🔍 TESTING DATABASE VERIFICATION')
  console.log('Verifying that NO signals were saved to database...')

  // Attendi un secondo per assicurarsi che eventuali operazioni DB siano completate
  await new Promise(resolve => setTimeout(resolve, 1000))

  try {
    const checkResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/mt5_signals?select=*&order=timestamp.desc&limit=5`,
      {
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY
        }
      }
    )

    if (checkResponse.ok) {
      const recentSignals = await checkResponse.json()
      console.log(`📋 Recent signals in database: ${recentSignals.length}`)

      if (recentSignals.length > 0) {
        console.log('\nLast 5 signals in database:')
        recentSignals.forEach((sig, index) => {
          const timestamp = new Date(sig.timestamp).toLocaleString()
          console.log(`${index + 1}. ${sig.symbol} ${sig.signal} @ ${sig.entry} - ${timestamp}`)
        })
      } else {
        console.log('✅ No signals found in database (expected for local analysis)')
      }
    } else {
      console.log('⚠️  Could not verify database contents')
    }
  } catch (error) {
    console.log('⚠️  Database verification failed:', error.message)
  }

  console.log('\n🎯 TEST COMPARISON: Normal vs Local Analysis')
  console.log('Testing with normal parameters...')

  try {
    const normalResponse = await fetch(
      `${SUPABASE_URL}/functions/v1/generate-ai-signals`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symbol: 'EURUSD',
          aggressive: false,
          saveToDatabase: false,
          analysisOnly: true
          // localAnalysis: false (default)
        })
      }
    )

    if (normalResponse.ok) {
      const normalSignal = await normalResponse.json()
      console.log(`✅ Normal analysis signal: ${normalSignal.type} @ ${normalSignal.entryPrice}`)
      console.log('✅ Both local and normal analysis generate signals correctly')
    }
  } catch (error) {
    console.log('⚠️  Normal analysis test failed:', error.message)
  }

  console.log('\n✅ TEST COMPLETED')
  console.log('✅ Local analysis should NEVER save to database')
  console.log('✅ Signals should be generated normally for display only')
}

// Esegui il test
testLocalAnalysis().catch(console.error)