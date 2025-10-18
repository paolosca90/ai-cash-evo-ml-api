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

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🔔 Auth webhook received");
    
    const body = await req.json();
    console.log("Webhook payload:", JSON.stringify(body, null, 2));
    
    // Verifica che sia un evento di nuovo utente registrato
    if (body.type === 'INSERT' && body.table === 'users' && body.record) {
      const newUser = body.record;
      
      console.log(`👤 New user registered: ${newUser.email}`);
      
      // Invia email di benvenuto chiamando la welcome-email function
      try {
        const { data, error: emailError } = await supabase.functions.invoke('welcome-email', {
          body: {
            user_id: newUser.id,
            email: newUser.email,
            name: newUser.raw_user_meta_data?.name || newUser.raw_user_meta_data?.full_name
          }
        });
        
        if (emailError) {
          console.error("❌ Error sending welcome email:", emailError);
        } else {
          console.log("✅ Welcome email triggered successfully");
        }
      } catch (emailErr) {
        console.error("❌ Exception sending welcome email:", emailErr);
      }
      
      // Altre azioni che puoi fare quando un nuovo utente si registra:
      
      // 1. Crea un profilo utente di default (se esiste una tabella profiles)
      try {
        await supabase.from('profiles').insert({
          id: newUser.id,
          email: newUser.email,
          display_name: newUser.raw_user_meta_data?.name || newUser.raw_user_meta_data?.full_name,
          created_at: new Date().toISOString()
        });
        console.log("✅ User profile created");
      } catch (profileErr) {
        console.warn("⚠️ Could not create profile (table might not exist):", profileErr);
      }
      
      // 2. Assegna un ruolo di default (già fatto via trigger nel DB)
      
      // 3. Log dell'evento
      console.log(`📝 User registration completed for: ${newUser.email}`);
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: "Webhook processed successfully"
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: unknown) {
    console.error("❌ Error processing auth webhook:", error);
    
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