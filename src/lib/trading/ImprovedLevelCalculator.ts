// @ts-nocheck
/**
 * Improved Level Calculator
 *
 * Sistema corretto per calcolare entry, stop loss e take profit realistici
 * basati su market structure, spread reali e risk management professionale
 */

import { MarketData, SessionData, TradingSignal } from '@/types/trading';

export interface MarketSpread {
  symbol: string;
  bid: number;
  ask: number;
  spread: number;
  spreadPips: number;
}

export interface LevelCalculationResult {
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskReward: number;
  reasoning: string[];
  riskMetrics: {
    stopDistancePips: number;
    stopDistancePercent: number;
    potentialRewardPips: number;
    maxDrawdownPercent: number;
  };
}

export class ImprovedLevelCalculator {
  private static readonly DEFAULT_SPREADS: Record<string, number> = {
    'XAUUSD': 0.40,      // 40 cents
    'EURUSD': 0.00020,   // 2 pips
    'GBPUSD': 0.00030,   // 3 pips
    'USDJPY': 0.020,     // 2 pips
    'USDCHF': 0.00030,   // 3 pips
    'AUDUSD': 0.00030,   // 3 pips
    'NZDUSD': 0.00040,   // 4 pips
    'EURGBP': 0.00030,   // 3 pips
    'EURJPY': 0.030,     // 3 pips
  };

  /**
   * Calcola entry price realistico considerando lo spread
   */
  static calculateRealisticEntryPrice(
    currentPrice: number,
    signalType: 'BUY' | 'SELL',
    symbol: string
  ): { entryPrice: number; spread: MarketSpread } {
    const defaultSpread = this.DEFAULT_SPREADS[symbol] || 0.00010;
    const spread = this.getRealisticSpread(currentPrice, symbol, defaultSpread);

    // Entry price realistico basato su bid/ask
    const entryPrice = signalType === 'BUY'
      ? spread.ask  // Compriamo all'ask
      : spread.bid; // Vendiamo al bid

    return {
      entryPrice,
      spread: {
        ...spread,
        spreadPips: this.convertToPips(spread.spread, symbol)
      }
    };
  }

  /**
   * Calcola spread realistico basato su sessione e volatilità
   */
  private static getRealisticSpread(
    price: number,
    symbol: string,
    defaultSpread: number
  ): MarketSpread {
    const currentHour = new Date().getUTCHours();

    // Spread adjustment per sessione
    let spreadMultiplier = 1.0;
    if (currentHour >= 21 && currentHour < 23) {
      spreadMultiplier = 1.5; // Rollover period
    } else if (currentHour >= 0 && currentHour < 7) {
      spreadMultiplier = 1.2; // Asian session
    } else if (currentHour >= 7 && currentHour < 16) {
      spreadMultiplier = 0.8; // London session
    } else if (currentHour >= 16 && currentHour < 21) {
      spreadMultiplier = 1.0; // NY session
    }

    const adjustedSpread = defaultSpread * spreadMultiplier;
    const midPrice = price;

    return {
      symbol,
      bid: midPrice - (adjustedSpread / 2),
      ask: midPrice + (adjustedSpread / 2),
      spread: adjustedSpread,
      spreadPips: this.convertToPips(adjustedSpread, symbol)
    };
  }

