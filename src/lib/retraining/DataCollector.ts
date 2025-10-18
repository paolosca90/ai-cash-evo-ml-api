// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';
import { TradeData, FeatureVector, TrainingSample, IDataCollector } from './types';
import { UnifiedFeatureEngineer } from '@/lib/feature-engineering/UnifiedFeatureEngineer';

export class DataCollector implements IDataCollector {
  private featureEngineer: UnifiedFeatureEngineer;

  constructor() {
    this.featureEngineer = new UnifiedFeatureEngineer();
  }

  async collectTradeData(startDate: string, endDate: string): Promise<TradeData[]> {
    try {
      // Query completed trades with ML data
      const { data: trades, error } = await supabase
        .from('mt5_signals')
        .select(`
          *,
          ml_optimized_signals!left(
            feature_vector,
            confidence_score,
            win_probability,
            market_regime,
            volatility_state,
            market_session,
            rsi_normalized,
            macd_normalized,
            atr_percent_normalized,
            breakout_strength,
            trend_alignment_score,
            smart_money_score,
            institutional_bias,
            news_sentiment_score,
            news_impact_score,
            risk_reward_ratio,
            volume_ratio_normalized
          )
        `)
        .eq('status', 'closed')
        .gte('closed_at', startDate)
        .lte('closed_at', endDate)
        .not('actual_profit', 'is', null)
        .order('closed_at', { ascending: true });

      if (error) {
        throw new Error(`Failed to collect trade data: ${error.message}`);
      }

      if (!trades || trades.length === 0) {
        console.warn(`No trades found between ${startDate} and ${endDate}`);
        return [];
      }

      // Transform data to TradeData format
      const tradeData: TradeData[] = trades.map(trade => {
        const mlData = trade.ml_optimized_signals;

        return {
          id: trade.id,
          symbol: trade.symbol,
          signal: trade.signal as 'BUY' | 'SELL',
          entry: trade.entry,
          stopLoss: trade.stop_loss || 0,
          takeProfit: trade.take_profit || 0,
          timestamp: trade.timestamp,
          closedAt: trade.closed_at || undefined,
          closePrice: trade.close_price || undefined,
          actualProfit: trade.actual_profit || undefined,
          pipsGained: trade.pips_gained || undefined,
          tradeDurationMinutes: trade.trade_duration_minutes || undefined,
          confidence: trade.confidence || undefined,
          mlConfidenceScore: mlData?.confidence_score || undefined,
          featureVector: mlData?.feature_vector as Record<string, unknown> || undefined,
          marketRegime: mlData?.market_regime || undefined,
          volatilityState: mlData?.volatility_state || undefined,
          sessionInfo: mlData?.market_session || undefined,
          userId: trade.user_id || undefined,
          clientId: trade.client_id,
          aiModelVersion: trade.ai_analysis?.model_version as string || undefined,
          rlModelVersion: trade.ai_analysis?.rl_model_version as string || undefined
        };
      });

      console.log(`Collected ${tradeData.length} trades from ${startDate} to ${endDate}`);
      return tradeData;

    } catch (error) {
      console.error('Error collecting trade data:', error);
      throw error;
    }
  }

