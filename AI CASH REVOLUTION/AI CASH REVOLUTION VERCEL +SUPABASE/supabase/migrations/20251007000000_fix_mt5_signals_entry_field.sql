-- Fix mt5_signals entry field for existing records
-- This migration ensures all signals have a valid entry price

-- First, let's see if there are records with NULL entry
-- If entry is NOT NULL in the schema, this shouldn't happen
-- But let's be defensive

-- Update any records where entry might be problematic
-- We'll use a reasonable approach: delete old signals with invalid entry
-- since they're no longer useful for trading or training

-- Delete signals older than 7 days with no entry price
DELETE FROM public.mt5_signals
WHERE entry IS NULL
  AND created_at < NOW() - INTERVAL '7 days';

-- For recent signals (< 7 days) with NULL entry, we could try to recover
-- but it's better to just log and let the new auto-save handle it
-- Log any remaining NULL entries for debugging
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count
  FROM public.mt5_signals
  WHERE entry IS NULL;

  IF null_count > 0 THEN
    RAISE NOTICE 'Found % signals with NULL entry - consider regenerating these signals', null_count;
  END IF;
END $$;

-- Add a check constraint to prevent future NULL entries (if not already NOT NULL)
-- This is defensive - the schema should already have NOT NULL
DO $$
BEGIN
  -- Check if column allows NULL
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'mt5_signals'
      AND column_name = 'entry'
      AND is_nullable = 'YES'
  ) THEN
    -- Make it NOT NULL if it isn't already
    ALTER TABLE public.mt5_signals
    ALTER COLUMN entry SET NOT NULL;

    RAISE NOTICE 'Set entry column to NOT NULL';
  END IF;
END $$;

-- Add index on entry for better query performance
CREATE INDEX IF NOT EXISTS idx_mt5_signals_entry
ON public.mt5_signals(entry)
WHERE entry IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.mt5_signals.entry IS 'Entry price for the signal - must be populated from real market data at signal generation time';
