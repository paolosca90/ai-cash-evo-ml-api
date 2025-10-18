
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-email',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('💓 Heartbeat Request Received:', {
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString()
    })

      let requestData = {}
    try {
      requestData = await req.json()
    } catch (e) {
        requestData = {}
    }

    console.log('💓 Heartbeat Data:', requestData)

    // Get client email from headers or request data
    const headerEmail = req.headers.get("x-user-email")?.trim()
    const queryEmail = new URL(req.url).searchParams.get("email")?.trim()
    const email = headerEmail || queryEmail || requestData.email || 'unknown'

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Log heartbeat for monitoring
    const heartbeatData = {
      client_email: email,
      timestamp: new Date().toISOString(),
      user_agent: req.headers.get('user-agent'),
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      method: req.method,
      ...requestData
    }

    console.log('💓 Heartbeat Logged:', heartbeatData)

    // Optional: Store heartbeat in database for monitoring
    try {
      const { error: logError } = await supabase
        .from('ea_heartbeats')
        .insert({
          client_email: email,
          heartbeat_data: heartbeatData,
          created_at: new Date().toISOString()
        })

      if (logError) {
        console.warn('⚠️ Heartbeat log warning (table might not exist):', logError.message)
        // Don't fail the request if table doesn't exist
      }
    } catch (e) {
      console.warn('⚠️ Heartbeat database logging failed:', e.message)
      // Don't fail the request
    }

    // Check for any pending signals or updates for this client
    try {
      const { data: signals, error: signalsError } = await supabase
        .from('mt5_signals')
        .select('id, symbol, signal, entry, status')
        .eq('client_id', email)
        .eq('sent', false)
        .order('created_at', { ascending: true })
        .limit(5)

      if (!signalsError && signals && signals.length > 0) {
        console.log(`💓 Found ${signals.length} pending signals for ${email}`)
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Heartbeat received',
          timestamp: new Date().toISOString(),
          client_email: email,
          pending_signals: signals?.length || 0,
          signals: signals || [],
          status: 'healthy'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )

    } catch (e) {
      console.warn('⚠️ Signal check failed:', e.message)

      // Return basic heartbeat response
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Heartbeat received',
          timestamp: new Date().toISOString(),
          client_email: email,
          pending_signals: 0,
          signals: [],
          status: 'healthy'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

  } catch (error) {
    console.error('❌ Heartbeat Function Error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    })

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: 'Heartbeat failed',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})