// @ts-nocheck
import * as tf from '@tensorflow/tfjs';
import { TFPPOModel, TFCPPOModel } from './TFRLModelArchitecture';

/**
 * TensorFlow.js-based Model Trainer
 * Implements PPO training algorithm with real gradient updates
 */

export interface TrainingConfig {
  epochs: number;
  batchSize: number;
  learningRate: number;
  gamma: number; // Discount factor
  lambda: number; // GAE lambda
  clipRatio: number; // PPO clip ratio
  valueCoeff: number; // Value loss coefficient
  entropyCoeff: number; // Entropy bonus coefficient
  maxGradNorm: number; // Gradient clipping
}

export interface TrainingSample {
  state: number[];
  action: number;
  reward: number;
  nextState: number[];
  done: boolean;
  logProb: number;
  value: number;
}

export interface TrainingMetrics {
  epoch: number;
  policyLoss: number;
  valueLoss: number;
  entropyLoss: number;
  totalLoss: number;
  avgReward: number;
  avgAdvantage: number;
  clipFraction: number; // Fraction of ratios that were clipped
}

export class TFModelTrainer {
  private config: TrainingConfig;
  private model: TFPPOModel | TFCPPOModel;
  private trainingHistory: TrainingMetrics[] = [];

  constructor(model: TFPPOModel | TFCPPOModel, config: Partial<TrainingConfig> = {}) {
    this.model = model;
    this.config = {
      epochs: config.epochs || 10,
      batchSize: config.batchSize || 64,
      learningRate: config.learningRate || 0.0003,
      gamma: config.gamma || 0.99,
      lambda: config.lambda || 0.95,
      clipRatio: config.clipRatio || 0.2,
      valueCoeff: config.valueCoeff || 0.5,
      entropyCoeff: config.entropyCoeff || 0.01,
      maxGradNorm: config.maxGradNorm || 0.5
    };
  }

  /**
   * Calculate Generalized Advantage Estimation (GAE)
   */
  private calculateAdvantages(samples: TrainingSample[]): { advantages: number[]; returns: number[] } {
    const advantages: number[] = [];
    const returns: number[] = [];

    let nextValue = 0;
    let nextAdvantage = 0;

    // Process in reverse order
    for (let i = samples.length - 1; i >= 0; i--) {
      const sample = samples[i];
      const currentValue = sample.value;

      // TD error: δ = r + γV(s') - V(s)
      const delta = sample.reward + this.config.gamma * nextValue * (sample.done ? 0 : 1) - currentValue;

      // GAE: A = δ + γλA_{t+1}
      const advantage = delta + this.config.gamma * this.config.lambda * nextAdvantage * (sample.done ? 0 : 1);
      advantages[i] = advantage;

      // Return: R = A + V(s)
      returns[i] = advantage + currentValue;

      nextValue = sample.done ? 0 : currentValue;
      nextAdvantage = sample.done ? 0 : advantage;
    }

    // Normalize advantages
    const mean = advantages.reduce((sum, a) => sum + a, 0) / advantages.length;
    const std = Math.sqrt(
      advantages.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) / advantages.length
    );

    const normalizedAdvantages = advantages.map(a => (a - mean) / (std + 1e-8));

