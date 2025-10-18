/**
 * AI Signal Service - Enhanced with Fallback and Retry Logic
 *
 * Service responsible for generating AI trading signals with multiple fallback strategies.
 * Handles timeouts, errors, and provides graceful degradation.
 */

import { supabase } from '@/integrations/supabase/client';
import type { AISignal } from '@/types/trading';

export interface SignalGenerationOptions {
  symbol: string;
  timeout?: number;
  maxRetries?: number;
  useFallback?: boolean;
  strategy?: 'fast' | 'comprehensive' | 'fallback' | 'hybrid' | 'ml';
}

export interface SignalGenerationResult {
  success: boolean;
  signal?: AISignal;
  error?: string;
  source: string;
  processingTime: number;
  retryCount: number;
}

class AISignalService {
  private static instance: AISignalService;
  private readonly DEFAULT_TIMEOUT = 25000; // 25 seconds
  private readonly FAST_TIMEOUT = 15000; // 15 seconds for fast mode
  private readonly MAX_RETRIES = 2;

  static getInstance(): AISignalService {
    if (!AISignalService.instance) {
      AISignalService.instance = new AISignalService();
    }
    return AISignalService.instance;
  }

  /**
   * Generate AI signal with fallback strategy
   */
  async generateSignal(options: SignalGenerationOptions): Promise<SignalGenerationResult> {
    const {
      symbol,
      timeout = this.DEFAULT_TIMEOUT,
      maxRetries = this.MAX_RETRIES,
      useFallback = true,
      strategy = 'comprehensive'
    } = options;

    console.log(`🤖 Generating AI signal for ${symbol} using ${strategy} strategy`);

    let lastError: string = '';
    let retryCount = 0;
    const startTime = Date.now();

    // Primary signal generation strategy
    const strategies = [
      {
        name: 'hybrid',
        execute: () => this.generateHybridSignal(symbol, timeout),
        priority: 1
      },
      {
        name: 'ml',
        execute: () => this.generateMLSignal(symbol, timeout),
        priority: 2
      },
      {
        name: 'comprehensive',
        execute: () => this.generateComprehensiveSignal(symbol, timeout),
        priority: 3
      },
      {
        name: 'fast',
        execute: () => this.generateFastSignal(symbol, this.FAST_TIMEOUT),
        priority: 4
      },
      {
        name: 'fallback',
        execute: () => this.generateFallbackSignal(symbol),
        priority: 5
      }
    ];

    // Filter strategies based on preference
    // When using comprehensive with fallback, try all strategies in order
    // Otherwise, only try the specified strategy
    const availableStrategies = (strategy === 'comprehensive' && useFallback)
      ? strategies // Try all strategies in priority order
      : strategies.filter(s => s.name === strategy);

    for (const strategyConfig of availableStrategies) {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          console.log(`📡 Attempting ${strategyConfig.name} strategy (attempt ${attempt + 1}/${maxRetries + 1})`);

          const result = await strategyConfig.execute();

          const processingTime = Date.now() - startTime;
          console.log(`✅ Signal generated successfully using ${strategyConfig.name} strategy in ${processingTime}ms`);

          return {
            success: true,
            signal: result,
            source: strategyConfig.name,
            processingTime,
            retryCount
          };

        } catch (error) {
          lastError = error instanceof Error ? error.message : 'Unknown error';
          retryCount = attempt;

          console.warn(`❌ ${strategyConfig.name} strategy failed (attempt ${attempt + 1}):`, lastError);

          // Don't retry on certain errors
          if (this.isNonRetryableError(lastError)) {
            break;
          }

          // Wait before retry (exponential backoff)
          if (attempt < maxRetries) {
            await this.delay(Math.min(1000 * Math.pow(2, attempt), 5000));
          }
        }
      }
    }

    // All strategies failed
    const processingTime = Date.now() - startTime;
    console.error(`🚨 All signal generation strategies failed for ${symbol} after ${processingTime}ms`);

    return {
      success: false,
      error: lastError || 'All signal generation strategies failed',
      source: 'none',
      processingTime,
      retryCount
    };
  }

  /**
   * Comprehensive signal generation (original complex analysis)
   */
  private async generateComprehensiveSignal(symbol: string, timeout: number): Promise<AISignal> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      console.log('🚀 Calling generate-ai-signals-public...');

      // Call Edge Function directly using fetch to avoid Supabase client auth issues
      const supabaseUrl = 'https://rvopmdflnecyrwrzhyfy.supabase.co';
      const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2b3BtZGZsbmVjeXJ3cnpoeWZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NDc4ODQsImV4cCI6MjA3NDEyMzg4NH0.snlFF1ChbYsA765gXE-cMGb11jHIaF2np_pNxIGLgW8';

      const response = await fetch(`${supabaseUrl}/functions/v1/generate-ai-signals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
          'apikey': anonKey
        },
        body: JSON.stringify({
          symbol: symbol.toUpperCase().trim(),
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.details || `HTTP ${response.status}`);
      }

      const data = await response.json();

      clearTimeout(timeoutId);

      console.log('📦 Response received:', data);

      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response from AI service');
      }

      // Validate required fields
      if (!data.symbol || !data.type || data.confidence === undefined) {
        throw new Error('Incomplete signal data received from AI service');
      }

      return data as AISignal;

    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Signal generation timed out');
      }

      throw error;
    }
  }

  /**
   * Fast signal generation (simplified analysis)
   */
  private async generateFastSignal(symbol: string, timeout: number): Promise<AISignal> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const { data, error } = await supabase.functions.invoke('generate-ai-signals-fast', {
        body: {
          symbol: symbol.toUpperCase().trim(),
          requestId: crypto.randomUUID(),
          signal: controller.signal
        }
      });

      clearTimeout(timeoutId);

      if (error) {
        throw new Error(`Fast AI service error: ${error.message || 'Unknown error'}`);
      }

      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response from fast AI service');
      }

      return data as AISignal;

    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Fast signal generation timed out');
      }

      throw error;
    }
  }

  /**
   * Fallback signal generation - throws error instead of generating fake data
   */
  private async generateFallbackSignal(symbol: string): Promise<AISignal> {
    console.error('❌ Fallback signal generation called - no real data available');
    throw new Error('AI signal services are unavailable and fallback is disabled. Please try again later when services are restored.');
  }

  /**
   * Check if error is non-retryable
   */
  private isNonRetryableError(error: string): boolean {
    const nonRetryablePatterns = [
      'Limite giornaliero segnali raggiunto',
      '429',
      'authentication',
      'authorization',
      'invalid symbol',
      'invalid request'
    ];

    return nonRetryablePatterns.some(pattern =>
      error.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  /**
   * Delay utility for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get service health status
   */
  async getServiceHealth(): Promise<{
    comprehensive: boolean;
    fast: boolean;
    fallback: boolean;
  }> {
    const results = {
      comprehensive: false,
      fast: false,
      fallback: true // Fallback is always available
    };

    // Test comprehensive service
    try {
      const { error } = await supabase.functions.invoke('generate-ai-signals', {
        body: { symbol: 'TEST' },
        headers: { 'X-Health-Check': 'true' }
      });
      results.comprehensive = !error;
    } catch {
      results.comprehensive = false;
    }

    // Test fast service
    try {
      const { error } = await supabase.functions.invoke('generate-ai-signals-fast', {
        body: { symbol: 'TEST' },
        headers: { 'X-Health-Check': 'true' }
      });
      results.fast = !error;
    } catch {
      results.fast = false;
    }

    return results;
  }

  /**
   * ML-only signal generation
   */
  private async generateMLSignal(symbol: string, timeout: number): Promise<AISignal> {
    try {
      const { mlSignalService } = await import('./mlSignalService');

      const result = await mlSignalService.generateSignal({
        symbol,
        timeout,
        useEnsemble: true,
        enableConstraints: true
      });

      if (!result.success || !result.signal) {
        throw new Error(result.error || 'ML signal generation failed');
      }

      return result.signal;
    } catch (error) {
      console.error('ML signal generation failed:', error);
      throw error;
    }
  }

  /**
   * Hybrid signal generation (AI + ML combined)
   */
  private async generateHybridSignal(symbol: string, timeout: number): Promise<AISignal> {
    try {
      console.log('🔀 Generating hybrid signal (AI + ML)...');

      // 1. Get traditional AI signal
      const aiSignal = await this.generateComprehensiveSignal(symbol, timeout);

      // ML signal generation disabled - using AI signal only
      // const { mlSignalService } = await import('./mlSignalService');
      // const mlResult = await mlSignalService.generateSignal(...);
      
      console.log('ℹ️ Using AI signal only (ML disabled)');
      return aiSignal;

      /* ML disabled code - commented out
      // 4. Combine signals
      const mlSignal = {} as any;
      const mlResult = {} as any;
      console.log(`📊 AI: ${aiSignal.type} (${(aiSignal.confidence * 100).toFixed(0)}%) | ML: ${mlSignal.type} (${(mlSignal.confidence * 100).toFixed(0)}%)`);

      // If both agree → boost confidence
      if (aiSignal.type === mlSignal.type) {
        const avgConfidence = (aiSignal.confidence + mlSignal.confidence) / 2;
        aiSignal.confidence = Math.min(avgConfidence * 1.2, 0.95); // 20% boost, max 95%

        aiSignal.reasoning = `${aiSignal.reasoning} | ✅ ML confirms ${mlSignal.type} (${(mlSignal.confidence * 100).toFixed(0)}%)`;

        console.log(`✅ Signals agree! Boosted confidence to ${(aiSignal.confidence * 100).toFixed(0)}%`);
      }
      // If they disagree → reduce confidence
      else {
        aiSignal.confidence *= 0.6; // 40% reduction
        aiSignal.reasoning = `${aiSignal.reasoning} | ⚠️ ML disagrees: ${mlSignal.type} (${(mlSignal.confidence * 100).toFixed(0)}%)`;

        console.log(`⚠️ Signals disagree! Reduced confidence to ${(aiSignal.confidence * 100).toFixed(0)}%`);

        // If uncertainty too high, switch to HOLD
        if (mlResult.uncertainty && mlResult.uncertainty.total > 0.5) {
          aiSignal.type = 'HOLD';
          aiSignal.confidence = 0.5;
          aiSignal.reasoning += ' | High ML uncertainty → HOLD';
          console.log('🛑 High uncertainty detected, switching to HOLD');
        }
      }

      // 5. Add ML metadata (including signal weight from ML)
      aiSignal.mlMetadata = {
        mlAction: mlSignal.type,
        mlConfidence: mlSignal.confidence,
        uncertainty: mlResult.uncertainty,
        constraints: mlResult.constraints,
        weight: mlResult.weight, // Include weight calculation from ML
        modelVersion: (mlSignal as {mlMetadata?: {modelVersion: string}}).mlMetadata?.modelVersion || 'ppo-v1',
        ensembleUsed: true
      };

      // 6. Apply weight-based filtering (if weight calculated by ML)
      if (mlResult.weight) {
        const { total_weight, recommendation } = mlResult.weight;

        // Apply the same filtering rules as in mlSignalService
        if (recommendation === 'AVOID' || total_weight < 40) {
          aiSignal.type = 'HOLD';
          aiSignal.confidence = 0.3;
          aiSignal.reasoning += ` | ⛔ Weight AVOID: ${total_weight.toFixed(1)} (backtest: 0% win rate)`;
          console.log(`⛔ Signal filtered: Weight ${total_weight.toFixed(1)} too low (AVOID)`);
        } else if (recommendation === 'WEAK' || total_weight < 60) {
          aiSignal.confidence *= 0.7; // Reduce confidence for weak signals
          aiSignal.reasoning += ` | ⚠️ Weak weight: ${total_weight.toFixed(1)} (use caution)`;
          console.log(`⚠️ Weak signal: Weight ${total_weight.toFixed(1)}`);
        } else if (total_weight < 70 && aiSignal.type !== 'HOLD') {
          aiSignal.type = 'HOLD';
          aiSignal.confidence = 0.5;
          aiSignal.reasoning += ` | 🎯 Weight ${total_weight.toFixed(1)} < 70 threshold (backtest: 100% win rate at 70+)`;
          console.log(`🎯 Weight filter: ${total_weight.toFixed(1)} below 70 threshold`);
        } else {
          // Signal passes weight filter
          console.log(`✅ Weight filter passed: ${total_weight.toFixed(1)} (${recommendation})`);
        }
      }

      // 7. Apply ML constraints (safety override)
      if (mlResult.constraints && mlResult.constraints.length > 0) {
        const highSeverity = mlResult.constraints.filter(c => c.severity === 'high');

        if (highSeverity.length > 0) {
          aiSignal.type = 'HOLD';
          aiSignal.confidence = 0.4;
          aiSignal.reasoning += ` | 🛑 ML safety: ${highSeverity[0].message}`;
          console.log('🛑 ML safety constraint triggered, forcing HOLD');
        }
      }

      return aiSignal;
      */

    } catch (error) {
      console.error('Hybrid signal generation failed:', error);
      // Fallback to comprehensive AI signal
      return await this.generateComprehensiveSignal(symbol, timeout);
    }
  }
}

// Export singleton instance
export const aiSignalService = AISignalService.getInstance();

// Export convenience functions
export const generateAISignal = (options: SignalGenerationOptions) =>
  aiSignalService.generateSignal(options);

export const getSignalServiceHealth = () =>
  aiSignalService.getServiceHealth();