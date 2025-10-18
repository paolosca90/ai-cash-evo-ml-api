import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") as string;
// Normalize secret: accept both "whsec_..." and "v1,whsec_..." formats
const rawHookSecret = (Deno.env.get("SEND_EMAIL_HOOK_SECRET") || "").trim();
const hookSecret = rawHookSecret.startsWith("v") && rawHookSecret.includes(",")
  ? rawHookSecret.split(",").pop()!.trim()
  : rawHookSecret;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";

function buildEmailHtml(params: {
  title: string;
  intro: string;
  ctaText: string;
  actionUrl: string;
  token?: string;
  footerNote?: string;
  includeCredentialsBlock?: { email: string } | null;
}) {
  const creds = params.includeCredentialsBlock
    ? `<div style="background:#e6fffa;border-left:4px solid #319795;padding:16px;border-radius:6px;margin:24px 0;">
         <h3 style="margin:0 0 8px 0;color:#2c7a7b">Credenziali</h3>
         <p style="margin:0;color:#2c7a7b;font-size:14px">
           <strong>Email:</strong> ${params.includeCredentialsBlock.email}<br/>
           <strong>Password:</strong> Quella scelta in fase di registrazione
         </p>
       </div>`
    : "";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${params.title}</title>
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f8fafc;margin:0}
    .box{max-width:600px;margin:0 auto;background:#fff}
    .hd{background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 20px;text-align:center;color:#fff}
    .ct{padding:32px}
    .btn{display:inline-block;background:linear-gradient(135deg,#10b981,#059669);color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600}
    .muted{color:#6b7280;font-size:14px}
    .code{font-family:monospace;background:#f3f4f6;padding:12px;border-radius:6px;display:inline-block}
    .ft{background:#edf2f7;padding:24px;text-align:center;color:#718096;font-size:14px}
  </style></head>
  <body><div class="box">
    <div class="hd"><h1>${params.title}</h1></div>
    <div class="ct">
      <p>${params.intro}</p>
      ${creds}
      <p style="text-align:center;margin:32px 0;">
        <a class="btn" href="${params.actionUrl}">${params.ctaText}</a>
      </p>
      ${params.token ? `<p class="muted">Oppure usa questo codice:</p><p class="code">${params.token}</p>` : ""}
      ${params.footerNote ? `<p class="muted">${params.footerNote}</p>` : ""}
    </div>
    <div class="ft">
      <p><strong>Cash Revolution</strong></p>
      <p>Supporto: <a href="mailto:support@cash-revolution.com">support@cash-revolution.com</a></p>
    </div>
  </div></body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const payload = await req.text();
    const headers = Object.fromEntries(req.headers);

    if (!hookSecret) throw new Error("SEND_EMAIL_HOOK_SECRET not set");
    const wh = new Webhook(hookSecret);

    const {
      user,
      email_data: { token, token_hash, redirect_to, email_action_type },
    } = wh.verify(payload, headers) as {
      user: { email: string };
      email_data: {
        token: string;
        token_hash: string;
        redirect_to: string;
        email_action_type: string; // signup | recovery | magiclink | email_change etc.
      };
    };

    // Build verification URL expected by Supabase
    const actionUrl = `${SUPABASE_URL}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${encodeURIComponent(
      redirect_to
    )}`;

    // Determine template by action
    let subject = "";
    let html = "";

    if (email_action_type === "signup") {
      subject = "✅ Conferma il tuo account - Cash Revolution";
      html = buildEmailHtml({
        title: "Benvenuto in Cash Revolution",
        intro:
          "Grazie per esserti registrato. Conferma il tuo account per iniziare a usare i segnali AI. Di seguito trovi anche le tue credenziali.",
        ctaText: "Conferma Account",
        actionUrl,
        token,
        footerNote: "Il link è valido per 24 ore e può essere usato una sola volta.",
        includeCredentialsBlock: { email: user.email },
      });
    } else if (email_action_type === "recovery") {
      subject = "🔑 Reset Password - Cash Revolution";
      html = buildEmailHtml({
        title: "Reset Password",
        intro: "Abbiamo ricevuto la tua richiesta di reset password. Clicca sul pulsante per procedere.",
        ctaText: "Reimposta Password",
        actionUrl,
        token,
        footerNote: "Il link è valido per 1 ora e può essere usato una sola volta.",
        includeCredentialsBlock: null,
      });
    } else {
      subject = "Cash Revolution";
      html = buildEmailHtml({
        title: "Azione Richiesta",
        intro: "Per completare l'operazione clicca sul pulsante seguente.",
        ctaText: "Continua",
        actionUrl,
        token,
        includeCredentialsBlock: null,
      });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Cash Revolution <support@cash-revolution.com>",
        to: [user.email],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j?.message || "Resend error");
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("send-auth-email error", err);
    return new Response(JSON.stringify({ error: err?.message || String(err) }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
