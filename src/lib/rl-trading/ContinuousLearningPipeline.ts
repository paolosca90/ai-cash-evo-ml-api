// @ts-nocheck
/**
 * Continuous Learning Pipeline
 * Automatically retrains ML models with new trading data
 */

import { supabase } from '@/integrations/supabase/client';
import { TFRLModelFactory, TFModelConfig } from './TFRLModelArchitecture';
import { TFModelTrainer, TrainingSample } from './TFModelTrainer';

export interface LearningConfig {
  minSamples: number; // Minimum samples before training
  batchSize: number;
  epochs: number;
  learningRate: number;
  validationSplit: number; // % of data for validation
  updateFrequency: 'daily' | 'weekly' | 'monthly'; // How often to retrain
}

export interface LearningMetrics {
  trainReward: number;
  testReward: number;
  sharpeRatio: number;
  winRate: number;
  samplesCount: number;
  trainingDuration: number;
}

export class ContinuousLearningPipeline {
  private config: LearningConfig;
  private isTraining = false;

  constructor(config: Partial<LearningConfig> = {}) {
    this.config = {
      minSamples: config.minSamples || 1000,
      batchSize: config.batchSize || 64,
      epochs: config.epochs || 10,
      learningRate: config.learningRate || 0.0001, // Lower for fine-tuning
      validationSplit: config.validationSplit || 0.2,
      updateFrequency: config.updateFrequency || 'weekly'
    };
  }

  /**
   * Start continuous learning loop
   */
  async start(): Promise<void> {
    console.log('🔄 Starting continuous learning pipeline...');

    // Calculate interval based on frequency
    const interval = this.getIntervalMs(this.config.updateFrequency);

    // Run immediately
    await this.runTrainingCycle();

    // Schedule periodic training
    setInterval(async () => {
      await this.runTrainingCycle();
    }, interval);

    console.log(`✅ Continuous learning started (${this.config.updateFrequency} updates)`);
  }

  /**
   * Run a single training cycle
   */
  async runTrainingCycle(): Promise<LearningMetrics | null> {
    if (this.isTraining) {
      console.log('⏭️ Training already in progress, skipping...');
      return null;
    }

    this.isTraining = true;
    const startTime = Date.now();

    try {
      console.log('🎓 Starting training cycle...');

      // 1. Collect recent samples from database
      const samples = await this.collectTrainingSamples();

      if (samples.length < this.config.minSamples) {
        console.log(`⏸️ Not enough samples (${samples.length}/${this.config.minSamples}), skipping training`);
        return null;
      }

      console.log(`📊 Collected ${samples.length} training samples`);

      // 2. Split into train/test sets
      const splitIndex = Math.floor(samples.length * (1 - this.config.validationSplit));
      const trainSamples = samples.slice(0, splitIndex);
      const testSamples = samples.slice(splitIndex);

      // 3. Load current model
      const modelConfig: TFModelConfig = {
        inputDim: 50,
        actionDim: 3,
        hiddenUnits: [256, 128, 64],
        learningRate: this.config.learningRate
      };

      const model = await TFRLModelFactory.createPPOModel(modelConfig);

      // Try to load existing weights
      try {
        await model.loadModel('ppo');
        console.log('✅ Loaded existing model weights');
      } catch {
        console.log('⚠️ No existing weights, training from scratch');
      }

      // 4. Train model
      const trainer = new TFModelTrainer(model, {
        epochs: this.config.epochs,
        batchSize: this.config.batchSize,
        learningRate: this.config.learningRate
      });

      const trainingMetrics = await trainer.train(trainSamples);

      // 5. Validate on test set
      const testMetrics = await this.evaluateModel(model, testSamples);

      // 6. Calculate performance metrics
      const trainReward = trainingMetrics[trainingMetrics.length - 1].avgReward;
      const sharpeRatio = this.calculateSharpe(testSamples.map(s => s.reward));
      const winRate = testSamples.filter(s => s.reward > 0).length / testSamples.length;

      const metrics: LearningMetrics = {
        trainReward,
        testReward: testMetrics.avgReward,
        sharpeRatio,
        winRate,
        samplesCount: samples.length,
        trainingDuration: Date.now() - startTime
      };

      // 7. Check if model improved
      const currentBest = await this.getCurrentBestReward();
      if (testMetrics.avgReward > currentBest) {
        // Save new best model
        const version = `ppo-v${Date.now()}`;
        await model.saveModel(version);
        console.log(`✅ New best model saved: ${version} (reward: ${testMetrics.avgReward.toFixed(3)})`);

        // Update active model
        await this.updateActiveModel(version, modelConfig, metrics);
      } else {
        console.log(`⏸️ Model did not improve (${testMetrics.avgReward.toFixed(3)} vs ${currentBest.toFixed(3)})`);
      }

      // 8. Log metrics to database
      await this.logTrainingMetrics(trainingMetrics, metrics);

      // Cleanup
      model.dispose();

      console.log(`✅ Training cycle completed in ${metrics.trainingDuration}ms`);
      return metrics;

    } catch (error) {
      console.error('❌ Training cycle failed:', error);
      return null;
    } finally {
      this.isTraining = false;
    }
  }

