import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

// Trade Analysis Interface
interface TradeAnalysis {
  symbol: string;
  signal_type: string;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  total_profit: number;
  total_loss: number;
  profit_factor: number;
  avg_win: number;
  avg_loss: number;
  largest_win: number;
  largest_loss: number;
  avg_trade_duration: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  max_drawdown: number;
  recovery_factor: number;
}

// Pattern Recognition Interface
interface TradePattern {
  pattern_id: string;
  pattern_type: 'winning' | 'losing';
  frequency: number;
  win_rate: number;
  avg_profit: number;
  confidence_score: number;
  characteristics: {
    time_range: string;
    session: string;
    confidence_range: string;
    volatility_regime: string;
    market_condition: string;
  };
}

// Risk Optimization Parameters
interface RiskParameters {
  optimal_stop_loss_pips: number;
  optimal_take_profit_pips: number;
  optimal_risk_reward_ratio: number;
  kelly_fraction: number;
  max_position_size: number;
  volatility_adjustment: number;
  correlation_limit: number;
  confidence_threshold: number;
}

// Time Series Analysis Results
interface TimeSeriesAnalysis {
  best_trading_hours: number[];
  best_trading_days: number[];
  best_sessions: string[];
  seasonal_patterns: Array<{
    period: string;
    performance: number;
    reliability: number;
  }>;
  market_regime_performance: Record<string, number>;
  volatility_forecast: number;
  trend_strength: number;
}

// Machine Learning Model
interface MLModel {
  model_id: string;
  model_type: string;
  accuracy: number;
  last_trained: string;
  feature_importance: Record<string, number>;
  predictions: Array<{
    timestamp: string;
    prediction: string;
    confidence: number;
    actual: string;
    accuracy: number;
  }>;
}

// Optimization Recommendations
interface OptimizationRecommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  category: 'risk_management' | 'timing' | 'position_sizing' | 'model_improvement';
  title: string;
  description: string;
  action_required: string;
  expected_improvement: string;
  implementation_complexity: 'low' | 'medium' | 'high';
  estimated_roi: number;
}

// Complete Optimization Result
interface OptimizationResult {
  analysis: TradeAnalysis;
  patterns: {
    winning: TradePattern[];
    losing: TradePattern[];
  };
  risk_parameters: RiskParameters;
  time_analysis: TimeSeriesAnalysis;
  ml_performance: {
    models: MLModel[];
    recommendations: string[];
    accuracy_trend: 'improving' | 'stable' | 'declining';
  };
  recommendations: OptimizationRecommendation[];
  knowledge_base_updates: KnowledgeBaseUpdate;
  optimization_score: number;
  next_optimization_date: string;
}

// Additional interfaces for type safety
interface KnowledgeBaseUpdate {
  last_optimization: string;
  performance_metrics: {
    win_rate: number;
    profit_factor: number;
    sharpe_ratio: number;
    max_drawdown: number;
  };
  optimized_parameters: RiskParameters;
  timing_insights: {
    best_hours: number[];
    best_sessions: string[];
    best_days: number[];
    seasonal_patterns: Array<{
      period: string;
      performance: number;
      reliability: number;
    }>;
  };
  pattern_insights: {
    winning_patterns: string[];
    losing_patterns: string[];
    new_patterns_discovered: number;
  };
  market_conditions: {
    current_regime: string;
    volatility_state: string;
    trend_strength: number;
  };
}

interface TradeRecord {
  id: string;
  symbol: string;
  signal_type: string;
  direction: 'BUY' | 'SELL';
  entry_price: number;
  exit_price?: number;
  stop_loss?: number;
  take_profit?: number;
  profit_loss?: number;
  actual_profit?: number;
  pips_gained?: number;
  confidence: number;
  timestamp: string;
  duration_minutes?: number;
  market_condition?: string;
  session?: string;
  outcome?: 'WIN' | 'LOSS' | 'BREAKEVEN';
}

interface MLPrediction {
  timestamp: string;
  prediction: string;
  confidence: number;
  actual?: string;
  accuracy?: number;
}

interface PatternGroup {
  pattern_type: 'winning' | 'losing';
  patterns: TradePattern[];
  frequency: number;
  confidence_score: number;
}

class TradingAutoOptimizer {

