import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

interface WebhookEvent {
  event_type: string;
  timestamp: string;
  client_id?: string;
  user_email?: string;
  [key: string]: unknown;
}

// Funzione per ottenere user_id dalla email
async function getUserIdFromEmail(email: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (error || !data) {
      console.log(`⚠️ User not found for email: ${email}`);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error('❌ Error finding user by email:', error);
    return null;
  }
}

// Processamento event registration
async function processAccountRegistration(event: WebhookEvent): Promise<void> {
  console.log(`📝 Processing account registration for ${event.user_email}`);
  
  if (!event.user_email) {
    console.log('⚠️ No email provided for account registration');
    return;
  }

  const userId = await getUserIdFromEmail(event.user_email);
  if (!userId) {
    console.log(`⚠️ Cannot register account - user not found: ${event.user_email}`);
    return;
  }

  // Registra account MT5
  const { error } = await supabase
    .from('mt5_accounts')
    .upsert({
      user_id: userId,
      account_number: event.client_id || 'unknown',
      account_name: event.account_name || null,
      server_name: event.server_name || null,
      ea_version: event.ea_version || null,
      last_heartbeat: new Date().toISOString(),
      is_active: true
    });

  if (error) {
    console.error('❌ Error registering MT5 account:', error);
  } else {
    console.log(`✅ MT5 account registered successfully for ${event.user_email}`);
  }
}

// Processamento heartbeat
async function processHeartbeat(event: WebhookEvent): Promise<void> {
  console.log(`💓 Processing heartbeat from ${event.client_id}`);
  
  if (!event.user_email) {
    console.log('⚠️ No email provided for heartbeat');
    return;
  }

  const userId = await getUserIdFromEmail(event.user_email);
  if (!userId) {
    console.log(`⚠️ Cannot process heartbeat - user not found: ${event.user_email}`);
    return;
  }

  // Aggiorna heartbeat
  const { error } = await supabase
    .from('mt5_accounts')
    .update({
      last_heartbeat: new Date().toISOString(),
      is_active: event.is_active !== false
    })
    .eq('user_id', userId);

  if (error) {
    console.error('❌ Error updating heartbeat:', error);
  } else {
    console.log('✅ Heartbeat updated successfully');
  }
}

// Processamento eventi ML generici
async function processMLEvent(event: WebhookEvent): Promise<void> {
  console.log(`🤖 Processing ML event: ${event.event_type}`);
  
  if (!event.user_email) {
    console.log('⚠️ No email provided for ML event');
    return;
  }

  const userId = await getUserIdFromEmail(event.user_email);
  if (!userId) {
    console.log(`⚠️ Cannot process ML event - user not found: ${event.user_email}`);
    return;
  }

  // Salva evento nel log
  const { error } = await supabase
    .from('trade_events_log')
    .insert({
      user_id: userId,
      client_id: event.client_id || 'unknown',
      event_type: event.event_type,
      timestamp: event.timestamp,
      ticket: event.ticket || null,
      symbol: event.symbol || null,
      order_type: event.order_type || null,
      volume: event.volume || null,
      price: event.price || event.entry || null,
      stop_loss: event.stop_loss || event.sl || null,
      take_profit: event.take_profit || event.tp || null,
      profit: event.current_profit || event.final_profit || event.profit || null,
      comment: event.comment || null,
      magic_number: event.magic_number || null,
      raw_data: event
    });

  if (error) {
    console.error('❌ Error saving ML event:', error);
  } else {
    console.log('✅ ML event saved successfully');
  }

  // Invia notifica per eventi importanti
  if (['trade_update', 'trade_closed', 'trade_execution'].includes(event.event_type)) {
    await sendNotification(userId, event);
  }
}

// Invia notifica
async function sendNotification(userId: string, event: WebhookEvent): Promise<void> {
  try {
    let title = 'Aggiornamento Trading';
    let message = `Evento: ${event.event_type}`;
    
    if (event.symbol) {
      title = `${event.symbol} - ${event.event_type}`;
    }
    
    if (event.current_profit || event.final_profit) {
      const profit = event.current_profit || event.final_profit;
      message = `Profitto: €${Number(profit).toFixed(2)}`;
    }

    const { error } = await supabase
      .from('user_notifications')
      .insert({
        user_id: userId,
        type: 'trade_update',
        title: title,
        message: message,
        data: event,
        priority: 'medium',
        read: false
      });

    if (error) {
      console.error('❌ Error sending notification:', error);
    } else {
      console.log('📧 Notification sent successfully');
    }
  } catch (error) {
    console.error('❌ Error in sendNotification:', error);
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log(`📡 Webhook received: ${req.method} ${req.url}`);

  try {
    if (req.method === 'POST') {
      const body = await req.text();
      console.log(`📥 Webhook payload: ${body}`);

      let event: WebhookEvent;
      try {
        event = JSON.parse(body);
      } catch (parseError) {
        console.error('❌ Invalid JSON payload:', parseError);
        return new Response(JSON.stringify({
          error: 'Invalid JSON',
          message: 'Payload must be valid JSON'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Validazione base
      if (!event.event_type || !event.timestamp) {
        return new Response(JSON.stringify({
          error: 'Missing required fields',
          message: 'event_type and timestamp are required'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Processa eventi in base al tipo
      try {
        switch (event.event_type) {
          case 'account_registration':
            await processAccountRegistration(event);
            break;
          
          case 'heartbeat':
            await processHeartbeat(event);
            break;
          
          case 'trade_update':
          case 'trade_closed':
          case 'trade_execution':
          case 'trade_event':
            await processMLEvent(event);
            break;
          
          default:
            console.log(`⚠️ Unknown event type: ${event.event_type}`);
            await processMLEvent(event); // Fallback per eventi sconosciuti
        }

        return new Response(JSON.stringify({
          status: 'success',
          message: `Event ${event.event_type} processed successfully`,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (processingError) {
        console.error('❌ Error processing event:', processingError);
        return new Response(JSON.stringify({
          error: 'Processing failed',
          message: 'Failed to process webhook event'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    if (req.method === 'GET') {
      // Status endpoint
      return new Response(JSON.stringify({
        status: 'online',
        timestamp: new Date().toISOString(),
        version: '2.0.0'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      error: 'Method not allowed',
      message: 'Only GET and POST methods are supported'
    }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: 'An unexpected error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});