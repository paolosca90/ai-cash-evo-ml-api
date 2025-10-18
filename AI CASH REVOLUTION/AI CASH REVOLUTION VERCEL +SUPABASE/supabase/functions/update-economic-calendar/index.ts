import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const TE_API = 'https://api.tradingeconomics.com/calendar';

// Funzione per aggiornare il calendario economico
async function updateEconomicCalendar(updateType: 'SCHEDULED' | 'NEWS_TRIGGERED' | 'MANUAL' = 'SCHEDULED'): Promise<{
  success: boolean;
  eventsCount: number;
  error?: string;
}> {
  try {
    console.log(`🔄 Starting ${updateType} calendar update...`);
    
    const now = new Date();
    const d1 = formatDate(now);
    const d2 = formatDate(addDays(now, 7));
    const creds = 'guest:guest'; // Free tier - 250 calls/day
    const url = `${TE_API}?c=${encodeURIComponent(creds)}&d1=${d1}&d2=${d2}&format=json`;

    console.log(`🌐 Calling TradingEconomics API: ${url}`);
    const res = await fetch(url, { 
      headers: { 
        Accept: 'application/json',
        'User-Agent': 'Economic Calendar App'
      } 
    });
    
    if (!res.ok) {
      throw new Error(`TradingEconomics API error: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    console.log(`📊 Received ${Array.isArray(data) ? data.length : 0} raw events`);
    
    if (!Array.isArray(data)) {
      throw new Error('Invalid API response format');
    }

    // Filter for HIGH impact events only (Importance = 3 or "High")
    const highImpactEvents = data
      .filter((e: unknown) => {
        if (!e || !e.Event) return false;
        const importance = e.Importance;
        return importance === 3 || importance === '3' || 
               `${importance}`.toLowerCase() === 'high' ||
               `${importance}`.toLowerCase() === '3';
      })
      .map((e: unknown, i: number) => {
        const { dateUTC, timeUTC } = toUTCDateParts(e.Date);
        const countryCode = mapCountryToCode(e.Country);
        const currency = mapCountryToCurrency(countryCode);

        return {
          event_id: `te-${dateUTC}-${timeUTC}-${slug(e.Event || e.Category)}-${i}`,
          date: dateUTC,
          time: timeUTC,
          country: countryCode,
          currency,
          event_name: cleanString(e.Event || e.Category || 'Evento Economico'),
          impact: 'HIGH' as const,
          category: cleanString(e.Category || inferCategoryFromName(e.Event || '')),
          importance: 5,
          forecast: formatVal(e.Forecast, e.Unit),
          previous: formatVal(e.Previous, e.Unit),
          actual: formatVal(e.Actual, e.Unit),
          source: 'TradingEconomics'
        };
      });

    console.log(`🎯 Filtered to ${highImpactEvents.length} HIGH impact events`);

    if (highImpactEvents.length === 0) {
      console.log('⚠️ No high-impact events found');
      
      // Log empty update
      await supabase
        .from('economic_calendar_updates')
        .insert({
          update_type: updateType,
          events_count: 0,
          api_calls_used: 1,
          status: 'SUCCESS',
          source: 'TradingEconomics'
        });

      return { success: true, eventsCount: 0 };
    }

    // Clear existing events for the date range
    console.log(`🗑️ Clearing existing events from ${d1} to ${d2}`);
    const { error: deleteError } = await supabase
      .from('economic_events')
      .delete()
      .gte('date', d1)
      .lte('date', d2);

    if (deleteError) {
      console.error('Error clearing old events:', deleteError);
    }

    // Insert new events in batches
    const batchSize = 100;
    let insertedCount = 0;
    
    for (let i = 0; i < highImpactEvents.length; i += batchSize) {
      const batch = highImpactEvents.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('economic_events')
        .insert(batch);

      if (insertError) {
        console.error(`Error inserting batch ${i}-${i + batch.length}:`, insertError);
        throw insertError;
      }
      
      insertedCount += batch.length;
      console.log(`✅ Inserted batch: ${insertedCount}/${highImpactEvents.length} events`);
    }

    // Log successful update
    await supabase
      .from('economic_calendar_updates')
      .insert({
        update_type: updateType,
        events_count: insertedCount,
        api_calls_used: 1,
        status: 'SUCCESS',
        source: 'TradingEconomics'
      });

    console.log(`🎉 Successfully updated calendar with ${insertedCount} events`);
    return { success: true, eventsCount: insertedCount };

  } catch (error) {
    console.error('❌ Error updating economic calendar:', error);
    
    // Log failed update
    await supabase
      .from('economic_calendar_updates')
      .insert({
        update_type: updateType,
        events_count: 0,
        api_calls_used: 1,
        status: 'ERROR',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        source: 'TradingEconomics'
      });

    return { 
      success: false, 
      eventsCount: 0, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Helper functions
function formatDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = `${d.getUTCMonth() + 1}`.padStart(2, '0');
  const day = `${d.getUTCDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setUTCDate(d.getUTCDate() + n);
  return copy;
}

function toUTCDateParts(dateInput: string | number | Date): { dateUTC: string; timeUTC: string } {
  const dt = new Date(dateInput);
  const iso = dt.toISOString();
  const [dateUTC, timeFull] = iso.split('T');
  const timeUTC = (timeFull || '12:00:00Z').replace('Z', '').split('.')[0];
  return { dateUTC, timeUTC };
}

function slug(s: string): string {
  return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function cleanString(s: string): string {
  return (s || '').replace(/<[^>]*>/g, '').trim();
}

function formatVal(v: unknown, unit?: string): string | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return `${v}${unit || ''}`;
  const cleaned = String(v).replace(/<[^>]*>/g, '').trim();
  return cleaned || null;
}

function mapCountryToCode(name: string): string {
  if (!name) return 'US';
  const n = name.toLowerCase();
  const map: Record<string, string> = {
    'united states': 'US', 'usa': 'US', 'u.s.': 'US',
    'euro area': 'EU', 'eurozone': 'EU', 'european union': 'EU',
    'united kingdom': 'UK', 'uk': 'UK', 'britain': 'UK',
    'japan': 'JP', 'canada': 'CA', 'australia': 'AU', 'new zealand': 'NZ',
    'switzerland': 'CH', 'germany': 'DE', 'france': 'FR', 'italy': 'IT',
    'china': 'CN', 'sweden': 'SE', 'norway': 'NO', 'denmark': 'DK',
  };
  return map[n] || (name.length === 2 ? name.toUpperCase() : 'US');
}

function mapCountryToCurrency(code: string): string {
  const map: Record<string, string> = {
    US: 'USD', EU: 'EUR', DE: 'EUR', FR: 'EUR', IT: 'EUR',
    UK: 'GBP', JP: 'JPY', CA: 'CAD', AU: 'AUD', NZ: 'NZD',
    CH: 'CHF', CN: 'CNY', SE: 'SEK', NO: 'NOK', DK: 'DKK'
  };
  return map[code] || 'USD';
}

function inferCategoryFromName(name: string): string {
  const s = (name || '').toLowerCase();
  if (s.includes('cpi') || s.includes('inflation') || s.includes('price')) return 'Inflation';
  if (s.includes('payroll') || s.includes('employment') || s.includes('job') || s.includes('unemployment')) return 'Employment';
  if (s.includes('rate') || s.includes('interest') || s.includes('decision') || s.includes('fomc') || s.includes('fed') || s.includes('ecb') || s.includes('boe')) return 'Monetary Policy';
  if (s.includes('gdp') || s.includes('growth')) return 'GDP';
  if (s.includes('retail') || s.includes('sales') || s.includes('consumer')) return 'Consumer';
  if (s.includes('trade') || s.includes('balance') || s.includes('export') || s.includes('import')) return 'Trade';
  if (s.includes('business') || s.includes('sentiment') || s.includes('confidence') || s.includes('pmi') || s.includes('ifo')) return 'Business';
  return 'Other';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { update_type = 'MANUAL' } = await req.json().catch(() => ({ update_type: 'MANUAL' }));
    
    console.log(`📅 Manual calendar update triggered: ${update_type}`);
    
    const result = await updateEconomicCalendar(update_type);
    
    return new Response(JSON.stringify({
      success: result.success,
      message: result.success 
        ? `Calendario aggiornato con ${result.eventsCount} eventi ad alto impatto`
        : `Errore nell'aggiornamento: ${result.error}`,
      events_count: result.eventsCount,
      update_type,
      timestamp: new Date().toISOString()
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('❌ Error in update-economic-calendar:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Errore nell\'aggiornamento del calendario economico'
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});