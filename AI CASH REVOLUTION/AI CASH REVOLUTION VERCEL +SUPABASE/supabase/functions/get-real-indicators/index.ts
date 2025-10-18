// Real Technical Indicators - Wrapper for Python service
// Replaces ALL simulated indicators with 100% real OANDA data

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const OANDA_API_KEY = Deno.env.get('OANDA_API_KEY')!
const OANDA_ACCOUNT_ID = Deno.env.get('OANDA_ACCOUNT_ID')!
const PYTHON_SERVICE_URL = Deno.env.get('PYTHON_INDICATORS_URL') || 'http://localhost:8001'

serve(async (req) => {
  try {
    const { symbol } = await req.json()

    if (!symbol) {
      return new Response(
        JSON.stringify({ error: 'Symbol required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📊 Fetching REAL indicators for ${symbol}...`)

    // Call Python service for real indicator calculation
    const response = await fetch(`${PYTHON_SERVICE_URL}/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol })
    })

    if (!response.ok) {
      throw new Error(`Python service error: ${response.statusText}`)
    }

    const indicators = await response.json()

    if (!indicators.success) {
      throw new Error(indicators.error || 'Failed to calculate indicators')
    }

    console.log(`✅ Real indicators calculated for ${symbol}`)
    console.log(`   Price: ${indicators.current_price.mid}`)
    console.log(`   RSI: ${indicators.oscillators.rsi}`)
    console.log(`   ATR: ${indicators.volatility.atr}`)
    console.log(`   MACD: ${indicators.oscillators.macd}`)

    return new Response(
      JSON.stringify(indicators),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error fetching real indicators:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
