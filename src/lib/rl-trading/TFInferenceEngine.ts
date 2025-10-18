// @ts-nocheck
import * as tf from '@tensorflow/tfjs';
import { TFPPOModel, TFCPPOModel, TFRLModelFactory, TFModelConfig } from './TFRLModelArchitecture';
import { UnifiedFeatureEngineer, NormalizedFeatureVector } from '../feature-engineering/UnifiedFeatureEngineer';
import {
  TradingState,
  RLAction,
  UncertaintyEstimate,
  ConstraintViolation,
  RLInferenceConfig
} from '../../types/rl-trading';

/**
 * TensorFlow.js-based Inference Engine
 * Handles real-time predictions with ensemble models
 */
export class TFInferenceEngine {
  private models: Map<string, TFPPOModel | TFCPPOModel> = new Map();
  private featureEngineer: UnifiedFeatureEngineer;
  private config: RLInferenceConfig;
  private isReady: boolean = false;

  constructor(config: RLInferenceConfig, featureEngineer: UnifiedFeatureEngineer) {
    this.config = config;
    this.featureEngineer = featureEngineer;
  }

  /**
   * Initialize models
   */
  public async initialize(): Promise<void> {
    console.log('🚀 Initializing TensorFlow.js Inference Engine...');

    // Set TensorFlow.js backend (webgl for GPU, cpu for fallback)
    await tf.ready();
    console.log(`📍 TensorFlow.js backend: ${tf.getBackend()}`);

    // Initialize ensemble models
    await this.initializeModels();

    this.isReady = true;
    console.log('✅ Inference Engine ready');
  }

  /**
   * Initialize all models in the ensemble
   */
  private async initializeModels(): Promise<void> {
    const modelConfigs: { name: string; config: TFModelConfig & { constraintThreshold?: number } }[] = [
      {
        name: 'PPO',
        config: {
          inputDim: 50, // Feature vector size
          actionDim: 3, // BUY, SELL, HOLD
          hiddenUnits: [256, 128, 64],
          learningRate: 0.0003,
          clipRatio: 0.2,
          dropout: 0.1
        }
      },
      {
        name: 'CPPO',
        config: {
          inputDim: 50,
          actionDim: 3,
          hiddenUnits: [256, 128, 64],
          learningRate: 0.0003,
          clipRatio: 0.2,
          dropout: 0.1,
          constraintThreshold: 0.3
        }
      }
    ];

    for (const { name, config } of modelConfigs) {
      try {
        let model: TFPPOModel | TFCPPOModel;

        if (name === 'CPPO') {
          model = await TFRLModelFactory.createCPPOModel(config as TFModelConfig & { constraintThreshold: number });
        } else {
          model = await TFRLModelFactory.createPPOModel(config);
        }

        // Try to load pre-trained weights
        try {
          await model.loadModel(name.toLowerCase());
          console.log(`✅ Loaded pre-trained ${name} model`);
        } catch (error) {
          console.log(`⚠️ No pre-trained ${name} model found, using initialized weights`);
        }

        this.models.set(name, model);
      } catch (error) {
        console.error(`Failed to initialize ${name} model:`, error);
      }
    }
  }

  /**
   * Convert TradingState to feature vector
   */
  private stateToFeatures(state: TradingState): number[] {
    // Extract features using UnifiedFeatureEngineer
    const featureVector = this.featureEngineer.generateFeatureVector(
      state.marketContext,
      state.marketContext.technicalIndicators as Record<string, unknown>,
      state.marketContext.sessionInfo,
      {} as Record<string, unknown>, // Smart money concepts
      state.marketContext.sentiment as Record<string, unknown>,
      state.marketContext.marketRegime,
      state.timestamp
    );

    // Flatten all feature categories into single vector
    const features = [
      ...featureVector.technicalFeatures,
      ...featureVector.sessionFeatures,
      ...featureVector.smartMoneyFeatures,
      ...featureVector.sentimentFeatures,
      ...featureVector.regimeFeatures,
      ...featureVector.marketContextFeatures
    ];

    // Pad or truncate to expected size (50)
    while (features.length < 50) features.push(0);
    return features.slice(0, 50);
  }

