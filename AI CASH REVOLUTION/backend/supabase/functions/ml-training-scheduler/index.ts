/**
 * ML Training Scheduler
 *
 * Sistema programmato per:
 * - Lunedì-Venerdì: Solo raccolta dati trading
 * - Sabato-Domenica: Addestramento modello e aggiornamento pesi
 *
 * Il scheduler si attiva automaticamente e può essere triggerato manualmente
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Railway API URL per LSTM training
const RAILWAY_API_URL = Deno.env.get('RAILWAY_API_URL') || 'https://web-production-31235.up.railway.app'

interface TrainingStatus {
  lastTrainingDate: string | null
  isTrainingActive: boolean
  totalSamples: number
  completedSamples: number
  lastModelVersion: string | null
  trainingProgress: number
}

interface WeeklyStats {
  weekStart: string
  weekEnd: string
  totalTrades: number
  winningTrades: number
  totalProfit: number
  avgConfidence: number
  modelPerformance: {
    accuracy: number;
    winRate: number;
    profitFactor: number;
  } | null;
}

class MLTrainingScheduler {
  private supabase: any;

  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }

  // Controlla il giorno corrente e determina l'azione
  async checkAndExecuteWeeklySchedule(): Promise<any> {
    const now = new Date();
    const dayOfWeek = now.getUTCDay(); // 0 = Domenica, 1 = Lunedì, ..., 6 = Sabato
    const hour = now.getUTCHours();

    console.log(`📅 [SCHEDULER] Giorno: ${this.getDayName(dayOfWeek)}, Ora: ${hour}:00 UTC`);

    try {
      // Domenica 02:00 - 04:00 UTC: Training principale
      if (dayOfWeek === 0 && hour >= 2 && hour < 4) {
        return await this.executeWeeklyTraining();
      }

      // Sabato 02:00 - 04:00 UTC: Preparazione dati
      if (dayOfWeek === 6 && hour >= 2 && hour < 4) {
        return await this.prepareTrainingData();
      }

      // Lunedì-Venerdì: Raccolta dati trading
      if (dayOfWeek >= 1 && dayOfWeek <= 5 && hour % 6 === 0) { // Ogni 6 ore
        return await this.collectTradingData();
      }

      return {
        success: true,
        message: 'Scheduler check completed - no action needed',
        action: 'monitoring',
        timestamp: now.toISOString()
      };

    } catch (error) {
      console.error('❌ [SCHEDULER] Error in weekly schedule:', error);
      return {
        success: false,
        error: error.message,
        timestamp: now.toISOString()
      };
    }
  }

  // Prepara i dati per il training (Sabato)
  async prepareTrainingData(): Promise<any> {
    console.log('🔄 [SCHEDULER] Preparing training data for Sunday...');

    try {
      const stats = await this.calculateWeeklyStats();

      console.log(`📊 [SCHEDULER] Weekly Stats:`, stats);

      // Verifica se ci sono abbastanza dati per il training
      if (stats.totalTrades < 50) {
        console.log('⚠️ [SCHEDULER] Insufficient data for training (< 50 trades)');
        return {
          success: true,
          message: 'Insufficient data - waiting for more trades',
          stats,
          action: 'waiting_for_data',
          timestamp: new Date().toISOString()
        };
      }

      // Log preparazione completata
      await this.logSchedulerActivity('data_preparation', {
        weekStats: stats,
        readyForTraining: true
      });

      return {
        success: true,
        message: 'Training data prepared successfully',
        stats,
        action: 'data_prepared',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ [SCHEDULER] Error preparing training data:', error);
      return {
        success: false,
        error: error.message,
        action: 'data_preparation_failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  // Esegue il training settimanale (Domenica)
  async executeWeeklyTraining(): Promise<any> {
    console.log('🧠 [SCHEDULER] Starting weekly training...');

    try {
      // Verifica stato corrente
      const currentStatus = await this.getTrainingStatus();

      if (currentStatus.isTrainingActive) {
        console.log('⚠️ [SCHEDULER] Training already in progress');
        return {
          success: true,
          message: 'Training already in progress',
          action: 'skipping',
          timestamp: new Date().toISOString()
        };
      }

      // Imposta stato training attivo
      await this.setTrainingStatus({ isTrainingActive: true, trainingProgress: 0 });

      console.log('📡 [SCHEDULER] Calling Railway API for training...');

      // Chiama Railway API per il training
      const trainingResponse = await fetch(`${RAILWAY_API_URL}/train`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          force_retrain: true,
          model_version: `v${Date.now()}`
        })
      });

      if (!trainingResponse.ok) {
        throw new Error(`Railway API error: ${trainingResponse.statusText}`);
      }

      const trainingResult = await trainingResponse.json();
      console.log('✅ [SCHEDULER] Training completed:', trainingResult);

      // Aggiorna stato training
      await this.setTrainingStatus({
        isTrainingActive: false,
        trainingProgress: 100,
        lastModelVersion: trainingResult.model_version,
        lastTrainingDate: new Date().toISOString()
      });

      // Log completamento training
      await this.logSchedulerActivity('training_completed', {
        modelVersion: trainingResult.model_version,
        metrics: trainingResult.metrics,
        weightChanges: trainingResult.weight_changes
      });

      return {
        success: true,
        message: 'Weekly training completed successfully',
        trainingResult,
        action: 'training_completed',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ [SCHEDULER] Error in weekly training:', error);

      // Resetta stato training
      await this.setTrainingStatus({ isTrainingActive: false });

      // Log errore training
      await this.logSchedulerActivity('training_failed', {
        error: error.message,
        timestamp: new Date().toISOString()
      });

      return {
        success: false,
        error: error.message,
        action: 'training_failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  // Raccolta dati trading durante la settimana
  async collectTradingData(): Promise<any> {
    console.log('📊 [SCHEDULER] Collecting trading data...');

    try {
      // Recupera dati trading recenti
      const { data: recentData, error } = await this.supabase
        .from('ml_training_samples')
        .select('*')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Ultimi 7 giorni
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      console.log(`📈 [SCHEDULER] Collected ${recentData?.length || 0} recent trading samples`);

      return {
        success: true,
        message: `Collected ${recentData?.length || 0} trading samples`,
        dataCount: recentData?.length || 0,
        action: 'data_collection',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ [SCHEDULER] Error collecting trading data:', error);
      return {
        success: false,
        error: error.message,
        action: 'data_collection_failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  // Calcola statistiche su tutti i dati disponibili
  async calculateWeeklyStats(): Promise<WeeklyStats> {
    const now = new Date();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekEnd = now;

    try {
      // Recupera TUTTI i dati disponibili per il calcolo pesi
      const { data: allData } = await this.supabase
        .from('ml_training_samples')
        .select('*')
        .order('created_at', { ascending: false });

      // Calcola statistiche settimanali solo per il dashboard
      const { data: weekData } = await this.supabase
        .from('ml_training_samples')
        .select('*')
        .gte('created_at', weekStart.toISOString())
        .lte('created_at', weekEnd.toISOString());

      if (!weekData || weekData.length === 0) {
        return {
          weekStart: weekStart.toISOString(),
          weekEnd: weekEnd.toISOString(),
          totalTrades: 0,
          winningTrades: 0,
          totalProfit: 0,
          avgConfidence: 0,
          modelPerformance: null
        };
      }

      const totalTrades = weekData.length;
      const completedTrades = weekData.filter(t => ['SL_HIT', 'TP_HIT'].includes(t.status));
      const winningTrades = completedTrades.filter(t => t.profit_loss && t.profit_loss > 0);

      const totalProfit = weekData.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
      const avgConfidence = weekData.reduce((sum, t) => sum + (t.confidence_score || 0), 0) / weekData.length;

      // Recupera performance modello se disponibile
      const { data: modelPerf } = await this.supabase
        .from('ml_model_performance')
        .select('*')
        .gte('training_date', weekStart.toISOString())
        .order('training_date', { ascending: false })
        .limit(1)
        .single();

      return {
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        totalTrades,
        winningTrades,
        totalProfit,
        avgConfidence,
        modelPerformance: modelPerf ? {
          accuracy: modelPerf.accuracy || 0,
          winRate: modelPerf.overall_win_rate || 0,
          profitFactor: modelPerf.profit_factor || 0
        } : null
      };

    } catch (error) {
      console.error('Error calculating weekly stats:', error);
      throw error;
    }
  }

  // Recupera stato training corrente
  async getTrainingStatus(): Promise<TrainingStatus> {
    try {
      const { data: lastTraining } = await this.supabase
        .from('ml_model_performance')
        .select('*')
        .order('training_date', { ascending: false })
        .limit(1)
        .single();

      const { data: sampleCount } = await this.supabase
        .from('ml_training_samples')
        .select('count')
        .single();

      return {
        lastTrainingDate: lastTraining?.training_date || null,
        isTrainingActive: lastTraining?.is_active || false,
        totalSamples: sampleCount?.count || 0,
        completedSamples: sampleCount?.count || 0,
        lastModelVersion: lastTraining?.model_version || null,
        trainingProgress: lastTraining?.is_active ? 0 : 100
      };

    } catch (error) {
      console.warn('Error getting training status:', error);
      return {
        lastTrainingDate: null,
        isTrainingActive: false,
        totalSamples: 0,
        completedSamples: 0,
        lastModelVersion: null,
        trainingProgress: 0
      };
    }
  }

  // Imposta stato training
  async setTrainingStatus(status: Partial<TrainingStatus>): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('ml_training_status')
        .upsert({
          id: 'current',
          ...status,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.warn('Error setting training status:', error);
      }

    } catch (error) {
      console.error('Error setting training status:', error);
    }
  }

  // Log attività scheduler
  async logSchedulerActivity(activity: string, details: any): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('ml_scheduler_logs')
        .insert({
          activity,
          details,
          timestamp: new Date().toISOString()
        });

      if (error) {
        console.warn('Error logging scheduler activity:', error);
      }

    } catch (error) {
      console.error('Error logging scheduler activity:', error);
    }
  }

  // Helper function per nome giorno
  private getDayName(day: number): string {
    const days = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    return days[day];
  }
}

// Inizializza scheduler
const scheduler = new MLTrainingScheduler();

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;

    console.log(`📡 [SCHEDULER] ${req.method} ${path}`);

    if (req.method === 'POST' && path === '/trigger-schedule') {
      const result = await scheduler.checkAndExecuteWeeklySchedule();

      return new Response(
        JSON.stringify(result),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: result.success ? 200 : 500
        }
      );
    }

    if (req.method === 'GET' && path === '/status') {
      const status = await scheduler.getTrainingStatus();
      const weeklyStats = await scheduler.calculateWeeklyStats();

      return new Response(
        JSON.stringify({
          success: true,
          status,
          weeklyStats,
          schedulerActive: true
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (req.method === 'POST' && path === '/manual-training') {
      const result = await scheduler.executeWeeklyTraining();

      return new Response(
        JSON.stringify(result),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: result.success ? 200 : 500
        }
      );
    }

    if (req.method === 'POST' && path === '/prepare-data') {
      const result = await scheduler.prepareTrainingData();

      return new Response(
        JSON.stringify(result),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: result.success ? 200 : 500
        }
      );
    }

    if (req.method === 'GET' && path === '/weekly-stats') {
      const stats = await scheduler.calculateWeeklyStats();

      return new Response(
        JSON.stringify({
          success: true,
          stats
        }),
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
    console.error('❌ [SCHEDULER] Error:', error);

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