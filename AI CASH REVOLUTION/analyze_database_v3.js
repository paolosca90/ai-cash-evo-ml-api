import { createClient } from '@supabase/supabase-js';

// Database connection
const supabaseUrl = 'https://rvopmdflnecyrwrzhyfy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2b3BtZGZsbmVjeXJ3cnpoeWZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODU0Nzg4NCwiZXhwIjoyMDc0MTIzODg0fQ.SopBfRPsnDNEOuje4BUtmplVKu1awpiZes0wlQCKugA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function analyzeDatabaseV3() {
  try {
    console.log('🔍 Analyzing Supabase database for trading signal issue (v3)...\n');

    // 1. Get a complete signal structure from an existing signal
    console.log('📋 1. Getting complete signal structure from existing signal...');
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

    console.log('✅ Existing signal structure:');
    console.log('ID:', existingSignal.id);
    console.log('Client ID:', existingSignal.client_id);
    console.log('Symbol:', existingSignal.symbol);
    console.log('Signal:', existingSignal.signal);
    console.log('Sent:', existingSignal.sent);
    console.log('Created:', existingSignal.created_at);

    // 2. Create a complete test signal using the same structure as existing signals
    console.log('\n🧪 2. Creating test signal with sent=false using complete structure...');

    const testSignal = {
      ...existingSignal,
      id: undefined, // Let database generate new ID
      symbol: 'EURUSD',
      signal: 'BUY',
      confidence: 85,
      entry: 1.0850,
      stop_loss: 1.0800,
      take_profit: 1.0950,
      ai_analysis: 'Test signal created via direct database insert - SENT FALSE TEST',
      sent: false, // CRITICAL: Start with sent=false
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      eurusd_rate: 1.0850,
      volume: 0.1,
      processed: false,
      immediate_notification: false,
      ea_notified: false,
      // Clear out execution-specific fields
      opened_at: null,
      closed_at: null,
      close_price: null,
      actual_profit: null,
      pips_gained: null,
      trade_duration_minutes: null,
      close_reason: null,
      ea_notification_time: null,
      ea_response: null,
      execution_latency_ms: 0,
      batch_update_count: 0,
      last_tick_timestamp: null,
      entry_price: null,
      exit_price: null
    };

    console.log('Creating test signal with sent=false...');

    const { data: insertResult, error: insertError } = await supabase
      .from('mt5_signals')
      .insert([testSignal])
      .select();

    if (insertError) {
      console.error('❌ Error creating test signal:', insertError);
      return;
    }

    console.log('✅ Test signal created successfully!');
    const createdSignal = insertResult[0];
    console.log(`   ID: ${createdSignal.id.slice(0, 8)}..., Sent: ${createdSignal.sent}, Created: ${createdSignal.created_at}`);

    // 3. IMMEDIATE verification - check if sent status changed
    console.log('\n🔍 3. IMMEDIATE VERIFICATION - Checking if sent status changed...');

    // Check immediately (no delay)
    const { data: immediateCheck, error: immediateError } = await supabase
      .from('mt5_signals')
      .select('sent, updated_at, ai_analysis')
      .eq('id', createdSignal.id)
      .single();

    if (immediateError) {
      console.error('❌ Error in immediate check:', immediateError);
    } else {
      console.log(`✅ Immediate check - Sent: ${immediateCheck.sent}, Updated: ${immediateCheck.updated_at}`);
      console.log(`   AI Analysis: ${immediateCheck.ai_analysis}`);

      if (immediateCheck.sent !== false) {
        console.log('🚨🚨🚨 CRITICAL ISSUE CONFIRMED!');
        console.log('   Signal sent status IMMEDIATELY changed from false to', immediateCheck.sent);
        console.log('   This proves there is a database trigger or other mechanism');
        console.log('   automatically changing sent to true!');
      } else {
        console.log('✅ Signal still has sent=false immediately after creation');
      }
    }

    // 4. Check after 2 seconds
    console.log('\n⏰ 4. Checking after 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const { data: check2s, error: error2s } = await supabase
      .from('mt5_signals')
      .select('sent, updated_at')
      .eq('id', createdSignal.id)
      .single();

    if (error2s) {
      console.error('❌ Error in 2s check:', error2s);
    } else {
      console.log(`✅ 2s check - Sent: ${check2s.sent}, Updated: ${check2s.updated_at}`);
      if (check2s.sent !== false) {
        console.log('🚨 Status changed within 2 seconds!');
      }
    }

    // 5. Check after 5 seconds
    console.log('\n⏰ 5. Final check after 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    const { data: finalCheck, error: finalError } = await supabase
      .from('mt5_signals')
      .select('sent, updated_at, ai_analysis')
      .eq('id', createdSignal.id)
      .single();

    if (finalError) {
      console.error('❌ Error in final check:', finalError);
    } else {
      console.log(`✅ Final check - Sent: ${finalCheck.sent}, Updated: ${finalCheck.updated_at}`);
      console.log(`   AI Analysis: ${finalCheck.ai_analysis}`);

      if (finalCheck.sent !== false) {
        console.log('🚨 Status changed within 7 seconds total!');
        console.log('🎯 ISSUE ROOT CAUSE: Database trigger or mechanism is auto-setting sent=true');
      } else {
        console.log('✅ Signal remained with sent=false after 7 seconds');
        console.log('🎯 ISSUE ROOT CAUSE: Problem is in Edge Function creation process, not database triggers');
      }
    }

    // 6. Summary
    console.log('\n📊 6. SUMMARY AND RECOMMENDATIONS:');
    console.log('=====================================');

    if (finalCheck?.sent === false) {
      console.log('✅ GOOD NEWS: Database triggers are NOT the problem');
      console.log('🎯 ROOT CAUSE: Edge Function mt5-trade-signals is creating signals with sent=true');
      console.log('🔧 SOLUTION: Fix the Edge Function to create signals with sent=false');
      console.log('📝 NEXT STEPS:');
      console.log('   1. Examine the mt5-trade-signals Edge Function code');
      console.log('   2. Fix it to set sent=false on creation');
      console.log('   3. Test the fix');
    } else {
      console.log('🚨 CRITICAL: Database trigger IS the problem');
      console.log('🎯 ROOT CAUSE: Database automatically changes sent=false to sent=true');
      console.log('🔧 SOLUTION: Find and remove/disable the database trigger');
      console.log('📝 NEXT STEPS:');
      console.log('   1. Check database triggers on mt5_signals table');
      console.log('   2. Check RLS policies that might modify data');
      console.log('   3. Disable or fix the trigger');
    }

  } catch (error) {
    console.error('❌ Database analysis failed:', error);
  }
}

// Run the analysis
analyzeDatabaseV3();