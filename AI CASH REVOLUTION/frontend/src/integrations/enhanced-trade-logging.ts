// Enhanced Trade Logging Integration Examples
// This file demonstrates how to use the comprehensive trade logging system

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  EnhancedDatabase,
  Mt5SignalsInsert,
  SignalMetadataInsert,
  ExecutionDetailsInsert,
  MarketContextRow,
  PerformanceMetricsRow
} from './supabase/enhanced-types';

// Interface for multi-timeframe trends
export interface MultiTimeframeTrends {
  m1: 'up' | 'down' | 'sideways' | 'unknown';
  m5: 'up' | 'down' | 'sideways' | 'unknown';
  m15: 'up' | 'down' | 'sideways' | 'unknown';
  h1: 'up' | 'down' | 'sideways' | 'unknown';
  h4: 'up' | 'down' | 'sideways' | 'unknown';
  d1: 'up' | 'down' | 'sideways' | 'unknown';
}

// Interface for audit trail entries
export interface AuditTrailEntry {
  timestamp: string;
  action: string;
  details: Record<string, unknown>;
}

// Interface for market conditions at execution
export interface MarketConditionsAtExecution {
  volatility: 'low' | 'normal' | 'high' | 'extreme';
  liquidity: 'low' | 'normal' | 'high' | 'thin';
}

export class EnhancedTradeLogger {
  private supabase: SupabaseClient<EnhancedDatabase>;

  constructor(supabaseClient?: SupabaseClient<EnhancedDatabase>) {
    // Use provided client or import singleton
    if (supabaseClient) {
      this.supabase = supabaseClient;
    } else {
      // Import the singleton client to avoid multiple instances
      const { supabase } = require('./supabase/client');
      this.supabase = supabase as SupabaseClient<EnhancedDatabase>;
    }
  }

  // Example 1: Log a complete trade with all metadata
  async logCompleteTrade(tradeData: {
    signal: string;
    symbol: string;
    entry: number;
    stopLoss: number;
    takeProfit: number;
    userId?: string;
    clientId: string;
    // Enhanced metadata
    signalSource: 'ai' | 'rl_agent' | 'manual' | 'api' | 'ml_model';
    aiModelName: string;
    aiModelVersion: string;
    confidenceLevel: number;
    marketRegime: string;
    volatilityState: string;
    sessionInfo: string;
    // Smart Money Concepts
    smartMoneyScore: number;
    institutionalBias: string;
    // Multi-timeframe analysis
    trends: MultiTimeframeTrends;
    // RL Agent data
    rlAgentId?: string;
    rlModelVersion?: string;
    rlConfidenceScore?: number;
    // LLM Analysis
    llmSentimentScore?: number;
    llmRiskAssessment?: string;
    llmAnalysisText?: string;
  }) {
    try {
      // Step 1: Create market context
      const marketContext = await this.createMarketContext({
        symbol: tradeData.symbol,
        marketRegime: tradeData.marketRegime,
        volatilityState: tradeData.volatilityState,
        sessionInfo: tradeData.sessionInfo,
        institutionalBias: tradeData.institutionalBias,
        smartMoneyScore: tradeData.smartMoneyScore,
        trends: tradeData.trends
      });

      // Step 2: Create signal metadata
      const signalMetadata = await this.createSignalMetadata({
        signalType: tradeData.signal.toLowerCase() as 'buy' | 'sell',
        signalCategory: 'trend_following',
        confidenceLevel: tradeData.confidenceLevel,
        aiModelName: tradeData.aiModelName,
        aiModelVersion: tradeData.aiModelVersion,
        aiConfidenceScore: tradeData.confidenceLevel,
        detectedPatterns: ['trend_following', 'momentum'],
        riskScore: 50 - tradeData.confidenceLevel, // Inverse relationship
        primaryIndicator: 'RSI',
        secondaryIndicators: ['MACD', 'Moving Average']
      });

      // Step 3: Create the main trade signal
      const tradeSignal: Mt5SignalsInsert = {
        signal: tradeData.signal,
        symbol: tradeData.symbol,
        entry: tradeData.entry,
        stop_loss: tradeData.stopLoss,
        take_profit: tradeData.takeProfit,
        client_id: tradeData.clientId,
        user_id: tradeData.userId,

        // Enhanced fields
        signal_source: tradeData.signalSource,
        signal_metadata_id: signalMetadata.id,
        market_context_id: marketContext.id,
        generation_timestamp: new Date().toISOString(),

        // Market regime
        market_regime: tradeData.marketRegime as 'trending' | 'ranging' | 'volatile' | 'quiet' | 'breakout' | 'reversal' | 'unknown',
        volatility_state: tradeData.volatilityState as 'low' | 'normal' | 'high' | 'extreme',
        session_info: tradeData.sessionInfo as 'asia' | 'london' | 'new_york' | 'overlap' | 'weekend' | 'unknown',

        // Smart Money Concepts
        smart_money_score: tradeData.smartMoneyScore,
        institutional_bias: tradeData.institutionalBias as 'bullish' | 'bearish' | 'neutral',

        // Multi-timeframe analysis
        m1_trend: tradeData.trends.m1,
        m5_trend: tradeData.trends.m5,
        m15_trend: tradeData.trends.m15,
        h1_trend: tradeData.trends.h1,
        h4_trend: tradeData.trends.h4,
        d1_trend: tradeData.trends.d1,

        // RL Agent data
        rl_agent_id: tradeData.rlAgentId,
        rl_model_version: tradeData.rlModelVersion,
        rl_confidence_score: tradeData.rlConfidenceScore || 0,

        // LLM Analysis
        llm_sentiment_score: tradeData.llmSentimentScore || 0,
        llm_risk_assessment: tradeData.llmRiskAssessment as 'low' | 'moderate' | 'high' | 'extreme',
        llm_analysis_text: tradeData.llmAnalysisText,

        // Tracking
        tags: ['AI-generated', 'trend-following', 'enhanced-logging'],
        custom_fields: {
          model_version: tradeData.aiModelVersion,
          strategy_type: 'enhanced_ai'
        }
      };

      const { data: signal, error: signalError } = await this.supabase
        .from('mt5_signals')
        .insert(tradeSignal)
        .select()
        .single();

      if (signalError) throw signalError;

      // Step 4: Update signal metadata with signal ID
      await this.supabase
        .from('signal_metadata')
        .update({ signal_id: signal.id })
        .eq('id', signalMetadata.id);

      // Step 5: Update market context with signal ID
      await this.supabase
        .from('market_context')
        .update({ signal_id: signal.id })
        .eq('id', marketContext.id);

      return {
        success: true,
        signal,
        signalMetadata,
        marketContext
      };

    } catch (error) {
      console.error('Error logging complete trade:', error);
      throw error;
    }
  }

