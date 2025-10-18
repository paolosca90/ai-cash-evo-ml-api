#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { Pool, PoolClient } from 'pg';

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

// Create database connection pool
const pool = new Pool(DB_CONFIG);

// MCP Server setup
const server = new Server(
  {
    name: 'supabase-db-manager',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions
const TOOLS: Tool[] = [
  {
    name: 'list_triggers',
    description: 'List all triggers on the mt5_signals table',
    inputSchema: {
      type: 'object',
      properties: {
        tableName: {
          type: 'string',
          description: 'Name of the table (default: mt5_signals)',
          default: 'mt5_signals'
        }
      }
    }
  },
  {
    name: 'list_all_triggers',
    description: 'List all triggers in the database',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_trigger_definition',
    description: 'Get the detailed definition of a specific trigger',
    inputSchema: {
      type: 'object',
      properties: {
        triggerName: {
          type: 'string',
          description: 'Name of the trigger'
        }
      },
      required: ['triggerName']
    }
  },
  {
    name: 'disable_trigger',
    description: 'Disable (ALTER TABLE ... DISABLE TRIGGER) a specific trigger',
    inputSchema: {
      type: 'object',
      properties: {
        triggerName: {
          type: 'string',
          description: 'Name of the trigger to disable'
        },
        tableName: {
          type: 'string',
          description: 'Name of the table (default: mt5_signals)',
          default: 'mt5_signals'
        }
      },
      required: ['triggerName']
    }
  },
  {
    name: 'drop_trigger',
    description: 'Permanently drop a trigger from the database',
    inputSchema: {
      type: 'object',
      properties: {
        triggerName: {
          type: 'string',
          description: 'Name of the trigger to drop'
        },
        tableName: {
          type: 'string',
          description: 'Name of the table (default: mt5_signals)',
          default: 'mt5_signals'
        }
      },
      required: ['triggerName']
    }
  },
  {
    name: 'list_rls_policies',
    description: 'List Row Level Security policies on the mt5_signals table',
    inputSchema: {
      type: 'object',
      properties: {
        tableName: {
          type: 'string',
          description: 'Name of the table (default: mt5_signals)',
          default: 'mt5_signals'
        }
      }
    }
  },
  {
    name: 'disable_rls_policy',
    description: 'Disable a specific RLS policy',
    inputSchema: {
      type: 'object',
      properties: {
        policyName: {
          type: 'string',
          description: 'Name of the policy to disable'
        },
        tableName: {
          type: 'string',
          description: 'Name of the table (default: mt5_signals)',
          default: 'mt5_signals'
        }
      },
      required: ['policyName']
    }
  },
  {
    name: 'test_signal_insertion',
    description: 'Test inserting a signal with sent=false to verify trigger behavior',
    inputSchema: {
      type: 'object',
      properties: {
        clientId: {
          type: 'string',
          description: 'Client ID for the test signal'
        },
        symbol: {
          type: 'string',
          description: 'Symbol for the test signal',
          default: 'EURUSD'
        }
      }
    }
  },
  {
    name: 'query_signals',
    description: 'Query recent signals to check their sent field values',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Number of signals to return',
          default: 10
        }
      }
    }
  },
  {
    name: 'run_custom_sql',
    description: 'Execute custom SQL query (use with caution)',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'SQL query to execute'
        },
        params: {
          type: 'array',
          description: 'Query parameters',
          items: { type: 'string' }
        }
      },
      required: ['query']
    }
  },
  {
    name: 'fix_sent_trigger_complete',
    description: 'Complete investigation and fix for sent field trigger issue',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

async function executeQuery(query: string, params: any[] = []): Promise<any> {
  let client: PoolClient | null = null;
  try {
    client = await pool.connect();
    const result = await client.query(query, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!args) {
    return {
      content: [
        {
          type: 'text',
          text: 'No arguments provided'
        }
      ],
      isError: true
    };
  }

  try {
    switch (name) {
      case 'list_triggers': {
        const tableName = args.tableName || 'mt5_signals';
        const query = `
          SELECT
            t.tgname as trigger_name,
            c.relname as table_name,
            p.proname as function_name,
            t.tgenabled as is_enabled,
            pg_get_triggerdef(t.oid) as trigger_definition
          FROM pg_trigger t
          JOIN pg_class c ON t.tgrelid = c.oid
          JOIN pg_proc p ON t.tgfoid = p.oid
          WHERE c.relname = $1
          AND NOT t.tgisinternal
          ORDER BY t.tgname;
        `;
        const result = await executeQuery(query, [tableName]);
        return {
          content: [
            {
              type: 'text',
              text: `Triggers on table ${tableName}:\n${JSON.stringify(result.rows, null, 2)}`
            }
          ]
        };
      }

      case 'list_all_triggers': {
        const query = `
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
        const result = await executeQuery(query);
        return {
          content: [
            {
              type: 'text',
              text: `All triggers in database:\n${JSON.stringify(result.rows, null, 2)}`
            }
          ]
        };
      }

      case 'get_trigger_definition': {
        const triggerName = args.triggerName;
        const query = `
          SELECT
            t.tgname as trigger_name,
            c.relname as table_name,
            p.proname as function_name,
            t.tgenabled as is_enabled,
            pg_get_triggerdef(t.oid) as trigger_definition,
            pg_get_functiondef(p.oid) as function_definition
          FROM pg_trigger t
          JOIN pg_class c ON t.tgrelid = c.oid
          JOIN pg_proc p ON t.tgfoid = p.oid
          WHERE t.tgname = $1
          AND NOT t.tgisinternal;
        `;
        const result = await executeQuery(query, [triggerName]);
        return {
          content: [
            {
              type: 'text',
              text: `Trigger definition for ${triggerName}:\n${JSON.stringify(result.rows, null, 2)}`
            }
          ]
        };
      }

      case 'disable_trigger': {
        const triggerName = args.triggerName;
        const tableName = args.tableName || 'mt5_signals';
        const query = `ALTER TABLE ${tableName} DISABLE TRIGGER ${triggerName};`;
        await executeQuery(query);
        return {
          content: [
            {
              type: 'text',
              text: `Successfully disabled trigger ${triggerName} on table ${tableName}`
            }
          ]
        };
      }

      case 'drop_trigger': {
        const triggerName = args.triggerName;
        const tableName = args.tableName || 'mt5_signals';
        const query = `DROP TRIGGER IF EXISTS ${triggerName} ON ${tableName};`;
        await executeQuery(query);
        return {
          content: [
            {
              type: 'text',
              text: `Successfully dropped trigger ${triggerName} from table ${tableName}`
            }
          ]
        };
      }

      case 'list_rls_policies': {
        const tableName = args.tableName || 'mt5_signals';
        const query = `
          SELECT
            pol.policyname,
            pol.permissive,
            pol.roles,
            pol.cmd,
            pol.qual,
            pol.with_check
          FROM pg_policies pol
          WHERE pol.tablename = $1;
        `;
        const result = await executeQuery(query, [tableName]);
        return {
          content: [
            {
              type: 'text',
              text: `RLS policies on table ${tableName}:\n${JSON.stringify(result.rows, null, 2)}`
            }
          ]
        };
      }

      case 'disable_rls_policy': {
        const policyName = args.policyName;
        const tableName = args.tableName || 'mt5_signals';
        const query = `DROP POLICY IF EXISTS ${policyName} ON ${tableName};`;
        await executeQuery(query);
        return {
          content: [
            {
              type: 'text',
              text: `Successfully dropped RLS policy ${policyName} from table ${tableName}`
            }
          ]
        };
      }

      case 'test_signal_insertion': {
        const clientId = args.clientId || 'test_client_' + Date.now();
        const symbol = args.symbol || 'EURUSD';

        // Insert a test signal with sent = false
        const insertQuery = `
          INSERT INTO mt5_signals (client_id, symbol, signal, entry, stop_loss, take_profit, sent, processed, created_at)
          VALUES ($1, $2, 'BUY', 1.1000, 1.0950, 1.1050, false, false, NOW())
          RETURNING id, sent, processed, created_at;
        `;
        const insertResult = await executeQuery(insertQuery, [clientId, symbol]);

        // Immediately check the inserted record
        const checkQuery = `
          SELECT id, sent, processed, created_at
          FROM mt5_signals
          WHERE id = $1;
        `;
        const checkResult = await executeQuery(checkQuery, [insertResult.rows[0].id]);

        return {
          content: [
            {
              type: 'text',
              text: `Test signal insertion results:\nInserted: ${JSON.stringify(insertResult.rows[0])}\nRetrieved: ${JSON.stringify(checkResult.rows[0])}\n\nSignal sent field remained: ${checkResult.rows[0].sent ? 'TRUE (problematic!)' : 'FALSE (good!)'}`
            }
          ]
        };
      }

      case 'query_signals': {
        const limit = args.limit || 10;
        const query = `
          SELECT id, client_id, symbol, signal, sent, processed, created_at
          FROM mt5_signals
          ORDER BY created_at DESC
          LIMIT $1;
        `;
        const result = await executeQuery(query, [limit]);
        return {
          content: [
            {
              type: 'text',
              text: `Recent signals (last ${limit}):\n${JSON.stringify(result.rows, null, 2)}`
            }
          ]
        };
      }

      case 'run_custom_sql': {
        const query = args.query as string;
        const params = (args.params as string[]) || [];
        const result = await executeQuery(query, params);
        return {
          content: [
            {
              type: 'text',
              text: `SQL query results:\n${JSON.stringify(result.rows, null, 2)}`
            }
          ]
        };
      }

      case 'fix_sent_trigger_complete': {
        // Complete investigation and fix for the sent trigger issue
        const results = [];

        // Step 1: Check current signals
        const signalsQuery = `
          SELECT id, client_id, symbol, signal, sent, processed, created_at
          FROM mt5_signals
          ORDER BY created_at DESC
          LIMIT 5;
        `;
        const signalsResult = await executeQuery(signalsQuery);
        results.push(`Current signals (last 5):\n${JSON.stringify(signalsResult.rows, null, 2)}\n`);

        // Step 2: List triggers on mt5_signals
        const triggersQuery = `
          SELECT
            t.tgname as trigger_name,
            c.relname as table_name,
            p.proname as function_name,
            t.tgenabled as is_enabled,
            CASE t.tgenabled
              WHEN 'O' THEN 'ENABLED'
              WHEN 'D' THEN 'DISABLED'
              ELSE 'UNKNOWN'
            END as status,
            pg_get_triggerdef(t.oid) as trigger_definition
          FROM pg_trigger t
          JOIN pg_class c ON t.tgrelid = c.oid
          JOIN pg_proc p ON t.tgfoid = p.oid
          WHERE c.relname = 'mt5_signals'
          AND NOT t.tgisinternal
          ORDER BY t.tgname;
        `;
        const triggersResult = await executeQuery(triggersQuery);
        results.push(`Triggers on mt5_signals:\n${JSON.stringify(triggersResult.rows, null, 2)}\n`);

        // Step 3: List RLS policies
        const rlsQuery = `
          SELECT
            pol.policyname,
            pol.permissive,
            pol.roles,
            pol.cmd,
            pol.qual as using_clause,
            pol.with_check as check_clause
          FROM pg_policies pol
          WHERE pol.tablename = 'mt5_signals'
          ORDER BY pol.policyname;
        `;
        const rlsResult = await executeQuery(rlsQuery);
        results.push(`RLS policies on mt5_signals:\n${JSON.stringify(rlsResult.rows, null, 2)}\n`);

        // Step 4: Create test signal
        const testClientId = 'trigger_fix_test_' + Date.now() + '@example.com';
        const insertQuery = `
          INSERT INTO mt5_signals (
            client_id, user_id, symbol, signal, confidence, entry, stop_loss, take_profit,
            risk_amount, timestamp, ai_analysis, sent, processed, status, created_at, eurusd_rate
          ) VALUES (
            $1, '00000000-0000-0000-0000-000000000000', 'EURUSD', 'BUY', 90,
            1.0850, 1.0800, 1.0900, 100, NOW(),
            'Trigger fix test signal - ' || NOW(), false, false, 'pending', NOW(), 1.0850
          ) RETURNING id, sent, processed, created_at;
        `;
        const insertResult = await executeQuery(insertQuery, [testClientId]);
        const testSignalId = insertResult.rows[0].id;

        results.push(`Test signal created:\n${JSON.stringify(insertResult.rows[0], null, 2)}\n`);

        // Step 5: Monitor for 5 seconds
        for (let i = 1; i <= 5; i++) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          const checkQuery = `
            SELECT sent, processed, created_at
            FROM mt5_signals
            WHERE id = $1;
          `;
          const checkResult = await executeQuery(checkQuery, [testSignalId]);
          const currentStatus = checkResult.rows[0];
          results.push(`Check ${i}s: sent=${currentStatus.sent}, processed=${currentStatus.processed}`);

          if (currentStatus.sent !== insertResult.rows[0].sent) {
            results.push(`🚨 TRIGGER DETECTED! sent changed from false to true at ${i} seconds`);
            break;
          }
        }

        // Step 6: Recommendations
        results.push('\n=== RECOMMENDATIONS ===');
        if (triggersResult.rows.length > 0) {
          results.push('Found triggers that may be causing the issue:');
          triggersResult.rows.forEach((trigger: any) => {
            results.push(`- ${trigger.trigger_name} (${trigger.status}): ${trigger.function_name}`);
          });
          results.push('\nTo disable a trigger, run:');
          results.push(`ALTER TABLE mt5_signals DISABLE TRIGGER [trigger_name];`);
        } else {
          results.push('No triggers found on mt5_signals table');
        }

        if (rlsResult.rows.length > 0) {
          results.push('\nFound RLS policies that may be causing the issue:');
          rlsResult.rows.forEach((policy: any) => {
            results.push(`- ${policy.policyname}: ${policy.cmd}`);
          });
        }

        results.push('\nAlternative solutions:');
        results.push('1. Use a different column (e.g., sent_to_ea)');
        results.push('2. Modify EA to check processed field instead');
        results.push('3. Create new table for EA communication');

        return {
          content: [
            {
              type: 'text',
              text: results.join('\n')
            }
          ]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error executing ${name}: ${error instanceof Error ? error.message : String(error)}`
        }
      ],
      isError: true
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Supabase DB Manager MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});