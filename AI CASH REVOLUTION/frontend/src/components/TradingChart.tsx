import { useEffect, useRef } from "react";

interface TradingChartProps {
  symbol: string;
}

interface TradingViewWidget {
  widget: {
    constructor: (config: TradingViewConfig) => void;
  };
  [key: string]: unknown;
}

interface TradingViewConfig {
  symbol: string;
  interval: string;
  container_id: string;
  width: string | number;
  height: string | number;
  autosize?: boolean;
  studies?: string[];
  theme?: string;
  style?: string;
  locale?: string;
  toolbar_bg?: string;
  enable_publishing?: boolean;
  allow_symbol_change?: boolean;
  hideideas?: boolean;
}

declare global {
  interface Window {
    TradingView: TradingViewWidget;
  }
}

export const TradingChart = ({ symbol }: TradingChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const mapToTVSymbol = (s: string) => {
    const map: Record<string, string> = {
      // Major Forex Pairs
      EURUSD: "OANDA:EURUSD",
      GBPUSD: "OANDA:GBPUSD",
      USDJPY: "OANDA:USDJPY",
      USDCHF: "OANDA:USDCHF",
      USDCAD: "OANDA:USDCAD",
      AUDUSD: "OANDA:AUDUSD",
      NZDUSD: "OANDA:NZDUSD",
      
      // Minor Forex Pairs
      EURGBP: "OANDA:EURGBP",
      EURJPY: "OANDA:EURJPY",
      EURCHF: "OANDA:EURCHF",
      EURCAD: "OANDA:EURCAD",
      EURAUD: "OANDA:EURAUD",
      EURNZD: "OANDA:EURNZD",
      GBPJPY: "OANDA:GBPJPY",
      GBPCHF: "OANDA:GBPCHF",
      GBPCAD: "OANDA:GBPCAD",
      GBPAUD: "OANDA:GBPAUD",
      GBPNZD: "OANDA:GBPNZD",
      CHFJPY: "OANDA:CHFJPY",
      CADJPY: "OANDA:CADJPY",
      AUDJPY: "OANDA:AUDJPY",
      NZDJPY: "OANDA:NZDJPY",
      CADCHF: "OANDA:CADCHF",
      AUDCHF: "OANDA:AUDCHF",
      NZDCHF: "OANDA:NZDCHF",
      AUDCAD: "OANDA:AUDCAD",
      NZDCAD: "OANDA:NZDCAD",
      AUDNZD: "OANDA:AUDNZD",
      
      // Precious Metals
      XAUUSD: "OANDA:XAUUSD",
      
      // Cryptocurrencies
      BTCUSD: "COINBASE:BTCUSD",
      ETHUSD: "COINBASE:ETHUSD"
    };
    return map[s] || s;
  };

  // Default timeframe for MT5 trading
  const defaultTimeframe = "5"; // 5 minutes default for scalping/MT5

  useEffect(() => {
    // Cleanup previous widget
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }

    // Add a small delay to ensure proper cleanup
    const timer = setTimeout(() => {
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
      script.async = true;
      script.onload = () => {
        console.log('TradingView widget loaded for symbol:', symbol, 'timeframe:', defaultTimeframe);
      };
      script.onerror = (error) => {
        console.warn('TradingView widget failed to load:', error);
      };
      
      script.innerHTML = JSON.stringify({
        "autosize": true,
        "symbol": mapToTVSymbol(symbol),
        "interval": defaultTimeframe, // Fixed 5-minute interval optimized for MT5
        "timezone": "Europe/Rome", // Italian timezone
        "theme": "dark",
        "style": "1",
        "locale": "it", // Italian locale
        "enable_publishing": false,
        "withdateranges": true,
        "range": "1D",
        "hide_side_toolbar": false,
        "allow_symbol_change": true,
        "details": true,
        "hotlist": false, // Disable hotlist to reduce API calls
        "calendar": false, // Disable calendar to avoid conflicts with our economic calendar
        "studies": [
          "MACD@tv-basicstudies",
          "RSI@tv-basicstudies", 
          "BB@tv-basicstudies"
        ],
        "show_popup_button": false, // Disable popup to avoid issues
        "no_referral_id": true,
        "hide_legend": false,
        "save_image": false,
        "backgroundColor": "rgba(0,0,0,0)",
        "gridColor": "rgba(255,255,255,0.1)",
        "loading_screen": {
          "backgroundColor": "#131722",
          "foregroundColor": "#ffffff"
        }
      });

      if (containerRef.current) {
        containerRef.current.appendChild(script);
      }
    }, 100);

    const currentContainer = containerRef.current;
    return () => {
      clearTimeout(timer);
      if (currentContainer) {
        currentContainer.innerHTML = '';
      }
    };
  }, [symbol]);

  return (
    <div className="w-full h-full bg-card rounded-lg border border-border overflow-hidden">
      <div
        ref={containerRef}
        className="tradingview-widget-container w-full h-full"
      >
        <div className="tradingview-widget-container__widget w-full h-full"></div>
      </div>
    </div>
  );
};