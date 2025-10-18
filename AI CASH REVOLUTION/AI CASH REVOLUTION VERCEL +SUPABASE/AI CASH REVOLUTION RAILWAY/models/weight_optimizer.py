"""
Weight Optimizer per calcolo pesi ottimizzati indicatori tecnici
basato su risultati training LSTM e feature importance
"""

import numpy as np
import pandas as pd
import shap
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
import logging
from datetime import datetime
from typing import Dict, List, Optional

from utils.config import Config
from services.database import DatabaseService

logger = logging.getLogger(__name__)

class WeightOptimizer:
    """Ottimizzatore pesi indicatori basato su ML e performance storica"""

    def __init__(self, config: Config, db_service: DatabaseService):
        self.config = config
        self.db_service = db_service

    def optimize_weights(self,
                        training_data: List[Dict],
                        model_metrics: Dict,
                        feature_names: List[str]) -> Dict[str, float]:
        """
        Ottimizza pesi indicatori basandosi su:
        1. Feature importance dal modello LSTM
        2. Performance storica di ogni indicatore
        3. Correlazioni tra indicatori
        4. Stabilità nel tempo
        """
        try:
            logger.info("Inizio ottimizzazione pesi indicatori")

            # 1. Recupera pesi correnti
            current_weights = self._get_current_weights_dict()

            # 2. Estrai feature importance dal modello
            lstm_importance = model_metrics.get('feature_importance', {})

            # 3. Calcola performance storica per indicatore
            historical_performance = self._calculate_historical_performance(training_data)

            # 4. Calcola correlazioni tra indicatori
            correlation_matrix = self._calculate_indicator_correlations(training_data)

            # 5. Analizza stabilità pesi nel tempo
            weight_stability = self._analyze_weight_stability()

            # 6. Combina tutte le metriche per pesi ottimizzati
            optimized_weights = self._combine_weight_factors(
                current_weights=current_weights,
                lstm_importance=lstm_importance,
                historical_performance=historical_performance,
                correlation_matrix=correlation_matrix,
                weight_stability=weight_stability,
                feature_names=feature_names
            )

            # 7. Applica constraints e normalizzazione
            final_weights = self._apply_weight_constraints(optimized_weights)

            logger.info(f"Ottimizzazione completata per {len(final_weights)} indicatori")
            return final_weights

        except Exception as e:
            logger.error(f"Errore ottimizzazione pesi: {e}")
            return {}

    def _get_current_weights_dict(self) -> Dict[str, float]:
        """Recupera pesi correnti come dizionario"""
        try:
            weights_data = self.db_service.get_current_weights()
            return {w['indicator_name']: w['current_weight'] for w in weights_data}
        except Exception as e:
            logger.error(f"Errore recupero pesi correnti: {e}")
            return {}

    def _calculate_historical_performance(self, training_data: List[Dict]) -> Dict[str, float]:
        """Calcola performance storica per ogni indicatore"""
        try:
            if not training_data:
                return {}

            df = pd.DataFrame(training_data)

            # Indicatori disponibili
            indicators = [
                'adx_value', 'rsi_value', 'ema_12', 'ema_21', 'ema_50',
                'vwap', 'atr_value', 'bollinger_upper', 'bollinger_lower',
                'stoch_k', 'stoch_d', 'macd_line', 'macd_signal',
                'volume_ma', 'price_change_pct', 'volatility'
            ]

            performance_scores = {}

            for indicator in indicators:
                if indicator in df.columns:
                    # Calcola correlazione tra indicatore e performance_score
                    valid_data = df[[indicator, 'performance_score']].dropna()
                    if len(valid_data) > 10:
                        correlation = valid_data[indicator].corr(valid_data['performance_score'])
                        # Normalizza correlazione a score 0-1
                        performance_scores[indicator] = max(0, (correlation + 1) / 2)
                    else:
                        performance_scores[indicator] = 0.5  # Default neutrale

            return performance_scores

        except Exception as e:
            logger.error(f"Errore calcolo performance storica: {e}")
            return {}

    def _calculate_indicator_correlations(self, training_data: List[Dict]) -> Dict[str, Dict[str, float]]:
        """Calcola matrice correlazioni tra indicatori"""
        try:
            if not training_data:
                return {}

            df = pd.DataFrame(training_data)
            indicators = [
                'adx_value', 'rsi_value', 'ema_12', 'ema_21', 'ema_50',
                'vwap', 'atr_value', 'bollinger_upper', 'bollinger_lower',
                'stoch_k', 'stoch_d', 'macd_line', 'macd_signal',
                'volume_ma', 'price_change_pct', 'volatility'
            ]

            # Filtra solo colonne indicatori disponibili
            available_indicators = [ind for ind in indicators if ind in df.columns]
            correlation_df = df[available_indicators].dropna()

            if len(correlation_df) < 10:
                return {}

            correlation_matrix = correlation_df.corr()

            # Converti a dizionario
            correlation_dict = {}
            for ind1 in available_indicators:
                correlation_dict[ind1] = {}
                for ind2 in available_indicators:
                    correlation_dict[ind1][ind2] = correlation_matrix.loc[ind1, ind2]

            return correlation_dict

        except Exception as e:
            logger.error(f"Errore calcolo correlazioni: {e}")
            return {}

    def _analyze_weight_stability(self) -> Dict[str, float]:
        """Analizza stabilità pesi nel tempo"""
        try:
            # Recupera storico pesi recenti
            # Qui potremmo implementare logica più complessa con time series
            # Per ora usiamo valori default basati su categoria

            stability_scores = {
                # Trend indicators - alta stabilità
                'adx_value': 0.8,
                'ema_12': 0.9,
                'ema_21': 0.9,
                'ema_50': 0.9,
                'vwap': 0.85,

                # Momentum indicators - media stabilità
                'rsi_value': 0.7,
                'stoch_k': 0.6,
                'stoch_d': 0.6,
                'macd_line': 0.7,
                'macd_signal': 0.7,
                'price_change_pct': 0.5,

                # Volatility indicators - media stabilità
                'atr_value': 0.75,
                'bollinger_upper': 0.65,
                'bollinger_lower': 0.65,
                'volatility': 0.6,

                # Volume indicators - bassa stabilità
                'volume_ma': 0.5
            }

            return stability_scores

        except Exception as e:
            logger.error(f"Errore analisi stabilità: {e}")
            return {}

    def _combine_weight_factors(self,
                              current_weights: Dict[str, float],
                              lstm_importance: Dict[str, float],
                              historical_performance: Dict[str, float],
                              correlation_matrix: Dict[str, Dict[str, float]],
                              weight_stability: Dict[str, float],
                              feature_names: List[str]) -> Dict[str, float]:
        """Combina tutti i fattori per calcolo pesi ottimizzati"""

        optimized_weights = {}

        for indicator in feature_names:
            if indicator not in current_weights:
                continue

            # Pesi per ogni fattore
            factors = {
                'current_weight': current_weights.get(indicator, 1.0),
                'lstm_importance': lstm_importance.get(indicator, 0.5),
                'historical_performance': historical_performance.get(indicator, 0.5),
                'weight_stability': weight_stability.get(indicator, 0.5)
            }

            # Pesi di combinazione (ajustabili)
            combination_weights = {
                'current_weight': 0.3,  # Mantenimento stabilità
                'lstm_importance': 0.35,  # Importanza modello
                'historical_performance': 0.25,  # Performance storica
                'weight_stability': 0.1   # Stabilità nel tempo
            }

            # Calcolo peso combinato
            combined_weight = sum(
                factors[factor] * combination_weights[factor]
                for factor in factors
            )

            # Applica correzione basata su correlazioni
            correlation_penalty = self._calculate_correlation_penalty(
                indicator, correlation_matrix, optimized_weights
            )

            final_weight = combined_weight * (1 - correlation_penalty)

            # Assicura che il peso sia nel range [0.1, 2.0]
            final_weight = max(0.1, min(2.0, final_weight))

            optimized_weights[indicator] = final_weight

        return optimized_weights

    def _calculate_correlation_penalty(self,
                                     indicator: str,
                                     correlation_matrix: Dict[str, Dict[str, float]],
                                     current_weights: Dict[str, float]) -> float:
        """Calcola penalità per correlazioni alte tra indicatori"""
        if not correlation_matrix or indicator not in correlation_matrix:
            return 0.0

        penalty = 0.0
        threshold = 0.8  # Soglia correlazione alta

        for other_indicator, other_weight in current_weights.items():
            if other_indicator == indicator:
                continue

            correlation = correlation_matrix[indicator].get(other_indicator, 0)
            if abs(correlation) > threshold:
                # Penalità proporzionale alla correlazione e peso altro indicatore
                penalty += (abs(correlation) - threshold) * other_weight * 0.1

        return min(0.3, penalty)  # Massimo 30% penalità

    def _apply_weight_constraints(self, weights: Dict[str, float]) -> Dict[str, float]:
        """Applica constraints e normalizzazione ai pesi"""
        if not weights:
            return {}

        # 1. Constraints per categoria
        category_constraints = {
            'trend': {'min': 0.8, 'max': 1.5},
            'momentum': {'min': 0.6, 'max': 1.4},
            'volatility': {'min': 0.7, 'max': 1.3},
            'volume': {'min': 0.5, 'max': 1.2}
        }

        # 2. Mappa indicatori a categorie
        indicator_categories = {
            'adx_value': 'trend',
            'ema_12': 'trend',
            'ema_21': 'trend',
            'ema_50': 'trend',
            'vwap': 'trend',

            'rsi_value': 'momentum',
            'stoch_k': 'momentum',
            'stoch_d': 'momentum',
            'macd_line': 'momentum',
            'macd_signal': 'momentum',
            'price_change_pct': 'momentum',

            'atr_value': 'volatility',
            'bollinger_upper': 'volatility',
            'bollinger_lower': 'volatility',
            'volatility': 'volatility',

            'volume_ma': 'volume'
        }

        # 3. Applica constraints per categoria
        constrained_weights = {}
        for indicator, weight in weights.items():
            category = indicator_categories.get(indicator, 'trend')
            constraint = category_constraints.get(category, {'min': 0.5, 'max': 1.5})

            constrained_weight = max(constraint['min'], min(constraint['max'], weight))
            constrained_weights[indicator] = constrained_weight

        # 4. Normalizzazione finale per mantenere somma pesi costante
        total_weight = sum(constrained_weights.values())
        target_total = len(constrained_weights) * 1.0  # Target somma = numero indicatori

        if total_weight > 0:
            normalization_factor = target_total / total_weight
            final_weights = {
                ind: weight * normalization_factor
                for ind, weight in constrained_weights.items()
            }
        else:
            final_weights = constrained_weights

        return final_weights

    def calculate_weight_changes(self,
                               old_weights: Dict[str, float],
                               new_weights: Dict[str, float]) -> Dict[str, Dict[str, float]]:
        """Calcola cambiamenti pesi per report"""
        changes = {}

        for indicator in new_weights:
            old_weight = old_weights.get(indicator, 1.0)
            new_weight = new_weights[indicator]

            absolute_change = new_weight - old_weight
            percentage_change = (absolute_change / old_weight) * 100 if old_weight != 0 else 0

            changes[indicator] = {
                'old_weight': old_weight,
                'new_weight': new_weight,
                'absolute_change': absolute_change,
                'percentage_change': percentage_change
            }

        return changes

    def validate_weights(self, weights: Dict[str, float]) -> bool:
        """Valida pesi calcolati"""
        if not weights:
            return False

        # Check range pesi
        for weight in weights.values():
            if weight < 0.1 or weight > 2.0:
                logger.warning(f"Peso fuori range: {weight}")
                return False

        # Check numero indicatori
        if len(weights) < 5:
            logger.warning("Numero indicatori insufficiente")
            return False

        return True