  // Example 2: Log execution details when trade is executed
  async logExecutionDetails(executionData: {
    signalId: string;
    executionPrice: number;
    executedVolume: number;
    executionLatency: number;
    slippage: number;
    commission?: number;
    executionVenue?: string;
    ticketNumber?: number;
  }) {
    try {
      const executionDetails: ExecutionDetailsInsert = {
        signal_id: executionData.signalId,
        execution_id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        execution_status: 'executed',
        execution_timestamp: new Date().toISOString(),
        requested_price: 0, // This should be stored in the original signal
        execution_price: executionData.executionPrice,
        price_slippage: Math.abs(executionData.slippage),
        slippage_percentage: (Math.abs(executionData.slippage) / executionData.executionPrice) * 100,
        order_type: 'market',
        execution_venue: executionData.executionVenue || 'mt5',
        ticket_number: executionData.ticketNumber,
        requested_volume: executionData.executedVolume,
        executed_volume: executionData.executedVolume,
        fill_percentage: 100,
        fill_count: 1,
        signal_to_order_ms: executionData.executionLatency,
        order_to_execution_ms: 0,
        total_execution_ms: executionData.executionLatency,
        execution_latency_category: this.categorizeLatency(executionData.executionLatency),
        commission: executionData.commission || 0,
        total_cost: executionData.commission || 0,
        market_conditions_at_execution: {
          volatility: 'normal',
          liquidity: 'normal'
        } as MarketConditionsAtExecution,
        audit_trail: [{
          timestamp: new Date().toISOString(),
          action: 'execution_logged',
          details: executionData as Record<string, unknown>
        } as AuditTrailEntry]
      };

      const { data: execution, error } = await this.supabase
        .from('execution_details')
        .insert(executionDetails)
        .select()
        .single();

      if (error) throw error;

      // Update the main signal with execution details ID
      await this.supabase
        .from('mt5_signals')
        .update({
          execution_details_id: execution.id,
          status: 'opened',
          opened_at: new Date().toISOString()
        })
        .eq('id', executionData.signalId);

      return { success: true, execution };

    } catch (error) {
      console.error('Error logging execution details:', error);
      throw error;
    }
  }

