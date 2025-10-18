import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// Import dei token dal web3 config (replicato qui per edge function)
const TOKENS = {
  USDT: {
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' as const,
    decimals: 6,
    symbol: 'USDT',
    name: 'Tether USD',
  },
  USDC: {
    address: '0xA0b86a33E6417c86c486170532a7227d2EAd1c36' as const,
    decimals: 6,
    symbol: 'USDC',
    name: 'USD Coin',
  },
} as const;

type SupportedToken = keyof typeof TOKENS;

const RECIPIENT_WALLET = '0x3B9Fbe747a80733D8de47556A9AAaD8F13b09534' as const;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PAYMENT-QR] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");
    
    const { paymentType, planName, amount, isAnnual, selectedToken = 'USDC' as SupportedToken } = await req.json();
    
    if (!paymentType || !planName || !amount) {
      throw new Error("Missing required parameters: paymentType, planName, amount");
    }

    logStep("Request parameters", { paymentType, planName, amount, isAnnual, selectedToken });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    let user = null;
    
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      user = data.user;
      logStep("User authenticated", { userId: user?.id, email: user?.email });
    }

    const origin = req.headers.get("origin") || "https://lovable.app";
    
    if (paymentType === "stripe") {
      // Stripe Payment QR
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
      
      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
      
      let customerId;
      if (user?.email) {
        const customers = await stripe.customers.list({ email: user.email, limit: 1 });
        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
        }
      }

      // Crea sessione Stripe checkout
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user?.email,
        line_items: [
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: `${planName} - AI CASH R-EVOLUTION`,
                description: `Piano ${planName} - ${isAnnual ? 'Annuale' : 'Mensile'}`,
              },
              unit_amount: Math.round(parseFloat(amount) * 100), // Converti in centesimi
              recurring: {
                interval: isAnnual ? 'year' : 'month',
              },
            },
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/payment-canceled`,
        expires_at: Math.floor(Date.now() / 1000) + 3600, // Scade in 1 ora
      });

      logStep("Stripe session created", { sessionId: session.id, url: session.url });

      return new Response(JSON.stringify({ 
        success: true,
        paymentUrl: session.url,
        sessionId: session.id,
        expiresAt: new Date((Math.floor(Date.now() / 1000) + 3600) * 1000).toISOString()
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
      
    } else if (paymentType === "crypto") {
      // Crypto Payment QR - formato EIP-681 standard
      // Converti EUR in USD per pagamenti crypto
      logStep("Converting EUR to USD for crypto payment");
      
      let usdAmount: number;
      try {
        // Ottieni tasso di cambio EUR/USD usando ExchangeRate-API (gratuita)
        const exchangeResponse = await fetch('https://api.exchangerate-api.com/v4/latest/EUR');
        if (!exchangeResponse.ok) {
          logStep("Using fallback exchange rate (1 EUR = 1.10 USD)");
          usdAmount = parseFloat(amount) * 1.10; // Fallback rate
        } else {
          const exchangeData = await exchangeResponse.json();
          const eurToUsdRate = exchangeData.rates.USD;
          usdAmount = parseFloat(amount) * eurToUsdRate;
          logStep("Currency converted", { 
            eurAmount: amount, 
            exchangeRate: eurToUsdRate, 
            usdAmount: usdAmount.toFixed(2) 
          });
        }
      } catch (exchangeError) {
        logStep("Exchange rate API error - using fallback", { error: exchangeError });
        usdAmount = parseFloat(amount) * 1.10; // Fallback rate
      }
      
      const tokenConfig = TOKENS[selectedToken as SupportedToken] || TOKENS.USDC;
      const amountInWei = Math.round(usdAmount * Math.pow(10, tokenConfig.decimals)).toString();
      
      // Formato EIP-681: ethereum:<contract_address>/transfer?address=<recipient>&uint256=<amount>
      const cryptoPaymentString = `ethereum:${tokenConfig.address}/transfer?address=${RECIPIENT_WALLET}&uint256=${amountInWei}`;
      
      logStep("Crypto payment string created", { 
        cryptoPaymentString,
        token: tokenConfig.symbol,
        amountInWei,
        usdAmount: usdAmount.toFixed(2),
        recipient: RECIPIENT_WALLET 
      });

      return new Response(JSON.stringify({ 
        success: true,
        paymentString: cryptoPaymentString,
        tokenInfo: {
          symbol: tokenConfig.symbol,
          name: tokenConfig.name,
          decimals: tokenConfig.decimals,
          address: tokenConfig.address
        },
        recipient: RECIPIENT_WALLET,
        amount: amountInWei,
        amountFormatted: `${usdAmount.toFixed(2)} USD (€${amount})`,
        eurAmount: amount,
        usdAmount: usdAmount.toFixed(2),
        expiresAt: new Date(Date.now() + 3600000).toISOString() // 1 ora
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    throw new Error("Invalid payment type. Use 'stripe' or 'crypto'");
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});