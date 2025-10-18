export interface LLMSignals {
  sentiment?: SentimentAnalysis;
  riskAssessment?: RiskAssessment;
  marketFearGreed?: {
    value: number; // 0-100
    classification: 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed';
  };
}

export interface SentimentAnalysis {
  score: number; // -1 to 1
  confidence: number; // 0-1
  label: 'bullish' | 'bearish' | 'neutral';
}

export interface RiskAssessment {
  level: number; // 0-1
  confidence: number; // 0-1
  factors: string[];
}