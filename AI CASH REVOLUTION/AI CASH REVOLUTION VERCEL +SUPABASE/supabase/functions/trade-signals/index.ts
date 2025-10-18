/**
 * Trade Signals Function - AI Cash Revolution
 *
 * Funzione sicura per il frontend per recuperare i segnali MT5
 * Risolve l'errore 500 nel chiamate dirette al database dal frontend
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('📨 Trade Signals Request Received:', {
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString()
    })

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          error: 'Missing authorization header',
          message: 'User must be authenticated'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Verify user token
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      console.error('❌ Authentication error:', authError)
      return new Response(
        JSON.stringify({
          error: 'Invalid authentication',
          message: 'User not authenticated'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('✅ User authenticated:', user.email)

    // Get query parameters
    const url = new URL(req.url)
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const symbol = url.searchParams.get('symbol')

    // Build query
    let query = supabase
      .from('mt5_signals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    // Filter by user or system signals
    query = query.or(`user_id.eq.${user.id},user_id.is.null`)

    // Filter by symbol if provided
    if (symbol) {
      query = query.eq('symbol', symbol)
    }

    // Execute query
    const { data: signals, error: selectError } = await query

    if (selectError) {
      console.error('❌ Database query error:', selectError)
      return new Response(
        JSON.stringify({
          error: 'Database query failed',
          message: selectError.message,
          details: selectError
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Log success
    console.log('✅ Trade Signals Retrieved:', {
      count: signals?.length || 0,
      user: user.email,
      timestamp: new Date().toISOString()
    })

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        signals: signals || [],
        count: signals?.length || 0,
        user: user.email,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Trade Signals Function Error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    })

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: 'An unexpected error occurred while fetching trade signals',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})