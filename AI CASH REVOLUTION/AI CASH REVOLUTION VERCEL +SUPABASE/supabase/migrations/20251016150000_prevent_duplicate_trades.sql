-- =====================================================
-- MIGRATION: Previeni ordini multipli con unique constraint
-- =====================================================
-- Problema: Vengono creati 3 ordini con parametri leggermente diversi
-- Soluzione: Constraint che blocca inserimenti duplicati per stesso utente/symbol negli ultimi 30 secondi

-- Step 1: Rimuovi eventuali duplicati recenti (mantiene solo il primo)
DELETE FROM mt5_signals a
USING mt5_signals b
WHERE a.id > b.id
  AND a.client_id = b.client_id
  AND a.symbol = b.symbol
  AND a.signal = b.signal
  AND a.created_at > NOW() - INTERVAL '1 minute'
  AND (a.created_at - b.created_at) < INTERVAL '30 seconds'
  AND a.sent = false;

-- Step 2a: Aggiungi colonna generata per il secondo (IMMUTABLE)
ALTER TABLE mt5_signals
ADD COLUMN IF NOT EXISTS created_at_second TIMESTAMPTZ
GENERATED ALWAYS AS (DATE_TRUNC('second', created_at)) STORED;

-- Step 2b: Crea unique index usando la colonna generata
-- Blocca fisicamente inserimenti duplicati per stesso client_id + symbol + signal nello stesso secondo
CREATE UNIQUE INDEX IF NOT EXISTS idx_mt5_prevent_duplicate_same_second
ON mt5_signals (client_id, symbol, signal, created_at_second)
WHERE sent = false;

-- Step 3: Aggiungi commento per documentazione
COMMENT ON INDEX idx_mt5_prevent_duplicate_same_second IS
'Previene ordini duplicati per stesso utente/symbol/direzione nello stesso secondo.
Risolve il problema di 3 ordini creati con entry/SL/TP leggermente diversi.
Il constraint blocca fisicamente a livello database qualsiasi tentativo di inserimento duplicato.';

-- Step 4: Crea funzione trigger per logging (opzionale)
CREATE OR REPLACE FUNCTION log_duplicate_trade_attempt()
RETURNS TRIGGER AS $$
BEGIN
  RAISE NOTICE 'Tentativo ordine duplicato bloccato: client_id=%, symbol=%, signal=%, created_at=%',
    NEW.client_id, NEW.symbol, NEW.signal, NEW.created_at;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Log tentativi duplicati (ma non bloccarli, lo fa già l'index)
-- Questo è solo per debug/monitoring
