-- Enhanced Central Trade Logging System
-- Comprehensive metadata and tracking capabilities for AI-powered trading

-- Extend existing mt5_signals table with advanced metadata
ALTER TABLE public.mt5_signals
ADD COLUMN IF NOT EXISTS signal_metadata_id UUID REFERENCES public.signal_metadata(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS execution_details_id UUID REFERENCES public.execution_details(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS market_context_id UUID REFERENCES public.market_context(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS performance_metrics_id UUID REFERENCES public.performance_metrics(id) ON DELETE SET NULL,

-- Enhanced signal information
ADD COLUMN IF NOT EXISTS signal_source TEXT DEFAULT 'ai' CHECK (signal_source IN ('ai', 'rl_agent', 'manual', 'api', 'ml_model')),
ADD COLUMN IF NOT EXISTS signal_subtype TEXT, -- Specific AI model or strategy type
ADD COLUMN IF NOT EXISTS generation_timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS signal_chain_id UUID, -- For tracking signal lineage
ADD COLUMN IF NOT EXISTS parent_signal_id UUID REFERENCES public.mt5_signals(id) ON DELETE SET NULL,

-- Market regime information
ADD COLUMN IF NOT EXISTS market_regime TEXT DEFAULT 'unknown' CHECK (market_regime IN ('trending', 'ranging', 'volatile', 'quiet', 'breakout', 'reversal', 'unknown')),
ADD COLUMN IF NOT EXISTS volatility_state TEXT DEFAULT 'normal' CHECK (volatility_state IN ('low', 'normal', 'high', 'extreme')),
ADD COLUMN IF NOT EXISTS session_info TEXT DEFAULT 'unknown' CHECK (session_info IN ('asia', 'london', 'new_york', 'overlap', 'weekend', 'unknown')),
ADD COLUMN IF NOT EXISTS liquidity_conditions TEXT DEFAULT 'normal' CHECK (liquidity_conditions IN ('low', 'normal', 'high', 'thin')),

-- Smart Money Concepts
ADD COLUMN IF NOT EXISTS smart_money_score DECIMAL(3,1) DEFAULT 0 CHECK (smart_money_score >= 0 AND smart_money_score <= 10),
ADD COLUMN IF NOT EXISTS order_block_proximity DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS liquidity_pool_proximity DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS fvg_proximity DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS institutional_bias TEXT DEFAULT 'neutral' CHECK (institutional_bias IN ('bullish', 'bearish', 'neutral')),

-- Multi-timeframe analysis
ADD COLUMN IF NOT EXISTS m1_trend TEXT DEFAULT 'unknown' CHECK (m1_trend IN ('up', 'down', 'sideways', 'unknown')),
ADD COLUMN IF NOT EXISTS m5_trend TEXT DEFAULT 'unknown' CHECK (m5_trend IN ('up', 'down', 'sideways', 'unknown')),
ADD COLUMN IF NOT EXISTS m15_trend TEXT DEFAULT 'unknown' CHECK (m15_trend IN ('up', 'down', 'sideways', 'unknown')),
ADD COLUMN IF NOT EXISTS h1_trend TEXT DEFAULT 'unknown' CHECK (h1_trend IN ('up', 'down', 'sideways', 'unknown')),
ADD COLUMN IF NOT EXISTS h4_trend TEXT DEFAULT 'unknown' CHECK (h4_trend IN ('up', 'down', 'sideways', 'unknown')),
ADD COLUMN IF NOT EXISTS d1_trend TEXT DEFAULT 'unknown' CHECK (d1_trend IN ('up', 'down', 'sideways', 'unknown')),

-- RL Agent information
ADD COLUMN IF NOT EXISTS rl_agent_id TEXT,
ADD COLUMN IF NOT EXISTS rl_model_version TEXT,
ADD COLUMN IF NOT EXISTS rl_confidence_score DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS rl_expected_reward DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS rl_action_probability DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS rl_state_representation JSONB,

-- LLM Analysis
ADD COLUMN IF NOT EXISTS llm_sentiment_score DECIMAL(5,2) DEFAULT 0 CHECK (llm_sentiment_score >= -100 AND llm_sentiment_score <= 100),
ADD COLUMN IF NOT EXISTS llm_risk_assessment TEXT DEFAULT 'moderate' CHECK (llm_risk_assessment IN ('low', 'moderate', 'high', 'extreme')),
ADD COLUMN IF NOT EXISTS llm_analysis_text TEXT,
ADD COLUMN IF NOT EXISTS llm_confidence_level DECIMAL(5,2) DEFAULT 0,

-- Partial fills and multiple legs
ADD COLUMN IF NOT EXISTS is_partial_fill BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS fill_percentage DECIMAL(5,2) DEFAULT 100,
ADD COLUMN IF NOT EXISTS total_legs INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS current_leg INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS parent_trade_id UUID REFERENCES public.mt5_signals(id) ON DELETE SET NULL,

-- Advanced tracking
ADD COLUMN IF NOT EXISTS correlation_id UUID, -- For grouping related signals
ADD COLUMN IF NOT EXISTS batch_id UUID, -- For batch processing
ADD COLUMN IF NOT EXISTS strategy_id TEXT, -- For strategy attribution
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}', -- For flexible categorization
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}', -- For custom metadata

-- Performance tracking fields
ADD COLUMN IF NOT EXISTS peak_profit DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_drawdown DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS risk_adjusted_return DECIMAL(10,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS sharpe_ratio DECIMAL(10,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS profit_factor DECIMAL(10,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS win_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS loss_streak INTEGER DEFAULT 0;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_mt5_signals_signal_metadata ON public.mt5_signals(signal_metadata_id);
CREATE INDEX IF NOT EXISTS idx_mt5_signals_execution_details ON public.mt5_signals(execution_details_id);
CREATE INDEX IF NOT EXISTS idx_mt5_signals_market_context ON public.mt5_signals(market_context_id);
CREATE INDEX IF NOT EXISTS idx_mt5_signals_performance_metrics ON public.mt5_signals(performance_metrics_id);
CREATE INDEX IF NOT EXISTS idx_mt5_signals_signal_source ON public.mt5_signals(signal_source);
CREATE INDEX IF NOT EXISTS idx_mt5_signals_market_regime ON public.mt5_signals(market_regime);
CREATE INDEX IF NOT EXISTS idx_mt5_signals_session_info ON public.mt5_signals(session_info);
CREATE INDEX IF NOT EXISTS idx_mt5_signals_generation_timestamp ON public.mt5_signals(generation_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_mt5_signals_correlation_id ON public.mt5_signals(correlation_id);
CREATE INDEX IF NOT EXISTS idx_mt5_signals_batch_id ON public.mt5_signals(batch_id);
CREATE INDEX IF NOT EXISTS idx_mt5_signals_parent_trade_id ON public.mt5_signals(parent_trade_id);
CREATE INDEX IF NOT EXISTS idx_mt5_signals_tags ON public.mt5_signals USING GIN(tags);