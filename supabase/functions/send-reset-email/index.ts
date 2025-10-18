import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody { email: string }

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    const { email } = (await req.json()) as RequestBody;
    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Generate a secure recovery link via Admin API
    const redirectTo = `${req.headers.get("origin") || "https://781f6820-a889-430b-9c1a-dd28bdb32c37.lovableproject.com"}/reset-password`;
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });
    if (error || !data) throw error || new Error("Unable to generate recovery link");

    const actionLink = data.properties.action_link;
    const token = data.properties.email_otp || "";
    const tokenHash = data.properties.hashed_token || "";

    // Build HTML email
    const html = `
      <!DOCTYPE html>
      <html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
      <title>Reset Password - Cash Revolution</title>
      <style>
        body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f8fafc;margin:0}
        .box{max-width:600px;margin:0 auto;background:#fff}
        .hd{background:linear-gradient(135deg,#dc2626,#991b1b);padding:32px 20px;text-align:center;color:#fff}
        .ct{padding:32px}
        .btn{display:inline-block;background:linear-gradient(135deg,#dc2626,#991b1b);color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600}
        .muted{color:#6b7280;font-size:14px}
        .code{font-family:monospace;background:#f3f4f6;padding:12px;border-radius:6px;display:inline-block}
        .ft{background:#edf2f7;padding:24px;text-align:center;color:#718096;font-size:14px}
      </style></head>
      <body><div class="box">
        <div class="hd"><h1>🔑 Reset Password - Cash Revolution</h1></div>
        <div class="ct">
          <p>Ciao,</p>
          <p>Per reimpostare la tua password, clicca sul pulsante qui sotto. Se non hai richiesto tu questa operazione, ignora pure questa email.</p>
          <p style="text-align:center;margin:32px 0;">
            <a class="btn" href="${actionLink}">Reimposta Password</a>
          </p>
          ${token ? `<p class="muted">Oppure usa questo codice:</p><p class="code">${token}</p>` : ""}
          <p class="muted">Il link è valido per 1 ora e può essere utilizzato una sola volta.</p>
        </div>
        <div class="ft">
          <p><strong>Cash Revolution</strong></p>
          <p>Hai bisogno di aiuto? Scrivici a <a href="mailto:support@cash-revolution.com">support@cash-revolution.com</a></p>
        </div>
      </div></body></html>
    `;

    // Send via Resend
    const resendKey = Deno.env.get("RESEND_API_KEY") ?? "";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Cash Revolution Support <support@cash-revolution.com>",
        to: [email],
        subject: "🔑 Reset Password - Cash Revolution",
        html,
      }),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json?.message || "Resend error");

    // Optional: log
    await supabase.from("email_logs").insert({
      email_type: "password_reset",
      recipient: email,
      status: "sent",
      resend_id: json.id,
      sent_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    console.error("send-reset-email error", e);
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
