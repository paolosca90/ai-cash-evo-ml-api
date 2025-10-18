// @ts-nocheck
export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  details?: Record<string, unknown>;
  source: string;
}

export class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private logToConsole = true;
  private logToDatabase = false;

  constructor(options: {
    logToConsole?: boolean;
    logToDatabase?: boolean;
    maxLogs?: number;
  } = {}) {
    this.logToConsole = options.logToConsole ?? true;
    this.logToDatabase = options.logToDatabase ?? false;
    this.maxLogs = options.maxLogs ?? 1000;
  }

  info(message: string, details?: Record<string, unknown>, source: string = 'RetrainingService'): void {
    this.log('info', message, details, source);
  }

  warn(message: string, details?: Record<string, unknown>, source: string = 'RetrainingService'): void {
    this.log('warn', message, details, source);
  }

  error(message: string, details?: Record<string, unknown>, source: string = 'RetrainingService'): void {
    this.log('error', message, details, source);
  }

  debug(message: string, details?: Record<string, unknown>, source: string = 'RetrainingService'): void {
    this.log('debug', message, details, source);
  }

  private log(level: LogEntry['level'], message: string, details?: Record<string, unknown>, source: string): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      details,
      source
    };

    // Add to in-memory logs
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Log to console
    if (this.logToConsole) {
      const timestamp = new Date(entry.timestamp).toLocaleString();
      const logMessage = `[${timestamp}] [${level.toUpperCase()}] [${source}] ${message}`;

      switch (level) {
        case 'error':
          console.error(logMessage, details || '');
          break;
        case 'warn':
          console.warn(logMessage, details || '');
          break;
        case 'debug':
          console.debug(logMessage, details || '');
          break;
        default:
          console.log(logMessage, details || '');
      }
    }

    // Log to database (if enabled)
    if (this.logToDatabase) {
      this.logToDatabaseAsync(entry).catch(err => {
        console.error('Failed to log to database:', err);
      });
    }
  }

  private async logToDatabaseAsync(entry: LogEntry): Promise<void> {
    // This would typically save to a logs table in your database
    // For now, we'll just simulate it
    if (typeof window !== 'undefined') {
      // Browser environment - could send to an API endpoint
      console.log('Would log to database:', entry);
    }
  }

  getLogs(level?: LogEntry['level'], source?: string, limit?: number): LogEntry[] {
    let filteredLogs = this.logs;

    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }

    if (source) {
      filteredLogs = filteredLogs.filter(log => log.source === source);
    }

    if (limit) {
      filteredLogs = filteredLogs.slice(-limit);
    }

    return filteredLogs;
  }

  getRecentLogs(minutes: number = 60): LogEntry[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.logs.filter(log => new Date(log.timestamp) > cutoff);
  }

  getErrorLogs(): LogEntry[] {
    return this.logs.filter(log => log.level === 'error');
  }

  clearLogs(): void {
    this.logs = [];
  }

  exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.logs, null, 2);
    } else if (format === 'csv') {
      const headers = 'timestamp,level,message,source,details\n';
      const rows = this.logs.map(log =>
        `${log.timestamp},${log.level},"${log.message}",${log.source},"${JSON.stringify(log.details || {})}"`
      );
      return headers + rows.join('\n');
    }
    return '';
  }

  // Statistics
  getLogStats(): {
    total: number;
    byLevel: Record<LogEntry['level'], number>;
    bySource: Record<string, number>;
    recentErrors: number;
  } {
    const stats = {
      total: this.logs.length,
      byLevel: {
        info: 0,
        warn: 0,
        error: 0,
        debug: 0
      },
      bySource: {} as Record<string, number>,
      recentErrors: 0
    };

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    for (const log of this.logs) {
      stats.byLevel[log.level]++;
      stats.bySource[log.source] = (stats.bySource[log.source] || 0) + 1;

      if (log.level === 'error' && new Date(log.timestamp) > oneHourAgo) {
        stats.recentErrors++;
      }
    }

    return stats;
  }

  // Create child logger with specific source
  child(source: string): Logger {
    const childLogger = new Logger({
      logToConsole: this.logToConsole,
      logToDatabase: this.logToDatabase,
      maxLogs: this.maxLogs
    });

    // Override the log method to include the source
    childLogger.info = (message: string, details?: Record<string, unknown>) =>
      this.log('info', message, details, source);
    childLogger.warn = (message: string, details?: Record<string, unknown>) =>
      this.log('warn', message, details, source);
    childLogger.error = (message: string, details?: Record<string, unknown>) =>
      this.log('error', message, details, source);
    childLogger.debug = (message: string, details?: Record<string, unknown>) =>
      this.log('debug', message, details, source);

    return childLogger;
  }
}