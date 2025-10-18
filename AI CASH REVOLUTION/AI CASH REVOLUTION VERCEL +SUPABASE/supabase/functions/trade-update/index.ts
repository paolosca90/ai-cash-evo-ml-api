/**
 * Trade Update Function - AI Cash Revolution
 *
 * Questa funzione riceve aggiornamenti dall'EA MT5 e li salva nel database
 * Corregge l'errore 404 "Requested function was not found"
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
    console.log('📨 Trade Update Request Received:', {
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString()
    })

    // Parse request body
    let requestData
    try {
      requestData = await req.json()
    } catch (e) {
      console.error('❌ Error parsing JSON:', e)
      return new Response(
        JSON.stringify({
          error: 'Invalid JSON format',
          message: 'Request body must be valid JSON'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('📋 Trade Update Data:', requestData)

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Validate required fields
    const requiredFields = ['signal_id', 'client_id', 'status']
    const missingFields = requiredFields.filter(field => !requestData[field])

    if (missingFields.length > 0) {
      console.error('❌ Missing required fields:', missingFields)
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          missing_fields: missingFields
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Update signal status in database
    const { data: updateData, error: updateError } = await supabase
      .from('mt5_signals')
      .update({
        status: requestData.status,
        executed_at: requestData.executed_at || new Date().toISOString(),
        execution_price: requestData.execution_price,
        actual_sl: requestData.actual_sl,
        actual_tp: requestData.actual_tp,
        commission: requestData.commission,
        swap: requestData.swap,
        profit: requestData.profit,
        comment: requestData.comment,
        mt5_ticket: requestData.mt5_ticket,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestData.signal_id)
      .eq('client_id', requestData.client_id)
      .select()

    if (updateError) {
      console.error('❌ Database update error:', updateError)
      return new Response(
        JSON.stringify({
          error: 'Database update failed',
          message: updateError.message,
          details: updateError
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Also update trades table if trade_id is provided
    if (requestData.trade_id) {
      const { error: tradeUpdateError } = await supabase
        .from('trades')
        .update({
          status: requestData.status,
          exit_price: requestData.execution_price,
          exit_time: requestData.executed_at || new Date().toISOString(),
          profit: requestData.profit,
          commission: requestData.commission,
          swap: requestData.swap,
          comment: requestData.comment,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestData.trade_id)

      if (tradeUpdateError) {
        console.warn('⚠️ Trade table update warning:', tradeUpdateError)
        // Don't fail the request if trades table update fails
      }
    }

    // Log the update for monitoring
    console.log('✅ Trade Update Successful:', {
      signal_id: requestData.signal_id,
      client_id: requestData.client_id,
      status: requestData.status,
      execution_price: requestData.execution_price,
      profit: requestData.profit,
      timestamp: new Date().toISOString()
    })

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Trade update recorded successfully',
        data: {
          signal_id: requestData.signal_id,
          status: requestData.status,
          updated_at: new Date().toISOString()
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Trade Update Function Error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    })

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: 'An unexpected error occurred while processing trade update',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})