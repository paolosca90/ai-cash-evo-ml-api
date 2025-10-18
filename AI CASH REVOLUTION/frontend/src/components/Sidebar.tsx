import { 
  BarChart3, 
  TrendingUp, 
  Zap, 
  Wallet, 
  History, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Bot,
  Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarProps {
  collapsed: boolean;
  onToggle: (collapsed: boolean) => void;
}

export const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
  const menuItems = [
    { icon: BarChart3, label: "Charts", active: true },
    { icon: TrendingUp, label: "Screener" },
    { icon: Bot, label: "AI Signals" },
    { icon: Activity, label: "Technical Analysis" },
    { icon: Zap, label: "Live Trading" },
    { icon: Wallet, label: "Portfolio" },
    { icon: History, label: "Order History" },
    { icon: Settings, label: "Settings" }
  ];

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-full bg-card border-r border-border transition-all duration-300 z-50",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Toggle Button */}
      <div className="flex justify-end p-2 border-b border-border">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onToggle(!collapsed)}
          className="text-muted-foreground hover:text-foreground"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* Menu Items */}
      <nav className="p-2 space-y-1">
        {menuItems.map((item, index) => (
          <Button
            key={index}
            variant={item.active ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start gap-3 text-muted-foreground hover:text-foreground",
              collapsed && "justify-center",
              item.active && "bg-secondary text-secondary-foreground"
            )}
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </Button>
        ))}
      </nav>

      {/* Bottom Section */}
      {!collapsed && (
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">AI Status</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Neural networks active. Processing market data...
            </p>
          </div>
        </div>
      )}
    </aside>
  );
};