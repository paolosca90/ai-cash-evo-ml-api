-- Create table for MT5 trade signals (persistent store)
create extension if not exists pgcrypto;

create table if not exists public.mt5_signals (
  id uuid primary key default gen_random_uuid(),
  client_id text not null,
  symbol text not null,
  signal text not null check (signal in ('BUY','SELL','HOLD')),
  confidence numeric,
  entry double precision not null,
  stop_loss double precision,
  take_profit double precision,
  risk_amount double precision,
  timestamp timestamptz not null,
  ai_analysis jsonb,
  sent boolean not null default false,
  created_at timestamptz not null default now()
);

-- Helpful indexes
create index if not exists idx_mt5_signals_client_time on public.mt5_signals (client_id, timestamp);
create index if not exists idx_mt5_signals_sent on public.mt5_signals (sent);

-- Enable RLS (functions use service role and bypass RLS)
alter table public.mt5_signals enable row level security;

-- No public policies added intentionally; access via edge functions only.