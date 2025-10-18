import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Bot,
  Play,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  RefreshCw,
  Bug
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { generateAISignal } from '@/services/aiSignalService';
import type { AISignal } from '@/types/trading';

interface TestResult {
  id: string;
  symbol: string;
  timestamp: Date;
  success: boolean;
  signal?: AISignal;
  error?: string;
  source: string;
  processingTime: number;
  retryCount: number;
}

export const SignalTestPanel: React.FC = () => {
  const [testSymbol, setTestSymbol] = useState('EURUSD');
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [serviceHealth, setServiceHealth] = useState<{comprehensive?: boolean; fast?: boolean; fallback?: boolean} | null>(null);
  const { toast } = useToast();

  const runSignalTest = async (symbol: string, strategy: 'comprehensive' | 'fast' | 'fallback' = 'comprehensive') => {
    setIsRunning(true);

    const testResult: TestResult = {
      id: crypto.randomUUID(),
      symbol,
      timestamp: new Date(),
      success: false,
      source: strategy,
      processingTime: 0,
      retryCount: 0
    };

    try {
      console.log(`🧪 Testing AI signal generation for ${symbol} using ${strategy} strategy`);

      const startTime = Date.now();
      const result = await generateAISignal({
        symbol,
        strategy,
        maxRetries: 1,
        useFallback: strategy !== 'comprehensive'
      });
      const endTime = Date.now();

      if (result.success && result.signal) {
        testResult.success = true;
        testResult.signal = result.signal;
        testResult.source = result.source;
        testResult.processingTime = result.processingTime;
        testResult.retryCount = result.retryCount;

        toast({
          title: "✅ Test Successful",
          description: `${result.signal.type} signal generated in ${result.processingTime}ms`,
          variant: "default"
        });
      } else {
        testResult.error = result.error || 'Unknown error';
        testResult.processingTime = endTime - startTime;

        toast({
          title: "❌ Test Failed",
          description: testResult.error,
          variant: "destructive"
        });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      testResult.error = errorMessage;
      testResult.processingTime = 0;

      toast({
        title: "❌ Test Error",
        description: errorMessage,
        variant: "destructive"
      });
    }

    setResults(prev => [testResult, ...prev.slice(0, 9)]); // Keep last 10 results
    setIsRunning(false);
  };

  const checkServiceHealth = async () => {
    try {
      const { getSignalServiceHealth } = await import('@/services/aiSignalService');
      const health = await getSignalServiceHealth();
      setServiceHealth(health);

      const healthyCount = Object.values(health).filter(Boolean).length;
      const totalCount = Object.keys(health).length;

      toast({
        title: "🏥 Service Health Check",
        description: `${healthyCount}/${totalCount} services healthy`,
        variant: healthyCount > 0 ? "default" : "destructive"
      });
    } catch (error) {
      console.error('Health check failed:', error);
      toast({
        title: "❌ Health Check Failed",
        description: "Could not check service health",
        variant: "destructive"
      });
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    const symbols = ['EURUSD', 'GBPUSD', 'XAUUSD'];

    for (const symbol of symbols) {
      await runSignalTest(symbol, 'comprehensive');
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    }

    setIsRunning(false);
  };

  const clearResults = () => {
    setResults([]);
    toast({
      title: "🗑️ Results Cleared",
      description: "Test results have been cleared",
      variant: "default"
    });
  };

  const getStatusIcon = (success: boolean) => {
    return success ?
      <CheckCircle className="w-4 h-4 text-green-500" /> :
      <AlertTriangle className="w-4 h-4 text-red-500" />;
  };

  const getSourceBadge = (source: string) => {
    const colors = {
      comprehensive: 'bg-blue-100 text-blue-800',
      fast: 'bg-green-100 text-green-800',
      fallback: 'bg-yellow-100 text-yellow-800'
    };

    return (
      <Badge className={`text-xs ${colors[source as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {source.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="w-5 h-5 text-orange-500" />
            AI Signal Generation Test Panel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Service Health Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm font-medium mb-2">Service Health</div>
              <div className="flex items-center gap-2">
                {serviceHealth ? (
                  <>
                    <div className="flex gap-1">
                      {serviceHealth.comprehensive && <div className="w-2 h-2 bg-green-500 rounded-full" title="Comprehensive" />}
                      {serviceHealth.fast && <div className="w-2 h-2 bg-green-500 rounded-full" title="Fast" />}
                      {serviceHealth.fallback && <div className="w-2 h-2 bg-green-500 rounded-full" title="Fallback" />}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {Object.values(serviceHealth).filter(Boolean).length}/3 online
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">Unknown</span>
                )}
              </div>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm font-medium mb-2">Last Test</div>
              <div className="text-xs text-muted-foreground">
                {results.length > 0 ?
                  `${results[0].success ? 'Success' : 'Failed'} - ${results[0].processingTime}ms` :
                  'No tests run'
                }
              </div>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm font-medium mb-2">Success Rate</div>
              <div className="text-xs text-muted-foreground">
                {results.length > 0 ?
                  `${Math.round((results.filter(r => r.success).length / results.length) * 100)}%` :
                  'N/A'
                }
              </div>
            </div>
          </div>

          {/* Test Controls */}
          <div className="flex flex-wrap gap-2">
            <div className="flex gap-2 flex-1 min-w-64">
              <Input
                value={testSymbol}
                onChange={(e) => setTestSymbol(e.target.value.toUpperCase())}
                placeholder="Enter symbol (e.g., EURUSD)"
                className="font-mono"
              />
              <Button
                onClick={() => runSignalTest(testSymbol)}
                disabled={isRunning}
                className="gap-2"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Test
                  </>
                )}
              </Button>
            </div>

            <Button
              onClick={runAllTests}
              disabled={isRunning}
              variant="outline"
              className="gap-2"
            >
              <Activity className="w-4 h-4" />
              Run All Tests
            </Button>

            <Button
              onClick={checkServiceHealth}
              variant="outline"
              className="gap-2"
            >
              <Clock className="w-4 h-4" />
              Check Health
            </Button>

            <Button
              onClick={clearResults}
              variant="outline"
              className="gap-2"
            >
              Clear Results
            </Button>
          </div>

          {/* Quick Strategy Tests */}
          <div className="flex gap-2">
            <span className="text-sm text-muted-foreground py-2">Quick tests:</span>
            <Button
              onClick={() => runSignalTest(testSymbol, 'comprehensive')}
              disabled={isRunning}
              size="sm"
              variant="outline"
            >
              Comprehensive
            </Button>
            <Button
              onClick={() => runSignalTest(testSymbol, 'fast')}
              disabled={isRunning}
              size="sm"
              variant="outline"
            >
              Fast
            </Button>
            <Button
              onClick={() => runSignalTest(testSymbol, 'fallback')}
              disabled={isRunning}
              size="sm"
              variant="outline"
            >
              Fallback
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              Test Results ({results.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.map((result) => (
                <div
                  key={result.id}
                  className={`p-3 rounded-lg border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.success)}
                      <div>
                        <div className="font-medium text-sm">{result.symbol}</div>
                        <div className="text-xs text-muted-foreground">
                          {result.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                      {getSourceBadge(result.source)}
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {result.processingTime}ms
                      </div>
                      {result.retryCount > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Retries: {result.retryCount}
                        </div>
                      )}
                    </div>
                  </div>

                  {result.success && result.signal && (
                    <div className="mt-2 text-sm">
                      <span className="font-medium">{result.signal.type}</span>
                      <span className="text-muted-foreground ml-2">
                        Confidence: {result.signal.confidence}%
                      </span>
                      {result.signal.price && (
                        <span className="text-muted-foreground ml-2">
                          Price: ${result.signal.price.toLocaleString()}
                        </span>
                      )}
                    </div>
                  )}

                  {result.error && (
                    <Alert className="mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        {result.error}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SignalTestPanel;