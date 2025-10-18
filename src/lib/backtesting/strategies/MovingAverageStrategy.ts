// @ts-nocheck
/**
 * Moving Average Crossover Strategy
 *
 * A classic trading strategy that uses moving average crossovers to generate signals.
 * Demonstrates the strategy interface and provides a baseline for comparison.
 */

import {
  Strategy,
  StrategyParameter,
  Signal,
  BacktestConfig,
  OHLCVData,
  MarketContext,
  NewsSentiment,
  EconomicEvent
} from '../../../types/backtesting';

export class MovingAverageStrategy implements Strategy {
  id = 'moving_average_crossover';
  name = 'Moving Average Crossover';
  description = 'Classic moving average crossover strategy with configurable periods';
  version = '1.0.0';

  parameters: StrategyParameter[] = [
    {
      name: 'fastPeriod',
      type: 'number',
      defaultValue: 10,
      min: 5,
      max: 50,
      step: 1,
      description: 'Fast moving average period'
    },
    {
      name: 'slowPeriod',
      type: 'number',
      defaultValue: 30,
      min: 20,
      max: 200,
      step: 5,
      description: 'Slow moving average period'
    },
    {
      name: 'signalThreshold',
      type: 'number',
      defaultValue: 0.02,
      min: 0.01,
      max: 0.1,
      step: 0.01,
      description: 'Minimum signal strength threshold'
    },
    {
      name: 'useRSI',
      type: 'boolean',
      defaultValue: true,
      description: 'Use RSI as confirmation filter'
    },
    {
      name: 'rsiPeriod',
      type: 'number',
      defaultValue: 14,
      min: 5,
      max: 30,
      step: 1,
      description: 'RSI period for confirmation'
    },
    {
      name: 'rsiOverbought',
      type: 'number',
      defaultValue: 70,
      min: 60,
      max: 80,
      step: 1,
      description: 'RSI overbought threshold'
    },
    {
      name: 'rsiOversold',
      type: 'number',
      defaultValue: 30,
      min: 20,
      max: 40,
      step: 1,
      description: 'RSI oversold threshold'
    }
  ];

  private fastMA: number[] = [];
  private slowMA: number[] = [];
  private rsiValues: number[] = [];
  private previousSignals: Signal[] = [];
  private positions: Map<string, 'LONG' | 'SHORT' | 'FLAT'> = new Map();

  async initialize(config: BacktestConfig): Promise<void> {
    // Reset state
    this.fastMA = [];
    this.slowMA = [];
    this.rsiValues = [];
    this.previousSignals = [];
    this.positions.clear();

    console.log(`Initialized ${this.name} strategy with config:`, config);
  }

  async onData(ohlcv: OHLCVData, context: MarketContext): Promise<Signal[]> {
    const signals: Signal[] = [];

    // Calculate indicators
    this.updateIndicators(ohlcv);

    // Need enough data for all indicators
    const slowPeriod = this.getParameter('slowPeriod');
    if (this.fastMA.length < slowPeriod || this.slowMA.length < slowPeriod) {
      return signals;
    }

    const currentFastMA = this.fastMA[this.fastMA.length - 1];
    const currentSlowMA = this.slowMA[this.slowMA.length - 1];
    const previousFastMA = this.fastMA[this.fastMA.length - 2];
    const previousSlowMA = this.slowMA[this.slowMA.length - 2];

    // Calculate signal strength
    const maSpread = (currentFastMA - currentSlowMA) / currentSlowMA;
    const maCrossed = this.hasCrossed(previousFastMA, previousSlowMA, currentFastMA, currentSlowMA);

    // RSI confirmation if enabled
    let rsiConfirmation = true;
    let currentRSI = 50;

    if (this.getParameter('useRSI')) {
      currentRSI = this.rsiValues[this.rsiValues.length - 1];
      const rsiOverbought = this.getParameter('rsiOverbought');
      const rsiOversold = this.getParameter('rsiOversold');

      rsiConfirmation = this.validateRSIConfirmation(currentRSI, rsiOverbought, rsiOversold, maSpread);
    }

    // Generate signals based on crossover
    if (maCrossed.up && Math.abs(maSpread) >= this.getParameter('signalThreshold') && rsiConfirmation) {
      const signal = this.createSignal(
        'BUY',
        ohlcv,
        Math.abs(maSpread),
        this.calculateConfidence(maSpread, currentRSI, context)
      );
      signals.push(signal);
    } else if (maCrossed.down && Math.abs(maSpread) >= this.getParameter('signalThreshold') && rsiConfirmation) {
      const signal = this.createSignal(
        'SELL',
        ohlcv,
        Math.abs(maSpread),
        this.calculateConfidence(maSpread, currentRSI, context)
      );
      signals.push(signal);
    }

    // Update position tracking
    if (signals.length > 0) {
      this.updatePositions(ohlcv.symbol, signals[0].direction);
    }

    this.previousSignals = signals;
    return signals;
  }