  /**
   * Collect training samples from database
   */
  private async collectTrainingSamples(): Promise<TrainingSample[]> {
    try {
      // Calculate time window based on update frequency
      const daysAgo = this.config.updateFrequency === 'daily' ? 1 :
                      this.config.updateFrequency === 'weekly' ? 7 : 30;

      const since = new Date();
      since.setDate(since.getDate() - daysAgo);

      // Fetch samples from Supabase
      const { data, error } = await supabase
        .from('ml_training_samples')
        .select('*')
        .gte('timestamp', since.toISOString())
        .order('timestamp', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        return [];
      }

      // Convert to TrainingSample format
      const samples: TrainingSample[] = data.map(row => ({
        state: Array.isArray(row.features) ? row.features : Object.values(row.features || {}),
        action: row.action,
        reward: row.reward,
        nextState: Array.isArray(row.next_features) ? row.next_features : Object.values(row.next_features || {}),
        done: row.done || false,
        logProb: row.log_probability || Math.log(0.33),
        value: row.value_estimate || row.reward * 0.8
      }));

      // Filter valid samples
      return samples.filter(s =>
        s.state.length === 50 &&
        s.nextState.length === 50 &&
        !isNaN(s.reward) &&
        s.action >= 0 && s.action <= 2
      );

    } catch (error) {
      console.error('Failed to collect training samples:', error);
      return [];
    }
  }

  /**
   * Evaluate model on test set
   */
  private async evaluateModel(model: {getAction(state: unknown, deterministic: boolean): Promise<{action: number}>}, testSamples: TrainingSample[]): Promise<{ avgReward: number }> {
    let totalReward = 0;

    for (const sample of testSamples) {
      const result = await model.getAction(sample.state, true); // Deterministic
      const predictedAction = result.action;

      // Reward is 1 if correct action, 0 otherwise
      if (predictedAction === sample.action) {
        totalReward += sample.reward;
      }
    }

    return {
      avgReward: totalReward / testSamples.length
    };
  }

  /**
   * Calculate Sharpe ratio
   */
  private calculateSharpe(rewards: number[]): number {
    if (rewards.length === 0) return 0;

    const mean = rewards.reduce((a, b) => a + b) / rewards.length;
    const variance = rewards.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / rewards.length;
    const std = Math.sqrt(variance);

    return std > 0 ? mean / std : 0;
  }

  /**
   * Get current best reward from database
   */
  private async getCurrentBestReward(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('ml_model_versions')
        .select('performance_metrics')
        .eq('is_active', true)
        .eq('model_type', 'ppo')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) return -Infinity;

      const metrics = data.performance_metrics as Record<string, unknown> | null;
      return (metrics?.avg_reward as number) || -Infinity;

    } catch {
      return -Infinity;
    }
  }

  /**
   * Update active model in database
   */
  private async updateActiveModel(
    version: string,
    config: TFModelConfig,
    metrics: LearningMetrics
  ): Promise<void> {
    try {
      // Deactivate previous models
      await supabase
        .from('ml_model_versions')
        .update({ is_active: false })
        .eq('model_type', 'ppo');

      // Insert new version
      await supabase
        .from('ml_model_versions')
        .insert({
          version,
          model_type: 'ppo',
          config: config as Record<string, unknown>,
          performance_metrics: {
            avg_reward: metrics.testReward,
            sharpe_ratio: metrics.sharpeRatio,
            win_rate: metrics.winRate,
            samples_count: metrics.samplesCount
          },
          is_active: true,
          is_production: true,
          trained_on_samples: metrics.samplesCount,
          training_completed_at: new Date().toISOString()
        });

      console.log(`✅ Updated active model to ${version}`);
    } catch (error) {
      console.error('Failed to update active model:', error);
    }
  }

  /**
   * Log training metrics to database
   */
  private async logTrainingMetrics(
    trainingMetrics: Array<Record<string, unknown>>,
    learningMetrics: LearningMetrics
  ): Promise<void> {
    try {
      const version = `ppo-v${Date.now()}`;

      for (let i = 0; i < trainingMetrics.length; i++) {
        const m = trainingMetrics[i];

        await supabase
          .from('ml_training_metrics')
          .insert({
            model_version: version,
            epoch: m.epoch,
            policy_loss: m.policyLoss,
            value_loss: m.valueLoss,
            entropy_loss: m.entropyLoss,
            total_loss: m.totalLoss,
            avg_reward: m.avgReward,
            avg_advantage: m.avgAdvantage,
            clip_fraction: m.clipFraction,
            samples_count: learningMetrics.samplesCount,
            training_duration_ms: learningMetrics.trainingDuration
          });
      }

      console.log('📊 Training metrics logged');
    } catch (error) {
      console.error('Failed to log training metrics:', error);
    }
  }

  /**
   * Get interval in milliseconds
   */
  private getIntervalMs(frequency: 'daily' | 'weekly' | 'monthly'): number {
    const intervals = {
      daily: 24 * 60 * 60 * 1000,
      weekly: 7 * 24 * 60 * 60 * 1000,
      monthly: 30 * 24 * 60 * 60 * 1000
    };

    return intervals[frequency];
  }

  /**
   * Trigger manual training
   */
  async trainNow(): Promise<LearningMetrics | null> {
    console.log('🔄 Manual training triggered...');
    return await this.runTrainingCycle();
  }

  /**
   * Get training status
   */
  getStatus() {
    return {
      isTraining: this.isTraining,
      config: this.config
    };
  }
}

// Export singleton
export const continuousLearningPipeline = new ContinuousLearningPipeline();
