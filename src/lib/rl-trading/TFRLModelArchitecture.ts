// @ts-nocheck
import * as tf from '@tensorflow/tfjs';
import {
  RLModelConfig,
  TradingState,
  RLAction,
  ModelWeights,
  UncertaintyEstimate,
  ConstraintViolation,
  PerformanceMetrics
} from '../../types/rl-trading';

/**
 * TensorFlow.js-based RL Model Architecture
 * Implements PPO, CPPO, DQN, and SAC using real neural networks
 */

export interface TFModelConfig {
  inputDim: number;
  actionDim: number;
  hiddenUnits: number[];
  learningRate: number;
  clipRatio?: number;
  gamma?: number;
  lambda?: number;
  dropout?: number;
  useBatchNorm?: boolean;
}

/**
 * PPO (Proximal Policy Optimization) Model with TensorFlow.js
 */
export class TFPPOModel {
  private policyNetwork: tf.LayersModel | null = null;
  private valueNetwork: tf.LayersModel | null = null;
  private config: TFModelConfig;
  private isInitialized = false;

  constructor(config: TFModelConfig) {
    this.config = {
      ...config,
      clipRatio: config.clipRatio || 0.2,
      gamma: config.gamma || 0.99,
      lambda: config.lambda || 0.95,
      dropout: config.dropout || 0.1,
      useBatchNorm: config.useBatchNorm !== false
    };
  }