  /**
   * Calcola stop loss basato su market structure
   */
  static calculateSmartStopLoss(
    entryPrice: number,
    signalType: 'BUY' | 'SELL',
    marketData: {
      m5High: number;
      m5Low: number;
      m15High: number;
      m15Low: number;
      h1High: number;
      h1Low: number;
    },
    atr: number,
    symbol: string
  ): { stopLoss: number; reasoning: string; distancePips: number } {
    const reasoning: string[] = [];
    let stopLoss: number;
    let stopDistance: number;

    if (signalType === 'BUY') {
      // Per BUY: cerchiamo supporto logico sotto il prezzo

      // 1. Check M5 structure (priorità alta per intraday)
      const m5StructureDistance = entryPrice - marketData.m5Low;
      if (m5StructureDistance >= atr * 0.3 && m5StructureDistance <= atr * 1.5) {
        stopLoss = marketData.m5Low;
        stopDistance = m5StructureDistance;
        reasoning.push(`Stop su M5 low (${marketData.m5Low.toFixed(5)}) - structure valida`);
      }
      // 2. Check M15 structure
      else if ((entryPrice - marketData.m15Low) >= atr * 0.3 && (entryPrice - marketData.m15Low) <= atr * 1.5) {
        stopLoss = marketData.m15Low;
        stopDistance = entryPrice - marketData.m15Low;
        reasoning.push(`Stop su M15 low (${marketData.m15Low.toFixed(5)}) - HTF structure`);
      }
      // 3. ATR-based con limiti realistici
      else {
        const atrStopDistance = Math.min(Math.max(atr * 0.7, atr * 0.5), atr * 1.2);
        stopLoss = entryPrice - atrStopDistance;
        stopDistance = atrStopDistance;
        reasoning.push(`ATR-based stop (${atrStopDistance.toFixed(5)}) - nessuna structure valida`);
      }

      // Validazioni aggiuntive
      const maxStopDistance = symbol.includes('XAU') ? 50 : atr * 2; // Max 50$ per oro, 2x ATR per forex
      const minStopDistance = this.getMinStopDistance(symbol);

      if (stopDistance > maxStopDistance) {
        stopLoss = entryPrice - maxStopDistance;
        stopDistance = maxStopDistance;
        reasoning.push(`Stop limitato a max ${maxStopDistance.toFixed(5)} - risk management`);
      } else if (stopDistance < minStopDistance) {
        stopLoss = entryPrice - minStopDistance;
        stopDistance = minStopDistance;
        reasoning.push(`Stop portato a min ${minStopDistance.toFixed(5)} - evitare stop hunting`);
      }

    } else { // SELL
      // Per SELL: cerchiamo resistenza logica sopra il prezzo

      // 1. Check M5 structure
      const m5StructureDistance = marketData.m5High - entryPrice;
      if (m5StructureDistance >= atr * 0.3 && m5StructureDistance <= atr * 1.5) {
        stopLoss = marketData.m5High;
        stopDistance = m5StructureDistance;
        reasoning.push(`Stop su M5 high (${marketData.m5High.toFixed(5)}) - structure valida`);
      }
      // 2. Check M15 structure
      else if ((marketData.m15High - entryPrice) >= atr * 0.3 && (marketData.m15High - entryPrice) <= atr * 1.5) {
        stopLoss = marketData.m15High;
        stopDistance = marketData.m15High - entryPrice;
        reasoning.push(`Stop su M15 high (${marketData.m15High.toFixed(5)}) - HTF structure`);
      }
      // 3. ATR-based
      else {
        const atrStopDistance = Math.min(Math.max(atr * 0.7, atr * 0.5), atr * 1.2);
        stopLoss = entryPrice + atrStopDistance;
        stopDistance = atrStopDistance;
        reasoning.push(`ATR-based stop (${atrStopDistance.toFixed(5)}) - nessuna structure valida`);
      }

      // Validazioni
      const maxStopDistance = symbol.includes('XAU') ? 50 : atr * 2;
      const minStopDistance = this.getMinStopDistance(symbol);

      if (stopDistance > maxStopDistance) {
        stopLoss = entryPrice + maxStopDistance;
        stopDistance = maxStopDistance;
        reasoning.push(`Stop limitato a max ${maxStopDistance.toFixed(5)} - risk management`);
      } else if (stopDistance < minStopDistance) {
        stopLoss = entryPrice + minStopDistance;
        stopDistance = minStopDistance;
        reasoning.push(`Stop portato a min ${minStopDistance.toFixed(5)} - evitare stop hunting`);
      }
    }

    return {
      stopLoss,
      reasoning: reasoning.join(' | '),
      distancePips: this.convertToPips(stopDistance, symbol)
    };
  }

  /**
   * Calcola take profit basato su structure e risk/reward
   */
  static calculateSmartTakeProfit(
    entryPrice: number,
    stopLoss: number,
    signalType: 'BUY' | 'SELL',
    marketData: {
      m5High: number;
      m5Low: number;
      m15High: number;
      m15Low: number;
      h1High: number;
      h1Low: number;
    },
    targetRR: number = 2.0,
    symbol: string
  ): { takeProfit: number; reasoning: string; finalRR: number } {
    const reasoning: string[] = [];
    const riskAmount = Math.abs(entryPrice - stopLoss);
    const targetReward = riskAmount * targetRR;

    let takeProfit: number;

    if (signalType === 'BUY') {
      // Per BUY: cerchiamo resistenza logica

      // 1. Check M15 resistence prima del target RR
      const m15ResistanceDistance = marketData.m15High - entryPrice;
      if (m15ResistanceDistance > riskAmount * 0.8 && m15ResistanceDistance <= targetReward * 1.2) {
        takeProfit = marketData.m15High;
        reasoning.push(`TP su M15 resistance (${marketData.m15High.toFixed(5)}) - structure target`);
      }
      // 2. Check H1 resistance
      else if ((marketData.h1High - entryPrice) > riskAmount * 1.5 && (marketData.h1High - entryPrice) <= targetReward * 1.5) {
        takeProfit = marketData.h1High;
        reasoning.push(`TP su H1 resistance (${marketData.h1High.toFixed(5)}) - HTF target`);
      }
      // 3. RR-based target
      else {
        takeProfit = entryPrice + targetReward;
        reasoning.push(`RR-based target (${targetRR}:1) - ${targetReward.toFixed(5)} from entry`);
      }

      // Validazione: deve essere almeno 1.5:1
      const actualReward = takeProfit - entryPrice;
      const actualRR = actualReward / riskAmount;

      if (actualRR < 1.5) {
        takeProfit = entryPrice + (riskAmount * 1.5);
        reasoning.push(`TP portato a min 1.5:1 - risk management`);
      }

    } else { // SELL
      // Per SELL: cerchiamo supporto logico

      // 1. Check M15 support
      const m15SupportDistance = entryPrice - marketData.m15Low;
      if (m15SupportDistance > riskAmount * 0.8 && m15SupportDistance <= targetReward * 1.2) {
        takeProfit = marketData.m15Low;
        reasoning.push(`TP su M15 support (${marketData.m15Low.toFixed(5)}) - structure target`);
      }
      // 2. Check H1 support
      else if ((entryPrice - marketData.h1Low) > riskAmount * 1.5 && (entryPrice - marketData.h1Low) <= targetReward * 1.5) {
        takeProfit = marketData.h1Low;
        reasoning.push(`TP su H1 support (${marketData.h1Low.toFixed(5)}) - HTF target`);
      }
      // 3. RR-based target
      else {
        takeProfit = entryPrice - targetReward;
        reasoning.push(`RR-based target (${targetRR}:1) - ${targetReward.toFixed(5)} from entry`);
      }

      // Validazione R:R
      const actualReward = entryPrice - takeProfit;
      const actualRR = actualReward / riskAmount;

      if (actualRR < 1.5) {
        takeProfit = entryPrice - (riskAmount * 1.5);
        reasoning.push(`TP portato a min 1.5:1 - risk management`);
      }
    }

    const finalRR = Math.abs(takeProfit - entryPrice) / riskAmount;

    return {
      takeProfit,
      reasoning: reasoning.join(' | '),
      finalRR
    };
  }

