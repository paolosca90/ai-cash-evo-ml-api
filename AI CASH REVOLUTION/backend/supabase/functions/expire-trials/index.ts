import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    console.log("[EXPIRE-TRIALS] Starting trial expiration check");
    
    const now = new Date().toISOString();
    
    // Trova tutti i profili con trial o active status e trial_ends_at scaduto
    const { data: expiredProfiles, error: selectError } = await supabaseClient
      .from('profiles')
      .select('id, email, trial_ends_at, subscription_status, payment_method')
      .in('subscription_status', ['trial', 'active'])
      .not('trial_ends_at', 'is', null)
      .lt('trial_ends_at', now);

    if (selectError) {
      console.error("[EXPIRE-TRIALS] Error selecting expired profiles:", selectError);
      throw selectError;
    }

    console.log(`[EXPIRE-TRIALS] Found ${expiredProfiles?.length || 0} expired profiles`);

    if (expiredProfiles && expiredProfiles.length > 0) {
      // Aggiorna tutti i profili scaduti
      const { data: updatedProfiles, error: updateError } = await supabaseClient
        .from('profiles')
        .update({ 
          subscription_status: 'expired',
          updated_at: new Date().toISOString()
        })
        .in('id', expiredProfiles.map(p => p.id))
        .select();

      if (updateError) {
        console.error("[EXPIRE-TRIALS] Error updating profiles:", updateError);
        throw updateError;
      }

      console.log(`[EXPIRE-TRIALS] Successfully expired ${updatedProfiles?.length || 0} profiles`);
      
      // Log dei profili scaduti
      expiredProfiles.forEach(profile => {
        console.log(`[EXPIRE-TRIALS] Expired: ${profile.email} (${profile.payment_method}) - was ${profile.subscription_status}`);
      });

      return new Response(
        JSON.stringify({
          success: true,
          expired_count: updatedProfiles?.length || 0,
          expired_profiles: expiredProfiles.map(p => ({
            email: p.email,
            payment_method: p.payment_method,
            trial_ends_at: p.trial_ends_at
          }))
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        expired_count: 0,
        message: "No expired trials found"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[EXPIRE-TRIALS] ERROR:", errorMessage);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