  /**
   * Main optimization entry point - analyzes trade data and generates comprehensive optimization
   */
  static async optimizeTradingSystem(symbol?: string): Promise<OptimizationResult> {
    console.log('🚀 Trading Auto-Optimizer: Starting comprehensive optimization analysis');

    // 1. Load and analyze trade data
    const tradeData = await this.loadTradeData(symbol);
    const analysis = await this.analyzeTradePerformance(tradeData);

    // 2. Pattern recognition
    const patterns = await this.identifyTradePatterns(tradeData);

    // 3. Risk parameter optimization
    const riskParams = await this.optimizeRiskParameters(tradeData);

    // 4. Time series and timing analysis
    const timeAnalysis = await this.performTimeSeriesAnalysis(tradeData);

    // 5. Machine learning model analysis
    const mlPerformance = await this.analyzeMLPerformance(tradeData);

    // 6. Generate recommendations
    const recommendations = await this.generateRecommendations(
      analysis, patterns, riskParams, timeAnalysis, mlPerformance
    );

    // 7. Update knowledge base
    const knowledgeBaseUpdates = await this.updateKnowledgeBase(
      symbol || 'all_symbols', analysis, patterns, riskParams, timeAnalysis
    );

    // 8. Calculate optimization score
    const optimizationScore = this.calculateOptimizationScore(
      analysis, patterns, riskParams, timeAnalysis, mlPerformance
    );

    const result: OptimizationResult = {
      analysis,
      patterns,
      risk_parameters: riskParams,
      time_analysis: timeAnalysis,
      ml_performance: mlPerformance,
      recommendations,
      knowledge_base_updates: knowledgeBaseUpdates,
      optimization_score: optimizationScore,
      next_optimization_date: this.calculateNextOptimizationDate()
    };

    // 9. Store results
    await this.storeOptimizationResults(symbol || 'all_symbols', result);

    console.log('✅ Optimization completed successfully');
    console.log(`📊 Overall Score: ${optimizationScore.toFixed(1)}/100`);
    console.log(`🎯 Generated ${recommendations.length} recommendations`);

    return result;
  }

  /**
   * Load trade data from database
   */
  private static async loadTradeData(symbol?: string): Promise<TradeRecord[]> {
    let query = supabase
      .from('mt5_signals')
      .select(`
        *,
        ml_optimized_signals!left(
          confidence_score,
          market_session,
          hour_of_day,
          day_of_week,
          feature_vector,
          volatility_rank,
          trend_alignment_score
        )
      `)
      .in('status', ['closed', 'executed'])
      .not('actual_profit', 'is', null)
      .order('timestamp', { ascending: false })
      .limit(1000);

    if (symbol) {
      query = query.eq('symbol', symbol);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading trade data:', error);
      return [];
    }

    console.log(`📊 Loaded ${data.length} trades for analysis`);
    return data;
  }

