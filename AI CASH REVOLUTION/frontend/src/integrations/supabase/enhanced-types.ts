// Enhanced TypeScript types for Central Trade Logging System
// This file extends the existing types with comprehensive metadata tracking

export type EnhancedJson =
  | string
  | number
  | boolean
  | null
  | { [key: string]: EnhancedJson | undefined }
  | EnhancedJson[]

// Enhanced MT5 Signals Table
export interface Mt5SignalsRow {
  // Original fields
  actual_profit: number | null
  ai_analysis: EnhancedJson | null
  batch_update_count: number | null
  client_id: string
  close_price: number | null
  close_reason: string | null
  closed_at: string | null
  confidence: number | null
  created_at: string
  entry: number
  execution_latency_ms: number | null
  id: string
  last_tick_timestamp: string | null
  ml_confidence_score: number | null
  opened_at: string | null
  optimized_parameters: EnhancedJson | null
  pattern_detected: string | null
  pips_gained: number | null
  risk_amount: number | null
  sent: boolean
  signal: string
  status: string | null
  stop_loss: number | null
  symbol: string
  take_profit: number | null
  timestamp: string
  trade_duration_minutes: number | null
  user_id: string | null

  // Enhanced metadata fields
  signal_metadata_id: string | null
  execution_details_id: string | null
  market_context_id: string | null
  performance_metrics_id: string | null

  // Enhanced signal information
  signal_source: 'ai' | 'rl_agent' | 'manual' | 'api' | 'ml_model'
  signal_subtype: string | null
  generation_timestamp: string | null
  signal_chain_id: string | null
  parent_signal_id: string | null

  // Market regime information
  market_regime: 'trending' | 'ranging' | 'volatile' | 'quiet' | 'breakout' | 'reversal' | 'unknown'
  volatility_state: 'low' | 'normal' | 'high' | 'extreme'
  session_info: 'asia' | 'london' | 'new_york' | 'overlap' | 'weekend' | 'unknown'
  liquidity_conditions: 'low' | 'normal' | 'high' | 'thin'

  // Smart Money Concepts
  smart_money_score: number
  order_block_proximity: number
  liquidity_pool_proximity: number
  fvg_proximity: number
  institutional_bias: 'bullish' | 'bearish' | 'neutral'

  // Multi-timeframe analysis
  m1_trend: 'up' | 'down' | 'sideways' | 'unknown'
  m5_trend: 'up' | 'down' | 'sideways' | 'unknown'
  m15_trend: 'up' | 'down' | 'sideways' | 'unknown'
  h1_trend: 'up' | 'down' | 'sideways' | 'unknown'
  h4_trend: 'up' | 'down' | 'sideways' | 'unknown'
  d1_trend: 'up' | 'down' | 'sideways' | 'unknown'

  // RL Agent information
  rl_agent_id: string | null
  rl_model_version: string | null
  rl_confidence_score: number
  rl_expected_reward: number
  rl_action_probability: number
  rl_state_representation: EnhancedJson | null

  // LLM Analysis
  llm_sentiment_score: number
  llm_risk_assessment: 'low' | 'moderate' | 'high' | 'extreme'
  llm_analysis_text: string | null
  llm_confidence_level: number

  // Partial fills and multiple legs
  is_partial_fill: boolean
  fill_percentage: number
  total_legs: number
  current_leg: number
  parent_trade_id: string | null

  // Advanced tracking
  correlation_id: string | null
  batch_id: string | null
  strategy_id: string | null
  tags: string[]
  custom_fields: EnhancedJson

  // Performance tracking fields
  peak_profit: number
  max_drawdown: number
  risk_adjusted_return: number
  sharpe_ratio: number
  profit_factor: number
  win_streak: number
  loss_streak: number

  // Trade verification fields
  current_profit: number
  current_pips: number
  last_update: string | null
  max_duration_minutes: number
  monitoring_status: 'active' | 'paused' | 'timeout' | 'error'
  retry_count: number
  last_heartbeat: string | null
}

export interface Mt5SignalsInsert {
  // Required original fields
  client_id: string
  entry: number
  signal: string
  symbol: string
  timestamp: string

