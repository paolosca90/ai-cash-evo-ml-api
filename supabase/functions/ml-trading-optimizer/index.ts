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

interface TradeData {
  symbol: string;
  signal_type: string;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  actual_profit?: number;
  pips_gained?: number;
  trade_duration_minutes?: number;
  timestamp: string;
  hour_of_day: number;
  day_of_week: number;
  market_session: string;
  confidence: number;
  actual_outcome?: string;
}

interface OptimizationResult {
  optimal_stop_loss_pips: number;
  optimal_take_profit_pips: number;
  optimal_risk_reward_ratio: number;
  best_trading_hours: number[];
  best_trading_sessions: string[];
  optimal_trade_duration_minutes: number;
  confidence_threshold: number;
  expected_win_rate: number;
  expected_profit_factor: number;
}

class MLTradingOptimizer {
  
  /**
   * Analizza i dati storici e ottimizza i parametri di trading
   */
  static async optimizeTradingParameters(symbol: string, signal_type: string): Promise<OptimizationResult> {
    console.log(`🤖 ML Optimization per ${symbol} ${signal_type}`);
    
    // 1. Carica dati storici reali
    const historicalData = await this.loadHistoricalData(symbol, signal_type);
    
    if (historicalData.length < 50) {
      console.log(`⚠️ Dati insufficienti per ${symbol} (${historicalData.length} trades). Usando defaults.`);
      return this.getDefaultParameters(symbol);
    }
    
    console.log(`📊 Analizzando ${historicalData.length} trade storici per ${symbol}`);
    
    // 2. Ottimizzazione Stop Loss & Take Profit
    const slTpOptimization = this.optimizeStopLossAndTakeProfit(historicalData);
    
    // 3. Analisi temporale
    const timeAnalysis = this.analyzeOptimalTiming(historicalData);
    
    // 4. Ottimizzazione durata trade
    const durationOptimization = this.optimizeTradeDuration(historicalData);
    
    // 5. Analisi confidence threshold
    const confidenceAnalysis = this.analyzeConfidenceThreshold(historicalData);
    
    // 6. Calcolo metriche di performance
    const performanceMetrics = this.calculatePerformanceMetrics(historicalData);
    
    const result: OptimizationResult = {
      optimal_stop_loss_pips: slTpOptimization.stop_loss_pips,
      optimal_take_profit_pips: slTpOptimization.take_profit_pips,
      optimal_risk_reward_ratio: slTpOptimization.risk_reward_ratio,
      best_trading_hours: timeAnalysis.best_hours,
      best_trading_sessions: timeAnalysis.best_sessions,
      optimal_trade_duration_minutes: durationOptimization.optimal_duration,
      confidence_threshold: confidenceAnalysis.threshold,
      expected_win_rate: performanceMetrics.win_rate,
      expected_profit_factor: performanceMetrics.profit_factor
    };
    
    // 7. Salva i risultati ottimizzati
    await this.saveOptimizationResults(symbol, signal_type, result);
    
    console.log(`✅ Ottimizzazione completata per ${symbol}:`);
    console.log(`📈 Win Rate: ${(result.expected_win_rate * 100).toFixed(1)}%`);
    console.log(`💰 Profit Factor: ${result.expected_profit_factor.toFixed(2)}`);
    console.log(`🎯 R:R Ratio: ${result.optimal_risk_reward_ratio.toFixed(2)}`);
    
    return result;
  }
  
