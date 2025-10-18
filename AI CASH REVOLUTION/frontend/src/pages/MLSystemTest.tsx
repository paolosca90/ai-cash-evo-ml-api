import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { runMLSystemTests } from '@/lib/rl-trading/test-ml-system';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
}

export default function MLSystemTest() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [totalDuration, setTotalDuration] = useState<number>(0);

  const runTests = async () => {
    setIsRunning(true);
    setResults([]);

    const startTime = performance.now();

    try {
      const testResults = await runMLSystemTests();
      setResults(testResults);
    } catch (error) {
      console.error('Test execution failed:', error);
    } finally {
      const endTime = performance.now();
      setTotalDuration(endTime - startTime);
      setIsRunning(false);
    }
  };

  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;
  const passRate = results.length > 0 ? ((passedCount / results.length) * 100).toFixed(1) : '0';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">🧪 ML System Verification</h1>
            <p className="text-muted-foreground">
              Comprehensive testing of TensorFlow.js implementation
            </p>
          </div>
          <Button
            onClick={runTests}
            disabled={isRunning}
            size="lg"
            className="min-w-[150px]"
          >
            {isRunning ? '⏳ Running Tests...' : '▶️ Run Tests'}
          </Button>
        </div>

        {results.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-green-500/30 bg-green-500/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400">
                    ✅ Passed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600 dark:text-green-500">
                    {passedCount}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-red-500/30 bg-red-500/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-red-700 dark:text-red-400">
                    ❌ Failed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600 dark:text-red-500">
                    {failedCount}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-blue-500/30 bg-blue-500/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400">
                    📊 Pass Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-500">
                    {passRate}%
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Test Results</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Total duration: {totalDuration.toFixed(0)}ms
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {results.map((result, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${
                        result.passed
                          ? 'border-green-500/30 bg-green-500/5'
                          : 'border-red-500/30 bg-red-500/5'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">
                            {result.passed ? '✅' : '❌'}
                          </span>
                          <div>
                            <h3 className="font-semibold">{result.name}</h3>
                            {result.duration && (
                              <p className="text-sm text-muted-foreground">
                                {result.duration.toFixed(0)}ms
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      {!result.passed && result.error && (
                        <div className="mt-2 p-3 bg-red-950/30 rounded border border-red-500/30">
                          <p className="text-sm text-red-400 font-mono">
                            {result.error}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {failedCount === 0 && (
              <Card className="border-green-500/30 bg-green-500/10">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-6xl mb-4">🎉</div>
                    <h2 className="text-2xl font-bold text-green-700 dark:text-green-400 mb-2">
                      All Tests Passed!
                    </h2>
                    <p className="text-green-600 dark:text-green-500">
                      ML system is fully functional and ready for production use.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {results.length === 0 && !isRunning && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🚀</div>
                <h2 className="text-2xl font-bold mb-2">Ready to Test</h2>
                <p className="text-muted-foreground mb-6">
                  Click "Run Tests" to verify the ML system implementation
                </p>
                <div className="space-y-2 text-sm text-left max-w-2xl mx-auto">
                  <p className="font-semibold">Tests include:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>TensorFlow.js Backend Verification</li>
                    <li>PPO Model Creation and Inference</li>
                    <li>CPPO Model with Constraint Checking</li>
                    <li>Uncertainty Quantification</li>
                    <li>Training Pipeline (GAE, PPO updates)</li>
                    <li>Model Persistence (Save/Load)</li>
                    <li>Memory Management (Leak Detection)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