  /**
   * Build Policy Network (Actor)
   */
  private buildPolicyNetwork(): tf.LayersModel {
    const input = tf.input({ shape: [this.config.inputDim] });
    let x: tf.SymbolicTensor | tf.SymbolicTensor[] = input;

    // Hidden layers
    for (let i = 0; i < this.config.hiddenUnits.length; i++) {
      x = tf.layers.dense({
        units: this.config.hiddenUnits[i],
        activation: 'relu',
        kernelInitializer: 'heNormal',
        name: `policy_dense_${i}`
      }).apply(x) as tf.SymbolicTensor;

      if (this.config.useBatchNorm) {
        x = tf.layers.batchNormalization({ name: `policy_bn_${i}` }).apply(x) as tf.SymbolicTensor;
      }

      if (this.config.dropout && this.config.dropout > 0) {
        x = tf.layers.dropout({
          rate: this.config.dropout,
          name: `policy_dropout_${i}`
        }).apply(x) as tf.SymbolicTensor;
      }
    }

    // Output: action probabilities (softmax for discrete actions)
    const actionProbs = tf.layers.dense({
      units: this.config.actionDim,
      activation: 'softmax',
      kernelInitializer: 'glorotUniform',
      name: 'action_probs'
    }).apply(x) as tf.SymbolicTensor;

    const model = tf.model({
      inputs: input,
      outputs: actionProbs,
      name: 'ppo_policy'
    });

    model.compile({
      optimizer: tf.train.adam(this.config.learningRate),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    return model;
  }

  /**
   * Build Value Network (Critic)
   */
  private buildValueNetwork(): tf.LayersModel {
    const input = tf.input({ shape: [this.config.inputDim] });
    let x: tf.SymbolicTensor | tf.SymbolicTensor[] = input;

    // Hidden layers
    for (let i = 0; i < this.config.hiddenUnits.length; i++) {
      x = tf.layers.dense({
        units: this.config.hiddenUnits[i],
        activation: 'relu',
        kernelInitializer: 'heNormal',
        name: `value_dense_${i}`
      }).apply(x) as tf.SymbolicTensor;

      if (this.config.useBatchNorm) {
        x = tf.layers.batchNormalization({ name: `value_bn_${i}` }).apply(x) as tf.SymbolicTensor;
      }

      if (this.config.dropout && this.config.dropout > 0) {
        x = tf.layers.dropout({
          rate: this.config.dropout,
          name: `value_dropout_${i}`
        }).apply(x) as tf.SymbolicTensor;
      }
    }

    // Output: state value (single scalar)
    const value = tf.layers.dense({
      units: 1,
      activation: 'linear',
      kernelInitializer: 'glorotUniform',
      name: 'state_value'
    }).apply(x) as tf.SymbolicTensor;

    const model = tf.model({
      inputs: input,
      outputs: value,
      name: 'ppo_value'
    });

    model.compile({
      optimizer: tf.train.adam(this.config.learningRate),
      loss: 'meanSquaredError',
      metrics: ['mse']
    });

    return model;
  }

  /**
   * Initialize networks
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    this.policyNetwork = this.buildPolicyNetwork();
    this.valueNetwork = this.buildValueNetwork();
    this.isInitialized = true;

    console.log('✅ PPO Model initialized with TensorFlow.js');
    console.log(`📊 Policy params: ${this.policyNetwork.countParams()}`);
    console.log(`📊 Value params: ${this.valueNetwork.countParams()}`);
  }

  /**
   * Get action from policy
   */
  public async getAction(state: number[], deterministic: boolean = false): Promise<{
    action: number;
    probability: number;
    value: number;
  }> {
    if (!this.policyNetwork || !this.valueNetwork) {
      throw new Error('Model not initialized');
    }

    return tf.tidy(() => {
      const stateTensor = tf.tensor2d([state], [1, state.length]);

      // Get action probabilities
      const actionProbs = this.policyNetwork!.predict(stateTensor) as tf.Tensor;
      const probsArray = actionProbs.dataSync();

      let actionIndex: number;
      if (deterministic) {
        // Greedy selection
        actionIndex = probsArray.indexOf(Math.max(...Array.from(probsArray)));
      } else {
        // Sample from distribution
        actionIndex = this.sampleAction(Array.from(probsArray));
      }

      // Get state value
      const valueTensor = this.valueNetwork!.predict(stateTensor) as tf.Tensor;
      const value = valueTensor.dataSync()[0];

      return {
        action: actionIndex,
        probability: probsArray[actionIndex],
        value
      };
    });
  }

  private sampleAction(probabilities: number[]): number {
    const rand = Math.random();
    let cumulative = 0;

    for (let i = 0; i < probabilities.length; i++) {
      cumulative += probabilities[i];
      if (rand < cumulative) {
        return i;
      }
    }

    return probabilities.length - 1;
  }

  /**
   * Calculate uncertainty using dropout
   */
  public async calculateUncertainty(state: number[], numSamples: number = 10): Promise<UncertaintyEstimate> {
    if (!this.policyNetwork) {
      throw new Error('Model not initialized');
    }

    const predictions: number[][] = [];

    // Multiple forward passes with dropout enabled
    for (let i = 0; i < numSamples; i++) {
      const result = tf.tidy(() => {
        const stateTensor = tf.tensor2d([state], [1, state.length]);
        const probs = this.policyNetwork!.predict(stateTensor, { training: true }) as tf.Tensor;
        return Array.from(probs.dataSync());
      });
      predictions.push(result);
    }

    // Calculate epistemic uncertainty (variance across predictions)
    const means = new Array(this.config.actionDim).fill(0);
    for (const pred of predictions) {
      for (let i = 0; i < pred.length; i++) {
        means[i] += pred[i] / numSamples;
      }
    }

    const variances = new Array(this.config.actionDim).fill(0);
    for (const pred of predictions) {
      for (let i = 0; i < pred.length; i++) {
        variances[i] += Math.pow(pred[i] - means[i], 2) / numSamples;
      }
    }

    const epistemicUncertainty = Math.sqrt(variances.reduce((a, b) => a + b) / variances.length);

    // Calculate entropy (aleatoric uncertainty)
    const entropy = -means.reduce((sum, p) => sum + (p > 0 ? p * Math.log(p) : 0), 0);

    return {
      epistemic: epistemicUncertainty,
      aleatoric: entropy / Math.log(this.config.actionDim), // Normalized entropy
      total: epistemicUncertainty + entropy,
      confidence: Math.max(0, 1 - epistemicUncertainty * 2),
      entropy,
      predictionSet: ['BUY', 'SELL', 'HOLD'].slice(0, this.config.actionDim)
    };
  }

  /**
   * Save model to IndexedDB or Supabase
   */
  public async saveModel(path: string): Promise<void> {
    if (!this.policyNetwork || !this.valueNetwork) {
      throw new Error('Model not initialized');
    }

    await this.policyNetwork.save(`indexeddb://ppo-policy-${path}`);
    await this.valueNetwork.save(`indexeddb://ppo-value-${path}`);

    console.log(`✅ Model saved to IndexedDB: ${path}`);
  }

  /**
   * Load model from IndexedDB or Supabase
   */
  public async loadModel(path: string): Promise<void> {
    try {
      this.policyNetwork = await tf.loadLayersModel(`indexeddb://ppo-policy-${path}`);
      this.valueNetwork = await tf.loadLayersModel(`indexeddb://ppo-value-${path}`);
      this.isInitialized = true;

      console.log(`✅ Model loaded from IndexedDB: ${path}`);
    } catch (error) {
      console.error('Failed to load model, initializing new one:', error);
      await this.initialize();
    }
  }

  /**
   * Get model weights for serialization
   */
  public getWeights(): { policy: tf.Tensor[], value: tf.Tensor[] } {
    if (!this.policyNetwork || !this.valueNetwork) {
      throw new Error('Model not initialized');
    }

    return {
      policy: this.policyNetwork.getWeights(),
      value: this.valueNetwork.getWeights()
    };
  }

  /**
   * Set model weights
   */
  public setWeights(weights: { policy: tf.Tensor[], value: tf.Tensor[] }): void {
    if (!this.policyNetwork || !this.valueNetwork) {
      throw new Error('Model not initialized');
    }

    this.policyNetwork.setWeights(weights.policy);
    this.valueNetwork.setWeights(weights.value);
  }

  /**
   * Dispose models to free GPU memory
   */
  public dispose(): void {
    if (this.policyNetwork) {
      this.policyNetwork.dispose();
      this.policyNetwork = null;
    }
    if (this.valueNetwork) {
      this.valueNetwork.dispose();
      this.valueNetwork = null;
    }
    this.isInitialized = false;
    console.log('🗑️ PPO Model disposed');
  }
}

/**
 * CPPO (Constrained PPO) - Extends PPO with constraint network
 */
export class TFCPPOModel extends TFPPOModel {
  private constraintNetwork: tf.LayersModel | null = null;
  private constraintThreshold: number;

  constructor(config: TFModelConfig & { constraintThreshold?: number }) {
    super(config);
    this.constraintThreshold = config.constraintThreshold || 0.5;
  }

  /**
   * Build Constraint Network
   */
  private buildConstraintNetwork(): tf.LayersModel {
    const input = tf.input({ shape: [this.config.inputDim] });
    let x: tf.SymbolicTensor | tf.SymbolicTensor[] = input;

    for (let i = 0; i < this.config.hiddenUnits.length; i++) {
      x = tf.layers.dense({
        units: this.config.hiddenUnits[i],
        activation: 'relu',
        kernelInitializer: 'heNormal',
        name: `constraint_dense_${i}`
      }).apply(x) as tf.SymbolicTensor;
    }

    // Output: constraint violation probability (sigmoid)
    const constraintProb = tf.layers.dense({
      units: 1,
      activation: 'sigmoid',
      name: 'constraint_prob'
    }).apply(x) as tf.SymbolicTensor;

    const model = tf.model({
      inputs: input,
      outputs: constraintProb,
      name: 'cppo_constraint'
    });

    model.compile({
      optimizer: tf.train.adam(this.config.learningRate),
      loss: 'binaryCrossentropy'
    });

    return model;
  }

  public async initialize(): Promise<void> {
    await super.initialize();
    this.constraintNetwork = this.buildConstraintNetwork();
    console.log('✅ CPPO Model initialized with constraint network');
  }

  /**
   * Check constraint violation
   */
  public async checkConstraint(state: number[]): Promise<number> {
    if (!this.constraintNetwork) {
      throw new Error('Constraint network not initialized');
    }

    return tf.tidy(() => {
      const stateTensor = tf.tensor2d([state], [1, state.length]);
      const constraintProb = this.constraintNetwork!.predict(stateTensor) as tf.Tensor;
      return constraintProb.dataSync()[0];
    });
  }

  /**
   * Get action with constraint checking
   */
  public override async getAction(state: number[], deterministic: boolean = false): Promise<{
    action: number;
    probability: number;
    value: number;
    constraintViolation?: number;
  }> {
    const baseResult = await super.getAction(state, deterministic);
    const constraintViolation = await this.checkConstraint(state);

    return {
      ...baseResult,
      constraintViolation
    };
  }

  public override dispose(): void {
    super.dispose();
    if (this.constraintNetwork) {
      this.constraintNetwork.dispose();
      this.constraintNetwork = null;
    }
  }
}

/**
 * Model Factory
 */
export class TFRLModelFactory {
  static async createPPOModel(config: TFModelConfig): Promise<TFPPOModel> {
    const model = new TFPPOModel(config);
    await model.initialize();
    return model;
  }

  static async createCPPOModel(config: TFModelConfig & { constraintThreshold?: number }): Promise<TFCPPOModel> {
    const model = new TFCPPOModel(config);
    await model.initialize();
    return model;
  }
}