  /**
   * Carica dati storici reali dal database
   */
  private static async loadHistoricalData(symbol: string, signal_type: string): Promise<TradeData[]> {
    const { data, error } = await supabase
      .from('mt5_signals')
      .select(`
        symbol, signal, entry, stop_loss, take_profit,
        actual_profit, pips_gained, trade_duration_minutes,
        timestamp, confidence, status, close_reason
      `)
      .eq('symbol', symbol)
      .eq('signal', signal_type)
      .in('status', ['closed', 'executed'])
      .not('actual_profit', 'is', null)
      .order('timestamp', { ascending: false })
      .limit(500);
    
    if (error) {
      console.error('Errore caricamento dati storici:', error);
      return [];
    }
    
    return data.map(trade => {
      const timestamp = new Date(trade.timestamp);
      return {
        symbol: trade.symbol,
        signal_type: trade.signal,
        entry_price: trade.entry,
        stop_loss: trade.stop_loss,
        take_profit: trade.take_profit,
        actual_profit: trade.actual_profit,
        pips_gained: trade.pips_gained,
        trade_duration_minutes: trade.trade_duration_minutes,
        timestamp: trade.timestamp,
        hour_of_day: timestamp.getHours(),
        day_of_week: timestamp.getDay(),
        market_session: this.getMarketSession(timestamp.getHours()),
        confidence: trade.confidence || 75,
        actual_outcome: trade.actual_profit > 0 ? 'WIN' : 'LOSS'
      };
    });
  }
  
  /**
   * Ottimizza Stop Loss e Take Profit usando analisi statistica
   */
  private static optimizeStopLossAndTakeProfit(data: TradeData[]): {
    stop_loss_pips: number;
    take_profit_pips: number;
    risk_reward_ratio: number;
  } {
    const winningTrades = data.filter(t => t.actual_profit! > 0);
    const losingTrades = data.filter(t => t.actual_profit! <= 0);
    
    if (winningTrades.length === 0) {
      return { stop_loss_pips: 20, take_profit_pips: 50, risk_reward_ratio: 2.5 };
    }
    
    // Analisi distribuzione pips per trade vincenti
    const winningPips = winningTrades.map(t => Math.abs(t.pips_gained || 0));
    const losingPips = losingTrades.map(t => Math.abs(t.pips_gained || 0));
    
    // Calcolo percentili per ottimizzazione
    const avgWinningPips = this.calculateMean(winningPips);
    const avgLosingPips = this.calculateMean(losingPips);
    
    // Stop Loss: 75° percentile delle perdite per limitare drawdown
    const stopLossPips = Math.max(10, this.calculatePercentile(losingPips, 75));
    
    // Take Profit: basato su media vincite + margine sicurezza
    const takeProfitPips = Math.max(stopLossPips * 1.5, avgWinningPips * 0.8);
    
    // Risk Reward ottimale
    const riskRewardRatio = takeProfitPips / stopLossPips;
    
    return {
      stop_loss_pips: Math.round(stopLossPips),
      take_profit_pips: Math.round(takeProfitPips),
      risk_reward_ratio: Number(riskRewardRatio.toFixed(2))
    };
  }
  
  /**
   * Analizza il timing ottimale per i trade
   */
  private static analyzeOptimalTiming(data: TradeData[]): {
    best_hours: number[];
    best_sessions: string[];
  } {
    // Raggruppa per ore e calcola performance
    const hourlyPerformance = new Map<number, { wins: number; losses: number; total_profit: number }>();
    const sessionPerformance = new Map<string, { wins: number; losses: number; total_profit: number }>();
    
    data.forEach(trade => {
      // Analisi oraria
      const hour = trade.hour_of_day;
      if (!hourlyPerformance.has(hour)) {
        hourlyPerformance.set(hour, { wins: 0, losses: 0, total_profit: 0 });
      }
      const hourStats = hourlyPerformance.get(hour)!;
      if (trade.actual_profit! > 0) {
        hourStats.wins++;
      } else {
        hourStats.losses++;
      }
      hourStats.total_profit += trade.actual_profit!;
      
      // Analisi sessione
      const session = trade.market_session;
      if (!sessionPerformance.has(session)) {
        sessionPerformance.set(session, { wins: 0, losses: 0, total_profit: 0 });
      }
      const sessionStats = sessionPerformance.get(session)!;
      if (trade.actual_profit! > 0) {
        sessionStats.wins++;
      } else {
        sessionStats.losses++;
      }
      sessionStats.total_profit += trade.actual_profit!;
    });
    
    // Trova le ore migliori (win rate > 60% e profit positivo)
    const bestHours: number[] = [];
    hourlyPerformance.forEach((stats, hour) => {
      const winRate = stats.wins / (stats.wins + stats.losses);
      if (winRate > 0.6 && stats.total_profit > 0 && (stats.wins + stats.losses) >= 3) {
        bestHours.push(hour);
      }
    });
    
    // Trova le sessioni migliori
    const bestSessions: string[] = [];
    sessionPerformance.forEach((stats, session) => {
      const winRate = stats.wins / (stats.wins + stats.losses);
      if (winRate > 0.55 && stats.total_profit > 0) {
        bestSessions.push(session);
      }
    });
    
    return {
      best_hours: bestHours.length > 0 ? bestHours : [8, 9, 13, 14, 15], // Default London/NY
      best_sessions: bestSessions.length > 0 ? bestSessions : ['LONDON', 'NY_OVERLAP']
    };
  }
  
