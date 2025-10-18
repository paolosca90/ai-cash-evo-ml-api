/* eslint-disable @typescript-eslint/no-explicit-any */
// Execute OANDA Trade - Esegue trade su conto OANDA demo
// Sistema completo di auto-trading con tracking
// @ts-expect-error - Remote module provided by Deno runtime
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-expect-error - Supabase client fetched via esm.sh in Edge runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const OANDA_API_KEY = Deno.env.get('OANDA_API_KEY')!
const OANDA_ACCOUNT_ID = Deno.env.get('OANDA_ACCOUNT_ID')!

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const { symbol } = await req.json()

    console.log(`🚀 Executing auto-trade for ${symbol}`)

    // 1. Genera segnale ensemble
    const signal = await generateSignal(symbol)

    if (!signal || signal.type === 'HOLD') {
      return new Response(
        JSON.stringify({ success: false, reason: 'HOLD signal, no trade' }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 2. Esegui trade su OANDA
    const oandaTrade = await executeOANDATrade(signal)

    if (!oandaTrade.success) {
      return new Response(
        JSON.stringify({ success: false, error: oandaTrade.error }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 3. Salva in DB per tracking
    const { data: savedSignal, error } = await supabase
      .from('signal_performance')
      .insert({
        symbol,
        signal_type: 'ensemble',
        predicted_direction: signal.type,
        confidence: signal.confidence,
        entry_price: oandaTrade.fillPrice,
        stop_loss: signal.stopLoss,
        take_profit: signal.takeProfit,

        // ML metadata
        ml_action: signal.mlMetadata?.mlAction,
        ml_confidence: signal.mlMetadata?.mlConfidence,
        agreement: signal.mlMetadata?.agreement,
        ml_recommendation: signal.mlMetadata?.mlRecommendation,

        // Context
        market_regime: signal.mlMetadata?.marketRegime,
        session_type: signal.mlMetadata?.sessionType,
        volatility_level: signal.mlMetadata?.volatility > 2 ? 'HIGH' : 'MEDIUM',

        // OANDA trade ID
        external_trade_id: oandaTrade.tradeId,

        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('DB save error:', error)
    }

    console.log(`✅ Trade executed: ${signal.type} ${symbol} @ ${oandaTrade.fillPrice}`)
    console.log(`   OANDA Trade ID: ${oandaTrade.tradeId}`)
    console.log(`   DB Signal ID: ${savedSignal?.id}`)

    return new Response(
      JSON.stringify({
        success: true,
        signal: {
          id: savedSignal?.id,
          type: signal.type,
          symbol,
          confidence: signal.confidence
        },
        oandaTrade: {
          tradeId: oandaTrade.tradeId,
          fillPrice: oandaTrade.fillPrice,
          units: oandaTrade.units
        }
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Execute trade error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

// Genera segnale
async function generateSignal(symbol: string) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-ai-signals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    },
    body: JSON.stringify({ symbol })
  })

  if (!response.ok) return null
  return await response.json()
}

// Esegui trade su OANDA
async function executeOANDATrade(signal: any) {
  try {
    const instrument = signal.symbol.includes('_') ? signal.symbol : `${signal.symbol.slice(0,3)}_${signal.symbol.slice(3)}`

    // Calculate units (0.01 lot = 1000 units for forex)
    const units = signal.type === 'BUY' ? 1000 : -1000

    // Create order
    const orderData = {
      order: {
        type: 'MARKET',
        instrument,
        units: units.toString(),
        stopLossOnFill: {
          price: signal.stopLoss.toString()
        },
        takeProfitOnFill: {
          price: signal.takeProfit.toString()
        },
        timeInForce: 'FOK' // Fill or Kill
      }
    }

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
        error: `OANDA error: ${response.status} - ${errorText}`
      }
    }

    const data = await response.json()

    return {
      success: true,
      tradeId: data.orderFillTransaction?.tradeOpened?.tradeID ||
               data.orderFillTransaction?.id,
      fillPrice: parseFloat(data.orderFillTransaction?.price || signal.entryPrice),
      units: Math.abs(units)
    }

  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}
