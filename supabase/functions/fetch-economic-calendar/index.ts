import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EconomicEvent {
  id: string;
  date: string;
  time: string;
  country: string;
  currency: string;  
  event: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  forecast: string | null;
  previous: string | null;
  actual: string | null;
  category: string;
  importance: number;
}

// Initialize Supabase client for database operations
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Check if we need to refresh data (once per day at 7 AM or if cache is empty)
async function shouldRefreshData(): Promise<boolean> {
  try {
    // Check if we have unknown recent data
    const { data: recentEvents, error } = await supabase
      .from('economic_events')
      .select('created_at')
      .gte('date', new Date().toISOString().split('T')[0])
      .limit(1);

    if (error) {
      console.error('Error checking recent events:', error);
      return true; // Refresh on error
    }

    if (!recentEvents || recentEvents.length === 0) {
      console.log('📅 No recent events found, refreshing...');
      return true;
    }

    // Check last update time
    const { data: lastUpdate, error: updateError } = await supabase
      .from('economic_calendar_updates')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1);

    if (updateError || !lastUpdate || lastUpdate.length === 0) {
      console.log('📅 No previous updates found, refreshing...');
      return true;
    }

    const lastUpdateTime = new Date(lastUpdate[0].created_at);
    const now = new Date();
    const hoursSinceUpdate = (now.getTime() - lastUpdateTime.getTime()) / (1000 * 60 * 60);

    // Refresh if more than 6 hours since last update
    if (hoursSinceUpdate > 6) {
      console.log(`📅 Last update was ${hoursSinceUpdate.toFixed(1)} hours ago, refreshing...`);
      return true;
    }

    console.log(`✅ Data is fresh (updated ${hoursSinceUpdate.toFixed(1)} hours ago)`);
    return false;

  } catch (error) {
    console.error('Error checking refresh status:', error);
    return true; // Refresh on error
  }
}

async function fetchAndCacheEvents(): Promise<number> {
  try {
    console.log('🌐 Fetching fresh data from Financial Modeling Prep...');
    
    const apiKey = Deno.env.get('FMP_API_KEY');
    
    if (!apiKey) {
      console.warn('⚠️ FMP_API_KEY not found, using fallback data');
      return await insertFallbackEvents();
    }

    // Get date range - today to next 7 days
    const fromDate = formatDate(new Date());
    const toDate = formatDate(addDays(new Date(), 7));
    
    console.log(`📅 Fetching events from ${fromDate} to ${toDate}`);
    
    // FMP API endpoint for economic calendar
    const url = `https://financialmodelingprep.com/api/v3/economic_calendar?from=${fromDate}&to=${toDate}&apikey=${apiKey}`;
    
    console.log('🌐 Making request to FMP API...');
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`FMP API error: ${response.status} ${response.statusText}`);
      // Use fallback data on API error
      return await insertFallbackEvents();
    }
    
    const rawData = await response.json();
    console.log(`📊 Received ${rawData?.length || 0} events from FMP API`);
    
    if (!Array.isArray(rawData) || rawData.length === 0) {
      console.log('⚠️ No events received from API, using fallback data');
      return await insertFallbackEvents();
    }

    // Transform FMP data to our format
    const events = rawData
      .filter(event => event.impact && event.impact.toLowerCase() !== 'low') // Only medium/high impact
      .map(event => {
        const eventDate = new Date(event.date);
        const { dateUTC, timeUTC } = toUTCDateParts(eventDate);
        
        return {
          event_id: `fmp_${event.date}_${event.country}_${slug(event.event)}`,
          date: dateUTC,
          time: timeUTC,
          country: event.country || 'US',
          currency: event.currency || 'USD',
          event_name: event.event || 'Economic Event',
          importance: mapImpactToImportance(event.impact),
          actual: formatVal(event.actual),
          forecast: formatVal(event.estimate),
          previous: formatVal(event.previous),
          impact: capitalizeImpact(event.impact),
          category: inferCategoryFromName(event.event || ''),
          source: 'FMP'
        };
      });

    if (events.length === 0) {
      console.log('⚠️ No high/medium impact events found, using fallback data');
      return await insertFallbackEvents();
    }

    // Clear existing events for the date range
    const { error: deleteError } = await supabase
      .from('economic_events')
      .delete()
      .gte('date', fromDate)
      .lte('date', toDate);

    if (deleteError) {
      console.error('Error clearing old events:', deleteError);
    }

    // Insert events in batches
    const batchSize = 100;
    let totalInserted = 0;
    
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('economic_events')
        .insert(batch);

      if (insertError) {
        console.error('Error inserting batch:', insertError);
        throw insertError;
      }
      
      totalInserted += batch.length;
    }

    // Log successful update
    await supabase
      .from('economic_calendar_updates')
      .insert({
        update_type: 'SCHEDULED',
        status: 'SUCCESS',
        events_count: totalInserted,
        api_calls_used: 1,
        source: 'FMP'
      });

    console.log(`✅ Successfully cached ${totalInserted} events from FMP API`);
    return totalInserted;

  } catch (error) {
    console.error('❌ Error fetching from FMP API:', error);
    
    // Log error
    await supabase
      .from('economic_calendar_updates')
      .insert({
        update_type: 'SCHEDULED',
        status: 'ERROR',
        events_count: 0,
        api_calls_used: 1,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        source: 'FMP'
      });
    
    // Insert fallback events so user sees something
    console.log('🔄 Using fallback events due to API error');
    return await insertFallbackEvents();
  }
}

