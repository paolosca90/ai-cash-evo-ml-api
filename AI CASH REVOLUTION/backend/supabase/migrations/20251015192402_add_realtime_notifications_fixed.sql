-- Add real-time notification support to mt5_signals table
-- AI Cash Revolution - Real-time Signal Delivery System

-- Add columns for EA MT5 real-time notifications
ALTER TABLE mt5_signals
ADD COLUMN IF NOT EXISTS ea_notified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ea_notification_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ea_response TEXT,
ADD COLUMN IF NOT EXISTS immediate_notification BOOLEAN DEFAULT FALSE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_mt5_signals_ea_notified ON mt5_signals(ea_notified);
CREATE INDEX IF NOT EXISTS idx_mt5_signals_notification_time ON mt5_signals(ea_notification_time);

-- Add comments
COMMENT ON COLUMN mt5_signals.ea_notified IS 'Indicates if EA MT5 has been notified of this signal';
COMMENT ON COLUMN mt5_signals.ea_notification_time IS 'Timestamp when EA MT5 was notified';
COMMENT ON COLUMN mt5_signals.ea_response IS 'Response from EA MT5 notification';
COMMENT ON COLUMN mt5_signals.immediate_notification IS 'Whether immediate notification was attempted';

-- Create ea_heartbeats table for heartbeat monitoring
CREATE TABLE IF NOT EXISTS ea_heartbeats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_email TEXT NOT NULL,
    heartbeat_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for ea_heartbeats
CREATE INDEX IF NOT EXISTS idx_ea_heartbeats_client_email ON ea_heartbeats(client_email);
CREATE INDEX IF NOT EXISTS idx_ea_heartbeats_created_at ON ea_heartbeats(created_at);

-- Grant permissions
GRANT ALL ON ea_heartbeats TO authenticated;
GRANT SELECT ON ea_heartbeats TO anon;

-- Create function to get unsent signals for EA with notification status
CREATE OR REPLACE FUNCTION get_unsent_signals_for_ea(p_client_email TEXT)
RETURNS TABLE (
    id UUID,
    symbol TEXT,
    signal TEXT,
    entry NUMERIC,
    stop_loss NUMERIC,
    take_profit NUMERIC,
    confidence INTEGER,
    risk_amount NUMERIC,
    signal_timestamp TIMESTAMPTZ,
    ea_notified BOOLEAN,
    immediate_notification BOOLEAN,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.symbol,
        s.signal,
        s.entry,
        s.stop_loss,
        s.take_profit,
        s.confidence,
        s.risk_amount,
        s.timestamp as signal_timestamp,
        s.ea_notified,
        s.immediate_notification,
        s.created_at
    FROM mt5_signals s
    WHERE s.client_id = p_client_email
      AND s.sent = FALSE
      AND (
        s.ea_notified = FALSE
        OR s.ea_notified IS NULL
      )
    ORDER BY s.created_at ASC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for the function
GRANT EXECUTE ON FUNCTION get_unsent_signals_for_ea(TEXT) TO authenticated;

-- View for monitoring real-time notifications
CREATE OR REPLACE VIEW signal_notifications_status AS
SELECT
    DATE_TRUNC('hour', created_at) as hour,
    COUNT(*) as total_signals,
    COUNT(*) FILTER (WHERE immediate_notification = TRUE) as immediate_notifications,
    COUNT(*) FILTER (WHERE ea_notified = TRUE) as ea_notified,
    COUNT(*) FILTER (WHERE sent = TRUE) as delivered,
    ROUND(
        (COUNT(*) FILTER (WHERE ea_notified = TRUE)::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
        2
    ) as notification_rate_percent
FROM mt5_signals
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

-- Grant permissions for the view
GRANT SELECT ON signal_notifications_status TO anon, authenticated;