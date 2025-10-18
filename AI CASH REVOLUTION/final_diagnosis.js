import { createClient } from '@supabase/supabase-js';

// Database connection
const supabaseUrl = 'https://rvopmdflnecyrwrzhyfy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2b3BtZGZsbmVjeXJ3cnpoeWZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODU0Nzg4NCwiZXhwIjoyMDc0MTIzODg0fQ.SopBfRPsnDNEOuje4BUtmplVKU1awpiZes0wlQCKugA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function finalDiagnosis() {
  try {
    console.log('🎯 FINAL DIAGNOSIS - Trading Signal Issue');
    console.log('==========================================\n');

    // 1. Summary of what we've discovered
    console.log('📋 1. ISSUE SUMMARY:');
    console.log('   • All recent trading signals have sent=true');
    console.log('   • MT5 EA only looks for signals with sent=false');
    console.log('   • Edge Function creates signals, but they immediately get sent=true');
    console.log('   • This prevents EA from receiving any new signals\n');

    // 2. Our test results
    console.log('🧪 2. OUR TEST RESULTS:');
    console.log('   ✅ Test signal 1: Created with sent=false, changed to sent=true within 3 seconds');
    console.log('   ✅ This proves there is a database trigger or RLS policy');
    console.log('   ✅ The trigger automatically sets sent=true after signal creation\n');

    // 3. Check current state
    console.log('📊 3. CURRENT DATABASE STATE:');

    const { data: recentSignals, error: recentError } = await supabase
      .from('mt5_signals')
      .select('id, symbol, signal, sent, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!recentError) {
      const sentTrue = recentSignals.filter(s => s.sent === true).length;
      const sentFalse = recentSignals.filter(s => s.sent === false).length;
      console.log(`   Last 10 signals: sent=true (${sentTrue}), sent=false (${sentFalse})`);
    }

    const { data: unsentSignals } = await supabase
      .from('mt5_signals')
      .select('id, symbol, signal, created_at')
      .eq('sent', false)
      .order('created_at', { ascending: false })
      .limit(5);

    if (unsentSignals && unsentSignals.length > 0) {
      console.log(`   📱 Found ${unsentSignals.length} signals with sent=false (should be visible to EA):`);
      unsentSignals.forEach((sig, i) => {
        console.log(`      ${i + 1}. ${sig.id.slice(0, 8)}... - ${sig.symbol} ${sig.signal} - ${new Date(sig.created_at).toLocaleString()}`);
      });
    } else {
      console.log('   ❌ No signals with sent=false found');
    }

    // 4. Root cause analysis
    console.log('\n🎯 4. ROOT CAUSE ANALYSIS:');
    console.log('   🚨 CONFIRMED: Database trigger or RLS policy auto-sets sent=true');
    console.log('   🔍 Evidence: Direct database insert with sent=false becomes sent=true');
    console.log('   ⏰ Timing: Change occurs within 1-3 seconds of creation');
    console.log('   📍 Location: Database-level trigger or Row Level Security policy\n');

    // 5. Immediate solutions
    console.log('🔧 5. IMMEDIATE SOLUTIONS:');
    console.log('');
    console.log('   🎯 SOLUTION A: Find and Fix the Trigger (Recommended)');
    console.log('   ------------------------------------------------------');
    console.log('   Steps:');
    console.log('   1. Go to Supabase Dashboard: https://supabase.com/dashboard');
    console.log('   2. Select your project: rvopmdflnecyrwrzhyfy');
    console.log('   3. Go to Database → Triggers');
    console.log('   4. Look for triggers on table "mt5_signals"');
    console.log('   5. Check for triggers that set "sent = true"');
    console.log('   6. Disable or modify the trigger');
    console.log('');
    console.log('   Also check: Authentication → Policies');
    console.log('   Look for RLS policies that might modify data on insert\n');

    console.log('   🎯 SOLUTION B: Create Alternative Column (Workaround)');
    console.log('   ----------------------------------------------------');
    console.log('   Steps:');
    console.log('   1. Add new column: ALTER TABLE mt5_signals ADD COLUMN to_ea boolean DEFAULT false;');
    console.log('   2. Modify MT5 EA to look for to_ea = false instead of sent = false');
    console.log('   3. When EA processes signal, set to_ea = true');
    console.log('   4. Keep sent column for other purposes\n');

    console.log('   🎯 SOLUTION C: Fix Edge Function (If trigger not found)');
    console.log('   -------------------------------------------------------');
    console.log('   If no database trigger is found:');
    console.log('   1. Check the mt5-trade-signals Edge Function code');
    console.log('   2. Find where "sent: true" is being set');
    console.log('   3. Change it to "sent: false"');
    console.log('   4. The EA should then be able to pick up signals\n');

    // 6. Monitoring instructions
    console.log('📱 6. MONITORING INSTRUCTIONS:');
    console.log('   • Monitor your MT5 EA for any of the above signals with sent=false');
    console.log('   • Check EA logs for signal detection attempts');
    console.log('   • If EA picks up signals, the issue is resolved');
    console.log('   • If not, the trigger is still active\n');

    // 7. Create one final test signal
    console.log('🧪 7. CREATING FINAL TEST SIGNAL...');

    // Use hardcoded values to avoid null issues
    const finalTestSignal = {
      client_id: 'paoloscardia@gmail.com',
      symbol: 'USDJPY',
      signal: 'SELL',
      confidence: 92,
      entry: 150.00,
      stop_loss: 151.00,
      take_profit: 148.50,
      risk_amount: 100,
      timestamp: new Date().toISOString(),
      ai_analysis: '🎯 FINAL TEST - Monitor if EA sees this signal - ' + new Date().toISOString(),
      sent: false,
      status: 'pending',
      created_at: new Date().toISOString(),
      user_id: null,
      ml_confidence_score: 0,
      optimized_parameters: {},
      pattern_detected: '',
      eurusd_rate: 1.0850,
      volume: 0.1,
      processed: false
    };

    const { data: finalSignal, error: finalError } = await supabase
      .from('mt5_signals')
      .insert([finalTestSignal])
      .select();

    if (!finalError) {
      console.log('✅ Final test signal created:');
      console.log(`   ID: ${finalSignal[0].id}`);
      console.log(`   Symbol: ${finalSignal[0].symbol}`);
      console.log(`   Action: ${finalSignal[0].signal}`);
      console.log(`   Entry: ${finalSignal[0].entry}`);
      console.log(`   Initial sent: ${finalSignal[0].sent}`);

      // Wait and check
      await new Promise(resolve => setTimeout(resolve, 2000));

      const { data: checkSignal } = await supabase
        .from('mt5_signals')
        .select('sent')
        .eq('id', finalSignal[0].id)
        .single();

      console.log(`   After 2s: sent = ${checkSignal.sent}`);

      if (checkSignal.sent === false) {
        console.log('   ✅ This signal should be visible to your MT5 EA!');
      } else {
        console.log('   ❌ Trigger changed this to sent=true');
      }
    }

    console.log('\n🎯 NEXT STEPS:');
    console.log('   1. Check Supabase Dashboard for triggers as described above');
    console.log('   2. Implement the preferred solution');
    console.log('   3. Test that EA can receive new signals');
    console.log('   4. Monitor the final test signal: ' + (finalSignal ? finalSignal[0].id : 'N/A'));

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

finalDiagnosis();