-- Check if pg_cron extension is available
SELECT extname, extversion FROM pg_extension WHERE extname = 'pg_cron';