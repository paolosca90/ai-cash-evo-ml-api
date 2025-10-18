const { Pool } = require('pg');

// Database connection configuration
const DB_CONFIG = {
  host: 'aws-0-eu-central-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.rvopmdflnecyrwrzhyfy',
  password: '2N2G7Tm8D2i9',
  ssl: {
    rejectUnauthorized: false
  }
};

async function testConnection() {
  const pool = new Pool(DB_CONFIG);
  let client = null;

  try {
    console.log('🔌 Connecting to Supabase database...');
    client = await pool.connect();
    console.log('✅ Connected successfully!');

    // Test 1: Check if we can query the mt5_signals table
    console.log('\n📊 Testing basic table access...');
    const tableTest = await client.query(`
      SELECT COUNT(*) as count
      FROM mt5_signals
      LIMIT 1;
    `);
    console.log(`Found ${tableTest.rows[0].count} signals in table`);

    // Test 2: List all triggers on mt5_signals table
    console.log('\n🔍 Checking triggers on mt5_signals table...');
    const triggerQuery = `
      SELECT
        t.tgname as trigger_name,
        c.relname as table_name,
        p.proname as function_name,
        t.tgenabled as is_enabled,
        pg_get_triggerdef(t.oid) as trigger_definition
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_proc p ON t.tgfoid = p.oid
      WHERE c.relname = 'mt5_signals'
      AND NOT t.tgisinternal
      ORDER BY t.tgname;
    `;

    const triggersResult = await client.query(triggerQuery);
    console.log(`Found ${triggersResult.rows.length} triggers on mt5_signals:`);
    triggersResult.rows.forEach(trigger => {
      console.log(`  - ${trigger.trigger_name} (${trigger.is_enabled ? 'ENABLED' : 'DISABLED'})`);
      console.log(`    Function: ${trigger.function_name}`);
      console.log(`    Definition: ${trigger.trigger_definition}`);
    });

    // Test 3: List all triggers in database
    console.log('\n🔍 Checking ALL triggers in database...');
    const allTriggersQuery = `
      SELECT
        t.tgname as trigger_name,
        c.relname as table_name,
        p.proname as function_name,
        t.tgenabled as is_enabled,
        pg_get_triggerdef(t.oid) as trigger_definition
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_proc p ON t.tgfoid = p.oid
      WHERE NOT t.tgisinternal
      ORDER BY c.relname, t.tgname;
    `;

    const allTriggersResult = await client.query(allTriggersQuery);
    console.log(`Found ${allTriggersResult.rows.length} total triggers in database:`);
    allTriggersResult.rows.forEach(trigger => {
      console.log(`  - ${trigger.trigger_name} on ${trigger.table_name} (${trigger.is_enabled ? 'ENABLED' : 'DISABLED'})`);
    });

    // Test 4: Check RLS policies
    console.log('\n🔒 Checking RLS policies on mt5_signals table...');
    const rlsQuery = `
      SELECT
        pol.policyname,
        pol.permissive,
        pol.roles,
        pol.cmd,
        pol.qual,
        pol.with_check
      FROM pg_policies pol
      WHERE pol.tablename = 'mt5_signals';
    `;

    const rlsResult = await client.query(rlsQuery);
    console.log(`Found ${rlsResult.rows.length} RLS policies on mt5_signals:`);
    rlsResult.rows.forEach(policy => {
      console.log(`  - ${policy.policyname} (${policy.permissive ? 'PERMISSIVE' : 'RESTRICTIVE'})`);
      console.log(`    Command: ${policy.cmd}`);
      console.log(`    Roles: ${policy.roles}`);
      console.log(`    Using: ${policy.qual}`);
      if (policy.with_check) {
        console.log(`    With check: ${policy.with_check}`);
      }
    });

    // Test 5: Check recent signals
    console.log('\n📈 Checking recent signals...');
    const signalsQuery = `
      SELECT id, client_id, symbol, signal, sent, processed, created_at
      FROM mt5_signals
      ORDER BY created_at DESC
      LIMIT 5;
    `;

    const signalsResult = await client.query(signalsQuery);
    console.log(`Recent signals (last 5):`);
    signalsResult.rows.forEach(signal => {
      console.log(`  - ID: ${signal.id}, Client: ${signal.client_id}, Symbol: ${signal.symbol}`);
      console.log(`    Signal: ${signal.signal}, Sent: ${signal.sent}, Processed: ${signal.processed}`);
      console.log(`    Created: ${signal.created_at}`);
    });

    // Test 6: Test inserting a signal with sent=false
    console.log('\n🧪 Testing signal insertion with sent=false...');
    const testClientId = 'test_client_' + Date.now();

    const insertQuery = `
      INSERT INTO mt5_signals (client_id, symbol, signal, entry, stop_loss, take_profit, sent, processed, created_at)
      VALUES ($1, $2, 'BUY', 1.1000, 1.0950, 1.1050, false, false, NOW())
      RETURNING id, sent, processed, created_at;
    `;

    const insertResult = await client.query(insertQuery, [testClientId, 'EURUSD']);
    const insertedSignal = insertResult.rows[0];

    console.log(`Inserted signal: ID=${insertedSignal.id}, sent=${insertedSignal.sent}, processed=${insertedSignal.processed}`);

    // Immediately check if it was changed
    const checkQuery = `
      SELECT id, sent, processed, created_at
      FROM mt5_signals
      WHERE id = $1;
    `;

    const checkResult = await client.query(checkQuery, [insertedSignal.id]);
    const checkedSignal = checkResult.rows[0];

    console.log(`Retrieved signal: ID=${checkedSignal.id}, sent=${checkedSignal.sent}, processed=${checkedSignal.processed}`);

    if (checkedSignal.sent !== insertedSignal.sent) {
      console.log('🚨 WARNING: sent field was automatically changed from false to true!');
    } else {
      console.log('✅ GOOD: sent field remained as expected');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

testConnection();