  // Optional original fields
  actual_profit?: number | null
  ai_analysis?: EnhancedJson | null
  batch_update_count?: number | null
  close_price?: number | null
  close_reason?: string | null
  closed_at?: string | null
  confidence?: number | null
  created_at?: string
  execution_latency_ms?: number | null
  id?: string
  last_tick_timestamp?: string | null
  ml_confidence_score?: number | null
  opened_at?: string | null
  optimized_parameters?: EnhancedJson | null
  pattern_detected?: string | null
  pips_gained?: number | null
  risk_amount?: number | null
  sent?: boolean
  status?: string | null
  stop_loss?: number | null
  take_profit?: number | null
  trade_duration_minutes?: number | null
  user_id?: string | null

  // Optional enhanced fields
  signal_metadata_id?: string | null
  execution_details_id?: string | null
  market_context_id?: string | null
  performance_metrics_id?: string | null
  signal_source?: 'ai' | 'rl_agent' | 'manual' | 'api' | 'ml_model'
  signal_subtype?: string | null
  generation_timestamp?: string | null
  signal_chain_id?: string | null
  parent_signal_id?: string | null
  market_regime?: 'trending' | 'ranging' | 'volatile' | 'quiet' | 'breakout' | 'reversal' | 'unknown'
  volatility_state?: 'low' | 'normal' | 'high' | 'extreme'
  session_info?: 'asia' | 'london' | 'new_york' | 'overlap' | 'weekend' | 'unknown'
  liquidity_conditions?: 'low' | 'normal' | 'high' | 'thin'
  smart_money_score?: number
  order_block_proximity?: number
  liquidity_pool_proximity?: number
  fvg_proximity?: number
  institutional_bias?: 'bullish' | 'bearish' | 'neutral'
  m1_trend?: 'up' | 'down' | 'sideways' | 'unknown'
  m5_trend?: 'up' | 'down' | 'sideways' | 'unknown'
  m15_trend?: 'up' | 'down' | 'sideways' | 'unknown'
  h1_trend?: 'up' | 'down' | 'sideways' | 'unknown'
  h4_trend?: 'up' | 'down' | 'sideways' | 'unknown'
  d1_trend?: 'up' | 'down' | 'sideways' | 'unknown'
  rl_agent_id?: string | null
  rl_model_version?: string | null
  rl_confidence_score?: number
  rl_expected_reward?: number
  rl_action_probability?: number
  rl_state_representation?: EnhancedJson | null
  llm_sentiment_score?: number
  llm_risk_assessment?: 'low' | 'moderate' | 'high' | 'extreme'
  llm_analysis_text?: string | null
  llm_confidence_level?: number
  is_partial_fill?: boolean
  fill_percentage?: number
  total_legs?: number
  current_leg?: number
  parent_trade_id?: string | null
  correlation_id?: string | null
  batch_id?: string | null
  strategy_id?: string | null
  tags?: string[]
  custom_fields?: EnhancedJson
  peak_profit?: number
  max_drawdown?: number
  risk_adjusted_return?: number
  sharpe_ratio?: number
  profit_factor?: number
  win_streak?: number
  loss_streak?: number
  current_profit?: number
  current_pips?: number
  last_update?: string | null
  max_duration_minutes?: number
  monitoring_status?: 'active' | 'paused' | 'timeout' | 'error'
  retry_count?: number
  last_heartbeat?: string | null
}

export interface Mt5SignalsUpdate {
  // Optional original fields
  actual_profit?: number | null
  ai_analysis?: EnhancedJson | null
  batch_update_count?: number | null
  client_id?: string
  close_price?: number | null
  close_reason?: string | null
  closed_at?: string | null
  confidence?: number | null
  created_at?: string
  entry?: number
  execution_latency_ms?: number | null
  id?: string
  last_tick_timestamp?: string | null
  ml_confidence_score?: number | null
  opened_at?: string | null
  optimized_parameters?: EnhancedJson | null
  pattern_detected?: string | null
  pips_gained?: number | null
  risk_amount?: number | null
  sent?: boolean
  signal?: string
  status?: string | null
  stop_loss?: number | null
  symbol?: string
  take_profit?: number | null
  timestamp?: string
  trade_duration_minutes?: number | null
  user_id?: string | null