  /**
   * Calcolo completo dei livelli migliorati
   */
  static calculateImprovedLevels(
    currentPrice: number,
    signalType: 'BUY' | 'SELL',
    symbol: string,
    marketData: {
      m5High: number;
      m5Low: number;
      m15High: number;
      m15Low: number;
      h1High: number;
      h1Low: number;
    },
    atr: number,
    targetRR: number = 2.0
  ): LevelCalculationResult {
    const reasoning: string[] = [];

    // 1. Entry price realistico con spread
    const { entryPrice, spread } = this.calculateRealisticEntryPrice(currentPrice, signalType, symbol);
    reasoning.push(`Entry @ ${entryPrice.toFixed(5)} (considered ${spread.spreadPips} pips spread)`);

    // 2. Stop loss intelligente
    const { stopLoss, reasoning: slReasoning, distancePips } = this.calculateSmartStopLoss(
      entryPrice, signalType, marketData, atr, symbol
    );
    reasoning.push(`SL: ${slReasoning}`);

    // 3. Take profit intelligente
    const { takeProfit, reasoning: tpReasoning, finalRR } = this.calculateSmartTakeProfit(
      entryPrice, stopLoss, signalType, marketData, targetRR, symbol
    );
    reasoning.push(`TP: ${tpReasoning}`);

    // 4. Risk metrics
    const stopDistance = Math.abs(entryPrice - stopLoss);
    const tpDistance = Math.abs(takeProfit - entryPrice);

    const riskMetrics = {
      stopDistancePips: distancePips,
      stopDistancePercent: (stopDistance / entryPrice) * 100,
      potentialRewardPips: this.convertToPips(tpDistance, symbol),
      maxDrawdownPercent: (stopDistance / entryPrice) * 100
    };

    return {
      entryPrice,
      stopLoss,
      takeProfit,
      riskReward: finalRR,
      reasoning,
      riskMetrics
    };
  }

  /**
   * Converte price distance in pips
   */
  private static convertToPips(distance: number, symbol: string): number {
    if (symbol.includes('JPY')) {
      return distance * 100; // JPY pairs: 2 decimal places
    } else if (symbol.includes('XAU')) {
      return distance * 100; // Gold: 2 decimal places
    } else {
      return distance * 10000; // Major pairs: 4 decimal places
    }
  }

  /**
   * Distanza minima stop per evitare stop hunting
   */
  private static getMinStopDistance(symbol: string): number {
    if (symbol.includes('XAU')) {
      return 10; // Minimo $10 per oro
    } else if (symbol.includes('JPY')) {
      return 0.15; // Minimo 15 pips per JPY
    } else {
      return 0.0015; // Minimo 15 pips per major pairs
    }
  }

  /**
   * Validazione finale dei livelli
   */
  static validateLevels(levels: LevelCalculationResult): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = [];
    let isValid = true;

    // Validazione R:R
    if (levels.riskReward < 1.5) {
      warnings.push(`R:R too low: ${levels.riskReward.toFixed(2)}:1 (minimum 1.5:1)`);
      isValid = false;
    }

    // Validazione distanza stop
    if (levels.riskMetrics.stopDistancePercent > 3) {
      warnings.push(`Stop distance too wide: ${levels.riskMetrics.stopDistancePercent.toFixed(2)}% (max 3%)`);
    } else if (levels.riskMetrics.stopDistancePercent < 0.1) {
      warnings.push(`Stop distance too tight: ${levels.riskMetrics.stopDistancePercent.toFixed(2)}% (min 0.1%)`);
      isValid = false;
    }

    // Validazione posizionamento logico
    if (levels.stopLoss === levels.entryPrice) {
      warnings.push('Stop loss equals entry price - invalid calculation');
      isValid = false;
    }

    return { isValid, warnings };
  }
}

export default ImprovedLevelCalculator;