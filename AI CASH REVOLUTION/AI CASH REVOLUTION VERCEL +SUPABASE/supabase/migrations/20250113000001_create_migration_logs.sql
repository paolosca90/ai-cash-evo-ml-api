-- Create migration logs table to track database changes
CREATE TABLE IF NOT EXISTS public.migration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_name VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'rolled_back')),
  details TEXT,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  rollback_sql TEXT
);

-- Enable RLS
ALTER TABLE public.migration_logs ENABLE ROW LEVEL SECURITY;

-- Grant permissions to service role
GRANT ALL ON public.migration_logs TO service_role;
GRANT SELECT ON public.migration_logs TO authenticated;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_migration_logs_name ON public.migration_logs(migration_name);
CREATE INDEX IF NOT EXISTS idx_migration_logs_status ON public.migration_logs(status);
CREATE INDEX IF NOT EXISTS idx_migration_logs_executed_at ON public.migration_logs(executed_at);

-- Comment
COMMENT ON TABLE public.migration_logs IS 'Log table to track database migrations and changes';