  async validateDataQuality(trades: TradeData[]): Promise<{ valid: boolean; score: number; issues: string[] }> {
    const issues: string[] = [];
    let score = 100;

    // Check minimum data requirements
    if (trades.length < 10) {
      issues.push('Insufficient number of trades for meaningful training');
      score -= 30;
    }

    // Check for missing critical data
    const missingProfit = trades.filter(t => t.actualProfit === undefined || t.actualProfit === null).length;
    if (missingProfit > 0) {
      issues.push(`${missingProfit} trades missing profit data`);
      score -= (missingProfit / trades.length) * 20;
    }

    const missingDuration = trades.filter(t => t.tradeDurationMinutes === undefined || t.tradeDurationMinutes === null).length;
    if (missingDuration > 0) {
      issues.push(`${missingDuration} trades missing duration data`);
      score -= (missingDuration / trades.length) * 10;
    }

    // Check data distribution
    const profitableTrades = trades.filter(t => t.actualProfit && t.actualProfit > 0).length;
    const winRate = profitableTrades / trades.length;

    if (winRate < 0.3 || winRate > 0.8) {
      issues.push(`Unusual win rate detected: ${(winRate * 100).toFixed(1)}%`);
      score -= 10;
    }

    // Check for extreme outliers
    const profits = trades.map(t => t.actualProfit || 0);
    const meanProfit = profits.reduce((a, b) => a + b, 0) / profits.length;
    const stdDev = Math.sqrt(profits.reduce((sum, profit) => sum + Math.pow(profit - meanProfit, 2), 0) / profits.length);

    const outliers = profits.filter(profit => Math.abs(profit - meanProfit) > 3 * stdDev).length;
    if (outliers > trades.length * 0.05) {
      issues.push(`${outliers} outlier trades detected (>3 standard deviations)`);
      score -= 15;
    }

    // Check time distribution
    const timestamps = trades.map(t => new Date(t.timestamp)).sort((a, b) => a.getTime() - b.getTime());
    const timeSpan = timestamps[timestamps.length - 1].getTime() - timestamps[0].getTime();
    const expectedSpan = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

    if (timeSpan < expectedSpan * 0.5) {
      issues.push('Insufficient time coverage in trade data');
      score -= 10;
    }

    // Check symbol distribution
    const symbolCounts = trades.reduce((acc, trade) => {
      acc[trade.symbol] = (acc[trade.symbol] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dominantSymbol = Object.entries(symbolCounts).find(([_, count]) => count > trades.length * 0.8);
    if (dominantSymbol) {
      issues.push(`Data heavily skewed towards ${dominantSymbol[0]} (${((dominantSymbol[1] / trades.length) * 100).toFixed(1)}%)`);
      score -= 10;
    }

    // Check for duplicate trades
    const duplicateIds = trades.filter((trade, index, self) =>
      self.findIndex(t => t.id === trade.id) !== index
    ).length;

    if (duplicateIds > 0) {
      issues.push(`${duplicateIds} duplicate trade IDs found`);
      score -= 20;
    }

    return {
      valid: score >= 70 && issues.length <= 3,
      score: Math.max(0, Math.min(100, score)),
      issues
    };
  }

  async generateFeatureVectors(trades: TradeData[]): Promise<TrainingSample[]> {
    const trainingSamples: TrainingSample[] = [];

    for (const trade of trades) {
      try {
        // Get market data at the time of the trade
        const marketData = await this.getMarketDataAtTimestamp(trade.timestamp, trade.symbol);

        // Generate comprehensive feature vector using the existing feature engineer
        const features = await this.featureEngineer.generateUnifiedFeatures({
          ...marketData,
          timestamp: new Date(trade.timestamp),
          symbol: trade.symbol
        });

        // Calculate reward based on trade outcome
        const reward = this.calculateReward(trade);

        // Get next state (features at trade close)
        let nextState: FeatureVector;
        if (trade.closedAt) {
          const closeMarketData = await this.getMarketDataAtTimestamp(trade.closedAt, trade.symbol);
          const closeFeatures = await this.featureEngineer.generateUnifiedFeatures({
            ...closeMarketData,
            timestamp: new Date(trade.closedAt),
            symbol: trade.symbol
          });
          nextState = this.transformToFeatureVector(closeFeatures);
        } else {
          nextState = this.transformToFeatureVector(features);
        }

        // Determine action from trade signal
        const action = this.getActionFromSignal(trade.signal);

        const sample: TrainingSample = {
          features: this.transformToFeatureVector(features),
          action,
          reward,
          next_state: nextState,
          done: trade.closedAt !== undefined,
          timestamp: trade.timestamp,
          symbol: trade.symbol,
          trade_id: trade.id
        };

        trainingSamples.push(sample);

      } catch (error) {
        console.warn(`Failed to generate features for trade ${trade.id}:`, error);
        continue;
      }
    }

    console.log(`Generated ${trainingSamples.length} training samples from ${trades.length} trades`);
    return trainingSamples;
  }

  private async getMarketDataAtTimestamp(timestamp: string, symbol: string) {
    // This would typically query your market data storage or API
    // For now, we'll use the feature vector stored with the trade if available
    // and supplement with calculated indicators

    const tradeTime = new Date(timestamp);

    // Get recent price data for technical indicators
    const lookbackPeriod = 100; // Number of periods for indicators
    const endTime = tradeTime;
    const startTime = new Date(endTime.getTime() - lookbackPeriod * 60 * 1000); // Assuming 1-minute data

    // In a real implementation, this would query your time-series database
    // For now, we'll return mock data that the feature engineer can work with
    return {
      open: 1.0800 + Math.random() * 0.01,
      high: 1.0800 + Math.random() * 0.01,
      low: 1.0800 - Math.random() * 0.01,
      close: 1.0800 + (Math.random() - 0.5) * 0.01,
      volume: 1000 + Math.random() * 5000,
      timestamp: tradeTime,
      symbol
    };
  }

  private calculateReward(trade: TradeData): number {
    if (!trade.actualProfit) return 0;

    // Normalize reward based on risk and duration
    const riskAmount = Math.abs(trade.entry - trade.stopLoss);
    const rewardRatio = trade.actualProfit / riskAmount;

    // Apply time penalty (shorter trades get higher rewards)
    const duration = trade.tradeDurationMinutes || 60;
    const timePenalty = Math.max(0.1, 1 - (duration / (24 * 60))); // Normalize to 24 hours

    // Apply confidence bonus
    const confidenceBonus = (trade.mlConfidenceScore || 50) / 100;

    // Final reward calculation
    return rewardRatio * timePenalty * confidenceBonus;
  }

  private getActionFromSignal(signal: string): number {
    switch (signal.toUpperCase()) {
      case 'BUY': return 1;
      case 'SELL': return 2;
      default: return 0; // HOLD
    }
  }

  private transformToFeatureVector(features: Record<string, unknown>): FeatureVector {
    // Transform the unified features into our standardized FeatureVector format
    return {
      // Technical indicators
      rsi: features.technical?.rsi || 50,
      macd: features.technical?.macd || 0,
      bb_position: features.technical?.bb_position || 0.5,
      atr: features.technical?.atr || 0.001,

      // Market structure
      trend_strength: features.marketStructure?.trend_strength || 0,
      volatility_rank: features.marketStructure?.volatility_rank || 0.5,
      market_regime: this.encodeMarketRegime(features.marketStructure?.market_regime || 'unknown'),

      // Time features
      day_of_week: features.temporal?.day_of_week || 0,
      hour_of_day: features.temporal?.hour_of_day || 12,
      session_bias: this.encodeSessionBias(features.temporal?.session_bias || 'neutral'),

      // Risk metrics
      risk_reward_ratio: features.riskManagement?.risk_reward_ratio || 2.0,
      position_size: features.riskManagement?.position_size || 0.01,

      // Smart money concepts
      smart_money_score: features.smartMoney?.score || 5,
      institutional_bias: this.encodeBias(features.smartMoney?.institutional_bias || 'neutral'),

      // News impact
      news_sentiment: features.news?.sentiment_score || 0,
      news_impact: features.news?.impact_score || 0,

      // Performance tracking
      win_probability: features.performance?.win_probability || 0.5,
      confidence_score: features.performance?.confidence_score || 50
    };
  }

  private encodeMarketRegime(regime: string): number {
    const regimes = ['trending_up', 'trending_down', 'ranging', 'volatile', 'unknown'];
    return regimes.indexOf(regime) / (regimes.length - 1);
  }

  private encodeSessionBias(bias: string): number {
    const biases = ['bullish', 'bearish', 'neutral'];
    return (biases.indexOf(bias) - 1) / 2; // Map to [-0.5, 0, 0.5]
  }

  private encodeBias(bias: string): number {
    const biases = ['bullish', 'bearish', 'neutral'];
    return (biases.indexOf(bias) - 1) / 2;
  }

  // Additional helper methods for data analysis
  async getTradeStatistics(trades: TradeData[]): Promise<{
    totalTrades: number;
    profitableTrades: number;
    winRate: number;
    avgProfit: number;
    totalProfit: number;
    avgDuration: number;
    profitBySymbol: Record<string, { count: number; profit: number; winRate: number }>;
    profitByHour: Record<number, { count: number; profit: number }>;
  }> {
    const stats = {
      totalTrades: trades.length,
      profitableTrades: 0,
      winRate: 0,
      avgProfit: 0,
      totalProfit: 0,
      avgDuration: 0,
      profitBySymbol: {} as Record<string, { count: number; profit: number; winRate: number }>,
      profitByHour: {} as Record<number, { count: number; profit: number }>
    };

    let totalDuration = 0;

    for (const trade of trades) {
      if (trade.actualProfit !== undefined && trade.actualProfit !== null) {
        stats.totalProfit += trade.actualProfit;
        if (trade.actualProfit > 0) {
          stats.profitableTrades++;
        }
      }

      if (trade.tradeDurationMinutes) {
        totalDuration += trade.tradeDurationMinutes;
      }

      // By symbol
      if (!stats.profitBySymbol[trade.symbol]) {
        stats.profitBySymbol[trade.symbol] = { count: 0, profit: 0, winRate: 0 };
      }
      stats.profitBySymbol[trade.symbol].count++;
      if (trade.actualProfit) {
        stats.profitBySymbol[trade.symbol].profit += trade.actualProfit;
      }

      // By hour
      const hour = new Date(trade.timestamp).getHours();
      if (!stats.profitByHour[hour]) {
        stats.profitByHour[hour] = { count: 0, profit: 0 };
      }
      stats.profitByHour[hour].count++;
      if (trade.actualProfit) {
        stats.profitByHour[hour].profit += trade.actualProfit;
      }
    }

    stats.winRate = stats.totalTrades > 0 ? stats.profitableTrades / stats.totalTrades : 0;
    stats.avgProfit = stats.totalTrades > 0 ? stats.totalProfit / stats.totalTrades : 0;
    stats.avgDuration = stats.totalTrades > 0 ? totalDuration / stats.totalTrades : 0;

    // Calculate win rates by symbol
    for (const symbol in stats.profitBySymbol) {
      const symbolStats = stats.profitBySymbol[symbol];
      const symbolTrades = trades.filter(t => t.symbol === symbol && t.actualProfit !== undefined);
      const profitableSymbolTrades = symbolTrades.filter(t => (t.actualProfit || 0) > 0);
      symbolStats.winRate = symbolTrades.length > 0 ? profitableSymbolTrades.length / symbolTrades.length : 0;
    }

    return stats;
  }
}