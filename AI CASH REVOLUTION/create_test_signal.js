import { createClient } from '@supabase/supabase-js';

// Database connection
const supabaseUrl = 'https://rvopmdflnecyrwrzhyfy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2b3BtZGZsbmVjeXJ3cnpoeWZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODU0Nzg4NCwiZXhwIjoyMDc0MTIzODg0fQ.SopBfRPsnDNEOuje4BUtmplVKu1awpiZes0wlQCKugA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestSignal() {
  try {
    console.log('🔥 CREATING TEST SIGNAL TO IDENTIFY ROOT CAUSE\n');

    // Get existing signal for reference
    const { data: existingSignal } = await supabase
      .from('mt5_signals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Create test signal with ONLY the fields we can control
    const testSignal = {
      client_id: existingSignal.client_id,
      symbol: 'EURUSD',
      signal: 'BUY',
      confidence: 90,
      entry: 1.0850,
      stop_loss: 1.0800,
      take_profit: 1.0950,
      risk_amount: existingSignal.risk_amount,
      timestamp: new Date().toISOString(),
      ai_analysis: '🔥 CRITICAL TEST: sent=false created via direct DB insert - ' + new Date().toISOString(),
      sent: false, // THE CRITICAL TEST - START WITH FALSE
      status: 'pending',
      created_at: new Date().toISOString(),
      opened_at: null,
      closed_at: null,
      close_price: null,
      actual_profit: null,
      pips_gained: null,
      trade_duration_minutes: null,
      close_reason: null,
      user_id: existingSignal.user_id,
      ml_confidence_score: existingSignal.ml_confidence_score,
      optimized_parameters: existingSignal.optimized_parameters,
      pattern_detected: existingSignal.pattern_detected,
      execution_latency_ms: 0,
      batch_update_count: 0,
      last_tick_timestamp: null,
      entry_price: null,
      exit_price: null,
      // OMIT: action (generated column)
      ea_notified: false,
      ea_notification_time: null,
      ea_response: null,
      immediate_notification: false,
      eurusd_rate: 1.0850,
      volume: 0.1,
      processed: false
    };

    console.log('🔴 Creating signal with sent=false...');
    const { data: result, error } = await supabase
      .from('mt5_signals')
      .insert([testSignal])
      .select();

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    const signal = result[0];
    console.log('✅ SIGNAL CREATED!');
    console.log(`   ID: ${signal.id}`);
    console.log(`   Sent: ${signal.sent} (should be false)`);
    console.log(`   Symbol: ${signal.symbol}`);
    console.log(`   Analysis: ${signal.ai_analysis}`);

    // IMMEDIATE check
    console.log('\n🚨 IMMEDIATE VERIFICATION...');
    const { data: check } = await supabase
      .from('mt5_signals')
      .select('sent, ai_analysis')
      .eq('id', signal.id)
      .single();

    if (check.sent !== false) {
      console.log('🚨🚨🚨 DATABASE TRIGGER CONFIRMED!');
      console.log(`   Sent changed from false to ${check.sent} immediately!`);
      console.log('   This proves there is a database trigger or RLS policy');
      console.log('   that automatically sets sent=true');
    } else {
      console.log('✅ Signal still has sent=false');
      console.log('   This suggests the problem is in the Edge Function, not database triggers');
    }

    // Check again after 3 seconds
    await new Promise(resolve => setTimeout(resolve, 3000));
    const { data: finalCheck } = await supabase
      .from('mt5_signals')
      .select('sent, ai_analysis')
      .eq('id', signal.id)
      .single();

    console.log('\n🎯 FINAL RESULT:');
    console.log('================');
    console.log(`Signal ID: ${signal.id}`);
    console.log(`Final sent status: ${finalCheck.sent}`);

    if (finalCheck.sent === false) {
      console.log('\n✅ ROOT CAUSE: Edge Function Issue');
      console.log('   The mt5-trade-signals Edge Function creates signals with sent=true');
      console.log('   SOLUTION: Fix the Edge Function to set sent=false');
      console.log('   This test signal should now be visible to your MT5 EA');
    } else {
      console.log('\n🚨 ROOT CAUSE: Database Trigger Issue');
      console.log('   Database automatically changes sent=false to sent=true');
      console.log('   SOLUTION: Find and disable the database trigger');
    }

    console.log('\n📱 MONITORING INSTRUCTIONS:');
    console.log(`   Watch your MT5 EA for signal ID: ${signal.id}`);
    console.log('   Check if the EA picks up this EURUSD BUY signal');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createTestSignal();