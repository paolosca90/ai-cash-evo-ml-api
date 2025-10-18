import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?dts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

interface PerformanceMetrics {
  symbol: string;
  signal_type: string;
  total_trades: number;
  win_rate: number;
  profit_factor: number;
  avg_profit_per_trade: number;
  max_drawdown: number;
  sharpe_ratio: number;
  best_trading_hours: number[];
  worst_trading_hours: number[];
  avg_trade_duration_minutes: number;
  ml_optimization_impact: {
    improvement_percentage: number;
    before_win_rate: number;
    after_win_rate: number;
  };
}

class MLPerformanceTracker {
  
  /**
   * Monitora le performance in tempo reale e triggera riottimizzazioni
   */
  static async trackAndOptimize(): Promise<{
    symbols_analyzed: string[];
    optimization_triggers: string[];
    performance_summary: PerformanceMetrics[];
  }> {
    console.log('🔍 Avvio monitoraggio performance ML...');
    
    // 1. Ottieni tutti i simboli attivi
    const activeSymbols = await this.getActiveSymbols();
    console.log(`📊 Analizzando ${activeSymbols.length} simboli attivi`);
    
    const optimizationTriggers: string[] = [];
    const performanceSummary: PerformanceMetrics[] = [];
    
    // 2. Analizza performance per ogni simbolo
    for (const symbol of activeSymbols) {
      for (const signalType of ['BUY', 'SELL']) {
        console.log(`🔎 Analizzando ${symbol} ${signalType}`);
        
        const metrics = await this.calculatePerformanceMetrics(symbol, signalType);
        performanceSummary.push(metrics);
        
        // 3. Verifica se serve riottimizzazione
        const needsOptimization = await this.needsOptimization(symbol, signalType, metrics);
        
        if (needsOptimization.trigger) {
          console.log(`⚠️ Trigger ottimizzazione per ${symbol} ${signalType}: ${needsOptimization.reason}`);
          optimizationTriggers.push(`${symbol}_${signalType}: ${needsOptimization.reason}`);
          
          // 4. Triggera riottimizzazione automatica
          await this.triggerReoptimization(symbol, signalType);
        }
      }
    }
    
    // 5. Aggiorna statistiche globali
    await this.updateGlobalStatistics(performanceSummary);
    
    console.log(`✅ Monitoraggio completato. ${optimizationTriggers.length} ottimizzazioni triggerate.`);
    
    return {
      symbols_analyzed: activeSymbols,
      optimization_triggers: optimizationTriggers,
      performance_summary: performanceSummary
    };
  }
  
  /**
   * Ottieni simboli con attività recente
   */
  private static async getActiveSymbols(): Promise<string[]> {
    const { data, error } = await supabase
      .from('mt5_signals')
      .select('symbol')
      .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Ultimi 7 giorni
      .not('actual_profit', 'is', null);
    
    if (error) {
      console.error('Errore caricamento simboli attivi:', error);
      return ['EURUSD', 'GBPUSD', 'USDJPY']; // Fallback
    }
    
    const uniqueSymbols = [...new Set(data.map(row => row.symbol))];
    return uniqueSymbols;
  }
  
  /**
   * Calcola metriche di performance dettagliate
   */
  private static async calculatePerformanceMetrics(symbol: string, signalType: string): Promise<PerformanceMetrics> {
    // Carica ultimi 30 giorni di trade
    const { data: recentTrades, error } = await supabase
      .from('mt5_signals')
      .select('*')
      .eq('symbol', symbol)
      .eq('signal', signalType)
      .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .not('actual_profit', 'is', null)
      .order('timestamp', { ascending: false });
    
    if (error || !recentTrades || recentTrades.length === 0) {
      return this.getEmptyMetrics(symbol, signalType);
    }
    
    // Calcoli statistici
    const totalTrades = recentTrades.length;
    const winningTrades = recentTrades.filter(t => t.actual_profit > 0);
    const losingTrades = recentTrades.filter(t => t.actual_profit <= 0);
    
    const winRate = winningTrades.length / totalTrades;
    
    const totalProfit = recentTrades.reduce((sum, t) => sum + t.actual_profit, 0);
    const totalWins = winningTrades.reduce((sum, t) => sum + t.actual_profit, 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + t.actual_profit, 0));
    
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : (totalWins > 0 ? 5.0 : 0);
    const avgProfitPerTrade = totalProfit / totalTrades;
    
