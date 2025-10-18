-- Pulizia segnali problematici con risk_amount nullo o zero
-- Questi segnali causano il fallback a 0.01 lot nell'EA

-- 1. Visualizza i segnali problematici
SELECT
    id,
    symbol,
    signal,
    confidence,
    entry,
    stop_loss,
    take_profit,
    risk_amount,
    status,
    sent,
    timestamp,
    created_at
FROM public.mt5_signals
WHERE risk_amount IS NULL OR risk_amount = 0
ORDER BY timestamp DESC
LIMIT 20;

-- 2. Elimina segnali vecchi non inviati con risk_amount null/0
DELETE FROM public.mt5_signals
WHERE risk_amount IS NULL OR risk_amount = 0
AND sent = false
AND timestamp < NOW() - INTERVAL '1 hour';

-- 3. Marca come inviati i segnali problematici vecchi per evitare che l'EA li processi
UPDATE public.mt5_signals
SET sent = true, status = 'cancelled'
WHERE risk_amount IS NULL OR risk_amount = 0
AND sent = false
AND timestamp < NOW() - INTERVAL '30 minutes';

-- 4. Verifica il risultato
SELECT
    COUNT(*) as total_problematic_signals,
    COUNT(CASE WHEN sent = false THEN 1 END) as unsent_signals,
    COUNT(CASE WHEN sent = true THEN 1 END) as sent_signals
FROM public.mt5_signals
WHERE risk_amount IS NULL OR risk_amount = 0;