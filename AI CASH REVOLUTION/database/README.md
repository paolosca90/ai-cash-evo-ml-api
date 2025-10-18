# Database Directory

SQL schemas, migrations, and setup scripts for AI Cash Revolution.

## Directory Structure

```
database/
├── schemas/           # Table definitions and schema files
├── migrations/        # Database migration scripts
└── setup/            # Setup and maintenance scripts
```

## Schemas (`schemas/`)

Database table definitions and schema files.

### Files

- **`ml_training_schema.sql`** - ML training tables
  - `ml_training_samples` - Training data samples
  - `ml_model_performance` - Model performance metrics
  - `ml_generation_logs` - Generation batch logs
  - `ml_indicator_weights` - Indicator weight configurations
  - `oanda_paper_trades` - OANDA paper trading records

- **`mt5-schema.sql`** - MT5 trading system tables
  - Trading signals
  - Trade execution records
  - Performance tracking

- **`create_ea_heartbeats_table.sql`** - EA heartbeat monitoring
  - Expert Advisor health checks
  - Connection status tracking

### Applying Schemas

```sql
-- In Supabase SQL Editor
\i schemas/ml_training_schema.sql
\i schemas/mt5-schema.sql
\i schemas/create_ea_heartbeats_table.sql
```

Or use Supabase CLI:

```bash
supabase db push
```

## Migrations (`migrations/`)

Database migration scripts for schema updates.

### Files

- **`ADD_FOREX_WEIGHTS.sql`** - Add forex symbol weights
- **`MANUAL_DB_SETUP.sql`** - Manual database setup procedures
- **`FIXED_DB_SETUP.sql`** - Fixed setup with corrections

### Running Migrations

```bash
# Using Supabase CLI
supabase migration up

# Or manually in SQL editor
\i migrations/ADD_FOREX_WEIGHTS.sql
```

### Migration Best Practices

1. Always backup before running migrations
2. Test migrations in development first
3. Use transactions for rollback capability
4. Document migration purpose and changes

## Setup Scripts (`setup/`)

Database setup, cleanup, and maintenance scripts.

### Cleanup Scripts

- **`CLEANUP_OLD_SIGNALS.sql`** - Remove old trading signals
- **`CLEANUP_VERIFICATION.sql`** - Verify cleanup operations
- **`SYSTEM_CLEANUP.sql`** - Full system cleanup

### Setup Scripts

- **`HISTORICAL_TRAINING_SETUP.sql`** - Setup historical training data
- **`CRON_ACTIVATION_SIMPLE.sql`** - Activate cron jobs
- **`QUICK_VERIFICATION.sql`** - Quick system verification
- **`EXECUTION_GUIDE.md`** - Execution procedures guide

### Maintenance Schedule

Recommended maintenance tasks:

```sql
-- Weekly: Clean old signals (older than 90 days)
DELETE FROM trading_signals WHERE created_at < NOW() - INTERVAL '90 days';

-- Monthly: Archive old trades
-- See CLEANUP_OLD_SIGNALS.sql

-- Quarterly: Optimize tables
VACUUM ANALYZE;
```

## Database Access

### Supabase Dashboard
Access via Supabase web interface for:
- Schema browsing
- Manual SQL execution
- Data exploration
- Index management

### Connection String
```bash
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

### Programmatic Access
```python
from supabase import create_client

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
supabase = create_client(url, key)
```

## Key Tables

### Trading Signals
```sql
CREATE TABLE trading_signals (
  id UUID PRIMARY KEY,
  symbol VARCHAR(10),
  direction VARCHAR(4), -- BUY/SELL
  confidence DECIMAL,
  indicators JSONB,
  created_at TIMESTAMP
);
```

### ML Training Samples
```sql
CREATE TABLE ml_training_samples (
  id UUID PRIMARY KEY,
  symbol VARCHAR(10),
  indicators JSONB,
  actual_outcome VARCHAR(10),
  profit_loss DECIMAL,
  created_at TIMESTAMP
);
```

### Indicator Weights
```sql
CREATE TABLE ml_indicator_weights (
  id UUID PRIMARY KEY,
  indicator_name VARCHAR(50),
  weight DECIMAL,
  model_version VARCHAR(20),
  updated_at TIMESTAMP
);
```

## Indexes

Important indexes for performance:

```sql
CREATE INDEX idx_signals_symbol_created
  ON trading_signals(symbol, created_at DESC);

CREATE INDEX idx_training_symbol_outcome
  ON ml_training_samples(symbol, actual_outcome);

CREATE INDEX idx_weights_version
  ON ml_indicator_weights(model_version, updated_at DESC);
```

## Backup & Recovery

### Automated Backups
Supabase provides automated daily backups. Configure retention in project settings.

### Manual Backup
```bash
# Export specific table
pg_dump -h db.[PROJECT-REF].supabase.co \
  -U postgres -d postgres \
  -t trading_signals > backup_signals.sql

# Full database export
pg_dump [CONNECTION_STRING] > full_backup.sql
```

### Restore
```bash
psql [CONNECTION_STRING] < backup_signals.sql
```

## Performance Monitoring

### Check Table Sizes
```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Check Index Usage
```sql
SELECT
  indexrelname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

## Security

- Use Row Level Security (RLS) for sensitive data
- Restrict direct database access
- Use service role key only in backend
- Rotate database credentials regularly

## Related Documentation

- Supabase Docs: https://supabase.com/docs
- PostgreSQL Docs: https://www.postgresql.org/docs/
- Project structure: `../PROJECT_STRUCTURE.md`
