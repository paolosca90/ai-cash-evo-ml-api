// @ts-nocheck
// Main entry point for the Continuous Retraining System

export * from './types';
export * from './RetrainingService';
export * from './DataCollector';
export * from './ModelTrainer';
export * from './ModelRepository';
export * from './DeploymentManager';
export * from './MonitoringService';
export * from './Scheduler';
export * from './Logger';
export * from './RetrainingFactory';

// Import TensorFlow.js if available
declare global {
  interface Window {
    tf?: unknown;
  }
}

// Default configuration
export const DEFAULT_RETRAINING_CONFIG = {
  schedule: {
    enabled: true,
    cronExpression: '0 2 * * 0', // Every Sunday at 2 AM
    timezone: 'UTC',
    runOnStartup: false
  },
  dataCollection: {
    lookbackDays: 7,
    minTradesThreshold: 50,
    maxTradesPerBatch: 1000,
    includeIncompleteTrades: false,
    dataQualityThreshold: 0.7
  },
  training: {
    epochs: 100,
    batchSize: 32,
    learningRate: 0.001,
    validationSplit: 0.2,
    earlyStoppingPatience: 10,
    hyperparameterOptimization: {
      enabled: true,
      maxTrials: 20,
      optimizationMetric: 'sharpe_ratio'
    }
  },
  evaluation: {
    minWinRate: 0.45,
    minProfitFactor: 1.2,
    maxDrawdownThreshold: 0.2,
    minTradesForValidation: 30,
    performanceDecayThreshold: 0.1
  },
  deployment: {
    autoDeploy: true,
    abTesting: {
      enabled: true,
      trafficSplit: 10,
      minConfidenceThreshold: 0.8
    },
    rollbackOnDegradation: true,
    cooldownPeriodHours: 24
  },
  monitoring: {
    alertsEnabled: true,
    performanceTracking: true,
    modelDriftDetection: {
      enabled: true,
      sensitivity: 0.1,
      checkIntervalHours: 6
    }
  }
};

// Quick start function
export async function quickStartRetraining(config = DEFAULT_RETRAINING_CONFIG) {
  const factory = RetrainingFactory.getInstance();

  // Validate configuration
  const validation = factory.validateConfig(config);
  if (!validation.valid) {
    throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
  }

  // Create and start the system
  const system = await factory.createSystem(config);
  await factory.startSystem(system);

  return {
    system,
    factory,
    stop: () => factory.stopSystem(system),
    getStatus: () => system.systemHealth,
    getMetrics: () => factory.getSystemMetrics(system)
  };
}

// Database schema setup (for reference)
export const DATABASE_SCHEMA = {
  tables: [
    {
      name: 'ml_model_versions',
      columns: [
        'id UUID PRIMARY KEY',
        'version VARCHAR(50) NOT NULL',
        'model_type VARCHAR(20) NOT NULL',
        'created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()',
        'trained_on TIMESTAMP WITH TIME ZONE NOT NULL',
        'data_points INTEGER NOT NULL',
        'metrics JSONB NOT NULL',
        'config JSONB NOT NULL',
        'hyperparameters JSONB',
        'status VARCHAR(20) DEFAULT \'training\'',
        'deployed_at TIMESTAMP WITH TIME ZONE',
        'rollback_reason TEXT',
        'performance_score INTEGER',
        'file_url TEXT',
        'checksum VARCHAR(64)'
      ]
    },
    {
      name: 'ab_tests',
      columns: [
        'id UUID PRIMARY KEY',
        'model_a_version VARCHAR(50) NOT NULL',
        'model_b_version VARCHAR(50) NOT NULL',
        'traffic_split INTEGER NOT NULL',
        'start_time TIMESTAMP WITH TIME ZONE NOT NULL',
        'end_time TIMESTAMP WITH TIME ZONE',
        'status VARCHAR(20) DEFAULT \'active\'',
        'winner VARCHAR(20)',
        'metrics JSONB'
      ]
    },
    {
      name: 'performance_alerts',
      columns: [
        'id UUID PRIMARY KEY',
        'type VARCHAR(50) NOT NULL',
        'severity VARCHAR(20) NOT NULL',
        'timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()',
        'message TEXT NOT NULL',
        'details JSONB',
        'acknowledged BOOLEAN DEFAULT FALSE',
        'resolved_at TIMESTAMP WITH TIME ZONE',
        'resolution TEXT'
      ]
    },
    {
      name: 'deployment_events',
      columns: [
        'id UUID PRIMARY KEY DEFAULT gen_random_uuid()',
        'version VARCHAR(50) NOT NULL',
        'action VARCHAR(50) NOT NULL',
        'status VARCHAR(20) NOT NULL',
        'details JSONB',
        'timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()'
      ]
    },
    {
      name: 'model_performance_metrics',
      columns: [
        'id UUID PRIMARY KEY DEFAULT gen_random_uuid()',
        'version VARCHAR(50) NOT NULL',
        'timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()',
        'metrics JSONB NOT NULL'
      ]
    }
  ]
};

