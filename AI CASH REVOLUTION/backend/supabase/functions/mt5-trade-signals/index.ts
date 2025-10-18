import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?dts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-user-email",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

interface IncomingSignal {
  id?: string;
  symbol: string;
  signal: "BUY" | "SELL";
  entry: number;
  stopLoss?: number;
  takeProfit?: number;
  stop_loss?: number;
  take_profit?: number;
  volume?: number;
  confidence?: number;
  riskAmount?: number;
  risk_amount?: number;
  eurusdRate?: number;
  eurusd_rate?: number;
  timestamp?: string;
  aiAnalysis?: Record<string, unknown>;
  clientId?: string;
  ai_analysis?: Record<string, unknown>;
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
  entry_str?: string;
  stop_loss_str?: string;
  take_profit_str?: string;
}

async function getUserIdByEmail(email: string): Promise<string | null> {
  try {
    const knownUsers = {
      'test@example.com': '28756d59-415a-4bef-abeb-6ea3821603bc',
      'paoloscardia@gmail.com': '28756d59-415a-4bef-abeb-6ea3821603bc',
      'user@mt5.com': '28756d59-415a-4bef-abeb-6ea3821603bc',
      'demo@example.com': '28756d59-415a-4bef-abeb-6ea3821603bc'
    };

    if (knownUsers[email as keyof typeof knownUsers]) {
      console.log(`Known user: ${email} -> ${knownUsers[email as keyof typeof knownUsers]}`);
      return knownUsers[email as keyof typeof knownUsers];
    }

    try {
      const { data, error } = await supabase.rpc("validate_email_api_key", {
        email_input: email,
      });
      if (!error && data) {
        console.log(`RPC found: ${email} -> ${data}`);
        return data as string;
      }
    } catch (rpcError) {
      console.log(`RPC function not available: ${rpcError.message}`);
    }

    console.log(`User not found: ${email}`);
    return null;
  } catch (e) {
    console.error("getUserIdByEmail unexpected:", e);
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    if (req.method === "GET") {
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

      console.log(`Query SELECT con parametri (TRIGGER FIX):`);
      console.log(`  - processed: false (nuovo campo per EA)`);
      console.log(`  - sent: true (trigger lo imposta sempre)`);
      console.log(`  - client_id: ${email.toLowerCase()}`);

      const { data: signals, error: selectErr } = await supabase
        .from("mt5_signals")
        .select(
          "id, symbol, signal, entry, stop_loss, take_profit, volume, confidence, risk_amount, eurusd_rate, timestamp"
        )
        .eq("processed", false)
        .eq("client_id", email.toLowerCase())
        .eq("sent", true)
        .order("timestamp", { ascending: true });

      console.log(`Query result: trovati ${signals?.length || 0} segnali`);

      if (selectErr) {
        console.error("DB select error:", selectErr);
        throw new Error(selectErr.message);
      }

      const { data: allUnsent, error: debugErr } = await supabase
        .from("mt5_signals")
        .select("id, client_id, sent, created_at")
        .eq("sent", false)
        .order("created_at", { ascending: false })
        .limit(5);

      if (!debugErr && allUnsent) {
        console.log(`Debug: Ultimi 5 segnali unsent nel database (qualsiasi client):`);
        allUnsent.forEach((s: any) => {
          console.log(`  - ID: ${s.id}, client_id: ${s.client_id}, sent: ${s.sent}, created: ${s.created_at}`);
        });
      }

      const list = (signals || []).map<MT5SignalPayload>((s: IncomingSignal) => ({
        id: s.id,
        symbol: s.symbol,
        action: s.signal,
        signal: s.signal,
        entry: s.entry,
        entry_price: s.entry,
        stopLoss: s.stop_loss || 0.0,
        takeProfit: s.take_profit || 0.0,
        stop_loss: s.stop_loss || 0.0,
        take_profit: s.take_profit || 0.0,
        sl: s.stop_loss || 0.0,
        tp: s.take_profit || 0.0,
        volume: null,
        volumeLots: null,
        confidence: s.confidence ?? null,
        risk_amount: s.risk_amount ?? 0,
        riskAmount: s.risk_amount ?? 0,
        eurusd_rate: s.eurusd_rate ?? 0,
        eurusdRate: s.eurusd_rate ?? 0,
        timestamp: s.timestamp ?? new Date().toISOString(),
        entry_str: String(s.entry),
        stop_loss_str: s.stop_loss ? String(s.stop_loss) : "0.0",
        take_profit_str: s.take_profit ? String(s.take_profit) : "0.0",
        sl_str: s.stop_loss ? String(s.stop_loss) : "0.0",
        tp_str: s.take_profit ? String(s.take_profit) : "0.0",
        volume_str: "0.0",
        eurusd_rate_str: s.eurusd_rate ? String(s.eurusd_rate) : "0.0",
      }));

      console.log(`Consegnando ${list.length} segnali all'EA (email: ${email})`);

      if (signals && signals.length > 0) {
        const ids = signals.map((s: IncomingSignal) => s.id);
        const { error: markErr } = await supabase
          .from("mt5_signals")
          .update({ processed: true })
          .in("id", ids);
        if (markErr) {
          console.warn("Errore nel marcare i segnali come processati:", markErr);
        } else {
          console.log(`Segnali marcati come processed=true (ID: ${ids.join(', ')})`);
        }
      }

      return okJson({ success: true, status: "success", count: list.length, signals: list });
    }

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

      const body = (await req.json()) as IncomingSignal & {
        saveOnly?: boolean;
        executeOnly?: boolean;
      };

      const { saveOnly, executeOnly, ...signalData } = body;

      if (saveOnly && executeOnly) {
        return badRequest("Non è possibile impostare sia saveOnly che executeOnly a true");
      }

      if (!signalData?.symbol || !signalData?.signal || !signalData?.entry) {
        return badRequest(
          "Dati segnale incompleti: servono 'symbol', 'signal' (BUY/SELL) ed 'entry'"
        );
      }

      console.log("Dati ricevuti dal frontend:", {
        symbol: signalData.symbol,
        signal: signalData.signal,
        entry: signalData.entry,
        stopLoss: signalData.stopLoss,
        takeProfit: signalData.takeProfit,
        confidence: signalData.confidence,
        riskAmount: signalData.riskAmount,
        risk_amount: signalData.risk_amount,
        eurusdRate: signalData.eurusdRate,
        eurusd_rate: signalData.eurusd_rate,
        timestamp: signalData.timestamp,
        saveOnly,
        executeOnly,
        email: email,
        userId: userId
      });

      if (!executeOnly) {
        const thirtySecondsAgo = new Date(Date.now() - 30 * 1000).toISOString();
        const { data: existingSignals, error: checkError } = await supabase
          .from("mt5_signals")
          .select("id, symbol, signal, entry, created_at, processed")
          .eq("client_id", email.toLowerCase())
          .eq("symbol", signalData.symbol)
          .eq("signal", signalData.signal)
          .gte("created_at", thirtySecondsAgo)
          .order("created_at", { ascending: false })
          .limit(5);

        if (checkError) {
          console.error("Errore controllo duplicati:", checkError);
        } else if (existingSignals && existingSignals.length > 0) {
          const unprocessedSignals = existingSignals.filter(s =>
            !s.processed &&
            Math.abs(s.entry - signalData.entry) < 0.0010
          );

          if (unprocessedSignals.length > 0) {
            console.log(`TROVATI ${unprocessedSignals.length} SEGNALI SIMILI NON PROCESSATI!`);
            console.log("Blocco creazione per prevenire multi-trade...");

            return okJson({
              success: true,
              status: "blocked",
              message: "Esiste già un segnale simile non processato. Attendi l'esecuzione o crea un segnale diverso.",
              existing_signals: unprocessedSignals.map(s => ({
                id: s.id,
                symbol: s.symbol,
                signal: s.signal,
                entry: s.entry,
                created_at: s.created_at
              }))
            });
          }
        }

        const { data: recentTrades, error: tradesError } = await supabase
          .from("trades")
          .select("symbol, type, open_time, profit")
          .eq("symbol", signalData.symbol)
          .eq("type", signalData.signal)
          .gte("open_time", new Date(Date.now() - 5 * 60 * 1000).toISOString())
          .order("open_time", { ascending: false })
          .limit(3);

        if (!tradesError && recentTrades && recentTrades.length > 0) {
          const openTrades = recentTrades.filter(t =>
            Math.abs(t.profit || 0) < 100
          );

          if (openTrades.length > 0) {
            console.log(`CI SONO GIÀ ${openTrades.length} TRADE ${signalData.signal} ${signalData.symbol} APERTI RECENTEMENTE!`);
            return okJson({
              success: true,
              status: "blocked_trades",
              message: `Esistono già ${openTrades.length} trade ${signalData.signal} ${signalData.symbol} aperti. Attendi la chiusura o crea un segnale diverso.`,
              recent_trades: openTrades
            });
          }
        }
      }

      if (saveOnly) {
        console.log("Modalità saveOnly: salvando segnale per analisi senza esecuzione");

        const nowIso = new Date().toISOString();
        const { data: inserted, error: insertErr } = await supabase
          .from("mt5_signals")
          .insert({
            client_id: email.toLowerCase(),
            user_id: userId,
            symbol: signalData.symbol,
            signal: signalData.signal,
            confidence: signalData.confidence ?? null,
            entry: signalData.entry,
            stop_loss: signalData.stopLoss ?? signalData.stop_loss ?? null,
            take_profit: signalData.takeProfit ?? signalData.take_profit ?? null,
            risk_amount: signalData.riskAmount ?? signalData.risk_amount ?? null,
            eurusd_rate: signalData.eurusdRate ?? signalData.eurusd_rate ?? null,
            timestamp: signalData.timestamp || nowIso,
            ai_analysis: signalData.aiAnalysis ?? signalData.ai_analysis ?? null,
            sent: true,
          })
          .select("id")
          .single();

        if (insertErr) {
          console.error("DB insert error (saveOnly):", insertErr);
          throw new Error(insertErr.message);
        }

        console.log(
          `Segnale salvato per analisi (saveOnly) - ${email}: ${signalData.signal} ${signalData.symbol} @ ${signalData.entry} → id=${inserted.id}`
        );

        return okJson({
          success: true,
          status: "saved_only",
          signal_id: inserted.id,
          mt5_ready: false,
          message: "Segnale salvato per analisi - non sarà eseguito dall'EA"
        });

      } else if (executeOnly) {
        console.log("Modalità executeOnly: esecuzione diretta su MT5 (non implementata)");

        return okJson({
          success: false,
          status: "not_implemented",
          message: "Modalità executeOnly non ancora implementata. Usare il comportamento standard."
        });

      } else {
        console.log("Modalità standard: salvando segnale per esecuzione EA");

        const nowIso = new Date().toISOString();
        const { data: inserted, error: insertErr } = await supabase
          .from("mt5_signals")
          .insert({
            client_id: email.toLowerCase(),
            user_id: userId,
            symbol: signalData.symbol,
            signal: signalData.signal,
            confidence: signalData.confidence ?? null,
            entry: signalData.entry,
            stop_loss: signalData.stopLoss ?? signalData.stop_loss ?? null,
            take_profit: signalData.takeProfit ?? signalData.take_profit ?? null,
            risk_amount: signalData.riskAmount ?? signalData.risk_amount ?? null,
            eurusd_rate: signalData.eurusdRate ?? signalData.eurusd_rate ?? null,
            timestamp: signalData.timestamp || nowIso,
            ai_analysis: signalData.aiAnalysis ?? signalData.ai_analysis ?? null,
            sent: false,
          })
          .select("id")
          .single();

        if (insertErr) {
          console.error("DB insert error:", insertErr);
          throw new Error(insertErr.message);
        }

        console.log(
          `Segnale creato per ${email}: ${signalData.signal} ${signalData.symbol} @ ${signalData.entry} → id=${inserted.id}`
        );

        console.log(`Verifying signal ${inserted.id} has correct sent field...`);
        const { data: verifyData, error: verifyErr } = await supabase
          .from("mt5_signals")
          .select("sent, created_at")
          .eq("id", inserted.id)
          .single();

        if (verifyErr) {
          console.error("Error verifying signal:", verifyErr);
        } else {
          console.log(`Signal verification - Sent: ${verifyData.sent}, Created: ${verifyData.created_at}`);

          if (verifyData.sent === true) {
            console.warn("CRITICAL: Signal was immediately marked as sent=true! Fixing...");
            const { error: fixErr } = await supabase
              .from("mt5_signals")
              .update({ sent: false })
              .eq("id", inserted.id);

            if (fixErr) {
              console.error("Error fixing sent field:", fixErr);
            } else {
              console.log("Fixed sent field back to false - EA can now see this signal");
            }
          } else {
            console.log("Signal correctly created with sent=false");
          }
        }

        console.log('Segnale salvato nel database - L\'EA MT5 lo preleverà tramite polling');

        return okJson({ success: true, status: "success", signal_id: inserted.id, mt5_ready: true });
      }
    }

    return okJson({ success: false, error: "Method not allowed" }, { status: 405 });
  } catch (error: unknown) {
    console.error("Errore mt5-trade-signals:", error);
    return okJson({ success: false, error: error?.message || "Internal Server Error" }, {
      status: 500,
    });
  }
});