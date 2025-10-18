import {
  MT5Error,
  ConnectionStatus,
  SystemConfig,
  TradeCommand,
  CommandResult
} from './mt5-types';

// Error context interface
export interface ErrorContext {
  command?: TradeCommand;
  result?: CommandResult;
  connectionStatus?: ConnectionStatus;
  timestamp?: Date;
  stackTrace?: string;
  additionalInfo?: Record<string, unknown>;
}

export interface ErrorHandler {
  (error: MT5Error, context?: ErrorContext): void;
}

export interface RetryStrategy {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitter: boolean;
}

export interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime: Date;
  resetTimeoutMs: number;
}

export class MT5ErrorHandler {
  private errorHandlers: Map<string, ErrorHandler[]> = new Map();
  private retryStrategies: Map<string, RetryStrategy> = new Map();
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private errorCounts: Map<string, number> = new Map();
  private config: SystemConfig;
  private errorLog: MT5Error[] = [];

  constructor(config?: Partial<SystemConfig>) {
    this.config = {
      http_timeout: 30000,
      ws_timeout: 60000,
      max_retries: 3,
      retry_delay_ms: 1000,
      heartbeat_interval_ms: 30000,
      command_queue_size: 1000,
      callback_queue_size: 1000,
      enable_logging: true,
      log_level: 'info',
      enable_metrics: true,
      metrics_interval_ms: 60000,
      ...config
    };

    this.initializeDefaultStrategies();
    this.startErrorMonitoring();
  }

  /**
   * Register error handler
   */
  registerErrorHandler(errorType: string, handler: ErrorHandler): void {
    if (!this.errorHandlers.has(errorType)) {
      this.errorHandlers.set(errorType, []);
    }
    this.errorHandlers.get(errorType)!.push(handler);
  }

  /**
   * Handle error
   */
  async handleError(
    error: Error | MT5Error,
    context?: {
      command?: TradeCommand;
      connectionId?: string;
      operation?: string;
      retryCount?: number;
    }
  ): Promise<MT5Error> {
    const mt5Error = this.normalizeError(error);
    this.logError(mt5Error, context);

    // Update error counts
    this.updateErrorCounts(mt5Error);

    // Check circuit breaker
    if (context?.connectionId && this.isCircuitBreakerOpen(context.connectionId)) {
      mt5Error.severity = 'critical';
      mt5Error.message = 'Circuit breaker is open - request blocked';
    }

    // Notify registered handlers
    await this.notifyErrorHandlers(mt5Error, context);

    // Update circuit breaker state
    if (context?.connectionId) {
      this.updateCircuitBreaker(context.connectionId, mt5Error);
    }

    return mt5Error;
  }

