/**
 * Temporary cleanup function to remove mt5_signals with NULL entry
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
      }
    })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Count records with NULL entry before deletion
    const { count: beforeCount } = await supabase
      .from('mt5_signals')
      .select('id', { count: 'exact', head: true })
      .is('entry', null)

    console.log(`Found ${beforeCount || 0} records with NULL entry`)

    // Delete all signals with NULL entry
    const { data, error } = await supabase
      .from('mt5_signals')
      .delete()
      .is('entry', null)
      .select()

    if (error) {
      console.error('Delete error:', error)
      throw error
    }

    const deletedCount = data?.length || 0

    console.log(`✅ Deleted ${deletedCount} records with NULL entry`)

    return new Response(
      JSON.stringify({
        success: true,
        deletedCount,
        message: `Successfully deleted ${deletedCount} signals with NULL entry`
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )

  } catch (error) {
    console.error('Cleanup error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  }
})
