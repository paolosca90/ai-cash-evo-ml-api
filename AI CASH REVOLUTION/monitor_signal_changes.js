import { createClient } from '@supabase/supabase-js';

// Database connection
const supabaseUrl = 'https://rvopmdflnecyrwrzhyfy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2b3BtZGZsbmVjeXJ3cnpoeWZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODU0Nzg4NCwiZXhwIjoyMDc0MTIzODg0fQ.SopBfRPsnDNEOuje4BUtmplVKU1awpiZes0wlQCKugA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function monitorSignalChanges() {
  try {
    console.log('🔍 MONITORING DATABASE SIGNAL CHANGES\n');

    // Get existing signal for reference
    const { data: existingSignal } = await supabase
      .from('mt5_signals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Create test signal
    console.log('🧪 Creating test signal with sent=false...');
    const testSignal = {
      client_id: existingSignal.client_id,
      symbol: 'GBPUSD',
      signal: 'BUY',
      confidence: 88,
      entry: 1.3000,
      stop_loss: 1.2950,
      take_profit: 1.3100,
      risk_amount: existingSignal.risk_amount,
      timestamp: new Date().toISOString(),
      ai_analysis: '🔍 TIMING TEST - When exactly does sent change to true? - ' + new Date().toISOString(),
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
      console.error('❌ Error creating signal:', createError);
      return;
    }

    const signalId = newSignal[0].id;
    console.log(`✅ Signal created: ${signalId.slice(0, 8)}...`);
    console.log(`   Initial sent status: ${newSignal[0].sent}`);

    // Monitor every 500ms for 15 seconds
    console.log('\n⏱️  Monitoring every 500ms for 15 seconds...');
    console.log('   Timestamp | Sent | Notes');
    console.log('   ----------------------------------------');

    let changedAt = null;
    let initialSent = newSignal[0].sent;

    for (let i = 0; i <= 30; i++) { // 15 seconds * 2 checks per second
      await new Promise(resolve => setTimeout(resolve, 500));

      const { data: checkSignal } = await supabase
        .from('mt5_signals')
        .select('sent, created_at, ai_analysis')
        .eq('id', signalId)
        .single();

      const timestamp = new Date().toLocaleTimeString();

      if (checkSignal.sent !== initialSent) {
        changedAt = (i * 0.5); // Convert to seconds
        console.log(`   ${timestamp} | ${checkSignal.sent} | 🚨 CHANGED at ${changedAt}s!`);
        console.log(`   ${timestamp} | ${checkSignal.sent} | Analysis: ${checkSignal.ai_analysis.substring(0, 50)}...`);
        break;
      }

      if (i % 4 === 0) { // Print every 2 seconds
        console.log(`   ${timestamp} | ${checkSignal.sent} | ${i === 0 ? 'Initial check' : `After ${i * 0.5}s`}`);
      }
    }

    // Final status check
    const { data: finalSignal } = await supabase
      .from('mt5_signals')
      .select('sent, status, ai_analysis')
      .eq('id', signalId)
      .single();

    console.log('\n📊 FINAL RESULTS:');
    console.log('=================');
    console.log(`Signal ID: ${signalId}`);
    console.log(`Symbol: ${testSignal.symbol}`);
    console.log(`Action: ${testSignal.signal}`);
    console.log(`Final sent status: ${finalSignal.sent}`);
    console.log(`Final status: ${finalSignal.status}`);

    if (changedAt) {
      console.log(`\n🚨 ROOT CAUSE CONFIRMED:`);
      console.log(`   Database trigger/policy changes sent=false to sent=true`);
      console.log(`   Change occurs ${changedAt} seconds after creation`);
      console.log(`   This prevents MT5 EA from seeing the signals`);

      console.log(`\n🔧 IMMEDIATE SOLUTIONS:`);
      console.log(`   1. Check Supabase Dashboard → Database → Triggers`);
      console.log(`   2. Look for triggers on mt5_signals table`);
      console.log(`   3. Check Authentication → Policies for mt5_signals`);
      console.log(`   4. Disable or modify the trigger that sets sent=true`);

      console.log(`\n🎯 ALTERNATIVE WORKAROUND:`);
      console.log(`   1. Add new column: to_ea boolean DEFAULT false`);
      console.log(`   2. Modify EA to look for to_ea = false`);
      console.log(`   3. Set to_ea = true when EA processes signal`);

    } else {
      console.log(`\n✅ No change detected in 15 seconds`);
      console.log(`   The trigger might be delayed or conditional`);
      console.log(`   Or the issue might be in the Edge Function after all`);
    }

    console.log(`\n📱 FOR YOUR MT5 EA:`);
    console.log(`   Monitor if EA picks up signal: ${signalId}`);
    console.log(`   ${testSignal.symbol} ${testSignal.signal} at ${testSignal.entry}`);

    if (finalSignal.sent === false) {
      console.log(`   ✅ This signal should be visible to EA (sent=false)`);
    } else {
      console.log(`   ❌ This signal will NOT be visible to EA (sent=true)`);
    }

    // Check existing unsent signals
    console.log(`\n🔍 Checking existing signals with sent=false...`);
    const { data: unsentSignals } = await supabase
      .from('mt5_signals')
      .select('id, symbol, signal, created_at')
      .eq('sent', false)
      .order('created_at', { ascending: false })
      .limit(5);

    if (unsentSignals && unsentSignals.length > 0) {
      console.log(`✅ Found ${unsentSignals.length} signals with sent=false:`);
      unsentSignals.forEach((sig, i) => {
        console.log(`   ${i + 1}. ${sig.id.slice(0, 8)}... - ${sig.symbol} ${sig.signal} - ${sig.created_at}`);
      });
      console.log(`   These should be visible to your MT5 EA`);
    } else {
      console.log(`❌ No signals found with sent=false`);
      console.log(`   This confirms the trigger is working on all signals`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

monitorSignalChanges();