// @ts-nocheck
import { RetrainingConfig, RetrainingJob, ModelVersion, RetrainingEvent, RetrainingEventHandler } from './types';
import { DataCollector } from './DataCollector';
import { ModelTrainer } from './ModelTrainer';
import { ModelRepository } from './ModelRepository';
import { DeploymentManager } from './DeploymentManager';
import { MonitoringService } from './MonitoringService';
import { Logger } from './Logger';

export class RetrainingService {
  private config: RetrainingConfig;
  private isRunning = false;
  private currentJob: RetrainingJob | null = null;
  private eventHandlers: RetrainingEventHandler[] = [];
  private jobTimeout?: NodeJS.Timeout;

  constructor(
    config: RetrainingConfig,
    private dataCollector: DataCollector,
    private modelTrainer: ModelTrainer,
    private modelRepository: ModelRepository,
    private deploymentManager: DeploymentManager,
    private monitoringService: MonitoringService,
    private logger: Logger
  ) {
    this.config = config;
  }

  // Event management
  on(event: RetrainingEventHandler): void {
    this.eventHandlers.push(event);
  }

  off(event: RetrainingEventHandler): void {
    const index = this.eventHandlers.indexOf(event);
    if (index > -1) {
      this.eventHandlers.splice(index, 1);
    }
  }

  private async emit(event: RetrainingEvent): Promise<void> {
    await Promise.all(this.eventHandlers.map(handler => handler(event)));
  }

  // Main retraining workflow
  async startRetraining(): Promise<RetrainingJob> {
    if (this.isRunning) {
      throw new Error('Retraining job is already running');
    }

    this.isRunning = true;

    const job: RetrainingJob = {
      id: `retraining_${Date.now()}`,
      status: 'running',
      startTime: new Date().toISOString(),
      config: this.config,
      dataStats: {
        totalTrades: 0,
        profitableTrades: 0,
        avgProfit: 0,
        timeRange: {
          start: '',
          end: ''
        }
      },
      warnings: [],
      logs: []
    };

    this.currentJob = job;

    try {
      await this.emit({ type: 'job_started', jobId: job.id, config: this.config });
      this.logger.info(`Starting retraining job ${job.id}`);

      // Step 1: Data Collection
      await this.logJobProgress(job, 'info', 'Starting data collection');
      const { trades, startDate, endDate } = await this.collectTrainingData(job);

      // Step 2: Data Quality Check
      await this.logJobProgress(job, 'info', 'Validating data quality');
      const validationResult = await this.dataCollector.validateDataQuality(trades);
      if (!validationResult.valid) {
        throw new Error(`Data quality validation failed: ${validationResult.issues.join(', ')}`);
      }

      // Step 3: Feature Engineering
      await this.logJobProgress(job, 'info', 'Generating feature vectors');
      const trainingSamples = await this.dataCollector.generateFeatureVectors(trades);

      // Update job statistics
      job.dataStats = {
        totalTrades: trades.length,
        profitableTrades: trades.filter(t => t.actualProfit && t.actualProfit > 0).length,
        avgProfit: trades.reduce((sum, t) => sum + (t.actualProfit || 0), 0) / trades.length,
        timeRange: {
          start: startDate,
          end: endDate
        }
      };

      // Step 4: Model Training
      await this.logJobProgress(job, 'info', 'Starting model training');
      const currentModel = await this.modelRepository.getCurrentModel();
      job.inputVersion = currentModel?.version;

      const newVersion = await this.modelTrainer.train(trainingSamples, this.config);
      job.outputVersion = newVersion.version;

      // Step 5: Model Evaluation
      await this.logJobProgress(job, 'info', 'Evaluating model performance');
      const metrics = await this.modelTrainer.evaluate(newVersion, trainingSamples);

      // Check if model meets deployment criteria
      if (!this.meetsDeploymentCriteria(metrics)) {
        throw new Error(`Model does not meet deployment criteria. Win rate: ${metrics.win_rate}, Profit factor: ${metrics.profit_factor}`);
      }

      // Step 6: Save Model
      await this.logJobProgress(job, 'info', 'Saving model to repository');
      await this.modelRepository.saveModel(newVersion);

      // Step 7: Deployment
      if (this.config.deployment.autoDeploy) {
        await this.logJobProgress(job, 'info', 'Deploying new model');
        await this.deploymentManager.deployModel(newVersion.version);
        newVersion.status = 'deployed';
        newVersion.deployedAt = new Date().toISOString();

        await this.emit({ type: 'model_deployed', version: newVersion });
      }

      // Mark job as completed
      job.status = 'completed';
      job.endTime = new Date().toISOString();

      await this.emit({ type: 'job_completed', jobId: job.id, version: newVersion });
      this.logger.info(`Retraining job ${job.id} completed successfully`);

      return job;

    } catch (error) {
      job.status = 'failed';
      job.endTime = new Date().toISOString();
      job.error = error instanceof Error ? error.message : 'Unknown error';

      await this.logJobProgress(job, 'error', `Job failed: ${job.error}`);
      await this.emit({ type: 'job_failed', jobId: job.id, error: job.error });

      this.logger.error(`Retraining job ${job.id} failed: ${job.error}`);
      throw error;

    } finally {
      this.isRunning = false;
      this.currentJob = null;
    }
  }

