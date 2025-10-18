/* eslint-disable @typescript-eslint/no-explicit-any */
// Auto Signal Generator - Genera segnali automatici con intervalli irregolari
// Sistema di continuous learning e auto-miglioramento
// @ts-expect-error - Remote module provided by Deno runtime
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-expect-error - Supabase client fetched via esm.sh in Edge runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Lista completa di simboli
const MAJOR_PAIRS = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF']
const MINOR_PAIRS = ['AUDUSD', 'USDCAD', 'NZDUSD', 'EURGBP', 'EURJPY', 'GBPJPY', 'EURCHF', 'AUDJPY']
const METALS = ['XAUUSD', 'XAGUSD']

const ALL_SYMBOLS = [...MAJOR_PAIRS, ...MINOR_PAIRS, ...METALS]

interface GenerationConfig {
  minIntervalSeconds: number  // Min intervallo tra segnali
  maxIntervalSeconds: number  // Max intervallo tra segnali
  symbolsPerBatch: number     // Quanti simboli generare per batch
  mode: 'single' | 'continuous' // Single run o continuous loop
  durationMinutes?: number    // Se continuous, per quanto tempo
}

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const config: GenerationConfig = await req.json()

    const {
      minIntervalSeconds = 300,    // Default 5 min
      maxIntervalSeconds = 1800,   // Default 30 min
      symbolsPerBatch = 3,         // Default 3 simboli per batch
      mode = 'single',
      durationMinutes = 60
    } = config

    console.log(`🚀 Auto Signal Generator Started`)
    console.log(`Mode: ${mode}`)
    console.log(`Interval: ${minIntervalSeconds}-${maxIntervalSeconds}s`)
    console.log(`Symbols per batch: ${symbolsPerBatch}`)
    console.log(`---`)

    const results = []

    if (mode === 'single') {
      // Genera un batch di segnali
      const batchResults = await generateSignalBatch(supabase, symbolsPerBatch)
      results.push(...batchResults)

    } else if (mode === 'continuous') {
      // Continuous generation per X minuti
      const endTime = Date.now() + (durationMinutes * 60 * 1000)

      while (Date.now() < endTime) {
        // Genera batch
        const batchResults = await generateSignalBatch(supabase, symbolsPerBatch)
        results.push(...batchResults)

        // Intervallo random
        const waitTime = getRandomInterval(minIntervalSeconds, maxIntervalSeconds)
        console.log(`⏳ Waiting ${waitTime}s before next batch...`)
        await sleep(waitTime * 1000)
      }

      console.log(`✅ Continuous generation completed after ${durationMinutes} minutes`)
    }

    // Ricalcola weights per tutti i simboli toccati
    const uniqueSymbols = [...new Set(results.map(r => r.symbol))]
    for (const symbol of uniqueSymbols) {
      await supabase.rpc('recalculate_ensemble_weights', { p_symbol: symbol })
    }

    return new Response(
      JSON.stringify({
        success: true,
        mode,
        totalSignals: results.length,
        uniqueSymbols: uniqueSymbols.length,
        breakdown: uniqueSymbols.map(s => ({
          symbol: s,
          signals: results.filter(r => r.symbol === s).length
        })),
        results
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Auto signal generator error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

// Genera un batch di segnali per N simboli random
async function generateSignalBatch(supabase: any, count: number) {
  const selectedSymbols = selectRandomSymbols(count)
  const results = []

  console.log(`📊 Generating signals for: ${selectedSymbols.join(', ')}`)

  for (const symbol of selectedSymbols) {
    try {
      // Genera segnale
      const signal = await generateSignal(symbol)

      const signalType = signal.type || signal.signal || signal.direction

      if (!signalType || signalType === 'HOLD') {
        console.log(`   ${symbol}: HOLD - skipped`)
        continue
      }

      // Salva in database
      const { data, error} = await supabase.from('signal_performance').insert({
        symbol,
        signal_type: 'ensemble',
        predicted_direction: signalType,
        confidence: signal.confidence,
        entry_price: signal.entry_price || signal.entryPrice || signal.price,
        stop_loss: signal.stop_loss || signal.stopLoss,
        take_profit: signal.take_profit || signal.takeProfit,

        // ML metadata
        ml_action: signal.mlMetadata?.mlAction,
        ml_confidence: signal.mlMetadata?.mlConfidence,
        agreement: signal.mlMetadata?.agreement,
        ml_recommendation: signal.mlMetadata?.mlRecommendation,

        // Context
        market_regime: signal.mlMetadata?.marketRegime,
        session_type: signal.mlMetadata?.sessionType,
        volatility_level: signal.mlMetadata?.volatility > 2 ? 'HIGH' : 'MEDIUM',
        news_impact: 'LOW',

        created_at: new Date().toISOString()
      }).select().single()

      if (error) {
        console.error(`   ${symbol}: Error saving - ${error.message}`)
        continue
      }

      console.log(`   ✅ ${symbol}: ${signal.type} @ ${signal.confidence}% (ID: ${data.id})`)

      results.push({
        symbol,
        signalId: data.id,
        type: signal.type,
        confidence: signal.confidence,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      console.error(`   ❌ ${symbol}: ${error.message}`)
    }
  }

  return results
}

// Genera segnale per un simbolo
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
    throw new Error(`Signal generation failed: ${response.statusText}`)
  }

  return await response.json()
}

// Seleziona N simboli random dalla lista completa
function selectRandomSymbols(count: number): string[] {
  const shuffled = [...ALL_SYMBOLS].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

// Intervallo random tra min e max
function getRandomInterval(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Sleep helper
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