  // Example 3: Update trade when closed
  async updateTradeClosed(tradeData: {
    signalId: string;
    closePrice: number;
    actualProfit: number;
    closeReason: string;
    pipsGained?: number;
    tradeDurationMinutes?: number;
    peakProfit?: number;
    maxDrawdown?: number;
  }) {
    try {
      // Update main signal
      const { data: signal, error: signalError } = await this.supabase
        .from('mt5_signals')
        .update({
          status: 'closed',
          close_price: tradeData.closePrice,
          actual_profit: tradeData.actualProfit,
          close_reason: tradeData.closeReason,
          closed_at: new Date().toISOString(),
          pips_gained: tradeData.pipsGained,
          trade_duration_minutes: tradeData.tradeDurationMinutes,
          peak_profit: tradeData.peakProfit,
          max_drawdown: tradeData.maxDrawdown
        })
        .eq('id', tradeData.signalId)
        .select()
        .single();

      if (signalError) throw signalError;

      // Calculate and store performance metrics
      await this.calculateAndStorePerformanceMetrics(tradeData.signalId);

      return { success: true, signal };

    } catch (error) {
      console.error('Error updating trade closed:', error);
      throw error;
    }
  }

  // Example 4: Get comprehensive performance analytics
  async getPerformanceAnalytics(filters: {
    userId?: string;
    symbol?: string;
    strategyId?: string;
    startDate?: string;
    endDate?: string;
  } = {}) {
    try {
      const { data, error } = await this.supabase
        .rpc('calculate_comprehensive_performance_metrics', {
          p_user_id: filters.userId,
          p_symbol: filters.symbol,
          p_strategy_id: filters.strategyId,
          p_start_date: filters.startDate,
          p_end_date: filters.endDate
        });

      if (error) throw error;

      return { success: true, analytics: data };

    } catch (error) {
      console.error('Error getting performance analytics:', error);
      throw error;
    }
  }

  // Example 5: Get enhanced trading dashboard data
  async getEnhancedDashboard(userId: string) {
    try {
      const { data, error } = await this.supabase
        .from('enhanced_trading_dashboard')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      return { success: true, dashboard: data };

    } catch (error) {
      console.error('Error getting enhanced dashboard:', error);
      throw error;
    }
  }

  // Example 6: Analyze market regime performance
  async getMarketRegimeAnalysis(symbol?: string) {
    try {
      let query = this.supabase
        .from('market_regime_analysis')
        .select('*');

      if (symbol) {
        query = query.eq('symbol', symbol);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, analysis: data };

    } catch (error) {
      console.error('Error getting market regime analysis:', error);
      throw error;
    }
  }

