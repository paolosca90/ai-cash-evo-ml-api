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

interface AuthWebhookPayload {
  type: string;
  table: string;
  record?: unknown;
  schema: string;
  old_record?: unknown;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🔔 Auth webhook received");
    
    const payload: AuthWebhookPayload = await req.json();
    console.log("Webhook payload:", JSON.stringify(payload, null, 2));

    // Gestisci gli eventi di auth
    if (payload.table === 'users') {
      const user = payload.record;
      
      if (payload.type === 'INSERT' && user) {
        // Nuovo utente registrato - invia email di benvenuto
        console.log("👤 New user signup detected:", user.email);
        
        await sendWelcomeEmail({
          user_id: user.id,
          email: user.email,
          name: user.raw_user_meta_data?.name || user.raw_user_meta_data?.full_name
        });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("❌ Error in auth webhook:", error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

async function sendWelcomeEmail(emailData: { user_id: string; email: string; name?: string }) {
  console.log(`📧 Sending welcome email to: ${emailData.email}`);

  const welcomeEmailHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Benvenuto in Cash Revolution</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 600; }
          .content { padding: 40px 30px; }
          .welcome-message { font-size: 18px; color: #1a202c; margin-bottom: 30px; }
          .credentials-box { background-color: #e6fffa; border-left: 4px solid #319795; padding: 20px; margin: 30px 0; border-radius: 0 8px 8px 0; }
          .confirm-button { display: inline-block; background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
          .features { background-color: #f7fafc; padding: 30px; border-radius: 12px; margin: 30px 0; }
          .feature { display: flex; align-items: center; margin-bottom: 20px; }
          .feature-icon { background-color: #667eea; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-size: 18px; }
          .feature h3 { margin: 0 0 5px 0; color: #2d3748; font-size: 16px; }
          .feature p { margin: 0; color: #718096; font-size: 14px; }
          .footer { background-color: #edf2f7; padding: 30px; text-align: center; color: #718096; font-size: 14px; }
          .stats { display: flex; justify-content: space-around; text-align: center; margin: 30px 0; }
          .stat { flex: 1; }
          .stat-number { font-size: 24px; font-weight: bold; color: #667eea; }
          .stat-label { font-size: 12px; color: #718096; text-transform: uppercase; }
          .risk-warning { background-color: #fff5f5; border-left: 4px solid #f56565; padding: 20px; margin: 30px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚀 Benvenuto in Cash Revolution!</h1>
          </div>
          
          <div class="content">
            <div class="welcome-message">
              <p>Ciao${emailData.name ? ` ${emailData.name}` : ''},</p>
              <p>Benvenuto in <strong>Cash Revolution</strong> - la piattaforma di trading AI più avanzata! 🎯</p>
              <p>Il tuo account è stato creato con successo. Ora puoi accedere e iniziare a utilizzare i nostri segnali AI.</p>
            </div>

            <div class="credentials-box">
              <h3 style="color: #2c7a7b; margin: 0 0 15px 0;">📧 Le tue credenziali di accesso:</h3>
              <p style="margin: 0; color: #2c7a7b; font-size: 16px;">
                <strong>Email:</strong> ${emailData.email}<br>
                <strong>Password:</strong> Quella che hai scelto durante la registrazione
              </p>
            </div>

            <div style="text-align: center; margin: 40px 0;">
              <a href="https://781f6820-a889-430b-9c1a-dd28bdb32c37.lovableproject.com/login" class="confirm-button">
                🚀 Accedi alla Piattaforma
              </a>
            </div>

            <div class="stats">
              <div class="stat">
                <div class="stat-number">95%+</div>
                <div class="stat-label">Accuratezza AI</div>
              </div>
              <div class="stat">
                <div class="stat-number">24/7</div>
                <div class="stat-label">Analisi Market</div>
              </div>
              <div class="stat">
                <div class="stat-number">15+</div>
                <div class="stat-label">Indicatori Pro</div>
              </div>
            </div>

            <div class="features">
              <h2 style="margin-top: 0; color: #2d3748;">🔥 Quello che puoi fare ora:</h2>
              
              <div class="feature">
                <div class="feature-icon">🤖</div>
                <div>
                  <h3>Segnali AI in Tempo Reale</h3>
                  <p>Ricevi segnali BUY/SELL generati da algoritmi di machine learning avanzati</p>
                </div>
              </div>
              
              <div class="feature">
                <div class="feature-icon">📊</div>
                <div>
                  <h3>Analisi Multi-Timeframe</h3>
                  <p>Analisi professionale su M1, M5, M15 con Smart Money Concepts</p>
                </div>
              </div>
              
              <div class="feature">
                <div class="feature-icon">📈</div>
                <div>
                  <h3>Integrazione MetaTrader 5</h3>
                  <p>Esegui i trades direttamente su MT5 con un click</p>
                </div>
              </div>
              
              <div class="feature">
                <div class="feature-icon">🎯</div>
                <div>
                  <h3>Risk Management Automatico</h3>
                  <p>Stop Loss e Take Profit calcolati automaticamente dall'AI</p>
                </div>
              </div>

              <div class="feature">
                <div class="feature-icon">📰</div>
                <div>
                  <h3>News Sentiment Analysis</h3>
                  <p>Analisi del sentiment delle news finanziarie in tempo reale</p>
                </div>
              </div>
            </div>

            <div class="risk-warning">
              <h3 style="color: #c53030; margin: 0 0 10px 0;">⚠️ Avviso Importante sui Rischi</h3>
              <p style="margin: 0; color: #742a2a; font-size: 14px;">
                Il trading comporta sempre dei rischi. Non investire mai più di quello che puoi permetterti di perdere. 
                I segnali AI sono strumenti di supporto e non garantiscono profitti. Investi sempre responsabilmente. 📊
              </p>
            </div>

            <div style="text-align: center; color: #718096; margin: 30px 0;">
              <p>💡 <strong>Tip:</strong> Inizia con un account demo per familiarizzare con la piattaforma prima di fare trading con denaro reale.</p>
            </div>
          </div>
          
          <div class="footer">
            <p><strong>Cash Revolution</strong></p>
            <p>La rivoluzione del trading AI è iniziata</p>
            <p style="margin-top: 20px; font-size: 12px;">
              Hai domande? Contattaci a <a href="mailto:support@cash-revolution.com">support@cash-revolution.com</a><br>
              Questo messaggio è stato inviato a ${emailData.email}
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  // Invia l'email usando Resend API
  const emailResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: "Cash Revolution Support <support@cash-revolution.com>",
      to: [emailData.email],
      subject: "🚀 Benvenuto in Cash Revolution - La tua rivoluzione del trading AI",
      html: welcomeEmailHTML,
    })
  });

  const emailResult = await emailResponse.json();
  
  if (!emailResponse.ok) {
    throw new Error(`Resend API error: ${emailResult.message || 'Unknown error'}`);
  }

  console.log("✅ Welcome email sent successfully:", emailResult);

  // Log dell'email inviata
  try {
    await supabase.from('email_logs').insert({
      user_id: emailData.user_id,
      email_type: 'welcome',
      recipient: emailData.email,
      status: 'sent',
      resend_id: emailResult.id,
      sent_at: new Date().toISOString()
    });
  } catch (logError) {
    console.warn("Warning: Could not log email:", logError);
  }
}

async function sendPasswordResetEmail(emailData: { email: string; token_hash: string; token: string; redirect_to?: string }) {
  console.log(`🔑 Sending password reset email to: ${emailData.email}`);

  const resetPasswordEmailHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Password - Cash Revolution</title>
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
              <a href="${supabaseUrl}/auth/v1/verify?token=${emailData.token_hash}&type=recovery&redirect_to=${emailData.redirect_to || 'https://781f6820-a889-430b-9c1a-dd28bdb32c37.lovableproject.com/reset-password'}" class="reset-button">
                🔑 Reimposta Password
              </a>
            </div>

            <div class="token-box">
              <h3 style="margin-top: 0; color: #2d3748;">Oppure usa questo codice:</h3>
              <div class="token">${emailData.token}</div>
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
          </div>
          
          <div class="footer">
            <p><strong>Cash Revolution</strong></p>
            <p>La tua sicurezza è la nostra priorità</p>
            <p style="margin-top: 20px; font-size: 12px;">
              Questo messaggio è stato inviato a ${emailData.email}<br>
              Se non hai richiesto questo reset, contattaci a <a href="mailto:support@cash-revolution.com">support@cash-revolution.com</a>
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  // Invia l'email usando Resend API
  const emailResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: "Cash Revolution Support <support@cash-revolution.com>",
      to: [emailData.email],
      subject: "🔑 Reset Password - Cash Revolution",
      html: resetPasswordEmailHTML,
    })
  });

  const emailResult = await emailResponse.json();
  
  if (!emailResponse.ok) {
    throw new Error(`Resend API error: ${emailResult.message || 'Unknown error'}`);
  }

  console.log("✅ Password reset email sent successfully:", emailResult);

  // Log dell'email inviata
  try {
    await supabase.from('email_logs').insert({
      user_id: null,
      email_type: 'password_reset',
      recipient: emailData.email,
      status: 'sent',
      resend_id: emailResult.id,
      sent_at: new Date().toISOString()
    });
  } catch (logError) {
    console.warn("Warning: Could not log email:", logError);
  }
}

serve(handler);