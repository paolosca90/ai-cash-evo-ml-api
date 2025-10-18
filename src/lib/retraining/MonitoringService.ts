// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';
import { ModelMetrics, PerformanceAlert, IMonitoringService, TradeData } from './types';
import { Logger } from './Logger';

export class MonitoringService implements IMonitoringService {
  private logger: Logger;
  private baselineMetrics: Map<string, ModelMetrics> = new Map();
  private alertThresholds = {
    winRate: { warning: 0.4, critical: 0.3 },
    profitFactor: { warning: 1.2, critical: 1.0 },
    maxDrawdown: { warning: 0.15, critical: 0.25 },
    sharpeRatio: { warning: 0.5, critical: 0.0 }
  };

  constructor(logger: Logger) {
    this.logger = logger.child('MonitoringService');
  }

  async trackPerformance(version: string, trades: TradeData[]): Promise<ModelMetrics> {
    try {
      this.logger.info(`Tracking performance for model version ${version} with ${trades.length} trades`);

      if (trades.length === 0) {
        throw new Error('No trades provided for performance tracking');
      }

      // Calculate metrics
      const metrics = this.calculateTradeMetrics(trades);

      // Store baseline if not exists
      if (!this.baselineMetrics.has(version)) {
        this.baselineMetrics.set(version, { ...metrics });
        this.logger.info(`Established baseline metrics for version ${version}`);
      }

      // Store metrics in database
      await this.storeMetrics(version, metrics);

      // Check for performance degradation
      await this.checkPerformanceDegradation(version, metrics);

      // Generate alerts if needed
      await this.generatePerformanceAlerts(version, metrics);

      this.logger.info(`Performance tracking completed for version ${version}: Win rate ${metrics.win_rate.toFixed(2)}, Sharpe ${metrics.sharpe_ratio.toFixed(2)}`);
      return metrics;

    } catch (error) {
      this.logger.error(`Failed to track performance for version ${version}:`, error);
      throw error;
    }
  }

  async detectDrift(currentMetrics: ModelMetrics, baseline: ModelMetrics): Promise<boolean> {
    try {
      this.logger.info('Detecting model drift');

      const driftDetected = false;
      const driftFactors: string[] = [];

      // Calculate drift for each metric
      const metricsToCheck = [
        { name: 'win_rate', current: currentMetrics.win_rate, baseline: baseline.win_rate, threshold: 0.1 },
        { name: 'profit_factor', current: currentMetrics.profit_factor, baseline: baseline.profit_factor, threshold: 0.2 },
        { name: 'sharpe_ratio', current: currentMetrics.sharpe_ratio, baseline: baseline.sharpe_ratio, threshold: 0.3 },
        { name: 'max_drawdown', current: currentMetrics.max_drawdown, baseline: baseline.max_drawdown, threshold: 0.5 }
      ];

      for (const metric of metricsToCheck) {
        const relativeChange = Math.abs((metric.current - metric.baseline) / (metric.baseline || 1));

        if (relativeChange > metric.threshold) {
          driftFactors.push(`${metric.name}: ${(relativeChange * 100).toFixed(1)}% change`);
        }
      }

      // Statistical significance test (simplified)
      const tTestResult = this.performTTest(currentMetrics, baseline);
      if (tTestResult.pValue < 0.05) {
        driftFactors.push('Statistically significant difference detected');
      }

      const hasDrift = driftFactors.length > 0;

      if (hasDrift) {
        this.logger.warn('Model drift detected:', driftFactors);
      } else {
        this.logger.info('No significant model drift detected');
      }

      return hasDrift;

    } catch (error) {
      this.logger.error('Failed to detect drift:', error);
      throw error;
    }
  }

  async createAlert(alert: Omit<PerformanceAlert, 'id' | 'timestamp'>): Promise<PerformanceAlert> {
    try {
      const newAlert: PerformanceAlert = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        ...alert
      };

      // Store in database
      const { error } = await supabase
        .from('performance_alerts')
        .insert({
          id: newAlert.id,
          type: newAlert.type,
          severity: newAlert.severity,
          timestamp: newAlert.timestamp,
          message: newAlert.message,
          details: newAlert.details as unknown,
          acknowledged: newAlert.acknowledged,
          resolved_at: newAlert.resolvedAt,
          resolution: newAlert.resolution
        });

      if (error) {
        throw new Error(`Failed to create alert: ${error.message}`);
      }

      // Log the alert
      this.logger.logAlert(newAlert);

      // Send notification if critical
      if (newAlert.severity === 'critical') {
        await this.sendCriticalAlertNotification(newAlert);
      }

      return newAlert;

    } catch (error) {
      this.logger.error('Failed to create alert:', error);
      throw error;
    }
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('performance_alerts')
        .update({ acknowledged: true })
        .eq('id', alertId);

