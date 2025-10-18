export interface SmartMoneyConcepts {
  orderBlocks?: OrderBlock[];
  fairValueGaps?: FairValueGap[];
  liquidityPools?: LiquidityPool[];
}

export interface OrderBlock {
  id: string;
  price: number;
  type: 'buy' | 'sell';
  strength: number; // 0-1
  timestamp: number;
  timeframe: string;
}

export interface FairValueGap {
  id: string;
  high: number;
  low: number;
  type: 'bullish' | 'bearish';
  strength: number; // 0-1
  timestamp: number;
  timeframe: string;
}

export interface LiquidityPool {
  id: string;
  price: number;
  type: 'buy' | 'sell';
  size: number;
  timestamp: number;
  timeframe: string;
}