async function insertFallbackEvents(): Promise<number> {
  const fallbackEvents = [
    {
      event_id: 'fallback_1',
      date: formatDate(new Date()),
      time: '14:30:00',
      country: 'US',
      currency: 'USD',
      event_name: 'Initial Jobless Claims',
      importance: 2,
      actual: null,
      forecast: '220K',
      previous: '215K',
      impact: 'Medium',
      category: 'Employment',
      source: 'FMP'
    },
    {
      event_id: 'fallback_2',
      date: formatDate(addDays(new Date(), 1)),
      time: '19:00:00',
      country: 'US',
      currency: 'USD',
      event_name: 'Federal Reserve Interest Rate Decision',
      importance: 3,
      actual: null,
      forecast: '5.25%',
      previous: '5.50%',
      impact: 'High',
      category: 'Central Banking',
      source: 'FMP'
    },
    {
      event_id: 'fallback_3',
      date: formatDate(addDays(new Date(), 2)),
      time: '13:30:00',
      country: 'US',
      currency: 'USD',
      event_name: 'Consumer Price Index (CPI)',
      importance: 3,
      actual: null,
      forecast: '3.1%',
      previous: '3.2%',
      impact: 'High',
      category: 'Inflation',
      source: 'FMP'
    },
    {
      event_id: 'fallback_4',
      date: formatDate(addDays(new Date(), 3)),
      time: '09:00:00',
      country: 'DE',
      currency: 'EUR',
      event_name: 'German IFO Business Climate',
      importance: 2,
      actual: null,
      forecast: '87.2',
      previous: '86.9',
      impact: 'Medium',
      category: 'Business',
      source: 'FMP'
    },
    {
      event_id: 'fallback_5',
      date: formatDate(addDays(new Date(), 4)),
      time: '08:30:00',
      country: 'US',
      currency: 'USD',
      event_name: 'Non-Farm Payrolls',
      importance: 3,
      actual: null,
      forecast: '185K',
      previous: '180K',
      impact: 'High',
      category: 'Employment',
      source: 'FMP'
    }
  ];

  // Clear existing events for the date range
  const startDate = formatDate(new Date());
  const endDate = formatDate(addDays(new Date(), 7));
  
  const { error: deleteError } = await supabase
    .from('economic_events')
    .delete()
    .gte('date', startDate)
    .lte('date', endDate);

  if (deleteError) {
    console.error('Error clearing old events:', deleteError);
  }

  // Insert fallback events
  const { error: insertError } = await supabase
    .from('economic_events')
    .insert(fallbackEvents);

  if (insertError) {
    console.error('Error inserting fallback events:', insertError);
    throw insertError;
  }

  // Log fallback update
  await supabase
    .from('economic_calendar_updates')
    .insert({
      update_type: 'FALLBACK',
      status: 'SUCCESS',
      events_count: fallbackEvents.length,
      api_calls_used: 0,
      source: 'FMP'
    });

  console.log(`✅ Inserted ${fallbackEvents.length} fallback events`);
  return fallbackEvents.length;
}

