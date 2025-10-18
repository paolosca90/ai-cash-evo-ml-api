/**
 * Debug function to check mt5_signals table data
 * This helps diagnose why entry price shows as N/A
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
      } 
    })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get latest 10 signals
    const { data: signals, error } = await supabase
      .from('mt5_signals')
      .select('id, symbol, signal, entry, confidence, created_at, client_id')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    // Analyze the data
    const analysis = {
      totalSignals: signals?.length || 0,
      signalsWithEntry: signals?.filter(s => s.entry !== null && s.entry !== undefined).length || 0,
      signalsWithoutEntry: signals?.filter(s => s.entry === null || s.entry === undefined).length || 0,
      sampleSignals: signals?.slice(0, 3).map(s => ({
        id: s.id,
        symbol: s.symbol,
        signal: s.signal,
        entry: s.entry,
        entryType: typeof s.entry,
        entryIsNull: s.entry === null,
        entryIsUndefined: s.entry === undefined,
        confidence: s.confidence,
        created_at: s.created_at
      })),
      allSignals: signals
    }

    console.log('=== MT5_SIGNALS DEBUG ===')
    console.log(`Total signals: ${analysis.totalSignals}`)
    console.log(`Signals WITH entry: ${analysis.signalsWithEntry}`)
    console.log(`Signals WITHOUT entry: ${analysis.signalsWithoutEntry}`)
    console.log('Sample signals:', JSON.stringify(analysis.sampleSignals, null, 2))

    return new Response(
      JSON.stringify(analysis, null, 2),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack 
      }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  }
})