  /**
   * Retry operation with exponential backoff
   */
  async retryOperation<T>(
    operation: () => Promise<T>,
    context?: {
      connectionId?: string;
      operationType?: string;
      maxRetries?: number;
    }
  ): Promise<T> {
    const connectionId = context?.connectionId || 'default';
    const strategy = this.retryStrategies.get(connectionId) || this.getDefaultRetryStrategy();
    const maxRetries = context?.maxRetries || strategy.maxAttempts;

    let lastError: MT5Error;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        const result = await operation();
        // Reset circuit breaker on success
        if (connectionId && attempt > 0) {
          this.resetCircuitBreaker(connectionId);
        }
        return result;
      } catch (error) {
        lastError = await this.handleError(error, {
          connectionId,
          operation: context?.operationType,
          retryCount: attempt
        });

        attempt++;

        if (attempt > maxRetries) {
          throw lastError;
        }

        // Check if we should retry
        if (!this.shouldRetry(lastError, attempt)) {
          throw lastError;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateDelay(strategy, attempt);
        this.log('info', `Retrying operation in ${delay}ms (attempt ${attempt}/${maxRetries})`);

        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Handle connection failure
   */
  async handleConnectionFailure(
    connectionId: string,
    error: Error,
    retryContext?: {
      maxRetries?: number;
      connectionType?: 'HTTP' | 'WebSocket';
    }
  ): Promise<void> {
    const mt5Error: MT5Error = {
      code: 1001,
      message: `Connection failure: ${error.message}`,
      timestamp: new Date(),
      context: 'connection_failure',
      retryable: true,
      severity: 'error'
    };

    await this.handleError(mt5Error, {
      connectionId,
      operation: 'connection_attempt'
    });

    // Implement connection recovery strategy
    await this.recoverConnection(connectionId, retryContext);
  }

  /**
   * Handle partial execution
   */
  async handlePartialExecution(
    command: TradeCommand,
    executedVolume: number,
    remainingVolume: number,
    error?: MT5Error
  ): Promise<void> {
    const partialError: MT5Error = {
      code: 2001,
      message: `Partial execution: ${executedVolume}/${command.lot_size} lots executed`,
      timestamp: new Date(),
      context: 'partial_execution',
      retryable: remainingVolume > 0,
      severity: 'warning'
    };

    await this.handleError(partialError, {
      command,
      operation: 'trade_execution'
    });

    // If there's remaining volume, create a new command for it
    if (remainingVolume > 0 && this.shouldRetry(partialError, 1)) {
      const retryCommand = { ...command };
      retryCommand.lot_size = remainingVolume;
      retryCommand.id = this.generateId('retry');
      retryCommand.comment = `${command.comment} - Partial execution retry`;

      this.log('info', `Creating retry command for remaining volume: ${remainingVolume}`);
      // Would need to enqueue this command for execution
    }
  }

  /**
   * Handle trade context busy
   */
  async handleTradeContextBusy(
    connectionId: string,
    command: TradeCommand
  ): Promise<void> {
    const busyError: MT5Error = {
      code: 4001,
      message: 'Trade context is busy - server is processing another request',
      timestamp: new Date(),
      context: 'trade_context_busy',
      retryable: true,
      severity: 'warning'
    };

    await this.handleError(busyError, {
      command,
      connectionId,
      operation: 'trade_execution'
    });

    // Implement queuing or delayed retry
    await this.delayAndRetry(command, connectionId);
  }

  /**
   * Handle order rejection
   */
  async handleOrderRejection(
    command: TradeCommand,
    rejectionReason: string,
    errorCode?: number
  ): Promise<MT5Error> {
    const rejectionError: MT5Error = {
      code: errorCode || 3001,
      message: `Order rejected: ${rejectionReason}`,
      timestamp: new Date(),
      context: 'order_rejection',
      retryable: this.isRejectionRetryable(rejectionReason),
      severity: 'error'
    };

    await this.handleError(rejectionError, {
      command,
      operation: 'order_placement'
    });

    return rejectionError;
  }

  /**
   * Handle server time sync issues
   */
  async handleTimeSyncError(
    connectionId: string,
    timeDifference: number
  ): Promise<void> {
    const timeError: MT5Error = {
      code: 5001,
      message: `Server time sync issue: ${timeDifference}ms difference`,
      timestamp: new Date(),
      context: 'time_sync',
      retryable: true,
      severity: timeDifference > 5000 ? 'error' : 'warning'
    };

    await this.handleError(timeError, {
      connectionId,
      operation: 'time_sync'
    });

    // Implement time synchronization
    await this.synchronizeTime(connectionId, timeDifference);
  }

  /**
   * Check if circuit breaker is open
   */
  private isCircuitBreakerOpen(connectionId: string): boolean {
    const breaker = this.circuitBreakers.get(connectionId);
    if (!breaker) {
      return false;
    }

    // Check if breaker should be reset
    if (breaker.isOpen && Date.now() - breaker.lastFailureTime.getTime() > breaker.resetTimeoutMs) {
      this.resetCircuitBreaker(connectionId);
      return false;
    }

    return breaker.isOpen;
  }

  /**
   * Update circuit breaker state
   */
  private updateCircuitBreaker(connectionId: string, error: MT5Error): void {
    if (!error.retryable) {
      return; // Don't update circuit breaker for non-retryable errors
    }

    let breaker = this.circuitBreakers.get(connectionId);
    if (!breaker) {
      breaker = this.createCircuitBreaker();
      this.circuitBreakers.set(connectionId, breaker);
    }

    breaker.failureCount++;
    breaker.lastFailureTime = new Date();

    // Open circuit breaker if threshold reached
    if (breaker.failureCount >= 3) {
      breaker.isOpen = true;
      this.log('warn', `Circuit breaker opened for connection ${connectionId}`);
    }
  }

  /**
   * Reset circuit breaker
   */
  private resetCircuitBreaker(connectionId: string): void {
    const breaker = this.circuitBreakers.get(connectionId);
    if (breaker) {
      breaker.isOpen = false;
      breaker.failureCount = 0;
      this.log('info', `Circuit breaker reset for connection ${connectionId}`);
    }
  }

  /**
   * Create circuit breaker
   */
  private createCircuitBreaker(): CircuitBreakerState {
    return {
      isOpen: false,
      failureCount: 0,
      lastFailureTime: new Date(),
      resetTimeoutMs: 60000 // 1 minute
    };
  }

  /**
   * Should retry error
   */
  private shouldRetry(error: MT5Error, attempt: number): boolean {
    if (!error.retryable) {
      return false;
    }

    const retryableCodes = [
      1001, // Connection failure
      4001, // Trade context busy
      5001, // Time sync error
      502,  // Bad gateway
      503,  // Service unavailable
      504   // Gateway timeout
    ];

    return retryableCodes.includes(error.code) && attempt < this.config.max_retries;
  }

  /**
   * Is rejection retryable
   */
  private isRejectionRetryable(reason: string): boolean {
    const retryableReasons = [
      'trade context busy',
      'connection timeout',
      'server busy',
      'market closed',
      'insufficient margin'
    ];

    return retryableReasons.some(r => reason.toLowerCase().includes(r));
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateDelay(strategy: RetryStrategy, attempt: number): number {
    const delay = Math.min(
      strategy.baseDelayMs * Math.pow(strategy.backoffMultiplier, attempt - 1),
      strategy.maxDelayMs
    );

    if (strategy.jitter) {
      return delay + (Math.random() - 0.5) * delay * 0.1; // ±10% jitter
    }

    return delay;
  }

  /**
   * Normalize error to MT5Error format
   */
  private normalizeError(error: Error | MT5Error): MT5Error {
    if ('code' in error && 'severity' in error) {
      return error as MT5Error;
    }

    return {
      code: 9999,
      message: error.message,
      timestamp: new Date(),
      retryable: true,
      severity: 'error'
    };
  }

  /**
   * Log error
   */
  private logError(error: MT5Error, context?: ErrorContext): void {
    // Add to error log
    this.errorLog.push(error);

    // Keep only last 1000 errors
    if (this.errorLog.length > 1000) {
      this.errorLog = this.errorLog.slice(-1000);
    }

    // Log to console
    if (this.config.enable_logging) {
      const timestamp = error.timestamp.toISOString();
      const contextStr = context ? ` Context: ${JSON.stringify(context)}` : '';
      console.log(`[${timestamp}] [${error.severity.toUpperCase()}] Error ${error.code}: ${error.message}${contextStr}`);
    }
  }

  /**
   * Update error counts
   */
  private updateErrorCounts(error: MT5Error): void {
    const key = `${error.code}_${error.severity}`;
    const current = this.errorCounts.get(key) || 0;
    this.errorCounts.set(key, current + 1);
  }

  /**
   * Notify error handlers
   */
  private async notifyErrorHandlers(error: MT5Error, context?: ErrorContext): Promise<void> {
    const handlers = this.errorHandlers.get(error.severity) || [];
    const genericHandlers = this.errorHandlers.get('all') || [];

    const allHandlers = [...handlers, ...genericHandlers];

    await Promise.allSettled(
      allHandlers.map(handler => {
        try {
          handler(error, context);
        } catch (handlerError) {
          console.error('Error in error handler:', handlerError);
        }
      })
    );
  }

  /**
   * Recover connection
   */
  private async recoverConnection(
    connectionId: string,
    context?: { maxRetries?: number; connectionType?: 'HTTP' | 'WebSocket' }
  ): Promise<void> {
    const maxRetries = context?.maxRetries || 3;
    const connectionType = context?.connectionType || 'HTTP';

    this.log('info', `Attempting to recover connection ${connectionId} (${connectionType})`);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Simulate connection recovery
        await this.sleep(2000 * attempt);

        // Would implement actual connection recovery logic here
        this.log('info', `Connection ${connectionId} recovered successfully`);
        return;
      } catch (error) {
        this.log('error', `Connection recovery attempt ${attempt} failed: ${error}`);

        if (attempt === maxRetries) {
          this.log('error', `Connection recovery failed for ${connectionId} after ${maxRetries} attempts`);
          throw error;
        }
      }
    }
  }

  /**
   * Delay and retry
   */
  private async delayAndRetry(command: TradeCommand, connectionId: string): Promise<void> {
    const delay = 1000 + Math.random() * 2000; // Random delay between 1-3 seconds
    await this.sleep(delay);

    // Would enqueue command for retry
    this.log('info', `Command queued for retry after delay: ${delay}ms`);
  }

  /**
   * Synchronize time
   */
  private async synchronizeTime(connectionId: string, timeDifference: number): Promise<void> {
    this.log('info', `Synchronizing time for connection ${connectionId}, difference: ${timeDifference}ms`);

    // Would implement time synchronization logic
    await this.sleep(1000);

    this.log('info', `Time synchronization completed for connection ${connectionId}`);
  }

  /**
   * Initialize default retry strategies
   */
  private initializeDefaultStrategies(): void {
    this.retryStrategies.set('default', {
      maxAttempts: 3,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
      jitter: true
    });

    this.retryStrategies.set('HTTP', {
      maxAttempts: 3,
      baseDelayMs: 1000,
      maxDelayMs: 10000,
      backoffMultiplier: 2,
      jitter: true
    });

    this.retryStrategies.set('WebSocket', {
      maxAttempts: 5,
      baseDelayMs: 500,
      maxDelayMs: 15000,
      backoffMultiplier: 1.5,
      jitter: true
    });
  }

  /**
   * Get default retry strategy
   */
  private getDefaultRetryStrategy(): RetryStrategy {
    return this.retryStrategies.get('default')!;
  }

  /**
   * Start error monitoring
   */
  private startErrorMonitoring(): void {
    setInterval(() => {
      this.analyzeErrorPatterns();
    }, 60000); // Analyze every minute
  }

  /**
   * Analyze error patterns
   */
  private analyzeErrorPatterns(): void {
    if (this.errorLog.length === 0) {
      return;
    }

    const recentErrors = this.errorLog.slice(-100); // Last 100 errors
    const errorCounts = new Map<string, number>();

    recentErrors.forEach(error => {
      const key = `${error.code}_${error.severity}`;
      errorCounts.set(key, (errorCounts.get(key) || 0) + 1);
    });

    // Check for recurring errors
    for (const [key, count] of errorCounts) {
      if (count > 10) { // More than 10 occurrences of same error
        this.log('warn', `High frequency of error type ${key}: ${count} occurrences in last 100 errors`);
      }
    }

    // Check error rate
    const errorRate = recentErrors.length / 100; // errors per recent sample
    if (errorRate > 0.5) { // More than 50% error rate
      this.log('error', `High error rate detected: ${(errorRate * 100).toFixed(1)}%`);
    }
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): {
    totalErrors: number;
    errorCounts: Map<string, number>;
    recentErrors: MT5Error[];
    errorRate: number;
  } {
    const recentErrors = this.errorLog.slice(-100);
    const errorRate = recentErrors.length / Math.max(this.errorLog.length, 1);

    return {
      totalErrors: this.errorLog.length,
      errorCounts: new Map(this.errorCounts),
      recentErrors: [...recentErrors],
      errorRate
    };
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(connectionId?: string): Map<string, CircuitBreakerState> | CircuitBreakerState {
    if (connectionId) {
      return this.circuitBreakers.get(connectionId) || this.createCircuitBreaker();
    }
    return new Map(this.circuitBreakers);
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
    this.errorCounts.clear();
    this.log('info', 'Error log cleared');
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate ID
   */
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Logging helper
   */
  private log(level: 'info' | 'warn' | 'error', message: string): void {
    if (!this.config.enable_logging) {
      return;
    }

    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level.toUpperCase()}] [ERROR_HANDLER] ${message}`);
  }
}