import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TradingChart } from "@/components/TradingChart";

import { AIAnalysisPanel } from "@/components/AIAnalysisPanel";
import { TradeExecutionPanel } from "@/components/TradeExecutionPanel";
import Navigation from "@/components/Navigation";
import EconomicCalendar from "@/components/EconomicCalendar";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [selectedSymbol, setSelectedSymbol] = useState("XAUUSD");
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  // Auth guard with payment method check
  useEffect(() => {
    const checkAuthAndPayment = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const loggedIn = !!session?.user;
        setIsAuthenticated(loggedIn);

        if (!loggedIn) {
          navigate("/login", { replace: true });
          return;
        }

        // Check trial status - only redirect if trial is expired
        // Aggiungiamo try-catch per gestire errori RLS o database
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('subscription_status, trial_ends_at')
            .eq('id', session.user.id)
            .single();

          if (error) {
            console.warn('Profile query failed, proceeding without subscription check:', error);
            // Continua senza controllo subscription se il database non è accessibile
            return;
          }

          if (profile?.subscription_status === 'expired' ||
              (profile?.trial_ends_at && new Date(profile.trial_ends_at) < new Date())) {
            navigate("/payment-setup", { replace: true });
            return;
          }
        } catch (profileError) {
          console.warn('Profile check failed:', profileError);
          // Continua senza controllo subscription
        }
      } catch (authError) {
        console.error('Auth check failed:', authError);
        navigate("/login", { replace: true });
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      checkAuthAndPayment();
    });

    checkAuthAndPayment();

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (!isAuthenticated) return null;

  const tradingPairs = [
    // Major Forex Pairs
    { symbol: "EURUSD", name: "Euro/USD" },
    { symbol: "GBPUSD", name: "Pound/USD" },
    { symbol: "USDJPY", name: "USD/Yen" },
    { symbol: "USDCHF", name: "USD/Swiss Franc" },
    { symbol: "USDCAD", name: "USD/Canadian" },
    { symbol: "AUDUSD", name: "Aussie/USD" },
    { symbol: "NZDUSD", name: "Kiwi/USD" },
    
    // Minor Forex Pairs
    { symbol: "EURGBP", name: "Euro/Pound" },
    { symbol: "EURJPY", name: "Euro/Yen" },
    { symbol: "EURCHF", name: "Euro/Swiss Franc" },
    { symbol: "EURCAD", name: "Euro/Canadian" },
    { symbol: "EURAUD", name: "Euro/Aussie" },
    { symbol: "EURNZD", name: "Euro/Kiwi" },
    { symbol: "GBPJPY", name: "Pound/Yen" },
    { symbol: "GBPCHF", name: "Pound/Swiss Franc" },
    { symbol: "GBPCAD", name: "Pound/Canadian" },
    { symbol: "GBPAUD", name: "Pound/Aussie" },
    { symbol: "GBPNZD", name: "Pound/Kiwi" },
    { symbol: "CHFJPY", name: "Swiss Franc/Yen" },
    { symbol: "CADJPY", name: "Canadian/Yen" },
    { symbol: "AUDJPY", name: "Aussie/Yen" },
    { symbol: "NZDJPY", name: "Kiwi/Yen" },
    { symbol: "CADCHF", name: "Canadian/Swiss Franc" },
    { symbol: "AUDCHF", name: "Aussie/Swiss Franc" },
    { symbol: "NZDCHF", name: "Kiwi/Swiss Franc" },
    { symbol: "AUDCAD", name: "Aussie/Canadian" },
    { symbol: "NZDCAD", name: "Kiwi/Canadian" },
    { symbol: "AUDNZD", name: "Aussie/Kiwi" },
    
    // Precious Metals
    { symbol: "XAUUSD", name: "Gold/USD" },
    
    // Cryptocurrencies
    { symbol: "BTCUSD", name: "Bitcoin/USD" },
    { symbol: "ETHUSD", name: "Ethereum/USD" }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />


      {/* Main Content */}
      <div className="p-3 sm:p-4">
        <div className="bg-card rounded-lg border border-border p-3 sm:p-4 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">Analysis for {selectedSymbol}</h2>
            <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
              <SelectTrigger className="w-full sm:w-52 lg:w-60 h-10 sm:h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tradingPairs.map(pair => (
                  <SelectItem key={pair.symbol} value={pair.symbol}>
                    <span className="hidden sm:inline">{pair.name} ({pair.symbol})</span>
                    <span className="sm:hidden">{pair.symbol}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-xs sm:text-sm lg:text-base text-muted-foreground mb-4 sm:mb-6">
            📊 {selectedSymbol} › Real-time AI-powered market analysis with MT5 integration
          </div>
          
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {/* Chart Section - Full width on mobile, 3/4 on desktop */}
            <div className="xl:col-span-3">
              <div className="h-[350px] sm:h-[450px] md:h-[550px] lg:h-[600px] xl:h-[650px]">
                <TradingChart symbol={selectedSymbol} />
              </div>
            </div>

            {/* Analysis Panel - Full width on mobile, 1/4 on desktop */}
            <div className="xl:col-span-1">
              <div className="h-full">
                <AIAnalysisPanel symbol={selectedSymbol} />
              </div>
            </div>
          </div>
        </div>

        {/* Trade Execution Panel - Enhanced spacing */}
        <TradeExecutionPanel symbol={selectedSymbol} />
        
        {/* Economic Calendar Section - Optimized layout */}
        <div className="w-full">
          <EconomicCalendar />
        </div>

        {/* Risk Warning - Enhanced */}
        <div className="mt-8 sm:mt-12 text-center px-4 py-6 bg-muted/30 rounded-lg border">
          <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground mb-3 sm:mb-4">⚠️ Risk Warnings and Investment Disclaimers</h3>
          <p className="text-sm sm:text-base text-muted-foreground max-w-5xl mx-auto leading-relaxed">
            This AI is continuously learning and evolving, but its insights are <strong>not financial advice</strong>. 
            Trading carries significant risks, and past results do not guarantee future outcomes. 
            You should carefully assess your financial situation and consult a professional before making unknown trading decisions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