    // Calcolo drawdown
    const runningProfits: number[] = [];
    let cumulativeProfit = 0;
    recentTrades.reverse().forEach(trade => {
      cumulativeProfit += trade.actual_profit;
      runningProfits.push(cumulativeProfit);
    });
    
    const peak = Math.max(...runningProfits);
    const maxDrawdown = peak - Math.min(...runningProfits.slice(runningProfits.indexOf(peak)));
    
    // Sharpe ratio (semplificato)
    const profits = recentTrades.map(t => t.actual_profit);
    const meanProfit = totalProfit / totalTrades;
    const stdDev = Math.sqrt(profits.reduce((sum, p) => sum + Math.pow(p - meanProfit, 2), 0) / totalTrades);
    const sharpeRatio = stdDev > 0 ? meanProfit / stdDev : 0;
    
    // Analisi oraria
    const hourlyPerformance = new Map<number, number>();
    recentTrades.forEach(trade => {
      const hour = new Date(trade.timestamp).getHours();
      hourlyPerformance.set(hour, (hourlyPerformance.get(hour) || 0) + trade.actual_profit);
    });
    
    const sortedHours = Array.from(hourlyPerformance.entries())
      .sort((a, b) => b[1] - a[1]);
    
    const bestHours = sortedHours.slice(0, 3).map(([hour]) => hour);
    const worstHours = sortedHours.slice(-3).map(([hour]) => hour);
    
    // Durata media trade
    const tradesWithDuration = recentTrades.filter(t => t.trade_duration_minutes);
    const avgDuration = tradesWithDuration.length > 0 
      ? tradesWithDuration.reduce((sum, t) => sum + t.trade_duration_minutes, 0) / tradesWithDuration.length
      : 240;
    
    // Impatto ottimizzazione ML (confronta con dati pre-ottimizzazione)
    const mlImpact = await this.calculateMLImpact(symbol, signalType);
    