  // Helper methods
  private async createMarketContext(contextData: {
    symbol: string;
    marketRegime: string;
    volatilityState: string;
    sessionInfo: string;
    institutionalBias: string;
    smartMoneyScore: number;
    trends: MultiTimeframeTrends;
  }) {
    const { data, error } = await this.supabase
      .from('market_context')
      .insert({
        symbol: contextData.symbol,
        context_timestamp: new Date().toISOString(),
        market_regime: contextData.marketRegime as 'trending_up' | 'trending_down' | 'ranging' | 'volatile' | 'quiet' | 'breakout_bullish' | 'breakout_bearish' | 'reversal_bullish' | 'reversal_bearish' | 'unknown',
        volatility_state: contextData.volatilityState as 'low' | 'normal' | 'high' | 'extreme' | 'expanding' | 'contracting',
        session_info: contextData.sessionInfo as 'asia' | 'london' | 'new_york' | 'london_new_york_overlap' | 'asia_london_overlap' | 'weekend' | 'holiday' | 'unknown',
        institutional_activity_level: 'normal',
        institutional_net_position: contextData.institutionalBias as 'long' | 'short' | 'neutral',
        smart_money_flow: contextData.smartMoneyScore > 7 ? 80 :
                         contextData.smartMoneyScore > 5 ? 50 : 20,
        day_of_week: new Date().getDay(),
        time_of_day: new Date().getHours() + new Date().getMinutes() / 60.0,
        month_of_year: new Date().getMonth() + 1,
        context_confidence_score: 75,
        data_quality_score: 85,
        custom_context_fields: {
          trends: contextData.trends
        }
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  private async createSignalMetadata(metadata: SignalMetadataInsert) {
    const { data, error } = await this.supabase
      .from('signal_metadata')
      .insert({
        ...metadata,
        processing_time_ms: Math.floor(Math.random() * 100) + 50, // Simulated processing time
        data_sources_used: ['market_data', 'technical_indicators', 'ai_model'],
        custom_metadata: {
          generated_at: new Date().toISOString(),
          version: '1.0'
        }
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  private async calculateAndStorePerformanceMetrics(signalId: string) {
    // This would implement the logic to calculate comprehensive performance metrics
    // For now, we'll create a basic entry
    const { data, error } = await this.supabase
      .from('performance_metrics')
      .insert({
        signal_id: signalId,
        calculation_timestamp: new Date().toISOString(),
        calculation_period_days: 30,
        total_trades: 1,
        winning_trades: 0, // Will be updated later
        win_rate: 0,
        total_profit: 0,
        total_loss: 0,
        net_profit: 0,
        profit_factor: 0,
        sharpe_ratio: 0,
        max_drawdown: 0,
        consistency_score: 75,
        overall_grade: 'C',
        calculation_method: 'enhanced',
        confidence_level: 80
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  private categorizeLatency(latencyMs: number): 'fast' | 'normal' | 'slow' | 'very_slow' {
    if (latencyMs < 100) return 'fast';
    if (latencyMs < 1000) return 'normal';
    if (latencyMs < 5000) return 'slow';
    return 'very_slow';
  }
}

// Example usage
export const enhancedTradeLoggerExample = async () => {
  // Use singleton client to avoid multiple instances
  const { supabase } = require('./supabase/client');
  const logger = new EnhancedTradeLogger(supabase);

  try {
    // Example 1: Log a new trade
    const tradeResult = await logger.logCompleteTrade({
      signal: 'BUY',
      symbol: 'EURUSD',
      entry: 1.0850,
      stopLoss: 1.0800,
      takeProfit: 1.0950,
      clientId: 'client_123',
      userId: 'user_456',
      signalSource: 'ai',
      aiModelName: 'GPT-4-Trading-Model',
      aiModelVersion: 'v2.1',
      confidenceLevel: 85,
      marketRegime: 'trending',
      volatilityState: 'normal',
      sessionInfo: 'london',
      smartMoneyScore: 8.5,
      institutionalBias: 'bullish',
      trends: {
        m1: 'up',
        m5: 'up',
        m15: 'up',
        h1: 'up',
        h4: 'sideways',
        d1: 'up'
      },
      rlAgentId: 'rl_agent_v2',
      rlModelVersion: 'v1.5',
      rlConfidenceScore: 82,
      llmSentimentScore: 75,
      llmRiskAssessment: 'moderate',
      llmAnalysisText: 'Market shows strong bullish momentum with supportive technical indicators'
    });

    console.log('Trade logged successfully:', tradeResult);

    // Example 2: Log execution details
    if (tradeResult.signal) {
      const executionResult = await logger.logExecutionDetails({
        signalId: tradeResult.signal.id,
        executionPrice: 1.0852,
        executedVolume: 0.1,
        executionLatency: 150,
        slippage: 0.0002,
        commission: 0.5,
        executionVenue: 'mt5',
        ticketNumber: 123456
      });

      console.log('Execution details logged:', executionResult);
    }

    // Example 3: Get performance analytics
    const analytics = await logger.getPerformanceAnalytics({
      userId: 'user_456',
      symbol: 'EURUSD',
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString()
    });

    console.log('Performance analytics:', analytics);

    // Example 4: Get enhanced dashboard
    const dashboard = await logger.getEnhancedDashboard('user_456');
    console.log('Enhanced dashboard:', dashboard);

    // Example 5: Get market regime analysis
    const regimeAnalysis = await logger.getMarketRegimeAnalysis('EURUSD');
    console.log('Market regime analysis:', regimeAnalysis);

  } catch (error) {
    console.error('Error in enhanced trade logging example:', error);
  }
};

export default EnhancedTradeLogger;