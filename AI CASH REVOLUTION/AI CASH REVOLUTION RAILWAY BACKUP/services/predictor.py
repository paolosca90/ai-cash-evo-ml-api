"""
Prediction Service per predizione segnali con pesi ottimizzati
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple
import logging

from services.database import DatabaseService
from models.weight_optimizer import WeightOptimizer
from utils.config import Config

logger = logging.getLogger(__name__)

class PredictionService:
    """Servizio predizione segnali con pesi ML ottimizzati"""

    def __init__(self, db_service: DatabaseService, weight_optimizer: WeightOptimizer):
        self.db_service = db_service
        self.weight_optimizer = weight_optimizer

    def predict_signal(self, symbol: str, indicators: Dict[str, float]) -> Dict[str, any]:
        """
        Predice segnale usando pesi ottimizzati
        Args:
            symbol: Simbolo trading (es. 'EURUSD')
            indicators: Dizionario con valori indicatori tecnici
        Returns:
            Dizionario con predizione e confidence
        """
        try:
            # Recupera pesi correnti
            current_weights = self.db_service.get_current_weights()
            weights_dict = {w['indicator_name']: w['current_weight'] for w in current_weights}

            # Calcola score pesato
            weighted_score = self._calculate_weighted_score(indicators, weights_dict)

            # Determina segnale basato su score
            signal, confidence = self._determine_signal(weighted_score)

            # Calcola additional metrics
            trend_strength = self._calculate_trend_strength(indicators, weights_dict)
            momentum_score = self._calculate_momentum_score(indicators, weights_dict)
            volatility_adjustment = self._calculate_volatility_adjustment(indicators, weights_dict)

            # Risk assessment
            risk_level = self._assess_risk_level(indicators, weighted_score)

            prediction = {
                'signal': signal,
                'confidence': confidence,
                'weighted_score': weighted_score,
                'trend_strength': trend_strength,
                'momentum_score': momentum_score,
                'volatility_adjustment': volatility_adjustment,
                'risk_level': risk_level,
                'symbol': symbol,
                'indicators_used': list(indicators.keys()),
                'weights_applied': {k: weights_dict.get(k, 1.0) for k in indicators.keys()},
                'timestamp': pd.Timestamp.now().isoformat()
            }

            logger.info(f"Predizione completata per {symbol}: {signal} (confidence: {confidence:.2f})")
            return prediction

        except Exception as e:
            logger.error(f"Errore predizione segnale: {e}")
            return {
                'signal': 'HOLD',
                'confidence': 0.5,
                'error': str(e),
                'timestamp': pd.Timestamp.now().isoformat()
            }

    def _calculate_weighted_score(self, indicators: Dict[str, float], weights: Dict[str, float]) -> float:
        """Calcola score pesato basato su indicatori e pesi ML"""
        try:
            total_score = 0.0
            total_weight = 0.0

            # Trend indicators score
            trend_score = self._calculate_trend_score(indicators, weights)
            total_score += trend_score * 0.4
            total_weight += 0.4

            # Momentum indicators score
            momentum_score = self._calculate_momentum_score_raw(indicators, weights)
            total_score += momentum_score * 0.35
            total_weight += 0.35

            # Volatility indicators score
            volatility_score = self._calculate_volatility_score(indicators, weights)
            total_score += volatility_score * 0.15
            total_weight += 0.15

            # Volume indicators score
            volume_score = self._calculate_volume_score(indicators, weights)
            total_score += volume_score * 0.1
            total_weight += 0.1

            # Normalizza score finale
            final_score = total_score / total_weight if total_weight > 0 else 0.0

            return max(-1.0, min(1.0, final_score))  # Constrain to [-1, 1]

        except Exception as e:
            logger.error(f"Errore calcolo weighted score: {e}")
            return 0.0

    def _calculate_trend_score(self, indicators: Dict[str, float], weights: Dict[str, float]) -> float:
        """Calcola score trend"""
        score = 0.0
        weight_sum = 0.0

        # ADX trend strength
        if 'adx_value' in indicators:
            adx = indicators['adx_value']
            adx_weight = weights.get('adx_value', 1.0)
            # ADX > 25 indica trend forte
            trend_strength = min(1.0, (adx - 25) / 25) if adx > 25 else 0
            score += trend_strength * adx_weight
            weight_sum += adx_weight

        # EMA alignment
        if all(ind in indicators for ind in ['ema_12', 'ema_21', 'ema_50', 'entry_price']):
            ema_12 = indicators['ema_12']
            ema_21 = indicators['ema_21']
            ema_50 = indicators['ema_50']
            price = indicators['entry_price']

            ema_weight = (weights.get('ema_12', 1.0) + weights.get('ema_21', 1.0) + weights.get('ema_50', 1.0)) / 3

            # Trend alignment score
            if price > ema_12 > ema_21 > ema_50:  # Uptrend
                alignment_score = 1.0
            elif price < ema_12 < ema_21 < ema_50:  # Downtrend
                alignment_score = -1.0
            else:
                alignment_score = 0.0

            score += alignment_score * ema_weight
            weight_sum += ema_weight

        # VWAP position
        if all(ind in indicators for ind in ['vwap', 'entry_price']):
            vwap = indicators['vwap']
            price = indicators['entry_price']
            vwap_weight = weights.get('vwap', 1.0)

            vwap_position = (price - vwap) / vwap if vwap != 0 else 0
            vwap_score = np.tanh(vwap_position * 100)  # Normalize to [-1, 1]

            score += vwap_score * vwap_weight
            weight_sum += vwap_weight

        return score / weight_sum if weight_sum > 0 else 0.0

    def _calculate_momentum_score_raw(self, indicators: Dict[str, float], weights: Dict[str, float]) -> float:
        """Calcola score momentum grezzo"""
        score = 0.0
        weight_sum = 0.0

        # RSI momentum
        if 'rsi_value' in indicators:
            rsi = indicators['rsi_value']
            rsi_weight = weights.get('rsi_value', 1.0)

            # RSI momentum: 50-70 bullish, 30-50 bearish
            if rsi > 70:  # Overbought - bearish
                rsi_score = -0.5
            elif rsi > 50:  # Bullish momentum
                rsi_score = (rsi - 50) / 20
            elif rsi > 30:  # Bearish momentum
                rsi_score = (rsi - 50) / 20
            else:  # Oversold - bullish reversal potential
                rsi_score = 0.5

            score += rsi_score * rsi_weight
            weight_sum += rsi_weight

        # Stochastic momentum
        if all(ind in indicators for ind in ['stoch_k', 'stoch_d']):
            stoch_k = indicators['stoch_k']
            stoch_d = indicators['stoch_d']
            stoch_weight = (weights.get('stoch_k', 1.0) + weights.get('stoch_d', 1.0)) / 2

            # Stochastic crossover momentum
            if stoch_k > stoch_d and stoch_k < 80:  # Bullish crossover
                stoch_score = 0.7
            elif stoch_k < stoch_d and stoch_k > 20:  # Bearish crossover
                stoch_score = -0.7
            else:
                stoch_score = 0.0

            score += stoch_score * stoch_weight
            weight_sum += stoch_weight

        # MACD momentum
        if all(ind in indicators for ind in ['macd_line', 'macd_signal']):
            macd = indicators['macd_line']
            signal = indicators['macd_signal']
            macd_weight = (weights.get('macd_line', 1.0) + weights.get('macd_signal', 1.0)) / 2

            macd_diff = macd - signal
            macd_score = np.tanh(macd_diff * 1000)  # Normalize

            score += macd_score * macd_weight
            weight_sum += macd_weight

        # Price change momentum
        if 'price_change_pct' in indicators:
            price_change = indicators['price_change_pct']
            price_weight = weights.get('price_change_pct', 1.0)

            # Normalize price change to [-1, 1]
            price_score = np.tanh(price_change * 10)

            score += price_score * price_weight
            weight_sum += price_weight

        return score / weight_sum if weight_sum > 0 else 0.0

    def _calculate_volatility_score(self, indicators: Dict[str, float], weights: Dict[str, float]) -> float:
        """Calcola score volatilità"""
        score = 0.0
        weight_sum = 0.0

        # ATR volatility
        if 'atr_value' in indicators:
            atr = indicators['atr_value']
            atr_weight = weights.get('atr_value', 1.0)

            # Moderate volatility is good for trading
            if atr < 0.0005:  # Very low volatility
                atr_score = -0.3
            elif atr < 0.002:  # Good volatility
                atr_score = 0.5
            elif atr < 0.005:  # High volatility
                atr_score = 0.2
            else:  # Very high volatility
                atr_score = -0.5

            score += atr_score * atr_weight
            weight_sum += atr_weight

        # Bollinger Bands position
        if all(ind in indicators for ind in ['bollinger_upper', 'bollinger_lower', 'entry_price']):
            bb_upper = indicators['bollinger_upper']
            bb_lower = indicators['bollinger_lower']
            price = indicators['entry_price']
            bb_weight = (weights.get('bollinger_upper', 1.0) + weights.get('bollinger_lower', 1.0)) / 2

            bb_width = bb_upper - bb_lower
            bb_position = (price - bb_lower) / bb_width if bb_width > 0 else 0.5

            # Middle of bands is neutral, extremes are extreme
            if bb_position > 0.8:  # Near upper band - bearish
                bb_score = -0.6
            elif bb_position < 0.2:  # Near lower band - bullish
                bb_score = 0.6
            else:  # Middle bands - neutral
                bb_score = (0.5 - bb_position) * 0.5

            score += bb_score * bb_weight
            weight_sum += bb_weight

        # Volatility regime
        if 'volatility' in indicators:
            volatility = indicators['volatility']
            vol_weight = weights.get('volatility', 1.0)

            # Similar to ATR but more general
            if volatility < 0.001:
                vol_score = -0.2
            elif volatility < 0.003:
                vol_score = 0.3
            else:
                vol_score = -0.3

            score += vol_score * vol_weight
            weight_sum += vol_weight

        return score / weight_sum if weight_sum > 0 else 0.0

    def _calculate_volume_score(self, indicators: Dict[str, float], weights: Dict[str, float]) -> float:
        """Calcola score volume"""
        if 'volume_ma' not in indicators:
            return 0.0

        volume = indicators['volume_ma']
        volume_weight = weights.get('volume_ma', 1.0)

        # Volume confirmation (simple approach)
        # Higher volume generally confirms price moves
        if volume > 1.2:  # High volume
            volume_score = 0.3
        elif volume > 0.8:  # Normal volume
            volume_score = 0.1
        else:  # Low volume
            volume_score = -0.2

        return volume_score * volume_weight

    def _determine_signal(self, weighted_score: float) -> Tuple[str, float]:
        """Determina segnale e confidence basato su score pesato"""
        # Thresholds for signal determination
        if weighted_score > 0.3:
            signal = 'BUY'
            confidence = min(1.0, (weighted_score - 0.3) / 0.7 + 0.5)
        elif weighted_score < -0.3:
            signal = 'SELL'
            confidence = min(1.0, (abs(weighted_score) - 0.3) / 0.7 + 0.5)
        else:
            signal = 'HOLD'
            confidence = 0.5

        return signal, confidence

    def _calculate_trend_strength(self, indicators: Dict[str, float], weights: Dict[str, float]) -> float:
        """Calcola forza del trend"""
        trend_indicators = ['adx_value', 'ema_12', 'ema_21', 'ema_50', 'vwap']
        available_trend = [ind for ind in trend_indicators if ind in indicators]

        if not available_trend:
            return 0.0

        # Use ADX as primary trend strength indicator
        if 'adx_value' in indicators:
            adx = indicators['adx_value']
            return min(1.0, adx / 50)  # Normalize to 0-1

        return 0.5  # Default moderate strength

    def _calculate_momentum_score(self, indicators: Dict[str, float], weights: Dict[str, float]) -> float:
        """Calcola score momentum normalizzato"""
        momentum_score = self._calculate_momentum_score_raw(indicators, weights)
        return (momentum_score + 1) / 2  # Normalize to 0-1

    def _calculate_volatility_adjustment(self, indicators: Dict[str, float], weights: Dict[str, float]) -> float:
        """Calcola aggiustamento volatilità"""
        volatility_score = self._calculate_volatility_score(indicators, weights)
        return (volatility_score + 1) / 2  # Normalize to 0-1

    def _assess_risk_level(self, indicators: Dict[str, float], weighted_score: float) -> str:
        """Assess risk level based on indicators and score"""
        # High volatility = higher risk
        volatility_indicators = ['atr_value', 'volatility']
        high_volatility = any(
            indicators.get(ind, 0) > 0.005 for ind in volatility_indicators
        )

        # Extreme scores = higher risk
        extreme_score = abs(weighted_score) > 0.7

        # Conflicting indicators = higher risk
        trend_score = self._calculate_trend_score(indicators, weights)
        momentum_score = self._calculate_momentum_score_raw(indicators, weights)
        conflicting = np.sign(trend_score) != np.sign(momentum_score) and abs(trend_score) > 0.3 and abs(momentum_score) > 0.3

        if high_volatility or extreme_score or conflicting:
            return 'HIGH'
        elif abs(weighted_score) > 0.4:
            return 'MEDIUM'
        else:
            return 'LOW'