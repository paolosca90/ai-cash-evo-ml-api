import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PriceResponse {
  usd_price: number;
  timestamp: number;
  source: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token') || 'usdc';
    const amount = url.searchParams.get('amount') || '1';

    console.log(`Fetching price for ${token} with amount ${amount}`);

    // Per USDT e USDC, assumiamo 1:1 con USD (stablecoins)
    // In produzione, utilizzare API come CoinGecko o Chainlink
    let usdPrice: number;
    
    switch (token.toLowerCase()) {
      case 'usdt':
      case 'usdc':
        usdPrice = 1.0; // Stablecoin pegged to USD
        break;
      case 'btc':
      case 'bitcoin':
        // Per BTC, potresti usare un'API esterna
        // Per ora, un prezzo fisso di esempio
        usdPrice = 43000; // Placeholder - usa API reale
        break;
      default:
        usdPrice = 1.0;
    }

    const tokenAmount = parseFloat(amount) / usdPrice;
    
    const response: PriceResponse = {
      usd_price: usdPrice,
      timestamp: Date.now(),
      source: 'internal-oracle'
    };

    return new Response(JSON.stringify({
      token: token.toUpperCase(),
      usd_amount: parseFloat(amount),
      token_amount: tokenAmount,
      price_data: response
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error) {
    console.error('Error in crypto-price-feed:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch price data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }
});