  /**
   * Convert action index to RLAction
   */
  private indexToAction(
    actionIndex: number,
    probability: number,
    value: number,
    state: TradingState
  ): RLAction {
    const actions: ('BUY' | 'SELL' | 'HOLD')[] = ['BUY', 'SELL', 'HOLD'];
    const action = actions[actionIndex] || 'HOLD';

    // Calculate position size based on confidence and risk
    const basePositionSize = this.config.maxPositionSize || 0.1;
    const positionSize = basePositionSize * probability;

    // Calculate stop loss and take profit based on volatility
    const atr = state.marketContext.technicalIndicators.atr.value;
    const price = state.marketContext.price;

    let stopLoss: number | undefined;
    let takeProfit: number | undefined;

    if (action === 'BUY') {
      stopLoss = price - atr * 2;
      takeProfit = price + atr * 3;
    } else if (action === 'SELL') {
      stopLoss = price + atr * 2;
      takeProfit = price - atr * 3;
    }

    return {
      type: action,
      direction: action as 'BUY' | 'SELL' | 'HOLD',
      confidence: probability,
      intensity: positionSize,
      riskLevel: 1 - probability, // Higher confidence = lower risk
      reasoning: this.generateReasoning(action, probability, state),
      stopLoss,
      takeProfit,
      expectedReward: value,
      entryPrice: price,
      timestamp: state.timestamp
    } as RLAction & { type: string; entryPrice: number; timestamp: Date };
  }

  /**
   * Generate reasoning for the action
   */
  private generateReasoning(action: string, confidence: number, state: TradingState): string {
    const reasons: string[] = [];

    // Market regime
    reasons.push(`Market: ${state.marketContext.marketRegime.trendDirection}`);

    // Confidence level
    if (confidence > 0.8) {
      reasons.push('High confidence signal');
    } else if (confidence > 0.6) {
      reasons.push('Moderate confidence');
    }

    // Session
    const session = state.marketContext.sessionInfo.londonSession ? 'London' :
                    state.marketContext.sessionInfo.nySession ? 'NY' :
                    state.marketContext.sessionInfo.asianSession ? 'Asian' : 'Off-hours';
    reasons.push(`Session: ${session}`);

    // Technical indicators
    const rsi = state.marketContext.technicalIndicators.rsi.value;
    if (rsi > 70) reasons.push('RSI overbought');
    else if (rsi < 30) reasons.push('RSI oversold');

    return reasons.join(' | ');
  }

  /**
   * Main prediction method with ensemble
   */
  public async predict(state: TradingState): Promise<{
    action: RLAction;
    uncertainty: UncertaintyEstimate;
    constraints: ConstraintViolation[];
  }> {
    if (!this.isReady) {
      throw new Error('Inference engine not initialized');
    }

    const features = this.stateToFeatures(state);
    const predictions: Array<{
      action: number;
      probability: number;
      value: number;
      modelName: string;
    }> = [];

    // Get predictions from all models
    for (const [name, model] of this.models) {
      try {
        const result = await model.getAction(features, false);
        predictions.push({
          action: result.action,
          probability: result.probability,
          value: result.value,
          modelName: name
        });
      } catch (error) {
        console.error(`Error predicting with ${name}:`, error);
      }
    }

    if (predictions.length === 0) {
      throw new Error('No model predictions available');
    }

    // Ensemble: Weighted voting
    const actionVotes: Map<number, number> = new Map();
    const actionConfidences: Map<number, number[]> = new Map();

    for (const pred of predictions) {
      const currentVote = actionVotes.get(pred.action) || 0;
      actionVotes.set(pred.action, currentVote + pred.probability);

      const confidences = actionConfidences.get(pred.action) || [];
      confidences.push(pred.probability);
      actionConfidences.set(pred.action, confidences);
    }

    // Select action with highest weighted vote
    let bestAction = 0;
    let bestScore = 0;
    for (const [action, score] of actionVotes) {
      if (score > bestScore) {
        bestScore = score;
        bestAction = action;
      }
    }

    // Calculate average confidence for selected action
    const confidences = actionConfidences.get(bestAction) || [0.5];
    const avgConfidence = confidences.reduce((a, b) => a + b) / confidences.length;

    // Calculate average value
    const avgValue = predictions.reduce((sum, p) => sum + p.value, 0) / predictions.length;

    // Create final action
    const finalAction = this.indexToAction(bestAction, avgConfidence, avgValue, state);

    // Calculate uncertainty
    const uncertainty = await this.calculateEnsembleUncertainty(features);

    // Check constraints
    const constraints = await this.checkConstraints(state, finalAction);

    return {
      action: finalAction,
      uncertainty,
      constraints
    };
  }

