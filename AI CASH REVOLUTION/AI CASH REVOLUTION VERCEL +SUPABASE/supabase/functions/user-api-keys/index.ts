import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const handler = async (req: Request): Promise<Response> => {
  console.log("🔑 User API Keys Handler - Request received:", req.method);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verifica autenticazione utente
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header richiesto' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    // Verifica l'utente autenticato
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("❌ Authentication error:", authError);
      return new Response(JSON.stringify({ error: 'Non autorizzato' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const userId = user.id;
    console.log("✅ User autenticato:", userId);

    // GET: Recupera API keys dell'utente
    if (req.method === 'GET') {
      const { data: apiKeys, error } = await supabase
        .from('user_api_keys')
        .select('id, name, api_key, is_active, created_at, last_used_at, expires_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching API keys:', error);
        return new Response(JSON.stringify({ error: 'Errore nel recupero delle API keys' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        status: 'success',
        api_keys: apiKeys
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // POST: Crea nuova API key
    if (req.method === 'POST') {
      const { name } = await req.json();
      
      if (!name || name.trim().length === 0) {
        return new Response(JSON.stringify({ error: 'Nome richiesto per la API key' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Genera nuova API key
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { data: newApiKey, error: generateError } = await supabaseAdmin.rpc('generate_api_key');
      
      if (generateError || !newApiKey) {
        console.error('❌ Error generating API key:', generateError);
        return new Response(JSON.stringify({ error: 'Errore nella generazione della API key' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Salva la nuova API key
      const { data: savedKey, error: saveError } = await supabase
        .from('user_api_keys')
        .insert({
          user_id: userId,
          api_key: newApiKey,
          name: name.trim(),
          is_active: true
        })
        .select('id, name, api_key, is_active, created_at')
        .single();

      if (saveError) {
        console.error('❌ Error saving API key:', saveError);
        return new Response(JSON.stringify({ error: 'Errore nel salvataggio della API key' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log("✅ API key creata:", savedKey.id);

      return new Response(JSON.stringify({
        status: 'success',
        message: 'API key creata con successo',
        api_key: savedKey
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // PUT: Aggiorna API key (attiva/disattiva)
    if (req.method === 'PUT') {
      const { api_key_id, is_active, name } = await req.json();
      
      if (!api_key_id) {
        return new Response(JSON.stringify({ error: 'ID API key richiesto' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const updateData: unknown = {};
      if (typeof is_active === 'boolean') updateData.is_active = is_active;
      if (name && name.trim().length > 0) updateData.name = name.trim();

      const { data: updatedKey, error: updateError } = await supabase
        .from('user_api_keys')
        .update(updateData)
        .eq('id', api_key_id)
        .eq('user_id', userId)
        .select('id, name, is_active')
        .single();

      if (updateError) {
        console.error('❌ Error updating API key:', updateError);
        return new Response(JSON.stringify({ error: 'Errore nell\'aggiornamento della API key' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        status: 'success',
        message: 'API key aggiornata con successo',
        api_key: updatedKey
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // DELETE: Elimina API key
    if (req.method === 'DELETE') {
      const url = new URL(req.url);
      const apiKeyId = url.searchParams.get('id');
      
      if (!apiKeyId) {
        return new Response(JSON.stringify({ error: 'ID API key richiesto' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { error: deleteError } = await supabase
        .from('user_api_keys')
        .delete()
        .eq('id', apiKeyId)
        .eq('user_id', userId);

      if (deleteError) {
        console.error('❌ Error deleting API key:', deleteError);
        return new Response(JSON.stringify({ error: 'Errore nell\'eliminazione della API key' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        status: 'success',
        message: 'API key eliminata con successo'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      error: 'Method not allowed'
    }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Errore User API Keys:', error);
    
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Errore interno del server',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

serve(handler);