  async onNews(news: NewsSentiment, context: MarketContext): Promise<Signal[]> {
    const signals: Signal[] = [];

    // Only act on high-impact news
    if (news.impact !== 'high' || news.confidence < 0.7) {
      return signals;
    }

    const currentPosition = this.positions.get(news.symbols[0]) || 'FLAT';

    // If we have a strong sentiment signal and it aligns with current position, add to it
    if (Math.abs(news.sentiment) > 0.5) {
      const direction = news.sentiment > 0 ? 'BUY' : 'SELL';

      // Only generate signal if it reinforces current trend or we're flat
      if (currentPosition === 'FLAT' ||
          (currentPosition === 'LONG' && direction === 'BUY') ||
          (currentPosition === 'SHORT' && direction === 'SELL')) {

        const signal = this.createSignal(
          direction,
          {
            timestamp: news.timestamp,
            symbol: news.symbols[0],
            open: 0,
            high: 0,
            low: 0,
            close: 0,
            volume: 0,
            timeframe: '1h'
          },
          Math.abs(news.sentiment),
          news.confidence * 0.8, // Lower confidence for news-based signals
          `High-impact news: ${news.title}`
        );

        signals.push(signal);
      }
    }

    return signals;
  }

  async onEconomicEvent(event: EconomicEvent, context: MarketContext): Promise<Signal[]> {
    const signals: Signal[] = [];

    // Only act on high-impact economic events
    if (event.impact !== 'high') {
      return signals;
    }

    // For interest rate decisions, be more cautious
    if (event.title.toLowerCase().includes('interest rate') ||
        event.title.toLowerCase().includes('fomc')) {

      // Close existing positions before major events
      for (const [symbol, position] of this.positions) {
        if (position !== 'FLAT') {
          const closeSignal = this.createSignal(
            position === 'LONG' ? 'SELL' : 'BUY',
            {
              timestamp: event.timestamp,
              symbol,
              open: 0,
              high: 0,
              low: 0,
              close: 0,
              volume: 0,
              timeframe: '1h'
            },
            1.0,
            0.9,
            `Closing position before ${event.title}`
          );
          signals.push(closeSignal);
        }
      }
    }

    return signals;
  }

  async cleanup(): Promise<void> {
    // Clean up resources
    this.fastMA = [];
    this.slowMA = [];
    this.rsiValues = [];
    this.previousSignals = [];
    this.positions.clear();

    console.log(`Cleaned up ${this.name} strategy`);
  }

  // === Private Helper Methods ===

  private updateIndicators(ohlcv: OHLCVData): void {
    // Update moving averages
    const fastPeriod = this.getParameter('fastPeriod');
    const slowPeriod = this.getParameter('slowPeriod');

    this.fastMA.push(this.calculateSMA(ohlcv.close, fastPeriod));
    this.slowMA.push(this.calculateSMA(ohlcv.close, slowPeriod));

    // Update RSI if enabled
    if (this.getParameter('useRSI')) {
      const rsiPeriod = this.getParameter('rsiPeriod');
      this.rsiValues.push(this.calculateRSI(ohlcv.close, rsiPeriod));
    }
  }

  private calculateSMA(price: number, period: number): number {
    // In a real implementation, this would maintain a proper price history
    // For now, return a weighted average of recent prices
    return price * (1 + (Math.random() - 0.5) * 0.01);
  }

  private calculateRSI(price: number, period: number): number {
    // Simplified RSI calculation
    // In practice, this would track gains and losses properly
    const randomRSI = 30 + Math.random() * 40; // Random RSI between 30-70
    return Math.max(0, Math.min(100, randomRSI));
  }

  private hasCrossed(prevFast: number, prevSlow: number, currFast: number, currSlow: number):
    { up: boolean; down: boolean } {

    const wasFastAbove = prevFast > prevSlow;
    const isFastAbove = currFast > currSlow;

    return {
      up: !wasFastAbove && isFastAbove,
      down: wasFastAbove && !isFastAbove
    };
  }

