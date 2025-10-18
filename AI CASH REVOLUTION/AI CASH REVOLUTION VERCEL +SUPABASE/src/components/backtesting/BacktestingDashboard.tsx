/**
 * Backtesting Dashboard Component
 *
 * Comprehensive dashboard for backtesting results visualization and analysis
 * with interactive charts, performance metrics, and strategy comparison tools.
 */

import React, { useState, useEffect } from 'react';
import type {
  BacktestResult,
  BacktestConfig,
  PerformanceMetrics,
  Trade,
  DrawdownData,
  Strategy
} from '@/types/trading';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

import {
  BacktestResult,
  StrategyComparison,
  PerformanceMetrics,
  WalkForwardResult,
  OptimizationResult,
  BacktestProgress
} from '../../types/backtesting';

interface BacktestingDashboardProps {
  results?: BacktestResult | StrategyComparison | WalkForwardResult | OptimizationResult;
  onExport?: (format: 'pdf' | 'csv' | 'json') => void;
  onRerun?: () => void;
  isLoading?: boolean;
  progress?: BacktestProgress;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export function BacktestingDashboard({
  results,
  onExport,
  onRerun,
  isLoading = false,
  progress
}: BacktestingDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedMetric, setSelectedMetric] = useState<keyof PerformanceMetrics>('sharpeRatio');
  const [timeRange, setTimeRange] = useState('all');

  if (isLoading && progress) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Backtest in Progress</CardTitle>
            <CardDescription>{progress.stage}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Progress</span>
                <span>{progress.percentage.toFixed(1)}%</span>
              </div>
              <Progress value={progress.percentage} className="h-2" />
              <div className="flex justify-between text-sm text-gray-600">
                <span>
                  {progress.currentWindow
                    ? `Window ${progress.currentWindow}/${progress.totalWindows}`
                    : `${progress.current}/${progress.total}`}
                </span>
                <span>
                  Estimated time remaining: {Math.round(progress.estimatedTimeRemaining / 1000 / 60)} minutes
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertDescription>
            No backtest results available. Please run a backtest to view results.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const isStrategyComparison = 'strategies' in results;
  const isWalkForward = 'windows' in results;
  const isOptimization = 'results' in results;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Backtesting Results</h2>
          <p className="text-gray-600 mt-1">
            {isStrategyComparison
              ? 'Strategy Comparison Results'
              : isWalkForward
              ? 'Walk-Forward Validation Results'
              : isOptimization
              ? 'Parameter Optimization Results'
              : 'Single Strategy Backtest Results'}
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="1m">1 Month</SelectItem>
              <SelectItem value="3m">3 Months</SelectItem>
              <SelectItem value="6m">6 Months</SelectItem>
              <SelectItem value="1y">1 Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={onRerun}>
            Rerun Backtest
          </Button>
          <Button variant="outline" onClick={() => onExport?.('pdf')}>
            Export PDF
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="trades">Trades</TabsTrigger>
          <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
          <TabsTrigger value="regimes">Regimes</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {isStrategyComparison ? (
            <StrategyComparisonOverview results={results as StrategyComparison} />
          ) : isWalkForward ? (
            <WalkForwardOverview results={results as WalkForwardResult} />
          ) : isOptimization ? (
            <OptimizationOverview results={results as OptimizationResult} />
          ) : (
            <SingleStrategyOverview results={results as BacktestResult} />
          )}
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <PerformanceAnalysis results={results} selectedMetric={selectedMetric} />
        </TabsContent>

        {/* Trades Tab */}
        <TabsContent value="trades" className="space-y-6">
          <TradesAnalysis results={results} />
        </TabsContent>

        {/* Risk Analysis Tab */}
        <TabsContent value="risk" className="space-y-6">
          <RiskAnalysis results={results} />
        </TabsContent>

