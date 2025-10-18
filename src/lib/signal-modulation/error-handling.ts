/**
 * Signal Modulation Error Handling and Logging
 *
 * Comprehensive error handling and logging system for the Signal Modulation System.
 * Provides structured error handling, logging, and recovery mechanisms.
 *
 * @author Claude Code
 * @version 1.0.0
 */

export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  INTEGRATION_ERROR = 'INTEGRATION_ERROR',
  SENTIMENT_ANALYSIS_ERROR = 'SENTIMENT_ANALYSIS_ERROR',
  RISK_ASSESSMENT_ERROR = 'RISK_ASSESSMENT_ERROR',
  MARKET_DATA_ERROR = 'MARKET_DATA_ERROR',
  MODULATION_ERROR = 'MODULATION_ERROR',
  EXECUTION_ERROR = 'EXECUTION_ERROR',
  PERFORMANCE_ERROR = 'PERFORMANCE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export interface SignalModulationError {
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  details?: unknown;
  stack?: string;
  timestamp: Date;
  context?: string;
  recoverable: boolean;
  recoverySuggestion?: string;
}

export interface LogEntry {
  id: string;
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: string;
  data?: unknown;
  error?: SignalModulationError;
}

export interface ErrorHandlerConfig {
  enableConsoleLogging: boolean;
  enableFileLogging: boolean;
  enableErrorTracking: boolean;
  maxLogEntries: number;
  errorRetryAttempts: number;
  circuitBreakerThreshold: number;
  notificationChannels: {
    console: boolean;
    toast: boolean;
    external: boolean;
  };
}

export interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime: Date | null;
  resetTimeout: number;
}

