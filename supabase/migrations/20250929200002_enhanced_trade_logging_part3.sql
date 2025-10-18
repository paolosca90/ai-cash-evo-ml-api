-- Execution Details Table
CREATE TABLE IF NOT EXISTS public.execution_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    -- Basic execution info
    signal_id UUID NOT NULL REFERENCES public.mt5_signals(id) ON DELETE CASCADE,
    execution_id TEXT UNIQUE NOT NULL, -- Unique execution identifier
    execution_status TEXT DEFAULT 'pending' CHECK (execution_status IN ('pending', 'executed', 'partial', 'failed', 'cancelled', 'rejected')),
    execution_timestamp TIMESTAMP WITH TIME ZONE,

    -- Price execution details
    requested_price DECIMAL(20,10) NOT NULL,
    execution_price DECIMAL(20,10),
    price_slippage DECIMAL(15,5) DEFAULT 0, -- Difference between requested and executed price
    slippage_percentage DECIMAL(5,2) DEFAULT 0, -- Slippage as percentage

    -- Order execution details
    order_type TEXT NOT NULL CHECK (order_type IN ('market', 'limit', 'stop', 'stop_limit', 'trailing_stop')),
    execution_venue TEXT DEFAULT 'mt5', -- Platform where order was executed
    broker_id TEXT, -- Broker identifier
    account_id TEXT, -- Trading account identifier
    ticket_number BIGINT, -- MT5 ticket number
    magic_number INTEGER, -- EA magic number

    -- Partial fills
    is_partial_fill BOOLEAN DEFAULT false,
    requested_volume DECIMAL(15,5) NOT NULL,
    executed_volume DECIMAL(15,5) DEFAULT 0,
    remaining_volume DECIMAL(15,5) DEFAULT 0,
    fill_percentage DECIMAL(5,2) DEFAULT 0,

    -- Multiple fills
    fill_count INTEGER DEFAULT 1,
    fill_details JSONB DEFAULT '[]', -- Array of fill details with timestamps and prices
    average_fill_price DECIMAL(20,10),
    first_fill_price DECIMAL(20,10),
    last_fill_price DECIMAL(20,10),

    -- Execution latency
    signal_to_order_ms INTEGER DEFAULT 0, -- Time from signal generation to order placement
    order_to_execution_ms INTEGER DEFAULT 0, -- Time from order placement to execution
    total_execution_ms INTEGER DEFAULT 0, -- Total execution time
    execution_latency_category TEXT DEFAULT 'normal' CHECK (execution_latency_category IN ('fast', 'normal', 'slow', 'very_slow')),

    -- Costs and fees
    commission DECIMAL(15,5) DEFAULT 0,
    spread_cost DECIMAL(15,5) DEFAULT 0,
    swap DECIMAL(15,5) DEFAULT 0,
    financing_cost DECIMAL(15,5) DEFAULT 0,
    total_cost DECIMAL(15,5) DEFAULT 0,

    -- Execution quality metrics
    execution_quality_score DECIMAL(5,2) DEFAULT 0 CHECK (execution_quality_score >= 0 AND execution_quality_score <= 100),
    price_improvement DECIMAL(15,5) DEFAULT 0, -- Positive if price better than requested
    market_impact DECIMAL(15,5) DEFAULT 0, -- Market impact of the trade
    liquidity_score DECIMAL(5,2) DEFAULT 0, -- Liquidity at execution time

    -- Execution provider information
    execution_provider TEXT, -- Broker or liquidity provider
    execution_algorithm TEXT, -- Algorithm used for execution
    execution_strategy TEXT, -- Execution strategy employed
    execution_notes TEXT,

    -- Error handling
    execution_error TEXT, -- Error message if execution failed
    error_code TEXT, -- Specific error code
    error_severity TEXT DEFAULT 'low' CHECK (error_severity IN ('low', 'medium', 'high', 'critical')),
    recovery_action TEXT, -- Action taken to recover from error

    -- Execution conditions
    market_conditions_at_execution JSONB DEFAULT '{}', -- Market conditions when order was executed
    volatility_at_execution DECIMAL(10,5) DEFAULT 0,
    volume_at_execution BIGINT DEFAULT 0,
    spread_at_execution DECIMAL(15,5) DEFAULT 0,
    liquidity_at_execution TEXT DEFAULT 'normal' CHECK (liquidity_at_execution IN ('low', 'normal', 'high', 'thin')),

    -- Smart order routing
    smart_order_routing BOOLEAN DEFAULT false,
    routing_venues TEXT[] DEFAULT '{}', -- Venues where order was routed
    routing_optimization JSONB DEFAULT '{}', -- Routing optimization details
    best_execution_check BOOLEAN DEFAULT false,

    -- Compliance and audit
    compliance_checks JSONB DEFAULT '{}', -- Results of compliance checks
    is_compliant BOOLEAN DEFAULT true,
    audit_trail JSONB DEFAULT '[]', -- Complete audit trail
    reviewer_notes TEXT,

    -- Performance metrics
    execution_efficiency DECIMAL(5,2) DEFAULT 0,
    cost_efficiency DECIMAL(5,2) DEFAULT 0,
    timing_efficiency DECIMAL(5,2) DEFAULT 0,
    overall_execution_rating TEXT DEFAULT 'average' CHECK (overall_execution_rating IN ('excellent', 'good', 'average', 'poor', 'failed')),

    -- Metadata
    batch_execution_id UUID, -- For batch execution tracking
    correlation_group UUID, -- For correlating related executions
    custom_execution_fields JSONB DEFAULT '{}' -- Custom execution metadata
);

