-- Create tables for real-time trade webhook functionality

-- Table for logging all trade events
CREATE TABLE IF NOT EXISTS public.trade_events_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('trade_opened', 'trade_closed', 'trade_modified', 'trade_timeout', 'heartbeat')),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    ticket BIGINT,
    symbol TEXT,
    order_type TEXT CHECK (order_type IN ('BUY', 'SELL')),
    volume DECIMAL(18, 8),
    price DECIMAL(18, 8),
    stop_loss DECIMAL(18, 8),
    take_profit DECIMAL(18, 8),
    profit DECIMAL(18, 8),
    swap DECIMAL(18, 8),
    comment TEXT,
    magic_number INTEGER,
    close_reason TEXT CHECK (close_reason IN ('take_profit', 'stop_loss', 'manual', 'timeout', 'balance_stop')),
    modified_fields TEXT[],
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for user notifications
CREATE TABLE IF NOT EXISTS public.user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('trade_update', 'system_alert', 'connection_status')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
);

-- Table for webhook rate limiting and security
CREATE TABLE IF NOT EXISTS public.webhook_security_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_ip TEXT,
    user_agent TEXT,
    endpoint TEXT,
    method TEXT,
    signature_valid BOOLEAN,
    rate_limited BOOLEAN,
    request_data JSONB,
    response_status INTEGER,
    response_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for active connections monitoring
CREATE TABLE IF NOT EXISTS public.connection_monitoring (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    connection_status TEXT NOT NULL CHECK (connection_status IN ('online', 'offline', 'reconnected')),
    last_activity TIMESTAMP WITH TIME ZONE NOT NULL,
    session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    device_info JSONB,
    ip_address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trade_events_log_user_id ON public.trade_events_log(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_events_log_client_id ON public.trade_events_log(client_id);
CREATE INDEX IF NOT EXISTS idx_trade_events_log_event_type ON public.trade_events_log(event_type);
CREATE INDEX IF NOT EXISTS idx_trade_events_log_timestamp ON public.trade_events_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_trade_events_log_symbol ON public.trade_events_log(symbol);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_type ON public.user_notifications(type);
CREATE INDEX IF NOT EXISTS idx_user_notifications_priority ON public.user_notifications(priority);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON public.user_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_read ON public.user_notifications(read);

CREATE INDEX IF NOT EXISTS idx_webhook_security_log_client_ip ON public.webhook_security_log(client_ip);
CREATE INDEX IF NOT EXISTS idx_webhook_security_log_created_at ON public.webhook_security_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_connection_monitoring_client_id ON public.connection_monitoring(client_id);
CREATE INDEX IF NOT EXISTS idx_connection_monitoring_user_id ON public.connection_monitoring(user_id);
CREATE INDEX IF NOT EXISTS idx_connection_monitoring_status ON public.connection_monitoring(connection_status);
CREATE INDEX IF NOT EXISTS idx_connection_monitoring_last_activity ON public.connection_monitoring(last_activity DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER handle_trade_events_log_updated_at
    BEFORE UPDATE ON public.trade_events_log
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_connection_monitoring_updated_at
    BEFORE UPDATE ON public.connection_monitoring
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create function to cleanup old records
CREATE OR REPLACE FUNCTION public.cleanup_old_webhook_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Keep last 30 days of webhook security logs
    DELETE FROM public.webhook_security_log
    WHERE created_at < NOW() - INTERVAL '30 days';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Keep last 90 days of trade events (configurable per user if needed)
    -- This is optional as trade events are important for analytics
    -- DELETE FROM public.trade_events_log
    -- WHERE created_at < NOW() - INTERVAL '90 days';

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get user notification statistics
CREATE OR REPLACE FUNCTION public.get_user_notification_stats(p_user_id UUID)
RETURNS TABLE (
    total_notifications BIGINT,
    unread_notifications BIGINT,
    high_priority_count BIGINT,
    trade_updates_count BIGINT,
    system_alerts_count BIGINT,
    latest_notification TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_notifications,
        COUNT(*) FILTER (WHERE NOT read)::BIGINT as unread_notifications,
        COUNT(*) FILTER (WHERE priority = 'high')::BIGINT as high_priority_count,
        COUNT(*) FILTER (WHERE type = 'trade_update')::BIGINT as trade_updates_count,
        COUNT(*) FILTER (WHERE type = 'system_alert')::BIGINT as system_alerts_count,
        MAX(created_at) as latest_notification
    FROM public.user_notifications
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to mark notifications as read
CREATE OR REPLACE FUNCTION public.mark_notifications_read(p_user_id UUID, p_notification_ids UUID[])
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE public.user_notifications
    SET read = TRUE, read_at = NOW()
    WHERE user_id = p_user_id
    AND (p_notification_ids IS NULL OR id = ANY(p_notification_ids))
    AND NOT read;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Create RLS policies
ALTER TABLE public.trade_events_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_security_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connection_monitoring ENABLE ROW LEVEL SECURITY;

-- RLS policies for trade_events_log
CREATE POLICY "Users can view their own trade events" ON public.trade_events_log
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own trade events" ON public.trade_events_log
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role can manage all trade events" ON public.trade_events_log
    FOR ALL USING (auth.role() = 'service_role');

-- RLS policies for user_notifications
CREATE POLICY "Users can view their own notifications" ON public.user_notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON public.user_notifications
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Service role can manage all notifications" ON public.user_notifications
    FOR ALL USING (auth.role() = 'service_role');

-- RLS policies for webhook_security_log
CREATE POLICY "Service role can manage webhook logs" ON public.webhook_security_log
    FOR ALL USING (auth.role() = 'service_role');

-- RLS policies for connection_monitoring
CREATE POLICY "Users can view their own connections" ON public.connection_monitoring
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role can manage all connections" ON public.connection_monitoring
    FOR ALL USING (auth.role() = 'service_role');

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

GRANT ALL ON public.trade_events_log TO authenticated;
GRANT ALL ON public.trade_events_log TO service_role;

GRANT ALL ON public.user_notifications TO authenticated;
GRANT ALL ON public.user_notifications TO service_role;

GRANT ALL ON public.webhook_security_log TO service_role;
GRANT SELECT ON public.webhook_security_log TO authenticated;

GRANT ALL ON public.connection_monitoring TO authenticated;
GRANT ALL ON public.connection_monitoring TO service_role;

GRANT EXECUTE ON FUNCTION public.cleanup_old_webhook_logs TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_notification_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notifications_read TO authenticated;