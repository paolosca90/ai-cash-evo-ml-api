// @ts-nocheck
import { RetrainingConfig, RetrainingSystem } from './types';
import { RetrainingService } from './RetrainingService';
import { DataCollector } from './DataCollector';
import { ModelTrainer } from './ModelTrainer';
import { ModelRepository } from './ModelRepository';
import { DeploymentManager } from './DeploymentManager';
import { MonitoringService } from './MonitoringService';
import { Scheduler } from './Scheduler';
import { Logger } from './Logger';

export class RetrainingFactory {
  private static instance: RetrainingFactory;
  private system: RetrainingSystem | null = null;
  private logger: Logger;

  private constructor() {
    this.logger = new Logger({
      logToConsole: true,
      logToDatabase: false,
      maxLogs: 1000
    });
  }

  static getInstance(): RetrainingFactory {
    if (!RetrainingFactory.instance) {
      RetrainingFactory.instance = new RetrainingFactory();
    }
    return RetrainingFactory.instance;
  }

  async createSystem(config: RetrainingConfig): Promise<RetrainingSystem> {
    this.logger.info('Creating Continuous Retraining System');

    try {
      // Initialize all services
      const dataCollector = new DataCollector();
      const modelTrainer = new ModelTrainer(this.logger);
      const modelRepository = new ModelRepository(this.logger);
      const deploymentManager = new DeploymentManager(this.logger);
      const monitoringService = new MonitoringService(this.logger);

      // Create the main retraining service
      const retrainingService = new RetrainingService(
        config,
        dataCollector,
        modelTrainer,
        modelRepository,
        deploymentManager,
        monitoringService,
        this.logger
      );

      // Create scheduler
      const scheduler = new Scheduler(retrainingService, this.logger);

      // Create system instance
      const system: RetrainingSystem = {
        config,
        currentModel: await modelRepository.getCurrentModel(),
        availableVersions: await modelRepository.listVersions(),
        recentJobs: [],
        alerts: [],
        systemHealth: {
          status: 'healthy',
          lastCheck: new Date().toISOString(),
          issues: []
        }
      };

      this.system = system;

      // Store references for cleanup
      (system as unknown)._services = {
        retrainingService,
        scheduler,
        dataCollector,
        modelTrainer,
        modelRepository,
        deploymentManager,
        monitoringService,
        logger: this.logger
      };

      this.logger.info('Continuous Retraining System created successfully');
      return system;

    } catch (error) {
      this.logger.error('Failed to create Continuous Retraining System:', error);
      throw error;
    }
  }

  async startSystem(system: RetrainingSystem): Promise<void> {
    if (!this.system || this.system !== system) {
      throw new Error('Invalid system instance');
    }

    this.logger.info('Starting Continuous Retraining System');

    try {
      const services = (system as unknown)._services;

      // Start the scheduler
      await services.scheduler.start();

      // Perform initial health check
      const health = await services.retrainingService.checkSystemHealth();
      system.systemHealth = health;

      this.logger.info('Continuous Retraining System started successfully');

    } catch (error) {
      this.logger.error('Failed to start Continuous Retraining System:', error);
      throw error;
    }
  }

  async stopSystem(system: RetrainingSystem): Promise<void> {
    if (!this.system || this.system !== system) {
      throw new Error('Invalid system instance');
    }

    this.logger.info('Stopping Continuous Retraining System');

    try {
      const services = (system as unknown)._services;

      // Stop the scheduler
      await services.scheduler.stop();

      // Shutdown the retraining service
      await services.retrainingService.shutdown();

      this.logger.info('Continuous Retraining System stopped successfully');

    } catch (error) {
      this.logger.error('Failed to stop Continuous Retraining System:', error);
      throw error;
    }
  }

  getSystem(): RetrainingSystem | null {
    return this.system;
  }

  getLogger(): Logger {
    return this.logger;
  }

