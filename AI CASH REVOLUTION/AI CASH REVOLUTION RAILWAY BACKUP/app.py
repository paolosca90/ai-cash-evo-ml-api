"""
AI Cash Evolution - ML LSTM API
Sistema di Machine Learning per ottimizzazione pesi indicatori tecnici
"""

import os
import logging
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple

from models.lstm_trainer import LSTMTrainer
from models.weight_optimizer import WeightOptimizer
from services.database import DatabaseService
from services.data_processor import DataProcessor
from services.predictor import PredictionService
from utils.config import Config
from utils.indicators import TechnicalIndicators

# Configurazione logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Inizializzazione servizi
config = Config()
db_service = DatabaseService(config)
data_processor = DataProcessor(db_service)
lstm_trainer = LSTMTrainer(config)
weight_optimizer = WeightOptimizer(config, db_service)
predictor = PredictionService(db_service, weight_optimizer)

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        # Test connessione database
        db_status = db_service.test_connection()

        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'services': {
                'database': 'connected' if db_status else 'disconnected',
                'lstm_trainer': 'ready',
                'weight_optimizer': 'ready'
            },
            'version': config.MODEL_VERSION
        }), 200
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/train', methods=['POST'])
def train_model():
    """Avvia training LSTM modello"""
    try:
        data = request.get_json()

        # Parametri training
        force_retrain = data.get('force_retrain', False)
        model_version = data.get('model_version', config.MODEL_VERSION)

        logger.info(f"Iniziando training modello {model_version}")

        # Verifica se esiste già un training recente
        if not force_retrain:
            last_training = db_service.get_last_training_date()
            if last_training and (datetime.now() - last_training).days < 7:
                logger.info("Training eseguito di recente, skip")
                return jsonify({
                    'status': 'skipped',
                    'message': 'Training eseguito negli ultimi 7 giorni',
                    'last_training': last_training.isoformat()
                }), 200

        # Recupera dati training
        training_data = data_processor.get_training_samples(
            start_date=datetime.now() - timedelta(days=90),
            end_date=datetime.now()
        )

        if len(training_data) < 100:
            raise ValueError(f"Dati training insufficienti: {len(training_data)} samples (minimo 100)")

        logger.info(f"Recuperati {len(training_data)} samples per training")

        # Prepara dati per LSTM
        X_train, y_train, X_val, y_val, feature_names = data_processor.prepare_lstm_data(training_data)

        # Training modello
        model_metrics = lstm_trainer.train(
            X_train, y_train, X_val, y_val,
            model_version=model_version,
            feature_names=feature_names
        )

        # Ottimizzazione pesi
        weight_changes = weight_optimizer.optimize_weights(
            training_data, model_metrics, feature_names
        )

        # Salva risultati
        training_id = db_service.save_training_results(
            model_version=model_version,
            training_samples=len(X_train),
            validation_samples=len(X_val),
            metrics=model_metrics,
            weight_changes=weight_changes,
            feature_importance=model_metrics.get('feature_importance', {})
        )

        logger.info(f"Training completato con successo. ID: {training_id}")

        return jsonify({
            'status': 'success',
            'training_id': training_id,
            'model_version': model_version,
            'metrics': model_metrics,
            'weight_changes': weight_changes,
            'timestamp': datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Training fallito: {e}")
        return jsonify({
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/weights', methods=['GET'])
def get_weights():
    """Recupera pesi correnti degli indicatori"""
    try:
        weights = db_service.get_current_weights()

        return jsonify({
            'status': 'success',
            'weights': weights,
            'model_version': config.MODEL_VERSION,
            'timestamp': datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Recupero pesi fallito: {e}")
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500

@app.route('/predict', methods=['POST'])
def predict_signal():
    """Predizione segnale con pesi ottimizzati"""
    try:
        data = request.get_json()

        # Validazione input
        required_fields = ['symbol', 'indicators']
        for field in required_fields:
            if field not in data:
                raise ValueError(f"Campo richiesto mancante: {field}")

        symbol = data['symbol']
        indicators = data['indicators']

        # Predizione
        prediction = predictor.predict_signal(symbol, indicators)

        return jsonify({
            'status': 'success',
            'prediction': prediction,
            'symbol': symbol,
            'model_version': config.MODEL_VERSION,
            'timestamp': datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Predizione fallita: {e}")
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500

@app.route('/performance', methods=['GET'])
def get_performance():
    """Recupera metriche performance modello"""
    try:
        # Parametri query
        days = request.args.get('days', 30, type=int)
        model_version = request.args.get('model_version', config.MODEL_VERSION)

        # Recupera performance
        performance = db_service.get_model_performance(
            model_version=model_version,
            days=days
        )

        # Recupera statistiche trading
        trading_stats = db_service.get_trading_statistics(days=days)

        return jsonify({
            'status': 'success',
            'performance': performance,
            'trading_statistics': trading_stats,
            'model_version': model_version,
            'period_days': days,
            'timestamp': datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Recupero performance fallito: {e}")
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500

@app.route('/models', methods=['GET'])
def list_models():
    """Lista tutti i modelli disponibili"""
    try:
        models = db_service.get_model_versions()

        return jsonify({
            'status': 'success',
            'models': models,
            'timestamp': datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Recupero modelli fallito: {e}")
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500

@app.route('/training-status', methods=['GET'])
def get_training_status():
    """Stato corrente del training"""
    try:
        # Controlla se c'è un training in corso
        training_status = db_service.get_training_status()

        return jsonify({
            'status': 'success',
            'training_status': training_status,
            'timestamp': datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Recupero stato training fallito: {e}")
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500

@app.route('/debug/data-sample', methods=['GET'])
def debug_data_sample():
    """Debug: Recupera sample dati training"""
    try:
        limit = request.args.get('limit', 10, type=int)

        sample_data = db_service.get_training_sample_data(limit=limit)

        return jsonify({
            'status': 'success',
            'sample_count': len(sample_data),
            'data': sample_data,
            'timestamp': datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Debug data sample fallito: {e}")
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'status': 'error',
        'error': 'Endpoint non trovato'
    }), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {error}")
    return jsonify({
        'status': 'error',
        'error': 'Errore interno del server'
    }), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    debug = os.environ.get('DEBUG', 'False').lower() == 'true'

    logger.info(f"Avvio AI Cash Evolution ML API su porta {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)