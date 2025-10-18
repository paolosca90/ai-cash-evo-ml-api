// @ts-nocheck
import { RetrainingConfig, RetrainingJob, RetrainingEvent, RetrainingEventHandler } from './types';
import { RetrainingService } from './RetrainingService';
import { Logger } from './Logger';

interface ScheduledJob {
  id: string;
  name: string;
  cronExpression: string;
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  jobFunction: () => Promise<void>;
  config?: unknown;
}

export class Scheduler {
  private logger: Logger;
  private retrainingService: RetrainingService;
  private jobs: Map<string, ScheduledJob> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;
  private eventHandlers: RetrainingEventHandler[] = [];

  constructor(retrainingService: RetrainingService, logger: Logger) {
    this.retrainingService = retrainingService;
    this.logger = logger.child('Scheduler');
  }

  // Event management
  on(event: RetrainingEventHandler): void {
    this.eventHandlers.push(event);
  }

  private async emit(event: RetrainingEvent): Promise<void> {
    await Promise.all(this.eventHandlers.map(handler => handler(event)));
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Scheduler is already running');
      return;
    }

    this.logger.info('Starting scheduler');
    this.isRunning = true;

    // Register default jobs
    await this.registerDefaultJobs();

    // Start all enabled jobs
    for (const [jobId, job] of this.jobs) {
      if (job.enabled) {
        await this.scheduleJob(jobId);
      }
    }

