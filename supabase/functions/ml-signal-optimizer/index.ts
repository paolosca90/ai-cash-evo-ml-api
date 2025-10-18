import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?dts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

interface TechnicalIndicators {
  rsi: number;
  macd: number;
  atrPercent: number;
}

interface SmartMoneyData {
  institutionalBias: string;
  sessionBias: string;
  choc: boolean;
  bos: boolean;
  liquiditySwept: boolean;
}

interface MultiTimeframeData {
  m15: { trend: string };
  m5: { area: string };
  m1: { entry: string };
}

interface NewsAnalysisData {
  sentiment: number;
  impactScore: number;
  relevantCount: number;
}

interface SessionData {
  initialBalance: { high: number; low: number };
}

interface ScoringData {
  trend: number;
  smartMoney: number;
  news: number;
  overall: number;
}

interface RawSignalAnalysis {
  indicators: TechnicalIndicators;
  smartMoney: SmartMoneyData;
  multiTimeframe: MultiTimeframeData;
  newsAnalysis: NewsAnalysisData;
  sessionData: SessionData;
  scoring: ScoringData;
}

interface RawSignalData {
  symbol: string;
  signal: string;
  timestamp: string;
  confidence: number;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  analysis: RawSignalAnalysis;
  risk_reward?: number;
}

interface OptimizedSignal {
  signal_id: string;
  symbol: string;
  signal_type: string;
  timestamp: string;
  market_session: string;
  is_news_time: boolean;
  time_to_major_news: number;
  technical_features: number[];
  smart_money_features: number[];
  mtf_alignment: number;
  news_sentiment: number;
  news_impact: number;
  price_action_features: number[];
  win_probability: number;
  feature_vector: number[];
  overall_score: number;
  ml_ready: boolean;
}

interface NewsEvent {
  timestamp: string;
  impact: number;
}

class MLSignalOptimizer {
  
  /**
   * Ottimizza e normalizza i segnali per machine learning
   */
  static async optimizeSignalForML(rawSignal: RawSignalData, signalId: string): Promise<OptimizedSignal> {
    console.log(`🤖 Ottimizzazione ML per segnale: ${rawSignal.symbol} ${rawSignal.signal}`);
    
    // 1. TIMING FEATURES
    const timestamp = new Date(rawSignal.timestamp);
    const { marketSession, isNewsTime, timeToMajorNews } = await this.analyzeTimingFeatures(timestamp, rawSignal.symbol);
    
    // 2. NORMALIZZAZIONE INDICATORI TECNICI (0-1)
    const technicalFeatures = this.normalizeTechnicalIndicators(rawSignal.analysis.indicators);
    
    // 3. SMART MONEY FEATURES  
    const smartMoneyFeatures = this.extractSmartMoneyFeatures(rawSignal.analysis.smartMoney);
    
    // 4. MULTI-TIMEFRAME ALIGNMENT
    const mtfAlignment = this.calculateMultiTimeframeAlignment(rawSignal.analysis.multiTimeframe);
    
    // 5. NEWS SENTIMENT NORMALIZATION
    const newsFeatures = this.normalizeNewsFeatures(rawSignal.analysis.newsAnalysis);
    
    // 6. PRICE ACTION CONTEXT
    const priceActionFeatures = this.calculatePriceActionFeatures(rawSignal);
    
    // 7. CALCOLA WIN PROBABILITY BASATA SU STORICO
    const winProbability = await this.calculateWinProbability(rawSignal);
    
    // 8. BUILD FEATURE VECTOR
    const featureVector = this.buildFeatureVector(rawSignal);
    
    // 9. CREA RECORD OTTIMIZZATO
    const optimizedSignal = {
      signal_id: signalId,
      symbol: rawSignal.symbol,
      signal_type: rawSignal.signal,
      timestamp: rawSignal.timestamp,
      
      // Timing features
      market_session: marketSession,
      hour_of_day: timestamp.getHours(),
      day_of_week: timestamp.getDay(),
      is_news_time: isNewsTime,
      time_to_major_news_minutes: timeToMajorNews,
      
      // Technical features (normalized)
      rsi_normalized: technicalFeatures.rsi,
      macd_normalized: technicalFeatures.macd,
      atr_percent_normalized: technicalFeatures.atrPercent,
      volume_ratio_normalized: technicalFeatures.volumeRatio,
      volatility_rank: technicalFeatures.volatilityRank,
      
      // Smart Money features
      institutional_bias: smartMoneyFeatures.institutionalBias,
      session_bias: smartMoneyFeatures.sessionBias,
      has_choc: smartMoneyFeatures.hasChoc,
      has_bos: smartMoneyFeatures.hasBos,
      liquidity_swept: smartMoneyFeatures.liquiditySwept,
      market_structure_score: smartMoneyFeatures.structureScore,
      
      // Multi-timeframe features
      m15_trend: mtfAlignment.m15Trend,
      m5_area: mtfAlignment.m5Area,
      m1_entry_quality: mtfAlignment.entryQuality,
      trend_alignment_score: mtfAlignment.alignmentScore,
      
      // News features
      news_sentiment_score: newsFeatures.sentimentScore,
      news_impact_score: newsFeatures.impactScore,
      relevant_news_count: newsFeatures.relevantCount,
      
      // Price action features
      price_position_in_range: priceActionFeatures.positionInRange,
      distance_from_support: priceActionFeatures.distanceFromSupport,
      distance_from_resistance: priceActionFeatures.distanceFromResistance,
      breakout_strength: priceActionFeatures.breakoutStrength,
      
      // Risk metrics
      risk_reward_ratio: rawSignal.risk_reward || 1.0,
      confidence_score: rawSignal.confidence / 100.0, // Normalize to 0-1
      win_probability: winProbability,
      
      // ML Feature vector
      feature_vector: featureVector,
      
      // Outcome (inizialmente PENDING)
      actual_outcome: 'PENDING'
    };
    
    console.log(`✅ Segnale ottimizzato per ML con ${Object.keys(featureVector).length} features`);
    return optimizedSignal;
  }
  
