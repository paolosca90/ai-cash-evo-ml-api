import { Search, Bell, Settings, User, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface HeaderProps {
  selectedSymbol: string;
  onSymbolChange: (symbol: string) => void;
}

export const Header = ({ selectedSymbol, onSymbolChange }: HeaderProps) => {
  const popularSymbols = [
    "BTCUSDT", "ETHUSDT", "ADAUSDT", "DOTUSDT", "SOLUSDT",
    "AAPL", "TSLA", "GOOGL", "MSFT", "AMZN"
  ];

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-card border-b border-border">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-8 h-8 text-primary" />
          <h1 className="text-xl font-bold text-foreground">AI CASH R-EVOLUTION</h1>
        </div>
      </div>

      {/* Search and Symbol Selector */}
      <div className="flex items-center gap-4 flex-1 max-w-2xl mx-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search symbols, news, analysis..."
            className="pl-10 bg-muted border-border"
          />
        </div>
        
        <Select value={selectedSymbol} onValueChange={onSymbolChange}>
          <SelectTrigger className="w-32 bg-muted border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {popularSymbols.map((symbol) => (
              <SelectItem key={symbol} value={symbol}>
                {symbol}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Bell className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Settings className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <User className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
};