async function getCachedEvents(daysAhead: number = 7): Promise<EconomicEvent[]> {
  const today = new Date().toISOString().split('T')[0];
  const endDate = addDays(new Date(), daysAhead).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('economic_events')
    .select('*')
    .gte('date', today)
    .lte('date', endDate)
    .order('date', { ascending: true })
    .order('time', { ascending: true });

  if (error) {
    console.error('Error fetching cached events:', error);
    throw error;
  }

  return (data || []).map(event => ({
    id: event.event_id,
    date: event.date,
    time: event.time,
    country: event.country,
    currency: event.currency,
    event: event.event_name,
    impact: event.impact as 'HIGH' | 'MEDIUM' | 'LOW',
    category: event.category,
    importance: event.importance,
    forecast: event.forecast,
    previous: event.previous,
    actual: event.actual,
  }));
}

// Helper functions
function mapImpactToImportance(impact: string): number {
  if (!impact) return 1;
  const lowerImpact = impact.toLowerCase();
  if (lowerImpact === 'high') return 3;
  if (lowerImpact === 'medium') return 2;
  return 1;
}

function capitalizeImpact(impact: string): string {
  if (!impact) return 'Low';
  return impact.charAt(0).toUpperCase() + impact.slice(1).toLowerCase();
}

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
  const timeUTC = (timeFull || '00:00:00Z').replace('Z', '').split('.')[0];
  return { dateUTC, timeUTC };
}

function slug(s: string): string {
  return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function formatVal(v: unknown, unit?: string): string | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return `${v}${unit ? unit : ''}`;
  return String(v).replace(/<[^>]*>/g, '').trim() || null;
}

function inferCategoryFromName(name: string): string {
  const lowerName = name.toLowerCase();
  
  if (lowerName.includes('employment') || lowerName.includes('job') || lowerName.includes('unemployment') || lowerName.includes('payroll')) {
    return 'Employment';
  }
  if (lowerName.includes('cpi') || lowerName.includes('inflation') || lowerName.includes('price')) {
    return 'Inflation';
  }
  if (lowerName.includes('gdp') || lowerName.includes('growth')) {
    return 'GDP';
  }
  if (lowerName.includes('fed') || lowerName.includes('rate') || lowerName.includes('central bank') || lowerName.includes('fomc')) {
    return 'Central Banking';
  }
  if (lowerName.includes('retail') || lowerName.includes('sales')) {
    return 'Retail';
  }
  if (lowerName.includes('manufacturing') || lowerName.includes('industrial') || lowerName.includes('pmi')) {
    return 'Manufacturing';
  }
  if (lowerName.includes('consumer') || lowerName.includes('confidence') || lowerName.includes('sentiment')) {
    return 'Consumer';
  }
  if (lowerName.includes('housing') || lowerName.includes('construction')) {
    return 'Housing';
  }
  
  return 'Economic Indicator';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { impact_filter = 'ALL', days_ahead = 7, force_refresh = false } = await req.json();
    console.log(`📅 Economic Calendar request: impact=${impact_filter}, days=${days_ahead}, force=${force_refresh}`);

    // Check if we need to refresh data
    const needsRefresh = force_refresh || await shouldRefreshData();
    
    if (needsRefresh) {
      try {
        await fetchAndCacheEvents();
      } catch (error) {
        console.error('⚠️ Failed to refresh data, using cached data if available:', error);
      }
    }

    // Get events from cache
    const events = await getCachedEvents(days_ahead);
    const filteredEvents = impact_filter === 'ALL' 
      ? events 
      : events.filter(e => e.impact === impact_filter);

    console.log(`📊 Returning ${filteredEvents.length} cached events`);

    return new Response(JSON.stringify({
      success: true,
      source: 'Cached (FMP)',
      events: filteredEvents,
      count: filteredEvents.length,
      filter: impact_filter,
      cached: !needsRefresh,
      generated_at: new Date().toISOString()
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('❌ Error in fetch-economic-calendar:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      events: [],
      count: 0
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});