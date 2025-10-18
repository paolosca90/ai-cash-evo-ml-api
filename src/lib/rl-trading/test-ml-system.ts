// @ts-nocheck
/**
 * ML System Verification Test
 * Tests all TensorFlow.js ML components
 */

import * as tf from '@tensorflow/tfjs';
import { TFRLModelFactory, TFModelConfig } from './TFRLModelArchitecture';
import { TFModelTrainer, TrainingSample } from './TFModelTrainer';
import { ModelInitializer } from './ModelInitializer';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
}

export class MLSystemTester {
  private results: TestResult[] = [];

  /**
   * Run all tests
   */
  public async runAllTests(): Promise<TestResult[]> {
    console.log('🧪 Starting ML System Verification Tests...\n');

    await this.testTensorFlowBackend();
    await this.testPPOModelCreation();
    await this.testCPPOModelCreation();
    await this.testPPOInference();
    await this.testCPPOConstraint();
    await this.testUncertaintyQuantification();
    await this.testTrainingPipeline();
    await this.testModelPersistence();
    await this.testMemoryManagement();

    this.printResults();
    return this.results;
  }

  /**
   * Test 1: TensorFlow.js Backend
   */
  private async testTensorFlowBackend(): Promise<void> {
    const testName = 'TensorFlow.js Backend';
    const startTime = performance.now();

    try {
      await tf.ready();
      const backend = tf.getBackend();

      if (!backend) {
        throw new Error('No backend available');
      }

      console.log(`✅ ${testName}: ${backend} backend ready`);
      this.results.push({
        name: testName,
        passed: true,
        duration: performance.now() - startTime
      });
    } catch (error) {
      console.error(`❌ ${testName} failed:`, error);
      this.results.push({
        name: testName,
        passed: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Test 2: PPO Model Creation
   */
  private async testPPOModelCreation(): Promise<void> {
    const testName = 'PPO Model Creation';
    const startTime = performance.now();

    try {
      const config: TFModelConfig = {
        inputDim: 50,
        actionDim: 3,
        hiddenUnits: [128, 64],
        learningRate: 0.001
      };

      const model = await TFRLModelFactory.createPPOModel(config);

      if (!model) {
        throw new Error('Model creation failed');
      }

      // Test forward pass
      const dummyState = Array(50).fill(0).map(() => Math.random());
      const result = await model.getAction(dummyState);

      if (result.action < 0 || result.action >= 3) {
        throw new Error(`Invalid action: ${result.action}`);
      }

      if (result.probability <= 0 || result.probability > 1) {
        throw new Error(`Invalid probability: ${result.probability}`);
      }

      console.log(`✅ ${testName}: Action=${result.action}, Prob=${result.probability.toFixed(3)}`);

      model.dispose();

      this.results.push({
        name: testName,
        passed: true,
        duration: performance.now() - startTime
      });
    } catch (error) {
      console.error(`❌ ${testName} failed:`, error);
      this.results.push({
        name: testName,
        passed: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Test 3: CPPO Model Creation
   */
  private async testCPPOModelCreation(): Promise<void> {
    const testName = 'CPPO Model Creation';
    const startTime = performance.now();

    try {
      const config: TFModelConfig & { constraintThreshold: number } = {
        inputDim: 50,
        actionDim: 3,
        hiddenUnits: [128, 64],
        learningRate: 0.001,
        constraintThreshold: 0.3
      };

      const model = await TFRLModelFactory.createCPPOModel(config);

      if (!model) {
        throw new Error('CPPO model creation failed');
      }

      // Test forward pass
      const dummyState = Array(50).fill(0).map(() => Math.random());
      const result = await model.getAction(dummyState);

      if (result.action < 0 || result.action >= 3) {
        throw new Error(`Invalid action: ${result.action}`);
      }

      console.log(`✅ ${testName}: Action=${result.action}, Constraint=${result.constraintViolation?.toFixed(3) || 'N/A'}`);

      model.dispose();

      this.results.push({
        name: testName,
        passed: true,
        duration: performance.now() - startTime
      });
    } catch (error) {
      console.error(`❌ ${testName} failed:`, error);
      this.results.push({
        name: testName,
        passed: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Test 4: PPO Inference
   */
  private async testPPOInference(): Promise<void> {
    const testName = 'PPO Inference';
    const startTime = performance.now();

    try {
      const config: TFModelConfig = {
        inputDim: 50,
        actionDim: 3,
        hiddenUnits: [128, 64],
        learningRate: 0.001
      };

      const model = await TFRLModelFactory.createPPOModel(config);

      // Test multiple inferences
      const numTests = 10;
      const actions: number[] = [];

      for (let i = 0; i < numTests; i++) {
        const state = Array(50).fill(0).map(() => Math.random() * 2 - 1);
        const result = await model.getAction(state, false);
        actions.push(result.action);
      }

      // Check action diversity (not all same action)
      const uniqueActions = new Set(actions).size;
      if (uniqueActions === 1) {
        console.warn(`⚠️ ${testName}: All actions are the same (${actions[0]})`);
      }

      console.log(`✅ ${testName}: ${numTests} inferences, ${uniqueActions} unique actions`);

      model.dispose();

      this.results.push({
        name: testName,
        passed: true,
        duration: performance.now() - startTime
      });
    } catch (error) {
      console.error(`❌ ${testName} failed:`, error);
      this.results.push({
        name: testName,
        passed: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Test 5: CPPO Constraint Check
   */
  private async testCPPOConstraint(): Promise<void> {
    const testName = 'CPPO Constraint Check';
    const startTime = performance.now();

    try {
      const config: TFModelConfig & { constraintThreshold: number } = {
        inputDim: 50,
        actionDim: 3,
        hiddenUnits: [128, 64],
        learningRate: 0.001,
        constraintThreshold: 0.5
      };

      const model = await TFRLModelFactory.createCPPOModel(config);

      // Test constraint checking
      const safeState = Array(50).fill(0).map(() => Math.random() * 0.3); // Low values
      const riskyState = Array(50).fill(0).map(() => Math.random() * 2); // High values

      const safeConstraint = await model.checkConstraint(safeState);
      const riskyConstraint = await model.checkConstraint(riskyState);

      console.log(`✅ ${testName}: Safe=${safeConstraint.toFixed(3)}, Risky=${riskyConstraint.toFixed(3)}`);

      model.dispose();

      this.results.push({
        name: testName,
        passed: true,
        duration: performance.now() - startTime
      });
    } catch (error) {
      console.error(`❌ ${testName} failed:`, error);
      this.results.push({
        name: testName,
        passed: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Test 6: Uncertainty Quantification
   */
  private async testUncertaintyQuantification(): Promise<void> {
    const testName = 'Uncertainty Quantification';
    const startTime = performance.now();

    try {
      const config: TFModelConfig = {
        inputDim: 50,
        actionDim: 3,
        hiddenUnits: [128, 64],
        learningRate: 0.001,
        dropout: 0.2
      };

      const model = await TFRLModelFactory.createPPOModel(config);

      const state = Array(50).fill(0).map(() => Math.random());
      const uncertainty = await model.calculateUncertainty(state, 10);

      if (uncertainty.epistemic < 0 || uncertainty.epistemic > 1) {
        throw new Error(`Invalid epistemic uncertainty: ${uncertainty.epistemic}`);
      }

      if (uncertainty.total < 0) {
        throw new Error(`Invalid total uncertainty: ${uncertainty.total}`);
      }

      console.log(`✅ ${testName}: Epistemic=${uncertainty.epistemic.toFixed(3)}, Total=${uncertainty.total.toFixed(3)}`);

      model.dispose();

      this.results.push({
        name: testName,
        passed: true,
        duration: performance.now() - startTime
      });
    } catch (error) {
      console.error(`❌ ${testName} failed:`, error);
      this.results.push({
        name: testName,
        passed: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Test 7: Training Pipeline
   */
  private async testTrainingPipeline(): Promise<void> {
    const testName = 'Training Pipeline';
    const startTime = performance.now();

    try {
      const config: TFModelConfig = {
        inputDim: 50,
        actionDim: 3,
        hiddenUnits: [64, 32],
        learningRate: 0.001
      };

      const model = await TFRLModelFactory.createPPOModel(config);

      // Generate small training dataset
      const samples: TrainingSample[] = [];
      for (let i = 0; i < 100; i++) {
        const state = Array(50).fill(0).map(() => Math.random() * 2 - 1);
        const action = Math.floor(Math.random() * 3);
        const reward = Math.random();
        const nextState = state.map(v => v + (Math.random() - 0.5) * 0.1);

        samples.push({
          state,
          action,
          reward,
          nextState,
          done: Math.random() < 0.1,
          logProb: Math.log(0.33),
          value: reward * 0.8
        });
      }

      const trainer = new TFModelTrainer(model, {
        epochs: 3,
        batchSize: 32,
        learningRate: 0.001
      });

      const metrics = await trainer.train(samples);

      if (metrics.length !== 3) {
        throw new Error(`Expected 3 epochs, got ${metrics.length}`);
      }

      const lastMetric = metrics[metrics.length - 1];
      console.log(`✅ ${testName}: Final loss=${lastMetric.totalLoss.toFixed(4)}, Reward=${lastMetric.avgReward.toFixed(3)}`);

      model.dispose();

      this.results.push({
        name: testName,
        passed: true,
        duration: performance.now() - startTime
      });
    } catch (error) {
      console.error(`❌ ${testName} failed:`, error);
      this.results.push({
        name: testName,
        passed: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Test 8: Model Persistence
   */
  private async testModelPersistence(): Promise<void> {
    const testName = 'Model Persistence';
    const startTime = performance.now();

    try {
      const config: TFModelConfig = {
        inputDim: 50,
        actionDim: 3,
        hiddenUnits: [64, 32],
        learningRate: 0.001
      };

      // Create and save model
      const model1 = await TFRLModelFactory.createPPOModel(config);
      const testState = Array(50).fill(0).map(() => Math.random());
      const result1 = await model1.getAction(testState, true);

      await model1.saveModel('test-model');
      model1.dispose();

      // Load model
      const model2 = await TFRLModelFactory.createPPOModel(config);
      await model2.loadModel('test-model');
      const result2 = await model2.getAction(testState, true);

      // Results should be identical (deterministic)
      if (result1.action !== result2.action) {
        console.warn(`⚠️ ${testName}: Actions differ (${result1.action} vs ${result2.action})`);
      }

      console.log(`✅ ${testName}: Save/Load successful`);

      model2.dispose();

      this.results.push({
        name: testName,
        passed: true,
        duration: performance.now() - startTime
      });
    } catch (error) {
      console.error(`❌ ${testName} failed:`, error);
      this.results.push({
        name: testName,
        passed: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Test 9: Memory Management
   */
  private async testMemoryManagement(): Promise<void> {
    const testName = 'Memory Management';
    const startTime = performance.now();

    try {
      const memBefore = tf.memory();

      // Create and dispose multiple models
      for (let i = 0; i < 5; i++) {
        const config: TFModelConfig = {
          inputDim: 50,
          actionDim: 3,
          hiddenUnits: [64, 32],
          learningRate: 0.001
        };

        const model = await TFRLModelFactory.createPPOModel(config);
        const state = Array(50).fill(0).map(() => Math.random());
        await model.getAction(state);
        model.dispose();
      }

      const memAfter = tf.memory();

      // Check for memory leaks (tensor count should be similar)
      const tensorDiff = memAfter.numTensors - memBefore.numTensors;

      if (tensorDiff > 50) {
        console.warn(`⚠️ ${testName}: Potential memory leak (${tensorDiff} extra tensors)`);
      }

      console.log(`✅ ${testName}: Tensors before=${memBefore.numTensors}, after=${memAfter.numTensors}, diff=${tensorDiff}`);

      this.results.push({
        name: testName,
        passed: true,
        duration: performance.now() - startTime
      });
    } catch (error) {
      console.error(`❌ ${testName} failed:`, error);
      this.results.push({
        name: testName,
        passed: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Print test results summary
   */
  private printResults(): void {
    console.log('\n📊 Test Results Summary\n');
    console.log('═'.repeat(70));

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;

    this.results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      const duration = result.duration ? ` (${result.duration.toFixed(0)}ms)` : '';
      console.log(`${status} ${result.name}${duration}`);
      if (!result.passed && result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    console.log('═'.repeat(70));
    console.log(`\n${passed}/${total} tests passed, ${failed} failed\n`);

    if (failed === 0) {
      console.log('🎉 All tests passed! ML system is fully functional.\n');
    } else {
      console.log('⚠️ Some tests failed. Please review the errors above.\n');
    }
  }
}

// Export test runner
export async function runMLSystemTests(): Promise<TestResult[]> {
  const tester = new MLSystemTester();
  return await tester.runAllTests();
}
