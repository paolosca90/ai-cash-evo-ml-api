/**
 * Notify Signal Function - AI Cash Revolution
 *
 * Funzione real-time per notificare immediatamente l'EA MT5 quando un nuovo segnale viene creato
 * Chiama l'EA MT5 via webhook per consegna immediata del segnale
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
    console.log('📨 Notify Signal Request Received:', {
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString()
    })

    // Parse request body
    const requestData = await req.json()
    console.log('📋 Signal Data:', requestData)

    const { signal_id, client_id, symbol, signal, entry, stop_loss, take_profit, confidence } = requestData

    if (!signal_id || !client_id) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          required: ['signal_id', 'client_id']
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get signal details
    const { data: signalData, error: signalError } = await supabase
      .from('mt5_signals')
      .select('*')
      .eq('id', signal_id)
      .eq('client_id', client_id)
      .single()

    if (signalError || !signalData) {
      console.error('❌ Signal not found:', signalError)
      return new Response(
        JSON.stringify({
          error: 'Signal not found',
          message: 'Invalid signal_id or client_id'
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('✅ Signal found:', signalData)

    // Prepare MT5 signal payload
    const mt5Payload = {
      id: signalData.id,
      symbol: signalData.symbol,
      action: signalData.signal,
      entry: signalData.entry,
      entry_price: signalData.entry,
      stopLoss: signalData.stop_loss || 0.0,
      takeProfit: signalData.take_profit || 0.0,
      stop_loss: signalData.stop_loss || 0.0,
      take_profit: signalData.take_profit || 0.0,
      sl: signalData.stop_loss || 0.0,
      tp: signalData.take_profit || 0.0,
      confidence: signalData.confidence || null,
      risk_amount: signalData.risk_amount || 0,
      riskAmount: signalData.risk_amount || 0,
      timestamp: signalData.timestamp || signalData.created_at,
      // String versions for MQL5 parser
      entry_str: String(signalData.entry),
      stop_loss_str: signalData.stop_loss ? String(signalData.stop_loss) : "0.0",
      take_profit_str: signalData.take_profit ? String(signalData.take_profit) : "0.0",
      sl_str: signalData.stop_loss ? String(signalData.stop_loss) : "0.0",
      tp_str: signalData.take_profit ? String(signalData.take_profit) : "0.0",
    }

    // NOTIFICA IMMEDIATA EA MT5 TRAMITE WEBHOOK
    let eaNotified = false
    let eaResponse = null

    try {
      // Try to notify EA via webhook (if EA has webhook endpoint)
      const eaWebhookUrl = `http://localhost:8080/signal` // Default EA webhook endpoint

      console.log('📡 Notifying EA MT5 immediately:', {
        signal_id: signalData.id,
        symbol: signalData.symbol,
        action: signalData.signal,
        entry: signalData.entry
      })

      const webhookResponse = await fetch(eaWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Signal-Source': 'AI-Cash-Revolution',
          'X-Signal-ID': signalData.id
        },
        body: JSON.stringify(mt5Payload),
        signal: AbortSignal.timeout(5000) // 5 second timeout
      })

      if (webhookResponse.ok) {
        eaResponse = await webhookResponse.text()
        eaNotified = true
        console.log('✅ EA MT5 notified immediately:', eaResponse)
      } else {
        console.warn('⚠️ EA webhook responded:', webhookResponse.status, webhookResponse.statusText)
      }

    } catch (eaError) {
      console.warn('⚠️ EA webhook notification failed:', eaError.message)
      // EA might not be running or webhook not configured - this is OK
    }

    // Aggiorna stato del segnale
    const updateData: any = {
      ea_notified: eaNotified,
      ea_notification_time: new Date().toISOString(),
      ea_response: eaResponse
    }

    if (eaNotified) {
      updateData.sent = true
      updateData.sent_at = new Date().toISOString()
    }

    const { error: updateError } = await supabase
      .from('mt5_signals')
      .update(updateData)
      .eq('id', signal_id)

    if (updateError) {
      console.error('❌ Error updating signal status:', updateError)
    }

    // Crea notifica real-time via Supabase Realtime
    try {
      const realtimePayload = {
        type: 'signal_created',
        signal: mt5Payload,
        client_id: client_id,
        timestamp: new Date().toISOString(),
        ea_notified: eaNotified
      }

      // Trigger realtime event
      console.log('📡 Broadcasting real-time signal:', realtimePayload)

      // This would typically trigger via database trigger or realtime subscription
      // For now, we'll log it for the EA to poll

    } catch (realtimeError) {
      console.warn('⚠️ Realtime notification failed:', realtimeError.message)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Signal processed for immediate delivery',
        signal_id: signal_id,
        client_id: client_id,
        symbol: signalData.symbol,
        action: signalData.signal,
        ea_notified: eaNotified,
        ea_response: eaResponse,
        timestamp: new Date().toISOString(),
        mt5_payload: mt5Payload
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Notify Signal Function Error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    })

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: 'Failed to process signal notification',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})