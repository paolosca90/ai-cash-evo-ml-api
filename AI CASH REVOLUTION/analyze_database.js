import { createClient } from '@supabase/supabase-js';

// Database connection
const supabaseUrl = 'https://rvopmdflnecyrwrzhyfy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2b3BtZGZsbmVjeXJ3cnpoeWZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODU0Nzg4NCwiZXhwIjoyMDc0MTIzODg0fQ.SopBfRPsnDNEOuje4BUtmplVKu1awpiZes0wlQCKugA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function analyzeDatabase() {
  try {
    console.log('🔍 Analyzing Supabase database for trading signal issue...\n');

    // 1. Check table structure
    console.log('📋 1. Checking mt5_signals table structure...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('mt5_signals')
      .select('*')
      .limit(1);

    if (tableError) {
      console.error('❌ Error accessing mt5_signals:', tableError);
      return;
    }

    if (tableInfo && tableInfo.length > 0) {
      console.log('✅ Table columns:', Object.keys(tableInfo[0]));
    } else {
      console.log('ℹ️  Table exists but no data found');
    }

    // 2. Check recent signals and their sent status
    console.log('\n📊 2. Checking recent signals (last 10)...');
    const { data: recentSignals, error: signalsError } = await supabase
      .from('mt5_signals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (signalsError) {
      console.error('❌ Error fetching recent signals:', signalsError);
    } else {
      console.log(`✅ Found ${recentSignals.length} recent signals:`);
      recentSignals.forEach((signal, index) => {
        console.log(`   ${index + 1}. ID: ${signal.id}, Sent: ${signal.sent}, Created: ${signal.created_at}, User: ${signal.user_email}`);
      });
    }

    // 3. Check for signals with sent=false
    console.log('\n🔍 3. Checking for signals with sent=false...');
    const { data: unsentSignals, error: unsentError } = await supabase
      .from('mt5_signals')
      .select('*')
      .eq('sent', false)
      .order('created_at', { ascending: false })
      .limit(5);

    if (unsentError) {
      console.error('❌ Error fetching unsent signals:', unsentError);
    } else {
      console.log(`✅ Found ${unsentSignals.length} signals with sent=false:`);
      unsentSignals.forEach((signal, index) => {
        console.log(`   ${index + 1}. ID: ${signal.id}, Symbol: ${signal.symbol}, Created: ${signal.created_at}`);
      });
    }

    // 4. Check for signals from paoloscardia@gmail.com
    console.log('\n👤 4. Checking signals for paoloscardia@gmail.com...');
    const { data: userSignals, error: userError } = await supabase
      .from('mt5_signals')
      .select('*')
      .eq('user_email', 'paoloscardia@gmail.com')
      .order('created_at', { ascending: false })
      .limit(5);

    if (userError) {
      console.error('❌ Error fetching user signals:', userError);
    } else {
      console.log(`✅ Found ${userSignals.length} signals for paoloscardia@gmail.com:`);
      userSignals.forEach((signal, index) => {
        console.log(`   ${index + 1}. ID: ${signal.id}, Sent: ${signal.sent}, Symbol: ${signal.symbol}, Created: ${signal.created_at}`);
      });
    }

    // 5. Create a test signal with sent=false
    console.log('\n🧪 5. Creating test signal with sent=false...');
    const testSignal = {
      user_email: 'paoloscardia@gmail.com',
      symbol: 'EURUSD',
      action: 'BUY',
      lot_size: 0.1,
      stop_loss: 1.0800,
      take_profit: 1.0900,
      price: 1.0850,
      magic: 12345,
      sent: false,
      source: 'database_test',
      created_at: new Date().toISOString()
    };

    const { data: insertResult, error: insertError } = await supabase
      .from('mt5_signals')
      .insert([testSignal])
      .select();

    if (insertError) {
      console.error('❌ Error creating test signal:', insertError);
    } else {
      console.log('✅ Test signal created successfully:');
      console.log(`   ID: ${insertResult[0].id}, Sent: ${insertResult[0].sent}, Created: ${insertResult[0].created_at}`);

      // 6. Immediately check if sent changed
      console.log('\n🔍 6. Verifying signal status after creation...');
      const { data: verifySignal, error: verifyError } = await supabase
        .from('mt5_signals')
        .select('*')
        .eq('id', insertResult[0].id)
        .single();

      if (verifyError) {
        console.error('❌ Error verifying signal:', verifyError);
      } else {
        console.log(`✅ Signal verification - ID: ${verifySignal.id}, Sent: ${verifySignal.sent}`);
        if (verifySignal.sent !== false) {
          console.log('🚨 CRITICAL ISSUE: Signal sent status changed from false to ', verifySignal.sent);
          console.log('   This confirms there is a database trigger or mechanism changing the value!');
        } else {
          console.log('✅ Signal remains with sent=false - EA should be able to pick this up');
        }
      }
    }

  } catch (error) {
    console.error('❌ Database analysis failed:', error);
  }
}

// Run the analysis
analyzeDatabase();