  /**
   * Analizza le caratteristiche temporali del segnale
   */
  private static async analyzeTimingFeatures(timestamp: Date, symbol: string) {
    const hour = timestamp.getHours();
    
    // Determina sessione di mercato (UTC)
    let marketSession = 'ASIAN';
    if (hour >= 7 && hour < 12) marketSession = 'LONDON';
    else if (hour >= 12 && hour < 20) marketSession = 'NY';
    else if (hour >= 8 && hour < 12) marketSession = 'OVERLAP'; // London-NY overlap
    
    // Controlla se è vicino a news importanti
    const { data: upcomingNews } = await supabase
      .from('economic_events')
      .select('*')
      .eq('currency', symbol.substring(0, 3))
      .gte('date', timestamp.toISOString().split('T')[0])
      .gte('importance', 2)
      .limit(3);
    
    const isNewsTime = upcomingNews && upcomingNews.length > 0;
    const timeToMajorNews = isNewsTime ? this.calculateTimeToNews(timestamp, upcomingNews[0]) : null;
    
    return { marketSession, isNewsTime, timeToMajorNews };
  }
  
  /**
   * Normalizza gli indicatori tecnici tra 0 e 1
   */
  private static normalizeTechnicalIndicators(indicators: TechnicalIndicators) {
    return {
      rsi: Math.max(0, Math.min(1, indicators.rsi / 100)), // RSI già 0-100
      macd: this.normalizeMACD(indicators.macd), // MACD può essere negativo
      atrPercent: Math.max(0, Math.min(1, indicators.atrPercent / 5)), // Normalizza ATR% assumendo max 5%
      volumeRatio: 0.5, // Placeholder - richiede dati volume storici
      volatilityRank: Math.max(0, Math.min(1, indicators.atrPercent / 3)) // Rank volatilità
    };
  }
  
