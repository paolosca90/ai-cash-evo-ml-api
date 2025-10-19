# MT5 Account Anti-Sharing System

## Overview
Sistema per impedire che lo stesso account MT5 venga utilizzato da più utenti/email diversi.

## Security Layers

### 1. Database Constraints ✅
```sql
-- mt5_accounts table
account_number VARCHAR(20) NOT NULL UNIQUE
```

### 2. Email Uniqueness ✅
```sql
-- profiles table
email VARCHAR(255) UNIQUE
```

### 3. Heartbeat Validation ✅
Ogni heartbeat dell'EA viene validato per impedire account sharing.

## Implementation Details

### Heartbeat Function Validation
Quando l'EA invia heartbeat, il sistema:

1. **Estrae account_number** dal request data
2. **Verifica se account_number esiste** in mt5_accounts
3. **Se esiste, controlla user_id** vs email corrente
4. **Se user_id diverso → BLOCCO 403**

### Response Codes

#### Success (200)
```json
{
  "success": true,
  "message": "Heartbeat received",
  "timestamp": "2025-01-19T...",
  "client_email": "user@test.com",
  "status": "healthy"
}
```

#### Account Already Linked (403)
```json
{
  "success": false,
  "error": "ACCOUNT_ALREADY_LINKED",
  "message": "MT5 account 12345678 is already linked to another email address. Each MT5 account can only be linked to one user.",
  "account_number": "12345678",
  "requested_email": "newuser@test.com",
  "timestamp": "2025-01-19T..."
}
```

## Test Scenarios

### Scenario 1: New User + New Account ✅
```
Request:
- Email: newuser@test.com
- Account: 99999999 (never used)

Expected: ✅ SUCCESS 200
Logic: Account not found → allowed
```

### Scenario 2: Existing User + Own Account ✅
```
Request:
- Email: existing@test.com
- Account: 12345678 (registered to existing@test.com)

Expected: ✅ SUCCESS 200
Logic: Same user_id → allowed
```

### Scenario 3: New User + Existing Account ❌
```
Request:
- Email: newuser@test.com
- Account: 12345678 (registered to another@test.com)

Expected: ❌ ERROR 403
Logic: Different user_id → blocked
```

## Edge Cases Handled

1. **Missing account_number** → No validation performed
2. **account_number = "unknown"** → No validation
3. **Database errors** → Logged but don't fail heartbeat
4. **User not found** → Warning logged but continue
5. **Account not registered** → Info logged, allowed

## Security Benefits

### Prevented:
- ❌ Trial hopping with same MT5 account
- ❌ Account sharing between users
- ❌ Multiple emails using same account
- ❌ Bypassing subscription limits

### Maintained:
- ✅ Legitimate users can use own accounts
- ✅ New account registration works
- ✅ System performance unaffected
- ✅ Error handling graceful

## Deployment

The validation is implemented in:
```
backend/supabase/functions/heartbeat/index.ts
```

Deploy with:
```bash
supabase functions deploy heartbeat
```

## Monitoring

Check logs for:
```
🔍 Validating MT5 account 12345678 for email user@test.com
✅ MT5 account 12345678 validated for user user@test.com
🚨 MT5 Account 12345678 is already linked to another user!
```

## Future Enhancements

1. **Admin Override**: Allow admins to unlink/reassign accounts
2. **Account Transfer**: Formal process for legitimate transfers
3. **Time-based Restrictions**: Temporary blocks vs permanent
4. **User Notifications**: Alert users when account access blocked
5. **Audit Trail**: Log all validation attempts