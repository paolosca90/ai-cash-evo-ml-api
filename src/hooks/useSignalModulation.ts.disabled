/**
 * useSignalModulation Hook
 *
 * React hook for integrating the Signal Modulation System with existing components.
 * Provides easy-to-use interface for modulating trading signals with sentiment, risk, and confidence factors.
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { signalModulationIntegration, ModulationInput, ModulationResult } from '@/lib/signal-modulation/SignalModulationIntegration';
import { BaseSignal, SentimentAnalysis, RiskAssessment, MarketConditions } from '@/lib/signal-modulation/SignalModulationService';
import { MarketData, TechnicalIndicators, SmartMoneyConcepts, LLMSignals, MarketRegime, SessionInfo } from '@/types/feature-engineering';
import { AISignal } from '@/types/trading';
import { UnifiedFeatureEngineer, NormalizedFeatureVector } from '@/lib/feature-engineering/UnifiedFeatureEngineer';
import { useToast } from '@/components/ui/use-toast';

export interface UseSignalModulationProps {
  symbol: string;
  enableAutoModulation?: boolean;
  modulationInterval?: number;
  enablePerformanceTracking?: boolean;
  enableCaching?: boolean;
  config?: {
    enableLLMSentiment?: boolean;
    enableTechnicalAnalysis?: boolean;
    enableSmartMoneyAnalysis?: boolean;
    enableMarketRegimeAnalysis?: boolean;
    autoSaveResults?: boolean;
  };
}

interface PerformanceMetrics {
  totalSignals: number;
  successfulModulations: number;
  averageConfidence: number;
  averageProcessingTime: number;
  totalProfit: number;
  winRate: number;
  sharpeRatio: number;
  accuracy: number;
}

interface SignalHistoryItem {
  id: string;
  timestamp: number;
  symbol: string;
  originalSignal: BaseSignal;
  modulatedSignal: ModulationResult;
  outcome?: number;
  confidence: number;
  processingTime: number;
}

export interface ModulationState {
  isLoading: boolean;
  error: string | null;
  currentResult: ModulationResult | null;
  performanceMetrics: PerformanceMetrics;
  signalHistory: SignalHistoryItem[];
  isModulating: boolean;
  lastModulationTime: number | null;
}

export interface ModulationControls {
  modulateSignal: (signal: BaseSignal, additionalData?: Partial<ModulationInput>) => Promise<ModulationResult>;
  startAutoModulation: () => void;
  stopAutoModulation: () => void;
  clearError: () => void;
  resetModulation: () => void;
  updateConfig: (config: Partial<UseSignalModulationProps['config']>) => void;
  getModulationHistory: () => Promise<SignalHistoryItem[]>;
  recordSignalOutcome: (signalId: string, outcome: number) => Promise<void>;
}

export function useSignalModulation({
  symbol,
  enableAutoModulation = false,
  modulationInterval = 30000, // 30 seconds
  enablePerformanceTracking = true,
  enableCaching = true,
  config = {},
}: UseSignalModulationProps): ModulationState & ModulationControls {
  const [state, setState] = useState<ModulationState>({
    isLoading: false,
    error: null,
    currentResult: null,
    performanceMetrics: null,
    signalHistory: [],
    isModulating: false,
    lastModulationTime: null,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const featureEngineerRef = useRef<UnifiedFeatureEngineer | null>(null);
  const { toast } = useToast();

  // Initialize feature engineer
  useEffect(() => {
    try {
      featureEngineerRef.current = new UnifiedFeatureEngineer();
    } catch (error) {
      console.error('Failed to initialize feature engineer:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to initialize feature engineer',
      }));
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Update integration config
  useEffect(() => {
    try {
      signalModulationIntegration.updateConfig(config);
    } catch (error) {
      console.error('Failed to update modulation config:', error);
    }
  }, [config]);

  // Auto-modulation effect
  useEffect(() => {
    if (enableAutoModulation && modulationInterval > 0) {
      intervalRef.current = setInterval(async () => {
        // This would typically fetch new signals from your signal source
        // For now, we'll just update performance metrics
        if (enablePerformanceTracking) {
          await updatePerformanceMetrics();
        }
      }, modulationInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enableAutoModulation, modulationInterval, enablePerformanceTracking, updatePerformanceMetrics]);

  // Update performance metrics
  const updatePerformanceMetrics = useCallback(async () => {
    try {
      const metrics = signalModulationIntegration.getPerformanceMetrics();
      setState(prev => ({
        ...prev,
        performanceMetrics: metrics,
      }));
    } catch (error) {
      console.error('Failed to update performance metrics:', error);
    }
  }, []);

  // Main modulation function
  const modulateSignal = useCallback(async (
    signal: BaseSignal,
    additionalData: Partial<ModulationInput> = {}
  ): Promise<ModulationResult> => {
    if (!featureEngineerRef.current) {
      const error = 'Feature engineer not initialized';
      setState(prev => ({ ...prev, error, isModulating: false }));
      throw new Error(error);
    }

    setState(prev => ({ ...prev, isModulating: true, error: null }));

    try {
      // Prepare modulation input
      const modulationInput: ModulationInput = {
        baseSignal: signal,
        ...additionalData,
      };

      // Apply modulation
      const result = await signalModulationIntegration.modulateSignal(modulationInput);

      // Update state
      setState(prev => ({
        ...prev,
        currentResult: result,
        isModulating: false,
        lastModulationTime: Date.now(),
        error: null,
      }));

      // Show toast notification
      toast({
        title: "Signal Modulated Successfully",
        description: `${signal.symbol} ${signal.type} modulated with intensity ${result.modulatedSignal.final_intensity.toFixed(3)}`,
        variant: "default",
      });

      // Update performance metrics if enabled
      if (enablePerformanceTracking) {
        await updatePerformanceMetrics();
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isModulating: false,
      }));

      toast({
        title: "Signal Modulation Failed",
        description: errorMessage,
        variant: "destructive",
      });

      throw error;
    }
  }, [enablePerformanceTracking, toast, updatePerformanceMetrics]);

  // Start auto-modulation
  const startAutoModulation = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setState(prev => ({ ...prev, error: null }));

    intervalRef.current = setInterval(async () => {
      try {
        // This is where you would fetch new signals to modulate
        // For demonstration, we'll just update metrics
        if (enablePerformanceTracking) {
          await updatePerformanceMetrics();
        }
      } catch (error) {
        console.error('Auto-modulation error:', error);
      }
    }, modulationInterval);
  }, [enablePerformanceTracking, modulationInterval, updatePerformanceMetrics]);

  // Stop auto-modulation
  const stopAutoModulation = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Reset modulation state
  const resetModulation = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentResult: null,
      error: null,
      isModulating: false,
      lastModulationTime: null,
    }));
  }, []);

  // Update configuration
  const updateConfig = useCallback((newConfig: Partial<UseSignalModulationProps['config']>) => {
    try {
      signalModulationIntegration.updateConfig(newConfig);
      toast({
        title: "Configuration Updated",
        description: "Signal modulation configuration has been updated",
        variant: "default",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Configuration update failed';
      setState(prev => ({ ...prev, error: errorMessage }));
      toast({
        title: "Configuration Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [toast]);

  // Get modulation history
  const getModulationHistory = useCallback(async (): Promise<SignalHistoryItem[]> => {
    try {
      // This would typically fetch from your database
      // For now, return empty array
      return [];
    } catch (error) {
      console.error('Failed to get modulation history:', error);
      return [];
    }
  }, []);

  // Record signal outcome
  const recordSignalOutcome = useCallback(async (signalId: string, outcome: number): Promise<void> => {
    try {
      // This would typically save to your database
      console.log(`Recording outcome for signal ${signalId}: ${outcome}%`);

      // Update performance metrics
      if (enablePerformanceTracking) {
        await updatePerformanceMetrics();
      }

      toast({
        title: "Signal Outcome Recorded",
        description: `Signal ${signalId} outcome: ${outcome > 0 ? '+' : ''}${outcome.toFixed(2)}%`,
        variant: outcome > 0 ? "default" : "destructive",
      });
    } catch (error) {
      console.error('Failed to record signal outcome:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to record signal outcome',
      }));
    }
  }, [enablePerformanceTracking, toast, updatePerformanceMetrics]);

  // Convenience function to modulate AI signals
  const modulateAISignal = useCallback(async (
    aiSignal: AISignal,
    marketData?: MarketData,
    technicalIndicators?: TechnicalIndicators,
    additionalData?: Partial<ModulationInput>
  ): Promise<ModulationResult> => {
    // Convert AI signal to base signal format
    const baseSignal: BaseSignal = {
      id: aiSignal.id || `${symbol}-${Date.now()}`,
      symbol: aiSignal.symbol || symbol,
      type: aiSignal.type || 'HOLD',
      confidence: aiSignal.confidence || 70,
      intensity: aiSignal.intensity || 1.0,
      entry_price: aiSignal.price,
      stop_loss: aiSignal.stop_loss,
      take_profit: aiSignal.take_profit,
      timestamp: new Date(aiSignal.timestamp || Date.now()),
      source: aiSignal.aiModel || 'AI Signal',
      metadata: aiSignal,
    };

    return modulateSignal(baseSignal, {
      marketData,
      technicalIndicators,
      ...additionalData,
    });
  }, [symbol, modulateSignal]);

  return {
    ...state,
    modulateSignal,
    modulateAISignal,
    startAutoModulation,
    stopAutoModulation,
    clearError,
    resetModulation,
    updateConfig,
    getModulationHistory,
    recordSignalOutcome,
  };
}

// Export convenience functions for creating modulation inputs
export const createModulationInput = (
  baseSignal: BaseSignal,
  options: {
    marketData?: MarketData;
    technicalIndicators?: TechnicalIndicators;
    sessionInfo?: SessionInfo;
    smartMoneyConcepts?: SmartMoneyConcepts;
    llmSignals?: LLMSignals;
    marketRegime?: MarketRegime;
    featureVector?: NormalizedFeatureVector;
    newsArticles?: Array<{ title: string; description: string; source?: string; publishedAt?: string }>;
  } = {}
): ModulationInput => ({
  baseSignal,
  ...options,
});

// Export utility functions for creating default values
export const createDefaultModulationInput = (symbol: string): ModulationInput => ({
  baseSignal: {
    id: `${symbol}-${Date.now()}`,
    symbol,
    type: 'HOLD',
    confidence: 70,
    intensity: 1.0,
    timestamp: new Date(),
    source: 'Manual Input',
  },
});

// Export configuration presets
export const MODULATION_PRESETS = {
  CONSERVATIVE: {
    enableLLMSentiment: true,
    enableTechnicalAnalysis: true,
    enableSmartMoneyAnalysis: true,
    enableMarketRegimeAnalysis: true,
    autoSaveResults: true,
  },
  AGGRESSIVE: {
    enableLLMSentiment: true,
    enableTechnicalAnalysis: false,
    enableSmartMoneyAnalysis: true,
    enableMarketRegimeAnalysis: false,
    autoSaveResults: true,
  },
  BALANCED: {
    enableLLMSentiment: true,
    enableTechnicalAnalysis: true,
    enableSmartMoneyAnalysis: true,
    enableMarketRegimeAnalysis: true,
    autoSaveResults: true,
  },
  TECHNICAL_ONLY: {
    enableLLMSentiment: false,
    enableTechnicalAnalysis: true,
    enableSmartMoneyAnalysis: false,
    enableMarketRegimeAnalysis: true,
    autoSaveResults: true,
  },
  SENTIMENT_ONLY: {
    enableLLMSentiment: true,
    enableTechnicalAnalysis: false,
    enableSmartMoneyAnalysis: false,
    enableMarketRegimeAnalysis: false,
    autoSaveResults: true,
  },
};

export default useSignalModulation;