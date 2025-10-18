import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?dts";

// CORS headers obbligatori per funzioni chiamate dal web o da EA
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-user-email, accept",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Supabase client con Service Role (necessario per bypassare RLS lato backend)
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

// Tipi minimi per segnali
interface IncomingSignal {
  symbol: string; // es. XAUUSD
  signal: "BUY" | "SELL"; // direzione
  entry: number | { mid?: number; bid?: number; ask?: number; price?: number } | string; // prezzo o oggetto
  stopLoss?: number | string | null; // opzionale ma consigliato
  takeProfit?: number | string | null; // opzionale ma consigliato
  confidence?: number; // 0-100
  riskAmount?: number | string | null; // euro
  timestamp?: string; // ISO
  aiAnalysis?: Record<string, unknown>; // meta opzionale
}

interface MT5SignalPayload {
  id: string;
  symbol: string;
  action: "BUY" | "SELL";
  entry: number;
  stopLoss?: number | null;
  takeProfit?: number | null;
  confidence?: number | null;
  risk_amount?: number | null;
  timestamp: string;
  // duplicati (string) per parser fragili
  entry_str?: string;
  stop_loss_str?: string;
  take_profit_str?: string;
}

// Helpers
async function getUserIdByEmail(email: string): Promise<string | null> {
  try {
    // Usa funzione sicura che abbiamo in DB
    const { data, error } = await supabase.rpc("validate_email_api_key", {
      email_input: email,
    });
    if (error) {
      console.error("❌ validate_email_api_key error:", error);
      return null;
    }
    return (data as string) ?? null;
  } catch (e) {
    console.error("❌ getUserIdByEmail unexpected:", e);
    return null;
  }
}

function okJson(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    ...init,
  });
}

function badRequest(message: string) {
  return okJson({ error: message }, { status: 400 });
}

function unauthorized(message: string) {
  return okJson({ error: message }, { status: 401 });
}

