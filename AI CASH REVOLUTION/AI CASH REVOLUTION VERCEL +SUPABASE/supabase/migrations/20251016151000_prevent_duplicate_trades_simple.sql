-- =====================================================
-- MIGRATION: Previeni ordini duplicati (SOLUZIONE SEMPLICE)
-- =====================================================
-- Problema: Vengono creati 3 ordini per stessa coppia/direzione
-- Soluzione: Blocca duplicati finché il primo non viene processato (sent=true)

-- Step 1: Rimuovi duplicati recenti esistenti
DELETE FROM mt5_signals a
USING mt5_signals b
WHERE a.id > b.id
  AND a.client_id = b.client_id
  AND a.symbol = b.symbol
  AND a.signal = b.signal
  AND a.sent = false
  AND a.created_at > b.created_at;

-- Step 2: Crea unique constraint su (client_id, symbol, signal) per record NON inviati
-- Questo previene QUALSIASI duplicato finché il segnale non viene processato dall'EA
CREATE UNIQUE INDEX IF NOT EXISTS idx_mt5_one_signal_per_symbol
ON mt5_signals (client_id, symbol, signal)
WHERE sent = false;

-- Step 3: Commento esplicativo
COMMENT ON INDEX idx_mt5_one_signal_per_symbol IS
'Previene ordini duplicati per stessa coppia/direzione.
Solo 1 segnale non-inviato alla volta per client_id + symbol + signal.
Quando EA processa il segnale (sent=true), il constraint si libera e permette nuovi segnali.';

-- Step 4: Funzione per logging errori duplicati
CREATE OR REPLACE FUNCTION notify_duplicate_signal()
RETURNS TRIGGER AS $$
BEGIN
  -- Log nel database per debug
  RAISE WARNING 'Tentativo segnale duplicato bloccato: client=%, symbol=%, signal=%',
    NEW.client_id, NEW.symbol, NEW.signal;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Note:
-- Questo approccio è SEMPLICE e ROBUSTO:
-- - Se premi "Esegui Trade" 3 volte rapidamente, solo il PRIMO viene salvato
-- - I successivi 2 vengono rifiutati dal database con errore di unique constraint
-- - Quando EA legge il segnale e lo marca sent=true, il constraint si libera
-- - Puoi fare un nuovo trade sulla stessa coppia dopo che il primo è stato processato
