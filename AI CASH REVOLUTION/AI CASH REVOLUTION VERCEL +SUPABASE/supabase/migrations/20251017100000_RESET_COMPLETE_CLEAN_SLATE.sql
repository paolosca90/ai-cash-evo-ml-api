-- =====================================================
-- RESET COMPLETO - SOLUZIONE DEFINITIVA
-- =====================================================
-- Questa migration ELIMINA TUTTO e ricrea da zero con logica pulita
--
-- LOGICA NUOVA SEMPLICISSIMA:
-- 1. Button "Analisi" → generate-ai-signals con localAnalysis:true → NESSUN salvataggio DB
-- 2. Button "Esegui su MT5" → mt5-trade-signals → Salva nel DB con sent=false
-- 3. EA fa polling ogni 10 sec → mt5-trade-signals (GET) → preleva segnali sent=false
-- 4. EA esegue trade → mt5-trade-signals (PATCH) → marca processed=true
-- 5. Cron job ogni 10 min → cleanup segnali vecchi sent=false >10 min

-- =====================================================
-- STEP 1: ELIMINA TUTTI I TRIGGER ESISTENTI
-- =====================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP TRIGGER IF EXISTS notify_duplicate_signal ON public.mt5_signals CASCADE;
DROP TRIGGER IF EXISTS log_duplicate_trade_attempt ON public.mt5_signals CASCADE;
DROP TRIGGER IF EXISTS set_sent_false_on_insert ON public.mt5_signals CASCADE;
DROP TRIGGER IF EXISTS auto_set_user_id_trigger ON public.mt5_signals CASCADE;

-- Elimina tutte le funzioni trigger
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS log_duplicate_trade_attempt() CASCADE;
DROP FUNCTION IF EXISTS notify_duplicate_signal() CASCADE;
DROP FUNCTION IF EXISTS auto_set_user_id() CASCADE;

-- =====================================================
-- STEP 2: ELIMINA TUTTI I CRON JOB ESISTENTI
-- =====================================================

DO $$
DECLARE
    job_record RECORD;
BEGIN
    -- Elimina tutti i cron job per mt5_signals
    FOR job_record IN
        SELECT jobname FROM cron.job
        WHERE jobname LIKE '%mt5%' OR jobname LIKE '%signal%' OR jobname LIKE '%cleanup%'
    LOOP
        PERFORM cron.unschedule(job_record.jobname);
        RAISE NOTICE 'Deleted cron job: %', job_record.jobname;
    END LOOP;
END $$;

-- =====================================================
-- STEP 3: PULISCI TABELLA mt5_signals
-- =====================================================

-- Rimuovi tutti i constraint problematici
ALTER TABLE IF EXISTS public.mt5_signals
    DROP CONSTRAINT IF EXISTS idx_mt5_one_signal_per_symbol,
    DROP CONSTRAINT IF EXISTS idx_mt5_prevent_duplicate_same_second;

-- Rimuovi indici duplicati o problematici
DROP INDEX IF EXISTS public.idx_mt5_one_signal_per_symbol;
DROP INDEX IF EXISTS public.idx_mt5_prevent_duplicate_same_second;
DROP INDEX IF EXISTS public.idx_mt5_signals_processed;

-- =====================================================
-- STEP 4: RICREA TABELLA mt5_signals PULITA
-- =====================================================

-- NON eliminare la tabella perché contiene dati storici
-- Invece, assicuriamoci che abbia SOLO i campi necessari

-- Assicurati che questi campi esistano
ALTER TABLE public.mt5_signals
    ADD COLUMN IF NOT EXISTS sent BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Assicurati che created_at abbia un default se manca
ALTER TABLE public.mt5_signals
    ALTER COLUMN created_at SET DEFAULT NOW();

-- =====================================================
-- STEP 5: CREA INDICI OTTIMIZZATI (NON UNIQUE)
-- =====================================================

-- Indice per query EA (GET segnali non inviati)
CREATE INDEX IF NOT EXISTS idx_mt5_signals_ea_polling
ON public.mt5_signals(client_id, sent, created_at DESC)
WHERE sent = FALSE;

-- Indice per query cleanup (segnali vecchi)
CREATE INDEX IF NOT EXISTS idx_mt5_signals_cleanup
ON public.mt5_signals(sent, created_at)
WHERE sent = FALSE;

-- Indice per processed
CREATE INDEX IF NOT EXISTS idx_mt5_signals_processed_lookup
ON public.mt5_signals(processed, created_at DESC);

-- =====================================================
-- STEP 6: POLICY RLS SEMPLICE E CHIARA
-- =====================================================

-- Rimuovi tutte le policy esistenti
DROP POLICY IF EXISTS "Users can read own signals" ON public.mt5_signals;
DROP POLICY IF EXISTS "Users can insert signals" ON public.mt5_signals;
DROP POLICY IF EXISTS "Users can update own signals" ON public.mt5_signals;
DROP POLICY IF EXISTS "Service role has full access" ON public.mt5_signals;
DROP POLICY IF EXISTS "EA can read signals" ON public.mt5_signals;

