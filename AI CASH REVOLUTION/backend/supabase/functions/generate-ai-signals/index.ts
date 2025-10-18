
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getMLPrediction, calculateTechnicalConfidence } from './ml_integration.ts'

const OANDA_API_KEY = Deno.env.get('OANDA_API_KEY')!
const OANDA_ACCOUNT_ID = Deno.env.get('OANDA_ACCOUNT_ID')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const LONDON_OPEN = 8
const LONDON_IB_END = 9
const NY_OPEN = 13
const NY_IB_END = 14
const MARKET_CLOSE = 20

const ADX_TREND_THRESHOLD = 25
const CHOP_RANGE_THRESHOLD = 61.8

interface OANDACandle {
  time: string
  volume: number
  complete: boolean
  mid: { o: string, h: string, l: string, c: string }
}


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

function getNearestRoundNumbers(price: number, isJPY: boolean): { above: number, below: number } {
  const multiplier = isJPY ? 1 : 0.01
  const step = isJPY ? 0.5 : 0.005

  const below = Math.floor(price / step) * step
  const above = Math.ceil(price / step) * step

  return {
    below: parseFloat(below.toFixed(isJPY ? 2 : 4)),
    above: parseFloat(above.toFixed(isJPY ? 2 : 4))
  }
}

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

function isOpenBreakoutWindow(): { isWindow: boolean, session: string } {
  const now = new Date()
  const hour = now.getUTCHours()
  const minute = now.getUTCMinutes()

  if (hour === 9 && minute <= 15) {
    return { isWindow: true, session: 'LONDON' }
  }

  if (hour === 14 && minute <= 15) {
    return { isWindow: true, session: 'NY' }
  }

  return { isWindow: false, session: '' }
}

