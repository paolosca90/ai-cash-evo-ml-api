import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CRYPTO-RENEWAL-REMINDER] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Trova utenti con abbonamenti crypto in scadenza nei prossimi 3 giorni
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    
    const { data: expiringUsers, error: fetchError } = await supabaseClient
      .from('profiles')
      .select(`
        id,
        email,
        display_name,
        subscription_plan,
        subscription_expires_at,
        payment_type,
        last_renewal_reminder_sent
      `)
      .eq('payment_type', 'crypto')
      .not('subscription_expires_at', 'is', null)
      .lte('subscription_expires_at', threeDaysFromNow.toISOString())
      .or(
        'last_renewal_reminder_sent.is.null,' +
        `last_renewal_reminder_sent.lt.${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}`
      );

    if (fetchError) {
      throw new Error(`Error fetching users: ${fetchError.message}`);
    }

    logStep("Found expiring users", { count: expiringUsers?.length || 0 });

    if (!expiringUsers || expiringUsers.length === 0) {
      logStep("No users found needing renewal reminders");
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No renewal reminders needed",
        sent: 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    let emailsSent = 0;
    const errors: string[] = [];

    // Invia reminder a ogni utente
    for (const user of expiringUsers) {
      try {
        // Invia email di promemoria tramite Supabase function
        const { error: emailError } = await supabaseClient.functions.invoke('send-auth-email', {
          body: {
            email: user.email,
            subject: 'Rinnovo Abbonamento Crypto - AI Cash Revolution',
            content: `
              <h2>Il tuo abbonamento scade presto!</h2>
              <p>Ciao,</p>
              <p>Il tuo abbonamento ${user.subscription_plan} scadrà il ${new Date(user.subscription_expires_at).toLocaleDateString('it-IT')}.</p>
              <p>Per rinnovare il tuo abbonamento, accedi al tuo account e vai alla sezione pagamenti.</p>
              <p>Grazie per aver scelto AI Cash Revolution!</p>
            `
          }
        });

        if (emailError) {
          console.error('Errore invio email:', emailError);
        } else {
          console.log('Email di promemoria inviata con successo');
        }

        // Aggiorna timestamp dell'ultimo reminder inviato
        await supabaseClient
          .from('profiles')
          .update({ last_renewal_reminder_sent: new Date().toISOString() })
          .eq('id', user.id);

        emailsSent++;
        logStep("Email sent successfully", { 
          userId: user.id, 
          email: user.email
        });

      } catch (userError: unknown) {
        const errorMsg = `Failed to send reminder to ${user.email}: ${userError?.message || userError}`;
        errors.push(errorMsg);
        logStep("ERROR sending email to user", {
          userId: user.id, 
          email: user.email, 
          error: errorMsg 
        });
      }
    }

    logStep("Function completed", { 
      totalUsers: expiringUsers.length,
      emailsSent,
      errors: errors.length
    });

    return new Response(JSON.stringify({
      success: true,
      message: `Renewal reminders processed successfully`,
      totalUsers: expiringUsers.length,
      emailsSent,
      errors: errors.length > 0 ? errors : undefined,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("FATAL ERROR", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});