  // Optional enhanced fields
  signal_metadata_id?: string | null
  execution_details_id?: string | null
  market_context_id?: string | null
  performance_metrics_id?: string | null
  signal_source?: 'ai' | 'rl_agent' | 'manual' | 'api' | 'ml_model'
  signal_subtype?: string | null
  generation_timestamp?: string | null
  signal_chain_id?: string | null
  parent_signal_id?: string | null
  market_regime?: 'trending' | 'ranging' | 'volatile' | 'quiet' | 'breakout' | 'reversal' | 'unknown'
  volatility_state?: 'low' | 'normal' | 'high' | 'extreme'
  session_info?: 'asia' | 'london' | 'new_york' | 'overlap' | 'weekend' | 'unknown'
  liquidity_conditions?: 'low' | 'normal' | 'high' | 'thin'
  smart_money_score?: number
  order_block_proximity?: number
  liquidity_pool_proximity?: number
  fvg_proximity?: number
  institutional_bias?: 'bullish' | 'bearish' | 'neutral'
  m1_trend?: 'up' | 'down' | 'sideways' | 'unknown'
  m5_trend?: 'up' | 'down' | 'sideways' | 'unknown'
  m15_trend?: 'up' | 'down' | 'sideways' | 'unknown'
  h1_trend?: 'up' | 'down' | 'sideways' | 'unknown'
  h4_trend?: 'up' | 'down' | 'sideways' | 'unknown'
  d1_trend?: 'up' | 'down' | 'sideways' | 'unknown'
  rl_agent_id?: string | null
  rl_model_version?: string | null
  rl_confidence_score?: number
  rl_expected_reward?: number
  rl_action_probability?: number
  rl_state_representation?: EnhancedJson | null
  llm_sentiment_score?: number
  llm_risk_assessment?: 'low' | 'moderate' | 'high' | 'extreme'
  llm_analysis_text?: string | null
  llm_confidence_level?: number
  is_partial_fill?: boolean
  fill_percentage?: number
  total_legs?: number
  current_leg?: number
  parent_trade_id?: string | null
  correlation_id?: string | null
  batch_id?: string | null
  strategy_id?: string | null
  tags?: string[]
  custom_fields?: EnhancedJson
  peak_profit?: number
  max_drawdown?: number
  risk_adjusted_return?: number
  sharpe_ratio?: number
  profit_factor?: number
  win_streak?: number
  loss_streak?: number
  current_profit?: number
  current_pips?: number
  last_update?: string | null
  max_duration_minutes?: number
  monitoring_status?: 'active' | 'paused' | 'timeout' | 'error'
  retry_count?: number
  last_heartbeat?: string | null
}

// Signal Metadata Table
export interface SignalMetadataRow {
  id: string
  created_at: string
  updated_at: string
  signal_id: string
  signal_type: 'buy' | 'sell' | 'hold' | 'close_long' | 'close_short' | 'modify_stop' | 'modify_target'
  signal_category: 'trend_following' | 'mean_reversion' | 'breakout' | 'reversal' | 'momentum' | 'volatility' | 'arbitrage'
  confidence_level: number
  ai_model_name: string
  ai_model_version: string
  ai_confidence_score: number
  ai_reasoning: string | null
  ai_feature_importance: EnhancedJson
  ai_prediction_probabilities: EnhancedJson
  indicators_used: EnhancedJson
  primary_indicator: string | null
  secondary_indicators: string[]
  indicator_weights: EnhancedJson
  detected_patterns: string[]
  pattern_strength: number
  pattern_timeframes: string[]
  market_structure: 'impulse' | 'correction' | 'consolidation' | 'breakout' | 'reversal' | 'unknown'
  structure_strength: number
  higher_timeframe_trend: 'bullish' | 'bearish' | 'sideways' | 'unknown'
  lower_timeframe_trend: 'bullish' | 'bearish' | 'sideways' | 'unknown'
  volume_analysis: EnhancedJson
  volume_confirmation: boolean
  volume_strength: number
  risk_score: number
  risk_factors: string[]
  risk_category: 'low' | 'moderate' | 'high' | 'extreme'
  validation_checks: EnhancedJson
  validation_score: number
  is_validated: boolean
  validated_by: string | null
  evolution_history: EnhancedJson
  confidence_trajectory: EnhancedJson
  last_modified: string
  processing_time_ms: number
  data_sources_used: string[]
  algorithm_parameters: EnhancedJson
  custom_metadata: EnhancedJson
}

