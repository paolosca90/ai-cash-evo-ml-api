-- Create ea_heartbeats table for monitoring EA MT5 connections
-- This table stores heartbeat data from MetaTrader 5 Expert Advisors

CREATE TABLE IF NOT EXISTS ea_heartbeats (
  id BIGSERIAL PRIMARY KEY,
  client_email TEXT NOT NULL,
  heartbeat_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ea_heartbeats_email ON ea_heartbeats(client_email);
CREATE INDEX IF NOT EXISTS idx_ea_heartbeats_created_at ON ea_heartbeats(created_at);

-- Add RLS (Row Level Security) policies
ALTER TABLE ea_heartbeats ENABLE ROW LEVEL SECURITY;

-- Allow users to see their own heartbeats
CREATE POLICY "Users can view their own heartbeats" ON ea_heartbeats
  FOR SELECT USING (
    auth.jwt() ->> 'email' = client_email
  );

-- Allow service role to insert heartbeats (for Edge Functions)
CREATE POLICY "Allow service role insert" ON ea_heartbeats
  FOR INSERT WITH CHECK (true);

-- Allow users to view their own heartbeat statistics
CREATE POLICY "Users can view their heartbeat stats" ON ea_heartbeats
  FOR SELECT USING (
    auth.jwt() ->> 'email' = client_email
  );

-- Grant necessary permissions
GRANT ALL ON ea_heartbeats TO service_role;
GRANT SELECT ON ea_heartbeats TO authenticated;