-- Crea le tabelle mancanti per il sistema completo di trade monitoring

-- Tabella per logging eventi trade real-time
CREATE TABLE IF NOT EXISTS public.trade_events_log (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    client_id TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('trade_opened', 'trade_closed', 'trade_modified', 'trade_timeout', 'heartbeat')),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    ticket INTEGER,
    symbol TEXT,
    order_type TEXT,
    volume DOUBLE PRECISION,
    price DOUBLE PRECISION,
    stop_loss DOUBLE PRECISION,
    take_profit DOUBLE PRECISION,
    profit DOUBLE PRECISION,
    swap DOUBLE PRECISION,
    comment TEXT,
    magic_number INTEGER,
    close_reason TEXT,
    modified_fields TEXT[],
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabella per notifiche utente
CREATE TABLE IF NOT EXISTS public.user_notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('trade_update', 'system_alert', 'connection_status')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    read_at TIMESTAMP WITH TIME ZONE
);

-- Abilita RLS su entrambe le tabelle
ALTER TABLE public.trade_events_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Policy per trade_events_log
CREATE POLICY "Users can view their own trade events" 
ON public.trade_events_log 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all trade events" 
ON public.trade_events_log 
FOR ALL 
USING (auth.role() = 'service_role');

-- Policy per user_notifications
CREATE POLICY "Users can view their own notifications" 
ON public.user_notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.user_notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all notifications" 
ON public.user_notifications 
FOR ALL 
USING (auth.role() = 'service_role');

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_trade_events_user_time 
ON public.trade_events_log(user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_trade_events_client_time 
ON public.trade_events_log(client_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_created 
ON public.user_notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_unread 
ON public.user_notifications(user_id, read) WHERE read = false;