export interface SignalMetadataInsert {
  signal_id: string
  signal_type: 'buy' | 'sell' | 'hold' | 'close_long' | 'close_short' | 'modify_stop' | 'modify_target'
  signal_category: 'trend_following' | 'mean_reversion' | 'breakout' | 'reversal' | 'momentum' | 'volatility' | 'arbitrage'
  confidence_level: number
  ai_model_name: string
  ai_model_version: string
  ai_confidence_score: number
  ai_reasoning?: string | null
  ai_feature_importance?: EnhancedJson
  ai_prediction_probabilities?: EnhancedJson
  indicators_used?: EnhancedJson
  primary_indicator?: string | null
  secondary_indicators?: string[]
  indicator_weights?: EnhancedJson
  detected_patterns?: string[]
  pattern_strength?: number
  pattern_timeframes?: string[]
  market_structure?: 'impulse' | 'correction' | 'consolidation' | 'breakout' | 'reversal' | 'unknown'
  structure_strength?: number
  higher_timeframe_trend?: 'bullish' | 'bearish' | 'sideways' | 'unknown'
  lower_timeframe_trend?: 'bullish' | 'bearish' | 'sideways' | 'unknown'
  volume_analysis?: EnhancedJson
  volume_confirmation?: boolean
  volume_strength?: number
  risk_score?: number
  risk_factors?: string[]
  risk_category?: 'low' | 'moderate' | 'high' | 'extreme'
  validation_checks?: EnhancedJson
  validation_score?: number
  is_validated?: boolean
  validated_by?: string | null
  evolution_history?: EnhancedJson
  confidence_trajectory?: EnhancedJson
  last_modified?: string
  processing_time_ms?: number
  data_sources_used?: string[]
  algorithm_parameters?: EnhancedJson
  custom_metadata?: EnhancedJson
}

// Execution Details Table
export interface ExecutionDetailsRow {
  id: string
  created_at: string
  updated_at: string
  signal_id: string
  execution_id: string
  execution_status: 'pending' | 'executed' | 'partial' | 'failed' | 'cancelled' | 'rejected'
  execution_timestamp: string | null
  requested_price: number
  execution_price: number | null
  price_slippage: number
  slippage_percentage: number
  order_type: 'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop'
  execution_venue: string
  broker_id: string | null
  account_id: string | null
  ticket_number: number | null
  magic_number: number | null
  is_partial_fill: boolean
  requested_volume: number
  executed_volume: number
  remaining_volume: number
  fill_percentage: number
  fill_count: number
  fill_details: EnhancedJson
  average_fill_price: number | null
  first_fill_price: number | null
  last_fill_price: number | null
  signal_to_order_ms: number
  order_to_execution_ms: number
  total_execution_ms: number
  execution_latency_category: 'fast' | 'normal' | 'slow' | 'very_slow'
  commission: number
  spread_cost: number
  swap: number
  financing_cost: number
  total_cost: number
  execution_quality_score: number
  price_improvement: number
  market_impact: number
  liquidity_score: number
  execution_provider: string | null
  execution_algorithm: string | null
  execution_strategy: string | null
  execution_notes: string | null
  execution_error: string | null
  error_code: string | null
  error_severity: 'low' | 'medium' | 'high' | 'critical'
  recovery_action: string | null
  market_conditions_at_execution: EnhancedJson
  volatility_at_execution: number
  volume_at_execution: number
  spread_at_execution: number
  liquidity_at_execution: 'low' | 'normal' | 'high' | 'thin'
  smart_order_routing: boolean
  routing_venues: string[]
  routing_optimization: EnhancedJson
  best_execution_check: boolean
  compliance_checks: EnhancedJson
  is_compliant: boolean
  audit_trail: EnhancedJson
  reviewer_notes: string | null
  execution_efficiency: number
  cost_efficiency: number
  timing_efficiency: number
  overall_execution_rating: 'excellent' | 'good' | 'average' | 'poor' | 'failed'
  batch_execution_id: string | null
  correlation_group: string | null
  custom_execution_fields: EnhancedJson
}

