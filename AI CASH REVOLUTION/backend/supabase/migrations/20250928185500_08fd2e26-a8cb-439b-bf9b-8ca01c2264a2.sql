-- Elimina tutti i segnali mock dal database
DELETE FROM public.mt5_signals;

-- Elimina tutti gli eventi di trade log (se presenti)
DELETE FROM public.trade_events_log;

-- Elimina tutti i segnali ML ottimizzati (se presenti) 
DELETE FROM public.ml_optimized_signals;

-- Reset degli analytics di trading (dato che i dati erano mock)
DELETE FROM public.trading_analytics;