// Environment variables that need to be set
export const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY' // For admin operations
];

// Helper functions
export async function checkEnvironment(): Promise<{ valid: boolean; missing: string[] }> {
  const missing: string[] = [];

  if (typeof window !== 'undefined') {
    // Browser environment
    for (const varName of REQUIRED_ENV_VARS) {
      if (!process.env[varName] && !(window as unknown)[varName]) {
        missing.push(varName);
      }
    }
  } else {
    // Node.js environment
    for (const varName of REQUIRED_ENV_VARS) {
      if (!process.env[varName]) {
        missing.push(varName);
      }
    }
  }

  return {
    valid: missing.length === 0,
    missing
  };
}

export function isTensorFlowAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.tf !== 'undefined';
}

// Example usage
export const EXAMPLE_USAGE = `
// Basic usage
import { quickStartRetraining, DEFAULT_RETRAINING_CONFIG } from './retraining';

async function main() {
  // Check environment
  const envCheck = await checkEnvironment();
  if (!envCheck.valid) {
    console.error('Missing environment variables:', envCheck.missing);
    return;
  }

  // Check TensorFlow availability
  if (!isTensorFlowAvailable()) {
    console.error('TensorFlow.js is not loaded');
    return;
  }

  try {
    // Start the retraining system
    const { system, stop, getStatus } = await quickStartRetraining({
      ...DEFAULT_RETRAINING_CONFIG,
      schedule: {
        ...DEFAULT_RETRAINING_CONFIG.schedule,
        enabled: true,
        cronExpression: '0 2 * * 0' // Weekly on Sunday at 2 AM
      }
    });

    console.log('Retraining system started successfully');
    console.log('System status:', getStatus());

    // Keep the system running
    // To stop: await stop();

  } catch (error) {
    console.error('Failed to start retraining system:', error);
  }
}

main();
`;

// Error types
export class RetrainingError extends Error {
  constructor(
    message: string,
    public type: 'CONFIGURATION' | 'DATA' | 'TRAINING' | 'DEPLOYMENT' | 'MONITORING' | 'SYSTEM',
    public details?: unknown
  ) {
    super(message);
    this.name = 'RetrainingError';
  }
}

export class ConfigurationError extends RetrainingError {
  constructor(message: string, details?: unknown) {
    super(message, 'CONFIGURATION', details);
    this.name = 'ConfigurationError';
  }
}

export class DataError extends RetrainingError {
  constructor(message: string, details?: unknown) {
    super(message, 'DATA', details);
    this.name = 'DataError';
  }
}

export class TrainingError extends RetrainingError {
  constructor(message: string, details?: unknown) {
    super(message, 'TRAINING', details);
    this.name = 'TrainingError';
  }
}

export class DeploymentError extends RetrainingError {
  constructor(message: string, details?: unknown) {
    super(message, 'DEPLOYMENT', details);
    this.name = 'DeploymentError';
  }
}

export class MonitoringError extends RetrainingError {
  constructor(message: string, details?: unknown) {
    super(message, 'MONITORING', details);
    this.name = 'MonitoringError';
  }
}

// Utility functions
export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

export function formatMetrics(metrics: unknown): string {
  return [
    `Win Rate: ${(metrics.win_rate * 100).toFixed(1)}%`,
    `Profit Factor: ${metrics.profit_factor.toFixed(2)}`,
    `Sharpe Ratio: ${metrics.sharpe_ratio.toFixed(2)}`,
    `Max Drawdown: ${(metrics.max_drawdown * 100).toFixed(1)}%`,
    `Total Trades: ${metrics.total_trades}`
  ].join(', ');
}

export function generateVersionNumber(): string {
  const date = new Date();
  const major = date.getFullYear() - 2020;
  const minor = date.getMonth() + 1;
  const patch = date.getDate();
  const build = date.getHours() * 60 + date.getMinutes();
  return `${major}.${minor}.${patch}.${build}`;
}

// Version info
export const RETRAINING_SYSTEM_VERSION = '1.0.0';
export const COMPATIBILITY = {
  node: '>=16.0.0',
  tensorflow: '^4.0.0',
  supabase: '^2.0.0'
};

// Export everything for convenience
export default {
  quickStartRetraining,
  DEFAULT_RETRAINING_CONFIG,
  DATABASE_SCHEMA,
  REQUIRED_ENV_VARS,
  checkEnvironment,
  isTensorFlowAvailable,
  EXAMPLE_USAGE,
  RetrainingError,
  ConfigurationError,
  DataError,
  TrainingError,
  DeploymentError,
  MonitoringError,
  formatDuration,
  formatMetrics,
  generateVersionNumber,
  RETRAINING_SYSTEM_VERSION,
  COMPATIBILITY
};