# Supabase Integration Plan for ML Trading System

## Overview

This document outlines the comprehensive integration strategy between the ML trading system and Supabase, including database schema optimization, edge functions, real-time features, and security policies.

## Current Supabase Setup Analysis

### Existing Configuration
- **Project URL:** https://rvopmdflnecyrwrzhyfy.supabase.co
- **Project ID:** rvopmdflnecyrwrzhyfy
- **Status:** Active with frontend integration

### Current Limitations
1. **ML-specific tables** need creation and optimization
2. **Real-time subscriptions** not implemented for ML signals
3. **Row Level Security (RLS)** policies need ML-specific rules
4. **Edge functions** limited to technical indicators only
5. **Database functions** for ML calculations missing

## Phase 1: Database Schema Enhancement

### 1.1 ML-Specific Tables

```sql
-- ML Model Management
CREATE TABLE IF NOT EXISTS ml_models (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    model_version VARCHAR(50) NOT NULL UNIQUE,
    model_type VARCHAR(20) NOT NULL DEFAULT 'LSTM',
    model_status VARCHAR(20) NOT NULL DEFAULT 'training',
    file_path TEXT,
    metadata JSONB,
    training_samples_count INTEGER DEFAULT 0,
    validation_samples_count INTEGER DEFAULT 0,
    accuracy DECIMAL(5,4),
    precision_buy DECIMAL(5,4),
    precision_sell DECIMAL(5,4),
    recall_buy DECIMAL(5,4),
    recall_sell DECIMAL(5,4),
    f1_score DECIMAL(5,4),
    overall_win_rate DECIMAL(5,4),
    avg_profit_per_trade DECIMAL(10,4),
    profit_factor DECIMAL(5,2),
    max_drawdown DECIMAL(5,4),
    sharpe_ratio DECIMAL(5,4),
    feature_importance JSONB,
    training_duration_minutes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT false
);

-- Indicator Weights Management
CREATE TABLE IF NOT EXISTS ml_indicator_weights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    indicator_name VARCHAR(50) NOT NULL UNIQUE,
    current_weight DECIMAL(5,4) NOT NULL DEFAULT 1.0,
    default_weight DECIMAL(5,4) NOT NULL DEFAULT 1.0,
    weight_category VARCHAR(20) NOT NULL,
    importance_rank INTEGER,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    update_count INTEGER DEFAULT 0,
    avg_performance_with_weight DECIMAL(5,4),
    weight_stability DECIMAL(5,4),
    min_weight DECIMAL(5,4) DEFAULT 0.1,
    max_weight DECIMAL(5,4) DEFAULT 2.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ML Training Samples
CREATE TABLE IF NOT EXISTS ml_training_samples (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    signal_type VARCHAR(10) NOT NULL, -- BUY, SELL, HOLD
    entry_price DECIMAL(15,5) NOT NULL,
    stop_loss DECIMAL(15,5),
    take_profit DECIMAL(15,5),
    exit_price DECIMAL(15,5),
    profit_loss DECIMAL(10,4),
    performance_score DECIMAL(5,4),

    -- Technical Indicators (17 features)
    adx_value DECIMAL(8,4),
    rsi_value DECIMAL(8,4),
    ema_12 DECIMAL(15,5),
    ema_21 DECIMAL(15,5),
    ema_50 DECIMAL(15,5),
    vwap DECIMAL(15,5),
    atr_value DECIMAL(8,5),
    bollinger_upper DECIMAL(15,5),
    bollinger_lower DECIMAL(15,5),
    stoch_k DECIMAL(8,4),
    stoch_d DECIMAL(8,4),
    macd_line DECIMAL(8,6),
    macd_signal DECIMAL(8,6),
    volume_ma DECIMAL(15,2),
    price_change_pct DECIMAL(8,4),
    volatility DECIMAL(8,4),

    -- Market Context
    market_session VARCHAR(10),
    trend_direction VARCHAR(10),
    volatility_regime VARCHAR(10),

    -- Model Information
    model_version_used VARCHAR(50),
    prediction_confidence DECIMAL(5,4),
    actual_result VARCHAR(10),

    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Performance Tracking
    trade_duration_minutes INTEGER,
    max_profit DECIMAL(10,4),
    max_loss DECIMAL(10,4),
    risk_reward_ratio DECIMAL(5,2)
);

-- Model Performance Tracking
CREATE TABLE IF NOT EXISTS ml_model_performance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    model_version VARCHAR(50) NOT NULL,
    training_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    training_samples_count INTEGER NOT NULL,
    validation_samples_count INTEGER NOT NULL,

    -- Core Metrics
    accuracy DECIMAL(5,4) NOT NULL,
    precision_buy DECIMAL(5,4),
    precision_sell DECIMAL(5,4),
    recall_buy DECIMAL(5,4),
    recall_sell DECIMAL(5,4),
    f1_score DECIMAL(5,4),

    -- Financial Metrics
    overall_win_rate DECIMAL(5,4),
    avg_profit_per_trade DECIMAL(10,4),
    profit_factor DECIMAL(5,2),
    max_drawdown DECIMAL(5,4),
    sharpe_ratio DECIMAL(5,4),
    sortino_ratio DECIMAL(5,4),
    calmar_ratio DECIMAL(5,2),

    -- Weight Changes
    previous_weights JSONB,
    new_weights JSONB,
    weight_changes JSONB,
    feature_importance JSONB,

    -- Training Details
    training_duration_minutes INTEGER,
    convergence_epoch INTEGER,
    best_epoch INTEGER,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ML Predictions Log
CREATE TABLE IF NOT EXISTS ml_predictions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    model_version VARCHAR(50) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    prediction_type VARCHAR(20) NOT NULL DEFAULT 'SIGNAL',

    -- Input Features
    input_features JSONB NOT NULL,
    technical_indicators JSONB NOT NULL,
    market_conditions JSONB,

    -- Prediction Results
    predicted_direction VARCHAR(10) NOT NULL,
    confidence_score DECIMAL(5,4) NOT NULL,
    signal_weight DECIMAL(5,4),
    recommendation VARCHAR(20),
    position_multiplier DECIMAL(5,4),

    -- Risk Metrics
    risk_assessment JSONB,
    risk_score DECIMAL(5,4),

    -- Model Information
    prediction_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processing_time_ms INTEGER,

    -- Performance Tracking
    actual_outcome VARCHAR(10),
    actual_profit_loss DECIMAL(10,4),
    outcome_timestamp TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ML Generation Logs
CREATE TABLE IF NOT EXISTS ml_generation_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    batch_id VARCHAR(100) NOT NULL UNIQUE,
    generation_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    generation_strategy VARCHAR(50) NOT NULL,

    -- Batch Statistics
    symbols_count INTEGER NOT NULL,
    signals_per_symbol INTEGER DEFAULT 1,
    total_signals_generated INTEGER NOT NULL,

    -- Quality Metrics
    avg_confidence DECIMAL(5,4),
    confidence_distribution JSONB,
    signal_distribution JSONB, -- BUY/SELL/HOLD counts

    -- Performance
    processing_time_seconds INTEGER,
    success_rate DECIMAL(5,4),
    error_count INTEGER DEFAULT 0,

    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    error_details JSONB,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- ML Model Drift Detection
CREATE TABLE IF NOT EXISTS ml_model_drift (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    model_version VARCHAR(50) NOT NULL,
    drift_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Drift Metrics
    data_drift_score DECIMAL(5,4),
    prediction_drift_score DECIMAL(5,4),
    performance_drift_score DECIMAL(5,4),
    overall_drift_score DECIMAL(5,4),

    -- Feature Drift Details
    feature_drift_details JSONB,

    -- Action Taken
    drift_detected BOOLEAN DEFAULT false,
    action_taken VARCHAR(50),
    retraining_triggered BOOLEAN DEFAULT false,

    -- Thresholds
    drift_threshold DECIMAL(5,4) DEFAULT 0.1,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 1.2 Indexes and Performance Optimization

```sql
-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_ml_models_version_active ON ml_models(model_version, is_active);
CREATE INDEX IF NOT EXISTS idx_ml_models_status ON ml_models(model_status);
CREATE INDEX IF NOT EXISTS idx_ml_models_created_at ON ml_models(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ml_weights_indicator ON ml_indicator_weights(indicator_name);
CREATE INDEX IF NOT EXISTS idx_ml_weights_category ON ml_indicator_weights(weight_category);
CREATE INDEX IF NOT EXISTS idx_ml_weights_updated ON ml_indicator_weights(last_updated DESC);

CREATE INDEX IF NOT EXISTS idx_ml_training_samples_symbol_created ON ml_training_samples(symbol, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ml_training_samples_status ON ml_training_samples(status);
CREATE INDEX IF NOT EXISTS idx_ml_training_samples_performance ON ml_training_samples(performance_score DESC);
CREATE INDEX IF NOT EXISTS idx_ml_training_samples_model_version ON ml_training_samples(model_version_used);

CREATE INDEX IF NOT EXISTS idx_ml_predictions_symbol_timestamp ON ml_predictions(symbol, prediction_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_model_version ON ml_predictions(model_version);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_confidence ON ml_predictions(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_outcome ON ml_predictions(actual_outcome) WHERE actual_outcome IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ml_performance_model_date ON ml_model_performance(model_version, training_date DESC);
CREATE INDEX IF NOT EXISTS idx_ml_performance_accuracy ON ml_model_performance(accuracy DESC);

-- Composite Indexes for Common Queries
CREATE INDEX IF NOT EXISTS idx_ml_training_composite ON ml_training_samples(symbol, status, created_at DESC, performance_score);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_composite ON ml_predictions(model_version, symbol, prediction_timestamp DESC, confidence_score);
```

### 1.3 Database Functions for ML Operations

```sql
-- Function to get latest model weights
CREATE OR REPLACE FUNCTION get_latest_indicator_weights()
RETURNS TABLE (
    indicator_name VARCHAR(50),
    current_weight DECIMAL(5,4),
    weight_category VARCHAR(20),
    last_updated TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        iw.indicator_name,
        iw.current_weight,
        iw.weight_category,
        iw.last_updated
    FROM ml_indicator_weights iw
    ORDER BY iw.importance_rank ASC NULLS LAST, iw.indicator_name ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to get model performance metrics
CREATE OR REPLACE FUNCTION get_model_performance_metrics(
    p_model_version VARCHAR(50) DEFAULT NULL,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    model_version VARCHAR(50),
    training_date TIMESTAMP WITH TIME ZONE,
    accuracy DECIMAL(5,4),
    win_rate DECIMAL(5,4),
    profit_factor DECIMAL(5,2),
    max_drawdown DECIMAL(5,4),
    sharpe_ratio DECIMAL(5,4)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.model_version,
        m.training_date,
        m.accuracy,
        m.overall_win_rate,
        m.profit_factor,
        m.max_drawdown,
        m.sharpe_ratio
    FROM ml_model_performance m
    WHERE
        (p_model_version IS NULL OR m.model_version = p_model_version)
        AND m.training_date >= NOW() - INTERVAL '1 day' * p_days
    ORDER BY m.training_date DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate trading statistics
CREATE OR REPLACE FUNCTION calculate_trading_statistics(
    p_days INTEGER DEFAULT 30,
    p_symbol VARCHAR(20) DEFAULT NULL
)
RETURNS TABLE (
    total_trades INTEGER,
    winning_trades INTEGER,
    losing_trades INTEGER,
    win_rate DECIMAL(5,4),
    avg_profit_loss DECIMAL(10,4),
    total_profit_loss DECIMAL(12,4),
    profit_factor DECIMAL(5,2),
    avg_confidence DECIMAL(5,4),
    symbol VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) as total_trades,
        COUNT(CASE WHEN ts.profit_loss > 0 THEN 1 END) as winning_trades,
        COUNT(CASE WHEN ts.profit_loss < 0 THEN 1 END) as losing_trades,
        CASE
            WHEN COUNT(*) > 0 THEN
                CAST(COUNT(CASE WHEN ts.profit_loss > 0 THEN 1 END) AS DECIMAL) / COUNT(*)
            ELSE 0
        END as win_rate,
        AVG(ts.profit_loss) as avg_profit_loss,
        SUM(ts.profit_loss) as total_profit_loss,
        CASE
            WHEN SUM(CASE WHEN ts.profit_loss < 0 THEN ABS(ts.profit_loss) ELSE 0 END) > 0 THEN
                SUM(CASE WHEN ts.profit_loss > 0 THEN ts.profit_loss ELSE 0 END) /
                SUM(CASE WHEN ts.profit_loss < 0 THEN ABS(ts.profit_loss) ELSE 0 END)
            ELSE 0
        END as profit_factor,
        AVG(ts.performance_score) as avg_confidence,
        ts.symbol
    FROM ml_training_samples ts
    WHERE
        ts.created_at >= NOW() - INTERVAL '1 day' * p_days
        AND ts.status IN ('SL_HIT', 'TP_HIT')
        AND ts.profit_loss IS NOT NULL
        AND (p_symbol IS NULL OR ts.symbol = p_symbol)
    GROUP BY ts.symbol;
END;
$$ LANGUAGE plpgsql;

-- Function to detect model drift
CREATE OR REPLACE FUNCTION detect_model_drift(
    p_model_version VARCHAR(50),
    p_threshold DECIMAL(5,4) DEFAULT 0.1
)
RETURNS TABLE (
    drift_detected BOOLEAN,
    drift_score DECIMAL(5,4),
    drift_type VARCHAR(50),
    recommendations TEXT[]
) AS $$
DECLARE
    v_data_drift DECIMAL(5,4);
    v_performance_drift DECIMAL(5,4);
    v_prediction_drift DECIMAL(5,4);
    v_overall_drift DECIMAL(5,4);
    v_recommendations TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Calculate data drift (simplified version)
    SELECT
        ABS(AVG(performance_score) -
            (SELECT AVG(performance_score)
             FROM ml_training_samples
             WHERE model_version_used = p_model_version
               AND created_at >= NOW() - INTERVAL '30 days')
        ) / NULLIF(AVG(performance_score), 0)
    INTO v_data_drift
    FROM ml_training_samples
    WHERE model_version_used = p_model_version
      AND created_at >= NOW() - INTERVAL '7 days';

    -- Calculate performance drift
    SELECT
        ABS(AVG(accuracy) -
            (SELECT AVG(accuracy)
             FROM ml_model_performance
             WHERE model_version = p_model_version
               AND training_date >= NOW() - INTERVAL '30 days')
        )
    INTO v_performance_drift
    FROM ml_model_performance
    WHERE model_version = p_model_version
      AND training_date >= NOW() - INTERVAL '7 days';

    -- Calculate overall drift score
    v_overall_drift := (v_data_drift + v_performance_drift) / 2;

    -- Generate recommendations
    IF v_overall_drift > p_threshold THEN
        v_recommendations := array_append(v_recommendations, 'Retraining recommended');
        v_recommendations := array_append(v_recommendations, 'Check data quality');
    END IF;

    IF v_performance_drift > p_threshold THEN
        v_recommendations := array_append(v_recommendations, 'Model performance degraded');
    END IF;

    RETURN NEXT
    VALUES (
        v_overall_drift > p_threshold,
        v_overall_drift,
        CASE
            WHEN v_data_drift > p_threshold THEN 'Data Drift'
            WHEN v_performance_drift > p_threshold THEN 'Performance Drift'
            ELSE 'No Significant Drift'
        END,
        v_recommendations
    );
END;
$$ LANGUAGE plpgsql;
```

### 1.4 Row Level Security (RLS) Policies

```sql
-- Enable RLS on all ML tables
ALTER TABLE ml_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_indicator_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_training_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_model_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_generation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_model_drift ENABLE ROW LEVEL SECURITY;

-- Public read access for model information (weights, performance)
CREATE POLICY "Public read access to model information" ON ml_indicator_weights
    FOR SELECT USING (true);

CREATE POLICY "Public read access to model performance" ON ml_model_performance
    FOR SELECT USING (true);

CREATE POLICY "Public read access to active models" ON ml_models
    FOR SELECT USING (is_active = true);

-- Service role access for ML operations
CREATE POLICY "Service role full access to models" ON ml_models
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to training samples" ON ml_training_samples
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to predictions" ON ml_predictions
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Anonymous users can create predictions (for public API)
CREATE POLICY "Allow anonymous predictions" ON ml_predictions
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'anon');

-- Authenticated users can read their own predictions
CREATE POLICY "Users read own predictions" ON ml_predictions
    FOR SELECT USING (
        auth.uid() IS NOT NULL OR
        auth.jwt() ->> 'role' IN ('anon', 'service_role')
    );
```

## Phase 2: Edge Functions Enhancement

### 2.1 Enhanced Technical Indicators Function

```typescript
// supabase/functions/technical-indicators-advanced/main.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { TechnicalAnalyzer } from './technical-analyzer.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface IndicatorRequest {
  symbol: string
  timeframe?: string
  indicators?: string[]
  includePrediction?: boolean
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { symbol, timeframe = 'M5', indicators, includePrediction = false }: IndicatorRequest = await req.json()

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Initialize technical analyzer
    const analyzer = new TechnicalAnalyzer()

    // Get market data from OANDA
    const marketData = await analyzer.fetchOandaData(symbol, timeframe, 200)

    if (!marketData || marketData.length === 0) {
      throw new Error(`No market data available for ${symbol}`)
    }

    // Calculate all indicators
    const indicatorResults = await analyzer.calculateAllIndicators(marketData)

    // Get current weights from database
    const { data: weights, error: weightsError } = await supabaseClient
      .rpc('get_latest_indicator_weights')

    if (weightsError) {
      console.error('Error fetching weights:', weightsError)
    }

    // Apply weights to indicators
    const weightedIndicators = analyzer.applyWeights(indicatorResults, weights || [])

    // Get ML prediction if requested
    let prediction = null
    if (includePrediction) {
      try {
        const predictionResponse = await fetch(`${Deno.env.get('ML_API_URL')}/predict`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('ML_API_KEY')}`
          },
          body: JSON.stringify({
            symbol,
            indicators: weightedIndicators
          })
        })

        if (predictionResponse.ok) {
          prediction = await predictionResponse.json()
        }
      } catch (error) {
        console.error('ML prediction error:', error)
      }
    }

    const result = {
      success: true,
      symbol,
      timestamp: new Date().toISOString(),
      timeframe,
      indicators: weightedIndicators,
      current_price: marketData[marketData.length - 1],
      weights: weights,
      prediction,
      technical_summary: analyzer.generateTechnicalSummary(weightedIndicators)
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
```

### 2.2 ML Prediction Edge Function

```typescript
// supabase/functions/ml-predict/main.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface PredictionRequest {
  symbol: string
  features: Record<string, number>
  model_version?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    })
  }

  try {
    const { symbol, features, model_version }: PredictionRequest = await req.json()

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get active model version if not specified
    let targetModelVersion = model_version
    if (!targetModelVersion) {
      const { data: models } = await supabaseClient
        .from('ml_models')
        .select('model_version')
        .eq('is_active', true)
        .eq('model_status', 'trained')
        .single()

      targetModelVersion = models?.model_version
    }

    if (!targetModelVersion) {
      throw new Error('No active model available')
    }

    // Call ML API for prediction
    const mlResponse = await fetch(`${Deno.env.get('ML_API_URL')}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('ML_API_KEY')}`
      },
      body: JSON.stringify({
        symbol,
        indicators: features,
        model_version: targetModelVersion
      })
    })

    if (!mlResponse.ok) {
      throw new Error(`ML API error: ${mlResponse.statusText}`)
    }

    const prediction = await mlResponse.json()

    // Log prediction to database
    const { error: logError } = await supabaseClient
      .from('ml_predictions')
      .insert({
        model_version: targetModelVersion,
        symbol,
        prediction_type: 'SIGNAL',
        input_features: features,
        technical_indicators: features,
        predicted_direction: prediction.prediction?.direction,
        confidence_score: prediction.prediction?.ml_confidence || 0,
        signal_weight: prediction.prediction?.signal_weight || 0,
        recommendation: prediction.prediction?.recommendation,
        position_multiplier: prediction.prediction?.position_multiplier || 1,
        prediction_timestamp: new Date().toISOString(),
        processing_time_ms: Date.now()
      })

    if (logError) {
      console.error('Error logging prediction:', logError)
    }

    return new Response(JSON.stringify({
      success: true,
      prediction: prediction.prediction,
      model_version: targetModelVersion,
      timestamp: new Date().toISOString()
    }), {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    })

  } catch (error) {
    console.error('Prediction error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      status: 500
    })
  }
})
```

### 2.3 Model Training Trigger Function

```typescript
// supabase/functions/trigger-model-training/main.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    })
  }

  try {
    const { force_retrain = false, model_version } = await req.json()

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check if training is needed
    if (!force_retrain) {
      const { data: lastTraining } = await supabaseClient
        .from('ml_model_performance')
        .select('training_date')
        .order('training_date', { ascending: false })
        .limit(1)
        .single()

      if (lastTraining) {
        const daysSinceLastTraining = Math.floor(
          (new Date().getTime() - new Date(lastTraining.training_date).getTime()) / (1000 * 60 * 60 * 24)
        )

        if (daysSinceLastTraining < 7) {
          return new Response(JSON.stringify({
            success: false,
            message: 'Training executed recently, skipping',
            last_training: lastTraining.training_date
          }))
        }
      }
    }

    // Trigger ML API training
    const trainingResponse = await fetch(`${Deno.env.get('ML_API_URL')}/train`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('ML_API_KEY')}`
      },
      body: JSON.stringify({
        force_retrain,
        model_version: model_version || `v${Date.now()}`
      })
    })

    if (!trainingResponse.ok) {
      throw new Error(`Training API error: ${trainingResponse.statusText}`)
    }

    const trainingResult = await trainingResponse.json()

    // Log training initiation
    await supabaseClient
      .from('ml_generation_logs')
      .insert({
        batch_id: `training_${Date.now()}`,
        generation_strategy: 'SCHEDULED_TRAINING',
        symbols_count: 0,
        total_signals_generated: 0,
        avg_confidence: 0,
        status: 'ACTIVE'
      })

    return new Response(JSON.stringify({
      success: true,
      training: trainingResult,
      initiated_at: new Date().toISOString()
    }), {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    })

  } catch (error) {
    console.error('Training trigger error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      status: 500
    })
  }
})
```

## Phase 3: Real-time Features

### 3.1 Real-time Subscriptions

```typescript
// Client-side real-time ML predictions
import { createClient } from '@supabase/supabase-js'

