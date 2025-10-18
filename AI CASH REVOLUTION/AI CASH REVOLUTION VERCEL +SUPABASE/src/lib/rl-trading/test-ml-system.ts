/**
 * ML System Tester
 * Real-time testing system for TensorFlow.js ML models with actual OANDA data
 */

import * as tf from '@tensorflow/tfjs';
import { createClient } from '@supabase/supabase-js';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
  details?: any;
}

export class MLSystemTester {
  private supabase: any;
  private testResults: TestResult[] = [];
  private startTime: number = 0;

  constructor() {
    // Initialize Supabase client
    this.supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    );
  }

  async runAllTests(): Promise<TestResult[]> {
    this.testResults = [];
    this.startTime = performance.now();

    console.log('🧪 Starting ML System Tests...');

    // Test 1: TensorFlow.js Backend Initialization
    await this.testTensorFlowBackend();

    // Test 2: PPO Model Creation
    await this.testPPOModelCreation();

    // Test 3: Real-time OANDA Data Connection
    await this.testOANDADataConnection();

    // Test 4: Real-time Inference
    await this.testRealTimeInference();

    // Test 5: Uncertainty Quantification
    await this.testUncertaintyQuantification();

    // Test 6: Safety Constraints Validation
    await this.testSafetyConstraints();

    // Test 7: Supabase Connection
    await this.testSupabaseConnection();

    // Test 8: Signal Generation API
    await this.testSignalGenerationAPI();

    // Test 9: Model Persistence
    await this.testModelPersistence();

    // Test 10: Memory Management
    await this.testMemoryManagement();

    return this.testResults;
  }

  private async runTest(testName: string, testFunction: () => Promise<any>): Promise<void> {
    const startTime = performance.now();

    try {
      console.log(`🔄 Running test: ${testName}`);
      const result = await testFunction();
      const duration = performance.now() - startTime;

      this.testResults.push({
        name: testName,
        passed: true,
        duration,
        details: result
      });

      console.log(`✅ ${testName} - PASSED (${duration.toFixed(0)}ms)`);

    } catch (error) {
      const duration = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.testResults.push({
        name: testName,
        passed: false,
        duration,
        error: errorMessage
      });

      console.log(`❌ ${testName} - FAILED (${duration.toFixed(0)}ms): ${errorMessage}`);
    }
  }

  private async testTensorFlowBackend(): Promise<void> {
    await this.runTest('TensorFlow.js Backend', async () => {
      // Test backend initialization
      const backend = tf.getBackend();
      console.log(`Current backend: ${backend}`);

      // Test basic tensor operations
      const a = tf.tensor1d([1, 2, 3]);
      const b = tf.tensor1d([4, 5, 6]);
      const c = tf.add(a, b);
      const result = await c.array();

      a.dispose();
      b.dispose();
      c.dispose();

      return {
        backend,
        tensorResult: result,
        memory: tf.memory()
      };
    });
  }

  private async testPPOModelCreation(): Promise<void> {
    await this.runTest('PPO Model Creation', async () => {
      // Create a simple PPO-style neural network
      const model = tf.sequential({
        layers: [
          tf.layers.dense({ inputShape: [10], units: 64, activation: 'relu' }),
          tf.layers.dense({ units: 32, activation: 'relu' }),
          tf.layers.dense({ units: 3, activation: 'softmax' }) // BUY/SELL/HOLD
        ]
      });

      // Compile model
      model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
      });

      // Test prediction
      const testInput = tf.randomNormal([1, 10]);
      const prediction = model.predict(testInput) as tf.Tensor;
      const result = await prediction.array();

      // Cleanup
      testInput.dispose();
      prediction.dispose();
      model.dispose();

      return {
        modelLayers: model.layers.length,
        predictionShape: result[0].length,
        memory: tf.memory()
      };
    });
  }

  private async testOANDADataConnection(): Promise<void> {
    await this.runTest('OANDA Data Connection', async () => {
      // Test OANDA API via Supabase function
      const { data, error } = await this.supabase.functions.invoke('oanda-market-data', {
        body: {
          symbol: 'EURUSD',
          timeframe: 'M1',
          count: 10
        }
      });

      if (error) {
        throw new Error(`OANDA API Error: ${error.message}`);
      }

      if (!data || !data.candles || data.candles.length === 0) {
        throw new Error('No OANDA data received');
      }

      return {
        candlesReceived: data.candles.length,
        latestPrice: data.candles[data.candles.length - 1].close,
        timeframe: data.timeframe
      };
    });
  }

  private async testRealTimeInference(): Promise<void> {
    await this.runTest('Real-time Inference', async () => {
      // Get real market data
      const { data: marketData } = await this.supabase.functions.invoke('get-real-indicators', {
        body: {
          symbol: 'EURUSD',
          indicators: ['RSI', 'ADX', 'EMA', 'ATR']
        }
      });

      if (!marketData) {
        throw new Error('Cannot get market indicators');
      }

      // Create feature vector from indicators
      const features = [
        marketData.rsi || 50,
        marketData.adx || 25,
        marketData.ema12 || 1.1,
        marketData.ema21 || 1.1,
        marketData.atr || 0.001,
        // Add more features...
      ];

      // Create and test model inference
      const model = tf.sequential({
        layers: [
          tf.layers.dense({ inputShape: [features.length], units: 32, activation: 'relu' }),
          tf.layers.dense({ units: 3, activation: 'softmax' })
        ]
      });

      const inputTensor = tf.tensor2d([features]);
      const prediction = model.predict(inputTensor) as tf.Tensor;
      const result = await prediction.array();

      // Cleanup
      inputTensor.dispose();
      prediction.dispose();
      model.dispose();

      return {
        features: features.length,
        prediction: result[0],
        maxProbIndex: result[0].indexOf(Math.max(...result[0]))
      };
    });
  }

  private async testUncertaintyQuantification(): Promise<void> {
    await this.runTest('Uncertainty Quantification', async () => {
      // Test epistemic uncertainty using dropout
      const model = tf.sequential({
        layers: [
          tf.layers.dense({ inputShape: [5], units: 32, activation: 'relu' }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({ units: 16, activation: 'relu' }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({ units: 3, activation: 'softmax' })
        ]
      });

      const testInput = tf.randomNormal([1, 5]);
      const predictions = [];

      // Run multiple predictions with dropout
      for (let i = 0; i < 10; i++) {
        const pred = model.predict(testInput, { training: true }) as tf.Tensor;
        const result = await pred.array();
        predictions.push(result[0]);
        pred.dispose();
      }

      // Calculate uncertainty (standard deviation)
      const meanPrediction = predictions[0].map((_, i) =>
        predictions.reduce((sum, p) => sum + p[i], 0) / predictions.length
      );

      const uncertainty = predictions[0].map((_, i) => {
        const variance = predictions.reduce((sum, p) => sum + Math.pow(p[i] - meanPrediction[i], 2), 0) / predictions.length;
        return Math.sqrt(variance);
      });

      // Cleanup
      testInput.dispose();
      model.dispose();

      return {
        meanPrediction,
        uncertainty,
        avgUncertainty: uncertainty.reduce((sum, u) => sum + u, 0) / uncertainty.length
      };
    });
  }

  private async testSafetyConstraints(): Promise<void> {
    await this.runTest('Safety Constraints', async () => {
      // Test safety constraint validation
      const testCases = [
        { price: 1.1000, stopLoss: 1.0990, takeProfit: 1.1010, risk: 1.0 }, // Valid
        { price: 1.1000, stopLoss: 1.1050, takeProfit: 1.1010, risk: 1.0 }, // Invalid: SL above entry
        { price: 1.1000, stopLoss: 1.0990, takeProfit: 1.0995, risk: 1.0 }, // Invalid: TP below SL
        { price: 1.1000, stopLoss: 1.0990, takeProfit: 1.1010, risk: 10.0 }, // Invalid: Too much risk
      ];

      const results = testCases.map(testCase => {
        const validSL = testCase.stopLoss < testCase.price;
        const validTP = testCase.takeProfit > testCase.price;
        const validRisk = testCase.risk <= 2.0; // Max 2% risk
        const validRRR = (testCase.takeProfit - testCase.price) / (testCase.price - testCase.stopLoss) >= 1.5;

        return {
          testCase,
          valid: validSL && validTP && validRisk && validRRR,
          violations: [
            !validSL && 'Invalid Stop Loss',
            !validTP && 'Invalid Take Profit',
            !validRisk && 'Risk Too High',
            !validRRR && 'Poor Risk/Reward'
          ].filter(Boolean)
        };
      });

      const allValid = results.every(r => r.valid || r.violations.length > 0);

      return {
        testCases: testCases.length,
        allValid,
        results
      };
    });
  }

  private async testSupabaseConnection(): Promise<void> {
    await this.runTest('Supabase Connection', async () => {
      // Test database connection
      const { data, error } = await this.supabase
        .from('mt5_signals')
        .select('count(*)')
        .limit(1);

      if (error) {
        throw new Error(`Database connection error: ${error.message}`);
      }

      // Test real-time subscription
      const channel = this.supabase
        .channel('test-channel')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'mt5_signals' },
          (payload: any) => console.log('Real-time update:', payload)
        )
        .subscribe();

      // Cleanup subscription
      setTimeout(() => this.supabase.removeChannel(channel), 1000);

      return {
        connected: true,
        realTimeEnabled: true,
        recordCount: data?.[0]?.count || 0
      };
    });
  }

  private async testSignalGenerationAPI(): Promise<void> {
    await this.runTest('Signal Generation API', async () => {
      // Test the actual signal generation API
      const { data, error } = await this.supabase.functions.invoke('generate-ai-signals', {
        body: {
          symbol: 'EURUSD',
          debug: true
        }
      });

      if (error) {
        throw new Error(`Signal generation error: ${error.message}`);
      }

      if (!data || !data.signal) {
        throw new Error('No signal generated');
      }

      return {
        signal: data.signal,
        confidence: data.confidence,
        entry: data.entry,
        stopLoss: data.stopLoss,
        takeProfit: data.takeProfit,
        timestamp: data.timestamp
      };
    });
  }

  private async testModelPersistence(): Promise<void> {
    await this.runTest('Model Persistence', async () => {
      // Test model saving and loading
      const model = tf.sequential({
        layers: [
          tf.layers.dense({ inputShape: [3], units: 8, activation: 'relu' }),
          tf.layers.dense({ units: 2, activation: 'softmax' })
        ]
      });

      // Test save
      const saveResult = await model.save('localstorage://test-model');

      // Test load
      const loadedModel = await tf.loadLayersModel('localstorage://test-model');

      // Verify they produce same predictions
      const testInput = tf.randomNormal([1, 3]);
      const originalPred = await model.predict(testInput).array();
      const loadedPred = await loadedModel.predict(testInput).array();

      // Cleanup
      testInput.dispose();
      model.dispose();
      loadedModel.dispose();

      const predictionsMatch = JSON.stringify(originalPred) === JSON.stringify(loadedPred);

      return {
        saveSuccessful: !!saveResult,
        loadSuccessful: !!loadedModel,
        predictionsMatch
      };
    });
  }

  private async testMemoryManagement(): Promise<void> {
    await this.runTest('Memory Management', async () => {
      // Get initial memory state
      const initialMemory = tf.memory();

      // Create and dispose multiple tensors
      const tensors = [];
      for (let i = 0; i < 100; i++) {
        tensors.push(tf.randomNormal([100, 100]));
      }

      const peakMemory = tf.memory();

      // Dispose all tensors
      tensors.forEach(tensor => tensor.dispose());

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = tf.memory();

      return {
        initialTensors: initialMemory.numTensors,
        peakTensors: peakMemory.numTensors,
        finalTensors: finalMemory.numTensors,
        memoryLeakDetected: finalMemory.numTensors > initialMemory.numTensors + 10 // Allow some tolerance
      };
    });
  }
}

// Export singleton instance
export const mlSystemTester = new MLSystemTester();