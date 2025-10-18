/* eslint-disable @typescript-eslint/no-explicit-any */
// Auto Result Updater - Aggiorna automaticamente i risultati dei segnali
// Controlla se SL/TP sono stati raggiunti e aggiorna signal_performance
// @ts-expect-error - Remote module provided by Deno runtime
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-expect-error - Supabase client fetched via esm.sh in Edge runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const OANDA_API_KEY = Deno.env.get('OANDA_API_KEY')!

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    console.log(`🔄 Auto Result Updater - ${new Date().toISOString()}`)

    // 1. Get pending signals (no result yet, created < 1 hour ago)
    const { data: pendingSignals, error } = await supabase
      .from('signal_performance')
      .select('*')
      .is('win', null)
      .gt('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })

    if (error || !pendingSignals || pendingSignals.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No pending signals to update',
          updatedCount: 0
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📊 Found ${pendingSignals.length} pending signals`)

    const updates = []

    for (const signal of pendingSignals) {
      try {
        // Get current market price
        const currentPrice = await getCurrentPrice(signal.symbol)

        if (!currentPrice) {
          console.log(`   ⏭️  ${signal.symbol}: No price data, skipping`)
          continue
        }

        // Check if SL or TP hit
        const result = evaluateSignal(signal, currentPrice)

        if (!result.shouldUpdate) {
          continue // Still open
        }

        // Update signal with result
        const { error: updateError } = await supabase
          .from('signal_performance')
          .update({
            actual_result: result.pnl,
            actual_direction: result.direction,
            win: result.win,
            result_timestamp: new Date().toISOString()
          })
          .eq('id', signal.id)

        if (updateError) {
          console.error(`   ❌ ${signal.symbol}: Update error - ${updateError.message}`)
          continue
        }

        console.log(`   ✅ ${signal.symbol}: ${result.win ? 'WIN' : 'LOSS'} (${result.pnl} pips)`)

        updates.push({
          signalId: signal.id,
          symbol: signal.symbol,
          result: result.win ? 'WIN' : 'LOSS',
          pnl: result.pnl
        })

        // Trigger weight recalculation se necessario
        const { data: signalCount } = await supabase
          .from('signal_performance')
          .select('id', { count: 'exact', head: true })
          .eq('symbol', signal.symbol)
          .not('win', 'is', null)

        if (signalCount && signalCount.count % 10 === 0) {
          // Every 10 completed trades, recalculate
          await supabase.rpc('recalculate_ensemble_weights', { p_symbol: signal.symbol })
          console.log(`   🔄 ${signal.symbol}: Weights recalculated`)
        }

      } catch (error) {
        console.error(`   ❌ ${signal.symbol}: ${error.message}`)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        updatedCount: updates.length,
        totalPending: pendingSignals.length,
        updates
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Auto result updater error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

// Get current price from OANDA
async function getCurrentPrice(symbol: string): Promise<number | null> {
  try {
    const instrument = symbol.includes('_') ? symbol : `${symbol.slice(0,3)}_${symbol.slice(3)}`

    const response = await fetch(
      `https://api-fxpractice.oanda.com/v3/instruments/${instrument}/candles?count=1&granularity=M1`,
      {
        headers: {
          'Authorization': `Bearer ${OANDA_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) return null

    const data = await response.json()
    if (!data.candles || data.candles.length === 0) return null

    const candle = data.candles[0]
    return parseFloat(candle.mid.c) // Close price

  } catch (error) {
    console.error(`Price fetch error for ${symbol}:`, error)
    return null
  }
}

// Evaluate if signal should be closed
function evaluateSignal(signal: any, currentPrice: number) {
  const entryPrice = signal.entry_price
  const stopLoss = signal.stop_loss
  const takeProfit = signal.take_profit
  const direction = signal.predicted_direction // BUY or SELL

  const pipSize = signal.symbol.includes('JPY') ? 0.01 : 0.0001

  let shouldUpdate = false
  let pnl = 0
  let win = false
  let exitPrice = currentPrice
  let resultDirection = direction

  if (direction === 'BUY') {
    // Check if hit stop loss
    if (currentPrice <= stopLoss) {
      shouldUpdate = true
      exitPrice = stopLoss
      pnl = (stopLoss - entryPrice) / pipSize
      win = false
      resultDirection = 'SELL'
    }
    // Check if hit take profit
    else if (currentPrice >= takeProfit) {
      shouldUpdate = true
      exitPrice = takeProfit
      pnl = (takeProfit - entryPrice) / pipSize
      win = true
      resultDirection = 'BUY'
    }
  } else { // SELL
    // Check if hit stop loss
    if (currentPrice >= stopLoss) {
      shouldUpdate = true
      exitPrice = stopLoss
      pnl = (entryPrice - stopLoss) / pipSize
      win = false
      resultDirection = 'BUY'
    }
    // Check if hit take profit
    else if (currentPrice <= takeProfit) {
      shouldUpdate = true
      exitPrice = takeProfit
      pnl = (entryPrice - takeProfit) / pipSize
      win = true
      resultDirection = 'SELL'
    }
  }

  return {
    shouldUpdate,
    win,
    pnl: Math.round(pnl * 100) / 100,
    direction: resultDirection,
    exitPrice
  }
}