-- Abilita RLS
ALTER TABLE public.mt5_signals ENABLE ROW LEVEL SECURITY;

-- Policy 1: Service role (edge functions) ha accesso completo
CREATE POLICY "service_role_full_access"
ON public.mt5_signals
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy 2: Utenti autenticati possono vedere solo i propri segnali
CREATE POLICY "users_view_own_signals"
ON public.mt5_signals
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR client_id = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Policy 3: Utenti autenticati possono inserire segnali
CREATE POLICY "users_insert_signals"
ON public.mt5_signals
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR client_id = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- =====================================================
-- STEP 7: FUNZIONE SEMPLICE PER CLEANUP
-- =====================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_mt5_signals()
RETURNS TABLE(deleted_count INTEGER, fixed_count INTEGER) AS $$
DECLARE
    v_deleted INTEGER := 0;
    v_fixed INTEGER := 0;
BEGIN
    -- Elimina segnali vecchi (sent=false, >10 minuti)
    DELETE FROM public.mt5_signals
    WHERE sent = FALSE
      AND created_at < NOW() - INTERVAL '10 minutes';

    GET DIAGNOSTICS v_deleted = ROW_COUNT;

    -- Marca come processed segnali anomali (sent=true, processed=false, >30 minuti)
    UPDATE public.mt5_signals
    SET processed = TRUE
    WHERE sent = TRUE
      AND processed = FALSE
      AND created_at < NOW() - INTERVAL '30 minutes';

    GET DIAGNOSTICS v_fixed = ROW_COUNT;

    RETURN QUERY SELECT v_deleted, v_fixed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 8: CREA UNICO CRON JOB PULITO
-- =====================================================

SELECT cron.schedule(
    'mt5-signals-cleanup',           -- Nome job
    '*/10 * * * *',                   -- Ogni 10 minuti
    $$
    SELECT public.cleanup_old_mt5_signals();
    $$
);

-- =====================================================
-- STEP 9: COMMENTI E DOCUMENTAZIONE
-- =====================================================

COMMENT ON TABLE public.mt5_signals IS '
Tabella segnali MT5 - LOGICA PULITA:
1. Frontend: Button "Analisi" → NESSUN salvataggio (localAnalysis:true)
2. Frontend: Button "Esegui su MT5" → POST /mt5-trade-signals → sent=false
3. EA: Polling GET /mt5-trade-signals?email=xxx → preleva sent=false
4. EA: PATCH /mt5-trade-signals/:id → processed=true dopo esecuzione
5. Cron: Ogni 10 min cleanup segnali sent=false >10 min
';

COMMENT ON COLUMN public.mt5_signals.sent IS 'FALSE = In attesa EA | TRUE = Consegnato all EA (anche se non ancora eseguito)';
COMMENT ON COLUMN public.mt5_signals.processed IS 'FALSE = Non ancora eseguito | TRUE = Eseguito dall EA';
COMMENT ON COLUMN public.mt5_signals.created_at IS 'Timestamp creazione segnale';

COMMENT ON FUNCTION public.cleanup_old_mt5_signals() IS 'Funzione cleanup chiamata da cron ogni 10 min per pulire segnali vecchi';

-- =====================================================
-- STEP 10: VERIFICA FINALE
-- =====================================================

DO $$
DECLARE
    trigger_count INTEGER;
    cron_count INTEGER;
    old_signals INTEGER;
BEGIN
    -- Conta trigger rimasti (dovrebbero essere 0)
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers
    WHERE event_object_table = 'mt5_signals';

    -- Conta cron job (dovrebbe essere 1)
    SELECT COUNT(*) INTO cron_count
    FROM cron.job
    WHERE jobname = 'mt5-signals-cleanup';

    -- Conta segnali vecchi da pulire
    SELECT COUNT(*) INTO old_signals
    FROM public.mt5_signals
    WHERE sent = FALSE AND created_at < NOW() - INTERVAL '10 minutes';

    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ RESET COMPLETO - VERIFICA FINALE';
    RAISE NOTICE '════════════════════════════════════════════════════════';
    RAISE NOTICE 'Trigger attivi: % (dovrebbero essere 0)', trigger_count;
    RAISE NOTICE 'Cron job attivi: % (dovrebbe essere 1)', cron_count;
    RAISE NOTICE 'Segnali vecchi da pulire: %', old_signals;
    RAISE NOTICE '';
    RAISE NOTICE '🎯 LOGICA NUOVA:';
    RAISE NOTICE '1. Button "Analisi" → generate-ai-signals (localAnalysis:true) → NESSUN DB';
    RAISE NOTICE '2. Button "Esegui su MT5" → mt5-trade-signals (POST) → sent=false';
    RAISE NOTICE '3. EA polling → mt5-trade-signals (GET) → sent=false';
    RAISE NOTICE '4. EA esegue → mt5-trade-signals (PATCH) → processed=true';
    RAISE NOTICE '5. Cron ogni 10 min → cleanup segnali vecchi';
    RAISE NOTICE '════════════════════════════════════════════════════════';
END $$;
