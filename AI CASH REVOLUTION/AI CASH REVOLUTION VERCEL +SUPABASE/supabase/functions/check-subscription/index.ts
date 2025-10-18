import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function for enhanced debugging
const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    logStep("Authenticating user with token");
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Prima controlla il profilo utente per abbonamenti crypto e trial
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      logStep("Error fetching profile", { error: profileError });
    }

    // Controlla se c'è un trial o abbonamento attivo
    if (profile && profile.trial_ends_at && ['trial', 'active'].includes(profile.subscription_status)) {
      const expiryDate = new Date(profile.trial_ends_at);
      const now = new Date();
      
      if (expiryDate > now) {
        // Trial/abbonamento ancora valido
        logStep("Active subscription/trial found", { 
          status: profile.subscription_status,
          method: profile.payment_method,
          expiresAt: profile.trial_ends_at,
          paymentDetails: profile.payment_details 
        });
        
        return new Response(JSON.stringify({
          subscribed: true,
          method: profile.payment_method || 'unknown',
          subscription_status: profile.subscription_status,
          subscription_end: profile.trial_ends_at,
          payment_details: profile.payment_details
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      } else {
        // Trial/abbonamento scaduto - aggiorna lo stato
        logStep("Subscription/trial expired, updating status", {
          userId: user.id,
          expiredAt: profile.trial_ends_at,
          wasStatus: profile.subscription_status
        });
        
        await supabaseClient
          .from('profiles')
          .update({ 
            subscription_status: 'expired',
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
        
        // Ritorna come non sottoscritto
        return new Response(JSON.stringify({ 
          subscribed: false,
          subscription_status: 'expired',
          expired_at: profile.trial_ends_at
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // Fallback: controlla Stripe per abbonamenti tradizionali
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      logStep("No Stripe key, returning unsubscribed state");
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Checking Stripe subscription");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No Stripe customer found, returning unsubscribed state");
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    const hasActiveSub = subscriptions.data.length > 0;
    let productId = null;
    let subscriptionEnd = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      logStep("Active Stripe subscription found", { subscriptionId: subscription.id, endDate: subscriptionEnd });
      productId = subscription.items.data[0].price.product;
      logStep("Determined subscription tier", { productId });
    } else {
      logStep("No active Stripe subscription found");
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      method: 'stripe',
      product_id: productId,
      subscription_end: subscriptionEnd
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});