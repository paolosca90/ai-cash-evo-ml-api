/* eslint-disable @typescript-eslint/no-explicit-any */
// Auto OANDA Trader V4 - WITH SIGNAL WEIGHT FILTERING
// CONTINUOUS LEARNING: Generates random trades, executes on OANDA, saves for ML training
// NEW: Only trades signals with weight >= 70 (100% win rate from backtest)
// @ts-expect-error - Remote module provided by Deno runtime
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-expect-error - Supabase client fetched via esm.sh in Edge runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { calculateSignalWeight } from '../_shared/signalWeightCalculator.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const OANDA_API_KEY = Deno.env.get('OANDA_API_KEY')!
const OANDA_ACCOUNT_ID = Deno.env.get('OANDA_ACCOUNT_ID')!

// Weight filtering threshold (based on backtest: 100% win rate at >= 70)
const MIN_WEIGHT_THRESHOLD = 70.0

// All available symbols
const ALL_SYMBOLS = [
  // Major pairs
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF',
  // Minor pairs
  'AUDUSD', 'USDCAD', 'NZDUSD', 'EURGBP', 'EURJPY', 'GBPJPY',
  // Metals
  'XAUUSD', 'XAGUSD'
]

interface AutoTradeConfig {
  mode: 'single' | 'continuous'
  durationMinutes?: number
  minIntervalSeconds?: number
  maxIntervalSeconds?: number
  minWeightThreshold?: number  // Override default threshold
  skipWeightFilter?: boolean    // For testing: disable weight filter
}

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // 🛡️ SAFETY CHECK: Verify auto-trading is enabled in configuration
    const { data: autoConfig, error: configError } = await supabase
      .from('auto_trading_config')
      .select('enabled, mode, trades_today, daily_pnl')
      .single()

    if (configError || !autoConfig) {
      console.error('❌ Unable to fetch auto-trading configuration:', configError?.message)
      return new Response(
        JSON.stringify({
          error: 'Auto-trading configuration not found',
          success: false,
          reason: 'Configuration missing'
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!autoConfig.enabled) {
      console.log('❌ Auto-trading is DISABLED in configuration')
      console.log(`   Status: enabled=${autoConfig.enabled}`)
      console.log(`   Current trades today: ${autoConfig.trades_today}`)
      console.log('   🛡️ Safety check: Blocking auto-trading execution')
      return new Response(
        JSON.stringify({
          error: 'Auto-trading is currently disabled',
          success: false,
          reason: 'Auto-trading disabled in configuration',
          currentConfig: autoConfig
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Auto-trading is ENABLED - Proceeding with execution')
    console.log(`   Current stats: ${autoConfig.trades_today} trades today, PnL: ${autoConfig.daily_pnl}`)

    const config: AutoTradeConfig = await req.json()
    const {
      mode = 'single',
      durationMinutes = 60,
      minIntervalSeconds = 600,  // 10 min
      maxIntervalSeconds = 1800,  // 30 min
      minWeightThreshold = MIN_WEIGHT_THRESHOLD,
      skipWeightFilter = false
    } = config

    console.log('🚀 Auto OANDA Trader V4 Started')
    console.log(`   Mode: ${mode}`)
    console.log(`   Weight Threshold: ${minWeightThreshold} (${skipWeightFilter ? 'DISABLED' : 'ENABLED'})`)
    console.log('---')

    const results = []
    let skippedLowWeight = 0

    if (mode === 'single') {
      // Single trade
      const result = await executeSingleTrade(supabase, minWeightThreshold, skipWeightFilter)
      if (result.skipped && result.reason?.includes('weight')) {
        skippedLowWeight++
      }
      results.push(result)

    } else if (mode === 'continuous') {
      // Continuous trading
      const endTime = Date.now() + (durationMinutes * 60 * 1000)

      while (Date.now() < endTime) {
        const result = await executeSingleTrade(supabase, minWeightThreshold, skipWeightFilter)
        if (result.skipped && result.reason?.includes('weight')) {
          skippedLowWeight++
        }
        results.push(result)

        // Random interval
        const waitSeconds = minIntervalSeconds + Math.floor(Math.random() * (maxIntervalSeconds - minIntervalSeconds))
        console.log(`⏳ Next trade in ${waitSeconds}s (${Math.round(waitSeconds/60)} min)`)

        await sleep(waitSeconds * 1000)
      }
    }

    const successfulTrades = results.filter(r => r.success).length
    const totalAttempts = results.length

    return new Response(
      JSON.stringify({
        success: true,
        mode,
        totalAttempts,
        successfulTrades,
        skippedLowWeight,
        executionRate: `${((successfulTrades / totalAttempts) * 100).toFixed(1)}%`,
        weightThreshold: minWeightThreshold,
        results
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Auto trader error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

// Execute a single trade with weight filtering
async function executeSingleTrade(
  supabase: any,
  minWeightThreshold: number,
  skipWeightFilter: boolean
) {
  try {
    // 1. Select random symbol
    const symbol = ALL_SYMBOLS[Math.floor(Math.random() * ALL_SYMBOLS.length)]
    console.log(`\n📊 Attempting trade for ${symbol}...`)

    // 2. Generate signal (always BUY or SELL, never HOLD)
    const signal = await generateSignal(symbol)

    if (!signal || !signal.type) {
      console.log(`   ${symbol}: Invalid signal - skipped`)
      return { success: false, skipped: true, symbol, reason: 'Invalid signal' }
    }

    // System should always generate BUY or SELL
    if (signal.type === 'HOLD') {
      console.warn(`   ⚠️  ${symbol}: Received HOLD - regenerating...`)
      // Try one more time
      const retrySignal = await generateSignal(symbol)
      if (!retrySignal || retrySignal.type === 'HOLD') {
        return { success: false, skipped: true, symbol, reason: 'HOLD received after retry' }
      }
      Object.assign(signal, retrySignal)
    }

    // 3. Calculate signal weight
    const weightResult = calculateSignalWeight(signal)
    const { total_weight, recommendation, position_size_multiplier, components } = weightResult

    console.log(`   Generated ${signal.type} signal`)
    console.log(`   Confidence: ${signal.confidence}%`)
    console.log(`   Weight: ${total_weight}/100 (${recommendation})`)
    console.log(`   Components: ML=${components.ml_confidence}, Tech=${components.technical_quality}, Market=${components.market_conditions}`)

    // 4. Apply weight filter (unless disabled for testing)
    if (!skipWeightFilter) {
      if (total_weight < minWeightThreshold) {
        console.log(`   ⛔ SKIPPED: Weight ${total_weight} < ${minWeightThreshold} threshold`)
        console.log(`   Backtest shows 100% win rate only at ${minWeightThreshold}+`)

        // Save skipped signal to database for analytics
        await supabase.from('signal_performance').insert({
          symbol,
          signal_type: 'weighted',
          predicted_direction: signal.type,
          confidence: signal.confidence,
          entry_price: signal.entry_price || signal.entryPrice || 0,
          stop_loss: signal.stopLoss || signal.stop_loss,
          take_profit: signal.takeProfit || signal.take_profit,

          // Weight data
          signal_weight: total_weight,
          signal_recommendation: recommendation,
          position_multiplier: position_size_multiplier,
          weight_components: components,

          // Mark as skipped
          ml_recommendation: 'FILTERED_LOW_WEIGHT',
          market_regime: signal.analysis?.regime || 'UNKNOWN',
          session_type: signal.analysis?.session || 'UNKNOWN',

          created_at: new Date().toISOString()
        })

        return {
          success: false,
          skipped: true,
          symbol,
          reason: `Weight ${total_weight} below ${minWeightThreshold} threshold`,
          weight: total_weight,
          recommendation
        }
      }

      // Additional recommendation-based filtering
      if (recommendation === 'AVOID') {
        console.log(`   ⛔ SKIPPED: Recommendation is AVOID (weight ${total_weight})`)
        return {
          success: false,
          skipped: true,
          symbol,
          reason: `Recommendation AVOID (weight ${total_weight})`,
          weight: total_weight,
          recommendation
        }
      }
    }

    // 5. Execute on OANDA
    console.log(`   ✅ Weight filter passed: ${total_weight} >= ${minWeightThreshold}`)
    console.log(`   Executing on OANDA...`)

    const oandaTrade = await executeOANDATrade(signal, position_size_multiplier)

    if (!oandaTrade.success) {
      console.log(`   ${symbol}: OANDA error - ${oandaTrade.error}`)
      return { success: false, skipped: false, symbol, reason: oandaTrade.error, weight: total_weight }
    }

    // 6. Save to database with weight metadata
    const { data, error } = await supabase
      .from('signal_performance')
      .insert({
        symbol,
        signal_type: 'weighted',  // New type for weight-filtered signals
        predicted_direction: signal.type,
        confidence: signal.confidence,
        entry_price: oandaTrade.fillPrice,
        stop_loss: signal.stopLoss || signal.stop_loss,
        take_profit: signal.takeProfit || signal.take_profit,

        // Weight data (NEW)
        signal_weight: total_weight,
        signal_recommendation: recommendation,
        position_multiplier: position_size_multiplier,
        weight_components: components,

        // ML metadata
        ml_action: signal.analysis?.regime || 'UNKNOWN',
        ml_confidence: signal.analysis?.adx || 0,
        agreement: signal.analysis?.choppiness || 0,
        ml_recommendation: recommendation,

        // Context
        market_regime: signal.analysis?.regime || 'UNKNOWN',
        session_type: signal.analysis?.session || 'UNKNOWN',
        volatility_level: signal.analysis?.indicators?.atr_percent > 0.1 ? 'HIGH' : 'MEDIUM',

        // OANDA tracking
        external_trade_id: oandaTrade.tradeId,

        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error(`   DB save error:`, error)
      return { success: false, skipped: false, symbol, reason: 'DB error', weight: total_weight }
    }

    console.log(`   ✅ ${symbol}: ${signal.type} @ ${oandaTrade.fillPrice}`)
    console.log(`      Weight: ${total_weight} (${recommendation})`)
    console.log(`      Position Multiplier: ${position_size_multiplier}x`)
    console.log(`      OANDA Trade ID: ${oandaTrade.tradeId}`)
    console.log(`      DB Signal ID: ${data.id}`)

    // 7. Trigger weight recalc every 10 completed trades
    const { count } = await supabase
      .from('signal_performance')
      .select('id', { count: 'exact', head: true })
      .eq('symbol', symbol)
      .not('win', 'is', null)

    if (count && count % 10 === 0) {
      await supabase.rpc('recalculate_ensemble_weights', { p_symbol: symbol })
      console.log(`      🔄 Weights recalculated for ${symbol} (${count} trades)`)
    }

    return {
      success: true,
      skipped: false,
      symbol,
      signalId: data.id,
      tradeId: oandaTrade.tradeId,
      type: signal.type,
      confidence: signal.confidence,
      weight: total_weight,
      recommendation,
      positionMultiplier: position_size_multiplier
    }

  } catch (error) {
    console.error(`Trade execution error:`, error)
    return { success: false, skipped: false, reason: error.message }
  }
}

// Generate signal using AI Edge Function
async function generateSignal(symbol: string) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-ai-signals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    },
    body: JSON.stringify({ symbol })
  })

  if (!response.ok) {
    console.error(`Signal generation failed: ${response.status} ${response.statusText}`)
    return null
  }

  return await response.json()
}

// Execute trade on OANDA with position sizing
async function executeOANDATrade(signal: any, positionMultiplier: number = 1.0) {
  try {
    const instrument = signal.symbol.includes('_')
      ? signal.symbol
      : `${signal.symbol.slice(0,3)}_${signal.symbol.slice(3)}`

    // Base units: 1000 (0.01 lot)
    // Apply position multiplier (0.25-2.0x)
    const baseUnits = 1000
    const scaledUnits = Math.round(baseUnits * positionMultiplier)
    const units = signal.type === 'BUY' ? scaledUnits : -scaledUnits

    // Price precision (JPY = 3 decimals, others = 5)
    const isJPYPair = instrument.includes('JPY')
    const decimals = isJPYPair ? 3 : 5
    const formatPrice = (price: number) => parseFloat(price.toFixed(decimals))

    const orderData = {
      order: {
        type: 'MARKET',
        instrument,
        units: units.toString(),
        stopLossOnFill: {
          price: formatPrice(signal.stopLoss || signal.stop_loss).toString()
        },
        takeProfitOnFill: {
          price: formatPrice(signal.takeProfit || signal.take_profit).toString()
        },
        timeInForce: 'FOK'
      }
    }

    console.log(`      Position size: ${Math.abs(units)} units (${positionMultiplier}x multiplier)`)

    const response = await fetch(
      `https://api-fxpractice.oanda.com/v3/accounts/${OANDA_ACCOUNT_ID}/orders`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OANDA_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        error: `OANDA ${response.status}: ${errorText}`
      }
    }

    const data = await response.json()

    return {
      success: true,
      tradeId: data.orderFillTransaction?.tradeOpened?.tradeID ||
               data.orderFillTransaction?.id,
      fillPrice: parseFloat(data.orderFillTransaction?.price || signal.entry_price || signal.entryPrice),
      units: Math.abs(units)
    }

  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