  /**
   * Estrae features smart money
   */
  private static extractSmartMoneyFeatures(smartMoney: SmartMoneyData) {
    // Calcola score struttura mercato basato su CHOC/BOS
    let structureScore = 0.5; // Neutrale
    if (smartMoney.choc) structureScore += 0.3;
    if (smartMoney.bos) structureScore += 0.2;
    if (smartMoney.liquiditySwept) structureScore += 0.1;
    
    return {
      institutionalBias: smartMoney.institutionalBias || 'NEUTRAL',
      sessionBias: smartMoney.sessionBias || 'NEUTRAL',
      hasChoc: smartMoney.choc || false,
      hasBos: smartMoney.bos || false,
      liquiditySwept: smartMoney.liquiditySwept || false,
      structureScore: Math.max(0, Math.min(1, structureScore))
    };
  }
  
  /**
   * Calcola allineamento multi-timeframe
   */
  private static calculateMultiTimeframeAlignment(mtf: MultiTimeframeData) {
    const m15Trend = mtf.m15?.trend || 'SIDEWAYS';
    const m5Area = mtf.m5?.area || 'NEUTRAL';
    const m1Entry = mtf.m1?.entry || 'Waiting';
    
    // Calcola qualità entry (0-1)
    let entryQuality = 0.5;
    if (m1Entry.includes('High') || m1Entry.includes('Strong')) entryQuality = 0.8;
    if (m1Entry.includes('Low') || m1Entry.includes('Weak')) entryQuality = 0.3;
    
    // Calcola allineamento trend
    let alignmentScore = 0.5;
    if (m15Trend === 'UP' && m5Area === 'DEMAND') alignmentScore = 0.9;
    else if (m15Trend === 'DOWN' && m5Area === 'SUPPLY') alignmentScore = 0.9;
    else if (m15Trend === 'SIDEWAYS') alignmentScore = 0.4;
    
    return {
      m15Trend,
      m5Area,
      entryQuality,
      alignmentScore
    };
  }
  
  /**
   * Normalizza features delle news
   */
  private static normalizeNewsFeatures(newsAnalysis: NewsAnalysisData) {
    return {
      sentimentScore: Math.max(-1, Math.min(1, newsAnalysis.sentiment / 100)), // Normalizza -1 a +1
      impactScore: Math.max(0, Math.min(1, newsAnalysis.impactScore / 100)),
      relevantCount: Math.min(10, newsAnalysis.relevantCount || 0) // Cap a 10
    };
  }
  
  /**
   * Calcola features price action
   */
  private static calculatePriceActionFeatures(rawSignal: RawSignalData) {
    const entry = rawSignal.entry_price;
    const support = rawSignal.analysis?.sessionData?.initialBalance?.low || entry * 0.995;
    const resistance = rawSignal.analysis?.sessionData?.initialBalance?.high || entry * 1.005;
    
    // Posizione nel range (0 = supporto, 1 = resistenza)
    const positionInRange = (entry - support) / (resistance - support);
    
    // Distanze normalizzate
    const distanceFromSupport = (entry - support) / entry;
    const distanceFromResistance = (resistance - entry) / entry;
    
    // Forza breakout (simulata)
    const breakoutStrength = rawSignal.signal === 'BUY' ? 
      Math.max(0, positionInRange - 0.8) * 5 : // BUY vicino resistenza
      Math.max(0, 0.2 - positionInRange) * 5;  // SELL vicino supporto
    
    return {
      positionInRange: Math.max(0, Math.min(1, positionInRange)),
      distanceFromSupport,
      distanceFromResistance,
      breakoutStrength: Math.max(0, Math.min(1, breakoutStrength))
    };
  }
  
  /**
   * Calcola probabilità di vincita basata su storico
   */
  private static async calculateWinProbability(rawSignal: RawSignalData): Promise<number> {
    // Query storico per simbolo simile
    const { data: historicalData } = await supabase
      .from('ml_optimized_signals')
      .select('actual_outcome')
      .eq('symbol', rawSignal.symbol)
      .eq('signal_type', rawSignal.signal)
      .neq('actual_outcome', 'PENDING')
      .limit(100);
    
    if (!historicalData || historicalData.length < 10) {
      // Se non ci sono dati storici sufficienti, usa confidence come base
      return rawSignal.confidence / 100.0;
    }
    
    const winCount = historicalData.filter(d => d.actual_outcome === 'WIN').length;
    return winCount / historicalData.length;
  }
  
