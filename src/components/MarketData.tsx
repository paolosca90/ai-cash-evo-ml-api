import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Globe, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Flame,
  Clock
} from "lucide-react";

interface MarketItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
}

// ⛔ MOCK DATA REMOVED - Real market data required
// This component should fetch real market data from an API
const generateMarketData = (): MarketItem[] => {
  // Return empty array - no mock data
  // TODO: Implement real market data fetching from TradingView or similar API
  return [];
};

export const MarketData = () => {
  const [marketData, setMarketData] = useState<MarketItem[]>([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    // Initial data
    setMarketData(generateMarketData());

    // Update data every 5 seconds
    const interval = setInterval(() => {
      setMarketData(generateMarketData());
      setLastUpdate(new Date());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const topGainers = marketData
    .filter(item => item.changePercent > 0)
    .sort((a, b) => b.changePercent - a.changePercent)
    .slice(0, 3);

  const topLosers = marketData
    .filter(item => item.changePercent < 0)
    .sort((a, b) => a.changePercent - b.changePercent)
    .slice(0, 3);

  const formatNumber = (num: number, decimals: number = 2) => {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toFixed(decimals);
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Globe className="w-5 h-5 text-primary" />
            Market Overview
          </CardTitle>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {lastUpdate.toLocaleTimeString()}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Top Gainers */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-success" />
            <h4 className="font-medium text-sm text-foreground">Top Gainers</h4>
          </div>
          <div className="space-y-2">
            {topGainers.map((item) => (
              <div key={item.symbol} className="flex items-center justify-between p-2 rounded bg-success/5 border border-success/10">
                <div>
                  <div className="font-medium text-sm text-foreground">{item.symbol}</div>
                  <div className="text-xs text-muted-foreground">{item.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-foreground">
                    ${item.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0.00'}
                  </div>
                  <Badge variant="outline" className="text-success border-success/20 bg-success/10">
                    +{item.changePercent?.toFixed(2) ?? '0.00'}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Losers */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-danger" />
            <h4 className="font-medium text-sm text-foreground">Top Losers</h4>
          </div>
          <div className="space-y-2">
            {topLosers.map((item) => (
              <div key={item.symbol} className="flex items-center justify-between p-2 rounded bg-danger/5 border border-danger/10">
                <div>
                  <div className="font-medium text-sm text-foreground">{item.symbol}</div>
                  <div className="text-xs text-muted-foreground">{item.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-foreground">
                    ${item.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0.00'}
                  </div>
                  <Badge variant="outline" className="text-danger border-danger/20 bg-danger/10">
                    {item.changePercent?.toFixed(2) ?? '0.00'}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Market Stats */}
        <div className="pt-2 border-t border-border">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-primary" />
            <h4 className="font-medium text-sm text-foreground">Market Stats</h4>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">24h Volume:</span>
              <span className="text-foreground font-medium">
                ${formatNumber(marketData.reduce((acc, item) => acc + item.volume, 0))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Active:</span>
              <span className="text-foreground font-medium">{marketData.length}</span>
            </div>
          </div>
        </div>

        {/* Live Indicator */}
        <div className="flex items-center justify-center gap-2 p-2 bg-primary/10 rounded-lg">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
          <span className="text-xs text-primary font-medium">Live Market Data</span>
        </div>
      </CardContent>
    </Card>
  );
};