-- Indexes for execution_details
CREATE INDEX IF NOT EXISTS idx_execution_details_signal_id ON public.execution_details(signal_id);
CREATE INDEX IF NOT EXISTS idx_execution_details_execution_id ON public.execution_details(execution_id);
CREATE INDEX IF NOT EXISTS idx_execution_details_status ON public.execution_details(execution_status);
CREATE INDEX IF NOT EXISTS idx_execution_details_timestamp ON public.execution_details(execution_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_execution_details_ticket_number ON public.execution_details(ticket_number);
CREATE INDEX IF NOT EXISTS idx_execution_details_magic_number ON public.execution_details(magic_number);
CREATE INDEX IF NOT EXISTS idx_execution_details_execution_venue ON public.execution_details(execution_venue);
CREATE INDEX IF NOT EXISTS idx_execution_details_quality_score ON public.execution_details(execution_quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_execution_details_latency ON public.execution_details(total_execution_ms);
CREATE INDEX IF NOT EXISTS idx_execution_details_partial_fill ON public.execution_details(is_partial_fill);
CREATE INDEX IF NOT EXISTS idx_execution_details_batch_id ON public.execution_details(batch_execution_id);

-- Enable Row Level Security
ALTER TABLE public.execution_details ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Execution details readable by authenticated users"
ON public.execution_details
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Execution details manageable by users"
ON public.execution_details
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.mt5_signals ms
        WHERE ms.id = execution_details.signal_id
        AND ms.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.mt5_signals ms
        WHERE ms.id = execution_details.signal_id
        AND ms.user_id = auth.uid()
    )
);