  /**
   * Costruisce il vettore completo di features per ML
   */
  private static buildFeatureVector(rawSignal: RawSignalData) {
    return {
      // Core signals
      signal_numeric: rawSignal.signal === 'BUY' ? 1 : 0,
      confidence_raw: rawSignal.confidence,
      
      // Technical indicators raw
      rsi_raw: rawSignal.analysis.indicators.rsi,
      macd_raw: rawSignal.analysis.indicators.macd,
      atr_percent_raw: rawSignal.analysis.indicators.atrPercent,
      
      // Scoring breakdown
      trend_score: rawSignal.analysis.scoring?.trend || 0,
      smart_money_score: rawSignal.analysis.scoring?.smartMoney || 0,
      news_score: rawSignal.analysis.scoring?.news || 0,
      overall_score: rawSignal.analysis.scoring?.overall || 0,
      
      // Additional features for deep learning
      symbol_encoded: this.encodeSymbol(rawSignal.symbol),
      market_regime: this.detectMarketRegime(rawSignal),
      volatility_regime: this.classifyVolatilityRegime(rawSignal.analysis.indicators.atrPercent)
    };
  }
  
  // Helper methods
  private static normalizeMACD(macd: number): number {
    // Normalizza MACD assumendo range tipico -0.01 a +0.01
    return Math.max(0, Math.min(1, (macd + 0.01) / 0.02));
  }
  
  private static calculateTimeToNews(timestamp: Date, newsEvent: NewsEvent): number {
    const newsTime = new Date(`${newsEvent.date}T${newsEvent.time}`);
    return Math.abs(newsTime.getTime() - timestamp.getTime()) / (1000 * 60); // minuti
  }
  
  private static encodeSymbol(symbol: string): number {
    // Simple hash per simbolo
    let hash = 0;
    for (let i = 0; i < symbol.length; i++) {
      hash = ((hash << 5) - hash + symbol.charCodeAt(i)) & 0xffffffff;
    }
    return Math.abs(hash) % 1000 / 1000; // Normalizza 0-1
  }
  
  private static detectMarketRegime(signal: RawSignalData): string {
    const atr = signal.analysis.indicators.atrPercent;
    const rsi = signal.analysis.indicators.rsi;
    
    if (atr > 2.0) return 'HIGH_VOLATILITY';
    if (rsi > 70 || rsi < 30) return 'EXTREME';
    return 'NORMAL';
  }
  
  private static classifyVolatilityRegime(atrPercent: number): string {
    if (atrPercent < 0.5) return 'LOW';
    if (atrPercent > 2.0) return 'HIGH';
    return 'MEDIUM';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { signal_data, signal_id } = await req.json();
    
    if (!signal_data || !signal_id) {
      throw new Error('signal_data e signal_id sono richiesti');
    }
    
    console.log(`🚀 Avvio ottimizzazione ML per segnale ${signal_id}`);
    
    // Ottimizza il segnale per ML
    const optimizedSignal = await MLSignalOptimizer.optimizeSignalForML(signal_data, signal_id);
    
    // Salva nel database ML
    const { data, error } = await supabase
      .from('ml_optimized_signals')
      .insert(optimizedSignal)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Errore inserimento ML signal:', error);
      throw error;
    }
    
    console.log(`✅ Segnale ML ottimizzato salvato: ${data.id}`);
    console.log(`📊 Features: ${Object.keys(optimizedSignal.feature_vector).length} total`);
    console.log(`🎯 Win Probability: ${(optimizedSignal.win_probability * 100).toFixed(1)}%`);
    
    return new Response(JSON.stringify({
      success: true,
      ml_signal_id: data.id,
      optimization_summary: {
        features_count: Object.keys(optimizedSignal.feature_vector).length,
        win_probability: optimizedSignal.win_probability,
        market_session: optimizedSignal.market_session,
        trend_alignment: optimizedSignal.trend_alignment_score,
        confidence_normalized: optimizedSignal.confidence_score
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Errore ML Signal Optimizer:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});