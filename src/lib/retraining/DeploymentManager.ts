// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';
import { ModelVersion, ABRollout, IDeploymentManager } from './types';
import { Logger } from './Logger';

// Metrics interface
export interface DeploymentMetrics {
  total_trades: number;
  winning_trades: number;
  win_rate: number;
  total_profit: number;
  total_loss: number;
  net_profit: number;
  profit_factor: number;
  sharpe_ratio: number;
  max_drawdown: number;
  average_win: number;
  average_loss: number;
  largest_win: number;
  largest_loss: number;
  consistency_score: number;
  trade_distribution: {
    profitable: number;
    breakeven: number;
    unprofitable: number;
  };
}

// Deployment event details interface
export interface DeploymentEventDetails {
  rolloutId?: string;
  previousVersion?: string;
  metrics?: DeploymentMetrics;
  error?: string;
  [key: string]: unknown;
}

export class DeploymentManager implements IDeploymentManager {
  private logger: Logger;
  private currentRollout: ABRollout | null = null;

  constructor(logger: Logger) {
    this.logger = logger.child('DeploymentManager');
  }

  async deployModel(version: string): Promise<void> {
    try {
      this.logger.info(`Deploying model version ${version}`);

      // Get model details
      const { data: model, error: modelError } = await supabase
        .from('ml_model_versions')
        .select('*')
        .eq('version', version)
        .single();

      if (modelError || !model) {
        throw new Error(`Model version ${version} not found`);
      }

      if (model.status !== 'ready') {
        throw new Error(`Model version ${version} is not ready for deployment (status: ${model.status})`);
      }

      // Stop unknown active A/B test
      if (this.currentRollout) {
        await this.endABTest(this.currentRollout.id, 'cancelled_due_to_deployment');
      }

      // Undeploy current model
      const { error: undeployError } = await supabase
        .from('ml_model_versions')
        .update({ status: 'ready', deployed_at: null })
        .eq('status', 'deployed');

      if (undeployError) {
        this.logger.warn('Failed to undeploy current model:', undeployError);
      }

      // Deploy new model
      const { error: deployError } = await supabase
        .from('ml_model_versions')
        .update({
          status: 'deployed',
          deployed_at: new Date().toISOString()
        })
        .eq('version', version);

      if (deployError) {
        throw new Error(`Failed to deploy model version ${version}: ${deployError.message}`);
      }

      // Log deployment
      await this.logDeploymentEvent(version, 'deploy', 'success');

      this.logger.info(`Model version ${version} deployed successfully`);

    } catch (error) {
      await this.logDeploymentEvent(version, 'deploy', 'failed', error instanceof Error ? error.message : 'Unknown error');
      this.logger.error(`Failed to deploy model version ${version}:`, error);
      throw error;
    }
  }

  async rollbackModel(reason: string): Promise<void> {
    try {
      this.logger.info(`Rolling back current model. Reason: ${reason}`);

      // Get currently deployed model
      const { data: currentModel, error: currentError } = await supabase
        .from('ml_model_versions')
        .select('*')
        .eq('status', 'deployed')
        .single();

      if (currentError || !currentModel) {
        throw new Error('No currently deployed model found');
      }

      // Find the previous stable version
      const { data: previousModels, error: previousError } = await supabase
        .from('ml_model_versions')
        .select('*')
        .eq('status', 'ready')
        .lt('created_at', currentModel.created_at)
        .order('created_at', { ascending: false })
        .limit(1);

      if (previousError) {
        throw new Error(`Failed to find previous model version: ${previousError.message}`);
      }

      if (!previousModels || previousModels.length === 0) {
        throw new Error('No previous stable model version found for rollback');
      }

      const previousVersion = previousModels[0].version;

      // Update current model status
      await supabase
        .from('ml_model_versions')
        .update({
          status: 'rolled_back',
          rollback_reason: reason
        })
        .eq('version', currentModel.version);

      // Deploy previous version
      await this.deployModel(previousVersion);

      // Log rollback
      await this.logDeploymentEvent(previousVersion, 'rollback', 'success', {
        from_version: currentModel.version,
        reason
      });

      this.logger.info(`Rollback completed. Previous version ${previousVersion} deployed`);

    } catch (error) {
      this.logger.error('Rollback failed:', error);
      throw error;
    }
  }