export class SignalModulationErrorHandler {
  private config: ErrorHandlerConfig;
  private logEntries: LogEntry[] = [];
  private errorHistory: SignalModulationError[] = [];
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = {
      enableConsoleLogging: true,
      enableFileLogging: false,
      enableErrorTracking: true,
      maxLogEntries: 1000,
      errorRetryAttempts: 3,
      circuitBreakerThreshold: 5,
      notificationChannels: {
        console: true,
        toast: true,
        external: false,
      },
      ...config,
    };
  }

  /**
   * Create a structured error
   */
  public createError(
    type: ErrorType,
    severity: ErrorSeverity,
    message: string,
    details?: unknown,
    context?: string,
    recoverable: boolean = true,
    recoverySuggestion?: string
  ): SignalModulationError {
    const error: SignalModulationError = {
      id: this.generateErrorId(),
      type,
      severity,
      message,
      details,
      stack: new Error().stack,
      timestamp: new Date(),
      context,
      recoverable,
      recoverySuggestion,
    };

    return error;
  }

  /**
   * Handle error with logging and recovery
   */
  public async handleError(error: SignalModulationError | Error, context?: string): Promise<void> {
    const structuredError = this.normalizeError(error, context);

    // Log the error
    this.log(LogLevel.ERROR, structuredError.message, context, { error: structuredError });

    // Add to error history
    this.errorHistory.push(structuredError);

    // Check circuit breaker
    if (this.shouldTriggerCircuitBreaker(structuredError)) {
      await this.handleCircuitBreakerTrigger(structuredError);
    }

    // Send notifications
    await this.sendErrorNotifications(structuredError);

    // Attempt recovery if possible
    if (structuredError.recoverable) {
      await this.attemptRecovery(structuredError);
    }

    // Clean up old logs
    this.cleanupOldLogs();
  }

  /**
   * Log message with level
   */
  public log(level: LogLevel, message: string, context?: string, data?: unknown): void {
    const logEntry: LogEntry = {
      id: this.generateLogId(),
      level,
      message,
      timestamp: new Date(),
      context,
      data,
    };

    this.logEntries.push(logEntry);

    // Console logging
    if (this.config.enableConsoleLogging) {
      this.logToConsole(logEntry);
    }

    // File logging (would implement in real system)
    if (this.config.enableFileLogging) {
      this.logToFile(logEntry);
    }

    // Clean up old logs
    this.cleanupOldLogs();
  }

  /**
   * Check if circuit breaker should be triggered
   */
  private shouldTriggerCircuitBreaker(error: SignalModulationError): boolean {
    const circuitBreakerKey = `${error.type}_${error.context || 'default'}`;
    const state = this.circuitBreakers.get(circuitBreakerKey);

    if (!state) return false;

    if (state.failureCount >= this.config.circuitBreakerThreshold) {
      const timeSinceLastFailure = state.lastFailureTime ?
        Date.now() - state.lastFailureTime.getTime() : 0;

      // Reset circuit breaker if timeout has passed
      if (timeSinceLastFailure > state.resetTimeout) {
        this.resetCircuitBreaker(circuitBreakerKey);
        return false;
      }

      return state.isOpen;
    }

    return false;
  }

  /**
   * Handle circuit breaker trigger
   */
  private async handleCircuitBreakerTrigger(error: SignalModulationError): Promise<void> {
    const circuitBreakerKey = `${error.type}_${error.context || 'default'}`;
    const state = this.circuitBreakers.get(circuitBreakerKey);

    if (state && !state.isOpen) {
      state.isOpen = true;
      state.resetTimeout = 5 * 60 * 1000; // 5 minutes

      this.log(LogLevel.CRITICAL, `Circuit breaker triggered for ${circuitBreakerKey}`, error.context, {
        error,
        circuitBreakerState: state,
      });
    }
  }

  /**
   * Reset circuit breaker
   */
  public resetCircuitBreaker(key: string): void {
    this.circuitBreakers.set(key, {
      isOpen: false,
      failureCount: 0,
      lastFailureTime: null,
      resetTimeout: 0,
    });

    this.log(LogLevel.INFO, `Circuit breaker reset for ${key}`);
  }

  /**
   * Record failure for circuit breaker
   */
  public recordFailure(type: ErrorType, context?: string): void {
    const circuitBreakerKey = `${type}_${context || 'default'}`;
    let state = this.circuitBreakers.get(circuitBreakerKey);

    if (!state) {
      state = {
        isOpen: false,
        failureCount: 0,
        lastFailureTime: null,
        resetTimeout: 0,
      };
      this.circuitBreakers.set(circuitBreakerKey, state);
    }

    state.failureCount++;
    state.lastFailureTime = new Date();
  }

  /**
   * Normalize error to structured format
   */
  private normalizeError(error: SignalModulationError | Error, context?: string): SignalModulationError {
    if ('type' in error && 'severity' in error) {
      return error as SignalModulationError;
    }

    return this.createError(
      ErrorType.UNKNOWN_ERROR,
      ErrorSeverity.HIGH,
      error.message || 'Unknown error occurred',
      { originalError: error },
      context,
      true,
      'Please check the error details and try again'
    );
  }

  /**
   * Attempt error recovery
   */
  private async attemptRecovery(error: SignalModulationError): Promise<void> {
    this.log(LogLevel.INFO, `Attempting recovery for ${error.type}`, error.context);

    try {
      switch (error.type) {
        case ErrorType.VALIDATION_ERROR:
          await this.recoverFromValidationError(error);
          break;
        case ErrorType.NETWORK_ERROR:
          await this.recoverFromNetworkError(error);
          break;
        case ErrorType.TIMEOUT_ERROR:
          await this.recoverFromTimeoutError(error);
          break;
        case ErrorType.SENTIMENT_ANALYSIS_ERROR:
          await this.recoverFromSentimentError(error);
          break;
        case ErrorType.MARKET_DATA_ERROR:
          await this.recoverFromMarketDataError(error);
          break;
        default:
          await this.recoverFromGenericError(error);
      }
    } catch (recoveryError) {
      this.log(LogLevel.ERROR, `Recovery failed for ${error.type}`, error.context, {
        originalError: error,
        recoveryError,
      });
    }
  }

  /**
   * Recovery strategies for different error types
   */
  private async recoverFromValidationError(error: SignalModulationError): Promise<void> {
    this.log(LogLevel.INFO, 'Using fallback validation values', error.context);
    // Implementation would use default/fallback values
  }

  private async recoverFromNetworkError(error: SignalModulationError): Promise<void> {
    this.log(LogLevel.INFO, 'Retrying with cached data', error.context);
    // Implementation would use cached data or retry logic
  }

  private async recoverFromTimeoutError(error: SignalModulationError): Promise<void> {
    this.log(LogLevel.INFO, 'Using timeout fallback strategy', error.context);
    // Implementation would use timeout fallback
  }

  private async recoverFromSentimentError(error: SignalModulationError): Promise<void> {
    this.log(LogLevel.INFO, 'Using default sentiment analysis', error.context);
    // Implementation would use default sentiment values
  }

  private async recoverFromMarketDataError(error: SignalModulationError): Promise<void> {
    this.log(LogLevel.INFO, 'Using cached or simulated market data', error.context);
    // Implementation would use cached market data
  }

  private async recoverFromGenericError(error: SignalModulationError): Promise<void> {
    this.log(LogLevel.INFO, 'Using generic fallback strategy', error.context);
    // Implementation would use generic fallback
  }

  /**
   * Send error notifications
   */
  private async sendErrorNotifications(error: SignalModulationError): Promise<void> {
    const { notificationChannels } = this.config;

    if (notificationChannels.console) {
      console.error(`[${error.severity}] ${error.message}`, error);
    }

    if (notificationChannels.toast) {
      // This would integrate with the toast system
      // Example: toast({ title: error.type, description: error.message, variant: 'destructive' });
    }

    if (notificationChannels.external) {
      // This would send to external monitoring services
      // Example: sendToExternalMonitoring(error);
    }
  }

  /**
   * Console logging with formatting
   */
  private logToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const context = entry.context ? `[${entry.context}]` : '';
    const data = entry.data ? ` ${JSON.stringify(entry.data)}` : '';

    const message = `${timestamp} [${entry.level}]${context} ${entry.message}${data}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message);
        break;
      case LogLevel.INFO:
        console.info(message);
        break;
      case LogLevel.WARN:
        console.warn(message);
        break;
      case LogLevel.ERROR:
        console.error(message);
        break;
      case LogLevel.CRITICAL:
        console.error(`🚨 CRITICAL: ${message}`);
        break;
    }
  }

  /**
   * File logging (placeholder for real implementation)
   */
  private logToFile(entry: LogEntry): void {
    // This would implement actual file logging
    // For now, just log to console as fallback
    console.log(`[FILE LOG] ${entry.level}: ${entry.message}`);
  }

  /**
   * Clean up old log entries
   */
  private cleanupOldLogs(): void {
    if (this.logEntries.length > this.config.maxLogEntries) {
      this.logEntries = this.logEntries.slice(-this.config.maxLogEntries);
    }

    if (this.errorHistory.length > this.config.maxLogEntries) {
      this.errorHistory = this.errorHistory.slice(-this.config.maxLogEntries);
    }
  }

  /**
   * Generate unique IDs
   */
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get error statistics
   */
  public getErrorStatistics(): {
    totalErrors: number;
    errorsByType: Record<ErrorType, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    recentErrors: SignalModulationError[];
    circuitBreakerStates: Record<string, CircuitBreakerState>;
  } {
    const errorsByType = Object.values(ErrorType).reduce((acc, type) => {
      acc[type] = this.errorHistory.filter(e => e.type === type).length;
      return acc;
    }, {} as Record<ErrorType, number>);

    const errorsBySeverity = Object.values(ErrorSeverity).reduce((acc, severity) => {
      acc[severity] = this.errorHistory.filter(e => e.severity === severity).length;
      return acc;
    }, {} as Record<ErrorSeverity, number>);

    const circuitBreakerStates: Record<string, CircuitBreakerState> = {};
    this.circuitBreakers.forEach((state, key) => {
      circuitBreakerStates[key] = state;
    });

    return {
      totalErrors: this.errorHistory.length,
      errorsByType,
      errorsBySeverity,
      recentErrors: this.errorHistory.slice(-10),
      circuitBreakerStates,
    };
  }

  /**
   * Get log entries
   */
  public getLogEntries(level?: LogLevel, limit?: number): LogEntry[] {
    let entries = this.logEntries;

    if (level) {
      entries = entries.filter(entry => entry.level === level);
    }

    if (limit) {
      entries = entries.slice(-limit);
    }

    return entries;
  }

  /**
   * Clear logs and error history
   */
  public clearLogs(): void {
    this.logEntries = [];
    this.errorHistory = [];
    this.circuitBreakers.clear();
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  public getConfig(): ErrorHandlerConfig {
    return { ...this.config };
  }

  /**
   * Export logs and errors
   */
  public exportData(): {
    logs: LogEntry[];
    errors: SignalModulationError[];
    statistics: unknown;
    config: ErrorHandlerConfig;
  } {
    return {
      logs: this.logEntries,
      errors: this.errorHistory,
      statistics: this.getErrorStatistics(),
      config: this.config,
    };
  }

  /**
   * Import logs and errors
   */
  public importData(data: {
    logs?: LogEntry[];
    errors?: SignalModulationError[];
  }): void {
    if (data.logs) {
      this.logEntries = [...this.logEntries, ...data.logs];
      this.cleanupOldLogs();
    }

    if (data.errors) {
      this.errorHistory = [...this.errorHistory, ...data.errors];
      this.cleanupOldLogs();
    }
  }
}

// Error factory functions for common error types
export const createValidationError = (message: string, context?: string): SignalModulationError => ({
  id: `validation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  type: ErrorType.VALIDATION_ERROR,
  severity: ErrorSeverity.MEDIUM,
  message,
  timestamp: new Date(),
  context,
  recoverable: true,
  recoverySuggestion: 'Check input data and try again',
});

