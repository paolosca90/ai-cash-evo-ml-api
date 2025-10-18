import { createClient } from '@supabase/supabase-js';

// Database connection
const supabaseUrl = 'https://rvopmdflnecyrwrzhyfy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2b3BtZGZsbmVjeXJ3cnpoeWZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODU0Nzg4NCwiZXhwIjoyMDc0MTIzODg0fQ.SopBfRPsnDNEOuje4BUtmplVKU1awpiZes0wlQCKugA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function findDatabaseTriggers() {
  try {
    console.log('🔍 FINDING DATABASE TRIGGERS AND RLS POLICIES\n');

    // 1. Check for triggers on mt5_signals table
    console.log('1️⃣ Checking for database triggers on mt5_signals...');
    const { data: triggers, error: triggerError } = await supabase
      .from('mt5_signals')
      .select('*')
      .limit(1);

    // Using RPC to query system tables
    const { data: triggerInfo, error: triggerInfoError } = await supabase
      .rpc('get_triggers_for_table', { table_name: 'mt5_signals' })
      .catch(() => ({ data: null, error: { message: 'RPC function not found' } }));

    if (triggerInfoError) {
      console.log('ℹ️  Cannot access triggers via RPC (expected in Supabase)');
    }

    // 2. Check RLS policies
    console.log('\n2️⃣ Checking RLS policies...');

    // Try to query pg_policies directly
    const { data: policies, error: policyError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'mt5_signals')
      .catch(() => ({ data: null, error: { message: 'Cannot access pg_policies directly' } }));

    if (policyError) {
      console.log('ℹ️  Cannot access pg_policies directly (expected in Supabase)');
    }

    // 3. Create another test signal to monitor the exact timing
    console.log('\n3️⃣ Creating monitored test signal...');

    const { data: existingSignal } = await supabase
      .from('mt5_signals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const testSignal = {
      client_id: existingSignal.client_id,
      symbol: 'EURUSD',
      signal: 'SELL', // Different from previous test
      confidence: 95,
      entry: 1.0850,
      stop_loss: 1.0900,
      take_profit: 1.0800,
      risk_amount: existingSignal.risk_amount,
      timestamp: new Date().toISOString(),
      ai_analysis: '🔍 MONITORED TEST - Track when sent changes to true - ' + new Date().toISOString(),
      sent: false,
      status: 'pending',
      created_at: new Date().toISOString(),
      user_id: existingSignal.user_id,
      ml_confidence_score: existingSignal.ml_confidence_score,
      optimized_parameters: existingSignal.optimized_parameters,
      pattern_detected: existingSignal.pattern_detected,
      eurusd_rate: 1.0850,
      volume: 0.1,
      processed: false
    };

    const { data: newSignal, error: createError } = await supabase
      .from('mt5_signals')
      .insert([testSignal])
      .select();

    if (createError) {
      console.error('❌ Error creating test signal:', createError);
      return;
    }

    console.log('✅ Monitored signal created:', newSignal[0].id);

    // 4. Monitor the signal every second for 10 seconds
    console.log('\n⏰ 4. Monitoring signal status every second for 10 seconds...');

    const signalId = newSignal[0].id;
    let changedAt = null;
    let initialSent = newSignal[0].sent;

    for (let i = 1; i <= 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const { data: checkSignal } = await supabase
        .from('mt5_signals')
        .select('sent, created_at, ai_analysis')
        .eq('id', signalId)
        .single();

      if (checkSignal.sent !== initialSent) {
        changedAt = i;
        console.log(`🚨 CHANGE DETECTED at ${i} seconds!`);
        console.log(`   Sent changed from ${initialSent} to ${checkSignal.sent}`);
        console.log(`   Analysis: ${checkSignal.ai_analysis}`);
        break;
      }

      console.log(`${i}s: Sent still ${checkSignal.sent}`);
    }

    if (!changedAt) {
      console.log('✅ No change detected in 10 seconds');
    }

    // 5. Try to find generated columns or computed fields
    console.log('\n5️⃣ Checking for generated columns...');

    // We know 'action' is generated, let's see if 'sent' might also be
    console.log('ℹ️  Known generated column: action');
    console.log('🔍 Checking if sent might also be generated or computed...');

    // 6. Summary and recommendations
    console.log('\n📊 6. SUMMARY & RECOMMENDATIONS:');
    console.log('================================');

    if (changedAt) {
      console.log(`🚨 CONFIRMED: Database trigger/policy changes sent=false to sent=true in ${changedAt} seconds`);
      console.log('');
      console.log('🔧 IMMEDIATE SOLUTIONS:');
      console.log('   1. Check Supabase dashboard for:');
      console.log('      - Database triggers on mt5_signals table');
      console.log('      - RLS policies that modify data');
      console.log('      - Functions called by triggers');
      console.log('');
      console.log('   2. Look for:');
      console.log('      - BEFORE INSERT triggers');
      console.log('      - AFTER INSERT triggers');
      console.log('      - RLS policies with USING or CHECK clauses');
      console.log('');
      console.log('   3. In Supabase dashboard:');
      console.log('      - Go to Database → Triggers');
      console.log('      - Go to Authentication → Policies');
      console.log('      - Look for anything touching mt5_signals');

    } else {
      console.log('✅ No immediate change detected - the change might be delayed');
      console.log('   or the trigger only fires under certain conditions');
    }

    console.log('\n🎯 ALTERNATIVE WORKAROUND:');
    console.log('   1. Create a new column (e.g., sent_to_ea boolean)');
    console.log('   2. Modify EA to look for sent_to_ea = false instead of sent = false');
    console.log('   3. Set sent_to_ea = true when EA processes the signal');
    console.log('   4. Keep sent column for other purposes');

    console.log('\n📱 MONITORING:');
    console.log(`   Test signal ID: ${signalId}`);
    console.log(`   Current sent status: ${changedAt ? 'changed to true' : 'still false'}`);
    console.log('   Monitor your MT5 EA to see if it detects any signals');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

findDatabaseTriggers();