  async startABTest(modelA: string, modelB: string, trafficSplit: number = 50): Promise<ABRollout> {
    try {
      this.logger.info(`Starting A/B test between ${modelA} (${100 - trafficSplit}%) and ${modelB} (${trafficSplit}%)`);

      // Validate models exist
      const [modelAData, modelBData] = await Promise.all([
        this.getModelVersion(modelA),
        this.getModelVersion(modelB)
      ]);

      if (!modelAData || !modelBData) {
        throw new Error('One or both model versions not found');
      }

      // Stop unknown existing A/B test
      if (this.currentRollout) {
        await this.endABTest(this.currentRollout.id, 'replaced_by_new_test');
      }

      // Create A/B test record
      const rolloutId = `ab_test_${Date.now()}`;
      const rollout: ABRollout = {
        id: rolloutId,
        modelAVersion: modelA,
        modelBVersion: modelB,
        trafficSplit,
        startTime: new Date().toISOString(),
        status: 'active',
        metrics: {
          modelA: this.getEmptyMetrics(),
          modelB: this.getEmptyMetrics(),
          statisticalSignificance: false,
          pValue: 1.0
        }
      };

      // Save to database
      const { error } = await supabase
        .from('ab_tests')
        .insert({
          id: rolloutId,
          model_a_version: modelA,
          model_b_version: modelB,
          traffic_split: trafficSplit,
          start_time: rollout.startTime,
          status: 'active'
        });

      if (error) {
        throw new Error(`Failed to create A/B test: ${error.message}`);
      }

      this.currentRollout = rollout;

      // Log A/B test start
      await this.logDeploymentEvent(modelB, 'ab_test_start', 'success', {
        test_id: rolloutId,
        model_a: modelA,
        model_b: modelB,
        traffic_split: trafficSplit
      });

      this.logger.info(`A/B test ${rolloutId} started successfully`);
      return rollout;

    } catch (error) {
      this.logger.error('Failed to start A/B test:', error);
      throw error;
    }
  }

  async endABTest(rolloutId: string, winner?: string): Promise<void> {
    try {
      this.logger.info(`Ending A/B test ${rolloutId}${winner ? ` with winner: ${winner}` : ''}`);

      // Get A/B test details
      const { data: test, error: testError } = await supabase
        .from('ab_tests')
        .select('*')
        .eq('id', rolloutId)
        .single();

      if (testError || !test) {
        throw new Error(`A/B test ${rolloutId} not found`);
      }

      // Update test status
      const { error: updateError } = await supabase
        .from('ab_tests')
        .update({
          end_time: new Date().toISOString(),
          status: 'completed',
          winner: winner || null
        })
        .eq('id', rolloutId);

      if (updateError) {
        throw new Error(`Failed to update A/B test: ${updateError.message}`);
      }

      // Deploy winner if specified
      if (winner && winner !== 'inconclusive') {
        await this.deployModel(winner === 'modelA' ? test.model_a_version : test.model_b_version);
      }

      // Update current rollout
      if (this.currentRollout?.id === rolloutId) {
        this.currentRollout = null;
      }

      // Log A/B test end
      await this.logDeploymentEvent(winner || 'none', 'ab_test_end', 'success', {
        test_id: rolloutId,
        winner
      });

      this.logger.info(`A/B test ${rolloutId} ended successfully`);

    } catch (error) {
      this.logger.error(`Failed to end A/B test ${rolloutId}:`, error);
      throw error;
    }
  }

  async getDeploymentStatus(): Promise<{ current: string; status: string; abTest?: ABRollout }> {
    try {
      // Get current deployed model
      const { data: currentModel, error } = await supabase
        .from('ml_model_versions')
        .select('version, status, deployed_at')
        .eq('status', 'deployed')
        .single();

      if (error) {
        return { current: 'none', status: 'no_model_deployed' };
      }

      const status = {
        current: currentModel.version,
        status: 'deployed',
        deployed_at: currentModel.deployed_at
      };

      // Check for active A/B test
      if (this.currentRollout) {
        status.abTest = this.currentRollout;
      }

      return status;

    } catch (error) {
      this.logger.error('Failed to get deployment status:', error);
      return { current: 'unknown', status: 'error' };
    }
  }

  // A/B Test management methods
  async updateABTestMetrics(rolloutId: string, metrics: ABRollout['metrics']): Promise<void> {
    try {
      const { error } = await supabase
        .from('ab_tests')
        .update({
          metrics: metrics as unknown,
          updated_at: new Date().toISOString()
        })
        .eq('id', rolloutId);

      if (error) {
        throw new Error(`Failed to update A/B test metrics: ${error.message}`);
      }

      if (this.currentRollout?.id === rolloutId) {
        this.currentRollout.metrics = metrics;
      }

    } catch (error) {
      this.logger.error(`Failed to update A/B test metrics for ${rolloutId}:`, error);
      throw error;
    }
  }

