import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?dts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

// Resend API key
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

interface ResetPasswordData {
  email: string;
  token_hash: string;
  token: string;
  redirect_to?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🔑 Password reset email trigger received");
    
    const body = await req.json();
    console.log("Reset password payload:", JSON.stringify(body, null, 2));
    
    let resetData: ResetPasswordData;
    
    // Se è un webhook di Supabase Auth per reset password
    if (body.token_hash && body.token && body.email) {
      resetData = {
        email: body.email,
        token_hash: body.token_hash,
        token: body.token,
        redirect_to: body.redirect_to || `${supabaseUrl.replace('https://', 'https://').replace('.supabase.co', '.lovable.app')}/reset-password`
      };
    } 
    // Se chiamato manualmente dalla app
    else {
      resetData = body as ResetPasswordData;
    }

    if (!resetData.email || !resetData.token_hash) {
      throw new Error('Email and token_hash are required');
    }

    console.log(`🔑 Sending password reset email to: ${resetData.email}`);

    // Template email di reset password per piattaforma trading
    const resetPasswordEmailHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Password - AI Trading Platform</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
            .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 40px 20px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 600; }
            .content { padding: 40px 30px; }
            .reset-message { font-size: 18px; color: #1a202c; margin-bottom: 30px; }
            .reset-button { display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .security-info { background-color: #fef3c7; border-left: 4px solid #fbbf24; padding: 20px; margin: 30px 0; border-radius: 0 8px 8px 0; }
            .footer { background-color: #edf2f7; padding: 30px; text-align: center; color: #718096; font-size: 14px; }
            .token-box { background-color: #f7fafc; border: 2px dashed #cbd5e0; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
            .token { font-family: 'Courier New', monospace; font-size: 24px; font-weight: bold; color: #2d3748; letter-spacing: 2px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔑 Reset Password - Cash Revolution</h1>
            </div>
            
            <div class="content">
              <div class="reset-message">
                <p>Ciao,</p>
                <p>Hai richiesto di <strong>reimpostare la password</strong> per il tuo account Cash Revolution.</p>
                <p>Se non hai fatto questa richiesta tu, puoi ignorare questa email in sicurezza.</p>
              </div>

              <div style="text-align: center; margin: 40px 0;">
                <a href="${supabaseUrl}/auth/v1/verify?token=${resetData.token_hash}&type=recovery&redirect_to=${resetData.redirect_to}" class="reset-button">
                  🔑 Reimposta Password
                </a>
              </div>

              <div class="token-box">
                <h3 style="margin-top: 0; color: #2d3748;">Oppure usa questo codice:</h3>
                <div class="token">${resetData.token}</div>
                <p style="margin-bottom: 0; color: #718096; font-size: 14px;">Inserisci questo codice nella pagina di reset password</p>
              </div>

              <div class="security-info">
                <h3 style="color: #d97706; margin: 0 0 10px 0;">⚠️ Informazioni di Sicurezza</h3>
                <ul style="margin: 0; color: #92400e; font-size: 14px;">
                  <li>Questo link è valido per <strong>1 ora</strong></li>
                  <li>Può essere utilizzato <strong>una sola volta</strong></li>
                  <li>Scegli una password sicura con almeno 8 caratteri</li>
                  <li>Non condividere mai questo link con nessuno</li>
                </ul>
              </div>

              <div style="background-color: #f0f9ff; border-left: 4px solid #0284c7; padding: 20px; margin: 30px 0;">
                <h3 style="color: #0369a1; margin: 0 0 10px 0;">💡 Suggerimenti per una Password Sicura:</h3>
                <ul style="margin: 0; color: #0369a1; font-size: 14px;">
                  <li>Usa almeno 8 caratteri</li>
                  <li>Combina lettere maiuscole e minuscole</li>
                  <li>Includi almeno un numero</li>
                  <li>Aggiungi simboli speciali (!@#$%)</li>
                  <li>Non utilizzare informazioni personali</li>
                </ul>
              </div>

              <div style="text-align: center; color: #718096; margin: 30px 0;">
                <p><strong>Hai problemi?</strong></p>
                <p>Se il link non funziona, copia e incolla questo URL nel tuo browser:</p>
                <p style="word-break: break-all; font-family: monospace; background-color: #f7fafc; padding: 10px; border-radius: 4px;">
                  ${supabaseUrl}/auth/v1/verify?token=${resetData.token_hash}&type=recovery&redirect_to=${resetData.redirect_to}
                </p>
              </div>
            </div>
            
            <div class="footer">
              <p><strong>Cash Revolution</strong></p>
              <p>La tua sicurezza è la nostra priorità</p>
              <p style="margin-top: 20px; font-size: 12px;">
                Questo messaggio è stato inviato a ${resetData.email}<br>
                Se non hai richiesto questo reset, contattaci a <a href="mailto:support@cash-revolution.com">support@cash-revolution.com</a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Invia l'email usando Resend API REST
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: "Cash Revolution Support <support@cash-revolution.com>",
        to: [resetData.email],
        subject: "🔑 Reset Password - Cash Revolution",
        html: resetPasswordEmailHTML,
      })
    });

    const emailResult = await emailResponse.json();
    
    if (!emailResponse.ok) {
      throw new Error(`Resend API error: ${emailResult.message || 'Unknown error'}`);
    }

    console.log("✅ Password reset email sent successfully:", emailResult);

    // Salva un record di email inviata
    try {
      await supabase.from('email_logs').insert({
        user_id: null, // Non abbiamo user_id per reset password
        email_type: 'password_reset',
        recipient: resetData.email,
        status: 'sent',
        resend_id: emailResult.id,
        sent_at: new Date().toISOString()
      });
    } catch (logError) {
      console.warn("Warning: Could not log email:", logError);
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Password reset email sent successfully",
      email_id: emailResult.id
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: unknown) {
    console.error("❌ Error sending password reset email:", error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json", 
        ...corsHeaders 
      },
    });
  }
};

serve(handler);