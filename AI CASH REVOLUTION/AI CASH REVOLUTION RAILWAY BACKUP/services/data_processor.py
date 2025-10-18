"""
Data Processor per preparazione dati training LSTM
"""

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from typing import Tuple, List, Dict, Any
import logging

from services.database import DatabaseService

logger = logging.getLogger(__name__)

class DataProcessor:
    """Processore dati per training machine learning"""

    def __init__(self, db_service: DatabaseService):
        self.db_service = db_service

    def get_training_samples(self, start_date, end_date) -> List[Dict]:
        """Recupera samples per training dal database"""
        return self.db_service.get_training_samples(start_date, end_date)

    def prepare_lstm_data(self, training_data: List[Dict]) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, List[str]]:
        """
        Prepara dati per training LSTM
        Returns:
            X_train, y_train, X_val, y_val, feature_names
        """
        try:
            if not training_data:
                raise ValueError("Nessun dato training disponibile")

            # Converti a DataFrame
            df = pd.DataFrame(training_data)

            # Feature engineering
            df = self._feature_engineering(df)

            # Definisci feature e target
            feature_columns = [
                'adx_value', 'rsi_value', 'ema_12', 'ema_21', 'ema_50',
                'vwap', 'atr_value', 'bollinger_upper', 'bollinger_lower',
                'stoch_k', 'stoch_d', 'macd_line', 'macd_signal',
                'volume_ma', 'price_change_pct', 'volatility'
            ]

            # Filtra solo colonne disponibili
            available_features = [col for col in feature_columns if col in df.columns]

            if len(available_features) < 5:
                raise ValueError(f"Feature insufficienti: {len(available_features)}")

            # Features (X)
            X = df[available_features].fillna(0).values

            # Target (y) - basato su performance_score
            y = self._create_labels(df)

            # Split train/validation
            X_train, X_val, y_train, y_val = train_test_split(
                X, y, test_size=0.2, random_state=42, stratify=y
            )

            logger.info(f"Dati preparati: Train={len(X_train)}, Val={len(X_val)}, Features={len(available_features)}")

            return X_train, y_train, X_val, y_val, available_features

        except Exception as e:
            logger.error(f"Errore preparazione dati: {e}")
            raise

    def _feature_engineering(self, df: pd.DataFrame) -> pd.DataFrame:
        """Feature engineering sui dati grezzi"""
        try:
            # Calcola distanze SL/TP come ratio
            if all(col in df.columns for col in ['entry_price', 'stop_loss', 'take_profit']):
                df['sl_distance_pct'] = np.abs(df['stop_loss'] - df['entry_price']) / df['entry_price'] * 100
                df['tp_distance_pct'] = np.abs(df['take_profit'] - df['entry_price']) / df['entry_price'] * 100
                df['risk_reward_ratio'] = df['tp_distance_pct'] / df['sl_distance_pct']

            # Feature temporali
            if 'created_at' in df.columns:
                df['hour'] = pd.to_datetime(df['created_at']).dt.hour
                df['day_of_week'] = pd.to_datetime(df['created_at']).dt.dayofweek

            # Market session features
            if 'market_session' in df.columns:
                df['session_encoded'] = df['market_session'].astype('category').cat.codes

            # Trend direction encoding
            if 'trend_direction' in df.columns:
                df['trend_encoded'] = df['trend_direction'].astype('category').cat.codes

            # Volatility regime encoding
            if 'volatility_regime' in df.columns:
                df['volatility_regime_encoded'] = df['volatility_regime'].astype('category').cat.codes

            # Indicator interactions
            if all(col in df.columns for col in ['ema_12', 'ema_21']):
                df['ema_12_21_ratio'] = df['ema_12'] / df['ema_21']
                df['ema_12_21_diff'] = df['ema_12'] - df['ema_21']

            if all(col in df.columns for col in ['bollinger_upper', 'bollinger_lower']):
                df['bollinger_width'] = df['bollinger_upper'] - df['bollinger_lower']
                if 'entry_price' in df.columns:
                    df['bollinger_position'] = (df['entry_price'] - df['bollinger_lower']) / df['bollinger_width']

            # RSI zones
            if 'rsi_value' in df.columns:
                df['rsi_oversold'] = (df['rsi_value'] < 30).astype(int)
                df['rsi_overbought'] = (df['rsi_value'] > 70).astype(int)
                df['rsi_neutral'] = ((df['rsi_value'] >= 30) & (df['rsi_value'] <= 70)).astype(int)

            return df

        except Exception as e:
            logger.error(f"Errore feature engineering: {e}")
            return df

    def _create_labels(self, df: pd.DataFrame) -> np.ndarray:
        """Crea labels basati su performance_score e profit_loss"""
        try:
            labels = []

            for _, row in df.iterrows():
                performance_score = row.get('performance_score', 0)
                profit_loss = row.get('profit_loss', 0)

                # Classi: BUY (1), HOLD (0), SELL (-1)
                if performance_score > 0.3 and profit_loss > 0:
                    labels.append('BUY')
                elif performance_score < -0.3 and profit_loss < 0:
                    labels.append('SELL')
                else:
                    labels.append('HOLD')

            return np.array(labels)

        except Exception as e:
            logger.error(f"Errore creazione labels: {e}")
            # Fallback a labels neutrali
            return np.array(['HOLD'] * len(df))

    def validate_data_quality(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Valida qualità dati e ritorna metriche"""
        try:
            quality_metrics = {
                'total_samples': len(df),
                'valid_samples': 0,
                'missing_values': {},
                'outliers': {},
                'data_distribution': {}
            }

            if df.empty:
                return quality_metrics

            # Count valid samples (no NaN in critical columns)
            critical_columns = ['signal_type', 'entry_price', 'stop_loss', 'take_profit', 'performance_score']
            valid_mask = df[critical_columns].notna().all(axis=1)
            quality_metrics['valid_samples'] = valid_mask.sum()

            # Missing values analysis
            missing_counts = df.isnull().sum()
            quality_metrics['missing_values'] = missing_counts[missing_counts > 0].to_dict()

            # Outliers detection for numeric columns
            numeric_columns = df.select_dtypes(include=[np.number]).columns
            for col in numeric_columns:
                if col in df.columns:
                    Q1 = df[col].quantile(0.25)
                    Q3 = df[col].quantile(0.75)
                    IQR = Q3 - Q1
                    outliers = ((df[col] < (Q1 - 1.5 * IQR)) | (df[col] > (Q3 + 1.5 * IQR))).sum()
                    if outliers > 0:
                        quality_metrics['outliers'][col] = outliers

            # Signal distribution
            if 'signal_type' in df.columns:
                quality_metrics['data_distribution']['signal_types'] = df['signal_type'].value_counts().to_dict()

            # Performance score distribution
            if 'performance_score' in df.columns:
                score_stats = df['performance_score'].describe()
                quality_metrics['data_distribution']['performance_score'] = {
                    'mean': score_stats['mean'],
                    'std': score_stats['std'],
                    'min': score_stats['min'],
                    'max': score_stats['max']
                }

            return quality_metrics

        except Exception as e:
            logger.error(f"Errore validazione qualità dati: {e}")
            return {}

    def clean_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Pulizia dati rimuovendo outlier e valori mancanti"""
        try:
            if df.empty:
                return df

            original_len = len(df)

            # Rimuovi righe con valori critici mancanti
            critical_columns = ['signal_type', 'entry_price', 'stop_loss', 'take_profit']
            df_clean = df.dropna(subset=critical_columns)

            # Rimuovi outlier estremi per indicatori tecnici
            numeric_columns = ['adx_value', 'rsi_value', 'ema_12', 'ema_21', 'ema_50',
                              'vwap', 'atr_value', 'stoch_k', 'stoch_d',
                              'macd_line', 'macd_signal', 'volume_ma']

            for col in numeric_columns:
                if col in df_clean.columns:
                    Q1 = df_clean[col].quantile(0.01)  # Use 1% instead of 25% for less aggressive filtering
                    Q3 = df_clean[col].quantile(0.99)  # Use 99% instead of 75%
                    df_clean = df_clean[(df_clean[col] >= Q1) & (df_clean[col] <= Q3)]

            # Rimuovi segnali con SL/TP irragionevoli
            if all(col in df_clean.columns for col in ['entry_price', 'stop_loss', 'take_profit']):
                # SL/TP troppo vicini o troppo lontani
                sl_distance = np.abs(df_clean['stop_loss'] - df_clean['entry_price']) / df_clean['entry_price']
                tp_distance = np.abs(df_clean['take_profit'] - df_clean['entry_price']) / df_clean['entry_price']

                # Filtra distanze reasonable (0.1% - 5%)
                reasonable_mask = (sl_distance >= 0.001) & (sl_distance <= 0.05) & \
                                 (tp_distance >= 0.001) & (tp_distance <= 0.05)

                df_clean = df_clean[reasonable_mask]

            cleaned_len = len(df_clean)
            logger.info(f"Data cleaning: {original_len} -> {cleaned_len} samples ({cleaned_len/original_len:.1%} retained)")

            return df_clean

        except Exception as e:
            logger.error(f"Errore pulizia dati: {e}")
            return df

    def create_sequences(self, X: np.ndarray, y: np.ndarray, sequence_length: int = 20) -> Tuple[np.ndarray, np.ndarray]:
        """Crea sequenze per LSTM"""
        if len(X) <= sequence_length:
            raise ValueError(f"Dati insufficienti per sequence_length={sequence_length}")

        sequences = []
        labels = []

        for i in range(len(X) - sequence_length):
            sequences.append(X[i:i + sequence_length])
            labels.append(y[i + sequence_length])

        return np.array(sequences), np.array(labels)