  async getABTestResults(rolloutId: string): Promise<{
    rollout: ABRollout;
    recommendation: 'continue' | 'stop_and_deploy_a' | 'stop_and_deploy_b' | 'stop_inconclusive';
    confidence: number;
  }> {
    try {
      const rollout = this.currentRollout;
      if (!rollout || rollout.id !== rolloutId) {
        throw new Error(`A/B test ${rolloutId} not found or not active`);
      }

      // Analyze results and make recommendation
      const { recommendation, confidence } = this.analyzeABTestResults(rollout);

      return {
        rollout,
        recommendation,
        confidence
      };

    } catch (error) {
      this.logger.error(`Failed to get A/B test results for ${rolloutId}:`, error);
      throw error;
    }
  }

  // Health check and monitoring
  async checkDeploymentHealth(): Promise<{
    healthy: boolean;
    issues: string[];
    currentModel: string | null;
    lastDeployment: string | null;
  }> {
    try {
      const issues: string[] = [];
      let healthy = true;
      let currentModel: string | null = null;
      let lastDeployment: string | null = null;

      // Check if there's a deployed model
      const { data: deployedModel, error } = await supabase
        .from('ml_model_versions')
        .select('version, deployed_at')
        .eq('status', 'deployed')
        .single();

      if (error || !deployedModel) {
        issues.push('No model currently deployed');
        healthy = false;
      } else {
        currentModel = deployedModel.version;
        lastDeployment = deployedModel.deployed_at;

        // Check if deployment is recent (within 24 hours)
        const deploymentAge = Date.now() - new Date(deployedModel.deployed_at).getTime();
        if (deploymentAge > 24 * 60 * 60 * 1000) {
          issues.push('Model deployment is more than 24 hours old');
        }
      }

      // Check for stuck A/B tests
      if (this.currentRollout) {
        const testDuration = Date.now() - new Date(this.currentRollout.startTime).getTime();
        if (testDuration > 7 * 24 * 60 * 60 * 1000) { // 7 days
          issues.push(`A/B test ${this.currentRollout.id} has been running for more than 7 days`);
          healthy = false;
        }
      }

      return {
        healthy,
        issues,
        currentModel,
        lastDeployment
      };

    } catch (error) {
      this.logger.error('Failed to check deployment health:', error);
      return {
        healthy: false,
        issues: ['Failed to check deployment health'],
        currentModel: null,
        lastDeployment: null
      };
    }
  }

  private async getModelVersion(version: string): Promise<ModelVersion | null> {
    const { data, error } = await supabase
      .from('ml_model_versions')
      .select('*')
      .eq('version', version)
      .single();

    if (error) return null;
    return data;
  }

  private getEmptyMetrics(): DeploymentMetrics {
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

  private analyzeABTestResults(rollout: ABRollout): {
    recommendation: 'continue' | 'stop_and_deploy_a' | 'stop_and_deploy_b' | 'stop_inconclusive';
    confidence: number;
  } {
    const modelA = rollout.metrics.modelA;
    const modelB = rollout.metrics.modelB;

    // Minimum sample size check
    const minTrades = 100;
    if (modelA.total_trades < minTrades || modelB.total_trades < minTrades) {
      return { recommendation: 'continue', confidence: 0 };
    }

    // Performance difference analysis
    const perfDiff = modelB.win_rate - modelA.win_rate;
    const absDiff = Math.abs(perfDiff);

    // Statistical significance (simplified)
    const standardError = Math.sqrt(
      (modelA.win_rate * (1 - modelA.win_rate) / modelA.total_trades) +
      (modelB.win_rate * (1 - modelB.win_rate) / modelB.total_trades)
    );
    const zScore = absDiff / standardError;
    const pValue = 2 * (1 - this.cumulativeNormalDistribution(zScore));

    rollout.metrics.pValue = pValue;
    rollout.metrics.statisticalSignificance = pValue < 0.05;

    // Decision logic
    if (pValue < 0.05 && absDiff > 0.05) {
      if (perfDiff > 0) {
        return { recommendation: 'stop_and_deploy_b', confidence: 1 - pValue };
      } else {
        return { recommendation: 'stop_and_deploy_a', confidence: 1 - pValue };
      }
    } else if (modelA.total_trades > 1000 && modelB.total_trades > 1000) {
      return { recommendation: 'stop_inconclusive', confidence: 0.8 };
    } else {
      return { recommendation: 'continue', confidence: 0.5 };
    }
  }

  private cumulativeNormalDistribution(z: number): number {
    // Approximation of cumulative normal distribution
    return 0.5 * (1 + Math.sign(z) * Math.sqrt(1 - Math.exp(-2 * z * z / Math.PI)));
  }

  private async logDeploymentEvent(version: string, action: string, status: string, details?: DeploymentEventDetails): Promise<void> {
    try {
      await supabase
        .from('deployment_events')
        .insert({
          version,
          action,
          status,
          details,
          timestamp: new Date().toISOString()
        });

    } catch (error) {
      this.logger.warn('Failed to log deployment event:', error);
    }
  }
}