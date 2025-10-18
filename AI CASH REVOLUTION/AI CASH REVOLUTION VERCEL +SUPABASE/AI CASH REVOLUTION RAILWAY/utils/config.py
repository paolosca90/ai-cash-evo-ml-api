"""
Configurazioni centralizzate per AI Cash Evolution ML API
"""

import os
from dataclasses import dataclass
from typing import Optional

@dataclass
class Config:
    """Classe configurazione con environment variables"""

    # Database
    DATABASE_URL: str = os.getenv('DATABASE_URL', '')
    SUPABASE_URL: str = os.getenv('SUPABASE_URL', '')
    SUPABASE_KEY: str = os.getenv('SUPABASE_KEY', '')

    # Model Configuration
    MODEL_VERSION: str = os.getenv('MODEL_VERSION', 'v1.0')

    # Training Parameters
    TRAINING_SCHEDULE: str = os.getenv('TRAINING_SCHEDULE', '0 2 * * 0')  # Ogni domenica 02:00 UTC
    LSTM_EPOCHS: int = int(os.getenv('LSTM_EPOCHS', '100'))
    LSTM_BATCH_SIZE: int = int(os.getenv('LSTM_BATCH_SIZE', '32'))
    LSTM_SEQUENCE_LENGTH: int = int(os.getenv('LSTM_SEQUENCE_LENGTH', '20'))

    # Feature Engineering
    INDICATORS_LIST: list = [
        'adx_value', 'rsi_value', 'ema_12', 'ema_21', 'ema_50',
        'vwap', 'atr_value', 'bollinger_upper', 'bollinger_lower',
        'stoch_k', 'stoch_d', 'macd_line', 'macd_signal',
        'volume_ma', 'price_change_pct', 'volatility'
    ]

    # Performance Thresholds
    MIN_TRAINING_SAMPLES: int = int(os.getenv('MIN_TRAINING_SAMPLES', '100'))
    MIN_ACCURACY: float = float(os.getenv('MIN_ACCURACY', '0.55'))
    MIN_WIN_RATE: float = float(os.getenv('MIN_WIN_RATE', '0.45'))

    # Technical Analysis
    ADX_THRESHOLD: float = float(os.getenv('ADX_THRESHOLD', '25.0'))
    RSI_OVERSOLD: float = float(os.getenv('RSI_OVERSOLD', '30.0'))
    RSI_OVERBOUGHT: float = float(os.getenv('RSI_OVERBOUGHT', '70.0'))

    # Risk Management
    DEFAULT_LOT_SIZE: float = float(os.getenv('DEFAULT_LOT_SIZE', '0.01'))
    RISK_REWARD_RATIO: float = float(os.getenv('RISK_REWARD_RATIO', '1.0'))

    # API Configuration
    DEBUG: bool = os.getenv('DEBUG', 'false').lower() == 'true'
    PORT: int = int(os.getenv('PORT', '8080'))

    # Monitoring
    LOG_LEVEL: str = os.getenv('LOG_LEVEL', 'INFO')

    # Railway-specific
    RAILWAY_ENVIRONMENT: str = os.getenv('RAILWAY_ENVIRONMENT', 'production')

    def validate(self) -> bool:
        """Valida configurazione"""
        required_vars = ['DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_KEY']

        for var in required_vars:
            if not getattr(self, var):
                raise ValueError(f"Environment variable {var} is required")

        return True

    def get_connection_string(self) -> str:
        """Get database connection string"""
        return self.DATABASE_URL

    def get_supabase_config(self) -> dict:
        """Get Supabase configuration"""
        return {
            'url': self.SUPABASE_URL,
            'key': self.SUPABASE_KEY
        }

    def get_model_config(self) -> dict:
        """Get model training configuration"""
        return {
            'version': self.MODEL_VERSION,
            'epochs': self.LSTM_EPOCHS,
            'batch_size': self.LSTM_BATCH_SIZE,
            'sequence_length': self.LSTM_SEQUENCE_LENGTH,
            'indicators': self.INDICATORS_LIST
        }

    def get_risk_config(self) -> dict:
        """Get risk management configuration"""
        return {
            'lot_size': self.DEFAULT_LOT_SIZE,
            'risk_reward_ratio': self.RISK_REWARD_RATIO,
            'min_accuracy': self.MIN_ACCURACY,
            'min_win_rate': self.MIN_WIN_RATE
        }

# Istanza globale configurazione
config = Config()

# Validazione configurazione all'avvio
try:
    config.validate()
    print("✅ Configurazione validata con successo")
except ValueError as e:
    print(f"❌ Errore configurazione: {e}")
    # In ambiente di sviluppo continua con warning
    if config.DEBUG:
        print("⚠️ Continuando in modalità debug...")
    else:
        raise