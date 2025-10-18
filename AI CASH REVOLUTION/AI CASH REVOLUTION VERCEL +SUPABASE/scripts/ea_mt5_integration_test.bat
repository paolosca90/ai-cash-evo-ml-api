@echo off
echo ===================================================
echo AI Cash Revolution - EA MT5 Integration Test
echo ===================================================
echo.

set SUPABASE_URL=https://rvopmdflnecyrwrzhyfy.supabase.co
set SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2b3BtZGZsbmVjeXJ3cnpoeWZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODU0Nzg4NCwiZXhwIjoyMDc0MTIzODg0fQ.SopBfRPsnDNEOuje4BUtmplVKu1awpiZes0wlQCKugA

echo [1] Testing EA MT5 Signal Retrieval (every 5 seconds)...
curl -s -X GET "%SUPABASE_URL%/functions/v1/mt5-trade-signals?email=test@example.com" ^
     -H "apikey: %SERVICE_KEY%" ^
     -H "Authorization: Bearer %SERVICE_KEY%"
echo.

echo [2] Testing EA MT5 Heartbeat (every 30 seconds)...
curl -s -X GET "%SUPABASE_URL%/functions/v1/heartbeat?email=test@example.com" ^
     -H "apikey: %SERVICE_KEY%" ^
     -H "Authorization: Bearer %SERVICE_KEY%"
echo.

echo [3] Creating Test Signal for EA MT5...
curl -s -X POST "%SUPABASE_URL%/functions/v1/mt5-trade-signals?email=test@example.com" ^
     -H "apikey: %SERVICE_KEY%" ^
     -H "Content-Type: application/json" ^
     -d "{\"symbol\":\"GBPUSD\",\"signal\":\"SELL\",\"entry\":1.2750,\"stopLoss\":1.2800,\"takeProfit\":1.2700,\"confidence\":80,\"riskAmount\":150}"
echo.

echo [4] Testing Signal Retrieval After Creation...
curl -s -X GET "%SUPABASE_URL%/functions/v1/mt5-trade-signals?email=test@example.com" ^
     -H "apikey: %SERVICE_KEY%" ^
     -H "Authorization: Bearer %SERVICE_KEY%"
echo.

echo [5] Testing Trade Update (Simulating EA Execution)...
curl -s -X POST "%SUPABASE_URL%/functions/v1/trade-update" ^
     -H "Authorization: Bearer %SERVICE_KEY%" ^
     -H "Content-Type: application/json" ^
     -d "{\"signal_id\":\"test-signal-123\",\"client_id\":\"test@example.com\",\"status\":\"EXECUTED\",\"execution_price\":1.2748,\"profit\":25.50}"
echo.

echo [6] Final Heartbeat Check...
curl -s -X GET "%SUPABASE_URL%/functions/v1/heartbeat?email=test@example.com" ^
     -H "apikey: %SERVICE_KEY%" ^
     -H "Authorization: Bearer %SERVICE_KEY%"
echo.

echo ===================================================
echo EA MT5 Integration Test Complete!
echo ===================================================
pause