      if (error) {
        throw new Error(`Failed to acknowledge alert ${alertId}: ${error.message}`);
      }

      this.logger.info(`Alert ${alertId} acknowledged`);

    } catch (error) {
      this.logger.error(`Failed to acknowledge alert ${alertId}:`, error);
      throw error;
    }
  }

  async resolveAlert(alertId: string, resolution: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('performance_alerts')
        .update({
          resolved_at: new Date().toISOString(),
          resolution
        })
        .eq('id', alertId);

      if (error) {
        throw new Error(`Failed to resolve alert ${alertId}: ${error.message}`);
      }

      this.logger.info(`Alert ${alertId} resolved: ${resolution}`);

    } catch (error) {
      this.logger.error(`Failed to resolve alert ${alertId}:`, error);
      throw error;
    }
  }

  async getSystemHealth(): Promise<{ status: 'healthy' | 'warning' | 'error'; issues: string[] }> {
    try {
      const issues: string[] = [];
      let status: 'healthy' | 'warning' | 'error' = 'healthy';

      // Check recent alerts
      const recentAlerts = await this.getRecentAlerts(24); // Last 24 hours
      const criticalAlerts = recentAlerts.filter(a => a.severity === 'critical' && !a.acknowledged);
      const warningAlerts = recentAlerts.filter(a => a.severity === 'warning' && !a.acknowledged);

      if (criticalAlerts.length > 0) {
        issues.push(`${criticalAlerts.length} unacknowledged critical alerts`);
        status = 'error';
      } else if (warningAlerts.length > 3) {
        issues.push(`${warningAlerts.length} unacknowledged warning alerts`);
        status = 'warning';
      }

      // Check model performance
      const currentModel = await this.getCurrentModelPerformance();
      if (currentModel) {
        if (currentModel.win_rate < this.alertThresholds.winRate.critical) {
          issues.push(`Low win rate: ${(currentModel.win_rate * 100).toFixed(1)}%`);
          status = status === 'healthy' ? 'error' : status;
        } else if (currentModel.win_rate < this.alertThresholds.winRate.warning) {
          issues.push(`Warning: low win rate: ${(currentModel.win_rate * 100).toFixed(1)}%`);
          status = status === 'healthy' ? 'warning' : status;
        }

        if (currentModel.max_drawdown > this.alertThresholds.maxDrawdown.critical) {
          issues.push(`High drawdown: ${(currentModel.max_drawdown * 100).toFixed(1)}%`);
          status = status === 'healthy' ? 'error' : status;
        }
      }

      // Check system resources (simplified)
      const systemIssues = await this.checkSystemResources();
      issues.push(...systemIssues);

      if (systemIssues.length > 0) {
        status = status === 'healthy' ? 'warning' : status;
      }

      return { status, issues };

    } catch (error) {
      this.logger.error('Failed to get system health:', error);
      return { status: 'error', issues: ['Failed to assess system health'] };
    }
  }

  // Additional monitoring methods
  async getPerformanceReport(version: string, days: number = 30): Promise<{
    summary: ModelMetrics;
    trend: Array<{ date: string; metrics: ModelMetrics }>;
    alerts: PerformanceAlert[];
    recommendations: string[];
  }> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

      // Get daily performance data
      const dailyMetrics = await this.getDailyMetrics(version, startDate, endDate);

      // Get alerts for the period
      const alerts = await this.getAlertsForVersion(version, startDate, endDate);

      // Calculate summary
      const summary = this.calculateSummaryMetrics(dailyMetrics);

      // Generate recommendations
      const recommendations = await this.generateRecommendations(summary, alerts);

      return {
        summary,
        trend: dailyMetrics,
        alerts,
        recommendations
      };

    } catch (error) {
      this.logger.error(`Failed to generate performance report for version ${version}:`, error);
      throw error;
    }
  }

  async getActiveAlerts(): Promise<PerformanceAlert[]> {
    try {
      const { data, error } = await supabase
        .from('performance_alerts')
        .select('*')
        .eq('acknowledged', false)
        .is('resolved_at', null)
        .order('timestamp', { ascending: false });

      if (error) {
        throw new Error(`Failed to get active alerts: ${error.message}`);
      }

      return data.map(alert => ({
        id: alert.id,
        type: alert.type,
        severity: alert.severity,
        timestamp: alert.timestamp,
        message: alert.message,
        details: alert.details,
        acknowledged: alert.acknowledged,
        resolvedAt: alert.resolved_at,
        resolution: alert.resolution
      }));

    } catch (error) {
      this.logger.error('Failed to get active alerts:', error);
      throw error;
    }
  }

  private calculateTradeMetrics(trades: TradeData[]): ModelMetrics {
    const totalTrades = trades.length;
    const winningTrades = trades.filter(t => t.actualProfit && t.actualProfit > 0).length;
    const totalProfit = trades.reduce((sum, t) => sum + (t.actualProfit || 0), 0);
    const losingTrades = trades.filter(t => t.actualProfit && t.actualProfit < 0);
    const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.actualProfit || 0), 0));

    const winRate = winningTrades / totalTrades;
    const avgWin = winningTrades > 0 ? trades.filter(t => t.actualProfit && t.actualProfit > 0).reduce((sum, t) => sum + t.actualProfit!, 0) / winningTrades : 0;
    const avgLoss = losingTrades.length > 0 ? totalLoss / losingTrades.length : 0;
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : Infinity;

    // Simplified Sharpe ratio calculation
    const returns = trades.map(t => t.actualProfit || 0);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const returnStdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);
    const sharpeRatio = returnStdDev > 0 ? avgReturn / returnStdDev : 0;

    // Simplified drawdown calculation
    const cumulativeProfits = trades.map((t, i) =>
      trades.slice(0, i + 1).reduce((sum, trade) => sum + (trade.actualProfit || 0), 0)
    );
    const peakProfit = Math.max(...cumulativeProfits);
    const maxDrawdown = Math.max(...cumulativeProfits.map((profit, i) => {
      const futurePeak = Math.max(...cumulativeProfits.slice(i));
      return futurePeak > 0 ? (futurePeak - profit) / futurePeak : 0;
    }));

    return {
      total_trades: totalTrades,
      winning_trades: winningTrades,
      win_rate: winRate,
      total_profit: totalProfit,
      total_loss: totalLoss,
      net_profit: totalProfit - totalLoss,
      profit_factor: profitFactor,
      sharpe_ratio: sharpeRatio,
      max_drawdown: maxDrawdown,
      average_win: avgWin,
      average_loss: avgLoss,
      largest_win: Math.max(...trades.filter(t => t.actualProfit && t.actualProfit > 0).map(t => t.actualProfit!)),
      largest_loss: Math.min(...trades.filter(t => t.actualProfit && t.actualProfit < 0).map(t => t.actualProfit!)),
      consistency_score: this.calculateConsistencyScore(trades),
      trade_distribution: {
        profitable: winningTrades,
        breakeven: trades.filter(t => t.actualProfit === 0).length,
        unprofitable: totalTrades - winningTrades
      }
    };
  }

  private calculateConsistencyScore(trades: TradeData[]): number {
    if (trades.length === 0) return 0;

    // Calculate rolling 5-trade performance
    let consistentPeriods = 0;
    for (let i = 4; i < trades.length; i++) {
      const fiveTradeProfit = trades.slice(i - 4, i + 1)
        .reduce((sum, t) => sum + (t.actualProfit || 0), 0);
      if (fiveTradeProfit > 0) {
        consistentPeriods++;
      }
    }

    return consistentPeriods / (trades.length - 4);
  }

  private async storeMetrics(version: string, metrics: ModelMetrics): Promise<void> {
    try {
      await supabase
        .from('model_performance_metrics')
        .insert({
          version,
          timestamp: new Date().toISOString(),
          metrics: metrics as unknown
        });

    } catch (error) {
      this.logger.warn('Failed to store metrics:', error);
    }
  }

  private async checkPerformanceDegradation(version: string, currentMetrics: ModelMetrics): Promise<void> {
    const baseline = this.baselineMetrics.get(version);
    if (!baseline) return;

    const degradationChecks = [
      { metric: 'win_rate', current: currentMetrics.win_rate, baseline: baseline.win_rate, threshold: 0.1 },
      { metric: 'profit_factor', current: currentMetrics.profit_factor, baseline: baseline.profit_factor, threshold: 0.2 },
      { metric: 'sharpe_ratio', current: currentMetrics.sharpe_ratio, baseline: baseline.sharpe_ratio, threshold: 0.3 }
    ];

    for (const check of degradationChecks) {
      const degradation = (baseline[check.metric] - currentMetrics[check.metric]) / baseline[check.metric];
      if (degradation > check.threshold) {
        await this.createAlert({
          type: 'performance_degradation',
          severity: 'high',
          message: `${check.metric} degraded by ${(degradation * 100).toFixed(1)}%`,
          details: {
            version,
            metric: check.metric,
            baseline: baseline[check.metric],
            current: currentMetrics[check.metric],
            degradation
          },
          acknowledged: false
        });
      }
    }
  }

  private async generatePerformanceAlerts(version: string, metrics: ModelMetrics): Promise<void> {
    const alerts: Omit<PerformanceAlert, 'id' | 'timestamp'>[] = [];

    // Win rate alerts
    if (metrics.win_rate < this.alertThresholds.winRate.critical) {
      alerts.push({
        type: 'performance_degradation',
        severity: 'critical',
        message: `Critical: Win rate dropped to ${(metrics.win_rate * 100).toFixed(1)}%`,
        details: { version, metric: 'win_rate', value: metrics.win_rate },
        acknowledged: false
      });
    } else if (metrics.win_rate < this.alertThresholds.winRate.warning) {
      alerts.push({
        type: 'performance_degradation',
        severity: 'warning',
        message: `Warning: Win rate is ${(metrics.win_rate * 100).toFixed(1)}%`,
        details: { version, metric: 'win_rate', value: metrics.win_rate },
        acknowledged: false
      });
    }

    // Drawdown alerts
    if (metrics.max_drawdown > this.alertThresholds.maxDrawdown.critical) {
      alerts.push({
        type: 'performance_degradation',
        severity: 'critical',
        message: `Critical: Drawdown reached ${(metrics.max_drawdown * 100).toFixed(1)}%`,
        details: { version, metric: 'max_drawdown', value: metrics.max_drawdown },
        acknowledged: false
      });
    }

    // Create alerts
    for (const alert of alerts) {
      await this.createAlert(alert);
    }
  }

  private performTTest(current: ModelMetrics, baseline: ModelMetrics): { tValue: number; pValue: number } {
    // Simplified t-test for win rates
    const p1 = current.win_rate;
    const p2 = baseline.win_rate;
    const n1 = current.total_trades;
    const n2 = baseline.total_trades;

    const pooledP = (p1 * n1 + p2 * n2) / (n1 + n2);
    const standardError = Math.sqrt(pooledP * (1 - pooledP) * (1/n1 + 1/n2));
    const tValue = (p1 - p2) / standardError;

    // Simplified p-value calculation
    const pValue = 2 * (1 - this.cumulativeNormalDistribution(Math.abs(tValue)));

    return { tValue, pValue };
  }

  private cumulativeNormalDistribution(z: number): number {
    // Approximation of cumulative normal distribution
    return 0.5 * (1 + Math.sign(z) * Math.sqrt(1 - Math.exp(-2 * z * z / Math.PI)));
  }

  private async getCurrentModelPerformance(): Promise<ModelMetrics | null> {
    try {
      const { data: currentModel, error } = await supabase
        .from('ml_model_versions')
        .select('metrics')
        .eq('status', 'deployed')
        .single();

      if (error || !currentModel) return null;
      return currentModel.metrics;
    } catch {
      return null;
    }
  }

  private async checkSystemResources(): Promise<string[]> {
    const issues: string[] = [];

    // This would typically check actual system resources
    // For now, we'll return mock checks
    if (Math.random() < 0.1) { // 10% chance of mock issue
      issues.push('High memory usage detected');
    }

    return issues;
  }

  private async getRecentAlerts(hours: number): Promise<PerformanceAlert[]> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const { data, error } = await supabase
      .from('performance_alerts')
      .select('*')
      .gte('timestamp', cutoff.toISOString())
      .order('timestamp', { ascending: false });

    if (error) return [];
    return data.map(alert => ({
      id: alert.id,
      type: alert.type,
      severity: alert.severity,
      timestamp: alert.timestamp,
      message: alert.message,
      details: alert.details,
      acknowledged: alert.acknowledged,
      resolvedAt: alert.resolved_at,
      resolution: alert.resolution
    }));
  }

  private async getDailyMetrics(version: string, startDate: Date, endDate: Date): Promise<Array<{ date: string; metrics: ModelMetrics }>> {
    // This would query daily performance metrics from the database
    // For now, return empty array
    return [];
  }

  private async getAlertsForVersion(version: string, startDate: Date, endDate: Date): Promise<PerformanceAlert[]> {
    const { data, error } = await supabase
      .from('performance_alerts')
      .select('*')
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString())
      .contains('details', { version });

    if (error) return [];
    return data.map(alert => ({
      id: alert.id,
      type: alert.type,
      severity: alert.severity,
      timestamp: alert.timestamp,
      message: alert.message,
      details: alert.details,
      acknowledged: alert.acknowledged,
      resolvedAt: alert.resolved_at,
      resolution: alert.resolution
    }));
  }

  private calculateSummaryMetrics(dailyMetrics: Array<{ date: string; metrics: ModelMetrics }>): ModelMetrics {
    if (dailyMetrics.length === 0) {
      return this.getEmptyMetrics();
    }

    // Aggregate daily metrics
    const totalTrades = dailyMetrics.reduce((sum, d) => sum + d.metrics.total_trades, 0);
    const winningTrades = dailyMetrics.reduce((sum, d) => sum + d.metrics.winning_trades, 0);
    const totalProfit = dailyMetrics.reduce((sum, d) => sum + d.metrics.total_profit, 0);
    const totalLoss = dailyMetrics.reduce((sum, d) => sum + d.metrics.total_loss, 0);

    return {
      total_trades: totalTrades,
      winning_trades: winningTrades,
      win_rate: totalTrades > 0 ? winningTrades / totalTrades : 0,
      total_profit: totalProfit,
      total_loss: totalLoss,
      net_profit: totalProfit - totalLoss,
      profit_factor: totalLoss > 0 ? totalProfit / totalLoss : Infinity,
      sharpe_ratio: 0, // Would need more complex calculation
      max_drawdown: Math.max(...dailyMetrics.map(d => d.metrics.max_drawdown)),
      average_win: winningTrades > 0 ? totalProfit / winningTrades : 0,
      average_loss: totalLoss > 0 ? totalLoss / (totalTrades - winningTrades) : 0,
      largest_win: Math.max(...dailyMetrics.map(d => d.metrics.largest_win)),
      largest_loss: Math.min(...dailyMetrics.map(d => d.metrics.largest_loss)),
      consistency_score: 0, // Would need more complex calculation
      trade_distribution: {
        profitable: winningTrades,
        breakeven: 0,
        unprofitable: totalTrades - winningTrades
      }
    };
  }

  private async generateRecommendations(metrics: ModelMetrics, alerts: PerformanceAlert[]): Promise<string[]> {
    const recommendations: string[] = [];

    if (metrics.win_rate < 0.4) {
      recommendations.push('Consider retraining the model with more recent data');
    }

    if (metrics.max_drawdown > 0.2) {
      recommendations.push('Review risk management parameters and position sizing');
    }

    if (alerts.filter(a => a.type === 'model_drift').length > 2) {
      recommendations.push('Model drift detected frequently - consider investigating data quality');
    }

    if (metrics.sharpe_ratio < 0.5) {
      recommendations.push('Consider adjusting the strategy or risk parameters');
    }

    return recommendations;
  }

  private getEmptyMetrics(): ModelMetrics {
    return {
      total_trades: 0,
      winning_trades: 0,
      win_rate: 0,
      total_profit: 0,
      total_loss: 0,
      net_profit: 0,
      profit_factor: 0,
      sharpe_ratio: 0,
      max_drawdown: 0,
      average_win: 0,
      average_loss: 0,
      largest_win: 0,
      largest_loss: 0,
      consistency_score: 0,
      trade_distribution: {
        profitable: 0,
        breakeven: 0,
        unprofitable: 0
      }
    };
  }

  private async sendCriticalAlertNotification(alert: PerformanceAlert): Promise<void> {
    // This would send notifications via email, Slack, etc.
    this.logger.error('CRITICAL ALERT:', alert.message, alert.details);
  }

  // Add logger extension for alerts
  private logAlert(alert: PerformanceAlert): void {
    const message = `[${alert.severity.toUpperCase()}] ${alert.message}`;
    if (alert.severity === 'critical') {
      this.logger.error(message, alert.details);
    } else if (alert.severity === 'high') {
      this.logger.warn(message, alert.details);
    } else {
      this.logger.info(message, alert.details);
    }
  }
}