// Market Context Table
export interface MarketContextRow {
  id: string
  created_at: string
  updated_at: string
  signal_id: string
  context_timestamp: string
  symbol: string
  market_regime: 'trending_up' | 'trending_down' | 'ranging' | 'volatile' | 'quiet' | 'breakout_bullish' | 'breakout_bearish' | 'reversal_bullish' | 'reversal_bearish' | 'unknown'
  regime_confidence: number
  regime_duration_minutes: number
  expected_regime_duration_minutes: number
  volatility_state: 'low' | 'normal' | 'high' | 'extreme' | 'expanding' | 'contracting'
  current_volatility: number
  average_volatility: number
  volatility_percentile: number
  atr_value: number
  atr_percentile: number
  volatility_trend: 'increasing' | 'stable' | 'decreasing'
  session_info: 'asia' | 'london' | 'new_york' | 'london_new_york_overlap' | 'asia_london_overlap' | 'weekend' | 'holiday' | 'unknown'
  session_phase: 'opening' | 'mid_session' | 'closing' | 'overlap_start' | 'overlap_end'
  session_intensity: number
  is_major_session: boolean
  session_start_time: string | null
  session_end_time: string | null
  liquidity_conditions: 'low' | 'normal' | 'high' | 'thin' | 'excess' | 'drying_up'
  liquidity_score: number
  spread_value: number
  spread_percentile: number
  depth_of_market: EnhancedJson
  liquidity_providers_count: number
  market_depth_score: number
  news_impact_level: 'none' | 'low' | 'medium' | 'high' | 'extreme'
  upcoming_high_impact_news: number
  recent_news_sentiment: number
  news_time_horizon_minutes: number
  economic_event_ids: string[]
  order_flow_imbalance: number
  tick_direction_bias: 'bullish' | 'bearish' | 'neutral'
  market_efficiency: number
  price_discovery_quality: number
  information_flow: EnhancedJson
  institutional_activity_level: 'low' | 'normal' | 'high' | 'extreme'
  institutional_net_position: 'long' | 'short' | 'neutral'
  smart_money_flow: number
  large_player_activity: boolean
  dark_pool_volume_ratio: number
  support_resistance_levels: EnhancedJson
  pivot_points: EnhancedJson
  fibonacci_levels: EnhancedJson
  market_profile: EnhancedJson
  volume_profile_analysis: EnhancedJson
  correlation_with_index: number
  correlation_with_commodities: number
  correlation_with_bonds: number
  risk_on_off_sentiment: 'risk_on' | 'risk_off' | 'neutral'
  day_of_week: number
  time_of_day: number
  month_of_year: number
  seasonal_tendency: 'bullish' | 'bearish' | 'neutral'
  cyclical_position: 'early_cycle' | 'mid_cycle' | 'late_cycle' | 'recession' | 'unknown'
  risk_appetite: 'high' | 'moderate' | 'low' | 'aversion'
  vix_level: number
  fear_greed_index: number
  safe_haven_demand: number
  systematic_risk_level: number
  geopolitical_risk_level: 'low' | 'moderate' | 'high' | 'extreme'
  major_geopolitical_events: string[]
  currency_stability: 'stable' | 'unstable' | 'crisis'
  trade_tensions: 'low' | 'normal' | 'high' | 'extreme'
  retail_sentiment: number
  institutional_sentiment: number
  analyst_consensus: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell'
  social_media_sentiment: number
  news_sentiment_score: number
  context_confidence_score: number
  data_quality_score: number
  information_timestamp: string | null
  is_real_time_data: boolean
  context_change_reason: string | null
  context_stability_duration_minutes: number
  expected_context_duration_minutes: number
  context_transition_probability: number
  context_sources: string[]
  analysis_methodology: string | null
  confidence_factors: EnhancedJson
  custom_context_fields: EnhancedJson
}