-- Trigger for updated_at
CREATE TRIGGER update_execution_details_updated_at
    BEFORE UPDATE ON public.execution_details
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to calculate execution metrics
CREATE OR REPLACE FUNCTION calculate_execution_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate fill percentage
    IF NEW.requested_volume > 0 THEN
        NEW.fill_percentage = (NEW.executed_volume / NEW.requested_volume) * 100;
    END IF;

    -- Calculate price slippage
    IF NEW.requested_price > 0 AND NEW.execution_price > 0 THEN
        NEW.price_slippage = ABS(NEW.execution_price - NEW.requested_price);
        NEW.slippage_percentage = (NEW.price_slippage / NEW.requested_price) * 100;
    END IF;

    -- Calculate average fill price for multiple fills
    IF NEW.fill_details IS NOT NULL AND jsonb_array_length(NEW.fill_details) > 0 THEN
        DECLARE
            total_value DECIMAL(20,10) := 0;
            total_volume DECIMAL(15,5) := 0;
            fill_count INTEGER := 0;
        BEGIN
            -- Sum up all fill values and volumes
            FOR i IN 0..jsonb_array_length(NEW.fill_details)-1 LOOP
                total_value := total_value + (NEW.fill_details->>i->>'price')::DECIMAL(20,10) * (NEW.fill_details->>i->>'volume')::DECIMAL(15,5);
                total_volume := total_volume + (NEW.fill_details->>i->>'volume')::DECIMAL(15,5);
                fill_count := fill_count + 1;
            END LOOP;

            IF total_volume > 0 THEN
                NEW.average_fill_price := total_value / total_volume;
                NEW.first_fill_price := (NEW.fill_details->>0->>'price')::DECIMAL(20,10);
                NEW.last_fill_price := (NEW.fill_details->>(fill_count-1)->>'price')::DECIMAL(20,10);
            END IF;
        END;
    END IF;

    -- Calculate total cost
    NEW.total_cost := COALESCE(NEW.commission, 0) + COALESCE(NEW.spread_cost, 0) + COALESCE(NEW.swap, 0) + COALESCE(NEW.financing_cost, 0);

    -- Determine execution latency category
    IF NEW.total_execution_ms < 100 THEN
        NEW.execution_latency_category := 'fast';
    ELSIF NEW.total_execution_ms < 1000 THEN
        NEW.execution_latency_category := 'normal';
    ELSIF NEW.total_execution_ms < 5000 THEN
        NEW.execution_latency_category := 'slow';
    ELSE
        NEW.execution_latency_category := 'very_slow';
    END IF;

    -- Calculate execution quality score (simplified formula)
    DECLARE
        latency_score DECIMAL(5,2) := 0;
        slippage_score DECIMAL(5,2) := 0;
        fill_score DECIMAL(5,2) := 0;
    BEGIN
        -- Latency score (lower latency = higher score)
        IF NEW.total_execution_ms < 100 THEN
            latency_score := 100;
        ELSIF NEW.total_execution_ms < 1000 THEN
            latency_score := 80 - (NEW.total_execution_ms / 1000) * 20;
        ELSIF NEW.total_execution_ms < 5000 THEN
            latency_score := 60 - (NEW.total_execution_ms / 5000) * 20;
        ELSE
            latency_score := 40;
        END IF;

        -- Slippage score (lower slippage = higher score)
        IF NEW.slippage_percentage < 0.1 THEN
            slippage_score := 100;
        ELSIF NEW.slippage_percentage < 1.0 THEN
            slippage_score := 80 - (NEW.slippage_percentage / 1.0) * 20;
        ELSIF NEW.slippage_percentage < 5.0 THEN
            slippage_score := 60 - (NEW.slippage_percentage / 5.0) * 20;
        ELSE
            slippage_score := 40;
        END IF;

        -- Fill score (higher fill percentage = higher score)
        fill_score := NEW.fill_percentage;

        -- Weighted average for overall quality score
        NEW.execution_quality_score := (latency_score * 0.3 + slippage_score * 0.4 + fill_score * 0.3);
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER calculate_execution_metrics_trigger
    BEFORE INSERT OR UPDATE ON public.execution_details
    FOR EACH ROW
    EXECUTE FUNCTION calculate_execution_metrics();

-- Comment for documentation
COMMENT ON TABLE public.execution_details IS 'Detailed execution information for trades including price execution, latency, costs, and quality metrics';