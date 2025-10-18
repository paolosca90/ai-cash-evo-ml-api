import { useState, useEffect, useCallback, useRef } from 'react';
import {
  RetrainingFactory,
  RetrainingConfig,
  RetrainingSystem,
  RetrainingJob,
  ModelVersion,
  PerformanceAlert,
  RetrainingEvent
} from '../lib/retraining';

interface UseContinuousRetrainingState {
  system: RetrainingSystem | null;
  isLoading: boolean;
  error: string | null;
  isRunning: boolean;
  currentJob: RetrainingJob | null;
  metrics: {
    uptime: number;
    modelsDeployed: number;
    activeAlerts: number;
    scheduledJobs: number;
  } | null;
}

interface UseContinuousRetrainingActions {
  startSystem: (config?: RetrainingConfig) => Promise<void>;
  stopSystem: () => Promise<void>;
  runRetraining: () => Promise<RetrainingJob>;
  startABTest: (modelA: string, modelB: string, trafficSplit?: number) => Promise<void>;
  rollbackModel: (reason: string) => Promise<void>;
  acknowledgeAlert: (alertId: string) => Promise<void>;
  resolveAlert: (alertId: string, resolution: string) => Promise<void>;
  getSystemReport: () => Promise<{
    systemHealth: {
      status: 'healthy' | 'warning' | 'error';
      issues: string[];
      lastCheck: string;
    };
    models: {
      total: number;
      active: number;
      deployed: number;
    };
    performance: {
      uptime: number;
      lastTraining: string;
      accuracy: number;
    };
    alerts: PerformanceAlert[];
  }>;
  refreshSystem: () => Promise<void>;
}

