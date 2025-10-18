import { createClient } from '@supabase/supabase-js';

// Database connection
const supabaseUrl = 'https://rvopmdflnecyrwrzhyfy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2b3BtZGZsbmVjeXJ3cnpoeWZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODU0Nzg4NCwiZXhwIjoyMDc0MTIzODg0fQ.SopBfRPsnDNEOuje4BUtmplVKu1awpiZes0wlQCKugA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function analyzeDatabaseV4() {
  try {
    console.log('🔍 Analyzing Supabase database for trading signal issue (v4)...\n');

    // 1. Get exact column structure from existing signal
    console.log('📋 1. Getting exact column structure...');
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

    console.log('✅ All available columns:', Object.keys(existingSignal));

    // 2. Create test signal with only required fields
    console.log('\n🧪 2. Creating test signal with sent=false using minimal required fields...');

    const testSignal = {
      client_id: existingSignal.client_id, // Required field
      symbol: 'EURUSD',
      signal: 'BUY',
      confidence: 85,
      entry: 1.0850,
      stop_loss: 1.0800,
      take_profit: 1.0950,
      ai_analysis: 'TEST SIGNAL - SENT FALSE - CREATED VIA DIRECT DB INSERT',
      sent: false, // CRITICAL: Start with sent=false
      status: 'pending',
      created_at: new Date().toISOString(),
      eurusd_rate: 1.0850,
      volume: 0.1,
      processed: false,
      immediate_notification: false,
      ea_notified: false,
      ml_confidence_score: {},
      optimized_parameters: {},
      pattern_detected: ''
    };

    console.log('Creating test signal...');
    console.log('Key fields - Symbol:', testSignal.symbol, 'Sent:', testSignal.sent, 'Client:', testSignal.client_id);

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
    console.log(`   Client: ${createdSignal.client_id}, Symbol: ${createdSignal.symbol}`);

    // 3. IMMEDIATE verification - check right away
    console.log('\n🔍 3. IMMEDIATE VERIFICATION...');

    const { data: immediateCheck, error: immediateError } = await supabase
      .from('mt5_signals')
      .select('sent, created_at, ai_analysis')
      .eq('id', createdSignal.id)
      .single();

    if (immediateError) {
      console.error('❌ Error in immediate check:', immediateError);
    } else {
      console.log(`✅ Immediate check - Sent: ${immediateCheck.sent}`);
      console.log(`   AI Analysis: ${immediateCheck.ai_analysis}`);

      if (immediateCheck.sent !== false) {
        console.log('🚨🚨🚨 TRIGGER CONFIRMED!');
        console.log('   Sent status changed from false to', immediateCheck.sent, 'IMMEDIATELY!');
        console.log('   This proves a database trigger or RLS policy is changing it!');
      } else {
        console.log('✅ Signal still has sent=false immediately');
      }
    }

    // 4. Check after 3 seconds
    console.log('\n⏰ 4. Checking after 3 seconds...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    const { data: check3s, error: error3s } = await supabase
      .from('mt5_signals')
      .select('sent, created_at, ai_analysis')
      .eq('id', createdSignal.id)
      .single();

    if (error3s) {
      console.error('❌ Error in 3s check:', error3s);
    } else {
      console.log(`✅ 3s check - Sent: ${check3s.sent}`);
      console.log(`   AI Analysis: ${check3s.ai_analysis}`);

      if (check3s.sent !== false) {
        console.log('🚨 Status changed within 3 seconds!');
        console.log('🎯 ROOT CAUSE: Database trigger/auto-mechanism confirmed');
      }
    }

    // 5. Final check after 10 seconds
    console.log('\n⏰ 5. Final check after 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    const { data: finalCheck, error: finalError } = await supabase
      .from('mt5_signals')
      .select('sent, created_at, ai_analysis, status')
      .eq('id', createdSignal.id)
      .single();

    if (finalError) {
      console.error('❌ Error in final check:', finalError);
    } else {
      console.log(`✅ Final check - Sent: ${finalCheck.sent}, Status: ${finalCheck.status}`);
      console.log(`   AI Analysis: ${finalCheck.ai_analysis}`);

      // 6. Analysis and diagnosis
      console.log('\n📊 6. ROOT CAUSE ANALYSIS:');
      console.log('============================');

      if (finalCheck.sent === false) {
        console.log('✅ DATABASE TRIGGERS ARE NOT THE PROBLEM');
        console.log('🎯 ROOT CAUSE: Edge Function mt5-trade-signals creates signals with sent=true');
        console.log('');
        console.log('🔧 RECOMMENDED SOLUTION:');
        console.log('   1. Fix the mt5-trade-signals Edge Function to set sent=false on creation');
        console.log('   2. Test that EA can pick up the new signals with sent=false');
        console.log('   3. Verify EA properly sets sent=true after processing');
        console.log('');
        console.log('📝 NEXT STEPS:');
        console.log('   - Examine the Edge Function code');
        console.log('   - Look for where "sent: true" is being set');
        console.log('   - Change it to "sent: false"');

      } else {
        console.log('🚨 DATABASE TRIGGER CONFIRMED AS THE PROBLEM');
        console.log('🎯 ROOT CAUSE: Database automatically changes sent=false to sent=true');
        console.log('');
        console.log('🔧 RECOMMENDED SOLUTION:');
        console.log('   1. Find and examine database triggers on mt5_signals table');
        console.log('   2. Check RLS policies that might modify data on insert');
        console.log('   3. Disable or fix the trigger that sets sent=true');
        console.log('');
        console.log('📝 NEXT STEPS:');
        console.log('   - Query information_schema.triggers');
        console.log('   - Check pg_policies for RLS policies');
        console.log('   - Examine any functions called by triggers');
      }

      console.log('\n🎯 CURRENT SIGNAL STATUS:');
      console.log(`   Signal ID: ${createdSignal.id.slice(0, 8)}...`);
      console.log(`   Sent: ${finalCheck.sent}`);
      console.log(`   Status: ${finalCheck.status}`);
      console.log(`   Created: ${finalCheck.created_at}`);

      if (finalCheck.sent === false) {
        console.log('✅ This signal should now be visible to the MT5 EA');
        console.log('📱 Monitor your EA to see if it picks up this signal');
      }
    }

  } catch (error) {
    console.error('❌ Database analysis failed:', error);
  }
}

// Run the analysis
analyzeDatabaseV4();