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

interface TradeUpdatePayload {
  signal_id: string;
  symbol: string;
  status: string;
  actual_profit?: number;
  close_reason?: string;
  closed_at?: string;
  user_id?: string;
}

interface OptimizationResult {
  optimization_score: number;
  recommendations: OptimizationRecommendation[];
  parameters_updated: boolean;
  timestamp: string;
  symbol: string;
}

interface OptimizationRecommendation {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
  expected_impact: number;
  implementation_difficulty: number;
}

interface OptimizationResponse {
  success: boolean;
  message?: string;
  error?: string;
  result?: OptimizationResult;
}

interface BatchOptimizationResult {
  symbol: string;
  success: boolean;
  result?: OptimizationResult;
  skipped?: boolean;
  reason?: string;
}

class TradeOptimizationTrigger {

  /**
   * Main trigger function - called when a trade closes
   */
  static async handleTradeClosed(payload: TradeUpdatePayload): Promise<OptimizationResponse> {
    console.log(`🎯 Trade Optimization Trigger: Processing closed trade for ${payload.symbol}`);

    // 1. Validate the trade closure
    if (!await this.validateTradeClosure(payload)) {
      return { success: false, message: 'Invalid trade closure or optimization not required' };
    }

    // 2. Check if optimization is needed (based on recent activity)
    if (!await this.shouldOptimize(payload.symbol)) {
      return { success: true, message: 'Optimization not required at this time' };
    }

    // 3. Trigger the optimization
    console.log(`🚀 Triggering auto-optimization for ${payload.symbol}`);
    const optimizationResult = await this.triggerOptimization(payload.symbol);

    // 4. Update the trade with optimization metadata
    await this.updateTradeWithOptimizationData(payload.signal_id, optimizationResult);

    // 5. Send notification if significant improvements found
    await this.sendOptimizationNotification(payload, optimizationResult);

    return {
      success: true,
      symbol: payload.symbol,
      optimization_triggered: true,
      optimization_score: optimizationResult?.optimization_score,
      recommendations_count: optimizationResult?.recommendations?.length || 0,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Validate that this is a valid trade closure that should trigger optimization
   */
  private static async validateTradeClosure(payload: TradeUpdatePayload): Promise<boolean> {
    // Check if trade is actually closed
    if (payload.status !== 'closed' && payload.status !== 'executed') {
      console.log('Trade not closed, skipping optimization');
      return false;
    }

    // Check if profit data is available
    if (payload.actual_profit === null || payload.actual_profit === undefined) {
      console.log('No profit data available, skipping optimization');
      return false;
    }

    // Check if symbol is valid
    if (!payload.symbol || payload.symbol.length === 0) {
      console.log('Invalid symbol, skipping optimization');
      return false;
    }

    // Check minimum trades threshold (avoid optimization with insufficient data)
    const { count, error } = await supabase
      .from('mt5_signals')
      .select('*', { count: 'exact', head: true })
      .eq('symbol', payload.symbol)
      .in('status', ['closed', 'executed'])
      .not('actual_profit', 'is', null);

    if (error) {
      console.error('Error checking trade count:', error);
      return false;
    }

    if (!count || count < 20) {
      console.log(`Insufficient trades for ${payload.symbol}: ${count} < 20 minimum`);
      return false;
    }

    console.log(`✅ Trade closure validated for ${payload.symbol} with ${count} total trades`);
    return true;
  }

  /**
   * Determine if optimization should run based on recent activity and cooldown periods
   */
  private static async shouldOptimize(symbol: string): Promise<boolean> {
    // Check if optimization was recently run for this symbol
    const { data: recentOptimization, error } = await supabase
      .from('trading_analytics')
      .select('updated_at')
      .eq('symbol', symbol)
      .single();

    if (!error && recentOptimization?.updated_at) {
      const lastOptimization = new Date(recentOptimization.updated_at);
      const now = new Date();
      const hoursSinceOptimization = (now.getTime() - lastOptimization.getTime()) / (1000 * 60 * 60);

      // Minimum 6 hours between optimizations for the same symbol
      if (hoursSinceOptimization < 6) {
        console.log(`Optimization recently run for ${symbol} (${hoursSinceOptimization.toFixed(1)} hours ago)`);
        return false;
      }
    }

    // Check if there have been enough new trades since last optimization
    const recentTradeCount = await this.getRecentTradeCount(symbol);
    if (recentTradeCount < 5) {
      console.log(`Insufficient new trades for ${symbol}: ${recentTradeCount} < 5 minimum`);
      return false;
    }

    // Check if system is busy (avoid concurrent optimizations)
    const isSystemBusy = await this.checkSystemLoad();
    if (isSystemBusy) {
      console.log('System busy, delaying optimization');
      return false;
    }

    console.log(`✅ Optimization criteria met for ${symbol}`);
    return true;
  }

  /**
   * Get count of recent trades since last optimization
   */
  private static async getRecentTradeCount(symbol: string): Promise<number> {
    // Get timestamp of last optimization
    const { data: lastOptimization } = await supabase
      .from('trading_analytics')
      .select('updated_at')
      .eq('symbol', symbol)
      .single();

    let cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7); // Default to last 7 days

    if (lastOptimization?.updated_at) {
      cutoffDate = new Date(lastOptimization.updated_at);
    }

    const { count, error } = await supabase
      .from('mt5_signals')
      .select('*', { count: 'exact', head: true })
      .eq('symbol', symbol)
      .in('status', ['closed', 'executed'])
      .not('actual_profit', 'is', null)
      .gte('timestamp', cutoffDate.toISOString());

    if (error) {
      console.error('Error getting recent trade count:', error);
      return 0;
    }

    return count || 0;
  }

  /**
   * Check if system is under heavy load
   */
  private static async checkSystemLoad(): Promise<boolean> {
    // Check for recent optimization activity across all symbols
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const { count, error } = await supabase
      .from('trading_analytics')
      .select('*', { count: 'exact', head: true })
      .gte('updated_at', oneHourAgo.toISOString());

    if (error) {
      console.error('Error checking system load:', error);
      return false;
    }

    // If more than 5 optimizations in the last hour, consider system busy
    return (count || 0) > 5;
  }

  /**
   * Trigger the actual optimization process
   */
  private static async triggerOptimization(symbol: string): Promise<OptimizationResult | null> {
    try {
      // Call the auto-optimizer function
      const optimizerResponse = await fetch(`${supabaseUrl}/functions/v1/trading-auto-optimizer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`
        },
        body: JSON.stringify({
          symbol,
          action: 'optimize',
          trigger: 'trade_closure'
        })
      });

      if (!optimizerResponse.ok) {
        throw new Error(`Optimizer failed with status: ${optimizerResponse.status}`);
      }

      const optimizationResult = await optimizerResponse.json();
      console.log(`✅ Optimization completed for ${symbol} with score: ${optimizationResult.result?.optimization_score}`);

      return optimizationResult.result;
    } catch (error) {
      console.error('Error triggering optimization:', error);
      // Return null but don't fail the entire process
      return null;
    }
  }

  /**
   * Update the trade record with optimization metadata
   */
  private static async updateTradeWithOptimizationData(signalId: string, optimizationResult: OptimizationResult | null): Promise<void> {
    if (!optimizationResult) return;

    const optimizationMeta = {
      optimization_triggered: true,
      optimization_timestamp: new Date().toISOString(),
      optimization_score: optimizationResult.optimization_score,
      recommendations_applied: false,
      parameters_updated: false
    };

    const { error } = await supabase
      .from('mt5_signals')
      .update({
        ai_analysis: optimizationMeta
      })
      .eq('id', signalId);

    if (error) {
      console.error('Error updating trade with optimization data:', error);
    }
  }

  /**
   * Send notification if significant improvements are found
   */
  private static async sendOptimizationNotification(payload: TradeUpdatePayload, optimizationResult: OptimizationResult): Promise<void> {
    if (!optimizationResult) return;

    const { optimization_score, recommendations } = optimizationResult;

    // Only send notifications for significant findings
    if (optimization_score < 70 || !recommendations || recommendations.length === 0) {
      return;
    }

    const highPriorityRecommendations = recommendations.filter((r: OptimizationRecommendation) => r.priority === 'high');

    if (highPriorityRecommendations.length > 0) {
      console.log(`📢 High-priority recommendations found for ${payload.symbol}`);

      // Send notification to user if available
      if (payload.user_id) {
        await this.sendUserNotification(payload.user_id, payload.symbol, highPriorityRecommendations);
      }

      // Log optimization event
      await this.logOptimizationEvent(payload.symbol, optimization_score, highPriorityRecommendations);
    }
  }

  /**
   * Send notification to specific user
   */
  private static async sendUserNotification(userId: string, symbol: string, recommendations: OptimizationRecommendation[]): Promise<void> {
    const message = `
🚀 Trading Optimization Complete for ${symbol}

Optimization Score: ${recommendations[0]?.optimization_score || 'N/A'}/100
High-Priority Recommendations: ${recommendations.length}

Top Recommendations:
${recommendations.slice(0, 3).map((r, i) => `${i + 1}. ${r.title}: ${r.description}`).join('\n')}

Time: ${new Date().toLocaleString()}
    `.trim();

    // Store notification in database (you would need a notifications table)
    console.log(`Notification prepared for user ${userId}:`, message);
  }

  /**
   * Log optimization event for analytics
   */
  private static async logOptimizationEvent(symbol: string, score: number, recommendations: OptimizationRecommendation[]): Promise<void> {
    const logEntry = {
      symbol,
      optimization_score: score,
      recommendations_count: recommendations.length,
      high_priority_count: recommendations.filter((r: OptimizationRecommendation) => r.priority === 'high').length,
      trigger: 'trade_closure',
      timestamp: new Date().toISOString()
    };

    // This would typically be stored in an optimization_log table
    console.log('Optimization event logged:', logEntry);
  }

  /**
   * Batch optimization for multiple symbols (scheduled job)
   */
  static async batchOptimize(): Promise<{success: boolean; results: BatchOptimizationResult[]}> {
    console.log('🔄 Starting batch optimization for all symbols');

    // Get all symbols with sufficient trading history
    const { data: symbols, error } = await supabase
      .from('mt5_signals')
      .select('symbol')
      .in('status', ['closed', 'executed'])
      .not('actual_profit', 'is', null)

    if (error) {
      console.error('Error getting symbols for batch optimization:', error);
      return { success: false, error: error.message };
    }

    const uniqueSymbols = [...new Set(symbols.map(s => s.symbol))];
    const results = [];

    for (const symbol of uniqueSymbols) {
      try {
        // Check if optimization is needed
        if (await this.shouldOptimize(symbol)) {
          const result = await this.triggerOptimization(symbol);
          results.push({ symbol, success: true, result });

          // Small delay between optimizations to avoid system overload
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          results.push({ symbol, success: true, skipped: true, reason: 'Optimization not needed' });
        }
      } catch (error) {
        console.error(`Error optimizing ${symbol}:`, error);
        results.push({ symbol, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    const summary = {
      total_symbols: uniqueSymbols.length,
      optimized: results.filter(r => r.success && !r.skipped).length,
      skipped: results.filter(r => r.skipped).length,
      failed: results.filter(r => !r.success).length,
      average_score: results.filter(r => r.result?.optimization_score).reduce((sum, r) => sum + r.result.optimization_score, 0) /
                   results.filter(r => r.result?.optimization_score).length || 0,
      timestamp: new Date().toISOString()
    };

    console.log('✅ Batch optimization completed:', summary);
    return { success: true, summary, results };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log('📥 Trade Optimization Trigger received payload:', payload);

    let result;

    if (payload.action === 'batch_optimize') {
      // Scheduled batch optimization
      result = await TradeOptimizationTrigger.batchOptimize();
    } else {
      // Single trade optimization trigger
      const { signal_id, symbol, status, actual_profit, close_reason, closed_at, user_id } = payload;

      if (!signal_id || !symbol || !status) {
        throw new Error('Missing required fields: signal_id, symbol, status');
      }

      const tradePayload: TradeUpdatePayload = {
        signal_id,
        symbol,
        status,
        actual_profit,
        close_reason,
        closed_at,
        user_id
      };

      result = await TradeOptimizationTrigger.handleTradeClosed(tradePayload);
    }

    return new Response(JSON.stringify({
      success: true,
      result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in Trade Optimization Trigger:', error);

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