// Performance Metrics Table
export interface PerformanceMetricsRow {
  id: string
  created_at: string
  updated_at: string
  signal_id: string
  user_id: string | null
  symbol: string
  strategy_id: string | null
  calculation_timestamp: string
  calculation_period_days: number
  total_trades: number
  winning_trades: number
  losing_trades: number
  breakeven_trades: number
  win_rate: number
  loss_rate: number
  breakeven_rate: number
  total_profit: number
  total_loss: number
  net_profit: number
  gross_profit: number
  gross_loss: number
  average_win: number
  average_loss: number
  average_trade: number
  largest_win: number
  largest_loss: number
  profit_factor: number
  sharpe_ratio: number
  sortino_ratio: number
  calmar_ratio: number
  information_ratio: number
  treynor_ratio: number
  jensens_alpha: number
  beta: number
  alpha: number
  current_drawdown: number
  max_drawdown: number
  max_drawdown_duration_days: number
  avg_drawdown: number
  avg_drawdown_duration_days: number
  recovery_factor: number
  drawdown_recovery_time_days: number
  time_to_recovery_days: number
  average_trade_duration_minutes: number
  median_trade_duration_minutes: number
  min_trade_duration_minutes: number
  max_trade_duration_minutes: number
  std_trade_duration_minutes: number
  optimal_trade_duration_minutes: number
  value_at_risk_95: number
  value_at_risk_99: number
  expected_shortfall_95: number
  expected_shortfall_99: number
  downside_deviation: number
  upside_deviation: number
  semivariance: number
  semideviation: number
  current_win_streak: number
  current_loss_streak: number
  max_win_streak: number
  max_loss_streak: number
  avg_win_streak: number
  avg_loss_streak: number
  streak_vulnerability: number
  consistency_score: number
  stability_score: number
  predictability_score: number
  robustness_score: number
  performance_trend: 'improving' | 'stable' | 'declining' | 'volatile'
  overall_grade: 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D+' | 'D' | 'D-' | 'F'
  profitability_grade: 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D+' | 'D' | 'D-' | 'F'
  risk_grade: 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D+' | 'D' | 'D-' | 'F'
  consistency_grade: 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D+' | 'D' | 'D-' | 'F'
  regime_performance: EnhancedJson
  volatility_performance: EnhancedJson
  session_performance: EnhancedJson
  trend_performance: EnhancedJson
  monthly_performance: EnhancedJson
  weekly_performance: EnhancedJson
  daily_performance: EnhancedJson
  hourly_performance: EnhancedJson
  benchmark_performance: number
  relative_performance: number
  percentile_rank: number
  performance_z_score: number
  expected_return: number
  expected_risk: number
  confidence_interval_lower: number
  confidence_interval_upper: number
  prediction_accuracy: number
  model_r_squared: number
  strategy_effectiveness: number
  strategy_efficiency: number
  strategy_adaptability: number
  strategy_robustness: number
  emotional_score: number
  discipline_score: number
  patience_score: number
  risk_management_score: number
  model_accuracy: number
  model_precision: number
  model_recall: number
  model_f1_score: number
  model_calibration: number
  alpha_attribution: number
  beta_attribution: number
  selection_alpha: number
  timing_alpha: number
  attribution_factors: EnhancedJson
  stop_loss_effectiveness: number
  take_profit_effectiveness: number
  position_sizing_effectiveness: number
  risk_reward_effectiveness: number
  personal_benchmark: number
  peer_benchmark: number
  strategy_benchmark: number
  market_benchmark: number
  calculation_method: string
  data_quality_score: number
  confidence_level: number
  last_recalculation: string
  calculation_parameters: EnhancedJson
  custom_metrics: EnhancedJson
}

