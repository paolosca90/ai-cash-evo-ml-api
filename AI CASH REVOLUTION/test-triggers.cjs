const { spawn } = require('child_process');

function runMCPCommand(tool, args = {}) {
  return new Promise((resolve, reject) => {
    const process = spawn('node', ['dist/index.js'], {
      cwd: __dirname,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const request = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: tool,
        arguments: args
      }
    };

    let output = '';
    let errorOutput = '';

    process.stdout.on('data', (data) => {
      output += data.toString();
    });

    process.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    process.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Process exited with code ${code}: ${errorOutput}`));
        return;
      }

      try {
        const lines = output.trim().split('\n');
        const response = JSON.parse(lines[lines.length - 1]);
        resolve(response);
      } catch (e) {
        reject(new Error(`Failed to parse response: ${output}`));
      }
    });

    process.stdin.write(JSON.stringify(request) + '\n');
    process.stdin.end();
  });
}

async function main() {
  try {
    console.log('🔍 Checking triggers on mt5_signals table...');

    // Step 1: List all triggers on mt5_signals table
    console.log('\n1. Listing triggers on mt5_signals table:');
    const triggersResult = await runMCPCommand('list_triggers');
    console.log(triggersResult.result?.content[0]?.text || 'No response');

    // Step 2: List all triggers in the database to see if there are any others
    console.log('\n2. Listing ALL triggers in database:');
    const allTriggersResult = await runMCPCommand('list_all_triggers');
    console.log(allTriggersResult.result?.content[0]?.text || 'No response');

    // Step 3: Check RLS policies
    console.log('\n3. Checking RLS policies on mt5_signals table:');
    const rlsResult = await runMCPCommand('list_rls_policies');
    console.log(rlsResult.result?.content[0]?.text || 'No response');

    // Step 4: Query recent signals to see the current state
    console.log('\n4. Querying recent signals:');
    const signalsResult = await runMCPCommand('query_signals', { limit: 5 });
    console.log(signalsResult.result?.content[0]?.text || 'No response');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();