import { createClient } from '@supabase/supabase-js';

// Database connection
const supabaseUrl = 'https://rvopmdflnecyrwrzhyfy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2b3BtZGZsbmVjeXJ3cnpoeWZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODU0Nzg4NCwiZXhwIjoyMDc0MTIzODg0fQ.SopBfRPsnDNEOuje4BUtmplVKu1awpiZes0wlQCKugA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function analyzeDatabaseV2() {
  try {
    console.log('🔍 Analyzing Supabase database for trading signal issue (v2)...\n');

    // 1. Check recent signals and their sent status
    console.log('📊 1. Checking recent signals (last 20)...');
    const { data: recentSignals, error: signalsError } = await supabase
      .from('mt5_signals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (signalsError) {
      console.error('❌ Error fetching recent signals:', signalsError);
      return;
    }

    console.log(`✅ Found ${recentSignals.length} recent signals:`);
    recentSignals.forEach((signal, index) => {
      const sentStatus = signal.sent ? '✅ true' : '❌ false';
      console.log(`   ${index + 1}. ID: ${signal.id.slice(0, 8)}..., Sent: ${sentStatus}, Symbol: ${signal.symbol || 'N/A'}, Created: ${signal.created_at}`);
    });

    // 2. Count signals by sent status
    console.log('\n📈 2. Signal status analysis (last 50)...');
    const { data: last50Signals, error: last50Error } = await supabase
      .from('mt5_signals')
      .select('sent, created_at, symbol')
      .order('created_at', { ascending: false })
      .limit(50);

    if (last50Error) {
      console.error('❌ Error fetching last 50 signals:', last50Error);
    } else {
      const sentTrue = last50Signals.filter(s => s.sent === true).length;
      const sentFalse = last50Signals.filter(s => s.sent === false).length;
      console.log(`✅ Last 50 signals - Sent: true (${sentTrue}), Sent: false (${sentFalse})`);

      if (sentTrue > 0 && sentFalse === 0) {
        console.log('🚨 ALL recent signals have sent=true - This confirms the issue!');
      }
    }

    // 3. Check signals with sent=false (all time)
    console.log('\n🔍 3. All signals with sent=false...');
    const { data: allUnsentSignals, error: allUnsentError } = await supabase
      .from('mt5_signals')
      .select('*')
      .eq('sent', false)
      .order('created_at', { ascending: false });

    if (allUnsentError) {
      console.error('❌ Error fetching all unsent signals:', allUnsentError);
    } else {
      console.log(`✅ Found ${allUnsentSignals.length} total signals with sent=false:`);
      allUnsentSignals.forEach((signal, index) => {
        console.log(`   ${index + 1}. ID: ${signal.id.slice(0, 8)}..., Symbol: ${signal.symbol || 'N/A'}, Created: ${signal.created_at}`);
      });
    }

    // 4. Create a test signal with sent=false using correct column names
    console.log('\n🧪 4. Creating test signal with sent=false...');

    // Get latest EURUSD rate for realistic data
    const latestSignal = recentSignals.find(s => s.symbol === 'EURUSD');
    const eurusdRate = latestSignal?.eurusd_rate || 1.0850;

    const testSignal = {
      symbol: 'EURUSD',
      signal: 'BUY',  // Using 'signal' column instead of 'action'
      confidence: 85,
      entry: eurusdRate,
      stop_loss: eurusdRate - 0.0050,
      take_profit: eurusdRate + 0.0100,
      risk_amount: 100,
      ai_analysis: 'Test signal created via direct database insert',
      sent: false,  // CRITICAL: Start with sent=false
      status: 'pending',
      created_at: new Date().toISOString(),
      eurusd_rate: eurusdRate,
      volume: 0.1,
      processed: false
    };

    console.log('Creating signal with data:', JSON.stringify(testSignal, null, 2));

    const { data: insertResult, error: insertError } = await supabase
      .from('mt5_signals')
      .insert([testSignal])
      .select();

    if (insertError) {
      console.error('❌ Error creating test signal:', insertError);
      console.error('Error details:', JSON.stringify(insertError, null, 2));
      return;
    }

    console.log('✅ Test signal created successfully:');
    const createdSignal = insertResult[0];
    console.log(`   ID: ${createdSignal.id}, Sent: ${createdSignal.sent}, Created: ${createdSignal.created_at}`);

    // 5. IMMEDIATELY check if sent status changed
    console.log('\n🔍 5. IMMEDIATE VERIFICATION - Checking if sent status changed...');

    // Wait 2 seconds then check
    await new Promise(resolve => setTimeout(resolve, 2000));

    const { data: verifySignal, error: verifyError } = await supabase
      .from('mt5_signals')
      .select('*')
      .eq('id', createdSignal.id)
      .single();

    if (verifyError) {
      console.error('❌ Error verifying signal:', verifyError);
    } else {
      console.log(`✅ Signal verification - ID: ${verifySignal.id.slice(0, 8)}..., Sent: ${verifySignal.sent}`);

      if (verifySignal.sent !== false) {
        console.log('🚨🚨🚨 CRITICAL ISSUE CONFIRMED!');
        console.log('   Signal sent status IMMEDIATELY changed from false to', verifySignal.sent);
        console.log('   This proves there is a database trigger or other mechanism');
        console.log('   that is automatically changing sent to true!');
        console.log('   Time between creation and change:', new Date().toISOString());
      } else {
        console.log('✅ Signal still has sent=false after 2 seconds');
        console.log('   This suggests the issue might be in the Edge Function creation process');
        console.log('   rather than a database trigger');
      }
    }

    // 6. Check one more time after 5 seconds
    console.log('\n⏰ 6. Final check after 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    const { data: finalCheck, error: finalError } = await supabase
      .from('mt5_signals')
      .select('sent, updated_at')
      .eq('id', createdSignal.id)
      .single();

    if (finalError) {
      console.error('❌ Error in final check:', finalError);
    } else {
      console.log(`✅ Final check - Sent: ${finalCheck.sent}, Updated: ${finalCheck.updated_at}`);
      if (finalCheck.sent !== false) {
        console.log('🚨 Status changed within 7 seconds of creation!');
      }
    }

  } catch (error) {
    console.error('❌ Database analysis failed:', error);
  }
}

// Run the analysis
analyzeDatabaseV2();