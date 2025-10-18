import { useState, useEffect } from 'react';
import { ModelInitializer } from '@/lib/rl-trading/ModelInitializer';
import { TFInferenceEngine } from '@/lib/rl-trading/TFInferenceEngine';
import { UnifiedFeatureEngineer } from '@/lib/feature-engineering/UnifiedFeatureEngineer';
import { RLInferenceConfig } from '@/types/rl-trading';

/**
 * React Hook for RL Model Management
 * Handles initialization, loading, and inference
 */

export interface UseRLModelsReturn {
  isReady: boolean;
  isInitializing: boolean;
  error: string | null;
  inferenceEngine: TFInferenceEngine | null;
  initializeModels: () => Promise<void>;
  memoryInfo: { numTensors: number; numBytes: number } | null;
}

export function useRLModels(): UseRLModelsReturn {
  const [isReady, setIsReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inferenceEngine, setInferenceEngine] = useState<TFInferenceEngine | null>(null);
  const [memoryInfo, setMemoryInfo] = useState<{ numTensors: number; numBytes: number } | null>(null);

  const initializeModels = async () => {
    if (isInitializing || isReady) return;

    setIsInitializing(true);
    setError(null);

    try {
      console.log('🚀 Initializing RL models...');

      // Check if models exist, initialize if not
      await ModelInitializer.ensureModelsExist();

      // Create inference engine
      const config: RLInferenceConfig = {
        modelPath: 'default',
        batchSize: 1,
        maxPositionSize: 0.1,
        riskThreshold: 0.7,
        uncertaintyThreshold: 0.3,
        useEnsemble: true,
        enableConstraints: true,
        timeout: 5000
      };

      const featureEngineer = new UnifiedFeatureEngineer();
      const engine = new TFInferenceEngine(config, featureEngineer);

      await engine.initialize();

      setInferenceEngine(engine);
      setIsReady(true);

      // Get memory info
      const mem = engine.getMemoryInfo();
      setMemoryInfo(mem);

      console.log('✅ RL models ready');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      console.error('❌ Failed to initialize RL models:', err);
    } finally {
      setIsInitializing(false);
    }
  };

  // Auto-initialize on mount
  useEffect(() => {
    initializeModels();

    // Cleanup on unmount
    return () => {
      if (inferenceEngine) {
        inferenceEngine.dispose();
        setInferenceEngine(null);
        setIsReady(false);
      }
    };
  }, []);

  // Update memory info periodically
  useEffect(() => {
    if (!isReady || !inferenceEngine) return;

    const interval = setInterval(() => {
      const mem = inferenceEngine.getMemoryInfo();
      setMemoryInfo(mem);
    }, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, [isReady, inferenceEngine]);

  return {
    isReady,
    isInitializing,
    error,
    inferenceEngine,
    initializeModels,
    memoryInfo
  };
}