  /**
   * Ottimizza la durata dei trade
   */
  private static optimizeTradeDuration(data: TradeData[]): { optimal_duration: number } {
    const tradesWithDuration = data.filter(t => t.trade_duration_minutes && t.trade_duration_minutes > 0);
    
    if (tradesWithDuration.length === 0) {
      return { optimal_duration: 240 }; // Default 4 ore
    }
    
    // Analizza profittabilità per fasce di durata
    const durationRanges = [
      { min: 0, max: 30, profits: [] as number[] },
      { min: 30, max: 60, profits: [] as number[] },
      { min: 60, max: 180, profits: [] as number[] },
      { min: 180, max: 360, profits: [] as number[] },
      { min: 360, max: 720, profits: [] as number[] },
      { min: 720, max: 1440, profits: [] as number[] }
    ];
    
    tradesWithDuration.forEach(trade => {
      const duration = trade.trade_duration_minutes!;
      const range = durationRanges.find(r => duration >= r.min && duration < r.max);
      if (range) {
        range.profits.push(trade.actual_profit!);
      }
    });
    
    // Trova la fascia con il miglior rapporto rischio/rendimento
    let bestRange = durationRanges[2]; // Default 1-3 ore
    let bestScore = -Infinity;
    
    durationRanges.forEach(range => {
      if (range.profits.length >= 5) {
        const avgProfit = this.calculateMean(range.profits);
        const winRate = range.profits.filter(p => p > 0).length / range.profits.length;
        const score = avgProfit * winRate; // Profit ponderato per win rate
        
        if (score > bestScore) {
          bestScore = score;
          bestRange = range;
        }
      }
    });
    
    // Durata ottimale = punto medio della fascia migliore
    const optimalDuration = (bestRange.min + bestRange.max) / 2;
    
    return { optimal_duration: Math.round(optimalDuration) };
  }
  
  /**
   * Analizza la soglia di confidence ottimale
   */
  private static analyzeConfidenceThreshold(data: TradeData[]): { threshold: number } {
    const confidenceRanges = [
      { min: 0, max: 60, trades: [] as TradeData[] },
      { min: 60, max: 70, trades: [] as TradeData[] },
      { min: 70, max: 80, trades: [] as TradeData[] },
      { min: 80, max: 90, trades: [] as TradeData[] },
      { min: 90, max: 100, trades: [] as TradeData[] }
    ];
    
    data.forEach(trade => {
      const range = confidenceRanges.find(r => trade.confidence >= r.min && trade.confidence < r.max);
      if (range) {
        range.trades.push(trade);
      }
    });
    
    // Trova la soglia con il miglior Sharpe ratio
    let bestThreshold = 75;
    let bestSharpe = 0;
    
    confidenceRanges.forEach(range => {
      if (range.trades.length >= 10) {
        const profits = range.trades.map(t => t.actual_profit!);
        const meanProfit = this.calculateMean(profits);
        const stdDev = this.calculateStandardDeviation(profits);
        const sharpe = stdDev > 0 ? meanProfit / stdDev : 0;
        
        if (sharpe > bestSharpe) {
          bestSharpe = sharpe;
          bestThreshold = range.min;
        }
      }
    });
    
    return { threshold: bestThreshold };
  }
  