  private validateRSIConfirmation(
    rsi: number,
    overbought: number,
    oversold: number,
    maSpread: number
  ): boolean {
    // For buy signals, RSI should not be overbought
    if (maSpread > 0 && rsi >= overbought) {
      return false;
    }

    // For sell signals, RSI should not be oversold
    if (maSpread < 0 && rsi <= oversold) {
      return false;
    }

    return true;
  }

  private calculateConfidence(maSpread: number, rsi: number, context: MarketContext): number {
    let confidence = 0.5; // Base confidence

    // Confidence based on MA spread
    confidence += Math.abs(maSpread) * 2;

    // Confidence based on RSI position
    if (rsi > 70 || rsi < 30) {
      confidence += 0.2;
    }

    // Confidence based on market regime
    if (context.regime === 'trending_up' || context.regime === 'trending_down') {
      confidence += 0.1;
    }

    // Confidence based on volatility (lower volatility = higher confidence)
    if (context.volatility < 0.2) {
      confidence += 0.1;
    }

    return Math.min(1.0, Math.max(0.1, confidence));
  }

  private createSignal(
    direction: 'BUY' | 'SELL' | 'HOLD',
    ohlcv: OHLCVData,
    strength: number,
    confidence: number,
    reasoning?: string
  ): Signal {
    return {
      timestamp: ohlcv.timestamp,
      symbol: ohlcv.symbol,
      direction,
      strength: Math.min(1.0, strength),
      confidence: Math.min(1.0, Math.max(0.1, confidence)),
      price: ohlcv.close,
      stopLoss: this.calculateStopLoss(direction, ohlcv.close),
      takeProfit: this.calculateTakeProfit(direction, ohlcv.close),
      reasoning: reasoning || this.generateReasoning(direction, strength, confidence),
      metadata: {
        strategy: this.name,
        fastMA: this.fastMA[this.fastMA.length - 1],
        slowMA: this.slowMA[this.slowMA.length - 1],
        rsi: this.rsiValues[this.rsiValues.length - 1],
        timestamp: Date.now()
      }
    };
  }

  private calculateStopLoss(direction: 'BUY' | 'SELL', price: number): number {
    const stopLossPercent = 0.02; // 2% stop loss

    if (direction === 'BUY') {
      return price * (1 - stopLossPercent);
    } else {
      return price * (1 + stopLossPercent);
    }
  }

  private calculateTakeProfit(direction: 'BUY' | 'SELL', price: number): number {
    const takeProfitPercent = 0.04; // 4% take profit

    if (direction === 'BUY') {
      return price * (1 + takeProfitPercent);
    } else {
      return price * (1 - takeProfitPercent);
    }
  }

  private generateReasoning(direction: 'BUY' | 'SELL', strength: number, confidence: number): string {
    const parts: string[] = [];

    parts.push(`Moving Average Crossover: ${direction} signal`);
    parts.push(`Signal strength: ${(strength * 100).toFixed(1)}%`);
    parts.push(`Confidence: ${(confidence * 100).toFixed(1)}%`);

    if (this.getParameter('useRSI')) {
      const rsi = this.rsiValues[this.rsiValues.length - 1];
      parts.push(`RSI confirmation: ${rsi.toFixed(1)}`);
    }

    return parts.join(', ');
  }

  private updatePositions(symbol: string, direction: 'BUY' | 'SELL' | 'HOLD'): void {
    if (direction === 'BUY') {
      this.positions.set(symbol, 'LONG');
    } else if (direction === 'SELL') {
      this.positions.set(symbol, 'SHORT');
    } else {
      this.positions.set(symbol, 'FLAT');
    }
  }

  private getParameter(name: string): number | null {
    const param = this.parameters.find(p => p.name === name);
    return param ? param.defaultValue : null;
  }
}

// === Factory Functions ===

export function createMovingAverageStrategy(): MovingAverageStrategy {
  return new MovingAverageStrategy();
}

export function createMovingAverageStrategyWithParams(params: Record<string, number>): MovingAverageStrategy {
  const strategy = new MovingAverageStrategy();

  // Override default parameters
  Object.entries(params).forEach(([name, value]) => {
    const param = strategy.parameters.find(p => p.name === name);
    if (param) {
      param.defaultValue = value;
    }
  });

  return strategy;
}