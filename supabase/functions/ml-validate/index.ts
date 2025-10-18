/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ML Validation Edge Function
 * Validates classic trading signals with TensorFlow.js ML models
 * Returns ML confidence, uncertainty, and constraints
 */

// @ts-expect-error - Remote module provided by Deno runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-expect-error - Deno allows importing .ts extensions directly
import { corsHeaders } from '../_shared/cors.ts';

// ML Validation Response
interface MLValidationResponse {
  mlAction: 'BUY' | 'SELL' | 'HOLD';
  mlConfidence: number;
  uncertainty: {
    epistemic: number;
    aleatoric: number;
    total: number;
  };
  constraints: Array<{
    type: string;
    severity: string;
    message: string;
  }>;
  agreement: boolean;
  recommendedAction: 'BOOST' | 'MAINTAIN' | 'REDUCE' | 'BLOCK';
  adjustmentFactor: number;
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { symbol, marketData, classicSignal } = await req.json();

    console.log(`🤖 ML Validation for ${symbol} - Classic: ${classicSignal.type} (${classicSignal.confidence}%)`);

    // Build feature vector from market data
    const features = buildFeatureVector(marketData, classicSignal);

    // Call Python ML service or use simplified logic
    // For now, use simplified validation logic
    const mlValidation = await validateWithML(features, classicSignal);

    console.log(`✅ ML Validation: ${mlValidation.mlAction} (${mlValidation.mlConfidence}%) - ${mlValidation.recommendedAction}`);

    return new Response(
      JSON.stringify(mlValidation),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ ML Validation error:', error);

    return new Response(
      JSON.stringify({
        error: 'ML validation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        // Fallback: maintain classic signal
        mlAction: 'HOLD',
        mlConfidence: 0,
        uncertainty: { epistemic: 1, aleatoric: 1, total: 1 },
        constraints: [],
        agreement: false,
        recommendedAction: 'MAINTAIN',
        adjustmentFactor: 1.0
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

/**
 * Build feature vector from market data
 */
function buildFeatureVector(marketData: any, classicSignal: any): number[] {
  const features: number[] = [];

  // Price features
  features.push(marketData.price || 0);
  features.push(marketData.open || 0);
  features.push(marketData.high || 0);
  features.push(marketData.low || 0);

  // Technical indicators
  features.push(marketData.rsi || 50);
  features.push(marketData.macd || 0);
  features.push(marketData.macd_signal || 0);
  features.push(marketData.atr || 0);
  features.push(marketData.sma_20 || marketData.price || 0);
  features.push(marketData.ema_20 || marketData.price || 0);

  // Volume
  features.push(marketData.volume || 0);
  features.push(marketData.avg_volume || 0);

  // Classic signal features
  features.push(classicSignal.confidence || 0);
  features.push(classicSignal.type === 'BUY' ? 1 : classicSignal.type === 'SELL' ? -1 : 0);

  // Normalize to 50 features (pad with 0)
  while (features.length < 50) {
    features.push(0);
  }

  return features.slice(0, 50);
}

/**
 * Validate signal with ML logic
 * TODO: Replace with actual TensorFlow.js inference when models are server-ready
 */
async function validateWithML(
  features: number[],
  classicSignal: any
): Promise<MLValidationResponse> {

  // Simplified ML logic (replace with actual inference)
  const rsi = features[4];
  const macd = features[5];
  const macdSignal = features[6];
  const classicConfidence = features[12];
  const classicDirection = features[13];

  // ML decision logic
  let mlAction: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
  let mlConfidence = 50;
  const constraints: Array<{type: string; severity: string; message: string}> = [];

  // RSI-based ML signal
  if (rsi < 30) {
    mlAction = 'BUY';
    mlConfidence = 70 + (30 - rsi);
  } else if (rsi > 70) {
    mlAction = 'SELL';
    mlConfidence = 70 + (rsi - 70);
  }

  // MACD confirmation
  if (macd > macdSignal && mlAction !== 'SELL') {
    mlAction = 'BUY';
    mlConfidence = Math.min(95, mlConfidence + 10);
  } else if (macd < macdSignal && mlAction !== 'BUY') {
    mlAction = 'SELL';
    mlConfidence = Math.min(95, mlConfidence + 10);
  }

  // Uncertainty estimation
  const uncertainty = {
    epistemic: 0.2,  // Model uncertainty
    aleatoric: 0.15,  // Data uncertainty
    total: 0.25
  };

  // Constraints checking
  if (rsi > 80 || rsi < 20) {
    constraints.push({
      type: 'EXTREME_RSI',
      severity: 'high',
      message: `RSI at extreme level: ${rsi.toFixed(1)}`
    });
  }

  // Agreement analysis
  const agreement = mlAction === classicSignal.type;

  // Recommendation
  let recommendedAction: 'BOOST' | 'MAINTAIN' | 'REDUCE' | 'BLOCK' = 'MAINTAIN';
  let adjustmentFactor = 1.0;

  if (agreement) {
    if (uncertainty.total < 0.3 && constraints.length === 0) {
      recommendedAction = 'BOOST';
      adjustmentFactor = 1.15;  // +15% confidence
    } else {
      recommendedAction = 'MAINTAIN';
      adjustmentFactor = 1.0;
    }
  } else {
    // Disagreement
    if (classicConfidence > 80 && uncertainty.total > 0.5) {
      recommendedAction = 'REDUCE';
      adjustmentFactor = 0.8;  // -20% confidence
    } else if (mlConfidence > 80 && classicConfidence < 70) {
      recommendedAction = 'BOOST';
      adjustmentFactor = 1.1;  // +10% confidence, but change action
    } else {
      recommendedAction = 'BLOCK';
      adjustmentFactor = 0.5;  // -50% confidence → likely HOLD
    }
  }

  return {
    mlAction,
    mlConfidence,
    uncertainty,
    constraints,
    agreement,
    recommendedAction,
    adjustmentFactor
  };
}
