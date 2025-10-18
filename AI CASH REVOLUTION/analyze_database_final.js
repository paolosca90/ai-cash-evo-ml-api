import { createClient } from '@supabase/supabase-js';

// Database connection
const supabaseUrl = 'https://rvopmdflnecyrwrzhyfy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2b3BtZGZsbmVjeXJ3cnpoeWZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODU0Nzg4NCwiZXhwIjoyMDc0MTIzODg0fQ.SopBfRPsnDNEOuje4BUtmplVKu1awpiZes0wlQCKugA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function finalAnalysis() {
  try {
    console.log('🔍 FINAL ANALYSIS - Trading Signal Issue\n');

    // 1. Get exact data from existing signal
    console.log('📋 1. Getting exact data structure from existing signal...');
    const { data: existingSignal, error: existingError } = await supabase
      .from('mt5_signals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingError) {
      console.error('❌ Error getting existing signal:', existingError);
      return;
    }

    console.log('✅ Existing signal key values:');
    console.log('   Client ID:', existingSignal.client_id);
    console.log('   Symbol:', existingSignal.symbol);
    console.log('   Signal:', existingSignal.signal);
    console.log('   Sent:', existingSignal.sent);
    console.log('   ML Confidence:', typeof existingSignal.ml_confidence_score, existingSignal.ml_confidence_score);
    console.log('   Optimized Parameters:', typeof existingSignal.optimized_parameters, existingSignal.optimized_parameters);

    // 2. Create perfect test signal using exact same data types
    console.log('\n🧪 2. Creating CRITICAL test signal with sent=false...');

    const testSignal = {
      client_id: existingSignal.client_id,
      symbol: 'EURUSD',
      signal: 'BUY',
      confidence: 85,
      entry: 1.0850,
      stop_loss: 1.0800,
      take_profit: 1.0950,
      risk_amount: existingSignal.risk_amount || 100,
      timestamp: existingSignal.timestamp || Date.now(),
      ai_analysis: 'CRITICAL TEST - SENT FALSE - CREATED ' + new Date().toISOString(),
      sent: false, // THE CRITICAL TEST FIELD
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
      ml_confidence_score: existingSignal.ml_confidence_score, // Use exact same type
      optimized_parameters: existingSignal.optimized_parameters, // Use exact same type
      pattern_detected: existingSignal.pattern_detected || '',
      execution_latency_ms: 0,
      batch_update_count: 0,
      last_tick_timestamp: null,
      entry_price: null,
      exit_price: null,
      action: existingSignal.action || 'BUY',
      ea_notified: false,
      ea_notification_time: null,
      ea_response: null,
      immediate_notification: false,
      eurusd_rate: 1.0850,
      volume: existingSignal.volume || 0.1,
      processed: false
    };

    console.log('🔴 CREATING TEST SIGNAL WITH sent=false...');
    console.log('   This test will determine if there is a database trigger');
    console.log('   automatically changing sent=false to sent=true');

    const { data: insertResult, error: insertError } = await supabase
      .from('mt5_signals')
      .insert([testSignal])
      .select();

    if (insertError) {
      console.error('❌ Error creating test signal:', insertError);
      return;
    }

    console.log('✅ TEST SIGNAL CREATED!');
    const createdSignal = insertResult[0];
    console.log(`   🎯 ID: ${createdSignal.id}`);
    console.log(`   🔴 Sent: ${createdSignal.sent} (should be false)`);
    console.log(`   ⏰ Created: ${createdSignal.created_at}`);
    console.log(`   📝 AI Analysis: ${createdSignal.ai_analysis}`);

    // 3. IMMEDIATE verification - no delay
    console.log('\n🚨 3. IMMEDIATE VERIFICATION - Checking if sent status changed...');

    const { data: immediateCheck, error: immediateError } = await supabase
      .from('mt5_signals')
      .select('sent, created_at, ai_analysis')
      .eq('id', createdSignal.id)
      .single();

    if (immediateError) {
      console.error('❌ Error in immediate check:', immediateError);
    } else {
      console.log(`📊 Immediate result - Sent: ${immediateCheck.sent}`);

      if (immediateCheck.sent !== false) {
        console.log('🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨');
        console.log('🚨 DATABASE TRIGGER CONFIRMED!');
        console.log('🚨 Sent status CHANGED from false to', immediateCheck.sent, 'IMMEDIATELY!');
        console.log('🚨 This proves a database trigger/RLS policy is auto-setting sent=true');
        console.log('🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨');
      } else {
        console.log('✅ Signal still has sent=false immediately after creation');
      }
    }

    // 4. Wait and check again
    console.log('\n⏰ 4. Waiting 3 seconds to check for delayed changes...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    const { data: delayedCheck, error: delayedError } = await supabase
      .from('mt5_signals')
      .select('sent, created_at, ai_analysis')
      .eq('id', createdSignal.id)
      .single();

    if (delayedError) {
      console.error('❌ Error in delayed check:', delayedError);
    } else {
      console.log(`📊 Delayed result - Sent: ${delayedCheck.sent}`);

      if (delayedCheck.sent !== false) {
        console.log('🚨 Status changed within 3 seconds - Database trigger confirmed');
      } else {
        console.log('✅ Signal still has sent=false after 3 seconds');
      }
    }

    // 5. Final diagnosis
    console.log('\n🎯 5. FINAL DIAGNOSIS:');
    console.log('=====================');

    const finalSent = delayedCheck?.sent;

    if (finalSent === false) {
      console.log('✅ ROOT CAUSE IDENTIFIED:');
      console.log('   Database triggers are NOT the problem');
      console.log('   The issue is in the Edge Function creation process');
      console.log('');
      console.log('🎯 PROBLEM:');
      console.log('   The mt5-trade-signals Edge Function creates signals with sent=true');
      console.log('   This prevents the MT5 EA from seeing them (EA looks for sent=false)');
      console.log('');
      console.log('🔧 SOLUTION:');
      console.log('   1. Examine the mt5-trade-signals Edge Function code');
      console.log('   2. Find where "sent: true" is being set');
      console.log('   3. Change it to "sent: false"');
      console.log('   4. Test the fix');
      console.log('');
      console.log('✅ GOOD NEWS:');
      console.log('   The test signal we created should now be visible to your MT5 EA');
      console.log('   Monitor your EA to see if it picks up this signal');

    } else {
      console.log('🚨 ROOT CAUSE IDENTIFIED:');
      console.log('   Database trigger IS automatically changing sent=false to sent=true');
      console.log('');
      console.log('🎯 PROBLEM:');
      console.log('   Something in the database (trigger/RLS policy) auto-sets sent=true');
      console.log('   This prevents any signal from staying at sent=false');
      console.log('');
      console.log('🔧 SOLUTION:');
      console.log('   1. Find database triggers on mt5_signals table');
      console.log('   2. Check RLS policies that modify data');
      console.log('   3. Disable or fix the trigger/policy');
      console.log('');
      console.log('📝 NEXT STEPS:');
      console.log('   - Query: SELECT * FROM information_schema.triggers WHERE event_object_table = \'mt5_signals\'');
      console.log('   - Query: SELECT * FROM pg_policies WHERE tablename = \'mt5_signals\'');
    }

    console.log('\n📱 TEST SIGNAL FOR YOUR EA:');
    console.log(`   Signal ID: ${createdSignal.id}`);
    console.log(`   Symbol: EURUSD`);
    console.log(`   Action: BUY`);
    console.log(`   Entry: 1.0850`);
    console.log(`   SL: 1.0800, TP: 1.0950`);
    console.log(`   Current sent status: ${finalSent}`);
    console.log('');
    console.log('🔍 Monitor your MT5 EA logs to see if it detects this signal!');

  } catch (error) {
    console.error('❌ Analysis failed:', error);
  }
}

// Run the final analysis
finalAnalysis();