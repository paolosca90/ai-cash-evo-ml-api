import { createClient } from '@supabase/supabase-js';

// Database connection
const supabaseUrl = 'https://rvopmdflnecyrwrzhyfy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2b3BtZGZsbmVjeXJ3cnpoeWZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODU0Nzg4NCwiZXhwIjoyMDc0MTIzODg0fQ.SopBfRPsnDNEOuje4BUtmplVKU1awpiZes0wlQCKugA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function investigateTriggers() {
  try {
    console.log('🔍 INVESTIGATING DATABASE TRIGGERS AND RLS POLICIES\n');

    // 1. Check recent signals first
    console.log('1️⃣ Checking recent signals...');
    const { data: recentSignals, error: signalsError } = await supabase
      .from('mt5_signals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (signalsError) {
      console.error('❌ Error fetching signals:', signalsError);
      return;
    }

    console.log(`Found ${recentSignals.length} recent signals:`);
    recentSignals.forEach((signal, index) => {
      console.log(`${index + 1}. ID: ${signal.id}, Sent: ${signal.sent}, Processed: ${signal.processed}, Symbol: ${signal.symbol}, Created: ${signal.created_at}`);
    });

    // 2. Create a test signal with sent=false
    console.log('\n2️⃣ Creating test signal with sent=false...');

    const testSignal = {
      client_id: 'test_trigger_investigation@example.com',
      user_id: '00000000-0000-0000-0000-000000000000',
      symbol: 'EURUSD',
      signal: 'BUY',
      confidence: 85,
      entry: 1.0850,
      stop_loss: 1.0800,
      take_profit: 1.0900,
      risk_amount: 100,
      timestamp: new Date().toISOString(),
      ai_analysis: '🔍 TRIGGER INVESTIGATION TEST - Monitor when sent changes - ' + new Date().toISOString(),
      sent: false,
      processed: false,
      status: 'pending',
      created_at: new Date().toISOString(),
      eurusd_rate: 1.0850
    };

    const { data: newSignal, error: createError } = await supabase
      .from('mt5_signals')
      .insert([testSignal])
      .select();

    if (createError) {
      console.error('❌ Error creating test signal:', createError);
      return;
    }

    console.log('✅ Test signal created:', newSignal[0].id);
    console.log(`   Initial sent value: ${newSignal[0].sent}`);

    // 3. Monitor the signal for changes
    console.log('\n3️⃣ Monitoring signal for automatic changes...');

    const signalId = newSignal[0].id;
    let changedAt = null;
    let initialSent = newSignal[0].sent;

    for (let i = 1; i <= 15; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const { data: checkSignal } = await supabase
        .from('mt5_signals')
        .select('sent, processed, created_at, ai_analysis')
        .eq('id', signalId)
        .single();

      if (checkSignal.sent !== initialSent) {
        changedAt = i;
        console.log(`🚨 CHANGE DETECTED at ${i} seconds!`);
        console.log(`   Sent changed from ${initialSent} to ${checkSignal.sent}`);
        console.log(`   Processed: ${checkSignal.processed}`);
        console.log(`   Analysis: ${checkSignal.ai_analysis}`);
        break;
      }

      console.log(`${i}s: Sent still ${checkSignal.sent}, Processed: ${checkSignal.processed}`);
    }

    if (!changedAt) {
      console.log('✅ No change detected in 15 seconds');
    }

    // 4. Try to query system tables (might not work in Supabase)
    console.log('\n4️⃣ Attempting to query database system information...');

    try {
      // Try to get table information
      const { data: tableInfo, error: tableError } = await supabase
        .rpc('get_table_columns', { table_name: 'mt5_signals' })
        .catch(() => ({ data: null, error: { message: 'RPC not available' } }));

      if (tableError) {
        console.log('ℹ️  Cannot access table column info via RPC (expected in Supabase)');
      } else {
        console.log('Table columns:', tableInfo);
      }
    } catch (e) {
      console.log('ℹ️  System table access not available (expected in Supabase)');
    }

    // 5. Summary
    console.log('\n📊 5. INVESTIGATION SUMMARY:');
    console.log('=============================');

    if (changedAt) {
      console.log(`🚨 CONFIRMED: Something automatically changes sent=false to sent=true in ${changedAt} seconds`);
      console.log('');
      console.log('🔧 LIKELY CAUSES:');
      console.log('   1. Database trigger on mt5_signals table');
      console.log('   2. RLS (Row Level Security) policy');
      console.log('   3. Database function called on INSERT');
      console.log('   4. Generated/computed column');
      console.log('');
      console.log('🎯 NEXT STEPS:');
      console.log('   1. Check Supabase Dashboard → Database → Triggers');
      console.log('   2. Check Supabase Dashboard → Authentication → Policies');
      console.log('   3. Look for any functions that modify mt5_signals');
      console.log('   4. Check table definition for generated columns');

    } else {
      console.log('✅ No immediate change detected - possible explanations:');
      console.log('   • Trigger only fires under specific conditions');
      console.log('   • Change happens after longer delay');
      console.log('   • Trigger was already disabled');
      console.log('   • The issue might be in the application layer');
    }

    console.log('\n💡 ALTERNATIVE SOLUTIONS:');
    console.log('   1. Use a different column name (e.g., sent_to_ea)');
    console.log('   2. Modify EA to check a custom field');
    console.log('   3. Use the processed field instead of sent');
    console.log('   4. Add a new timestamp field to track when sent changes');

    console.log(`\n📋 Test signal details:`);
    console.log(`   ID: ${signalId}`);
    console.log(`   Current sent: ${changedAt ? 'changed to true' : 'still false'}`);
    console.log(`   Monitor this signal in your Supabase dashboard`);

  } catch (error) {
    console.error('❌ Error during investigation:', error);
  }
}

investigateTriggers();