import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

export const TradeCalculator = () => {
  const [accountBalance, setAccountBalance] = useState("1000");
  const [riskPercent, setRiskPercent] = useState("5");
  const [tradeSize, setTradeSize] = useState("0.02");

  const calculateValues = () => {
    const balance = parseFloat(accountBalance) || 0;
    const risk = parseFloat(riskPercent) || 0;
    const size = parseFloat(tradeSize) || 0;
    
    const potentialProfit = balance * (risk / 100) * 2.32; // Example multiplier
    const potentialLoss = balance * (risk / 100);
    
    return {
      profit: potentialProfit.toFixed(2),
      loss: potentialLoss.toFixed(2)
    };
  };

  const { profit, loss } = calculateValues();

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-foreground">
          Trade Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="bg-purple-600 text-white p-2 rounded text-center text-sm font-medium">
            Risk %
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Lot Size</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="balance" className="text-sm">Account Balance (USD)</Label>
            <Input
              id="balance"
              type="number"
              value={accountBalance}
              onChange={(e) => setAccountBalance(e.target.value)}
              className="bg-muted border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="risk" className="text-sm">Risk %</Label>
            <Input
              id="risk"
              type="number"
              value={riskPercent}
              onChange={(e) => setRiskPercent(e.target.value)}
              className="bg-muted border-border"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Trade Size (Lots)</Label>
              <Input
                type="number"
                step="0.01"
                value={tradeSize}
                onChange={(e) => setTradeSize(e.target.value)}
                className="bg-muted border-border text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Potential Profit</Label>
              <div className="bg-green-50 dark:bg-green-950/30 p-2 rounded text-green-600 font-semibold text-sm">
                USD {profit}
              </div>
            </div>
          </div>

          <div className="bg-red-50 dark:bg-red-950/30 p-2 rounded">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Potential Loss</span>
              <span className="font-semibold text-red-600">USD {loss}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};