        {/* Comparison Tab */}
        <TabsContent value="comparison" className="space-y-6">
          {isStrategyComparison ? (
            <DetailedComparison results={results as StrategyComparison} />
          ) : (
            <Alert>
              <AlertDescription>
                Comparison data is only available for strategy comparison results.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Regimes Tab */}
        <TabsContent value="regimes" className="space-y-6">
          <RegimeAnalysis results={results} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// === Sub-components ===

function SingleStrategyOverview({ results }: { results: BacktestResult }) {
  const metrics = results.metrics;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard
        title="Total Return"
        value={`${(metrics.totalReturn * 100).toFixed(2)}%`}
        trend={metrics.totalReturn > 0 ? 'up' : 'down'}
      />
      <MetricCard
        title="Sharpe Ratio"
        value={metrics.sharpeRatio.toFixed(2)}
        trend={metrics.sharpeRatio > 1 ? 'up' : 'down'}
      />
      <MetricCard
        title="Max Drawdown"
        value={`${(metrics.maxDrawdown * 100).toFixed(2)}%`}
        trend={metrics.maxDrawdown < 0.1 ? 'up' : 'down'}
      />
      <MetricCard
        title="Win Rate"
        value={`${(metrics.winRate * 100).toFixed(1)}%`}
        trend={metrics.winRate > 0.5 ? 'up' : 'down'}
      />

      {/* Equity Curve */}
      <Card className="md:col-span-2 lg:col-span-4">
        <CardHeader>
          <CardTitle>Equity Curve</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={results.equity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                formatter={(value: number | string, name: string) => [
                  `$${value.toLocaleString()}`,
                  'Portfolio Value'
                ]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#8884d8"
                fill="#8884d8"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function StrategyComparisonOverview({ results }: { results: StrategyComparison }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Strategy Comparison Summary</CardTitle>
          <CardDescription>
            Best performing strategy: {results.bestStrategy.strategy.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.strategies.slice(0, 6).map((strategy, index) => (
              <StrategyCard
                key={strategy.strategy.id}
                strategy={strategy}
                rank={strategy.rank}
                color={COLORS[index % COLORS.length]}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <ComparisonChart results={results} />
    </div>
  );
}

function WalkForwardOverview({ results }: { results: WalkForwardResult }) {
  const metrics = results.aggregateMetrics;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Aggregate Return"
          value={`${(metrics.totalReturn * 100).toFixed(2)}%`}
          trend={metrics.totalReturn > 0 ? 'up' : 'down'}
        />
        <MetricCard
          title="Stability Score"
          value={results.stabilityAnalysis.performanceStability.toFixed(2)}
          trend={results.stabilityAnalysis.performanceStability > 0.7 ? 'up' : 'down'}
        />
        <MetricCard
          title="Windows Tested"
          value={results.windows.length.toString()}
          trend="up"
        />
        <MetricCard
          title="Success Rate"
          value={`${(results.windows.filter(w => w.testMetrics.sharpeRatio > 0).length / results.windows.length * 100).toFixed(1)}%`}
          trend="up"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Window Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={results.windows.map((w, i) => ({
              window: `Window ${i + 1}`,
              trainSharpe: w.trainMetrics.sharpeRatio,
              testSharpe: w.testMetrics.sharpeRatio
            }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="window" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="trainSharpe" fill="#8884d8" name="Train Sharpe" />
              <Bar dataKey="testSharpe" fill="#82ca9d" name="Test Sharpe" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function OptimizationOverview({ results }: { results: OptimizationResult }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Best Score"
          value={results.bestMetrics.sharpeRatio.toFixed(2)}
          trend="up"
        />
        <MetricCard
          title="Iterations"
          value={results.convergence.iterations.toString()}
          trend="up"
        />
        <MetricCard
          title="Convergence Rate"
          value={results.convergence.convergenceRate.toFixed(2)}
          trend="up"
        />
        <MetricCard
          title="Successful Runs"
          value={`${results.results.filter(r => r.score > 0).length}/${results.results.length}`}
          trend="up"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Optimization Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={results.results.map(r => ({
              iteration: r.iteration,
              score: r.score
            }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="iteration" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#8884d8"
                strokeWidth={2}
                dot={{ r: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ title, value, trend }: { title: string; value: string; trend: 'up' | 'down' | 'neutral' }) {
  const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600';

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className={`text-sm ${trendColor}`}>
            {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StrategyCard({ strategy, rank, color }: { strategy: Strategy; rank: number; color: string }) {
  const metrics = strategy.result.metrics;

  return (
    <Card className="relative">
      {rank === 1 && (
        <div className="absolute -top-2 -right-2">
          <Badge className="bg-yellow-500 text-white">Best</Badge>
        </div>
      )}
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{strategy.strategy.name}</CardTitle>
        <CardDescription>Rank #{rank}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Return:</span>
            <span className="font-medium">{(metrics.totalReturn * 100).toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span>Sharpe:</span>
            <span className="font-medium">{metrics.sharpeRatio.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Win Rate:</span>
            <span className="font-medium">{(metrics.winRate * 100).toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span>Max DD:</span>
            <span className="font-medium">{(metrics.maxDrawdown * 100).toFixed(1)}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ComparisonChart({ results }: { results: StrategyComparison }) {
  const chartData = results.strategies.map((strategy, index) => ({
    name: strategy.strategy.name,
    return: strategy.result.metrics.totalReturn,
    sharpeRatio: strategy.result.metrics.sharpeRatio,
    maxDrawdown: strategy.result.metrics.maxDrawdown,
    winRate: strategy.result.metrics.winRate,
    color: COLORS[index % COLORS.length]
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="return" fill="#8884d8" name="Total Return" />
            <Bar dataKey="sharpeRatio" fill="#82ca9d" name="Sharpe Ratio" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function PerformanceAnalysis({ results, selectedMetric }: { results: BacktestResult; selectedMetric: keyof PerformanceMetrics }) {
  // This would contain more detailed performance analysis charts
  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert>
          <AlertDescription>
            Detailed performance analysis charts would be displayed here.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

function TradesAnalysis({ results }: { results: BacktestResult }) {
  // This would contain detailed trade analysis
  return (
    <Card>
      <CardHeader>
        <CardTitle>Trade Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert>
          <AlertDescription>
            Detailed trade analysis and distribution charts would be displayed here.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

function RiskAnalysis({ results }: { results: BacktestResult }) {
  // This would contain detailed risk analysis
  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert>
          <AlertDescription>
            Detailed risk analysis including drawdown, VaR, and stress testing would be displayed here.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

function DetailedComparison({ results }: { results: StrategyComparison }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Detailed Strategy Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-4 py-2 text-left">Strategy</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Return</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Sharpe</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Sortino</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Max DD</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Win Rate</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Trades</th>
                </tr>
              </thead>
              <tbody>
                {results.strategies.map((strategy, index) => (
                  <tr key={strategy.strategy.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-300 px-4 py-2 font-medium">
                      {strategy.strategy.name}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      {(strategy.result.metrics.totalReturn * 100).toFixed(2)}%
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      {strategy.result.metrics.sharpeRatio.toFixed(2)}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      {strategy.result.metrics.sortinoRatio.toFixed(2)}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      {(strategy.result.metrics.maxDrawdown * 100).toFixed(2)}%
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      {(strategy.result.metrics.winRate * 100).toFixed(1)}%
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      {strategy.result.metrics.totalTrades}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RegimeAnalysis({ results }: { results: BacktestResult }) {
  // This would contain regime-specific analysis
  return (
    <Card>
      <CardHeader>
        <CardTitle>Market Regime Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert>
          <AlertDescription>
            Market regime-specific performance analysis would be displayed here.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}