    this.logger.info(`Scheduler started with ${this.jobs.size} registered jobs`);
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn('Scheduler is not running');
      return;
    }

    this.logger.info('Stopping scheduler');

    // Clear all timers
    for (const [jobId, timer] of this.timers) {
      clearTimeout(timer);
      this.logger.debug(`Cleared timer for job ${jobId}`);
    }

    this.timers.clear();
    this.isRunning = false;

    this.logger.info('Scheduler stopped');
  }

  async registerJob(job: Omit<ScheduledJob, 'id'>): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const scheduledJob: ScheduledJob = {
      id: jobId,
      ...job
    };

    this.jobs.set(jobId, scheduledJob);
    this.logger.info(`Registered job ${job.name} with ID ${jobId}`);

    if (this.isRunning && job.enabled) {
      await this.scheduleJob(jobId);
    }

    return jobId;
  }

  async unregisterJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    // Clear timer if exists
    const timer = this.timers.get(jobId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(jobId);
    }

    this.jobs.delete(jobId);
    this.logger.info(`Unregistered job ${job.name}`);
  }

  async enableJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.enabled) {
      this.logger.warn(`Job ${job.name} is already enabled`);
      return;
    }

    job.enabled = true;
    await this.scheduleJob(jobId);
    this.logger.info(`Enabled job ${job.name}`);
  }

  async disableJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (!job.enabled) {
      this.logger.warn(`Job ${job.name} is already disabled`);
      return;
    }

    job.enabled = false;

    // Clear timer if exists
    const timer = this.timers.get(jobId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(jobId);
    }

    this.logger.info(`Disabled job ${job.name}`);
  }

  async runJobNow(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    this.logger.info(`Manually running job ${job.name}`);

    try {
      await this.executeJob(jobId);
    } catch (error) {
      this.logger.error(`Manual execution of job ${job.name} failed:`, error);
      throw error;
    }
  }

  getJobs(): ScheduledJob[] {
    return Array.from(this.jobs.values());
  }

  getJob(jobId: string): ScheduledJob | undefined {
    return this.jobs.get(jobId);
  }

  private async scheduleJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || !job.enabled) {
      return;
    }

    // Calculate next run time
    const nextRun = this.calculateNextRun(job.cronExpression);
    if (!nextRun) {
      this.logger.error(`Invalid cron expression for job ${job.name}: ${job.cronExpression}`);
      return;
    }

    job.nextRun = nextRun.toISOString();

    const delay = nextRun.getTime() - Date.now();
    if (delay <= 0) {
      // Run immediately if the scheduled time has passed
      this.executeJob(jobId);
      return;
    }

    const timer = setTimeout(() => {
      this.executeJob(jobId);
    }, delay);

    this.timers.set(jobId, timer);

    this.logger.debug(`Scheduled job ${job.name} to run at ${nextRun.toISOString()}`);
  }

  private async executeJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || !job.enabled) {
      return;
    }

    const startTime = new Date();
    job.lastRun = startTime.toISOString();

    this.logger.info(`Executing job ${job.name}`);

    try {
      await this.emit({
        type: 'job_started',
        jobId,
        config: job.config || {}
      });

      await job.jobFunction();

      await this.emit({
        type: 'job_completed',
        jobId,
        version: { version: 'unknown', createdAt: startTime.toISOString() } as unknown
      });

      this.logger.info(`Job ${job.name} completed successfully`);

    } catch (error) {
      await this.emit({
        type: 'job_failed',
        jobId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      this.logger.error(`Job ${job.name} failed:`, error);
    } finally {
      // Schedule next run
      if (job.enabled && this.isRunning) {
        await this.scheduleJob(jobId);
      }
    }
  }

  private calculateNextRun(cronExpression: string): Date | null {
    // Simple cron parser for basic expressions
    // Format: "minute hour day month dayOfWeek"
    // Use * for wildcard

    try {
      const parts = cronExpression.split(' ');
      if (parts.length !== 5) {
        throw new Error('Invalid cron expression format');
      }

      const [minute, hour, day, month, dayOfWeek] = parts;
      const now = new Date();
      const next = new Date(now);

      // Set to next minute
      next.setSeconds(0);
      next.setMilliseconds(0);
      next.setMinutes(next.getMinutes() + 1);

      // Simple implementation - find next matching time
      // This is a simplified version; a full implementation would be more complex
      for (let i = 0; i < 10080; i++) { // Check up to 7 days ahead
        if (this.matchesCronExpression(next, minute, hour, day, month, dayOfWeek)) {
          return next;
        }
        next.setMinutes(next.getMinutes() + 1);
      }

      return null;

    } catch (error) {
      this.logger.error('Error parsing cron expression:', error);
      return null;
    }
  }

  private matchesCronExpression(date: Date, minute: string, hour: string, day: string, month: string, dayOfWeek: string): boolean {
    return (
      this.matchesField(date.getMinutes(), minute) &&
      this.matchesField(date.getHours(), hour) &&
      this.matchesField(date.getDate(), day) &&
      this.matchesField(date.getMonth() + 1, month) &&
      this.matchesField(date.getDay() === 0 ? 7 : date.getDay(), dayOfWeek) // Convert Sunday 0 to 7
    );
  }

  private matchesField(value: number, field: string): boolean {
    if (field === '*') return true;

    // Handle ranges (e.g., "1-5")
    if (field.includes('-')) {
      const [start, end] = field.split('-').map(Number);
      return value >= start && value <= end;
    }

    // Handle lists (e.g., "1,3,5")
    if (field.includes(',')) {
      const values = field.split(',').map(Number);
      return values.includes(value);
    }

    // Handle step values (e.g., "*/5")
    if (field.includes('/')) {
      const [base, step] = field.split('/');
      const baseValue = base === '*' ? 0 : Number(base);
      const stepValue = Number(step);
      return (value - baseValue) % stepValue === 0;
    }

    return Number(field) === value;
  }

  private async registerDefaultJobs(): Promise<void> {
    // Weekly retraining job (every Sunday at 2 AM)
    await this.registerJob({
      name: 'Weekly Model Retraining',
      cronExpression: '0 2 * * 0', // At 02:00 AM on Sunday
      enabled: true,
      jobFunction: async () => {
        await this.retrainingService.startRetraining();
      }
    });

    // Daily health check (every day at 6 AM)
    await this.registerJob({
      name: 'Daily System Health Check',
      cronExpression: '0 6 * * *', // At 06:00 AM every day
      enabled: true,
      jobFunction: async () => {
        await this.performDailyHealthCheck();
      }
    });

    // Performance monitoring (every 6 hours)
    await this.registerJob({
      name: 'Performance Monitoring',
      cronExpression: '0 */6 * * *', // Every 6 hours
      enabled: true,
      jobFunction: async () => {
        await this.performPerformanceMonitoring();
      }
    });

    // Model cleanup (weekly on Sunday at 3 AM)
    await this.registerJob({
      name: 'Model Cleanup',
      cronExpression: '0 3 * * 0', // At 03:00 AM on Sunday
      enabled: true,
      jobFunction: async () => {
        await this.performModelCleanup();
      }
    });

    // Alert processing (every hour)
    await this.registerJob({
      name: 'Alert Processing',
      cronExpression: '0 * * * *', // Every hour
      enabled: true,
      jobFunction: async () => {
        await this.processAlerts();
      }
    });
  }

  private async performDailyHealthCheck(): Promise<void> {
    this.logger.info('Performing daily health check');

    try {
      const health = await this.retrainingService.checkSystemHealth();
      this.logger.info('System health check completed:', { status: health.status, issues: health.issues });

      if (health.status === 'error') {
        // Create alert for system health issues
        await this.retrainingService['monitoringService'].createAlert({
          type: 'training_failure',
          severity: 'high',
          message: 'System health check failed',
          details: { issues: health.issues },
          acknowledged: false
        });
      }

    } catch (error) {
      this.logger.error('Daily health check failed:', error);
    }
  }

  private async performPerformanceMonitoring(): Promise<void> {
    this.logger.info('Performing performance monitoring');

    try {
      // This would collect recent trade data and update model performance metrics
      this.logger.info('Performance monitoring completed');

    } catch (error) {
      this.logger.error('Performance monitoring failed:', error);
    }
  }

  private async performModelCleanup(): Promise<void> {
    this.logger.info('Performing model cleanup');

    try {
      // This would clean up old model versions and perform maintenance
      this.logger.info('Model cleanup completed');

    } catch (error) {
      this.logger.error('Model cleanup failed:', error);
    }
  }

  private async processAlerts(): Promise<void> {
    this.logger.info('Processing alerts');

    try {
      // This would process and escalate alerts as needed
      this.logger.info('Alert processing completed');

    } catch (error) {
      this.logger.error('Alert processing failed:', error);
    }
  }

  // Utility methods
  async updateJobConfig(jobId: string, config: unknown): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    job.config = config;
    this.logger.info(`Updated configuration for job ${job.name}`);
  }

  getJobHistory(jobId: string, limit: number = 10): Array<{
    timestamp: string;
    status: 'success' | 'failed';
    duration?: number;
    error?: string;
  }> {
    // This would query job execution history from the database
    // For now, return empty array
    return [];
  }

  async getSchedulerStatus(): Promise<{
    isRunning: boolean;
    totalJobs: number;
    enabledJobs: number;
    nextJobs: Array<{ name: string; nextRun: string }>;
  }> {
    const enabledJobs = Array.from(this.jobs.values()).filter(job => job.enabled);
    const nextJobs = enabledJobs
      .filter(job => job.nextRun)
      .map(job => ({
        name: job.name,
        nextRun: job.nextRun!
      }))
      .sort((a, b) => new Date(a.nextRun).getTime() - new Date(b.nextRun).getTime())
      .slice(0, 5);

    return {
      isRunning: this.isRunning,
      totalJobs: this.jobs.size,
      enabledJobs: enabledJobs.length,
      nextJobs
    };
  }
}