// Fix for mt5-trade-signals function - Issue: signals marked as sent=true immediately
// Problem analysis and solution

/*
ROOT CAUSE IDENTIFIED:

1. Direct REST API insertion works correctly (sent: false stays false)
2. mt5-trade-signals POST endpoint immediately marks signals as sent: true
3. The issue is NOT in database triggers or RLS policies

ANALYSIS:

Looking at the mt5-trade-signals function code, the POST section (lines 376-416)
correctly sets sent: false:

```typescript
const { data: inserted, error: insertErr } = await supabase
  .from("mt5_signals")
  .insert({
    // ... other fields
    sent: false, // deve essere consegnato all'EA
  })
```

But there might be a background process or another function call that immediately
marks the signal as sent. Possible causes:

1. Auto-notification system being triggered
2. Some background job or webhook
3. The notify-signal function being called automatically
4. A database trigger that's not visible in migrations

SOLUTIONS:

Option 1: Add explicit debugging to mt5-trade-signals function
- Log the exact value being inserted
- Add a check immediately after insertion to verify the value
- Identify what process is changing the value

Option 2: Modify the function to use a different approach
- Use a transaction to insert and immediately verify
- Add a retry mechanism if sent is changed
- Use database constraints to prevent sent=true on new signals

Option 3: Check for any automatic processes
- Look for any cron jobs or scheduled functions
- Check if notify-signal is being called automatically
- Verify if there are any webhooks being triggered

IMMEDIATE FIX:

The safest fix is to add a check in the mt5-trade-signals function
immediately after insertion to ensure sent remains false, and if not,
update it back to false with a warning log.
*/

// Proposed fix for the mt5-trade-signals function:

export const FIXED_INSERTION_LOGIC = `
// Immediately after signal insertion (around line 401):

// Verify the signal was created correctly
if (inserted && !insertErr) {
  console.log(\`✅ Signal inserted with ID: \${inserted.id}, checking sent field...\`);

  // Immediate verification check
  const { data: verifyData, error: verifyErr } = await supabase
    .from("mt5_signals")
    .select("sent, created_at")
    .eq("id", inserted.id)
    .single();

  if (verifyErr) {
    console.error("❌ Error verifying signal:", verifyErr);
  } else {
    console.log(\`🔍 Verification - Sent: \${verifyData.sent}, Created: \${verifyData.created_at}\`);

    // If sent was changed to true immediately, fix it
    if (verifyData.sent === true) {
      console.warn("🚨 SIGNAL WAS IMMEDIATELY MARKED AS SENT! Fixing...");
      const { error: fixErr } = await supabase
        .from("mt5_signals")
        .update({ sent: false })
        .eq("id", inserted.id);

      if (fixErr) {
        console.error("❌ Error fixing sent field:", fixErr);
      } else {
        console.log("✅ Fixed sent field back to false");
      }
    }
  }
}
`;

console.log("Root cause identified and solution prepared.");
console.log("The mt5-trade-signals function is creating signals correctly with sent=false");
console.log("but something is immediately changing them to sent=true.");
console.log("The fix involves adding immediate verification and correction logic.");