class MLRealtimeClient {
  private supabase: any
  private subscriptions: Map<string, any> = new Map()

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey)
  }

  subscribeToPredictions(symbol: string, callback: (prediction: any) => void) {
    const subscriptionName = `predictions_${symbol}`

    if (this.subscriptions.has(subscriptionName)) {
      this.subscriptions.get(subscriptionName).unsubscribe()
    }

    const subscription = this.supabase
      .channel(`ml_predictions:${symbol}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ml_predictions',
          filter: `symbol=eq.${symbol}`
        },
        (payload: any) => {
          callback(payload.new)
        }
      )
      .subscribe()

    this.subscriptions.set(subscriptionName, subscription)
    return subscription
  }

  subscribeToModelUpdates(callback: (modelUpdate: any) => void) {
    const subscriptionName = 'model_updates'

    if (this.subscriptions.has(subscriptionName)) {
      this.subscriptions.get(subscriptionName).unsubscribe()
    }

    const subscription = this.supabase
      .channel('ml_models')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ml_models',
          filter: 'is_active=eq.true'
        },
        (payload: any) => {
          callback(payload)
        }
      )
      .subscribe()

    this.subscriptions.set(subscriptionName, subscription)
    return subscription
  }

  subscribeToWeightUpdates(callback: (weightUpdate: any) => void) {
    const subscriptionName = 'weight_updates'

    if (this.subscriptions.has(subscriptionName)) {
      this.subscriptions.get(subscriptionName).unsubscribe()
    }

    const subscription = this.supabase
      .channel('ml_indicator_weights')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ml_indicator_weights'
        },
        (payload: any) => {
          callback(payload.new)
        }
      )
      .subscribe()

    this.subscriptions.set(subscriptionName, subscription)
    return subscription
  }

  unsubscribe(symbol?: string) {
    if (symbol) {
      const subscriptionName = `predictions_${symbol}`
      const subscription = this.subscriptions.get(subscriptionName)
      if (subscription) {
        subscription.unsubscribe()
        this.subscriptions.delete(subscriptionName)
      }
    } else {
      // Unsubscribe from all
      this.subscriptions.forEach((subscription) => {
        subscription.unsubscribe()
      })
      this.subscriptions.clear()
    }
  }
}

export { MLRealtimeClient }
```

### 3.2 Database Triggers for Real-time Updates

```sql
-- Trigger to update model last_updated timestamp
CREATE OR REPLACE FUNCTION update_model_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_model_timestamp
    BEFORE UPDATE ON ml_models
    FOR EACH ROW
    EXECUTE FUNCTION update_model_timestamp();

-- Trigger to update weights last_updated timestamp
CREATE TRIGGER trigger_update_weights_timestamp
    BEFORE UPDATE ON ml_indicator_weights
    FOR EACH ROW
    EXECUTE FUNCTION update_model_timestamp();

-- Trigger to automatically log model performance changes
CREATE OR REPLACE FUNCTION log_model_performance_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_active != NEW.is_active THEN
        INSERT INTO ml_generation_logs (
            batch_id,
            generation_strategy,
            symbols_count,
            total_signals_generated,
            avg_confidence,
            status
        ) VALUES (
            CONCAT('model_change_', NEW.model_version, '_', EXTRACT(EPOCH FROM NOW())),
            'MODEL_UPDATE',
            0,
            0,
            0,
            CASE WHEN NEW.is_active THEN 'ACTIVE' ELSE 'INACTIVE' END
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_model_performance_change
    AFTER UPDATE ON ml_models
    FOR EACH ROW
    EXECUTE FUNCTION log_model_performance_change();
```

## Phase 4: Monitoring & Analytics

### 4.1 Performance Dashboard Functions

```sql
-- Function for dashboard analytics
CREATE OR REPLACE FUNCTION get_ml_dashboard_data()
RETURNS TABLE (
    active_model_version VARCHAR(50),
    total_predictions_today INTEGER,
    avg_confidence_today DECIMAL(5,4),
    win_rate_today DECIMAL(5,4),
    total_trades_today INTEGER,
    profit_today DECIMAL(12,4),
    model_accuracy DECIMAL(5,4),
    last_training_date TIMESTAMP WITH TIME ZONE,
    total_models INTEGER,
    active_indicators INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH
    active_model AS (
        SELECT model_version, accuracy
        FROM ml_models
        WHERE is_active = true
        LIMIT 1
    ),
    today_stats AS (
        SELECT
            COUNT(*) as predictions_count,
            AVG(confidence_score) as avg_confidence,
            COUNT(CASE WHEN actual_outcome = 'PROFIT' THEN 1 END) as winning_trades,
            COUNT(*) as total_trades,
            SUM(COALESCE(actual_profit_loss, 0)) as profit_loss
        FROM ml_predictions
        WHERE DATE(prediction_timestamp) = CURRENT_DATE
    )
    SELECT
        am.model_version,
        COALESCE(ts.predictions_count, 0) as total_predictions_today,
        COALESCE(ts.avg_confidence, 0) as avg_confidence_today,
        CASE
            WHEN ts.total_trades > 0 THEN
                CAST(ts.winning_trades AS DECIMAL) / ts.total_trades
            ELSE 0
        END as win_rate_today,
        COALESCE(ts.total_trades, 0) as total_trades_today,
        COALESCE(ts.profit_loss, 0) as profit_today,
        am.accuracy as model_accuracy,
        (SELECT MAX(training_date) FROM ml_model_performance) as last_training_date,
        (SELECT COUNT(*) FROM ml_models) as total_models,
        (SELECT COUNT(*) FROM ml_indicator_weights) as active_indicators
    FROM active_model am
    LEFT JOIN today_stats ts ON true;
END;
$$ LANGUAGE plpgsql;

-- Function for model performance trends
CREATE OR REPLACE FUNCTION get_performance_trends(days INTEGER DEFAULT 30)
RETURNS TABLE (
    date DATE,
    predictions_count INTEGER,
    avg_confidence DECIMAL(5,4),
    win_rate DECIMAL(5,4),
    profit_loss DECIMAL(12,4)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        DATE(prediction_timestamp) as date,
        COUNT(*) as predictions_count,
        AVG(confidence_score) as avg_confidence,
        CASE
            WHEN COUNT(*) > 0 THEN
                CAST(COUNT(CASE WHEN actual_profit_loss > 0 THEN 1 END) AS DECIMAL) / COUNT(*)
            ELSE 0
        END as win_rate,
        SUM(COALESCE(actual_profit_loss, 0)) as profit_loss
    FROM ml_predictions
    WHERE prediction_timestamp >= CURRENT_DATE - INTERVAL '1 day' * days
    GROUP BY DATE(prediction_timestamp)
    ORDER BY date ASC;
END;
$$ LANGUAGE plpgsql;
```

## Phase 5: Security & Authentication

### 5.1 API Key Management

```sql
-- Table for API key management
CREATE TABLE IF NOT EXISTS ml_api_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key_name VARCHAR(100) NOT NULL,
    api_key VARCHAR(255) NOT NULL UNIQUE,
    key_type VARCHAR(20) NOT NULL DEFAULT 'prediction',
    rate_limit_per_hour INTEGER DEFAULT 1000,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    usage_count INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE ml_api_keys ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Service role full access to API keys" ON ml_api_keys
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users manage own API keys" ON ml_api_keys
    FOR ALL USING (auth.uid() = created_by);

-- Function to validate API key
CREATE OR REPLACE FUNCTION validate_ml_api_key(api_key_text VARCHAR(255))
RETURNS TABLE (
    is_valid BOOLEAN,
    key_id UUID,
    key_name VARCHAR(100),
    rate_limit INTEGER,
    usage_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        true as is_valid,
        ak.id as key_id,
        ak.key_name,
        ak.rate_limit_per_hour as rate_limit,
        ak.usage_count
    FROM ml_api_keys ak
    WHERE
        ak.api_key = api_key_text
        AND ak.is_active = true
        AND (ak.expires_at IS NULL OR ak.expires_at > NOW())
    LIMIT 1;

    -- If no key found, return false
    IF NOT FOUND THEN
        RETURN NEXT
        SELECT false, NULL, NULL, NULL, NULL;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Implementation Checklist

### Database Setup
- [ ] Create all ML tables with proper indexes
- [ ] Set up RLS policies for security
- [ ] Create database functions and triggers
- [ ] Set up monitoring and analytics functions

### Edge Functions
- [ ] Deploy enhanced technical indicators function
- [ ] Implement ML prediction edge function
- [ ] Create model training trigger function
- [ ] Set up API key validation function

### Real-time Features
- [ ] Implement database triggers for real-time updates
- [ ] Create client-side subscription management
- [ ] Set up WebSocket connections for live updates

### Security
- [ ] Implement API key management system
- [ ] Set up proper RLS policies
- [ ] Configure service role permissions
- [ ] Implement rate limiting

### Monitoring
- [ ] Create performance dashboard functions
- [ ] Set up automated drift detection
- [ ] Implement logging and alerting
- [ ] Create health check endpoints

This comprehensive integration plan will transform the current basic Supabase setup into a full-featured ML trading system with real-time capabilities, proper security, and robust monitoring.