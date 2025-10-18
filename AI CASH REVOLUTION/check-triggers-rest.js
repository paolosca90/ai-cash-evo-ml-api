/**
 * Check for database triggers using REST API approach
 */

const SUPABASE_URL = 'https://rvopmdflnecyrwrzhyfy.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2b3BtZGZsbmVjeXJ3cnpoeWZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODU0Nzg4NCwiZXhwIjoyMDc0MTIzODg0fQ.SopBfRPsnDNEOuje4BUtmplVKU1awpiZes0wlQCKugA';

async function checkTriggersViaREST() {
  console.log('🔍 CHECKING FOR TRIGGERS USING REST API\n');

  try {
    // 1. Check recent signals
    console.log('1️⃣ Checking recent signals...');
    const response = await fetch(`${SUPABASE_URL}/rest/v1/mt5_signals?order=created_at.desc&limit=5`, {
      method: 'GET',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const recentSignals = await response.json();
    console.log(`Found ${recentSignals.length} recent signals:`);
    recentSignals.forEach((signal, index) => {
      console.log(`${index + 1}. ID: ${signal.id}, Sent: ${signal.sent}, Processed: ${signal.processed}, Symbol: ${signal.symbol}`);
    });

    // 2. Create test signal with sent=false
    console.log('\n2️⃣ Creating test signal with sent=false...');

    const testSignal = {
      client_id: 'trigger_test@example.com',
      user_id: '00000000-0000-0000-0000-000000000000',
      symbol: 'EURUSD',
      signal: 'BUY',
      confidence: 90,
      entry: 1.0850,
      stop_loss: 1.0800,
      take_profit: 1.0900,
      risk_amount: 100,
      timestamp: new Date().toISOString(),
      ai_analysis: '🔍 TRIGGER TEST - Monitor when sent field changes - ' + new Date().toISOString(),
      sent: false,
      processed: false,
      status: 'pending',
      created_at: new Date().toISOString(),
      eurusd_rate: 1.0850
    };

    const createResponse = await fetch(`${SUPABASE_URL}/rest/v1/mt5_signals`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(testSignal)
    });

    if (!createResponse.ok) {
      throw new Error(`Create failed: ${await createResponse.text()}`);
    }

    const createdSignal = await createResponse.json();
    const signalId = createdSignal[0].id;
    console.log(`✅ Test signal created: ${signalId}`);
    console.log(`   Initial sent value: ${createdSignal[0].sent}`);

    // 3. Monitor for changes
    console.log('\n3️⃣ Monitoring signal for automatic changes (15 seconds)...');

    let changedAt = null;
    let initialSent = createdSignal[0].sent;

    for (let i = 1; i <= 15; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/mt5_signals?id=eq.${signalId}&select=sent,processed,created_at,ai_analysis`, {
        method: 'GET',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
        }
      });

      if (!checkResponse.ok) {
        console.log(`❌ Check ${i}s failed: ${checkResponse.status}`);
        continue;
      }

      const checkData = await checkResponse.json();
      const currentSignal = checkData[0];

      if (currentSignal && currentSignal.sent !== initialSent) {
        changedAt = i;
        console.log(`🚨 CHANGE DETECTED at ${i} seconds!`);
        console.log(`   Sent changed from ${initialSent} to ${currentSignal.sent}`);
        console.log(`   Processed: ${currentSignal.processed}`);
        console.log(`   Analysis: ${currentSignal.ai_analysis}`);
        break;
      }

      console.log(`${i}s: Sent still ${currentSignal?.sent}, Processed: ${currentSignal?.processed}`);
    }

    if (!changedAt) {
      console.log('✅ No change detected in 15 seconds');
    }

    // 4. Summary and recommendations
    console.log('\n📊 4. INVESTIGATION RESULTS:');
    console.log('===========================');

    if (changedAt) {
      console.log(`🚨 CONFIRMED: Database automatically changes sent=false to sent=true in ${changedAt} seconds`);
      console.log('');
      console.log('🔧 MOST LIKELY CAUSES:');
      console.log('   1. Database TRIGGER on mt5_signals table (BEFORE/AFTER INSERT)');
      console.log('   2. RLS POLICY that modifies data on insert');
      console.log('   3. Generated column definition');
      console.log('   4. Database function called automatically');
      console.log('');
      console.log('🎯 IMMEDIATE ACTIONS NEEDED:');
      console.log('   1. Login to Supabase Dashboard');
      console.log('   2. Go to Database → Triggers section');
      console.log('   3. Look for triggers on mt5_signals table');
      console.log('   4. Check trigger function definitions');
      console.log('   5. Go to Authentication → Policies');
      console.log('   6. Look for RLS policies that might modify data');
      console.log('');
      console.log('⚠️  CRITICAL FOR TRADING SYSTEM:');
      console.log('   • MT5 EA cannot receive signals because they appear as sent=true');
      console.log('   • This blocks all automated trading functionality');
      console.log('   • The trigger/policy needs to be disabled immediately');

    } else {
      console.log('✅ No immediate change detected');
      console.log('   • Trigger may be disabled already');
      console.log('   • Or only fires under specific conditions');
      console.log('   • Or change happens after longer delay');
    }

    console.log('\n💡 ALTERNATIVE SOLUTIONS:');
    console.log('   1. Create new column: sent_to_ea (boolean)');
    console.log('   2. Modify EA to check sent_to_ea = false');
    console.log('   3. Set sent_to_ea = true when EA processes signal');
    console.log('   4. Keep original sent column for other purposes');
    console.log('');
    console.log('   5. Or use processed field instead of sent field');
    console.log('   6. Or create a custom timestamp field');

    console.log(`\n📋 Test signal info:`);
    console.log(`   Signal ID: ${signalId}`);
    console.log(`   Final status: ${changedAt ? 'sent changed to true (PROBLEMATIC)' : 'sent stayed false (GOOD)'}`);
    console.log(`   Check this signal in Supabase Dashboard`);

  } catch (error) {
    console.error('❌ Error during investigation:', error.message);
  }
}

checkTriggersViaREST();