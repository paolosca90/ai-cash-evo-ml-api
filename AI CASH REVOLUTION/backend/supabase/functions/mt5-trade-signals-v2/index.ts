
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-email',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
};

async function getUserIdByEmail(email: string): Promise<string | null> {
  try {
    const { data: authData, error: authError } = await supabase.auth.admin.getUserByEmail(email.toLowerCase());

    if (!authError && authData?.user) {
      return authData.user.id;
    }

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (profileError) {
      console.warn(`User not found for email: ${email} - will use null`);
      return null;
    }

    return profileData.id;
  } catch (error) {
    console.warn(`Error finding user for email ${email}: ${error.message}`);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

        if (req.method === 'GET') {
      const email = url.searchParams.get('email') || req.headers.get('x-user-email');

      if (!email) {
        return new Response(
          JSON.stringify({ error: 'Email required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`📡 [GET] EA polling for signals: ${email}`);

      const { data: signals, error: selectError } = await supabase
        .from('mt5_signals')
        .select('*')
        .eq('client_id', email.toLowerCase())
        .eq('sent', false)
        .order('created_at', { ascending: true });

      if (selectError) {
        throw new Error(`Select error: ${selectError.message}`);
      }

      if (!signals || signals.length === 0) {
        console.log(`✅ [GET] No new signals for ${email}`);
        return new Response(
          JSON.stringify({ success: true, count: 0, signals: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`📊 [GET] Found ${signals.length} signals for ${email}`);

      const signalIds = signals.map(s => s.id);
      const { error: updateError } = await supabase
        .from('mt5_signals')
        .update({ sent: true })
        .in('id', signalIds);

      if (updateError) {
        console.error(`⚠️ Failed to mark signals as sent: ${updateError.message}`);
      } else {
        console.log(`✅ [GET] Marked ${signalIds.length} signals as sent=true`);
      }

      const formattedSignals = signals.map(s => ({
        id: s.id,
        symbol: s.symbol,
        signal: s.signal || s.type,
        action: s.signal || s.type,
        entry: s.entry,
        entry_price: s.entry,
        stop_loss: s.stop_loss,
        stopLoss: s.stop_loss,
        sl: s.stop_loss,
        take_profit: s.take_profit,
        takeProfit: s.take_profit,
        tp: s.take_profit,
        confidence: s.confidence,
        risk_amount: s.risk_amount,
        eurusd_rate: s.eurusd_rate,
        timestamp: s.created_at,
        entry_str: String(s.entry),
        stop_loss_str: s.stop_loss ? String(s.stop_loss) : '0',
        take_profit_str: s.take_profit ? String(s.take_profit) : '0',
      }));

      return new Response(
        JSON.stringify({
          success: true,
          count: formattedSignals.length,
          signals: formattedSignals
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

      if (req.method === 'POST') {
      const email = url.searchParams.get('email') || req.headers.get('x-user-email');

      if (!email) {
        return new Response(
          JSON.stringify({ error: 'Email required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await req.json();
      const { symbol, signal, entry, stopLoss, takeProfit, confidence, riskAmount, eurusdRate } = body;

      if (!symbol || !signal || !entry) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: symbol, signal, entry' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`📥 [POST] New signal from ${email}: ${signal} ${symbol} @ ${entry}`);

      const userId = await getUserIdByEmail(email);

      const { data: inserted, error: insertError } = await supabase
        .from('mt5_signals')
        .insert({
          client_id: email.toLowerCase(),
          user_id: userId,
          symbol: symbol.toUpperCase(),
          signal: signal.toUpperCase(),
          entry: Number(entry),
          stop_loss: stopLoss ? Number(stopLoss) : null,
          take_profit: takeProfit ? Number(takeProfit) : null,
          confidence: confidence ? Number(confidence) : null,
          risk_amount: riskAmount ? Number(riskAmount) : null,
          eurusd_rate: eurusdRate ? Number(eurusdRate) : null,
          sent: false,
          processed: false,
          created_at: new Date().toISOString(),
          timestamp: new Date().toISOString()
        })
        .select('id')
        .single();

      if (insertError) {
        throw new Error(`Insert error: ${insertError.message}`);
      }

      console.log(`✅ [POST] Signal saved: ${inserted.id} (sent=false, ready for EA)`);

      return new Response(
        JSON.stringify({
          success: true,
          signal_id: inserted.id,
          message: 'Signal saved and ready for EA pickup'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

        if (req.method === 'PATCH') {
      const pathParts = url.pathname.split('/');
      const signalId = pathParts[pathParts.length - 1];

      if (!signalId || signalId === 'mt5-trade-signals-v2') {
        return new Response(
          JSON.stringify({ error: 'Signal ID required in URL path' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`✅ [PATCH] Marking signal as processed: ${signalId}`);

      const { error: updateError } = await supabase
        .from('mt5_signals')
        .update({ processed: true })
        .eq('id', signalId);

      if (updateError) {
        throw new Error(`Update error: ${updateError.message}`);
      }

      console.log(`✅ [PATCH] Signal ${signalId} marked as processed=true`);

      return new Response(
        JSON.stringify({ success: true, message: 'Signal marked as processed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