// View Types
export interface EnhancedTradingDashboardRow {
  user_id: string
  email: string
  total_trades: number
  winning_trades: number
  win_rate: number
  total_profit: number
  total_loss: number
  net_profit: number
  profit_factor: number
  sharpe_ratio: number
  max_drawdown: number
  overall_grade: string
  recent_trades_7d: number
  recent_win_rate_7d: number
  recent_net_profit_7d: number
  active_trades_count: number
  active_trades_profit: number
  trending_performance: number
  ranging_performance: number
  volatile_performance: number
  ai_model_accuracy: number
  ai_avg_confidence: number
  ai_model_precision: number
  avg_execution_quality: number
  avg_slippage: number
  avg_latency_ms: number
  total_strategies: number
  best_strategy: string
  best_strategy_profit: number
  last_signal_time: string
  last_trade_time: string
  signals_today: number
  trades_today: number
  current_drawdown: number
  risk_score: number
  consecutive_losses: number
  consecutive_wins: number
  calculated_at: string
}

export interface MarketRegimeAnalysisRow {
  market_regime: string
  volatility_state: string
  session_info: string
  symbol: string
  trade_count: number
  winning_trades: number
  losing_trades: number
  win_rate: number
  avg_profit: number
  total_profit: number
  profit_stddev: number
  worst_trade: number
  best_trade: number
  avg_risk: number
  avg_confidence: number
  avg_ai_confidence: number
  avg_execution_quality: number
  avg_slippage: number
  period_start: string
  period_end: string
  duration_hours: number
}

export interface SignalChainAnalysisRow {
  signal_chain_id: string
  symbol: string
  chain_start_time: string
  chain_end_time: string
  chain_length: number
  chain_total_profit: number
  chain_avg_profit: number
  chain_max_profit: number
  chain_min_profit: number
  chain_winning_trades: number
  chain_win_rate: number
  avg_confidence: number
  models_used: string
  market_regimes: string
  volatility_states: string
  duration_hours: number
  chain_efficiency: string
  profit_volatility: number
  profit_ratio: number
}

// Function Types
export interface CalculateComprehensivePerformanceMetricsParams {
  p_user_id?: string
  p_symbol?: string
  p_strategy_id?: string
  p_start_date?: string
  p_end_date?: string
}

export interface CalculateComprehensivePerformanceMetricsRow {
  total_trades: number
  winning_trades: number
  win_rate: number
  total_profit: number
  total_loss: number
  net_profit: number
  profit_factor: number
  sharpe_ratio: number
  max_drawdown: number
  average_trade: number
  largest_win: number
  largest_loss: number
  avg_win: number
  avg_loss: number
  current_drawdown: number
  recovery_factor: number
  risk_adjusted_return: number
  consistency_score: number
  overall_grade: string
}

// Enhanced Database Type Extension
export interface EnhancedDatabase extends Database {
  public: {
    Tables: {
      // Enhanced mt5_signals table
      mt5_signals: {
        Row: Mt5SignalsRow
        Insert: Mt5SignalsInsert
        Update: Mt5SignalsUpdate
        Relationships: []
      }
      // New metadata tables
      signal_metadata: {
        Row: SignalMetadataRow
        Insert: SignalMetadataInsert
        Update: Partial<SignalMetadataRow>
        Relationships: []
      }
      execution_details: {
        Row: ExecutionDetailsRow
        Insert: Partial<ExecutionDetailsRow>
        Update: Partial<ExecutionDetailsRow>
        Relationships: []
      }
      market_context: {
        Row: MarketContextRow
        Insert: Partial<MarketContextRow>
        Update: Partial<MarketContextRow>
        Relationships: []
      }
      performance_metrics: {
        Row: PerformanceMetricsRow
        Insert: Partial<PerformanceMetricsRow>
        Update: Partial<PerformanceMetricsRow>
        Relationships: []
      }
    }
    Views: {
      enhanced_trading_dashboard: {
        Row: EnhancedTradingDashboardRow
      }
      market_regime_analysis: {
        Row: MarketRegimeAnalysisRow
      }
      signal_chain_analysis: {
        Row: SignalChainAnalysisRow
      }
    }
    Functions: {
      calculate_comprehensive_performance_metrics: {
        Args: CalculateComprehensivePerformanceMetricsParams
        Returns: CalculateComprehensivePerformanceMetricsRow[]
      }
    }
  }
}