export function useContinuousRetraining(
  autoStart: boolean = false,
  config?: RetrainingConfig
): UseContinuousRetrainingState & UseContinuousRetrainingActions {
  const [state, setState] = useState<UseContinuousRetrainingState>({
    system: null,
    isLoading: false,
    error: null,
    isRunning: false,
    currentJob: null,
    metrics: null
  });

  const factoryRef = useRef<RetrainingFactory | null>(null);
  const systemRef = useRef<RetrainingSystem | null>(null);
  const eventHandlersRef = useRef<Set<(event: RetrainingEvent) => void>>(new Set());

  // Initialize factory
  useEffect(() => {
    if (!factoryRef.current) {
      factoryRef.current = RetrainingFactory.getInstance();
    }
  }, []);

  // Event handling
  const addEventHandler = useCallback((handler: (event: RetrainingEvent) => void) => {
    eventHandlersRef.current.add(handler);
    return () => {
      eventHandlersRef.current.delete(handler);
    };
  }, []);

  const emitEvent = useCallback((event: RetrainingEvent) => {
    eventHandlersRef.current.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('Event handler error:', error);
      }
    });
  }, []);

  // Auto-start if requested
  useEffect(() => {
    if (autoStart && factoryRef.current && !state.system) {
      startSystem(config);
    }
  }, [autoStart, config, state.system, startSystem]);

  const startSystem = useCallback(async (customConfig?: RetrainingConfig) => {
    if (!factoryRef.current) {
      setState(prev => ({ ...prev, error: 'Factory not initialized' }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const factory = factoryRef.current;
      const defaultConfig = factory.getDefaultConfig();
      const finalConfig = customConfig || defaultConfig;

      // Validate configuration
      const validation = factory.validateConfig(finalConfig);
      if (!validation.valid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }

      // Create system
      const system = await factory.createSystem(finalConfig);
      systemRef.current = system;

      // Set up event handlers
      const services = (system as RetrainingSystem & {
        _services: {
          retrainingService: {
            on: (handler: (event: RetrainingEvent) => void) => void;
          };
        };
      })._services;
      services.retrainingService.on(emitEvent);

      // Start system
      await factory.startSystem(system);

      // Get initial metrics
      const metrics = await factory.getSystemMetrics(system);

      setState({
        system,
        isLoading: false,
        error: null,
        isRunning: true,
        currentJob: null,
        metrics
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        isRunning: false
      }));
    }
  }, [emitEvent]);

  const stopSystem = useCallback(async () => {
    if (!factoryRef.current || !systemRef.current) {
      return;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const factory = factoryRef.current;
      const system = systemRef.current;

      await factory.stopSystem(system);

      setState({
        system: null,
        isLoading: false,
        error: null,
        isRunning: false,
        currentJob: null,
        metrics: null
      });

      systemRef.current = null;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
    }
  }, []);

  const runRetraining = useCallback(async (): Promise<RetrainingJob> => {
    if (!systemRef.current) {
      throw new Error('System not started');
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const services = (systemRef.current as RetrainingSystem & {
        _services: {
          retrainingService: {
            startRetraining: () => Promise<RetrainingJob>;
          };
        };
      })._services;
      const job = await services.retrainingService.startRetraining();

      setState(prev => ({
        ...prev,
        currentJob: job,
        isLoading: false
      }));

      return job;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      throw error;
    }
  }, []);

  const startABTest = useCallback(async (
    modelA: string,
    modelB: string,
    trafficSplit: number = 10
  ): Promise<void> => {
    if (!systemRef.current) {
      throw new Error('System not started');
    }

      const services = (systemRef.current as RetrainingSystem & {
        _services: {
          deploymentManager: {
            startABTest: (modelA: string, modelB: string, trafficSplit: number) => Promise<void>;
          };
        };
      })._services;
      await services.deploymentManager.startABTest(modelA, modelB, trafficSplit);
  }, []);

  const rollbackModel = useCallback(async (reason: string): Promise<void> => {
    if (!systemRef.current) {
      throw new Error('System not started');
    }

    const services = (systemRef.current as RetrainingSystem & {
        _services: {
          deploymentManager: {
            rollbackModel: (reason: string) => Promise<void>;
          };
        };
      })._services;
      await services.deploymentManager.rollbackModel(reason);
  }, []);

  const acknowledgeAlert = useCallback(async (alertId: string): Promise<void> => {
    if (!systemRef.current) {
      throw new Error('System not started');
    }

    const services = (systemRef.current as RetrainingSystem & {
        _services: {
          monitoringService: {
            acknowledgeAlert: (alertId: string) => Promise<void>;
          };
        };
      })._services;
      await services.monitoringService.acknowledgeAlert(alertId);
  }, []);

  const resolveAlert = useCallback(async (alertId: string, resolution: string): Promise<void> => {
    if (!systemRef.current) {
      throw new Error('System not started');
    }

    const services = (systemRef.current as RetrainingSystem & {
        _services: {
          monitoringService: {
            resolveAlert: (alertId: string, resolution: string) => Promise<void>;
          };
        };
      })._services;
      await services.monitoringService.resolveAlert(alertId, resolution);
  }, []);

  const getSystemReport = useCallback(async () => {
    if (!factoryRef.current || !systemRef.current) {
      throw new Error('System not started');
    }

    const factory = factoryRef.current;
    const system = systemRef.current;
    return await factory.getSystemReport(system);
  }, []);

  const refreshSystem = useCallback(async () => {
    if (!factoryRef.current || !systemRef.current) {
      return;
    }

    try {
      const factory = factoryRef.current;
      const system = systemRef.current;

      // Get updated metrics
      const metrics = await factory.getSystemMetrics(system);

      // Get current job
      const services = (system as RetrainingSystem & {
        _services: {
          retrainingService: {
            getCurrentJob: () => Promise<RetrainingJob | null>;
          };
        };
      })._services;
      const currentJob = await services.retrainingService.getCurrentJob();

      setState(prev => ({
        ...prev,
        metrics,
        currentJob
      }));

    } catch (error) {
      console.error('Failed to refresh system:', error);
    }
  }, []);

  // Auto-refresh metrics
  useEffect(() => {
    if (state.isRunning) {
      const interval = setInterval(refreshSystem, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [state.isRunning, refreshSystem]);

  return {
    ...state,
    startSystem,
    stopSystem,
    runRetraining,
    startABTest,
    rollbackModel,
    acknowledgeAlert,
    resolveAlert,
    getSystemReport,
    refreshSystem,
    addEventHandler
  };
}

// Additional hooks for specific features
export function useRetrainingEvents() {
  const [events, setEvents] = useState<RetrainingEvent[]>([]);
  const maxEvents = 100;

  const addEvent = useCallback((event: RetrainingEvent) => {
    setEvents(prev => [...prev.slice(-maxEvents + 1), event]);
  }, [maxEvents]);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return { events, addEvent, clearEvents };
}

export function useModelVersions() {
  const [versions, setVersions] = useState<ModelVersion[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshVersions = useCallback(async () => {
    setLoading(true);
    try {
      // This would typically query the model repository
      // For now, simulate with empty array
      setVersions([]);
    } catch (error) {
      console.error('Failed to refresh model versions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshVersions();
  }, [refreshVersions]);

  return { versions, loading, refresh: refreshVersions };
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshAlerts = useCallback(async () => {
    setLoading(true);
    try {
      // This would typically query the monitoring service
      // For now, simulate with empty array
      setAlerts([]);
    } catch (error) {
      console.error('Failed to refresh alerts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const acknowledgeAlert = useCallback(async (alertId: string) => {
    try {
      // This would call the monitoring service
      setAlerts(prev =>
        prev.map(alert =>
          alert.id === alertId ? { ...alert, acknowledged: true } : alert
        )
      );
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  }, []);

  const resolveAlert = useCallback(async (alertId: string, resolution: string) => {
    try {
      // This would call the monitoring service
      setAlerts(prev =>
        prev.map(alert =>
          alert.id === alertId
            ? { ...alert, resolvedAt: new Date().toISOString(), resolution }
            : alert
        )
      );
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  }, []);

  useEffect(() => {
    refreshAlerts();
    const interval = setInterval(refreshAlerts, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [refreshAlerts]);

  return {
    alerts,
    loading,
    refresh: refreshAlerts,
    acknowledge: acknowledgeAlert,
    resolve: resolveAlert
  };
}

// Helper hook for system health
export function useSystemHealth() {
  const [health, setHealth] = useState<{
    status: 'healthy' | 'warning' | 'error';
    issues: string[];
    lastCheck: string;
  }>({
    status: 'healthy',
    issues: [],
    lastCheck: new Date().toISOString()
  });

  const refreshHealth = useCallback(async () => {
    try {
      // This would typically call the monitoring service
      // For now, simulate with healthy status
      setHealth({
        status: 'healthy',
        issues: [],
        lastCheck: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to refresh system health:', error);
      setHealth({
        status: 'error',
        issues: ['Failed to check system health'],
        lastCheck: new Date().toISOString()
      });
    }
  }, []);

  useEffect(() => {
    refreshHealth();
    const interval = setInterval(refreshHealth, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, [refreshHealth]);

  return { health, refresh: refreshHealth };
}

// Export types for external use
export type {
  UseContinuousRetrainingState,
  UseContinuousRetrainingActions
};