@echo off
echo ========================================
echo AI CASH REVOLUTION - FUNCTION CLEANUP
echo ========================================
echo.

echo This script will delete 45 redundant functions and keep only essential ones.
echo Press Ctrl+C to cancel or any key to continue...
pause > nul

echo.
echo [1/3] Deleting redundant signal generation functions...
supabase functions delete advanced-ml-signals --force
supabase functions delete generate-ml-signals --force
supabase functions delete synthetic-signal-generator --force
supabase functions delete random-signal-scheduler --force
supabase functions delete generate-ai-signals-fast --force
supabase functions delete generate-ai-signals-test --force
supabase functions delete generate-ai-signals-simple --force
supabase functions delete generate-ai-signals-public --force
supabase functions delete generate-ai-signals-v2 --force
supabase functions delete generate-ai-signals-v3 --force

echo.
echo [2/3] Deleting ML and optimization functions...
supabase functions delete ml-weight-optimizer --force
supabase functions delete ml-signal-optimizer --force
supabase functions delete ml-performance-tracker --force
supabase functions delete ml-auto-retrain --force
supabase functions delete ml-historical-training --force
supabase functions delete ml-advanced-neural --force
supabase functions delete ml-validate --force
supabase functions delete ml-trading-optimizer --force
supabase functions delete trading-auto-optimizer --force
supabase functions delete trade-optimization-trigger --force

echo.
echo [3/3] Deleting monitoring and data feed functions...
supabase functions delete tradingview-market-data --force
supabase functions delete fetch-financial-news --force
supabase functions delete fetch-economic-calendar --force
supabase functions delete update-economic-calendar --force
supabase functions delete fetch-investing-news-it --force
supabase functions delete debug-mt5-signals --force
supabase functions delete reset-mt5-signals --force
supabase functions delete cleanup-old-signals --force
supabase functions delete cleanup-null-entries --force
supabase functions delete signal-tick-monitor --force
supabase functions delete price-tick-cron --force
supabase functions delete historical-data-cache --force
supabase functions delete realtime-trade-webhook --force

echo.
echo Deleting research functions...
supabase functions delete finrl-deepseek-relay --force
supabase functions delete rl-inference --force
supabase functions delete llm-sentiment --force
supabase functions delete get-real-indicators --force

echo.
echo Deploying core functions...
supabase functions deploy generate-ai-signals
supabase functions deploy mt5-trade-signals
supabase functions deploy auto-signal-generator
supabase functions deploy auto-oanda-trader
supabase functions deploy auto-result-updater
supabase functions deploy user-api-keys
supabase functions deploy auth-email-handler
supabase functions deploy welcome-email
supabase functions deploy password-reset-email

echo.
echo ========================================
echo CLEANUP COMPLETED!
echo ========================================
echo.
echo Remaining functions:
supabase functions list

echo.
echo Press any key to exit...
pause > nul