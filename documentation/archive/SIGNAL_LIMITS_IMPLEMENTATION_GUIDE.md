# Signal Limits System Implementation Guide

## Overview
This guide explains how to implement and use the signal limits system that tracks daily signal usage based on subscription tiers.

## Database Migration

### Step 1: Execute the Migration
1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase/migrations/20250930000000_signal_limits_system.sql`
4. Click **Run** to execute the migration

### Step 2: Verify Installation
1. Execute the test script: Copy contents of `test-signal-functions.sql`
2. Run the verification queries to ensure all functions are created correctly

## Function Reference

### 1. `can_generate_signal(user_uuid?)`
Checks if a user can generate more signals based on their subscription tier.

**Parameters:**
- `user_uuid` (optional): User ID, defaults to current authenticated user

**Returns:** JSON object with:
```json
{
  "can_generate": true/false,
  "remaining": 0,           // Signals remaining today
  "daily_limit": 1,         // Daily limit based on tier
  "used_today": 0,          // Signals used today
  "tier": "essential",      // Current subscription tier
  "reset_time": "2025-10-01T00:00:00Z", // When daily count resets
  "error": null             // Error message if any
}
```

### 2. `increment_signal_usage(user_uuid?)`
Increments the signal usage count when a signal is generated.

**Parameters:**
- `user_uuid` (optional): User ID, defaults to current authenticated user

**Returns:** JSON object with:
```json
{
  "success": true/false,
  "error": null,
  "remaining": 0,           // Signals remaining after increment
  "daily_limit": 1,
  "used_today": 1,          // Updated usage count
  "tier": "essential"
}
```

### 3. `get_signal_usage(user_uuid?)`
Gets current signal usage statistics for a user.

**Parameters:**
- `user_uuid` (optional): User ID, defaults to current authenticated user

**Returns:** JSON object with:
```json
{
  "error": null,
  "remaining": 0,
  "daily_limit": 1,
  "used_today": 0,
  "tier": "essential",
  "reset_time": "2025-10-01T00:00:00Z",
  "can_generate": true/false
}
```

## Subscription Tiers and Limits

| Tier | Daily Limit | Description |
|------|-------------|-------------|
| Essential | 1 signal/day | Basic plan |
| Professional | 999 signals/day | Professional plan (effectively unlimited) |
| Enterprise | 9999 signals/day | Enterprise plan (effectively unlimited) |

## Implementation in Application

### React/TypeScript Implementation

```typescript
import { supabase } from '@/integrations/supabase/client';

// Check if user can generate signals
async function canUserGenerateSignal(): Promise<boolean> {
  const { data, error } = await supabase.rpc('can_generate_signal');

  if (error) {
    console.error('Error checking signal limit:', error);
    return false;
  }

  return data?.can_generate || false;
}

// Increment signal usage
async function incrementSignalUsage(): Promise<boolean> {
  const { data, error } = await supabase.rpc('increment_signal_usage');

  if (error) {
    console.error('Error incrementing signal usage:', error);
    return false;
  }

  return data?.success || false;
}

// Get current usage stats
async function getSignalUsage() {
  const { data, error } = await supabase.rpc('get_signal_usage');

  if (error) {
    console.error('Error getting signal usage:', error);
    return null;
  }

  return data;
}
```

### Example Usage in Signal Generation

```typescript
async function generateSignal(signalParams: SignalParams): Promise<Signal | null> {
  // 1. Check if user can generate signal
  const canGenerate = await canUserGenerateSignal();
  if (!canGenerate) {
    const usage = await getSignalUsage();
    throw new Error(`Daily signal limit exceeded. Limit: ${usage?.daily_limit}, Used: ${usage?.used_today}`);
  }

  // 2. Generate the signal
  const signal = await generateAISignal(signalParams);

  // 3. Increment usage count
  const incrementSuccess = await incrementSignalUsage();
  if (!incrementSuccess) {
    console.error('Failed to increment signal usage');
    // Signal was generated but usage not tracked - handle appropriately
  }

  return signal;
}
```

### Edge Function Implementation

```typescript
// Example in an Edge Function
import { createClient } from '@supabase/supabase-js'

Deno.serve(async (req: Request) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Get user from auth token
  const { data: { user }, error: authError } = await supabase.auth.getUser(
    req.headers.get('Authorization')?.replace('Bearer ', '')
  );

  if (authError || !user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Check signal limits
  const { data: canGenerate } = await supabase.rpc('can_generate_signal', {
    user_uuid: user.id
  });

  if (!canGenerate?.can_generate) {
    return new Response(JSON.stringify({
      error: 'Signal limit exceeded',
      remaining: canGenerate?.remaining,
      reset_time: canGenerate?.reset_time
    }), { status: 429 });
  }

  // Generate signal...
  const signal = await generateSignal();

  // Increment usage
  await supabase.rpc('increment_signal_usage', {
    user_uuid: user.id
  });

  return new Response(JSON.stringify(signal));
});
```

## Database Schema

### daily_signal_usage Table
```sql
CREATE TABLE daily_signal_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
    signals_used INTEGER NOT NULL DEFAULT 0,
    signals_limit INTEGER NOT NULL DEFAULT 1,
    subscription_tier TEXT NOT NULL DEFAULT 'essential',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, usage_date)
);
```

## Row-Level Security

The system implements row-level security so:
- Users can only see their own signal usage records
- Functions are SECURITY DEFINER to work with proper permissions
- Authenticated users have access to their data

## Automated Features

### 1. Daily Reset
- Signal usage automatically resets at midnight UTC
- Each day gets a fresh record for each user

### 2. Subscription Tier Updates
- When a user's subscription tier changes, signal limits update automatically
- Trigger on profiles table updates current day's usage record

### 3. Data Cleanup
- Automatic cleanup function removes records older than 30 days
- Can be called manually: `SELECT cleanup_old_signal_usage();`

### 4. Usage Analytics
- Summary view provides analytics on signal usage across all users
- View: `signal_usage_summary`

## Testing

1. Use the `test-signal-functions.sql` script to verify installation
2. Test with real user data in a development environment
3. Verify RLS policies work correctly
4. Test edge cases (user not authenticated, tier changes, etc.)

## Error Handling

Common error scenarios:
- User not authenticated: Returns appropriate error in functions
- Daily limit exceeded: `can_generate_signal` returns false with reason
- Database errors: Functions return error messages in JSON response

## Performance Considerations

- Indexed for optimal query performance
- Unique constraint prevents duplicate daily records
- Row-level locking prevents race conditions in `increment_signal_usage`
- Cleanup function prevents table growth over time

## Security

- All functions are SECURITY DEFINER for proper access control
- Row-level security ensures data isolation
- Input validation in all functions
- No sensitive data exposed in error messages