/**
 * ADAPTIVE FOREX SIGNAL GENERATOR V3
 *
 * NOVITÀ:
 * 1. ADX + Choppiness Index → Rilevamento automatico RANGE vs TREND
 * 2. PDH/PDL + Round Numbers → Livelli chiave supporto/resistenza
 * 3. London/NY Open Breakout → Strategia breakout sessioni
 *
 * STRATEGIA ADAPTIVA:
 * - TREND Mode (ADX > 25): Momentum + Pullback entries
 * - RANGE Mode (Chop > 61.8): Mean reversion da IB high/low
 *
 * 100% REAL OANDA DATA
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getMLPrediction, calculateTechnicalConfidence } from './ml_integration.ts'

const OANDA_API_KEY = Deno.env.get('OANDA_API_KEY')!
const OANDA_ACCOUNT_ID = Deno.env.get('OANDA_ACCOUNT_ID')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Session Times (UTC)
const LONDON_OPEN = 8
const LONDON_IB_END = 9
const NY_OPEN = 13
const NY_IB_END = 14
const MARKET_CLOSE = 20

// Regime thresholds
const ADX_TREND_THRESHOLD = 25
const CHOP_RANGE_THRESHOLD = 61.8

interface OANDACandle {
  time: string
  volume: number
  complete: boolean
  mid: { o: string, h: string, l: string, c: string }
}

// ===== OANDA DATA =====

async function getOANDACandles(instrument: string, granularity: string, count: number = 200): Promise<OANDACandle[]> {
  const formatted = instrument.includes('_') ? instrument : `${instrument.slice(0,3)}_${instrument.slice(3)}`

  const response = await fetch(
    `https://api-fxpractice.oanda.com/v3/instruments/${formatted}/candles?granularity=${granularity}&count=${count}`,
    { headers: { 'Authorization': `Bearer ${OANDA_API_KEY}` }}
  )

  if (!response.ok) throw new Error(`OANDA error: ${response.statusText}`)

  const data = await response.json()
  return data.candles.filter((c: OANDACandle) => c.complete)
}

async function getOANDAPrice(instrument: string) {
  const formatted = instrument.includes('_') ? instrument : `${instrument.slice(0,3)}_${instrument.slice(3)}`

  const response = await fetch(
    `https://api-fxpractice.oanda.com/v3/accounts/${OANDA_ACCOUNT_ID}/pricing?instruments=${formatted}`,
    { headers: { 'Authorization': `Bearer ${OANDA_API_KEY}` }}
  )

  if (!response.ok) throw new Error(`OANDA pricing error: ${response.statusText}`)

  const data = await response.json()
  const price = data.prices[0]
  const bid = parseFloat(price.bids[0].price)
  const ask = parseFloat(price.asks[0].price)

  return {
    bid, ask,
    mid: (bid + ask) / 2,
    spread: ask - bid,
    spread_pips: formatted.includes('JPY') ? (ask - bid) * 100 : (ask - bid) * 10000
  }
}

// ===== INDICATORS =====

const SMA = (arr: number[], period: number) => {
  const slice = arr.slice(-period)
  return slice.reduce((a,b) => a+b, 0) / period
}

const EMA = (arr: number[], period: number) => {
  if (arr.length < period) return arr[arr.length-1]
  const k = 2 / (period + 1)
  let ema = arr[0]
  for (let i = 1; i < arr.length; i++) {
    ema = arr[i] * k + ema * (1 - k)
  }
  return ema
}

const ATR = (highs: number[], lows: number[], closes: number[], period: number = 14) => {
  const trs: number[] = []
  for (let i = 1; i < highs.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i-1]),
      Math.abs(lows[i] - closes[i-1])
    )
    trs.push(tr)
  }
  return trs.slice(-period).reduce((a,b) => a+b, 0) / period
}

const RSI = (arr: number[], period: number = 14) => {
  const changes = []
  for (let i = 1; i < arr.length; i++) {
    changes.push(arr[i] - arr[i-1])
  }
  const gains = changes.map(c => c > 0 ? c : 0)
  const losses = changes.map(c => c < 0 ? Math.abs(c) : 0)
  const avgGain = gains.slice(-period).reduce((a,b) => a+b, 0) / period
  const avgLoss = losses.slice(-period).reduce((a,b) => a+b, 0) / period
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - (100 / (1 + rs))
}

// ===== NEW: ADX (Average Directional Index) =====

function calculateADX(highs: number[], lows: number[], closes: number[], period: number = 14): number {
  if (highs.length < period + 1) return 0

  const dmPlus: number[] = []
  const dmMinus: number[] = []
  const tr: number[] = []

  for (let i = 1; i < highs.length; i++) {
    const highDiff = highs[i] - highs[i-1]
    const lowDiff = lows[i-1] - lows[i]

    dmPlus.push(highDiff > lowDiff && highDiff > 0 ? highDiff : 0)
    dmMinus.push(lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0)

    const trueRange = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i-1]),
      Math.abs(lows[i] - closes[i-1])
    )
    tr.push(trueRange)
  }

  // Smooth +DM, -DM, TR
  let smoothDMPlus = dmPlus.slice(0, period).reduce((a,b) => a+b, 0)
  let smoothDMMinus = dmMinus.slice(0, period).reduce((a,b) => a+b, 0)
  let smoothTR = tr.slice(0, period).reduce((a,b) => a+b, 0)

  for (let i = period; i < dmPlus.length; i++) {
    smoothDMPlus = smoothDMPlus - (smoothDMPlus / period) + dmPlus[i]
    smoothDMMinus = smoothDMMinus - (smoothDMMinus / period) + dmMinus[i]
    smoothTR = smoothTR - (smoothTR / period) + tr[i]
  }

  const diPlus = (smoothDMPlus / smoothTR) * 100
  const diMinus = (smoothDMMinus / smoothTR) * 100
  const dx = Math.abs(diPlus - diMinus) / (diPlus + diMinus) * 100

  return dx
}

// ===== NEW: Choppiness Index =====

function calculateChoppiness(highs: number[], lows: number[], closes: number[], period: number = 14): number {
  if (highs.length < period) return 50

  const slice_highs = highs.slice(-period)
  const slice_lows = lows.slice(-period)
  const slice_closes = closes.slice(-period)

  const highestHigh = Math.max(...slice_highs)
  const lowestLow = Math.min(...slice_lows)
  const range = highestHigh - lowestLow

  if (range === 0) return 100

  let atrSum = 0
  for (let i = 1; i < period; i++) {
    const tr = Math.max(
      slice_highs[i] - slice_lows[i],
      Math.abs(slice_highs[i] - slice_closes[i-1]),
      Math.abs(slice_lows[i] - slice_closes[i-1])
    )
    atrSum += tr
  }

  const chop = (Math.log10(atrSum / range) / Math.log10(period)) * 100

  return chop
}

// ===== NEW: Market Regime Detection =====

type MarketRegime = 'TREND' | 'RANGE' | 'UNCERTAIN'

function detectMarketRegime(
  highs: number[],
  lows: number[],
  closes: number[]
): { regime: MarketRegime, adx: number, choppiness: number } {

  const adx = calculateADX(highs, lows, closes, 14)
  const choppiness = calculateChoppiness(highs, lows, closes, 14)

  let regime: MarketRegime = 'UNCERTAIN'

  if (adx > ADX_TREND_THRESHOLD && choppiness < 50) {
    regime = 'TREND'
  } else if (choppiness > CHOP_RANGE_THRESHOLD) {
    regime = 'RANGE'
  }

  return { regime, adx, choppiness }
}

// ===== VWAP CALCULATION =====

function calculateVWAP(candles: OANDACandle[]): number {
  let cumulativeTPV = 0
  let cumulativeVolume = 0

  for (const candle of candles) {
    const typical = (parseFloat(candle.mid.h) + parseFloat(candle.mid.l) + parseFloat(candle.mid.c)) / 3
    const volume = candle.volume || 1
    cumulativeTPV += typical * volume
    cumulativeVolume += volume
  }

  return cumulativeVolume > 0 ? cumulativeTPV / cumulativeVolume : 0
}

// ===== INITIAL BALANCE =====

function getInitialBalance(candles: OANDACandle[], sessionStart: number): { high: number, low: number, range: number } | null {
  const ibCandles = candles.filter(c => {
    const candleTime = new Date(c.time)
    const candleHour = candleTime.getUTCHours()
    return candleHour >= sessionStart && candleHour < sessionStart + 1
  })

  if (ibCandles.length === 0) return null

  const highs = ibCandles.map(c => parseFloat(c.mid.h))
  const lows = ibCandles.map(c => parseFloat(c.mid.l))

  const ibHigh = Math.max(...highs)
  const ibLow = Math.min(...lows)

  return {
    high: ibHigh,
    low: ibLow,
    range: ibHigh - ibLow
  }
}

// ===== NEW: Previous Day High/Low =====

function getPreviousDayLevels(candles: OANDACandle[]): { pdh: number, pdl: number } | null {
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const yesterdayDateStr = yesterday.toISOString().split('T')[0]

  const pdCandles = candles.filter(c => {
    const candleDate = new Date(c.time).toISOString().split('T')[0]
    return candleDate === yesterdayDateStr
  })

  if (pdCandles.length === 0) return null

  const pdh = Math.max(...pdCandles.map(c => parseFloat(c.mid.h)))
  const pdl = Math.min(...pdCandles.map(c => parseFloat(c.mid.l)))

  return { pdh, pdl }
}

// ===== NEW: Round Numbers =====

function getNearestRoundNumbers(price: number, isJPY: boolean): { above: number, below: number } {
  const multiplier = isJPY ? 1 : 0.01  // JPY: 150.00, 151.00 | Others: 1.1000, 1.1050
  const step = isJPY ? 0.5 : 0.005      // JPY: 0.50 | Others: 0.0050 (50 pips)

  const below = Math.floor(price / step) * step
  const above = Math.ceil(price / step) * step

  return {
    below: parseFloat(below.toFixed(isJPY ? 2 : 4)),
    above: parseFloat(above.toFixed(isJPY ? 2 : 4))
  }
}

// ===== MARKET SESSION =====

function getCurrentSession(): 'ASIAN' | 'LONDON' | 'NY' | 'CLOSED' {
  const hour = new Date().getUTCHours()

  if (hour >= 0 && hour < 7) return 'ASIAN'
  if (hour >= 7 && hour < 12) return 'LONDON'
  if (hour >= 12 && hour < 20) return 'NY'
  return 'CLOSED'
}

function shouldAvoidOvernight(): boolean {
  const now = new Date()
  const day = now.getUTCDay()
  const hour = now.getUTCHours()

  if (day === 5 && hour >= MARKET_CLOSE) return true
  if (day === 0 || day === 6) return true

  return false
}

// ===== NEW: London/NY Open Breakout Detection =====

function isOpenBreakoutWindow(): { isWindow: boolean, session: string } {
  const now = new Date()
  const hour = now.getUTCHours()
  const minute = now.getUTCMinutes()

  // London: 09:00-09:15 UTC (post-IB breakout)
  if (hour === 9 && minute <= 15) {
    return { isWindow: true, session: 'LONDON' }
  }

  // NY: 14:00-14:15 UTC (post-IB breakout)
  if (hour === 14 && minute <= 15) {
    return { isWindow: true, session: 'NY' }
  }

  return { isWindow: false, session: '' }
}

// ===== ADAPTIVE SIGNAL GENERATION =====

async function generateAdaptiveSignal(symbol: string) {
  console.log(`\n🎯 [ADAPTIVE V3] Generating signal for ${symbol}...`)

  // 1. Check market hours
  if (shouldAvoidOvernight()) {
    console.log(`   ❌ Weekend/Late Friday - No trade`)
    return {
      symbol,
      type: 'HOLD',
      confidence: 0,
      reason: 'Market closed or approaching weekend'
    }
  }

  const session = getCurrentSession()
  console.log(`   📍 Session: ${session}`)

  // 2. Get real-time price
  const price = await getOANDAPrice(symbol)
  const entryPrice = price.mid
  const isJPY = symbol.includes('JPY')
  console.log(`   💰 Price: ${entryPrice.toFixed(isJPY ? 3 : 5)} | Spread: ${price.spread_pips.toFixed(1)} pips`)

  // 3. Get multi-timeframe data
  const [m5Candles, m15Candles, h1Candles] = await Promise.all([
    getOANDACandles(symbol, 'M5', 200),
    getOANDACandles(symbol, 'M15', 100),
    getOANDACandles(symbol, 'H1', 50)
  ])

  // 4. Extract arrays
  const m5_closes = m5Candles.map(c => parseFloat(c.mid.c))
  const m5_highs = m5Candles.map(c => parseFloat(c.mid.h))
  const m5_lows = m5Candles.map(c => parseFloat(c.mid.l))

  const m15_closes = m15Candles.map(c => parseFloat(c.mid.c))
  const m15_highs = m15Candles.map(c => parseFloat(c.mid.h))
  const m15_lows = m15Candles.map(c => parseFloat(c.mid.l))
  const h1_closes = h1Candles.map(c => parseFloat(c.mid.c))

  // 5. Calculate indicators
  const ema12 = EMA(m5_closes, 12)
  const ema21 = EMA(m5_closes, 21)
  const ema50 = EMA(m15_closes, 50)

  // Use M15 ATR for more realistic SL/TP distances
  const atr = ATR(m15_highs, m15_lows, m15_closes, 14)
  const atr_percent = (atr / entryPrice) * 100

  const rsi = RSI(m5_closes, 14)

  // 6. VWAP
  const todayCandles = m5Candles.filter(c => {
    const candleDate = new Date(c.time).toISOString().split('T')[0]
    const todayDate = new Date().toISOString().split('T')[0]
    return candleDate === todayDate
  })
  const vwap = calculateVWAP(todayCandles.length > 0 ? todayCandles : m5Candles.slice(-50))

  console.log(`   📊 VWAP: ${vwap.toFixed(5)} | ATR: ${atr.toFixed(5)} (${atr_percent.toFixed(2)}%)`)
  console.log(`   📈 EMA12: ${ema12.toFixed(5)} | EMA21: ${ema21.toFixed(5)}`)
  console.log(`   🔥 RSI: ${rsi.toFixed(1)}`)

  // 7. === NEW: MARKET REGIME DETECTION ===
  const { regime, adx, choppiness } = detectMarketRegime(m5_highs, m5_lows, m5_closes)
  console.log(`   🔍 REGIME: ${regime} | ADX: ${adx.toFixed(1)} | Choppiness: ${choppiness.toFixed(1)}`)

  // 7.5. Calculate minimum SL distance (considering spread + buffer)
  const pipValue = isJPY ? 0.01 : 0.0001
  const minSLPips = symbol.includes('XAU') ? 50 : (isJPY ? 30 : 15)  // Gold: 50 pips, JPY: 30, Majors: 15
  const minSLDistance = minSLPips * pipValue
  const spreadBuffer = price.spread_pips * pipValue * 1.5  // 1.5x spread as safety
  const effectiveMinSL = Math.max(minSLDistance, spreadBuffer)
  
  console.log(`   🎯 Min SL: ${minSLPips} pips (${effectiveMinSL.toFixed(5)}) | Spread: ${price.spread_pips.toFixed(1)} pips`)

  // 8. Initial Balance
  const londonIB = getInitialBalance(m5Candles, LONDON_OPEN)
  const nyIB = getInitialBalance(m5Candles, NY_OPEN)

  let activeIB = null
  if (session === 'LONDON' && londonIB) {
    activeIB = { ...londonIB, name: 'London IB' }
    console.log(`   🇬🇧 London IB: ${londonIB.high.toFixed(5)} - ${londonIB.low.toFixed(5)}`)
  } else if (session === 'NY' && nyIB) {
    activeIB = { ...nyIB, name: 'NY IB' }
    console.log(`   🇺🇸 NY IB: ${nyIB.high.toFixed(5)} - ${nyIB.low.toFixed(5)}`)
  }

  // 9. === NEW: PDH/PDL ===
  const pdLevels = getPreviousDayLevels(m5Candles)
  if (pdLevels) {
    console.log(`   📅 PDH: ${pdLevels.pdh.toFixed(5)} | PDL: ${pdLevels.pdl.toFixed(5)}`)
  }

  // 10. === NEW: Round Numbers ===
  const roundNumbers = getNearestRoundNumbers(price.mid, isJPY)
  console.log(`   🎯 Round: ${roundNumbers.below.toFixed(isJPY ? 2 : 4)} <-> ${roundNumbers.above.toFixed(isJPY ? 2 : 4)}`)

  // 11. === NEW: Open Breakout Window ===
  const openBreakout = isOpenBreakoutWindow()
  if (openBreakout.isWindow) {
    console.log(`   ⏰ ${openBreakout.session} Open Breakout Window (0-15 min)`)
  }

  // 12. Multi-timeframe trend
  const m15_trend = m15_closes[m15_closes.length-1] > EMA(m15_closes, 20) ? 'BULLISH' : 'BEARISH'
  const h1_trend = h1_closes[h1_closes.length-1] > EMA(h1_closes, 20) ? 'BULLISH' : 'BEARISH'

  console.log(`   🔄 Trends: M15=${m15_trend} | H1=${h1_trend}`)

  // 13. Price action levels
  const dailyHigh = Math.max(...m5_highs.slice(-288))
  const dailyLow = Math.min(...m5_lows.slice(-288))

  // === ADAPTIVE SIGNAL LOGIC ===

  let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD'
  let confidence = 50
  let stopLoss = 0
  let takeProfit = 0
  const reasoning: string[] = []

  // ============================================
  // TREND MODE: Momentum + Pullback
  // ============================================
  if (regime === 'TREND') {
    reasoning.push(`TREND mode (ADX=${adx.toFixed(1)})`)

    // === BULLISH TREND SETUP ===
    const emaBullCross = ema12 > ema21
    const priceAboveVWAP = price.mid > vwap
    const bullishMomentum = rsi > 45 && rsi < 70
    const h1Bullish = h1_trend === 'BULLISH'

    // Pullback setup: Price near EMA50 in uptrend
    const pullbackBuy = price.mid < ema50 * 1.003 && price.mid > ema50 * 0.997 && h1Bullish

    // IB Breakout
    const ibBullBreakout = activeIB && price.mid > activeIB.high

    // Open breakout (London/NY)
    const openBullBreakout = openBreakout.isWindow &&
                             activeIB &&
                             price.mid > activeIB.high &&
                             m15_trend === 'BULLISH'

    if (
      emaBullCross &&
      priceAboveVWAP &&
      bullishMomentum &&
      h1Bullish &&
      atr_percent > 0.05
    ) {
      signal = 'BUY'
      confidence = 60
      reasoning.push('Trend following: EMA cross + VWAP + momentum')

      if (pullbackBuy) {
        confidence += 10
        reasoning.push('Pullback entry near EMA50')
      }

      if (ibBullBreakout) {
        confidence += 15
        reasoning.push(`${activeIB.name} breakout`)
      }

      if (openBullBreakout) {
        confidence += 20
        reasoning.push(`${openBreakout.session} open breakout (HIGH PROB)`)
      }

      // Near PDH resistance - reduce confidence
      if (pdLevels && price.mid > pdLevels.pdh * 0.997) {
        confidence -= 10
        reasoning.push('Near PDH resistance')
      }

      // Near round number resistance
      if (Math.abs(price.mid - roundNumbers.above) / price.mid < 0.001) {
        confidence -= 5
        reasoning.push(`Near round number ${roundNumbers.above.toFixed(isJPY ? 2 : 4)}`)
      }

      // SL/TP for TREND with realistic distances - ATR + SPREAD based
      const spread = price.ask - price.bid
      const slDistance = (atr * 2.0) + spread  // 2x ATR + spread
      stopLoss = price.mid - slDistance
      
      const tpDistance = (atr * 4.0) + spread  // 4x ATR for 2:1 RR
      takeProfit = price.mid + tpDistance
      
      reasoning.push(`SL: 2xATR + spread = ${slDistance.toFixed(5)}`)
      reasoning.push(`TP: 4xATR + spread for 2:1 RR`)
    }

    // === BEARISH TREND SETUP ===
    const emaBearCross = ema12 < ema21
    const priceBelowVWAP = price.mid < vwap
    const bearishMomentum = rsi < 55 && rsi > 30
    const h1Bearish = h1_trend === 'BEARISH'

    const pullbackSell = price.mid > ema50 * 0.997 && price.mid < ema50 * 1.003 && h1Bearish

    const ibBearBreakout = activeIB && price.mid < activeIB.low

    const openBearBreakout = openBreakout.isWindow &&
                             activeIB &&
                             price.mid < activeIB.low &&
                             m15_trend === 'BEARISH'

    if (
      signal === 'HOLD' &&
      emaBearCross &&
      priceBelowVWAP &&
      bearishMomentum &&
      h1Bearish &&
      atr_percent > 0.05
    ) {
      signal = 'SELL'
      confidence = 60
      reasoning.push('Trend following: EMA cross + VWAP + momentum')

      if (pullbackSell) {
        confidence += 10
        reasoning.push('Pullback entry near EMA50')
      }

      if (ibBearBreakout) {
        confidence += 15
        reasoning.push(`${activeIB.name} breakdown`)
      }

      if (openBearBreakout) {
        confidence += 20
        reasoning.push(`${openBreakout.session} open breakdown (HIGH PROB)`)
      }

      if (pdLevels && price.mid < pdLevels.pdl * 1.003) {
        confidence -= 10
        reasoning.push('Near PDL support')
      }

      if (Math.abs(price.mid - roundNumbers.below) / price.mid < 0.001) {
        confidence -= 5
        reasoning.push(`Near round number ${roundNumbers.below.toFixed(isJPY ? 2 : 4)}`)
      }

  // SL/TP for TREND SELL - ATR + SPREAD based
  const spread = price.ask - price.bid
  const slDistance = (atr * 2.0) + spread  // 2x ATR + spread
  stopLoss = price.mid + slDistance
  
  const tpDistance = (atr * 4.0) + spread  // 4x ATR for 2:1 RR
  takeProfit = price.mid - tpDistance
  
  reasoning.push(`SL: 2xATR + spread = ${slDistance.toFixed(5)}`)
  reasoning.push(`TP: 4xATR + spread for 2:1 RR`)
    }
  }

  // ============================================
  // RANGE MODE: Mean Reversion
  // ============================================
  else if (regime === 'RANGE') {
    reasoning.push(`RANGE mode (Chop=${choppiness.toFixed(1)})`)

    if (!activeIB) {
      reasoning.push('No IB available for range trading')
    } else {
      // === BUY FROM IB LOW (oversold bounce) ===
      const nearIBLow = price.mid <= activeIB.low * 1.001
      const oversold = rsi < 35
      const priceNearSupport = pdLevels ? price.mid <= pdLevels.pdl * 1.002 : false

      if (nearIBLow && oversold && atr_percent > 0.03) {
        signal = 'BUY'
        confidence = 55
        reasoning.push(`Mean reversion: Price at ${activeIB.name} low`)
        reasoning.push(`RSI oversold (${rsi.toFixed(1)})`)

        if (priceNearSupport) {
          confidence += 15
          reasoning.push('Confluence with PDL support')
        }

        if (Math.abs(price.mid - roundNumbers.below) / price.mid < 0.001) {
          confidence += 10
          reasoning.push(`Round number support ${roundNumbers.below.toFixed(isJPY ? 2 : 4)}`)
        }

        // SL/TP for RANGE BUY - ATR + SPREAD based
        const spread = price.ask - price.bid
        const slDistance = (atr * 1.5) + spread  // 1.5x ATR + spread (range is less volatile)
        stopLoss = price.mid - slDistance
        
        const tpDistance = (atr * 2.5) + spread  // 2.5x ATR
        takeProfit = price.mid + tpDistance
        
        reasoning.push(`Range SL: 1.5xATR + spread = ${slDistance.toFixed(5)}`)
        reasoning.push(`Range TP: 2.5xATR + spread`)
      }

      // === SELL FROM IB HIGH (overbought rejection) ===
      const nearIBHigh = price.mid >= activeIB.high * 0.999
      const overbought = rsi > 65
      const priceNearResistance = pdLevels ? price.mid >= pdLevels.pdh * 0.998 : false

      if (signal === 'HOLD' && nearIBHigh && overbought && atr_percent > 0.03) {
        signal = 'SELL'
        confidence = 55
        reasoning.push(`Mean reversion: Price at ${activeIB.name} high`)
        reasoning.push(`RSI overbought (${rsi.toFixed(1)})`)

        if (priceNearResistance) {
          confidence += 15
          reasoning.push('Confluence with PDH resistance')
        }

        if (Math.abs(price.mid - roundNumbers.above) / price.mid < 0.001) {
          confidence += 10
          reasoning.push(`Round number resistance ${roundNumbers.above.toFixed(isJPY ? 2 : 4)}`)
        }

        // SL/TP for RANGE SELL - ATR + SPREAD based
        const spread = price.ask - price.bid
        const slDistance = (atr * 1.5) + spread  // 1.5x ATR + spread
        stopLoss = price.mid + slDistance
        
        const tpDistance = (atr * 2.5) + spread  // 2.5x ATR
        takeProfit = price.mid - tpDistance
        
        reasoning.push(`Range SL: 1.5xATR + spread = ${slDistance.toFixed(5)}`)
        reasoning.push(`Range TP: 2.5xATR + spread`)
      }
    }
  }

  // === FALLBACK: Always generate BUY or SELL (NEVER HOLD) ===
  if (signal === 'HOLD') {
    reasoning.push('Fallback signal generation')
    
    const spread = price.ask - price.bid

    // Decision based on momentum and price action
    const bullishMomentum = ema12 > ema21 && price.mid > vwap && rsi > 45
    const bearishMomentum = ema12 < ema21 && price.mid < vwap && rsi < 55

    if (bullishMomentum) {
      signal = 'BUY'
      confidence = 45  // Lower confidence for fallback
      reasoning.push('Bullish momentum detected')

      const spread = price.ask - price.bid
      const slDistance = (atr * 2.5) + spread
      stopLoss = price.mid - slDistance
      const tpDistance = slDistance * 1.5
      takeProfit = price.mid + tpDistance  // 1.5:1 R:R for fallback

    } else if (bearishMomentum) {
      signal = 'SELL'
      confidence = 45
      reasoning.push('Bearish momentum detected')

      const slDistance = (atr * 2.5) + spread
      stopLoss = price.mid + slDistance
      const tpDistance = slDistance * 1.5
      takeProfit = price.mid - tpDistance  // 1.5:1 R:R for fallback

    } else {
      // Last resort: Use multi-timeframe alignment
      const majorTrendBullish = m15_trend === 'BULLISH' && h1_trend === 'BULLISH'

      if (majorTrendBullish) {
        signal = 'BUY'
        confidence = 40
        reasoning.push('Multi-timeframe bullish alignment')
        const slDistance = (atr * 2.5) + spread
        stopLoss = price.mid - slDistance
        takeProfit = price.mid + (slDistance * 1.5)
      } else {
        signal = 'SELL'
        confidence = 40
        reasoning.push('Multi-timeframe bearish/neutral')
        const slDistance = (atr * 2.5) + spread
        stopLoss = price.mid + slDistance
        takeProfit = price.mid - (slDistance * 1.5)
      }
    }

    if (regime === 'UNCERTAIN') confidence -= 5
    if (atr_percent < 0.05) {
      confidence -= 8
      reasoning.push(`Low volatility (${atr_percent.toFixed(2)}%)`)
    }
  }

  // Volatility penalty
  if (atr_percent < 0.08) {
    confidence -= 5
  }

  // === ML INTEGRATION: Get real confidence from ML or technical indicators ===
  try {
    const mlPrediction = await getMLPrediction(symbol, {
      close: price.mid,
      rsi,
      ema12,
      ema21,
      ema50,
      atr,
      adx
    })

    if (mlPrediction) {
      // ML prediction available
      confidence = mlPrediction.confidence

      // Override signal if ML is very confident and disagrees
      if (Math.abs(mlPrediction.confidence - 50) > 25) {  // >75% or <25%
        if (mlPrediction.prediction !== 'HOLD') {
          signal = mlPrediction.prediction
          reasoning.push(`ML override: ${mlPrediction.prediction} @ ${mlPrediction.confidence.toFixed(1)}%`)
        }
      }

      reasoning.push(mlPrediction.model_available ? 'ML model prediction' : 'Technical confidence calculation')
    } else {
      // ML API not available, calculate technical confidence
      confidence = calculateTechnicalConfidence(signal, {
        rsi,
        ema12,
        ema21,
        ema50,
        adx,
        atr,
        close: price.mid,
        regime
      })
      reasoning.push('Dynamic technical confidence')
    }
  } catch (error) {
    console.warn(`ML integration error: ${error.message}`)
    // Keep existing confidence
  }

  // Cap confidence (minimum 40% for valid signals)
  confidence = Math.max(40, Math.min(95, confidence))

  // 🔧 CRITICAL FIX: Verifica finale che SL/TP siano nella direzione corretta
  if (signal === 'BUY') {
    // BUY: TP deve essere SOPRA entry, SL SOTTO entry
    if (takeProfit <= entryPrice) {
      console.warn(`⚠️  FIXING BUY: TP ${takeProfit} <= Entry ${entryPrice}`)
      const risk = entryPrice - stopLoss
      takeProfit = entryPrice + (risk * 2.0)
      reasoning.push('TP adjusted (was below entry)')
    }
    if (stopLoss >= entryPrice) {
      console.warn(`⚠️  FIXING BUY: SL ${stopLoss} >= Entry ${entryPrice}`)
      stopLoss = entryPrice - (atr * 2.0)
      reasoning.push('SL adjusted (was above entry)')
    }
  } else if (signal === 'SELL') {
    // SELL: TP deve essere SOTTO entry, SL SOPRA entry
    if (takeProfit >= entryPrice) {
      console.warn(`⚠️  FIXING SELL: TP ${takeProfit} >= Entry ${entryPrice}`)
      const risk = stopLoss - entryPrice
      takeProfit = entryPrice - (risk * 2.0)
      reasoning.push('TP adjusted (was above entry)')
    }
    if (stopLoss <= entryPrice) {
      console.warn(`⚠️  FIXING SELL: SL ${stopLoss} <= Entry ${entryPrice}`)
      stopLoss = entryPrice + (atr * 2.0)
      reasoning.push('SL adjusted (was below entry)')
    }
  }

  console.log(`   🎯 Signal: ${signal} | Confidence: ${confidence}%`)
  console.log(`   💰 Entry: ${entryPrice.toFixed(5)} | SL: ${stopLoss.toFixed(5)} | TP: ${takeProfit.toFixed(5)}`)
  console.log(`   💡 ${reasoning.join(' | ')}`)

  return {
    symbol,
    type: signal,
    confidence,
    entryPrice,
    entry_price: entryPrice,
    price: {
      bid: price.bid,
      ask: price.ask,
      mid: entryPrice,
      spread: price.spread,
      spreadPips: price.spread_pips
    },
    stopLoss,
    takeProfit,
    analysis: {
      session,
      regime,
      adx,
      choppiness,
      vwap,
      initialBalance: activeIB,
      pdLevels,
      roundNumbers,
      openBreakout: openBreakout.isWindow ? openBreakout.session : null,
      indicators: {
        ema12, ema21, ema50,
        atr, atr_percent, rsi
      },
      trends: { m15: m15_trend, h1: h1_trend },
      levels: { dailyHigh, dailyLow },
      reasoning
    }
  }
}

// ===== HANDLER =====

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept, x-user-email',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { 
      symbol, 
      saveToDatabase = true, 
      executeOnMT5 = false,
      riskAmount,
      risk_amount,
      risk_eur,
      amount_to_risk_eur,
      riskCurrency = 'EUR',
      aggressive = false
    } = await req.json()

    if (!symbol) {
      return new Response(
        JSON.stringify({ error: 'Symbol required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const signal = await generateAdaptiveSignal(symbol.toUpperCase())

    // Get user email from headers if executing on MT5
    const userEmail = req.headers.get('x-user-email')
    
    // Determine risk amount from various parameter names
    const finalRiskAmount = riskAmount || risk_amount || risk_eur || amount_to_risk_eur

    // Auto-save to mt5_signals for training and dashboard
    if (saveToDatabase && signal.type !== 'HOLD') {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

        // Use multiple fallbacks to ensure entry is always populated
        const entryPrice = signal.entryPrice || signal.entry_price || signal.price?.mid

        if (!entryPrice) {
          console.error('❌ Cannot save signal: no valid entry price found')
          throw new Error('No valid entry price')
        }

        // 🔧 FIX: Use userEmail as client_id when executing on MT5
        const clientId = (executeOnMT5 && userEmail) ? userEmail : 'auto-ai-generator'

        const { error: insertError } = await supabase
          .from('mt5_signals')
          .insert({
            client_id: clientId,
            symbol: signal.symbol,
            signal: signal.type,
            confidence: signal.confidence,
            entry: entryPrice,
            stop_loss: signal.stopLoss,
            take_profit: signal.takeProfit,
            risk_amount: finalRiskAmount || null,
            timestamp: new Date().toISOString(),
            ai_analysis: signal.analysis,
            sent: false,
            immediate_notification: executeOnMT5 // 🔧 Mark for immediate delivery to EA
          })

        if (insertError) {
          console.error('⚠️  Failed to save signal to mt5_signals:', insertError)
          console.error('   Signal data:', { symbol: signal.symbol, type: signal.type, entry: entryPrice })
        } else {
          console.log(`✅ Signal saved to mt5_signals: ${signal.symbol} ${signal.type} @ ${entryPrice.toFixed(5)}`)
          if (executeOnMT5) {
            console.log(`   🚀 Marked for immediate MT5 execution (client: ${clientId})`)
          }
        }
      } catch (dbError) {
        console.error('⚠️  Database save error:', dbError)
        // Continue anyway - signal generation succeeded
      }
    }

    return new Response(
      JSON.stringify(signal),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
