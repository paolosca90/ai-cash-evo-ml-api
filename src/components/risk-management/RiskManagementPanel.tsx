/**
 * Risk Management Panel Component
 *
 * Professional risk management interface for trading with ATR-based calculations,
 * position sizing, and portfolio monitoring.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Shield,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  Activity,
  DollarSign,
  Percent,
  Settings,
  Calculator,
  RefreshCw,
  CheckCircle,
  XCircle,
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  RiskManagementResult,
  RiskManagementSettings,
  AccountInfo,
  SymbolSpecs,
  MarketData,
  RiskAlert,
  calculateQuickRisk,
  generateRiskSummary
} from '@/lib/risk-management';

interface RiskManagementPanelProps {
  symbol: string;
  accountInfo: AccountInfo;
  currentPrice: number;
  onSettingsChange?: (settings: RiskManagementSettings) => void;
}

export const RiskManagementPanel: React.FC<RiskManagementPanelProps> = ({
  symbol,
  accountInfo,
  currentPrice,
  onSettingsChange
}) => {
  const [settings, setSettings] = useState<RiskManagementSettings>({
    enabled: true,
    maxRiskPerTrade: 2.0,
    maxPortfolioRisk: 6.0,
    maxDailyLoss: 5.0,
    maxDrawdown: 20.0,
    correlationThreshold: 0.7,
    useATR: true,
    atrMultiplier: 1.0,
    riskRewardRatio: 2.0,
    trailingStop: false,
    partialExits: true,
    alertsEnabled: true,
    emailNotifications: false,
    pushNotifications: false
  });

  const [riskAmount, setRiskAmount] = useState<string>('100');
  const [direction, setDirection] = useState<'BUY' | 'SELL'>('BUY');
  const [atrValue, setAtrValue] = useState<string>('0.0010');
  const [isCalculating, setIsCalculating] = useState(false);
  const [lastResult, setLastResult] = useState<RiskManagementResult | null>(null);
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [portfolioStats, setPortfolioStats] = useState({
    totalExposure: 0,
    totalRisk: 0,
    openPositions: 0,
    riskLevel: 'low' as 'low' | 'medium' | 'high' | 'extreme',
    dailyPnL: 0
  });

  const { toast } = useToast();

  // Mock symbol specs
  const symbolSpecs: SymbolSpecs = {
    symbol,
    digits: 4,
    point: 0.0001,
    tickSize: 0.0001,
    tickValue: 10,
    minLot: 0.01,
    maxLot: 100,
    lotStep: 0.01,
    contractSize: 100000,
    currency: 'USD',
    profitCurrency: 'EUR',
    marginCurrency: 'EUR'
  };

  // Calculate risk management
  const calculateRisk = async () => {
    if (!settings.enabled) {
      toast({
        title: "Risk Management Disabled",
        description: "Enable risk management to calculate trade parameters",
        variant: "destructive"
      });
      return;
    }

    setIsCalculating(true);
    try {
      const result = await calculateQuickRisk(
        symbol,
        direction,
        currentPrice,
        accountInfo.balance,
        parseFloat(atrValue),
        parseFloat(riskAmount) / accountInfo.balance * 100
      );

      setLastResult(result);

      const summary = generateRiskSummary(result);

      toast({
        title: "Risk Calculation Complete",
        description: `${summary.overall.toUpperCase()} risk - ${result.riskMetrics.riskPercentage.toFixed(2)}% account risk`,
        variant: summary.overall === 'low' || summary.overall === 'medium' ? 'default' : 'destructive'
      });

    } catch (error) {
      toast({
        title: "Calculation Error",
        description: error instanceof Error ? error.message : "Failed to calculate risk",
        variant: "destructive"
      });
    } finally {
      setIsCalculating(false);
    }
  };

  // Update settings
  const updateSettings = (newSettings: Partial<RiskManagementSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    onSettingsChange?.(updated);
  };

  // Get risk level color
  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-orange-500';
      case 'extreme': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Get risk level icon
  const getRiskLevelIcon = (level: string) => {
    switch (level) {
      case 'low': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'medium': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'high': return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case 'extreme': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <Info className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Risk Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Risk Management - {symbol}
          </CardTitle>
          <CardDescription>
            Professional risk management with ATR-based calculations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Account Balance</span>
              </div>
              <div className="text-2xl font-bold">
                €{accountInfo.balance.toLocaleString()}
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Percent className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Max Risk/Trade</span>
              </div>
              <div className="text-2xl font-bold">
                {settings.maxRiskPerTrade}%
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Open Positions</span>
              </div>
              <div className="text-2xl font-bold">
                {portfolioStats.openPositions}
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Risk Level</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${getRiskLevelColor(portfolioStats.riskLevel)}`} />
                <span className="text-lg font-bold capitalize">{portfolioStats.riskLevel}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="calculator" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="calculator">Calculator</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
        </TabsList>

        {/* Risk Calculator Tab */}
        <TabsContent value="calculator" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Risk Calculator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Input Parameters */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="direction">Trade Direction</Label>
                    <div className="flex gap-2">
                      <Button
                        variant={direction === 'BUY' ? 'default' : 'outline'}
                        onClick={() => setDirection('BUY')}
                        className="flex-1"
                      >
                        <TrendingUp className="w-4 h-4 mr-2" />
                        BUY
                      </Button>
                      <Button
                        variant={direction === 'SELL' ? 'default' : 'outline'}
                        onClick={() => setDirection('SELL')}
                        className="flex-1"
                      >
                        <TrendingDown className="w-4 h-4 mr-2" />
                        SELL
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="risk-amount">Risk Amount (€)</Label>
                    <Input
                      id="risk-amount"
                      type="number"
                      value={riskAmount}
                      onChange={(e) => setRiskAmount(e.target.value)}
                      placeholder="100"
                      min="1"
                      step="1"
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum amount to risk on this trade
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="atr-value">ATR Value</Label>
                    <Input
                      id="atr-value"
                      type="number"
                      value={atrValue}
                      onChange={(e) => setAtrValue(e.target.value)}
                      placeholder="0.0010"
                      step="0.0001"
                    />
                    <p className="text-xs text-muted-foreground">
                      Average True Range for stop loss calculation
                    </p>
                  </div>

                  <Button
                    onClick={calculateRisk}
                    disabled={isCalculating || !settings.enabled}
                    className="w-full"
                  >
                    {isCalculating ? (
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Calculating...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Calculate Risk
                      </div>
                    )}
                  </Button>
                </div>

                {/* Results */}
                <div className="space-y-4">
                  {lastResult && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Risk Level</span>
                        <div className="flex items-center gap-2">
                          {getRiskLevelIcon(lastResult.validation.riskLevel)}
                          <Badge variant={lastResult.validation.isValid ? 'default' : 'destructive'}>
                            {lastResult.validation.riskLevel.toUpperCase()}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="text-xs text-red-600 mb-1">Stop Loss</div>
                          <div className="text-lg font-bold text-red-800">
                            {lastResult.stopLoss.price.toFixed(4)}
                          </div>
                          <div className="text-xs text-red-600">
                            {lastResult.stopLoss.pips.toFixed(1)} pips
                          </div>
                        </div>

                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="text-xs text-green-600 mb-1">Take Profit</div>
                          <div className="text-lg font-bold text-green-800">
                            {lastResult.takeProfit.primaryTP.toFixed(4)}
                          </div>
                          <div className="text-xs text-green-600">
                            {lastResult.takeProfit.averageRiskReward.toFixed(2)}:1 RR
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="text-xs text-blue-600 mb-1">Position Size</div>
                        <div className="text-lg font-bold text-blue-800">
                          {lastResult.positionSize.lotSize} lots
                        </div>
                        <div className="text-xs text-blue-600">
                          Risk: {lastResult.riskMetrics.riskPercentage.toFixed(2)}% of account
                        </div>
                      </div>

                      {/* Risk Metrics */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Risk Amount</span>
                          <span className="font-medium">€{lastResult.riskMetrics.riskAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Risk-Reward Ratio</span>
                          <span className="font-medium">{lastResult.riskMetrics.riskRewardRatio.toFixed(2)}:1</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Win Rate Required</span>
                          <span className="font-medium">{(lastResult.riskMetrics.winRateRequired * 100).toFixed(1)}%</span>
                        </div>
                      </div>

                      {/* Validation */}
                      {lastResult.validation.warnings.length > 0 && (
                        <Alert>
                          <AlertTriangle className="w-4 h-4" />
                          <AlertTitle>Warnings</AlertTitle>
                          <AlertDescription>
                            <ul className="text-sm space-y-1">
                              {lastResult.validation.warnings.map((warning, index) => (
                                <li key={index}>• {warning}</li>
                              ))}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Recommendations */}
                      {lastResult.recommendations.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Recommendations</Label>
                          <div className="space-y-1">
                            {lastResult.recommendations.map((rec, index) => (
                              <div key={index} className="text-xs text-muted-foreground bg-muted p-2 rounded">
                                • {rec}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Risk Management Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Enable Risk Management</Label>
                    <p className="text-sm text-muted-foreground">
                      Apply risk management rules to all trades
                    </p>
                  </div>
                  <Switch
                    checked={settings.enabled}
                    onCheckedChange={(checked) => updateSettings({ enabled: checked })}
                  />
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="max-risk">Max Risk per Trade (%)</Label>
                      <Input
                        id="max-risk"
                        type="number"
                        value={settings.maxRiskPerTrade}
                        onChange={(e) => updateSettings({ maxRiskPerTrade: parseFloat(e.target.value) || 0 })}
                        min="0.1"
                        max="10"
                        step="0.1"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="max-portfolio">Max Portfolio Risk (%)</Label>
                      <Input
                        id="max-portfolio"
                        type="number"
                        value={settings.maxPortfolioRisk}
                        onChange={(e) => updateSettings({ maxPortfolioRisk: parseFloat(e.target.value) || 0 })}
                        min="1"
                        max="20"
                        step="1"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="risk-reward">Risk-Reward Ratio</Label>
                      <Input
                        id="risk-reward"
                        type="number"
                        value={settings.riskRewardRatio}
                        onChange={(e) => updateSettings({ riskRewardRatio: parseFloat(e.target.value) || 0 })}
                        min="1"
                        max="5"
                        step="0.1"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="atr-multiplier">ATR Multiplier</Label>
                      <Input
                        id="atr-multiplier"
                        type="number"
                        value={settings.atrMultiplier}
                        onChange={(e) => updateSettings({ atrMultiplier: parseFloat(e.target.value) || 0 })}
                        min="0.5"
                        max="3"
                        step="0.1"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="max-daily">Max Daily Loss (%)</Label>
                      <Input
                        id="max-daily"
                        type="number"
                        value={settings.maxDailyLoss}
                        onChange={(e) => updateSettings({ maxDailyLoss: parseFloat(e.target.value) || 0 })}
                        min="1"
                        max="20"
                        step="1"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="max-drawdown">Max Drawdown (%)</Label>
                      <Input
                        id="max-drawdown"
                        type="number"
                        value={settings.maxDrawdown}
                        onChange={(e) => updateSettings({ maxDrawdown: parseFloat(e.target.value) || 0 })}
                        min="5"
                        max="50"
                        step="5"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Use ATR for Stop Loss</Label>
                      <p className="text-sm text-muted-foreground">
                        Calculate stop loss using Average True Range
                      </p>
                    </div>
                    <Switch
                      checked={settings.useATR}
                      onCheckedChange={(checked) => updateSettings({ useATR: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Enable Partial Exits</Label>
                      <p className="text-sm text-muted-foreground">
                        Use multiple take profit levels
                      </p>
                    </div>
                    <Switch
                      checked={settings.partialExits}
                      onCheckedChange={(checked) => updateSettings({ partialExits: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Enable Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Show risk management alerts
                      </p>
                    </div>
                    <Switch
                      checked={settings.alertsEnabled}
                      onCheckedChange={(checked) => updateSettings({ alertsEnabled: checked })}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Risk Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                  <p>No active risk alerts</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <Alert key={alert.id} className={alert.resolved ? 'opacity-50' : ''}>
                      <AlertTriangle className="w-4 h-4" />
                      <AlertTitle className="flex items-center justify-between">
                        <span>{alert.category}</span>
                        <Badge variant={alert.severity === 'critical' ? 'destructive' : 'default'}>
                          {alert.severity}
                        </Badge>
                      </AlertTitle>
                      <AlertDescription>
                        <p>{alert.message}</p>
                        {alert.actionRequired && (
                          <p className="text-sm mt-2 font-medium">
                            Action Required: {alert.suggestedAction}
                          </p>
                        )}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Portfolio Tab */}
        <TabsContent value="portfolio" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Portfolio Risk
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-2">Total Exposure</div>
                  <div className="text-2xl font-bold">{portfolioStats.totalExposure} lots</div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-2">Total Risk</div>
                  <div className="text-2xl font-bold">€{portfolioStats.totalRisk.toFixed(2)}</div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-2">Daily P&L</div>
                  <div className={`text-2xl font-bold ${portfolioStats.dailyPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {portfolioStats.dailyPnL >= 0 ? '+' : ''}€{portfolioStats.dailyPnL.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Portfolio Heat</span>
                  <span className="text-sm text-muted-foreground">
                    {((portfolioStats.totalRisk / accountInfo.balance) * 100).toFixed(2)}%
                  </span>
                </div>
                <Progress
                  value={(portfolioStats.totalRisk / accountInfo.balance) * 100}
                  max={settings.maxPortfolioRisk}
                  className="h-2"
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Risk Distribution</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">0</div>
                    <div className="text-xs text-green-700">Low Risk</div>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">0</div>
                    <div className="text-xs text-yellow-700">Medium Risk</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">0</div>
                    <div className="text-xs text-orange-700">High Risk</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">0</div>
                    <div className="text-xs text-red-700">Extreme Risk</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};