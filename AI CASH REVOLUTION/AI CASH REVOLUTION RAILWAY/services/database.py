"""
Servizio di connessione e operazioni database per Supabase
"""

import os
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
import psycopg2
from psycopg2.extras import RealDictCursor
import json

from utils.config import Config

logger = logging.getLogger(__name__)

class DatabaseService:
    """Servizio per interazioni con database Supabase"""

    def __init__(self, config: Config):
        self.config = config
        self.connection_params = self._parse_connection_string()

    def _parse_connection_string(self) -> dict:
        """Parse database connection string"""
        try:
            # Format: postgresql://user:password@host:port/database
            db_url = self.config.get_connection_string()
            if not db_url:
                raise ValueError("DATABASE_URL non configurato")

            # Parse components
            if db_url.startswith('postgresql://'):
                db_url = db_url[len('postgresql://'):]

            if '@' in db_url:
                auth, host_port_db = db_url.split('@')
                user, password = auth.split(':')
            else:
                raise ValueError("Formato DATABASE_URL non valido")

            if '/' in host_port_db:
                host_port, database = host_port_db.split('/')
            else:
                raise ValueError("Formato DATABASE_URL non valido - database mancante")

            if ':' in host_port:
                host, port = host_port.split(':')
                port = int(port)
            else:
                host = host_port
                port = 5432

            return {
                'host': host,
                'port': port,
                'database': database,
                'user': user,
                'password': password
            }

        except Exception as e:
            logger.error(f"Errore parsing connection string: {e}")
            raise

    def get_connection(self):
        """Get database connection"""
        try:
            return psycopg2.connect(**self.connection_params)
        except Exception as e:
            logger.error(f"Errore connessione database: {e}")
            raise

    def test_connection(self) -> bool:
        """Test database connection"""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute("SELECT 1")
                    result = cursor.fetchone()
                    return result[0] == 1
        except Exception as e:
            logger.error(f"Test connessione fallito: {e}")
            return False

    # ===== ML Training Samples =====

    def get_training_samples(self, start_date: datetime, end_date: datetime) -> List[Dict]:
        """Recupera samples per training ML"""
        query = """
        SELECT
            id, symbol, signal_type, entry_price, stop_loss, take_profit,
            adx_value, rsi_value, ema_12, ema_21, ema_50, vwap, atr_value,
            bollinger_upper, bollinger_lower, stoch_k, stoch_d,
            macd_line, macd_signal, volume_ma, price_change_pct, volatility,
            market_session, trend_direction, volatility_regime,
            profit_loss, performance_score, status,
            created_at, updated_at
        FROM ml_training_samples
        WHERE created_at BETWEEN %s AND %s
        AND status IN ('SL_HIT', 'TP_HIT')
        AND performance_score IS NOT NULL
        ORDER BY created_at ASC
        """

        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                    cursor.execute(query, (start_date, end_date))
                    return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f"Errore recupero training samples: {e}")
            raise

    def get_training_sample_data(self, limit: int = 10) -> List[Dict]:
        """Recupera sample dati per debug"""
        query = """
        SELECT
            id, symbol, signal_type, entry_price, stop_loss, take_profit,
            adx_value, rsi_value, ema_12, ema_21, performance_score,
            profit_loss, status, created_at
        FROM ml_training_samples
        ORDER BY created_at DESC
        LIMIT %s
        """

        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                    cursor.execute(query, (limit,))
                    return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f"Errore recupero sample data: {e}")
            raise

    # ===== Indicator Weights =====

    def get_current_weights(self) -> List[Dict]:
        """Recupera pesi correnti indicatori"""
        query = """
        SELECT
            indicator_name, current_weight, default_weight, weight_category,
            importance_rank, last_updated, update_count,
            avg_performance_with_weight, weight_stability
        FROM ml_indicator_weights
        ORDER BY importance_rank
        """

        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                    cursor.execute(query)
                    return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f"Errore recupero pesi: {e}")
            raise

    def update_weights(self, weight_updates: Dict[str, float], model_version: str) -> bool:
        """Aggiorna pesi indicatori"""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cursor:
                    for indicator_name, new_weight in weight_updates.items():
                        cursor.execute("""
                            UPDATE ml_indicator_weights
                            SET
                                current_weight = %s,
                                last_updated = NOW(),
                                update_count = update_count + 1
                            WHERE indicator_name = %s
                        """, (new_weight, indicator_name))

                    conn.commit()
                    logger.info(f"Pesi aggiornati per {len(weight_updates)} indicatori")
                    return True

        except Exception as e:
            logger.error(f"Errore aggiornamento pesi: {e}")
            return False

    # ===== Model Performance =====

    def save_training_results(self,
                            model_version: str,
                            training_samples: int,
                            validation_samples: int,
                            metrics: Dict,
                            weight_changes: Dict,
                            feature_importance: Dict) -> str:
        """Salva risultati training modello"""

        query = """
        INSERT INTO ml_model_performance (
            model_version, training_date, training_samples_count,
            validation_samples_count, accuracy, precision_buy, precision_sell,
            recall_buy, recall_sell, f1_score, overall_win_rate,
            avg_profit_per_trade, profit_factor, max_drawdown, sharpe_ratio,
            previous_weights, new_weights, weight_changes, feature_importance
        ) VALUES (
            %s, NOW(), %s, %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s, %s, %s
        )
        RETURNING id
        """

        try:
            with self.get_connection() as conn:
                with conn.cursor() as cursor:
                    # Recupera pesi precedenti
                    previous_weights = {w['indicator_name']: w['current_weight']
                                     for w in self.get_current_weights()}

                    cursor.execute(query, (
                        model_version,
                        training_samples,
                        validation_samples,
                        metrics.get('accuracy', 0),
                        metrics.get('precision_buy', 0),
                        metrics.get('precision_sell', 0),
                        metrics.get('recall_buy', 0),
                        metrics.get('recall_sell', 0),
                        metrics.get('f1_score', 0),
                        metrics.get('overall_win_rate', 0),
                        metrics.get('avg_profit_per_trade', 0),
                        metrics.get('profit_factor', 0),
                        metrics.get('max_drawdown', 0),
                        metrics.get('sharpe_ratio', 0),
                        json.dumps(previous_weights),
                        json.dumps({k: v for k, v in weight_updates.items() if k in previous_weights}),
                        json.dumps(weight_changes),
                        json.dumps(feature_importance)
                    ))

                    training_id = cursor.fetchone()[0]
                    conn.commit()

                    logger.info(f"Training results salvati. ID: {training_id}")
                    return str(training_id)

        except Exception as e:
            logger.error(f"Errore salvataggio training results: {e}")
            raise

    def get_model_performance(self, model_version: str, days: int = 30) -> List[Dict]:
        """Recupera performance modello"""
        query = """
        SELECT *
        FROM ml_model_performance
        WHERE model_version = %s
        AND training_date >= NOW() - INTERVAL '%s days'
        ORDER BY training_date DESC
        """

        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                    cursor.execute(query, (model_version, days))
                    return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f"Errore recupero model performance: {e}")
            raise

    def get_last_training_date(self) -> Optional[datetime]:
        """Recupera data ultimo training"""
        query = """
        SELECT MAX(training_date) as last_training
        FROM ml_model_performance
        """

        try:
            with self.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute(query)
                    result = cursor.fetchone()
                    return result[0] if result and result[0] else None
        except Exception as e:
            logger.error(f"Errore recupero last training date: {e}")
            return None

    def get_model_versions(self) -> List[Dict]:
        """Recupera tutte le versioni modello"""
        query = """
        SELECT DISTINCT model_version,
               COUNT(*) as training_count,
               MAX(training_date) as last_training,
               AVG(accuracy) as avg_accuracy
        FROM ml_model_performance
        GROUP BY model_version
        ORDER BY last_training DESC
        """

        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                    cursor.execute(query)
                    return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f"Errore recupero model versions: {e}")
            raise

    # ===== Trading Statistics =====

    def get_trading_statistics(self, days: int = 30) -> Dict:
        """Recupera statistiche trading"""
        query = """
        SELECT
            COUNT(*) as total_signals,
            COUNT(CASE WHEN profit_loss > 0 THEN 1 END) as winning_signals,
            COUNT(CASE WHEN profit_loss < 0 THEN 1 END) as losing_signals,
            AVG(profit_loss) as avg_profit_loss,
            AVG(CASE WHEN profit_loss > 0 THEN profit_loss END) as avg_win,
            AVG(CASE WHEN profit_loss < 0 THEN profit_loss END) as avg_loss,
            SUM(profit_loss) as total_profit_loss,
            AVG(performance_score) as avg_performance_score
        FROM ml_training_samples
        WHERE created_at >= NOW() - INTERVAL '%s days'
        AND status IN ('SL_HIT', 'TP_HIT')
        AND profit_loss IS NOT NULL
        """

        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                    cursor.execute(query, (days,))
                    result = cursor.fetchone()
                    return dict(result) if result else {}
        except Exception as e:
            logger.error(f"Errore recupero trading statistics: {e}")
            return {}

    # ===== Training Status =====

    def get_training_status(self) -> Dict:
        """Recupera stato corrente training"""
        query = """
        SELECT
            model_version,
            training_date,
            training_samples_count,
            accuracy,
            overall_win_rate,
            is_active
        FROM ml_model_performance
        ORDER BY training_date DESC
        LIMIT 1
        """

        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                    cursor.execute(query)
                    result = cursor.fetchone()
                    return dict(result) if result else {}
        except Exception as e:
            logger.error(f"Errore recupero training status: {e}")
            return {}

    # ===== Generation Logs =====

    def log_generation_batch(self,
                           batch_id: str,
                           symbols_count: int,
                           signals_per_symbol: int,
                           total_signals: int,
                           strategy: str,
                           avg_confidence: float,
                           signal_distribution: Dict) -> bool:
        """Log generazione batch segnali"""
        query = """
        INSERT INTO ml_generation_logs (
            batch_id, generation_time, symbols_count, signals_per_symbol,
            total_signals_generated, generation_strategy, avg_confidence,
            signal_distribution, status
        ) VALUES (
            %s, NOW(), %s, %s, %s, %s, %s, %s, 'ACTIVE'
        )
        """

        try:
            with self.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute(query, (
                        batch_id, symbols_count, signals_per_symbol,
                        total_signals, strategy, avg_confidence,
                        json.dumps(signal_distribution)
                    ))
                    conn.commit()
                    return True
        except Exception as e:
            logger.error(f"Errore log generation batch: {e}")
            return False