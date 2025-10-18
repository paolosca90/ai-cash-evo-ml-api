#!/bin/bash

# Test script per MT5 Signals - Fix Verification
# Script per testare l'Edge Function mt5-trade-signals dopo il fix

echo "🧪 TESTING MT5 SIGNALS FIX"
echo "================================"

# Configuration
SUPABASE_URL="https://rvopmtdfloneyfkqdzsp.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2b3BtZGZsbmVjeXJ3cnpoeWZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NDc4ODQsImV4cCI6MjA3NDEyMzg4NH0.snlFF1ChbYsA765gXE-cMGb11jHIaF2np_pNxIGLgW9U"

TEST_EMAIL="test@example.com"
FUNCTION_URL="${SUPABASE_URL}/functions/v1/mt5-trade-signals"

echo "📧 Test Email: $TEST_EMAIL"
echo "🔗 Function URL: $FUNCTION_URL"
echo ""

# Test 1: POST - Create new signal
echo "🧪 TEST 1: POST - Create MT5 Signal"
echo "------------------------------------"

curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "x-user-email: $TEST_EMAIL" \
  -d '{
    "symbol": "EURUSD",
    "signal": "BUY",
    "entry": 1.1330,
    "stopLoss": 1.1305,
    "takeProfit": 1.1380,
    "confidence": 92,
    "riskAmount": 100,
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'",
    "aiAnalysis": {
      "reasoning": "Test signal for MT5 fix verification",
      "keyFactors": ["Technical confluence", "Market structure", "Session timing"]
    }
  }' | jq '.'

echo ""
echo "🧪 TEST 2: GET - Retrieve signals for EA"
echo "-----------------------------------------"

curl -X GET "$FUNCTION_URL?email=$TEST_EMAIL" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "x-user-email: $TEST_EMAIL" | jq '.'

echo ""
echo "🔍 TEST 3: Check signal status in database"
echo "-------------------------------------------"

curl -X POST "${SUPABASE_URL}/rest/v1/rpc/get_mt5_signals_status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d '{"email_input": "'$TEST_EMAIL'"}' | jq '.'

echo ""
echo "✅ TESTING COMPLETED"
echo "===================="
echo "✓ If POST returns success: signal insertion working"
echo "✓ If GET returns signals: EA can read signals"
echo "✓ If signals marked as sent: system functioning correctly"
echo ""
echo "🐛 If tests fail, check:"
echo "1. Network connectivity to Supabase"
echo "2. Edge Function logs in Supabase Dashboard"
echo "3. Database permissions and RLS policies"
echo "4. validate_email_api_key function exists"