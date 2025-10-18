# Supabase Database Trigger Fix Guide

## Problem Statement
The MT5 Expert Advisor (EA) cannot receive trading signals because a database trigger or RLS policy automatically changes the `sent` field from `false` to `true` immediately after signal insertion.

## Files Created for Investigation

### 1. MCP Server (`src/index.ts`)
A complete Model Context Protocol server with tools to:
- List all triggers on mt5_signals table
- List all triggers in the database
- Get detailed trigger definitions
- Disable or drop triggers
- List RLS policies
- Test signal insertion with monitoring
- Query recent signals

**Usage:**
```bash
npm run build
node dist/index.js
```

### 2. Investigation Scripts
- `check-triggers-rest.js` - REST API approach to investigate triggers
- `investigate-triggers.js` - Supabase client approach
- `direct-db-test.cjs` - Direct PostgreSQL connection

## Step-by-Step Solution

### Step 1: Access Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project: `rvopmdflnecyrwrzhyfy`
3. Navigate to **Database** section

### Step 2: Check for Triggers
1. In Database section, go to **Triggers** tab
2. Look for any triggers on the `mt5_signals` table
3. Common trigger names to look for:
   - `set_sent_true`
   - `mt5_signals_sent_trigger`
   - `auto_mark_sent`
   - `update_sent_field`
   - Any trigger with function that modifies `sent` field

### Step 3: Check Trigger Functions
1. Go to **Database** → **SQL Editor**
2. Run this query to see all triggers on mt5_signals:

```sql
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
```

### Step 4: Check RLS Policies
1. Go to **Authentication** → **Policies** tab
2. Look for policies on `mt5_signals` table
3. Check if any policy has a `WITH CHECK` clause that modifies `sent`

Or run this SQL:
```sql
SELECT
    pol.policyname,
    pol.permissive,
    pol.roles,
    pol.cmd,
    pol.qual,
    pol.with_check
FROM pg_policies pol
WHERE pol.tablename = 'mt5_signals';
```

### Step 5: Get Trigger Function Definition
If you find a trigger, get its function definition:
```sql
SELECT pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_trigger t ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'mt5_signals'
AND t.tgname = 'YOUR_TRIGGER_NAME';
```

### Step 6: Disable the Problematic Trigger

#### Option A: Disable Trigger (Recommended first)
```sql
ALTER TABLE mt5_signals DISABLE TRIGGER trigger_name;
```

#### Option B: Drop Trigger (Permanent)
```sql
DROP TRIGGER trigger_name ON mt5_signals;
```

#### Option C: Drop Trigger Function (if no longer needed)
```sql
DROP FUNCTION function_name();
```

### Step 7: Test the Fix

#### Test 1: Create Test Signal
```sql
INSERT INTO mt5_signals (
    client_id,
    user_id,
    symbol,
    signal,
    entry,
    stop_loss,
    take_profit,
    confidence,
    risk_amount,
    timestamp,
    ai_analysis,
    sent,
    processed,
    status,
    created_at,
    eurusd_rate
) VALUES (
    'test_fix@example.com',
    '00000000-0000-0000-0000-000000000000',
    'EURUSD',
    'BUY',
    1.0850,
    1.0800,
    1.0900,
    85,
    100,
    NOW(),
    'Test signal after trigger fix',
    false,
    false,
    'pending',
    NOW(),
    1.0850
) RETURNING id, sent, processed;
```

#### Test 2: Verify Signal Stays with sent=false
```sql
SELECT id, sent, processed, created_at
FROM mt5_signals
WHERE client_id = 'test_fix@example.com'
ORDER BY created_at DESC
LIMIT 1;
```

### Step 8: Alternative Solutions (if trigger cannot be disabled)

#### Option A: Use Different Column
```sql
ALTER TABLE mt5_signals ADD COLUMN sent_to_ea BOOLEAN DEFAULT false;

-- Update EA to look for sent_to_ea = false instead of sent = false
-- When EA processes signal, set sent_to_ea = true
```

#### Option B: Use Processed Field
```sql
-- Modify EA to look for processed = false instead of sent = false
-- Set processed = true when EA processes the signal
```

#### Option C: Create New Table for EA Signals
```sql
CREATE TABLE mt5_ea_signals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    signal_id UUID REFERENCES mt5_signals(id),
    client_id TEXT NOT NULL,
    sent_to_ea BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## MCP Server Tools Usage

Once the MCP server is running, you can use these tools:

### List Triggers
```json
{
  "tool": "list_triggers",
  "arguments": {
    "tableName": "mt5_signals"
  }
}
```

### Disable Trigger
```json
{
  "tool": "disable_trigger",
  "arguments": {
    "triggerName": "trigger_name",
    "tableName": "mt5_signals"
  }
}
```

### Drop Trigger
```json
{
  "tool": "drop_trigger",
  "arguments": {
    "triggerName": "trigger_name",
    "tableName": "mt5_signals"
  }
}
```

### Test Signal Insertion
```json
{
  "tool": "test_signal_insertion",
  "arguments": {
    "clientId": "test@example.com",
    "symbol": "EURUSD"
  }
}
```

## Critical Notes

1. **BACKUP FIRST**: Always backup your database before making changes
2. **TEST IN STAGING**: Test any changes in a staging environment first
3. **EA COMPATIBILITY**: Ensure MT5 EA is compatible with any field changes
4. **MONITOR**: After fixing, monitor that signals are properly received by EA

## Emergency Commands

If you need to quickly disable all triggers on mt5_signals:
```sql
ALTER TABLE mt5_signals DISABLE TRIGGER ALL;
```

To re-enable triggers (if needed):
```sql
ALTER TABLE mt5_signals ENABLE TRIGGER ALL;
```

## Verification Checklist

After applying the fix:

- [ ] Create test signal with sent=false
- [ ] Verify sent remains false after insertion
- [ ] Check MT5 EA can retrieve the signal
- [ ] Confirm EA properly sets sent=true after processing
- [ ] Monitor signal flow in production
- [ ] Verify no other trading functionality is affected

## Contact & Support

If you need additional help:
1. Check Supabase documentation for trigger management
2. Review your Edge Functions for any signal-related logic
3. Monitor the MT5 EA logs for connection issues
4. Test the complete signal flow from generation to execution

---

**Priority**: CRITICAL - This issue blocks all automated trading functionality
**Impact**: HIGH - Affects all users using MT5 integration
**Urgency**: IMMEDIATE - EA cannot receive any trading signals