  /**
   * Calcola metriche di performance
   */
  private static calculatePerformanceMetrics(data: TradeData[]): {
    win_rate: number;
    profit_factor: number;
  } {
    const winningTrades = data.filter(t => t.actual_profit! > 0);
    const losingTrades = data.filter(t => t.actual_profit! <= 0);
    
    const winRate = winningTrades.length / data.length;
    
    const totalWins = winningTrades.reduce((sum, t) => sum + t.actual_profit!, 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + t.actual_profit!, 0));
    
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 5.0 : 1.0;
    
    return {
      win_rate: winRate,
      profit_factor: profitFactor
    };
  }
  
  /**
   * Salva i risultati dell'ottimizzazione
   */
  private static async saveOptimizationResults(symbol: string, signal_type: string, result: OptimizationResult): Promise<void> {
    const { error } = await supabase
      .from('trading_analytics')
      .upsert({
        symbol: symbol,
        profitable_patterns: {
          signal_type,
          optimized_parameters: result,
          last_optimization: new Date().toISOString()
        }
      }, {
        onConflict: 'symbol'
      });
    
    if (error) {
      console.error('Errore salvataggio risultati:', error);
    }
  }
  
  /**
   * Parametri di default per simboli con dati insufficienti
   */
  private static getDefaultParameters(symbol: string): OptimizationResult {
    // Parametri specifici per simbolo
    const defaults: Record<string, Partial<OptimizationResult>> = {
      'EURUSD': { optimal_stop_loss_pips: 15, optimal_take_profit_pips: 40 },
      'GBPUSD': { optimal_stop_loss_pips: 20, optimal_take_profit_pips: 50 },
      'USDJPY': { optimal_stop_loss_pips: 25, optimal_take_profit_pips: 60 },
      'XAUUSD': { optimal_stop_loss_pips: 300, optimal_take_profit_pips: 800 },
      'BTCUSD': { optimal_stop_loss_pips: 500, optimal_take_profit_pips: 1200 }
    };
    
    const symbolDefaults = defaults[symbol] || defaults['EURUSD'];
    
    return {
      optimal_stop_loss_pips: symbolDefaults.optimal_stop_loss_pips || 20,
      optimal_take_profit_pips: symbolDefaults.optimal_take_profit_pips || 50,
      optimal_risk_reward_ratio: 2.5,
      best_trading_hours: [8, 9, 13, 14, 15],
      best_trading_sessions: ['LONDON', 'NY_OVERLAP'],
      optimal_trade_duration_minutes: 240,
      confidence_threshold: 75,
      expected_win_rate: 0.65,
      expected_profit_factor: 1.8
    };
  }
  
  // Utility matematiche
  private static calculateMean(numbers: number[]): number {
    return numbers.length > 0 ? numbers.reduce((a, b) => a + b, 0) / numbers.length : 0;
  }
  
  private static calculateStandardDeviation(numbers: number[]): number {
    const mean = this.calculateMean(numbers);
    const variance = numbers.reduce((sum, num) => sum + Math.pow(num - mean, 2), 0) / numbers.length;
    return Math.sqrt(variance);
  }
  
  private static calculatePercentile(numbers: number[], percentile: number): number {
    const sorted = [...numbers].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)] || 0;
  }
  
  private static getMarketSession(hour: number): string {
    if (hour >= 0 && hour < 6) return 'ASIAN';
    if (hour >= 6 && hour < 12) return 'LONDON';
    if (hour >= 12 && hour < 17) return 'NY_OVERLAP';
    if (hour >= 17 && hour < 22) return 'NY';
    return 'QUIET';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, signal_type, action = 'optimize' } = await req.json();
    
    if (!symbol || !signal_type) {
      throw new Error('symbol e signal_type sono richiesti');
    }
    
    console.log(`🚀 ML Trading Optimizer: ${action} per ${symbol} ${signal_type}`);
    
    let result;
    
    switch (action) {
      case 'optimize':
        result = await MLTradingOptimizer.optimizeTradingParameters(symbol, signal_type);
        break;
      
      default:
        throw new Error(`Azione non supportata: ${action}`);
    }
    
    return new Response(JSON.stringify({
      success: true,
      symbol,
      signal_type,
      optimization_result: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Errore ML Trading Optimizer:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});