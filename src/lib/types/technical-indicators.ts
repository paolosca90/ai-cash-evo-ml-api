export interface TechnicalIndicators {
  atr?: ATRData;
  bollingerBands?: BollingerBandsData;
  rsi?: RSIData;
  macd?: MACDData;
}

export interface ATRData {
  value: number;
  normalized: number;
}

export interface BollingerBandsData {
  upper: number;
  middle: number;
  lower: number;
  position: number; // 0-1, where 0.5 is middle band
  width: number; // normalized width
}

export interface RSIData {
  value: number;
  divergence: number; // -1 to 1
}

export interface MACDData {
  line: number;
  signal: number;
  histogram: number;
}