export const createConfigurationError = (message: string, context?: string): SignalModulationError => ({
  id: `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  type: ErrorType.CONFIGURATION_ERROR,
  severity: ErrorSeverity.HIGH,
  message,
  timestamp: new Date(),
  context,
  recoverable: true,
  recoverySuggestion: 'Check configuration parameters and use default values',
});

export const createIntegrationError = (message: string, context?: string): SignalModulationError => ({
  id: `integration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  type: ErrorType.INTEGRATION_ERROR,
  severity: ErrorSeverity.HIGH,
  message,
  timestamp: new Date(),
  context,
  recoverable: true,
  recoverySuggestion: 'Check external service availability and retry',
});

export const createNetworkError = (message: string, context?: string): SignalModulationError => ({
  id: `network_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  type: ErrorType.NETWORK_ERROR,
  severity: ErrorSeverity.MEDIUM,
  message,
  timestamp: new Date(),
  context,
  recoverable: true,
  recoverySuggestion: 'Check network connection and retry',
});

export const createTimeoutError = (message: string, context?: string): SignalModulationError => ({
  id: `timeout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  type: ErrorType.TIMEOUT_ERROR,
  severity: ErrorSeverity.MEDIUM,
  message,
  timestamp: new Date(),
  context,
  recoverable: true,
  recoverySuggestion: 'Increase timeout or check service responsiveness',
});

// Export singleton instance
export const signalModulationErrorHandler = new SignalModulationErrorHandler();

// Export error handling utilities
export const withErrorHandling = async <T>(
  fn: () => Promise<T>,
  context: string,
  errorHandler: SignalModulationErrorHandler = signalModulationErrorHandler
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    await errorHandler.handleError(error, context);
    throw error;
  }
};

export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  context: string,
  errorHandler: SignalModulationErrorHandler = signalModulationErrorHandler
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxAttempts) {
        await errorHandler.handleError(error, context);
        throw lastError;
      }

      errorHandler.log(LogLevel.WARN, `Attempt ${attempt} failed, retrying...`, context, { error });

      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }

  throw lastError!;
};

export default SignalModulationErrorHandler;