// Numeric helpers: sanitize inputs coming from frontend
function toNumber(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (typeof val === "string") {
    const n = Number(val);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function normalizeEntry(entry: unknown): number | null {
  if (entry === null || entry === undefined) return null;
  if (typeof entry === "number" || typeof entry === "string") return toNumber(entry);
  if (typeof entry === "object") {
    const obj = entry as Record<string, unknown>;
    const mid = toNumber(obj.mid);
    if (mid !== null) return mid;
    const bid = toNumber(obj.bid);
    const ask = toNumber(obj.ask);
    if (bid !== null && ask !== null) return (bid + ask) / 2;
    const price = toNumber(obj.price);
    if (price !== null) return price;
  }
  return null;
}

serve(async (req) => {
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    // 1) GET → EA su VPS recupera i segnali usando SOLO l'email
    if (req.method === "GET") {
      // Leggi email da header o query param
      const headerEmail = req.headers.get("x-user-email")?.trim();
      const queryEmail = url.searchParams.get("email")?.trim();
      const email = headerEmail || queryEmail;

      if (!email) {
        return badRequest(
          "Missing email. Provide it via 'x-user-email' header or ?email= query param."
        );
      }

      const userId = await getUserIdByEmail(email);
      if (!userId) {
        return unauthorized("Email non valida o utente non registrato");
      }

      // Recupera tutti i segnali "unsent" per l'utente + i segnali di sistema (user_id IS NULL)
      const { data: signals, error: selectErr } = await supabase
        .from("mt5_signals")
        .select(
          "id, symbol, signal, entry, stop_loss, take_profit, confidence, risk_amount, timestamp"
        )
        .eq("sent", false)
        .order("timestamp", { ascending: true })
        .or(`user_id.eq.${userId},user_id.is.null`);

      if (selectErr) {
        console.error("❌ DB select error:", selectErr);
        throw new Error(selectErr.message);
      }

      const list = (signals || []).map<MT5SignalPayload>((s: IncomingSignal) => ({
        id: s.id,
        symbol: s.symbol,
        // Direzione
        action: s.signal,
        // @ts-expect-error compat: alcuni EA leggono "signal"
        signal: s.signal,

        // Prezzi
        entry: s.entry,
        entry_price: s.entry,

        // SL/TP: inviamo in tutti i formati
        stopLoss: s.stop_loss || 0.0,
        takeProfit: s.take_profit || 0.0,
        stop_loss: s.stop_loss || 0.0,
        take_profit: s.take_profit || 0.0,
        sl: s.stop_loss || 0.0,
        tp: s.take_profit || 0.0,

        // Altri metadati
        confidence: s.confidence ?? null,
        risk_amount: s.risk_amount ?? 0,
        // @ts-expect-error compat camelCase
        riskAmount: s.risk_amount ?? 0,
        timestamp: s.timestamp ?? new Date().toISOString(),

        // Versioni stringa per parser fragili in MQL5
        entry_str: String(s.entry),
        stop_loss_str: s.stop_loss ? String(s.stop_loss) : "0.0",
        take_profit_str: s.take_profit ? String(s.take_profit) : "0.0",
        sl_str: s.stop_loss ? String(s.stop_loss) : "0.0",
        tp_str: s.take_profit ? String(s.take_profit) : "0.0",
      }));

      console.log(`📤 Consegnando ${list.length} segnali all'EA (email: ${email})`);

      // Marca come "sent" per non reinviarli
      if (signals && signals.length > 0) {
        const ids = signals.map((s: IncomingSignal) => s.id);
        const { error: markErr } = await supabase
          .from("mt5_signals")
          .update({ sent: true })
          .in("id", ids);
        if (markErr) {
          console.warn("⚠️ Errore nel marcare i segnali come inviati:", markErr);
        }
      }

      return okJson({ status: "success", count: list.length, signals: list });
    }

    // 2) POST → Frontend o tool crea un nuovo segnale per l'utente (identificato via email)
    if (req.method === "POST") {
      const headerEmail = req.headers.get("x-user-email")?.trim();
      const queryEmail = url.searchParams.get("email")?.trim();
      const email = headerEmail || queryEmail;
      if (!email) {
        return badRequest(
          "Missing email. Provide it via 'x-user-email' header or ?email= query param."
        );
      }

      const userId = await getUserIdByEmail(email);
      if (!userId) {
        return unauthorized("Email non valida o utente non registrato");
      }

      const rawBody = await req.json();
      console.log("📥 Dati ricevuti dal frontend:", rawBody);
      const body = rawBody as IncomingSignal;

      // Normalizzazione valori numerici
      const entryNum = normalizeEntry((body as any).entry);
      const slNum = toNumber((body as any).stopLoss);
      const tpNum = toNumber((body as any).takeProfit);
      const riskNum = toNumber((body as any).riskAmount);

      // Validazione minima input
      if (!body?.symbol || !body?.signal || entryNum === null) {
        return badRequest(
          "Dati segnale incompleti: servono 'symbol', 'signal' (BUY/SELL) ed 'entry' numerico"
        );
      }

      // Inserisci segnale associandolo all'utente identificato dall'email
      const nowIso = new Date().toISOString();
      const { data: inserted, error: insertErr } = await supabase
        .from("mt5_signals")
        .insert({
          client_id: email.toLowerCase(), // client_id richiesto NOT NULL → usiamo l'email come chiave tecnica
          user_id: userId,
          symbol: body.symbol,
          signal: body.signal,
          confidence: body.confidence ?? null,
          entry: entryNum,
          stop_loss: slNum,
          take_profit: tpNum,
          risk_amount: riskNum,
          timestamp: body.timestamp || nowIso,
          ai_analysis: body.aiAnalysis ?? null,
          sent: false, // deve essere consegnato all'EA
        })
        .select("id")
        .single();

      if (insertErr) {
        console.error("❌ DB insert error:", insertErr);
        throw new Error(insertErr.message);
      }

      console.log(
        `✅ Segnale creato per ${email}: ${body.signal} ${body.symbol} @ ${entryNum} → id=${inserted.id}`
      );

      return okJson({ status: "success", signal_id: inserted.id, mt5_ready: true });
    }

    return okJson({ error: "Method not allowed" }, { status: 405 });
  } catch (error: unknown) {
    console.error("❌ Errore mt5-trade-signals:", error);
    return okJson({ error: error?.message || "Internal Server Error" }, {
      status: 500,
    });
  }
});
