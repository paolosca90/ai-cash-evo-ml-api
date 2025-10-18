import { useState, useEffect, useCallback, useRef } from 'react';
import { UnifiedFeatureEngineer } from '../lib/feature-engineering/UnifiedFeatureEngineer';
import { NormalizedFeatureVector, FeatureImportanceResult } from '../lib/feature-engineering/UnifiedFeatureEngineer';
import {
  MarketData,
  TechnicalIndicators,
  SmartMoneyConcepts,
  LLMSignals,
  MarketRegime,
  SessionInfo
} from '../types/feature-engineering';

interface UseFeatureEngineeringProps {
  symbol: string;
  timeframe: string;
  enableAutoUpdate?: boolean;
  updateInterval?: number;
  config?: {
    enableTechnicalIndicators?: boolean;
    enableSessionFeatures?: boolean;
    enableSmartMoneyFeatures?: boolean;
    enableSentimentFeatures?: boolean;
    enableRegimeFeatures?: boolean;
    normalizeFeatures?: boolean;
    featureImportanceThreshold?: number;
  };
}

interface FeatureEngineeringResult {
  featureVector: NormalizedFeatureVector | null;
  mlVector: number[] | null;
  isCalculating: boolean;
  error: string | null;
  lastUpdate: number | null;
  featureWeights: FeatureWeight[];
  featureStatistics: Record<string, FeatureStatistic>;
}

interface FeatureWeight {
  featureName: string;
  weight: number;
  importance: number;
  direction: 'POSITIVE' | 'NEGATIVE';
}

interface FeatureStatistic {
  mean: number;
  std: number;
  min: number;
  max: number;
  count: number;
  lastUpdated: number;
}

export function useFeatureEngineering({
  symbol,
  timeframe,
  enableAutoUpdate = true,
  updateInterval = 60000, // 1 minute default
  config = {}
}: UseFeatureEngineeringProps): FeatureEngineeringResult & {
  calculateFeatureVector: (
    marketData: MarketData,
    technicalIndicators: TechnicalIndicators,
    sessionInfo: SessionInfo,
    smartMoneyConcepts: SmartMoneyConcepts,
    llmSignals: LLMSignals,
    marketRegime: MarketRegime
  ) => Promise<void>;
  calculateFeatureImportance: (
    featureVectors: NormalizedFeatureVector[],
    targetVariable: number[]
  ) => FeatureImportanceResult[];
  exportFeatureVector: () => string | null;
  resetFeatureHistory: () => void;
  updateFeatureWeights: (updates: FeatureWeight[]) => void;
} {
  const [featureVector, setFeatureVector] = useState<NormalizedFeatureVector | null>(null);
  const [mlVector, setMlVector] = useState<number[] | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [featureWeights, setFeatureWeights] = useState<FeatureWeight[]>([]);
  const [featureStatistics, setFeatureStatistics] = useState<Record<string, FeatureStatistic>>({});

  const featureEngineerRef = useRef<UnifiedFeatureEngineer | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize feature engineer
  useEffect(() => {
    try {
      featureEngineerRef.current = new UnifiedFeatureEngineer(config);
      setFeatureWeights(featureEngineerRef.current.getFeatureWeights());
    } catch (err) {
      setError(`Failed to initialize feature engineer: ${err}`);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [config]);

  // Auto-update feature vector
  useEffect(() => {
    if (enableAutoUpdate && updateInterval > 0) {
      intervalRef.current = setInterval(() => {
        // This would typically fetch new data from your data sources
        // For now, we'll just update the last update timestamp
        setLastUpdate(Date.now());
      }, updateInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enableAutoUpdate, updateInterval]);

  const calculateFeatureVector = useCallback(async (
    marketData: MarketData,
    technicalIndicators: TechnicalIndicators,
    sessionInfo: SessionInfo,
    smartMoneyConcepts: SmartMoneyConcepts,
    llmSignals: LLMSignals,
    marketRegime: MarketRegime
  ): Promise<void> => {
    if (!featureEngineerRef.current) {
      setError('Feature engineer not initialized');
      return;
    }

    setIsCalculating(true);
    setError(null);

    try {
      const newFeatureVector = featureEngineerRef.current.generateFeatureVector(
        marketData,
        technicalIndicators,
        sessionInfo,
        smartMoneyConcepts,
        llmSignals,
        marketRegime
      );

      const newMlVector = featureEngineerRef.current.createMLReadyVector(newFeatureVector);
      const newStatistics = featureEngineerRef.current.getFeatureStatistics();

      setFeatureVector(newFeatureVector);
      setMlVector(newMlVector);
      setFeatureStatistics(newStatistics);
      setLastUpdate(Date.now());
    } catch (err) {
      setError(`Failed to calculate feature vector: ${err}`);
    } finally {
      setIsCalculating(false);
    }
  }, []);

  const calculateFeatureImportance = useCallback((
    featureVectors: NormalizedFeatureVector[],
    targetVariable: number[]
  ): FeatureImportanceResult[] => {
    if (!featureEngineerRef.current) {
      setError('Feature engineer not initialized');
      return [];
    }

    try {
      return featureEngineerRef.current.calculateFeatureImportance(featureVectors, targetVariable);
    } catch (err) {
      setError(`Failed to calculate feature importance: ${err}`);
      return [];
    }
  }, []);

  const exportFeatureVector = useCallback((): string | null => {
    if (!featureEngineerRef.current || !featureVector) {
      return null;
    }

    try {
      return featureEngineerRef.current.exportFeatureVector(featureVector);
    } catch (err) {
      setError(`Failed to export feature vector: ${err}`);
      return null;
    }
  }, [featureVector]);

  const resetFeatureHistory = useCallback((): void => {
    if (!featureEngineerRef.current) {
      setError('Feature engineer not initialized');
      return;
    }

    featureEngineerRef.current.resetFeatureHistory();
    setFeatureStatistics({});
  }, []);

  const updateFeatureWeights = useCallback((updates: FeatureWeight[]): void => {
    if (!featureEngineerRef.current) {
      setError('Feature engineer not initialized');
      return;
    }

    try {
      featureEngineerRef.current.updateFeatureWeights(updates);
      setFeatureWeights(featureEngineerRef.current.getFeatureWeights());
    } catch (err) {
      setError(`Failed to update feature weights: ${err}`);
    }
  }, []);

  return {
    featureVector,
    mlVector,
    isCalculating,
    error,
    lastUpdate,
    featureWeights,
    featureStatistics,
    calculateFeatureVector,
    calculateFeatureImportance,
    exportFeatureVector,
    resetFeatureHistory,
    updateFeatureWeights
  };
}