  private async collectTrainingData(job: RetrainingJob) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - this.config.dataCollection.lookbackDays);

    const trades = await this.dataCollector.collectTradeData(
      startDate.toISOString(),
      endDate.toISOString()
    );

    if (trades.length < this.config.dataCollection.minTradesThreshold) {
      throw new Error(`Insufficient training data: ${trades.length} trades, minimum required: ${this.config.dataCollection.minTradesThreshold}`);
    }

    return {
      trades: trades.slice(0, this.config.dataCollection.maxTradesPerBatch),
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    };
  }

  private meetsDeploymentCriteria(metrics: unknown): boolean {
    return (
      metrics.win_rate >= this.config.evaluation.minWinRate &&
      metrics.profit_factor >= this.config.evaluation.minProfitFactor &&
      metrics.max_drawdown <= this.config.evaluation.maxDrawdownThreshold &&
      metrics.total_trades >= this.config.evaluation.minTradesForValidation
    );
  }

  private async logJobProgress(job: RetrainingJob, level: 'info' | 'warn' | 'error', message: string, details?: unknown) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      details
    };

    job.logs.push(logEntry);

    if (level === 'error') {
      this.logger.error(message, details);
    } else if (level === 'warn') {
      this.logger.warn(message, details);
    } else {
      this.logger.info(message, details);
    }
  }

  // A/B Testing
  async startABTest(modelA: string, modelB: string, trafficSplit: number = 50): Promise<void> {
    if (!this.config.deployment.abTesting.enabled) {
      throw new Error('A/B testing is not enabled in configuration');
    }

    const rollout = await this.deploymentManager.startABTest(modelA, modelB, trafficSplit);
    await this.emit({ type: 'ab_test_started', rollout });

    this.logger.info(`Started A/B test between ${modelA} and ${modelB} with ${trafficSplit}% traffic split`);
  }

  // Model rollback
  async rollbackModel(reason: string): Promise<void> {
    if (!this.config.deployment.rollbackOnDegradation) {
      throw new Error('Automatic rollback is not enabled');
    }

    await this.deploymentManager.rollbackModel(reason);

    const currentModel = await this.modelRepository.getCurrentModel();
    if (currentModel) {
      currentModel.status = 'rolled_back';
      currentModel.rollbackReason = reason;
      await this.modelRepository.saveModel(currentModel);

      await this.emit({ type: 'model_rolled_back', version: currentModel, reason });
    }

    this.logger.info(`Model rolled back: ${reason}`);
  }

  // Monitoring and alerts
  async checkSystemHealth(): Promise<{ status: 'healthy' | 'warning' | 'error'; issues: string[] }> {
    return await this.monitoringService.getSystemHealth();
  }

  async getCurrentJob(): Promise<RetrainingJob | null> {
    return this.currentJob;
  }

  async getJobHistory(limit: number = 10): Promise<RetrainingJob[]> {
    // This would typically query a database for job history
    // For now, return the current job if it exists
    return this.currentJob ? [this.currentJob] : [];
  }

  updateConfig(newConfig: Partial<RetrainingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('Retraining configuration updated');
  }

  getStatus(): {
    isRunning: boolean;
    currentJob: RetrainingJob | null;
    config: RetrainingConfig;
  } {
    return {
      isRunning: this.isRunning,
      currentJob: this.currentJob,
      config: this.config
    };
  }

  // Cleanup
  async shutdown(): Promise<void> {
    if (this.jobTimeout) {
      clearTimeout(this.jobTimeout);
    }

    if (this.isRunning && this.currentJob) {
      this.logger.warn('Shutting down while job is running. Job will be cancelled.');
      this.currentJob.status = 'cancelled';
      this.currentJob.endTime = new Date().toISOString();
    }

    this.isRunning = false;
    this.currentJob = null;
    this.logger.info('Retraining service shut down');
  }
}