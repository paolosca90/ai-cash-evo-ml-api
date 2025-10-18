"""
LSTM Trainer per ottimizzazione pesi indicatori tecnici
"""

import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout, BatchNormalization
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
import joblib
import json
import logging
from datetime import datetime
from typing import Tuple, Dict, List, Optional

from utils.config import Config

logger = logging.getLogger(__name__)

class LSTMTrainer:
    """Trainer per reti neurali LSTM per ottimizzazione pesi indicatori"""

    def __init__(self, config: Config):
        self.config = config
        self.model = None
        self.scaler = StandardScaler()
        self.label_encoder = LabelEncoder()
        self.feature_names = []

    def prepare_sequences(self, X: np.ndarray, y: np.ndarray, sequence_length: int = 20) -> Tuple[np.ndarray, np.ndarray]:
        """
        Prepara sequenze per LSTM
        Args:
            X: Features array (n_samples, n_features)
            y: Labels array (n_samples,)
            sequence_length: Lunghezza sequenza temporale
        Returns:
            X_seq: Sequenze (n_sequences, sequence_length, n_features)
            y_seq: Labels corrispondenti
        """
        if len(X) <= sequence_length:
            raise ValueError(f"Dati insufficienti per sequence_length={sequence_length}")

        sequences = []
        labels = []

        for i in range(len(X) - sequence_length):
            sequences.append(X[i:i + sequence_length])
            labels.append(y[i + sequence_length])

        return np.array(sequences), np.array(labels)

    def build_model(self, input_shape: Tuple[int, int], num_classes: int = 3) -> Sequential:
        """
        Costruisce modello LSTM
        Args:
            input_shape: (sequence_length, n_features)
            num_classes: Numero classi (BUY, SELL, HOLD)
        Returns:
            Modello Keras Sequential
        """
        model = Sequential([
            # Primo layer LSTM
            LSTM(128, return_sequences=True, input_shape=input_shape,
                 kernel_regularizer=tf.keras.regularizers.l2(0.001)),
            Dropout(0.3),
            BatchNormalization(),

            # Secondo layer LSTM
            LSTM(64, return_sequences=True,
                 kernel_regularizer=tf.keras.regularizers.l2(0.001)),
            Dropout(0.3),
            BatchNormalization(),

            # Terzo layer LSTM
            LSTM(32, return_sequences=False,
                 kernel_regularizer=tf.keras.regularizers.l2(0.001)),
            Dropout(0.3),
            BatchNormalization(),

            # Dense layers
            Dense(64, activation='relu',
                  kernel_regularizer=tf.keras.regularizers.l2(0.001)),
            Dropout(0.2),
            BatchNormalization(),

            Dense(32, activation='relu',
                  kernel_regularizer=tf.keras.regularizers.l2(0.001)),
            Dropout(0.2),

            # Output layer
            Dense(num_classes, activation='softmax')
        ])

        # Compilazione modello
        optimizer = Adam(learning_rate=0.001)
        model.compile(
            optimizer=optimizer,
            loss='sparse_categorical_crossentropy',
            metrics=['accuracy', 'precision', 'recall']
        )

        return model

    def train(self,
              X_train: np.ndarray,
              y_train: np.ndarray,
              X_val: np.ndarray,
              y_val: np.ndarray,
              model_version: str,
              feature_names: List[str]) -> Dict:
        """
        Addestra modello LSTM
        Args:
            X_train: Features training
            y_train: Labels training
            X_val: Features validation
            y_val: Labels validation
            model_version: Versione modello
            feature_names: Nomi feature
        Returns:
            Metriche training
        """
        try:
            self.feature_names = feature_names
            logger.info(f"Inizio training LSTM per {model_version}")

            # Encoding labels
            y_train_encoded = self.label_encoder.fit_transform(y_train)
            y_val_encoded = self.label_encoder.transform(y_val)

            # Scaling features
            X_train_scaled = self.scaler.fit_transform(X_train)
            X_val_scaled = self.scaler.transform(X_val)

            # Prepara sequenze
            sequence_length = self.config.LSTM_SEQUENCE_LENGTH
            X_train_seq, y_train_seq = self.prepare_sequences(
                X_train_scaled, y_train_encoded, sequence_length
            )
            X_val_seq, y_val_seq = self.prepare_sequences(
                X_val_scaled, y_val_encoded, sequence_length
            )

            logger.info(f"Sequenze prepare: Train={len(X_train_seq)}, Val={len(X_val_seq)}")

            # Costruisci modello
            input_shape = (sequence_length, X_train.shape[1])
            self.model = self.build_model(input_shape, len(self.label_encoder.classes_))

            # Callbacks
            callbacks = [
                EarlyStopping(
                    monitor='val_loss',
                    patience=15,
                    restore_best_weights=True,
                    verbose=1
                ),
                ReduceLROnPlateau(
                    monitor='val_loss',
                    factor=0.5,
                    patience=10,
                    min_lr=1e-7,
                    verbose=1
                )
            ]

            # Training
            history = self.model.fit(
                X_train_seq, y_train_seq,
                validation_data=(X_val_seq, y_val_seq),
                epochs=self.config.LSTM_EPOCHS,
                batch_size=self.config.LSTM_BATCH_SIZE,
                callbacks=callbacks,
                verbose=1
            )

            # Valutazione
            y_pred_proba = self.model.predict(X_val_seq)
            y_pred = np.argmax(y_pred_proba, axis=1)

            # Calcolo metriche dettagliate
            report = classification_report(
                y_val_seq, y_pred,
                target_names=self.label_encoder.classes_,
                output_dict=True
            )

            # Metriche finanziarie specifiche
            financial_metrics = self._calculate_financial_metrics(
                X_val_seq, y_val_seq, y_pred_proba
            )

            # Feature importance (basata su gradienti)
            feature_importance = self._calculate_feature_importance(
                X_val_seq, y_val_seq
            )

            # Salva modello e artifacts
            self._save_model_artifacts(model_version, history.history)

            metrics = {
                'accuracy': history.history['val_accuracy'][-1],
                'loss': history.history['val_loss'][-1],
                'precision_buy': report.get('BUY', {}).get('precision', 0),
                'precision_sell': report.get('SELL', {}).get('precision', 0),
                'recall_buy': report.get('BUY', {}).get('recall', 0),
                'recall_sell': report.get('SELL', {}).get('recall', 0),
                'f1_score': report.get('weighted avg', {}).get('f1-score', 0),
                'classification_report': report,
                'confusion_matrix': confusion_matrix(y_val_seq, y_pred).tolist(),
                'feature_importance': feature_importance,
                'training_samples': len(X_train_seq),
                'validation_samples': len(X_val_seq),
                'epochs_trained': len(history.history['loss']),
                **financial_metrics
            }

            logger.info(f"Training completato. Accuracy: {metrics['accuracy']:.4f}")
            return metrics

        except Exception as e:
            logger.error(f"Training fallito: {e}")
            raise

    def _calculate_financial_metrics(self,
                                   X_val: np.ndarray,
                                   y_val: np.ndarray,
                                   y_pred_proba: np.ndarray) -> Dict:
        """Calcola metriche finanziarie specifiche"""
        try:
            # Predizioni classe
            y_pred = np.argmax(y_pred_proba, axis=1)

            # Calcola win rate per segnali BUY/SELL
            buy_mask = y_val == self.label_encoder.transform(['BUY'])[0]
            sell_mask = y_val == self.label_encoder.transform(['SELL'])[0]

            buy_accuracy = np.mean(y_pred[buy_mask] == y_val[buy_mask]) if np.any(buy_mask) else 0
            sell_accuracy = np.mean(y_pred[sell_mask] == y_val[sell_mask]) if np.any(sell_mask) else 0

            # Calcola confidence score medio
            confidence_scores = np.max(y_pred_proba, axis=1)
            avg_confidence = np.mean(confidence_scores)

            # Simula P&L basato su accuracy
            # Assumendo risk/reward 1:1 e 0.01 lot size
            risk_per_trade = 20.0  # $20 per trade (0.01 lot, 20 pips)
            correct_predictions = np.sum(y_pred == y_val)
            wrong_predictions = len(y_pred) - correct_predictions

            total_profit = correct_predictions * risk_per_trade
            total_loss = wrong_predictions * risk_per_trade
            net_profit = total_profit - total_loss

            return {
                'buy_accuracy': float(buy_accuracy),
                'sell_accuracy': float(sell_accuracy),
                'avg_confidence': float(avg_confidence),
                'overall_win_rate': float(correct_predictions / len(y_pred)),
                'avg_profit_per_trade': float(net_profit / len(y_pred)),
                'profit_factor': float(total_profit / total_loss) if total_loss > 0 else 0,
                'total_trades': int(len(y_pred)),
                'winning_trades': int(correct_predictions),
                'losing_trades': int(wrong_predictions)
            }

        except Exception as e:
            logger.error(f"Errore calcolo metriche finanziarie: {e}")
            return {}

    def _calculate_feature_importance(self,
                                    X_val: np.ndarray,
                                    y_val: np.ndarray) -> Dict:
        """Calcola importanza feature usando gradienti"""
        try:
            if self.model is None:
                return {}

            # Usa TensorFlow GradientTape per calcolare gradienti
            with tf.GradientTape() as tape:
                inputs = tf.constant(X_val[:100], dtype=tf.float32)
                tape.watch(inputs)
                predictions = self.model(inputs)

            # Calcola gradienti rispetto all'input
            gradients = tape.gradient(predictions, inputs)
            feature_importance = np.mean(np.abs(gradients.numpy()), axis=(0, 1))

            # Mappa importanza ai nomi feature
            importance_dict = {}
            for i, (importance, name) in enumerate(zip(feature_importance, self.feature_names)):
                if i < len(self.feature_names):
                    importance_dict[name] = float(importance)

            # Normalizza importanza
            total_importance = sum(importance_dict.values())
            if total_importance > 0:
                importance_dict = {k: v/total_importance for k, v in importance_dict.items()}

            return importance_dict

        except Exception as e:
            logger.error(f"Errore calcolo feature importance: {e}")
            return {}

    def _save_model_artifacts(self, model_version: str, history: Dict) -> None:
        """Salva modello e artifacts"""
        try:
            # Crea directory models se non esiste
            import os
            os.makedirs('models/artifacts', exist_ok=True)

            # Salva modello Keras
            model_path = f'models/artifacts/lstm_{model_version}.h5'
            self.model.save(model_path)

            # Salva scaler e encoder
            joblib.dump(self.scaler, f'models/artifacts/scaler_{model_version}.pkl')
            joblib.dump(self.label_encoder, f'models/artifacts/encoder_{model_version}.pkl')

            # Salva feature names
            with open(f'models/artifacts/features_{model_version}.json', 'w') as f:
                json.dump(self.feature_names, f)

            # Salva training history
            with open(f'models/artifacts/history_{model_version}.json', 'w') as f:
                json.dump({k: [float(x) for x in v] for k, v in history.items()}, f)

            logger.info(f"Model artifacts salvati per {model_version}")

        except Exception as e:
            logger.error(f"Errore salvataggio artifacts: {e}")

    def load_model(self, model_version: str) -> bool:
        """Carica modello esistente"""
        try:
            model_path = f'models/artifacts/lstm_{model_version}.h5'
            if not os.path.exists(model_path):
                return False

            self.model = tf.keras.models.load_model(model_path)
            self.scaler = joblib.load(f'models/artifacts/scaler_{model_version}.pkl')
            self.label_encoder = joblib.load(f'models/artifacts/encoder_{model_version}.pkl')

            with open(f'models/artifacts/features_{model_version}.json', 'r') as f:
                self.feature_names = json.load(f)

            logger.info(f"Modello {model_version} caricato con successo")
            return True

        except Exception as e:
            logger.error(f"Errore caricamento modello: {e}")
            return False

    def predict(self, X: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        Predizione con modello addestrato
        Args:
            X: Features (n_samples, n_features)
        Returns:
            predictions: Classi predette
            probabilities: Probabilità per ogni classe
        """
        if self.model is None:
            raise ValueError("Modello non addestrato")

        try:
            # Scaling features
            X_scaled = self.scaler.transform(X)

            # Prepara sequenze
            sequence_length = self.config.LSTM_SEQUENCE_LENGTH
            if len(X_scaled) < sequence_length:
                raise ValueError(f"Dati insufficienti: {len(X_scaled)} < {sequence_length}")

            # Usa ultima sequenza disponibile
            X_seq = X_scaled[-sequence_length:].reshape(1, sequence_length, -1)

            # Predizione
            probabilities = self.model.predict(X_seq)[0]
            prediction = np.argmax(probabilities)
            predicted_class = self.label_encoder.inverse_transform([prediction])[0]

            return predicted_class, probabilities

        except Exception as e:
            logger.error(f"Errore predizione: {e}")
            raise