  // Configuration validation
  validateConfig(config: RetrainingConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate schedule
    if (!config.schedule.enabled) {
      errors.push('Schedule must be enabled for automatic retraining');
    }

    if (!config.schedule.cronExpression || config.schedule.cronExpression.trim() === '') {
      errors.push('Cron expression is required');
    }

    // Validate data collection
    if (config.dataCollection.lookbackDays < 1 || config.dataCollection.lookbackDays > 365) {
      errors.push('Lookback days must be between 1 and 365');
    }

    if (config.dataCollection.minTradesThreshold < 10) {
      errors.push('Minimum trades threshold must be at least 10');
    }

    // Validate training
    if (config.training.epochs < 1 || config.training.epochs > 1000) {
      errors.push('Training epochs must be between 1 and 1000');
    }

    if (config.training.batchSize < 1 || config.training.batchSize > 512) {
      errors.push('Batch size must be between 1 and 512');
    }

    if (config.training.learningRate <= 0 || config.training.learningRate > 1) {
      errors.push('Learning rate must be between 0 and 1');
    }

    // Validate evaluation
    if (config.evaluation.minWinRate < 0 || config.evaluation.minWinRate > 1) {
      errors.push('Minimum win rate must be between 0 and 1');
    }

    if (config.evaluation.minProfitFactor < 0) {
      errors.push('Minimum profit factor must be positive');
    }

    if (config.evaluation.maxDrawdownThreshold < 0 || config.evaluation.maxDrawdownThreshold > 1) {
      errors.push('Maximum drawdown threshold must be between 0 and 1');
    }

    // Validate deployment
    if (config.deployment.abTesting.enabled) {
      if (config.deployment.abTesting.trafficSplit < 1 || config.deployment.abTesting.trafficSplit > 99) {
        errors.push('A/B testing traffic split must be between 1 and 99');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Get default configuration
  getDefaultConfig(): RetrainingConfig {
    return {
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
  }

  // Utility methods
  async getSystemMetrics(system: RetrainingSystem): Promise<{
    uptime: number;
    lastTraining: string | null;
    modelsDeployed: number;
    activeAlerts: number;
    scheduledJobs: number;
  }> {
    if (!this.system || this.system !== system) {
      throw new Error('Invalid system instance');
    }

    const services = (system as unknown)._services;
    const schedulerStatus = await services.scheduler.getSchedulerStatus();
    const activeAlerts = await services.monitoringService.getActiveAlerts();

    return {
      uptime: Date.now() - (system as unknown).startTime,
      lastTraining: system.currentModel?.createdAt || null,
      modelsDeployed: system.availableVersions.filter(v => v.status === 'deployed').length,
      activeAlerts: activeAlerts.length,
      scheduledJobs: schedulerStatus.enabledJobs
    };
  }

  async getSystemReport(system: RetrainingSystem): Promise<{
    summary: RetrainingSystem;
    metrics: unknown;
    recommendations: string[];
    health: { status: string; issues: string[] };
  }> {
    if (!this.system || this.system !== system) {
      throw new Error('Invalid system instance');
    }

    const services = (system as unknown)._services;
    const health = await services.retrainingService.checkSystemHealth();
    const metrics = await this.getSystemMetrics(system);

    const recommendations: string[] = [];

    // Generate recommendations based on system state
    if (health.status !== 'healthy') {
      recommendations.push('Address system health issues immediately');
    }

    if (metrics.activeAlerts > 5) {
      recommendations.push('Review and address active alerts');
    }

    if (!system.currentModel) {
      recommendations.push('Deploy an initial model version');
    }

    if (system.availableVersions.length === 0) {
      recommendations.push('Train and deploy your first model');
    }

    return {
      summary: system,
      metrics,
      recommendations,
      health
    };
  }

  // Reset and cleanup
  async reset(): Promise<void> {
    if (this.system) {
      await this.stopSystem(this.system);
      this.system = null;
    }
    this.logger.clearLogs();
  }

  // Export configuration
  exportConfig(config: RetrainingConfig): string {
    return JSON.stringify(config, null, 2);
  }

  // Import configuration
  importConfig(configJson: string): RetrainingConfig {
    try {
      const config = JSON.parse(configJson) as RetrainingConfig;
      const validation = this.validateConfig(config);

      if (!validation.valid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }

      return config;
    } catch (error) {
      throw new Error(`Failed to import configuration: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
    }
  }
}