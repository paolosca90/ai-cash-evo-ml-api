/**
 * ML API Integration per generate-ai-signals
 * Chiama ML prediction service (locale o deploy)
 */

export interface MLPredictionRequest {
  symbol: string
  features: {
    close: number
    rsi: number
    ema12: number
    ema21: number
    ema50: number
    atr: number
    adx: number
    price?: number
    volume?: number
  }
}

export interface MLPredictionResponse {
  prediction: 'BUY' | 'SELL' | 'HOLD'
  confidence: number  // 0-100
  probabilities: {
    BUY: number
    SELL: number
    HOLD: number
  }
  model_available: boolean
}

// ML API URL (configurabile via env var)
const ML_API_URL = Deno.env.get('ML_API_URL') || 'http://localhost:8000'

/**
 * Chiama ML API per prediction
 * Se API non disponibile, ritorna null (usa fallback)
 */
export async function getMLPrediction(
  symbol: string,
  features: MLPredictionRequest['features']
): Promise<MLPredictionResponse | null> {
  try {
    const response = await fetch(`${ML_API_URL}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        symbol,
        features
      }),
      signal: AbortSignal.timeout(3000)  // Timeout 3s
    })

    if (!response.ok) {
      console.warn(`ML API returned ${response.status}`)
      return null
    }

    const prediction: MLPredictionResponse = await response.json()

    console.log(`   🤖 ML Prediction: ${prediction.prediction} @ ${prediction.confidence.toFixed(1)}%`)
    console.log(`   📊 Model Available: ${prediction.model_available}`)

    return prediction

  } catch (error) {
    // ML API non disponibile, usa fallback
    console.warn(`ML API unavailable: ${error.message}`)
    return null
  }
}

/**
 * Calcola confidence dinamica dagli indicatori tecnici
 * Usato come fallback se ML API non disponibile
 */
export function calculateTechnicalConfidence(
  signal: 'BUY' | 'SELL' | 'HOLD',
  features: {
    rsi: number
    ema12: number
    ema21: number
    ema50: number
    adx: number
    atr: number
    close: number
    regime?: string
  }
): number {
  let confidence = 50

  const { rsi, ema12, ema21, ema50, adx, atr, close, regime } = features

  // ADX (trend strength)
  if (adx > 35) {
    confidence += 15
  } else if (adx > 25) {
    confidence += 10
  } else if (adx < 15) {
    confidence -= 10
  }

  // RSI (momentum)
  const bullish = signal === 'BUY'

  if (bullish) {
    if (rsi < 30) confidence += 15  // Oversold
    else if (rsi < 45) confidence += 8
    else if (rsi > 70) confidence -= 10  // Overbought
  } else if (signal === 'SELL') {
    if (rsi > 70) confidence += 15  // Overbought
    else if (rsi > 55) confidence += 8
    else if (rsi < 30) confidence -= 10  // Oversold
  }

  // EMA alignment
  if (bullish && ema12 > ema50) {
    confidence += 10  // Strong uptrend
  } else if (!bullish && ema12 < ema50) {
    confidence += 10  // Strong downtrend
  }

  // Volatility (ATR)
  const atr_percent = (atr / close) * 100

  if (atr_percent >= 0.05 && atr_percent <= 0.15) {
    confidence += 8  // Optimal volatility
  } else if (atr_percent > 0.30) {
    confidence -= 10  // Too volatile
  } else if (atr_percent < 0.03) {
    confidence -= 8  // Too tight
  }

  // Market regime
  if (regime === 'UNCERTAIN') {
    confidence -= 5
  } else if (regime === 'TREND') {
    confidence += 5
  }

  // Cap confidence
  return Math.max(45, Math.min(85, confidence))
}
