/**
 * ML Confirmation System
 *
 * Questo componente analizza i segnali generati da generate-ai-signals
 * e applica i pesi ottimizzati ML per confermarli o respingerli.
 *
 * ARCHITETTURA A DUE COMPONENTI:
 * 1. generate-ai-signals: Sistema base (invariato)
 * 2. ml-confirmation: Enhancement ML (nuovo)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Railway API URL per LSTM weights
const RAILWAY_API_URL = Deno.env.get('RAILWAY_API_URL') || 'https://web-production-31235.up.railway.app'

interface MLConfirmationRequest {
  signal_id: string
  force_recalculate?: boolean
}

interface MLConfirmationResponse {
  success: boolean
  signal_id: string
  base_confidence: number
  ml_confidence: number | null
  ml_status: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'INSUFFICIENT_DATA'
  weight_score?: number
  analysis?: any
  message: string
}

interface IndicatorWeights {
  [key: string]: number
}

class MLConfirmationSystem {
  private supabase: any;

  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }

  // Verifica se abbiamo dati sufficienti per ML
  async hasSufficientMLData(): Promise<boolean> {
    try {
      const { count } = await this.supabase
        .from('ml_training_samples')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'COMPLETED')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      return (count || 0) >= 100; // Minimo 100 campioni
    } catch (error) {
      console.warn('Error checking ML data sufficiency:', error);
      return false;
    }
  }

  // Recupera pesi ottimizzati da Railway API
  async getOptimizedWeights(): Promise<IndicatorWeights | null> {
    try {
      const response = await fetch(`${RAILWAY_API_URL}/weights`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.warn('Failed to fetch weights from Railway API');
        return null;
      }

      const weights = await response.json();
      console.log('✅ Loaded optimized weights from Railway API');
      return weights;

    } catch (error) {
      console.warn('Error fetching optimized weights:', error);
      return null;
    }
  }

  // Calcola score ML usando i pesi ottimizzati
  async calculateMLScore(
    signal: any,
    weights: IndicatorWeights
  ): Promise<{ score: number; confidence: number; analysis: any }> {

    // Estrai indicatori dal signal analysis
    const indicators = signal.ai_analysis?.indicators || {};

    if (!indicators || Object.keys(indicators).length === 0) {
      return {
        score: 0,
        confidence: 0,
        analysis: { error: 'No indicators available' }
      };
    }

    let totalScore = 0;
    let totalWeight = 0;
    const breakdown: any = {};

    // Calcola score pesato per categoria di indicatori
    const categories = {
      trend: { weight: 0.4, indicators: ['adx', 'ema12', 'ema21', 'ema50', 'vwap'] },
      momentum: { weight: 0.35, indicators: ['rsi', 'macd', 'stoch'] },
      volatility: { weight: 0.15, indicators: ['atr', 'bollinger'] },
      volume: { weight: 0.1, indicators: ['volume'] }
    };

    for (const [categoryName, category] of Object.entries(categories)) {
      let categoryScore = 0;
      let categoryWeightSum = 0;

      for (const indicator of category.indicators) {
        const value = indicators[indicator];
        const weight = weights[indicator] || 1.0;

        if (value !== undefined && value !== null) {
          const normalizedValue = this.normalizeIndicator(indicator, value, signal.signal);
          categoryScore += normalizedValue * weight;
          categoryWeightSum += weight;

          breakdown[indicator] = {
            value,
            weight,
            normalized: normalizedValue,
            contribution: normalizedValue * weight
          };
        }
      }

      if (categoryWeightSum > 0) {
        const categoryFinalScore = categoryScore / categoryWeightSum;
        totalScore += categoryFinalScore * category.weight;
        totalWeight += category.weight;

        breakdown[categoryName] = {
          score: categoryFinalScore,
          weight: category.weight,
          contribution: categoryFinalScore * category.weight
        };
      }
    }

    const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    const confidence = Math.max(25, Math.min(95, 50 + (finalScore * 40)));

    return {
      score: finalScore,
      confidence: Math.round(confidence),
      analysis: {
        breakdown,
        final_score: finalScore,
        confidence_calculation: `50 + (${finalScore.toFixed(3)} * 40) = ${confidence.toFixed(1)}%`,
        signal_direction: signal.signal,
        signal_alignment: finalScore > 0 ? 'ALIGNED' : 'MISALIGNED'
      }
    };
  }

  // Normalizza valori indicatori in base al tipo e segnale
  private normalizeIndicator(indicator: string, value: number, signal: 'BUY' | 'SELL'): number {
    switch (indicator) {
      case 'rsi':
        if (signal === 'BUY') {
          return value < 30 ? 1.0 : value < 50 ? 0.5 : value > 70 ? -1.0 : 0;
        } else {
          return value > 70 ? 1.0 : value > 50 ? 0.5 : value < 30 ? -1.0 : 0;
        }

      case 'adx':
        return Math.min(1.0, Math.max(0, (value - 25) / 25));

      case 'macd':
        return signal === 'BUY' ? Math.tanh(value) : Math.tanh(-value);

      case 'atr':
        // ATR è sempre positivo (volatilità utile)
        return Math.min(1.0, value / 0.005);

      case 'stoch':
        if (signal === 'BUY') {
          return value < 20 ? 1.0 : value < 50 ? 0.5 : value > 80 ? -1.0 : 0;
        } else {
          return value > 80 ? 1.0 : value > 50 ? 0.5 : value < 20 ? -1.0 : 0;
        }

      default:
        // Per EMA e altri indicatori di trend
        return Math.tanh(value);
    }
  }

  // Processa un singolo segnale per conferma ML
  async confirmSignal(signalId: string, forceRecalculate: boolean = false): Promise<MLConfirmationResponse> {
    try {
      console.log(`🤖 [ML-CONFIRM] Processing signal: ${signalId}`);

      // Recupera il segnale
      const { data: signal, error: signalError } = await this.supabase
        .from('mt5_signals')
        .select('*')
        .eq('id', signalId)
        .single();

      if (signalError || !signal) {
        return {
          success: false,
          signal_id: signalId,
          base_confidence: 0,
          ml_confidence: null,
          ml_status: 'PENDING',
          message: `Signal not found: ${signalError?.message}`
        };
      }

      // Se già processato e non forzato, ritorna risultato esistente
      if (!forceRecalculate && signal.ml_status !== 'PENDING') {
        return {
          success: true,
          signal_id: signalId,
          base_confidence: signal.confidence,
          ml_confidence: signal.ml_confidence,
          ml_status: signal.ml_status,
          weight_score: signal.ml_weight_score,
          analysis: signal.ml_analysis,
          message: 'Signal already processed'
        };
      }

      // Verifica se abbiamo dati sufficienti per ML
      const hasMLData = await this.hasSufficientMLData();

      if (!hasMLData) {
        // Aggiorna stato a dati insufficienti
        await this.supabase
          .from('mt5_signals')
          .update({
            ml_status: 'INSUFFICIENT_DATA',
            ml_processed_at: new Date().toISOString()
          })
          .eq('id', signalId);

        return {
          success: true,
          signal_id: signalId,
          base_confidence: signal.confidence,
          ml_confidence: null,
          ml_status: 'INSUFFICIENT_DATA',
          message: 'Insufficient ML data - using base confidence only'
        };
      }

      // Recupera pesi ottimizzati
      const weights = await this.getOptimizedWeights();

      if (!weights) {
        return {
          success: false,
          signal_id: signalId,
          base_confidence: signal.confidence,
          ml_confidence: null,
          ml_status: 'PENDING',
          message: 'Failed to fetch optimized weights'
        };
      }

      // Calcola score ML
      const mlResult = await this.calculateMLScore(signal, weights);

      // Determina stato conferma basato su confidenza ML
      let mlStatus: 'CONFIRMED' | 'REJECTED';
      if (mlResult.confidence >= 65) {
        mlStatus = 'CONFIRMED';
      } else {
        mlStatus = 'REJECTED';
      }

      // Aggiorna il segnale con risultati ML
      const { error: updateError } = await this.supabase
        .from('mt5_signals')
        .update({
          ml_confidence: mlResult.confidence,
          ml_status: mlStatus,
          ml_weight_score: mlResult.score,
          ml_analysis: mlResult.analysis,
          ml_processed_at: new Date().toISOString()
        })
        .eq('id', signalId);

      if (updateError) {
        throw new Error(`Failed to update signal: ${updateError.message}`);
      }

      console.log(`✅ [ML-CONFIRM] Signal ${signalId}: ${mlStatus} @ ${mlResult.confidence}%`);

      return {
        success: true,
        signal_id: signalId,
        base_confidence: signal.confidence,
        ml_confidence: mlResult.confidence,
        ml_status: mlStatus,
        weight_score: mlResult.score,
        analysis: mlResult.analysis,
        message: `Signal ${mlStatus.toLowerCase()} with ML confidence ${mlResult.confidence}%`
      };

    } catch (error) {
      console.error('❌ [ML-CONFIRM] Error confirming signal:', error);
      return {
        success: false,
        signal_id: signalId,
        base_confidence: 0,
        ml_confidence: null,
        ml_status: 'PENDING',
        message: error.message
      };
    }
  }

  // Processa batch di segnali non processati
  async processPendingSignals(limit: number = 10): Promise<any> {
    try {
      console.log(`🤖 [ML-CONFIRM] Processing up to ${limit} pending signals...`);

      // Recupera segnali pending
      const { data: pendingSignals, error } = await this.supabase
        .from('mt5_signals')
        .select('id')
        .eq('ml_status', 'PENDING')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      if (!pendingSignals || pendingSignals.length === 0) {
        return {
          success: true,
          processed: 0,
          message: 'No pending signals to process'
        };
      }

      const results = [];
      for (const signal of pendingSignals) {
        const result = await this.confirmSignal(signal.id);
        results.push(result);
      }

      const confirmed = results.filter(r => r.ml_status === 'CONFIRMED').length;
      const rejected = results.filter(r => r.ml_status === 'REJECTED').length;
      const insufficient = results.filter(r => r.ml_status === 'INSUFFICIENT_DATA').length;

      return {
        success: true,
        processed: results.length,
        confirmed,
        rejected,
        insufficient,
        results,
        message: `Processed ${results.length} signals: ${confirmed} confirmed, ${rejected} rejected, ${insufficient} insufficient data`
      };

    } catch (error) {
      console.error('❌ [ML-CONFIRM] Error processing batch:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Ottieni statistiche ML correnti
  async getMLStats(): Promise<any> {
    try {
      const stats = await Promise.all([
        // Totali segnali
        this.supabase.from('mt5_signals').select('*', { count: 'exact', head: true }),

        // Segnali ML-confirmed
        this.supabase.from('mt5_signals').select('*', { count: 'exact', head: true }).eq('ml_status', 'CONFIRMED'),

        // Segnali ML-rejected
        this.supabase.from('mt5_signals').select('*', { count: 'exact', head: true }).eq('ml_status', 'REJECTED'),

        // Dati ML sufficienti
        this.supabase.from('ml_training_samples').select('*', { count: 'exact', head: true }).eq('status', 'COMPLETED'),

        // Performance media
        this.supabase.from('mt5_signals').select('ml_confidence, confidence').not('ml_confidence', 'is', null)
      ]);

      const [total, confirmed, rejected, mlSamples, performance] = stats;

      return {
        total_signals: total.count || 0,
        ml_confirmed: confirmed.count || 0,
        ml_rejected: rejected.count || 0,
        ml_samples_available: mlSamples.count || 0,
        has_sufficient_data: (mlSamples.count || 0) >= 100,
        avg_ml_confidence: performance.data ?
          performance.data.reduce((sum, s) => sum + s.ml_confidence, 0) / performance.data.length : 0,
        avg_base_confidence: performance.data ?
          performance.data.reduce((sum, s) => sum + s.confidence, 0) / performance.data.length : 0
      };

    } catch (error) {
      console.error('Error getting ML stats:', error);
      return {
        error: error.message
      };
    }
  }
}

// Inizializza sistema
const mlSystem = new MLConfirmationSystem();

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;

    console.log(`🤖 [ML-CONFIRM] ${req.method} ${path}`);

    if (req.method === 'POST' && path === '/confirm-signal') {
      const { signal_id, force_recalculate = false } = await req.json();

      if (!signal_id) {
        return new Response(
          JSON.stringify({ error: 'signal_id is required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      const result = await mlSystem.confirmSignal(signal_id, force_recalculate);

      return new Response(
        JSON.stringify(result),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: result.success ? 200 : 500
        }
      );
    }

    if (req.method === 'POST' && path === '/process-pending') {
      const { limit = 10 } = await req.json();
      const result = await mlSystem.processPendingSignals(limit);

      return new Response(
        JSON.stringify(result),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: result.success ? 200 : 500
        }
      );
    }

    if (req.method === 'GET' && path === '/stats') {
      const stats = await mlSystem.getMLStats();

      return new Response(
        JSON.stringify({ success: true, stats }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Endpoint not found' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      }
    );

  } catch (error) {
    console.error('❌ [ML-CONFIRM] Error:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});