  /**
   * Calculate uncertainty from ensemble
   */
  private async calculateEnsembleUncertainty(features: number[]): Promise<UncertaintyEstimate> {
    const uncertainties: UncertaintyEstimate[] = [];

    for (const model of this.models.values()) {
      try {
        const unc = await model.calculateUncertainty(features, 5);
        uncertainties.push(unc);
      } catch (error) {
        console.error('Error calculating uncertainty:', error);
      }
    }

    if (uncertainties.length === 0) {
      return {
        epistemic: 0.5,
        aleatoric: 0.5,
        total: 1.0,
        confidence: 0.5,
        entropy: Math.log(3), // log(num_actions)
        predictionSet: ['BUY', 'SELL', 'HOLD']
      };
    }

    // Average uncertainties
    const avgEpistemic = uncertainties.reduce((sum, u) => sum + u.epistemic, 0) / uncertainties.length;
    const avgAleatoric = uncertainties.reduce((sum, u) => sum + u.aleatoric, 0) / uncertainties.length;
    const avgEntropy = uncertainties.reduce((sum, u) => sum + u.entropy, 0) / uncertainties.length;

    return {
      epistemic: avgEpistemic,
      aleatoric: avgAleatoric,
      total: avgEpistemic + avgAleatoric,
      confidence: Math.max(0, 1 - avgEpistemic),
      entropy: avgEntropy,
      predictionSet: ['BUY', 'SELL', 'HOLD']
    };
  }

  /**
   * Check safety constraints
   */
  private async checkConstraints(state: TradingState, action: RLAction): Promise<ConstraintViolation[]> {
    const violations: ConstraintViolation[] = [];

    // Check if CPPO model flags constraint violation
    const cppoModel = this.models.get('CPPO') as TFCPPOModel;
    if (cppoModel) {
      const features = this.stateToFeatures(state);
      const constraintProb = await cppoModel.checkConstraint(features);

      if (constraintProb > 0.5) {
        violations.push({
          type: 'risk_limit', // Changed from 'safety_constraint' to match ConstraintViolation type
          severity: constraintProb > 0.8 ? 'high' : 'medium',
          message: `Constraint violation probability: ${(constraintProb * 100).toFixed(1)}%`,
          value: constraintProb,
          limit: 0.5,
          recommendedAction: 'Reduce position size or avoid trade'
        });
      }
    }

    // Risk level check
    if (action.riskLevel > 0.7) {
      violations.push({
        type: 'risk_limit',
        severity: 'high',
        message: 'Risk level exceeds safety threshold',
        value: action.riskLevel,
        limit: 0.7,
        recommendedAction: 'Reduce position size'
      });
    }

    // Position size check
    if (action.intensity > (this.config.maxPositionSize || 0.2)) {
      violations.push({
        type: 'position_size',
        severity: 'medium',
        message: 'Position size exceeds maximum',
        value: action.intensity,
        limit: this.config.maxPositionSize || 0.2,
        recommendedAction: 'Reduce position size'
      });
    }

    // Market hours check
    const hour = new Date(state.timestamp).getUTCHours();
    if (hour < 8 || hour > 20) {
      violations.push({
        type: 'market_hours',
        severity: 'low',
        message: 'Trading outside optimal hours',
        value: hour,
        limit: 8,
        recommendedAction: 'Wait for market open'
      });
    }

    return violations;
  }

  /**
   * Save all models
   */
  public async saveModels(): Promise<void> {
    for (const [name, model] of this.models) {
      await model.saveModel(name.toLowerCase());
    }
    console.log('✅ All models saved');
  }

  /**
   * Dispose all models
   */
  public dispose(): void {
    for (const model of this.models.values()) {
      model.dispose();
    }
    this.models.clear();
    this.isReady = false;
    console.log('🗑️ Inference Engine disposed');
  }

  /**
   * Get TensorFlow.js memory info
   */
  public getMemoryInfo(): { numTensors: number; numBytes: number } {
    return tf.memory();
  }
}
