import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to verify Ethereum transaction using Etherscan API
const verifyEthereumTransaction = async (
  recipientAddress: string,
  expectedAmount: string,
  requestId: string,
  etherscanApiKey: string
): Promise<{ verified: boolean; txHash?: string; actualAmount?: string }> => {
  try {
    logStep("Verifying Ethereum transaction", { recipientAddress, expectedAmount, requestId });
    
    // Convert amount to Wei (USDC has 6 decimals)
    const expectedAmountWei = (parseFloat(expectedAmount) * 1000000).toString(); // USDC has 6 decimals
    
    // Query Etherscan for recent token transactions to the recipient address
    const etherscanUrl = `https://api.etherscan.io/api?module=account&action=tokentx&contractaddress=0xA0b86a33E6417c86c486170532a7227d2EAd1c36&address=${recipientAddress}&page=1&offset=100&startblock=0&endblock=latest&sort=desc&apikey=${etherscanApiKey}`;
    
    logStep("Querying Etherscan API", { url: etherscanUrl.replace(etherscanApiKey, 'HIDDEN') });
    
    const response = await fetch(etherscanUrl);
    const data = await response.json();
    
    if (data.status !== "1") {
      logStep("Etherscan API error", { error: data.message });
      return { verified: false };
    }
    
    // Search for transactions in the last 2 hours that match the amount
    const now = Math.floor(Date.now() / 1000);
    const twoHoursAgo = now - (2 * 60 * 60); // 2 hours ago
    
    const recentTransactions = data.result.filter((tx: unknown) => {
      const txTimestamp = parseInt(tx.timeStamp);
      const isRecent = txTimestamp >= twoHoursAgo;
      const isCorrectAmount = tx.value === expectedAmountWei;
      const isToCorrectAddress = tx.to.toLowerCase() === recipientAddress.toLowerCase();
      
      logStep("Checking transaction", {
        txHash: tx.hash,
        timestamp: txTimestamp,
        isRecent,
        amount: tx.value,
        expectedAmountWei,
        isCorrectAmount,
        to: tx.to,
        isToCorrectAddress
      });
      
      return isRecent && isCorrectAmount && isToCorrectAddress;
    });
    
    if (recentTransactions.length > 0) {
      const verifiedTx = recentTransactions[0];
      logStep("Payment verified", { 
        txHash: verifiedTx.hash, 
        amount: verifiedTx.value,
        from: verifiedTx.from,
        to: verifiedTx.to
      });
      
      return {
        verified: true,
        txHash: verifiedTx.hash,
        actualAmount: (parseInt(verifiedTx.value) / 1000000).toString() // Convert from wei to USDC
      };
    }
    
    logStep("No matching transactions found", { 
      totalTransactions: data.result.length,
      recentTransactionsCount: recentTransactions.length 
    });
    
    return { verified: false };
    
  } catch (error: unknown) {
    logStep("Error verifying Ethereum transaction", { error: error?.message || error });
    return { verified: false };
  }
};

// Helper logging function for debugging
const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-CRYPTO-PAYMENT] ${step}${detailsStr}`);
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Parse request body
    const { requestId, paymentAmount, paymentCurrency, recipientAddress } = await req.json();
    logStep("Request parsed", { requestId, paymentAmount, paymentCurrency, recipientAddress });

    if (!requestId || !paymentAmount || !recipientAddress) {
      throw new Error("Missing required parameters: requestId, paymentAmount, and recipientAddress");
    }

    // Get Etherscan API key
    const etherscanApiKey = Deno.env.get("ETHERSCAN_API_KEY");
    if (!etherscanApiKey) {
      throw new Error("ETHERSCAN_API_KEY not configured");
    }

    // Verify payment on blockchain using Etherscan API
    logStep("Starting blockchain payment verification");
    const verificationResult = await verifyEthereumTransaction(
      recipientAddress,
      paymentAmount,
      requestId,
      etherscanApiKey
    );
    
    const paymentVerified = verificationResult.verified;
    
    if (paymentVerified) {
      logStep("Payment verified on blockchain", { 
        txHash: verificationResult.txHash,
        actualAmount: verificationResult.actualAmount 
      });
      
      // Calculate subscription duration based on amount
      const subscriptionDuration = parseFloat(paymentAmount) >= 800 ? 365 : 30; // 1 year for annual, 1 month for monthly
      const subscriptionEnd = new Date();
      subscriptionEnd.setDate(subscriptionEnd.getDate() + subscriptionDuration);

      // Update user's subscription in profiles table
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          subscription_status: 'active',
          subscription_plan: parseFloat(paymentAmount) >= 800 ? 'professional_annual' : 'professional',
          subscription_expires_at: subscriptionEnd.toISOString(),
          payment_method: 'crypto',
          payment_type: 'crypto',
          payment_details: {
            currency: paymentCurrency || 'USDC',
            amount: paymentAmount,
            actual_amount: verificationResult.actualAmount,
            request_id: requestId,
            tx_hash: verificationResult.txHash,
            recipient_address: recipientAddress,
            payment_date: new Date().toISOString(),
            verification_method: 'etherscan_api'
          },
          updated_at: new Date().toISOString()
        });

      if (updateError) {
        logStep("Error updating user subscription", { error: updateError });
        throw updateError;
      }

      logStep("User subscription updated successfully");

      // Send welcome email
      try {
        const { error: emailError } = await supabaseClient.functions.invoke('welcome-email', {
          body: {
            user_id: user.id,
            email: user.email,
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
            subscription_plan: parseFloat(paymentAmount) >= 800 ? 'Professional Annual' : 'Professional',
            payment_method: 'Cryptocurrency',
            tx_hash: verificationResult.txHash
          }
        });

        if (emailError) {
          logStep("Error sending welcome email", { error: emailError });
        } else {
          logStep("Welcome email sent successfully");
        }
      } catch (emailError) {
        logStep("Error invoking welcome email function", { error: emailError });
      }

      return new Response(JSON.stringify({
        success: true,
        message: "Payment verified on blockchain and subscription activated",
        verification: {
          tx_hash: verificationResult.txHash,
          actual_amount: verificationResult.actualAmount,
          verified_at: new Date().toISOString()
        },
        subscription: {
          status: 'active',
          plan: parseFloat(paymentAmount) >= 800 ? 'professional_annual' : 'professional',
          expires_at: subscriptionEnd.toISOString()
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      logStep("Payment verification failed - no matching blockchain transaction found");
      return new Response(JSON.stringify({
        success: false,
        message: "Payment not found on blockchain. Please ensure the transaction is confirmed and uses the correct amount and recipient address.",
        help: "Check that you sent exactly the specified amount to the correct address and wait for blockchain confirmation (usually 1-3 minutes)."
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in verify-crypto-payment", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});