    return { advantages: normalizedAdvantages, returns };
  }

  /**
   * Create mini-batches from samples
   */
  private createBatches(samples: TrainingSample[], advantages: number[], returns: number[]): Array<{
    states: number[][];
    actions: number[];
    oldLogProbs: number[];
    advantages: number[];
    returns: number[];
  }> {
    const batches: Array<{
      states: number[][];
      actions: number[];
      oldLogProbs: number[];
      advantages: number[];
      returns: number[];
    }> = [];

    // Shuffle indices
    const indices = Array.from({ length: samples.length }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    // Create batches
    for (let i = 0; i < samples.length; i += this.config.batchSize) {
      const batchIndices = indices.slice(i, i + this.config.batchSize);
      const batch = {
        states: batchIndices.map(idx => samples[idx].state),
        actions: batchIndices.map(idx => samples[idx].action),
        oldLogProbs: batchIndices.map(idx => samples[idx].logProb),
        advantages: batchIndices.map(idx => advantages[idx]),
        returns: batchIndices.map(idx => returns[idx])
      };
      batches.push(batch);
    }

    return batches;
  }

  /**
   * Perform PPO update on a single batch
   */
  private async trainBatch(batch: {
    states: number[][];
    actions: number[];
    oldLogProbs: number[];
    advantages: number[];
    returns: number[];
  }): Promise<{ policyLoss: number; valueLoss: number; entropyLoss: number; clipFraction: number }> {
    const { states, actions, oldLogProbs, advantages, returns } = batch;

    let policyLoss = 0;
    let valueLoss = 0;
    let entropyLoss = 0;
    let clippedRatios = 0;

    // Convert to tensors
    const statesTensor = tf.tensor2d(states);
    const actionsTensor = tf.tensor1d(actions, 'int32');
    const oldLogProbsTensor = tf.tensor1d(oldLogProbs);
    const advantagesTensor = tf.tensor1d(advantages);
    const returnsTensor = tf.tensor1d(returns);

    // Policy network update
    const policyVars = (this.model as unknown as {policyNetwork: {trainableWeights: tf.Variable[]}}).policyNetwork.trainableWeights;
    const policyOptimizer = tf.train.adam(this.config.learningRate);

    const policyResult = policyOptimizer.minimize(() => {
      return tf.tidy(() => {
        // Get current action probabilities
        const actionProbs = (this.model as unknown as {policyNetwork: {predict: (input: tf.Tensor) => tf.Tensor2D}}).policyNetwork.predict(statesTensor) as tf.Tensor2D;

        // Get probabilities for taken actions
        const actionIndices = tf.stack([
          tf.range(0, batch.states.length, 1, 'int32'),
          actionsTensor
        ], 1);
        const currentProbs = tf.gatherND(actionProbs, actionIndices);
        const currentLogProbs = tf.log(tf.add(currentProbs, 1e-8));

        // Calculate ratio: π(a|s) / π_old(a|s)
        const ratios = tf.exp(tf.sub(currentLogProbs, oldLogProbsTensor));

        // PPO clipped objective
        const surrogate1 = tf.mul(ratios, advantagesTensor);
        const surrogate2 = tf.mul(
          tf.clipByValue(ratios, 1 - this.config.clipRatio, 1 + this.config.clipRatio),
          advantagesTensor
        );

        // Policy loss (negative because we want to maximize)
        const policyLossValue = tf.neg(tf.mean(tf.minimum(surrogate1, surrogate2)));

        // Entropy bonus (encourage exploration)
        const entropy = tf.neg(tf.sum(tf.mul(actionProbs, tf.log(tf.add(actionProbs, 1e-8))), 1));
        const entropyBonus = tf.mul(tf.mean(entropy), -this.config.entropyCoeff);

        // Count clipped ratios
        const isClipped = tf.logicalOr(
          tf.less(ratios, 1 - this.config.clipRatio),
          tf.greater(ratios, 1 + this.config.clipRatio)
        );
        clippedRatios = tf.sum(tf.cast(isClipped, 'float32')).dataSync()[0];

        // Store losses
        policyLoss = policyLossValue.dataSync()[0];
        entropyLoss = entropyBonus.dataSync()[0];

        return tf.add(policyLossValue, entropyBonus);
      });
    }, true, policyVars);

    // Value network update
    const valueVars = (this.model as unknown as {valueNetwork: {trainableWeights: tf.Variable[]}}).valueNetwork.trainableWeights;
    const valueOptimizer = tf.train.adam(this.config.learningRate);

    const valueResult = valueOptimizer.minimize(() => {
      return tf.tidy(() => {
        // Get current value predictions
        const predictedValues = (this.model as unknown as {valueNetwork: {predict: (input: tf.Tensor) => tf.Tensor2D}}).valueNetwork.predict(statesTensor) as tf.Tensor2D;
        const predictedValuesFlat = tf.squeeze(predictedValues);

        // Value loss (MSE)
        const valueLossValue = tf.mul(
          tf.mean(tf.square(tf.sub(returnsTensor, predictedValuesFlat))),
          this.config.valueCoeff
        ) as tf.Scalar; // Type assertion for scalar return

        valueLoss = valueLossValue.dataSync()[0];

        return valueLossValue;
      });
    }, true, valueVars);

    // Cleanup tensors
    statesTensor.dispose();
    actionsTensor.dispose();
    oldLogProbsTensor.dispose();
    advantagesTensor.dispose();
    returnsTensor.dispose();

    const clipFraction = clippedRatios / batch.states.length;

    return { policyLoss, valueLoss, entropyLoss, clipFraction };
  }

  /**
   * Train model on collected samples
   */
  public async train(samples: TrainingSample[]): Promise<TrainingMetrics[]> {
    console.log(`🎓 Starting training on ${samples.length} samples for ${this.config.epochs} epochs`);

    // Calculate advantages and returns
    const { advantages, returns } = this.calculateAdvantages(samples);

    const epochMetrics: TrainingMetrics[] = [];

    for (let epoch = 0; epoch < this.config.epochs; epoch++) {
      const batches = this.createBatches(samples, advantages, returns);

      let totalPolicyLoss = 0;
      let totalValueLoss = 0;
      let totalEntropyLoss = 0;
      let totalClipFraction = 0;

      for (const batch of batches) {
        const batchResult = await this.trainBatch(batch);
        totalPolicyLoss += batchResult.policyLoss;
        totalValueLoss += batchResult.valueLoss;
        totalEntropyLoss += batchResult.entropyLoss;
        totalClipFraction += batchResult.clipFraction;
      }

      const avgPolicyLoss = totalPolicyLoss / batches.length;
      const avgValueLoss = totalValueLoss / batches.length;
      const avgEntropyLoss = totalEntropyLoss / batches.length;
      const avgClipFraction = totalClipFraction / batches.length;
      const totalLoss = avgPolicyLoss + avgValueLoss + avgEntropyLoss;

      const avgReward = samples.reduce((sum, s) => sum + s.reward, 0) / samples.length;
      const avgAdvantage = advantages.reduce((sum, a) => sum + a, 0) / advantages.length;

      const metrics: TrainingMetrics = {
        epoch,
        policyLoss: avgPolicyLoss,
        valueLoss: avgValueLoss,
        entropyLoss: avgEntropyLoss,
        totalLoss,
        avgReward,
        avgAdvantage,
        clipFraction: avgClipFraction
      };

      epochMetrics.push(metrics);
      this.trainingHistory.push(metrics);

      console.log(
        `Epoch ${epoch + 1}/${this.config.epochs} - ` +
        `Loss: ${totalLoss.toFixed(4)} ` +
        `(Policy: ${avgPolicyLoss.toFixed(4)}, ` +
        `Value: ${avgValueLoss.toFixed(4)}, ` +
        `Entropy: ${avgEntropyLoss.toFixed(4)}) - ` +
        `Clip: ${(avgClipFraction * 100).toFixed(1)}%`
      );
    }

    console.log('✅ Training completed');
    return epochMetrics;
  }

  /**
   * Get training history
   */
  public getHistory(): TrainingMetrics[] {
    return this.trainingHistory;
  }

  /**
   * Clear training history
   */
  public clearHistory(): void {
    this.trainingHistory = [];
  }
}
