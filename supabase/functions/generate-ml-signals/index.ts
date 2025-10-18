// Supabase Edge Function: Generate ML Signals Automatically
// Runs periodically to fetch live data, generate predictions, and save for continuous learning

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MarketData {
  symbol: string
  granularity: string
  timestamp: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface Indicators {
  rsi: number
  ema12: number
  ema21: number
  adx: number
}

interface MLPrediction {
  direction: 'BUY' | 'SELL'
  confidence: number
  signal_weight: number
  recommendation: string
  position_multiplier: number
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Parse request
    const { symbols, timeframes, source = 'oanda' } = await req.json()

    const symbolsToProcess = symbols || ['EURUSD', 'USDCAD', 'USDJPY', 'XAUUSD']
    const timeframesToProcess = timeframes || ['M15', 'H1']

    const results = []

    // Process each symbol/timeframe combination
    for (const symbol of symbolsToProcess) {
      for (const granularity of timeframesToProcess) {
        try {
          console.log(`Processing ${symbol} ${granularity}...`)

          // 1. Fetch latest market data from OANDA
          const marketData = await fetchMarketData(symbol, granularity, source)
          
          if (!marketData) {
            console.log(`No data for ${symbol} ${granularity}`)
            continue
          }

          // 2. Calculate technical indicators
          const indicators = await calculateIndicators(supabase, symbol, granularity, marketData)

          // 3. Check if candle already exists
          const { data: existing } = await supabase
            .from('ml_historical_candles')
            .select('id')
            .eq('symbol', symbol)
            .eq('granularity', granularity)
            .eq('timestamp', marketData.timestamp)
            .maybeSingle()

          let candleId: string

          if (existing) {
            // Update existing candle
            const { data, error } = await supabase
              .from('ml_historical_candles')
              .update({
                open: marketData.open,
                high: marketData.high,
                low: marketData.low,
                close: marketData.close,
                volume: marketData.volume,
                rsi: indicators.rsi,
                ema12: indicators.ema12,
                ema21: indicators.ema21,
                adx: indicators.adx,
                updated_at: new Date().toISOString()
              })
              .eq('id', existing.id)
              .select('id')
              .single()

            if (error) throw error
            candleId = data.id
            console.log(`Updated candle ${candleId}`)
          } else {
            // Insert new candle
            const { data, error } = await supabase
              .from('ml_historical_candles')
              .insert({
                symbol,
                granularity,
                timestamp: marketData.timestamp,
                open: marketData.open,
                high: marketData.high,
                low: marketData.low,
                close: marketData.close,
                volume: marketData.volume,
                rsi: indicators.rsi,
                ema12: indicators.ema12,
                ema21: indicators.ema21,
                adx: indicators.adx,
                dataset_type: 'production',
                is_labeled: false
              })
              .select('id')
              .single()

            if (error) throw error
            candleId = data.id
            console.log(`Inserted new candle ${candleId}`)
          }

          // 4. Generate ML prediction (will be done via Python API)
          // For now, mark as ready for prediction
          results.push({
            symbol,
            granularity,
            timestamp: marketData.timestamp,
            candle_id: candleId,
            status: 'saved',
            indicators
          })

        } catch (error) {
          console.error(`Error processing ${symbol} ${granularity}:`, error)
          results.push({
            symbol,
            granularity,
            status: 'error',
            error: error.message
          })
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})

async function fetchMarketData(
  symbol: string, 
  granularity: string,
  source: string
): Promise<MarketData | null> {
  // This would integrate with OANDA API
  // For now, return mock data structure
  
  const oandaToken = Deno.env.get('OANDA_API_TOKEN')
  const oandaUrl = Deno.env.get('OANDA_API_URL') || 'https://api-fxpractice.oanda.com'

  if (!oandaToken) {
    throw new Error('OANDA_API_TOKEN not configured')
  }

  // Convert granularity to OANDA format (M15 -> M15, H1 -> H1, etc.)
  const oandaGranularity = granularity

  try {
    const response = await fetch(
      `${oandaUrl}/v3/instruments/${symbol}_USD/candles?count=1&granularity=${oandaGranularity}&price=M`,
      {
        headers: {
          'Authorization': `Bearer ${oandaToken}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`OANDA API error: ${response.statusText}`)
    }

    const data = await response.json()
    
    if (!data.candles || data.candles.length === 0) {
      return null
    }

    const candle = data.candles[0]
    
    return {
      symbol,
      granularity,
      timestamp: candle.time,
      open: parseFloat(candle.mid.o),
      high: parseFloat(candle.mid.h),
      low: parseFloat(candle.mid.l),
      close: parseFloat(candle.mid.c),
      volume: candle.volume || 0
    }
  } catch (error) {
    console.error(`Error fetching OANDA data for ${symbol}:`, error)
    return null
  }
}

async function calculateIndicators(
  supabase: any,
  symbol: string,
  granularity: string,
  currentCandle: MarketData
): Promise<Indicators> {
  // Fetch recent candles for indicator calculation
  const { data: recentCandles } = await supabase
    .from('ml_historical_candles')
    .select('close, high, low, volume')
    .eq('symbol', symbol)
    .eq('granularity', granularity)
    .order('timestamp', { ascending: false })
    .limit(50)

  const closes = recentCandles?.map((c: any) => c.close) || []
  closes.unshift(currentCandle.close) // Add current

  // Simple indicator calculations (would use proper TA library in production)
  const rsi = calculateRSI(closes, 14)
  const ema12 = calculateEMA(closes, 12)
  const ema21 = calculateEMA(closes, 21)
  const adx = calculateADX(recentCandles || [], 14)

  return { rsi, ema12, ema21, adx }
}

function calculateRSI(closes: number[], period: number = 14): number {
  if (closes.length < period + 1) return 50 // Default neutral

  let gains = 0
  let losses = 0

  for (let i = 1; i <= period; i++) {
    const change = closes[i - 1] - closes[i]
    if (change > 0) gains += change
    else losses += Math.abs(change)
  }

  const avgGain = gains / period
  const avgLoss = losses / period

  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - (100 / (1 + rs))
}

function calculateEMA(closes: number[], period: number): number {
  if (closes.length < period) return closes[0]

  const multiplier = 2 / (period + 1)
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period

  for (let i = period; i < closes.length; i++) {
    ema = (closes[i] - ema) * multiplier + ema
  }

  return ema
}

function calculateADX(candles: any[], period: number = 14): number {
  if (candles.length < period + 1) return 20 // Default

  // Simplified ADX calculation
  let trSum = 0
  let dmPlusSum = 0
  let dmMinusSum = 0

  for (let i = 1; i < Math.min(period + 1, candles.length); i++) {
    const high = candles[i - 1].high
    const low = candles[i - 1].low
    const prevHigh = candles[i].high
    const prevLow = candles[i].low
    const prevClose = candles[i].close

    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    )

    const dmPlus = Math.max(high - prevHigh, 0)
    const dmMinus = Math.max(prevLow - low, 0)

    trSum += tr
    dmPlusSum += dmPlus
    dmMinusSum += dmMinus
  }

  const diPlus = (dmPlusSum / trSum) * 100
  const diMinus = (dmMinusSum / trSum) * 100
  const dx = Math.abs(diPlus - diMinus) / (diPlus + diMinus) * 100

  return dx || 20
}