async function generateAdaptiveSignal(symbol: string) {
  console.log(`\n🎯 [ADAPTIVE V3] Generating signal for ${symbol}...`)

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

  const price = await getOANDAPrice(symbol)
  const entryPrice = price.mid
  const isJPY = symbol.includes('JPY')
  console.log(`   💰 Price: ${entryPrice.toFixed(isJPY ? 3 : 5)} | Spread: ${price.spread_pips.toFixed(1)} pips`)

  const [m5Candles, m15Candles, h1Candles] = await Promise.all([
    getOANDACandles(symbol, 'M5', 200),
    getOANDACandles(symbol, 'M15', 100),
    getOANDACandles(symbol, 'H1', 50)
  ])

  const m5_closes = m5Candles.map(c => parseFloat(c.mid.c))
  const m5_highs = m5Candles.map(c => parseFloat(c.mid.h))
  const m5_lows = m5Candles.map(c => parseFloat(c.mid.l))

  const m15_closes = m15Candles.map(c => parseFloat(c.mid.c))
  const m15_highs = m15Candles.map(c => parseFloat(c.mid.h))
  const m15_lows = m15Candles.map(c => parseFloat(c.mid.l))
  const h1_closes = h1Candles.map(c => parseFloat(c.mid.c))
  const ema12 = EMA(m5_closes, 12)
  const ema21 = EMA(m5_closes, 21)
  const ema50 = EMA(m15_closes, 50)

  const atr = ATR(m15_highs, m15_lows, m15_closes, 14)
  const atr_percent = (atr / entryPrice) * 100

  const rsi = RSI(m5_closes, 14)

  const todayCandles = m5Candles.filter(c => {
    const candleDate = new Date(c.time).toISOString().split('T')[0]
    const todayDate = new Date().toISOString().split('T')[0]
    return candleDate === todayDate
  })
  const vwap = calculateVWAP(todayCandles.length > 0 ? todayCandles : m5Candles.slice(-50))

  console.log(`   📊 VWAP: ${vwap.toFixed(5)} | ATR: ${atr.toFixed(5)} (${atr_percent.toFixed(2)}%)`)
  console.log(`   📈 EMA12: ${ema12.toFixed(5)} | EMA21: ${ema21.toFixed(5)}`)
  console.log(`   🔥 RSI: ${rsi.toFixed(1)}`)

  const { regime, adx, choppiness } = detectMarketRegime(m5_highs, m5_lows, m5_closes)
  console.log(`   🔍 REGIME: ${regime} | ADX: ${adx.toFixed(1)} | Choppiness: ${choppiness.toFixed(1)}`)

  const pipValue = isJPY ? 0.01 : 0.0001
  const minSLPips = symbol.includes('XAU') ? 50 : (isJPY ? 30 : 15)
  const minSLDistance = minSLPips * pipValue
  const spreadBuffer = price.spread_pips * pipValue * 1.5
  const effectiveMinSL = Math.max(minSLDistance, spreadBuffer)
  
  console.log(`   🎯 Min SL: ${minSLPips} pips (${effectiveMinSL.toFixed(5)}) | Spread: ${price.spread_pips.toFixed(1)} pips`)

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

  const pdLevels = getPreviousDayLevels(m5Candles)
  if (pdLevels) {
    console.log(`   📅 PDH: ${pdLevels.pdh.toFixed(5)} | PDL: ${pdLevels.pdl.toFixed(5)}`)
  }

  const roundNumbers = getNearestRoundNumbers(price.mid, isJPY)
  console.log(`   🎯 Round: ${roundNumbers.below.toFixed(isJPY ? 2 : 4)} <-> ${roundNumbers.above.toFixed(isJPY ? 2 : 4)}`)

  const openBreakout = isOpenBreakoutWindow()
  if (openBreakout.isWindow) {
    console.log(`   ⏰ ${openBreakout.session} Open Breakout Window (0-15 min)`)
  }

  const m15_trend = m15_closes[m15_closes.length-1] > EMA(m15_closes, 20) ? 'BULLISH' : 'BEARISH'
  const h1_trend = h1_closes[h1_closes.length-1] > EMA(h1_closes, 20) ? 'BULLISH' : 'BEARISH'

  console.log(`   🔄 Trends: M15=${m15_trend} | H1=${h1_trend}`)
  const dailyHigh = Math.max(...m5_highs.slice(-288))
  const dailyLow = Math.min(...m5_lows.slice(-288))

  let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD'
  let confidence = 50
  let stopLoss = 0
  let takeProfit = 0
  const reasoning: string[] = []
  if (regime === 'TREND') {
    reasoning.push(`TREND mode (ADX=${adx.toFixed(1)})`)

    const emaBullCross = ema12 > ema21
    const priceAboveVWAP = price.mid > vwap
    const bullishMomentum = rsi > 45 && rsi < 70
    const h1Bullish = h1_trend === 'BULLISH'

    const pullbackBuy = price.mid < ema50 * 1.003 && price.mid > ema50 * 0.997 && h1Bullish

    const ibBullBreakout = activeIB && price.mid > activeIB.high

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

      if (pdLevels && price.mid > pdLevels.pdh * 0.997) {
        confidence -= 10
        reasoning.push('Near PDH resistance')
      }

      if (Math.abs(price.mid - roundNumbers.above) / price.mid < 0.001) {
        confidence -= 5
        reasoning.push(`Near round number ${roundNumbers.above.toFixed(isJPY ? 2 : 4)}`)
      }
  const ibLow = activeIB ? activeIB.low : (price.mid - atr * 2.5)
  const slDistance = Math.max(atr * 2.0, effectiveMinSL)
      stopLoss = price.mid - slDistance
      
      // Adjust to IB low if available and reasonable
      if (activeIB && activeIB.low < stopLoss && (price.mid - activeIB.low) > effectiveMinSL) {
        stopLoss = activeIB.low - (atr * 0.2)  // Just below IB low
      }

      const risk = price.mid - stopLoss
      // ✅ TP = 1:1 + spread per compensare costi di entrata/uscita
      takeProfit = price.mid + risk + price.spread
      reasoning.push('TP: 1:1 R:R + spread')

      if (pdLevels && takeProfit > pdLevels.pdh) {
        const adjustedTP = pdLevels.pdh * 0.998
        // ✅ Verifica che il TP sia ancora sopra l'entry per un BUY
        if (adjustedTP > price.mid) {
          takeProfit = adjustedTP
          reasoning.push('TP adjusted to PDH')
        }
      }
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

  const slDistance = Math.max(atr * 2.0, effectiveMinSL)
  stopLoss = price.mid + slDistance
      
      // Adjust to IB high if available and reasonable
      if (activeIB && activeIB.high > stopLoss && (activeIB.high - price.mid) > effectiveMinSL) {
        stopLoss = activeIB.high + (atr * 0.2)  // Just above IB high
      }

      const risk = stopLoss - price.mid
      // ✅ TP = 1:1 + spread per compensare costi di entrata/uscita
      takeProfit = price.mid - risk - price.spread
      reasoning.push('TP: 1:1 R:R + spread')

      if (pdLevels && takeProfit < pdLevels.pdl) {
        const adjustedTP = pdLevels.pdl * 1.002
        // ✅ Verifica che il TP sia ancora sotto l'entry per un SELL
        if (adjustedTP < price.mid) {
          takeProfit = adjustedTP
          reasoning.push('TP adjusted to PDL')
        }
      }
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

        // SL/TP for RANGE BUY with minimum distance
        const slDistance = Math.max(atr * 1.5, effectiveMinSL)
        stopLoss = activeIB.low - slDistance
        takeProfit = vwap  // Target VWAP in range
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

        // SL/TP for RANGE SELL with minimum distance
        const slDistance = Math.max(atr * 1.5, effectiveMinSL)
        stopLoss = activeIB.high + slDistance
        takeProfit = vwap
      }
    }
  }

  // === FALLBACK: Always generate BUY or SELL (NEVER HOLD) ===
  if (signal === 'HOLD') {
    reasoning.push('Fallback signal generation')

    // Decision based on momentum and price action
    const bullishMomentum = ema12 > ema21 && price.mid > vwap && rsi > 45
    const bearishMomentum = ema12 < ema21 && price.mid < vwap && rsi < 55

    if (bullishMomentum) {
      signal = 'BUY'
      confidence = 45  // Lower confidence for fallback
      reasoning.push('Bullish momentum detected')

      const slDistance = Math.max(atr * 2.5, effectiveMinSL)
      stopLoss = price.mid - slDistance
      const risk = price.mid - stopLoss
      // ✅ TP = 1:1 + spread
      takeProfit = price.mid + risk + price.spread
      reasoning.push('TP: 1:1 R:R + spread')

    } else if (bearishMomentum) {
      signal = 'SELL'
      confidence = 45
      reasoning.push('Bearish momentum detected')

      const slDistance = Math.max(atr * 2.5, effectiveMinSL)
      stopLoss = price.mid + slDistance
      const risk = stopLoss - price.mid
      // ✅ TP = 1:1 + spread
      takeProfit = price.mid - risk - price.spread
      reasoning.push('TP: 1:1 R:R + spread')

    } else {
      // Last resort: Use multi-timeframe alignment
      const majorTrendBullish = m15_trend === 'BULLISH' && h1_trend === 'BULLISH'

      if (majorTrendBullish) {
        signal = 'BUY'
        confidence = 40
        reasoning.push('Multi-timeframe bullish alignment')
        const slDistance = Math.max(atr * 2.5, effectiveMinSL)
        stopLoss = price.mid - slDistance
        const risk = price.mid - stopLoss
        // ✅ TP = 1:1 + spread
        takeProfit = price.mid + risk + price.spread
        reasoning.push('TP: 1:1 R:R + spread')
      } else {
        signal = 'SELL'
        confidence = 40
        reasoning.push('Multi-timeframe bearish/neutral')
        const slDistance = Math.max(atr * 2.5, effectiveMinSL)
        stopLoss = price.mid + slDistance
        const risk = stopLoss - price.mid
        // ✅ TP = 1:1 + spread
        takeProfit = price.mid - risk - price.spread
        reasoning.push('TP: 1:1 R:R + spread')
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

  console.log(`   🎯 Signal: ${signal} | Confidence: ${confidence}%`)
  console.log(`   💡 ${reasoning.join(' | ')}`)
  console.log(`   📊 SL: ${stopLoss.toFixed(5)} | TP: ${takeProfit.toFixed(5)}`)

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
    // ✅ Rimuoviamo volume e risk_amount - l'EA calcolerà i lotti internamente
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
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-email',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { symbol, saveToDatabase = false, analysisOnly = true, localAnalysis = false } = await req.json()

    if (!symbol) {
      return new Response(
        JSON.stringify({ error: 'Symbol required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const signal = await generateAdaptiveSignal(symbol.toUpperCase())

    // ⚠️  IMPORTANT: Database save controlled by parameters
    // saveToDatabase: false → NO database save (analysis only)
    // analysisOnly: true → Only analysis, no trade execution
    // localAnalysis: true → BLOCCA COMPLETAMENTE qualsiasi salvataggio nel database

    if (localAnalysis) {
      // BLOCCO TOTALE: Analisi locale - nessun salvataggio nel database
      console.log(`🔒 ANALISI LOCALE - nessun salvataggio database`)
      console.log(`📊 Signal generated for ${signal.symbol}: ${signal.type} @ ${signal.price?.mid?.toFixed(5)} (local analysis only)`)
      console.log(`   Confidence: ${signal.confidence}% | SL: ${signal.stopLoss?.toFixed(5)} | TP: ${signal.takeProfit?.toFixed(5)}`)
      console.log(`   💡 This signal is for local analysis only - NOT saved to database`)
    } else if (saveToDatabase && !analysisOnly && signal.type !== 'HOLD') {
      // This should only happen when explicitly requested (not from analysis buttons)
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        const entryPrice = signal.entryPrice || signal.entry_price || signal.price?.mid

        if (!entryPrice) {
          console.error('❌ Cannot save signal: no valid entry price found')
          throw new Error('No valid entry price')
        }

        const { error: insertError } = await supabase
          .from('mt5_signals')
          .insert({
            client_id: 'manual-trade',
            symbol: signal.symbol,
            signal: signal.type,
            confidence: signal.confidence,
            entry: entryPrice,
            stop_loss: signal.stopLoss,
            take_profit: signal.takeProfit,
            risk_amount: null,
            created_at: new Date().toISOString(),
            timestamp: new Date().toISOString(),  // Aggiunto per compatibilità
            ai_analysis: signal.analysis,
            sent: false
          })

        if (insertError) {
          console.error('⚠️  Failed to save signal:', insertError)
        } else {
          console.log(`✅ Signal saved to mt5_signals: ${signal.symbol} ${signal.type} @ ${entryPrice.toFixed(5)}`)
        }
      } catch (dbError) {
        console.error('⚠️  Database save error:', dbError)
      }
    } else {
      // Analysis mode - no database save
      console.log(`📊 Analysis signal generated for ${signal.symbol}: ${signal.type} @ ${signal.price?.mid?.toFixed(5)} (analysis only)`)
      console.log(`   Confidence: ${signal.confidence}% | SL: ${signal.stopLoss?.toFixed(5)} | TP: ${signal.takeProfit?.toFixed(5)}`)
      console.log(`   💡 Use 'Esegui Trade su MT5' button to save and execute this signal`)
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
