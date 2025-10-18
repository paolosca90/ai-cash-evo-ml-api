import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-user-email",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

interface TradeRequest {
  symbol: string;
  action: "BUY" | "SELL";
  entry: number;
  stopLoss: number;
  takeProfit: number;
  riskAmountEUR: number;
  eurusdRate: number;
  confidence?: number;
}

function calculateVolume(
  symbol: string,
  entry: number,
  stopLoss: number,
  riskAmountEUR: number,
  eurusdRate: number
): number {
    const slDistancePips = Math.abs(entry - stopLoss);

    const pipValue = symbol.includes("XAU") || symbol.includes("GOLD") ? 0.01 : 0.0001;
  const slDistanceInPips = slDistancePips / pipValue;

    const dollarPerPipPerLot = 10;

    const riskAmountUSD = riskAmountEUR * eurusdRate;

    const volume = riskAmountUSD / (slDistanceInPips * dollarPerPipPerLot);

    return Math.max(0.01, Math.round(volume * 100) / 100);
}

async function getUserIdByEmail(email: string): Promise<string | null> {
  const knownUsers: Record<string, string> = {
    "paoloscardia@gmail.com": "28756d59-415a-4bef-abeb-6ea3821603bc",
  };

  if (knownUsers[email]) {
    return knownUsers[email];
  }

  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
        const email = req.headers.get("x-user-email")?.trim();
    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: "Email mancante" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = await getUserIdByEmail(email);
    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: "Utente non autorizzato" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

        const tradeRequest: TradeRequest = await req.json();

        if (!tradeRequest.symbol || !tradeRequest.action || !tradeRequest.entry ||
        !tradeRequest.stopLoss || !tradeRequest.takeProfit || !tradeRequest.riskAmountEUR) {
      return new Response(
        JSON.stringify({ success: false, error: "Parametri mancanti" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("📊 Calcolo lottaggio per trade:");
    console.log(`  Symbol: ${tradeRequest.symbol}`);
    console.log(`  Entry: ${tradeRequest.entry}`);
    console.log(`  Stop Loss: ${tradeRequest.stopLoss}`);
    console.log(`  Rischio EUR: ${tradeRequest.riskAmountEUR}`);

        const volume = calculateVolume(
      tradeRequest.symbol,
      tradeRequest.entry,
      tradeRequest.stopLoss,
      tradeRequest.riskAmountEUR,
      tradeRequest.eurusdRate
    );

    console.log(`  ✅ Volume calcolato: ${volume} lotti`);

        const { data: inserted, error: insertErr } = await supabase
      .from("mt5_signals")
      .insert({
        client_id: email.toLowerCase(),
        user_id: userId,
        symbol: tradeRequest.symbol,
        signal: tradeRequest.action,
        entry: tradeRequest.entry,
        stop_loss: tradeRequest.stopLoss,
        take_profit: tradeRequest.takeProfit,
        volume: volume,
        risk_amount: tradeRequest.riskAmountEUR,
        eurusd_rate: tradeRequest.eurusdRate,
        confidence: tradeRequest.confidence ?? null,
        timestamp: new Date().toISOString(),
        sent: false,
        processed: false,
      })
      .select("id")
      .single();

    if (insertErr) {
      console.error("❌ Errore salvataggio:", insertErr);
      throw new Error(insertErr.message);
    }

    console.log(`✅ Trade salvato con ID: ${inserted.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        signal_id: inserted.id,
        volume: volume,
        message: "Trade pronto per l'esecuzione",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Errore:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
