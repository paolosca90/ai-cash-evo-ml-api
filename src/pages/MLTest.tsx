/**
 * ML System Test Page
 * Quick verification that TensorFlow.js ML system is working
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MLSignalsPanel } from '@/components/MLSignalsPanel';
import Navigation from '@/components/Navigation';
import { MLSystemTester } from '@/lib/rl-trading/test-ml-system';
import { CheckCircle2, XCircle, Loader2, Play } from 'lucide-react';

export default function MLTest() {
  const [selectedSymbol, setSelectedSymbol] = useState('EURUSD');
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<Array<{
    name: string;
    passed: boolean;
    error?: string;
    duration?: number;
  }>>([]);

  const symbols = [
    'EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'BTCUSD'
  ];

  const runSystemTests = async () => {
    setIsRunningTests(true);
    setTestResults([]);

    try {
      const tester = new MLSystemTester();
      const results = await tester.runAllTests();
      setTestResults(results);
    } catch (error) {
      console.error('Test execution failed:', error);
    } finally {
      setIsRunningTests(false);
    }
  };

  const allTestsPassed = testResults.length > 0 && testResults.every(r => r.passed);
  const anyTestFailed = testResults.some(r => !r.passed);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">🧪 ML System Test</h1>
          <p className="text-muted-foreground">
            Verify that TensorFlow.js ML models are working correctly with real OANDA data
          </p>
        </div>

        {/* System Tests */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>System Verification Tests</CardTitle>
              <Button
                onClick={runSystemTests}
                disabled={isRunningTests}
                variant="outline"
              >
                {isRunningTests ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Run Tests
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {testResults.length === 0 && !isRunningTests && (
              <Alert>
                <AlertDescription>
                  Click "Run Tests" to verify ML system components
                </AlertDescription>
              </Alert>
            )}

            {isRunningTests && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <AlertDescription>Running ML system tests...</AlertDescription>
              </Alert>
            )}

            {testResults.length > 0 && (
              <>
                <div className="flex items-center gap-2 mb-4">
                  {allTestsPassed ? (
                    <Badge className="bg-green-500">All Tests Passed</Badge>
                  ) : anyTestFailed ? (
                    <Badge variant="destructive">Some Tests Failed</Badge>
                  ) : null}
                  <span className="text-sm text-muted-foreground">
                    {testResults.filter(r => r.passed).length}/{testResults.length} passed
                  </span>
                </div>

                <div className="space-y-2">
                  {testResults.map((result, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        result.passed
                          ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                          : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {result.passed ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className="font-medium">{result.name}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {result.duration ? `${result.duration.toFixed(0)}ms` : ''}
                        {result.error && (
                          <span className="text-red-600 ml-2">{result.error}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Symbol Selection */}
        <Card>
          <CardHeader>
            <CardTitle>ML Signal Generation Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block">
                Select Trading Pair
              </label>
              <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {symbols.map(symbol => (
                    <SelectItem key={symbol} value={symbol}>
                      {symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Live ML Signal Test */}
        <MLSignalsPanel symbol={selectedSymbol} />

        {/* Info */}
        <Alert>
          <AlertDescription>
            <strong>Test Components:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>TensorFlow.js backend initialization (WebGL/CPU)</li>
              <li>PPO and CPPO model creation</li>
              <li>Real-time inference with OANDA market data</li>
              <li>Uncertainty quantification (epistemic + aleatoric)</li>
              <li>Safety constraints validation</li>
              <li>Model persistence (IndexedDB)</li>
              <li>Memory management and cleanup</li>
            </ul>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
