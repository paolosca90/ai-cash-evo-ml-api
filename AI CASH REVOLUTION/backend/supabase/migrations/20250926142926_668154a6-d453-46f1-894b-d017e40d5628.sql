-- Reset completo dei dati di test

-- Cancella tutti i segnali MT5 di test
DELETE FROM public.mt5_signals;

-- Cancella tutte le analytics collettive 
DELETE FROM public.trading_analytics;

-- Reset delle sequenze (se necessario)
-- Questo assicura che gli ID ripartano da capo
SELECT setval(pg_get_serial_sequence('mt5_signals', 'id'), 1, false);

-- Verifica che le tabelle siano vuote
SELECT 'mt5_signals' as tabella, COUNT(*) as records FROM public.mt5_signals
UNION ALL
SELECT 'trading_analytics' as tabella, COUNT(*) as records FROM public.trading_analytics;