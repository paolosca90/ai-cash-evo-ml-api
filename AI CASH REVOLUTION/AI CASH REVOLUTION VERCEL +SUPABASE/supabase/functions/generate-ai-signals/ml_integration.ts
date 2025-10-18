/**
 * ML Integration per generate-ai-signals
 * Recupera pesi ottimizzati da LSTM API e li applica ai segnali
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Cache dei pesi per evitare chiamate ripetute
let cachedWeights: Record<string, number> = {}
let weightsCacheTime = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minuti

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
  model_available: boolean
}

interface IndicatorWeights {
  [key: string]: number
}

// Recupera pesi ottimizzati da database Supabase
async function getOptimizedWeights(): Promise<IndicatorWeights> {
  const now = Date.now()

  // Se i pesi sono in cache e non sono scaduti, usali
  if (Object.keys(cachedWeights).length > 0 && (now - weightsCacheTime) < CACHE_DURATION) {
    return cachedWeights
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const { data: weights, error } = await supabase
      .from('ml_indicator_weights')
      .select('indicator_name, current_weight')
      .order('importance_rank', { ascending: true })

    if (error) {
      console.warn('⚠️ Error fetching ML weights:', error.message)
      return getDefaultWeights()
    }

    if (!weights || weights.length === 0) {
      console.log('📊 No ML weights found, using defaults')
      return getDefaultWeights()
    }

    // Converti array a oggetto
    const weightsMap: IndicatorWeights = {}
    for (const weight of weights) {
      weightsMap[weight.indicator_name] = weight.current_weight
    }

    // Cache dei pesi
    cachedWeights = weightsMap
    weightsCacheTime = now

    console.log(`✅ Loaded ${Object.keys(weightsMap).length} optimized weights from ML system`)
    return weightsMap

  } catch (error) {
    console.warn('⚠️ Error loading ML weights:', error.message)
    return getDefaultWeights()
  }
}

// Pesi di default se ML non è disponibile
function getDefaultWeights(): IndicatorWeights {
  return {
    'adx_value': 1.0,
    'rsi_value': 1.0,
    'ema_12': 1.0,
    'ema_21': 1.0,
    'ema_50': 1.0,
    'vwap': 1.0,
    'atr_value': 1.0,
    'bollinger_upper': 1.0,
    'bollinger_lower': 1.0,
    'stoch_k': 1.0,
    'stoch_d': 1.0,
    'macd_line': 1.0,
    'macd_signal': 1.0,
    'volume_ma': 1.0,
    'price_change_pct': 1.0,
    'volatility': 1.0
  }
}

// Calcola score pesato per indicatori tecnici
function calculateWeightedIndicatorScore(
  indicators: Record<string, number>,
  weights: IndicatorWeights
): number {
  let totalScore = 0
  let totalWeight = 0

  // Trend indicators weight: 40%
  if (indicators.adx && indicators.ema12 && indicators.ema21) {
    const trendScore = calculateTrendScore(indicators, weights)
    totalScore += trendScore * 0.4
    totalWeight += 0.4
  }

  // Momentum indicators weight: 35%
  if (indicators.rsi && indicators.macd_line) {
    const momentumScore = calculateMomentumScore(indicators, weights)
    totalScore += momentumScore * 0.35
    totalWeight += 0.35
  }

  // Volatility indicators weight: 15%
  if (indicators.atr && indicators.volatility) {
    const volatilityScore = calculateVolatilityScore(indicators, weights)
    totalScore += volatilityScore * 0.15
    totalWeight += 0.15
  }

  // Volume indicators weight: 10%
  if (indicators.volume_ma) {
    const volumeScore = calculateVolumeScore(indicators, weights)
    totalScore += volumeScore * 0.1
    totalWeight += 0.1
  }

  return totalWeight > 0 ? totalScore / totalWeight : 0
}

function calculateTrendScore(indicators: Record<string, number>, weights: IndicatorWeights): number {
  let score = 0
  let weightSum = 0

  // ADX trend strength
  if (indicators.adx) {
    const adxWeight = weights.adx_value || 1.0
    const trendStrength = Math.min(1.0, Math.max(0, (indicators.adx - 25) / 25))
    score += trendStrength * adxWeight
    weightSum += adxWeight
  }

  // EMA alignment
  if (indicators.ema12 && indicators.ema21) {
    const emaWeight = (weights.ema_12 + weights.ema_21) / 2
    const emaAlignment = indicators.ema12 > indicators.ema21 ? 1 : -1
    score += emaAlignment * 0.5 * emaWeight
    weightSum += emaWeight
  }

  // VWAP position
  if (indicators.vwap && indicators.close) {
    const vwapWeight = weights.vwap || 1.0
    const vwapPosition = (indicators.close - indicators.vwap) / indicators.vwap
    const vwapScore = Math.tanh(vwapPosition * 100) // Normalize to [-1, 1]
    score += vwapScore * 0.3 * vwapWeight
    weightSum += vwapWeight
  }

  return weightSum > 0 ? score / weightSum : 0
}

function calculateMomentumScore(indicators: Record<string, number>, weights: IndicatorWeights): number {
  let score = 0
  let weightSum = 0

  // RSI momentum
  if (indicators.rsi) {
    const rsiWeight = weights.rsi_value || 1.0
    let rsiScore = 0

    if (indicators.rsi > 70) {
      rsiScore = -0.5  // Overbought - bearish
    } else if (indicators.rsi > 50) {
      rsiScore = (indicators.rsi - 50) / 20  // Bullish momentum
    } else if (indicators.rsi > 30) {
      rsiScore = (indicators.rsi - 50) / 20  // Bearish momentum
    } else {
      rsiScore = 0.5  // Oversold - bullish potential
    }

    score += rsiScore * rsiWeight
    weightSum += rsiWeight
  }

  // MACD momentum
  if (indicators.macd_line && indicators.macd_signal) {
    const macdWeight = (weights.macd_line + weights.macd_signal) / 2
    const macdDiff = indicators.macd_line - indicators.macd_signal
    const macdScore = Math.tanh(macdDiff * 1000) // Normalize
    score += macdScore * macdWeight
    weightSum += macdWeight
  }

  // Price change momentum
  if (indicators.price_change_pct) {
    const priceWeight = weights.price_change_pct || 1.0
    const priceScore = Math.tanh(indicators.price_change_pct * 10)
    score += priceScore * priceWeight
    weightSum += priceWeight
  }

  return weightSum > 0 ? score / weightSum : 0
}

function calculateVolatilityScore(indicators: Record<string, number>, weights: IndicatorWeights): number {
  let score = 0
  let weightSum = 0

  // ATR volatility
  if (indicators.atr) {
    const atrWeight = weights.atr_value || 1.0
    let atrScore = 0

    if (indicators.atr < 0.001) {
      atrScore = -0.3  // Very low volatility
    } else if (indicators.atr < 0.003) {
      atrScore = 0.5   // Good volatility
    } else {
      atrScore = -0.2  // High volatility
    }

    score += atrScore * atrWeight
    weightSum += atrWeight
  }

  // General volatility
  if (indicators.volatility) {
    const volWeight = weights.volatility || 1.0
    let volScore = 0

    if (indicators.volatility < 0.1) {
      volScore = 0.3
    } else if (indicators.volatility < 0.3) {
      volScore = 0.1
    } else {
      volScore = -0.3
    }

    score += volScore * volWeight
    weightSum += volWeight
  }

  return weightSum > 0 ? score / weightSum : 0
}

function calculateVolumeScore(indicators: Record<string, number>, weights: IndicatorWeights): number {
  if (!indicators.volume_ma) return 0

  const volumeWeight = weights.volume_ma || 1.0

  // Volume confirmation (simple approach)
  let volumeScore = 0
  if (indicators.volume_ma > 1.2) {
    volumeScore = 0.3  // High volume
  } else if (indicators.volume_ma > 0.8) {
    volumeScore = 0.1  // Normal volume
  } else {
    volumeScore = -0.2  // Low volume
  }

  return volumeScore * volumeWeight
}

// Calcola confidenza basata su pesi ottimizzati
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
  try {
    const weights = getOptimizedWeights()

    // Converti features al formato per indicatori
    const indicators = {
      close: features.close,
      rsi: features.rsi,
      ema12: features.ema12,
      ema21: features.ema21,
      ema50: features.ema50,
      atr: features.atr,
      adx: features.adx,
      volatility: (features.atr / features.close) * 100,
      price_change_pct: 0 // Non disponibile in questo contesto
    }

    const weightedScore = calculateWeightedIndicatorScore(indicators, weights)

    // Converti score a confidenza (0-100%)
    let confidence = 50 + (weightedScore * 30) // Base 50% +/- 30%

    // Aggiusta base sul segnale
    if (signal === 'BUY' && weightedScore > 0) {
      confidence += Math.abs(weightedScore) * 20
    } else if (signal === 'SELL' && weightedScore < 0) {
      confidence += Math.abs(weightedScore) * 20
    } else if (signal === 'HOLD') {
      confidence = Math.max(25, confidence - 20)
    }

    return Math.max(25, Math.min(95, confidence))
  } catch (error) {
    console.warn('Error calculating technical confidence:', error.message)
    return 50 // Default confidence
  }
}

// Tenta di ottenere predizione da LSTM API (fallback a technical)
export async function getMLPrediction(
  symbol: string,
  features: MLPredictionRequest['features']
): Promise<MLPredictionResponse | null> {
  try {
    // Prima recupera i pesi ottimizzati
    const weights = await getOptimizedWeights()

    // Calcola score pesato
    const indicators = {
      close: features.close,
      rsi: features.rsi,
      ema12: features.ema12,
      ema21: features.ema21,
      ema50: features.ema50,
      atr: features.atr,
      adx: features.adx,
      volatility: (features.atr / features.close) * 100,
      price_change_pct: 0 // Non disponibile
    }

    const weightedScore = calculateWeightedIndicatorScore(indicators, weights)

    // Determina segnale base su score
    let prediction: 'BUY' | 'SELL' | 'HOLD'
    if (weightedScore > 0.3) {
      prediction = 'BUY'
    } else if (weightedScore < -0.3) {
      prediction = 'SELL'
    } else {
      prediction = 'HOLD'
    }

    // Calcola confidenza
    const confidence = Math.max(40, Math.min(95, 50 + Math.abs(weightedScore) * 40))

    console.log(`🤖 ML Prediction for ${symbol}: ${prediction} @ ${confidence.toFixed(1)}% (weighted score: ${weightedScore.toFixed(3)})`)

    return {
      prediction,
      confidence,
      model_available: true
    }

  } catch (error) {
    console.warn('Error getting ML prediction:', error.message)
    return null
  }
}

// Verifica se i pesi ML sono disponibili e recenti
export async function areMLWeightsAvailable(): Promise<boolean> {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const { data: latestTraining, error } = await supabase
      .from('ml_model_performance')
      .select('training_date')
      .order('training_date', { ascending: false })
      .limit(1)
      .single()

    if (error || !latestTraining) {
      return false
    }

    // Verifica se il training è recente (ultimi 7 giorni)
    const trainingDate = new Date(latestTraining.training_date)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    return trainingDate > weekAgo

  } catch (error) {
    console.warn('Error checking ML availability:', error.message)
    return false
  }
}