    return {
      symbol,
      signal_type: signalType,
      total_trades: totalTrades,
      win_rate: winRate,
      profit_factor: profitFactor,
      avg_profit_per_trade: avgProfitPerTrade,
      max_drawdown: maxDrawdown,
      sharpe_ratio: sharpeRatio,
      best_trading_hours: bestHours,
      worst_trading_hours: worstHours,
      avg_trade_duration_minutes: avgDuration,
      ml_optimization_impact: mlImpact
    };
  }
  
  /**
   * Calcola l'impatto dell'ottimizzazione ML
   */
  private static async calculateMLImpact(symbol: string, signalType: string): Promise<{
    improvement_percentage: number;
    before_win_rate: number;
    after_win_rate: number;
  }> {
    // Trova data ultima ottimizzazione
    const { data: optimizationData } = await supabase
      .from('trading_analytics')
      .select('profitable_patterns')
      .eq('symbol', symbol)
      .single();
    
    if (!optimizationData?.profitable_patterns?.last_optimization) {
      return { improvement_percentage: 0, before_win_rate: 0, after_win_rate: 0 };
    }
    
    const optimizationDate = new Date(optimizationData.profitable_patterns.last_optimization);
    
    // Trade prima dell'ottimizzazione
    const { data: beforeTrades } = await supabase
      .from('mt5_signals')
      .select('actual_profit')
      .eq('symbol', symbol)
      .eq('signal', signalType)
      .lt('timestamp', optimizationDate.toISOString())
      .gte('timestamp', new Date(optimizationDate.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .not('actual_profit', 'is', null);
    
    // Trade dopo l'ottimizzazione
    const { data: afterTrades } = await supabase
      .from('mt5_signals')
      .select('actual_profit')
      .eq('symbol', symbol)
      .eq('signal', signalType)
      .gte('timestamp', optimizationDate.toISOString())
      .not('actual_profit', 'is', null);
    
    if (!beforeTrades?.length || !afterTrades?.length) {
      return { improvement_percentage: 0, before_win_rate: 0, after_win_rate: 0 };
    }
    
    const beforeWinRate = beforeTrades.filter(t => t.actual_profit > 0).length / beforeTrades.length;
    const afterWinRate = afterTrades.filter(t => t.actual_profit > 0).length / afterTrades.length;
    
    const improvement = ((afterWinRate - beforeWinRate) / beforeWinRate) * 100;
    
    return {
      improvement_percentage: improvement,
      before_win_rate: beforeWinRate,
      after_win_rate: afterWinRate
    };
  }
  
  /**
   * Verifica se è necessaria una riottimizzazione
   */
  private static async needsOptimization(symbol: string, signalType: string, metrics: PerformanceMetrics): Promise<{
    trigger: boolean;
    reason: string;
  }> {
    // Soglie per triggering ottimizzazione
    const thresholds = {
      min_trades: 20,
      min_win_rate: 0.45,
      max_drawdown: 0.15,
      min_profit_factor: 1.0,
      min_sharpe: -0.5,
      performance_decline_threshold: -10 // % declino performance
    };
    
    if (metrics.total_trades < thresholds.min_trades) {
      return { trigger: false, reason: 'Dati insufficienti' };
    }
    
    // Win rate troppo basso
    if (metrics.win_rate < thresholds.min_win_rate) {
      return { trigger: true, reason: `Win rate basso: ${(metrics.win_rate * 100).toFixed(1)}%` };
    }
    
    // Drawdown eccessivo
    if (metrics.max_drawdown > thresholds.max_drawdown) {
      return { trigger: true, reason: `Drawdown eccessivo: ${(metrics.max_drawdown * 100).toFixed(1)}%` };
    }
    
    // Profit factor insufficiente
    if (metrics.profit_factor < thresholds.min_profit_factor) {
      return { trigger: true, reason: `Profit factor basso: ${metrics.profit_factor.toFixed(2)}` };
    }
    
    // Sharpe ratio negativo
    if (metrics.sharpe_ratio < thresholds.min_sharpe) {
      return { trigger: true, reason: `Sharpe ratio negativo: ${metrics.sharpe_ratio.toFixed(2)}` };
    }
    
    // Declino performance post-ottimizzazione
    if (metrics.ml_optimization_impact.improvement_percentage < thresholds.performance_decline_threshold) {
      return { trigger: true, reason: `Declino performance: ${metrics.ml_optimization_impact.improvement_percentage.toFixed(1)}%` };
    }
    
    return { trigger: false, reason: 'Performance nella norma' };
  }
  
  /**
   * Triggera riottimizzazione automatica
   */
  private static async triggerReoptimization(symbol: string, signalType: string): Promise<void> {
    try {
      await supabase.functions.invoke('ml-trading-optimizer', {
        body: {
          symbol,
          signal_type: signalType,
          action: 'optimize'
        }
      });
      
      console.log(`✅ Riottimizzazione completata per ${symbol} ${signalType}`);
    } catch (error) {
      console.error(`❌ Errore riottimizzazione ${symbol} ${signalType}:`, error);
    }
  }
  
  /**
   * Aggiorna statistiche globali
   */
  private static async updateGlobalStatistics(metrics: PerformanceMetrics[]): Promise<void> {
    const globalStats = {
      total_symbols: new Set(metrics.map(m => m.symbol)).size,
      avg_win_rate: metrics.reduce((sum, m) => sum + m.win_rate, 0) / metrics.length,
      avg_profit_factor: metrics.reduce((sum, m) => sum + m.profit_factor, 0) / metrics.length,
      total_trades: metrics.reduce((sum, m) => sum + m.total_trades, 0),
      last_analysis: new Date().toISOString()
    };
    
    console.log(`📊 Statistiche globali: Win Rate ${(globalStats.avg_win_rate * 100).toFixed(1)}%, Profit Factor ${globalStats.avg_profit_factor.toFixed(2)}`);
  }
  
  private static getEmptyMetrics(symbol: string, signalType: string): PerformanceMetrics {
    return {
      symbol,
      signal_type: signalType,
      total_trades: 0,
      win_rate: 0,
      profit_factor: 0,
      avg_profit_per_trade: 0,
      max_drawdown: 0,
      sharpe_ratio: 0,
      best_trading_hours: [],
      worst_trading_hours: [],
      avg_trade_duration_minutes: 0,
      ml_optimization_impact: {
        improvement_percentage: 0,
        before_win_rate: 0,
        after_win_rate: 0
      }
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action = 'track' } = await req.json();
    
    console.log(`🚀 ML Performance Tracker: ${action}`);
    
    let result;
    
    switch (action) {
      case 'track':
        result = await MLPerformanceTracker.trackAndOptimize();
        break;
      
      default:
        throw new Error(`Azione non supportata: ${action}`);
    }
    
    return new Response(JSON.stringify({
      success: true,
      action,
      result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Errore ML Performance Tracker:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});