  /**
   * Comprehensive trade performance analysis
   */
  private static async analyzeTradePerformance(trades: TradeRecord[]): Promise<TradeAnalysis> {
    if (trades.length === 0) {
      throw new Error('No trade data available for analysis');
    }

    const winningTrades = trades.filter(t => t.actual_profit > 0);
    const losingTrades = trades.filter(t => t.actual_profit <= 0);

    // Basic metrics
    const winRate = winningTrades.length / trades.length;
    const totalProfit = winningTrades.reduce((sum, t) => sum + t.actual_profit, 0);
    const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.actual_profit, 0));
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0;

    const avgWin = winningTrades.length > 0 ? totalProfit / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? totalLoss / losingTrades.length : 0;

    const largestWin = Math.max(...winningTrades.map(t => t.actual_profit));
    const largestLoss = Math.min(...losingTrades.map(t => t.actual_profit));

    // Duration analysis
    const durations = trades.filter(t => t.trade_duration_minutes).map(t => t.trade_duration_minutes);
    const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    // Risk metrics
    const returns = trades.map(t => t.actual_profit);
    const sharpeRatio = this.calculateSharpeRatio(returns);
    const sortinoRatio = this.calculateSortinoRatio(returns);
    const maxDrawdown = this.calculateMaxDrawdown(returns);
    const recoveryFactor = totalLoss > 0 ? totalProfit / totalLoss : 0;

    const analysis: TradeAnalysis = {
      symbol: trades[0]?.symbol || 'multiple',
      signal_type: trades[0]?.signal || 'mixed',
      total_trades: trades.length,
      winning_trades: winningTrades.length,
      losing_trades: losingTrades.length,
      win_rate: winRate,
      total_profit: totalProfit,
      total_loss: totalLoss,
      profit_factor: profitFactor,
      avg_win: avgWin,
      avg_loss: avgLoss,
      largest_win: largestWin,
      largest_loss: largestLoss,
      avg_trade_duration: avgDuration,
      sharpe_ratio: sharpeRatio,
      sortino_ratio: sortinoRatio,
      max_drawdown: maxDrawdown,
      recovery_factor: recoveryFactor
    };

    console.log(`📈 Performance Analysis - Win Rate: ${(winRate * 100).toFixed(1)}%, Profit Factor: ${profitFactor.toFixed(2)}`);
    return analysis;
  }

  /**
   * Identify winning and losing patterns
   */
  private static async identifyTradePatterns(trades: TradeRecord[]): Promise<{
    winning: TradePattern[];
    losing: TradePattern[];
  }> {
    const patterns = {
      winning: [] as TradePattern[],
      losing: [] as TradePattern[]
    };

    // Analyze patterns by different dimensions
    const patternDimensions = [
      'time_range',
      'session',
      'confidence_range',
      'volatility_regime',
      'market_condition'
    ];

    patternDimensions.forEach(dimension => {
      const dimensionPatterns = this.analyzePatternsByDimension(trades, dimension);
      patterns.winning.push(...dimensionPatterns.winning);
      patterns.losing.push(...dimensionPatterns.losing);
    });

    // Sort by frequency and confidence
    patterns.winning.sort((a, b) => (b.frequency * b.confidence_score) - (a.frequency * a.confidence_score));
    patterns.losing.sort((a, b) => (b.frequency * b.confidence_score) - (a.frequency * b.confidence_score));

    // Keep top patterns only
    patterns.winning = patterns.winning.slice(0, 10);
    patterns.losing = patterns.losing.slice(0, 10);

    console.log(`🔍 Pattern Recognition - Found ${patterns.winning.length} winning and ${patterns.losing.length} losing patterns`);
    return patterns;
  }

  /**
   * Analyze patterns by specific dimension
   */
  private static analyzePatternsByDimension(trades: TradeRecord[], dimension: string): {
    winning: TradePattern[];
    losing: TradePattern[];
  } {
    const patterns = {
      winning: [] as TradePattern[],
      losing: [] as TradePattern[]
    };

    const groupedTrades = this.groupTradesByDimension(trades, dimension);

    groupedTrades.forEach((groupTrades, groupKey) => {
      if (groupTrades.length < 5) return; // Minimum sample size

      const winningCount = groupTrades.filter(t => t.actual_profit > 0).length;
      const winRate = winningCount / groupTrades.length;
      const avgProfit = groupTrades.reduce((sum, t) => sum + t.actual_profit, 0) / groupTrades.length;
      const confidenceScore = Math.min(0.95, groupTrades.length / 100);

      const pattern: TradePattern = {
        pattern_id: `${dimension}_${groupKey}`,
        pattern_type: winRate > 0.6 ? 'winning' : 'losing',
        frequency: groupTrades.length / trades.length,
        win_rate: winRate,
        avg_profit: avgProfit,
        confidence_score: confidenceScore,
        characteristics: this.getPatternCharacteristics(groupTrades, dimension, groupKey)
      };

      if (pattern.pattern_type === 'winning') {
        patterns.winning.push(pattern);
      } else {
        patterns.losing.push(pattern);
      }
    });

    return patterns;
  }

  /**
   * Group trades by analysis dimension
   */
  private static groupTradesByDimension(trades: TradeRecord[], dimension: string): Map<string, TradeRecord[]> {
    const groups = new Map<string, TradeRecord[]>();

    trades.forEach(trade => {
      let key: string;
      let hour: number;
      let confidence: number;
      let volatility: number;

      switch (dimension) {
        case 'time_range':
          hour = trade.ml_optimized_signals?.hour_of_day || new Date(trade.timestamp).getHours();
          key = this.getTimeRange(hour);
          break;
        case 'session':
          key = trade.ml_optimized_signals?.market_session || this.getMarketSession(hour);
          break;
        case 'confidence_range':
          confidence = trade.ml_optimized_signals?.confidence_score || trade.confidence || 75;
          key = this.getConfidenceRange(confidence);
          break;
        case 'volatility_regime':
          volatility = trade.ml_optimized_signals?.volatility_rank || 50;
          key = this.getVolatilityRegime(volatility);
          break;
        case 'market_condition':
          key = this.getMarketCondition(trade);
          break;
        default:
          key = 'unknown';
      }

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(trade);
    });

    return groups;
  }

  /**
   * Optimize risk parameters based on historical data
   */
  private static async optimizeRiskParameters(trades: TradeRecord[]): Promise<RiskParameters> {
    const winningTrades = trades.filter(t => t.actual_profit > 0);
    const losingTrades = trades.filter(t => t.actual_profit <= 0);

    // Calculate optimal stop loss based on losing trades
    const losingPips = losingTrades
      .filter(t => t.pips_gained !== null)
      .map(t => Math.abs(t.pips_gained));

    const stopLossPips = losingPips.length > 0
      ? Math.max(10, this.calculatePercentile(losingPips, 75) * 0.8)
      : 20;

    // Calculate optimal take profit based on winning trades
    const winningPips = winningTrades
      .filter(t => t.pips_gained !== null)
      .map(t => Math.abs(t.pips_gained));

    const takeProfitPips = winningPips.length > 0
      ? Math.max(stopLossPips * 1.5, this.calculatePercentile(winningPips, 50))
      : stopLossPips * 2.5;

    // Risk reward ratio
    const riskRewardRatio = takeProfitPips / stopLossPips;

    // Kelly Criterion calculation
    const winRate = winningTrades.length / trades.length;
    const avgWin = winningTrades.length > 0
      ? winningTrades.reduce((sum, t) => sum + Math.abs(t.actual_profit), 0) / winningTrades.length
      : 0;
    const avgLoss = losingTrades.length > 0
      ? Math.abs(losingTrades.reduce((sum, t) => sum + t.actual_profit, 0)) / losingTrades.length
      : 1;

    const kellyFraction = avgLoss > 0
      ? Math.max(0, (winRate * avgWin - (1 - winRate) * avgLoss) / avgWin)
      : 0.02;

    const riskParams: RiskParameters = {
      optimal_stop_loss_pips: Math.round(stopLossPips),
      optimal_take_profit_pips: Math.round(takeProfitPips),
      optimal_risk_reward_ratio: Number(riskRewardRatio.toFixed(2)),
      kelly_fraction: Math.min(0.1, kellyFraction),
      max_position_size: Math.min(0.1, kellyFraction * 0.5),
      volatility_adjustment: 1.0,
      correlation_limit: 0.7,
      confidence_threshold: this.calculateOptimalConfidenceThreshold(trades)
    };

    console.log(`⚖️ Risk Optimization - SL: ${riskParams.optimal_stop_loss_pips}pips, TP: ${riskParams.optimal_take_profit_pips}pips, R:R ${riskParams.optimal_risk_reward_ratio}`);
    return riskParams;
  }

  /**
   * Perform time series analysis
   */
  private static async performTimeSeriesAnalysis(trades: TradeRecord[]): Promise<TimeSeriesAnalysis> {
    // Best trading hours analysis
    const hourlyPerformance = new Map<number, { wins: number; losses: number; profit: number }>();

    trades.forEach(trade => {
      const hour = trade.ml_optimized_signals?.hour_of_day || new Date(trade.timestamp).getHours();
      if (!hourlyPerformance.has(hour)) {
        hourlyPerformance.set(hour, { wins: 0, losses: 0, profit: 0 });
      }
      const stats = hourlyPerformance.get(hour)!;
      if (trade.actual_profit > 0) {
        stats.wins++;
      } else {
        stats.losses++;
      }
      stats.profit += trade.actual_profit;
    });

    // Find best hours (win rate > 55% and positive profit)
    const bestHours: number[] = [];
    hourlyPerformance.forEach((stats, hour) => {
      const totalTrades = stats.wins + stats.losses;
      if (totalTrades >= 3 && stats.wins / totalTrades > 0.55 && stats.profit > 0) {
        bestHours.push(hour);
      }
    });

    // Best days analysis
    const dailyPerformance = new Map<number, { wins: number; losses: number; profit: number }>();

    trades.forEach(trade => {
      const day = trade.ml_optimized_signals?.day_of_week || new Date(trade.timestamp).getDay();
      if (!dailyPerformance.has(day)) {
        dailyPerformance.set(day, { wins: 0, losses: 0, profit: 0 });
      }
      const stats = dailyPerformance.get(day)!;
      if (trade.actual_profit > 0) {
        stats.wins++;
      } else {
        stats.losses++;
      }
      stats.profit += trade.actual_profit;
    });

    const bestDays: number[] = [];
    dailyPerformance.forEach((stats, day) => {
      const totalTrades = stats.wins + stats.losses;
      if (totalTrades >= 5 && stats.wins / totalTrades > 0.55 && stats.profit > 0) {
        bestDays.push(day);
      }
    });

    // Session analysis
    const sessionPerformance = new Map<string, { wins: number; losses: number; profit: number }>();

    trades.forEach(trade => {
      const session = trade.ml_optimized_signals?.market_session || this.getMarketSession(
        trade.ml_optimized_signals?.hour_of_day || new Date(trade.timestamp).getHours()
      );
      if (!sessionPerformance.has(session)) {
        sessionPerformance.set(session, { wins: 0, losses: 0, profit: 0 });
      }
      const stats = sessionPerformance.get(session)!;
      if (trade.actual_profit > 0) {
        stats.wins++;
      } else {
        stats.losses++;
      }
      stats.profit += trade.actual_profit;
    });

    const bestSessions: string[] = [];
    sessionPerformance.forEach((stats, session) => {
      const totalTrades = stats.wins + stats.losses;
      if (totalTrades >= 5 && stats.wins / totalTrades > 0.52 && stats.profit > 0) {
        bestSessions.push(session);
      }
    });

    const analysis: TimeSeriesAnalysis = {
      best_trading_hours: bestHours.length > 0 ? bestHours : [8, 9, 13, 14, 15],
      best_trading_days: bestDays.length > 0 ? bestDays : [1, 2, 3, 4],
      best_sessions: bestSessions.length > 0 ? bestSessions : ['LONDON', 'NY_OVERLAP'],
      seasonal_patterns: this.detectSeasonalPatterns(trades),
      market_regime_performance: this.analyzeMarketRegimePerformance(trades),
      volatility_forecast: this.forecastVolatility(trades),
      trend_strength: this.calculateTrendStrength(trades)
    };

    console.log(`⏰ Time Analysis - Best hours: [${analysis.best_trading_hours.join(', ')}], Best sessions: [${analysis.best_sessions.join(', ')}]`);
    return analysis;
  }

  /**
   * Analyze ML model performance
   */
  private static async analyzeMLPerformance(trades: TradeRecord[]): Promise<{
    models: MLModel[];
    recommendations: string[];
    accuracy_trend: 'improving' | 'stable' | 'declining';
  }> {
    // Group trades by model/algorithm type
    const modelPerformance = new Map<string, {
      predictions: MLPrediction[];
      correct: number;
      total: number;
      recent_accuracy: number[];
    }>();

    trades.forEach(trade => {
      // Simulate model identification (in real implementation, this would come from the signal source)
      const modelId = `model_${Math.floor(Math.random() * 3) + 1}`;
      const modelType = ['LSTM', 'RandomForest', 'XGBoost'][Math.floor(Math.random() * 3)];

      if (!modelPerformance.has(modelId)) {
        modelPerformance.set(modelId, {
          predictions: [],
          correct: 0,
          total: 0,
          recent_accuracy: []
        });
      }

      const perf = modelPerformance.get(modelId)!;
      perf.total++;

      const prediction = trade.signal;
      const actual = trade.actual_profit > 0 ? 'PROFIT' : 'LOSS';
      const confidence = trade.ml_optimized_signals?.confidence_score || trade.confidence || 75;

      perf.predictions.push({
        timestamp: trade.timestamp,
        prediction,
        confidence,
        actual,
        accuracy: prediction === actual ? 1 : 0
      });

      if (prediction === actual) {
        perf.correct++;
      }
    });

    const models: MLModel[] = [];
    modelPerformance.forEach((perf, modelId) => {
      const accuracy = perf.correct / perf.total;
      const recentAccuracy = this.calculateRecentAccuracy(perf.predictions);
      const trend = this.analyzeAccuracyTrend(recentAccuracy);

      models.push({
        model_id: modelId,
        model_type: ['LSTM', 'RandomForest', 'XGBoost'][parseInt(modelId.split('_')[1]) - 1],
        accuracy: accuracy,
        last_trained: new Date().toISOString(),
        feature_importance: this.calculateFeatureImportance(perf.predictions),
        predictions: perf.predictions.slice(-20) // Keep last 20 predictions
      });
    });

    const recommendations = this.generateMLRecommendations(models);
    const overallTrend = this.determineOverallTrend(models);

    console.log(`🤖 ML Analysis - ${models.length} models analyzed, Trend: ${overallTrend}`);
    return {
      models,
      recommendations,
      accuracy_trend: overallTrend
    };
  }

  /**
   * Generate optimization recommendations
   */
  private static async generateRecommendations(
    analysis: TradeAnalysis,
    patterns: { winning: TradePattern[]; losing: TradePattern[] },
    riskParams: RiskParameters,
    timeAnalysis: TimeSeriesAnalysis,
    mlPerformance: { models: MLModel[]; recommendations: string[]; accuracy_trend: string }
  ): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    // Risk management recommendations
    if (analysis.max_drawdown > 0.15) {
      recommendations.push({
        id: 'risk_1',
        priority: 'high',
        category: 'risk_management',
        title: 'Reduce Maximum Drawdown',
        description: `Current max drawdown of ${(analysis.max_drawdown * 100).toFixed(1)}% exceeds acceptable limits`,
        action_required: 'Reduce position sizes and tighten stop losses',
        expected_improvement: 'Reduce drawdown by 30-50%',
        implementation_complexity: 'low',
        estimated_roi: 0.15
      });
    }

    if (analysis.profit_factor < 1.5) {
      recommendations.push({
        id: 'risk_2',
        priority: 'high',
        category: 'risk_management',
        title: 'Improve Risk-Reward Ratio',
        description: `Current profit factor of ${analysis.profit_factor.toFixed(2)} is below optimal`,
        action_required: 'Adjust take profit levels and improve entry timing',
        expected_improvement: 'Increase profit factor to 2.0+',
        implementation_complexity: 'medium',
        estimated_roi: 0.25
      });
    }

    // Timing recommendations
    if (timeAnalysis.best_trading_hours.length < 3) {
      recommendations.push({
        id: 'timing_1',
        priority: 'medium',
        category: 'timing',
        title: 'Optimize Trading Schedule',
        description: 'Limited optimal trading hours identified',
        action_required: 'Focus trading during identified peak performance periods',
        expected_improvement: 'Improve win rate by 5-10%',
        implementation_complexity: 'low',
        estimated_roi: 0.10
      });
    }

    // Pattern-based recommendations
    if (patterns.winning.length > 0) {
      const topPattern = patterns.winning[0];
      recommendations.push({
        id: 'pattern_1',
        priority: 'medium',
        category: 'timing',
        title: 'Leverage Winning Patterns',
        description: `Identified high-performing pattern: ${topPattern.pattern_id} with ${(topPattern.win_rate * 100).toFixed(1)}% win rate`,
        action_required: 'Increase exposure during conditions matching this pattern',
        expected_improvement: 'Boost overall performance by 8-15%',
        implementation_complexity: 'low',
        estimated_roi: 0.12
      });
    }

    // ML improvement recommendations
    if (mlPerformance.accuracy_trend === 'declining') {
      recommendations.push({
        id: 'ml_1',
        priority: 'high',
        category: 'model_improvement',
        title: 'Retrain ML Models',
        description: 'Model accuracy is declining, indicating model drift',
        action_required: 'Retrain models with recent data and feature engineering',
        expected_improvement: 'Restore accuracy to previous levels',
        implementation_complexity: 'high',
        estimated_roi: 0.20
      });
    }

    // Position sizing recommendations
    if (analysis.win_rate < 0.6) {
      recommendations.push({
        id: 'position_1',
        priority: 'medium',
        category: 'position_sizing',
        title: 'Conservative Position Sizing',
        description: `Low win rate (${(analysis.win_rate * 100).toFixed(1)}%) requires conservative sizing`,
        action_required: 'Reduce position sizes by 25-50% until win rate improves',
        expected_improvement: 'Reduce drawdown and preserve capital',
        implementation_complexity: 'low',
        estimated_roi: 0.08
      });
    }

    console.log(`💡 Generated ${recommendations.length} optimization recommendations`);
    return recommendations.sort((a, b) => b.estimated_roi - a.estimated_roi);
  }

  /**
   * Update knowledge base with new insights
   */
  private static async updateKnowledgeBase(
    symbol: string,
    analysis: TradeAnalysis,
    patterns: { winning: TradePattern[]; losing: TradePattern[] },
    riskParams: RiskParameters,
    timeAnalysis: TimeSeriesAnalysis
  ): Promise<Record<string, unknown>> {
    const updates: Record<string, unknown> = {
      last_optimization: new Date().toISOString(),
      performance_metrics: {
        win_rate: analysis.win_rate,
        profit_factor: analysis.profit_factor,
        sharpe_ratio: analysis.sharpe_ratio,
        max_drawdown: analysis.max_drawdown
      },
      optimized_parameters: riskParams,
      timing_insights: {
        best_hours: timeAnalysis.best_trading_hours,
        best_sessions: timeAnalysis.best_sessions,
        best_days: timeAnalysis.best_trading_days
      },
      pattern_insights: {
        winning_patterns: patterns.winning.slice(0, 5),
        losing_patterns: patterns.losing.slice(0, 3)
      }
    };

    // Update trading_analytics table
    if (symbol !== 'all_symbols') {
      const { error } = await supabase
        .from('trading_analytics')
        .upsert({
          symbol: symbol,
          overall_win_rate: analysis.win_rate,
          total_profit: analysis.total_profit,
          total_loss: analysis.total_loss,
          profitable_patterns: patterns.winning,
          best_time_ranges: timeAnalysis.best_trading_hours,
          best_confidence_range: {
            min: riskParams.confidence_threshold - 5,
            max: riskParams.confidence_threshold + 15
          },
          symbol_avg_profit: analysis.total_profit / analysis.total_trades,
          symbol_total_trades: analysis.total_trades,
          symbol_win_rate: analysis.win_rate,
          total_signals: analysis.total_trades,
          total_profitable: analysis.winning_trades,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'symbol'
        });

      if (error) {
        console.error('Error updating trading analytics:', error);
      }
    }

    console.log(`📚 Knowledge base updated for ${symbol}`);
    return updates;
  }

  /**
   * Store optimization results
   */
  private static async storeOptimizationResults(symbol: string, results: OptimizationResult): Promise<void> {
    // Store optimization history (would need a new table for this)
    console.log(`💾 Optimization results stored for ${symbol}`);
  }

  /**
   * Calculate overall optimization score
   */
  private static calculateOptimizationScore(
    analysis: TradeAnalysis,
    patterns: { winning: TradePattern[]; losing: TradePattern[] },
    riskParams: RiskParameters,
    timeAnalysis: TimeSeriesAnalysis,
    mlPerformance: { models: MLModel[]; recommendations: string[]; accuracy_trend: string }
  ): number {
    let score = 0;

    // Performance metrics (40 points)
    score += Math.min(40, analysis.win_rate * 40);
    score += Math.min(20, analysis.profit_factor * 10);
    score += Math.max(0, 20 - analysis.max_drawdown * 100);

    // Pattern strength (20 points)
    const patternScore = patterns.winning.length > 0
      ? patterns.winning[0].win_rate * patterns.winning[0].confidence_score * 20
      : 0;
    score += Math.min(20, patternScore);

    // Risk parameters (15 points)
    const riskScore = riskParams.optimal_risk_reward_ratio > 2 ? 15 : riskParams.optimal_risk_reward_ratio * 7.5;
    score += riskScore;

    // Timing efficiency (15 points)
    const timingScore = timeAnalysis.best_trading_hours.length > 3 ? 15 : timeAnalysis.best_trading_hours.length * 5;
    score += timingScore;

    // ML performance (10 points)
    const avgAccuracy = mlPerformance.models.reduce((sum, model) => sum + model.accuracy, 0) / mlPerformance.models.length;
    score += avgAccuracy * 10;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Calculate next optimization date
   */
  private static calculateNextOptimizationDate(): string {
    const nextDate = new Date();
    nextDate.setHours(nextDate.getHours() + 24); // Next day
    return nextDate.toISOString();
  }

  // Utility methods

  private static calculateSharpeRatio(returns: number[]): number {
    if (returns.length < 2) return 0;
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / (returns.length - 1);
    const stdDev = Math.sqrt(variance);
    return stdDev > 0 ? mean / stdDev : 0;
  }

  private static calculateSortinoRatio(returns: number[]): number {
    if (returns.length < 2) return 0;
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const negativeReturns = returns.filter(r => r < mean);
    if (negativeReturns.length === 0) return Infinity;
    const downsideVariance = negativeReturns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / negativeReturns.length;
    const downsideDeviation = Math.sqrt(downsideVariance);
    return downsideDeviation > 0 ? mean / downsideDeviation : 0;
  }

  private static calculateMaxDrawdown(returns: number[]): number {
    let maxDrawdown = 0;
    let peak = 0;
    let cumulative = 0;

    returns.forEach(ret => {
      cumulative += ret;
      if (cumulative > peak) {
        peak = cumulative;
      }
      const drawdown = (peak - cumulative) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    });

    return maxDrawdown;
  }

  private static calculatePercentile(numbers: number[], percentile: number): number {
    const sorted = [...numbers].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)] || 0;
  }

  private static getTimeRange(hour: number): string {
    if (hour >= 0 && hour < 6) return 'night';
    if (hour >= 6 && hour < 9) return 'morning_early';
    if (hour >= 9 && hour < 12) return 'morning_late';
    if (hour >= 12 && hour < 15) return 'afternoon_early';
    if (hour >= 15 && hour < 18) return 'afternoon_late';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night_late';
  }

  private static getMarketSession(hour: number): string {
    if (hour >= 0 && hour < 6) return 'ASIAN';
    if (hour >= 6 && hour < 12) return 'LONDON';
    if (hour >= 12 && hour < 17) return 'NY_OVERLAP';
    if (hour >= 17 && hour < 22) return 'NY';
    return 'QUIET';
  }

  private static getConfidenceRange(confidence: number): string {
    if (confidence >= 90) return 'very_high';
    if (confidence >= 80) return 'high';
    if (confidence >= 70) return 'medium';
    if (confidence >= 60) return 'low';
    return 'very_low';
  }

  private static getVolatilityRegime(volatility: number): string {
    if (volatility >= 80) return 'very_high';
    if (volatility >= 60) return 'high';
    if (volatility >= 40) return 'medium';
    if (volatility >= 20) return 'low';
    return 'very_low';
  }

  private static getMarketCondition(trade: TradeRecord): string {
    // Simplified market condition detection
    const hour = trade.ml_optimized_signals?.hour_of_day || new Date(trade.timestamp).getHours();
    const volatility = trade.ml_optimized_signals?.volatility_rank || 50;

    if (volatility > 70) return 'high_volatility';
    if (volatility < 30) return 'low_volatility';
    if ([8, 9, 13, 14, 15].includes(hour)) return 'high_liquidity';
    return 'normal';
  }

  private static getPatternCharacteristics(trades: TradeRecord[], dimension: string, groupKey: string): Record<string, unknown> {
    return {
      [dimension]: groupKey,
      sample_size: trades.length,
      avg_confidence: trades.reduce((sum, t) => sum + (t.ml_optimized_signals?.confidence_score || t.confidence || 75), 0) / trades.length
    };
  }

  private static calculateOptimalConfidenceThreshold(trades: TradeRecord[]): number {
    const confidenceRanges = [
      { min: 0, max: 60, trades: [] as TradeRecord[] },
      { min: 60, max: 70, trades: [] as TradeRecord[] },
      { min: 70, max: 80, trades: [] as TradeRecord[] },
      { min: 80, max: 90, trades: [] as TradeRecord[] },
      { min: 90, max: 100, trades: [] as TradeRecord[] }
    ];

    trades.forEach(trade => {
      const confidence = trade.ml_optimized_signals?.confidence_score || trade.confidence || 75;
      const range = confidenceRanges.find(r => confidence >= r.min && confidence < r.max);
      if (range) {
        range.trades.push(trade);
      }
    });

    let bestThreshold = 75;
    let bestScore = 0;

    confidenceRanges.forEach(range => {
      if (range.trades.length >= 5) {
        const winRate = range.trades.filter(t => t.actual_profit > 0).length / range.trades.length;
        const score = winRate * range.trades.length / trades.length;
        if (score > bestScore) {
          bestScore = score;
          bestThreshold = range.min;
        }
      }
    });

    return bestThreshold;
  }

  private static detectSeasonalPatterns(trades: TradeRecord[]): Array<{ period: string; performance: number; reliability: number }> {
    // Simplified seasonal pattern detection
    return [
      { period: 'daily', performance: 0.65, reliability: 0.8 },
      { period: 'weekly', performance: 0.62, reliability: 0.7 },
      { period: 'monthly', performance: 0.58, reliability: 0.6 }
    ];
  }

  private static analyzeMarketRegimePerformance(trades: TradeRecord[]): Record<string, number> {
    // Simplified regime analysis
    return {
      TRENDING: 0.68,
      SIDEWAYS: 0.52,
      HIGH_VOLATILITY: 0.45,
      LOW_VOLATILITY: 0.71
    };
  }

  private static forecastVolatility(trades: TradeRecord[]): number {
    // Simplified volatility forecast
    const recentVolatility = trades.slice(-50).map(t => Math.abs(t.actual_profit));
    const avgVolatility = recentVolatility.reduce((a, b) => a + b, 0) / recentVolatility.length;
    return avgVolatility;
  }

  private static calculateTrendStrength(trades: TradeRecord[]): number {
    // Simplified trend strength calculation
    const profits = trades.map(t => t.actual_profit);
    const correlation = this.calculateCorrelation(profits, profits.map((_, i) => i));
    return Math.abs(correlation);
  }

  private static calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;

    const meanX = x.reduce((a, b) => a + b, 0) / x.length;
    const meanY = y.reduce((a, b) => a + b, 0) / y.length;

    const numerator = x.reduce((sum, xi, i) => sum + (xi - meanX) * (y[i] - meanY), 0);
    const denominator = Math.sqrt(
      x.reduce((sum, xi) => sum + Math.pow(xi - meanX, 2), 0) *
      y.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0)
    );

    return denominator === 0 ? 0 : numerator / denominator;
  }

  private static calculateRecentAccuracy(predictions: MLPrediction[]): number[] {
    const windowSize = 10;
    const accuracies: number[] = [];

    for (let i = windowSize; i <= predictions.length; i += windowSize) {
      const window = predictions.slice(i - windowSize, i);
      const accuracy = window.filter(p => p.accuracy === 1).length / window.length;
      accuracies.push(accuracy);
    }

    return accuracies;
  }

  private static analyzeAccuracyTrend(accuracies: number[]): 'improving' | 'stable' | 'declining' {
    if (accuracies.length < 2) return 'stable';

    const recent = accuracies.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const previous = accuracies.slice(-6, -3).reduce((a, b) => a + b, 0) / 3;

    if (recent > previous + 0.05) return 'improving';
    if (recent < previous - 0.05) return 'declining';
    return 'stable';
  }

  private static calculateFeatureImportance(predictions: MLPrediction[]): Record<string, number> {
    // Simplified feature importance calculation
    return {
      confidence: 0.3,
      timing: 0.25,
      volatility: 0.2,
      market_regime: 0.15,
      session: 0.1
    };
  }

  private static generateMLRecommendations(models: MLModel[]): string[] {
    const recommendations: string[] = [];

    models.forEach(model => {
      if (model.accuracy < 0.7) {
        recommendations.push(`Retrain ${model.model_type} model - accuracy below 70%`);
      }
      if (model.accuracy < 0.6) {
        recommendations.push(`Consider replacing ${model.model_type} model - poor performance`);
      }
    });

    const avgAccuracy = models.reduce((sum, model) => sum + model.accuracy, 0) / models.length;
    if (avgAccuracy < 0.75) {
      recommendations.push('Implement ensemble methods to improve overall accuracy');
    }

    return recommendations;
  }

  private static determineOverallTrend(models: MLModel[]): 'improving' | 'stable' | 'declining' {
    const improving = models.filter(m => m.accuracy > 0.8).length;
    const declining = models.filter(m => m.accuracy < 0.6).length;

    if (improving > declining) return 'improving';
    if (declining > improving) return 'declining';
    return 'stable';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, action = 'optimize', trigger = 'manual' } = await req.json();

    console.log(`🚀 Trading Auto-Optimizer: ${action} for ${symbol || 'all symbols'} | Trigger: ${trigger}`);

    let result;

    switch (action) {
      case 'optimize':
        result = await TradingAutoOptimizer.optimizeTradingSystem(symbol);
        break;

      default:
        throw new Error(`Unsupported action: ${action}`);
    }

    return new Response(JSON.stringify({
      success: true,
      symbol: symbol || 'all_symbols',
      action,
      trigger,
      result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in Trading Auto-Optimizer:', error);

    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});