"""
Technical Indicators Calculator
Implementazione dei principali indicatori tecnici per trading
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple
import logging

logger = logging.getLogger(__name__)

class TechnicalIndicators:
    """Calcolatore indicatori tecnici per analisi trading"""

    @staticmethod
    def calculate_adx(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> pd.Series:
        """
        Average Directional Index (ADX)
        Misura forza del trend (0-100)
        """
        try:
            # True Range
            tr1 = high - low
            tr2 = abs(high - close.shift(1))
            tr3 = abs(low - close.shift(1))
            tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)

            atr = tr.rolling(window=period).mean()

            # Directional Movement
            up_move = high - high.shift(1)
            down_move = low.shift(1) - low

            plus_dm = np.where((up_move > down_move) & (up_move > 0), up_move, 0)
            minus_dm = np.where((down_move > up_move) & (down_move > 0), down_move, 0)

            # Smoothed DM
            plus_di = 100 * (pd.Series(plus_dm).rolling(window=period).mean() / atr)
            minus_di = 100 * (pd.Series(minus_dm).rolling(window=period).mean() / atr)

            # ADX
            dx = 100 * abs(plus_di - minus_di) / (plus_di + minus_di)
            adx = dx.rolling(window=period).mean()

            return adx.fillna(0)

        except Exception as e:
            logger.error(f"Errore calcolo ADX: {e}")
            return pd.Series([0] * len(close))

    @staticmethod
    def calculate_rsi(close: pd.Series, period: int = 14) -> pd.Series:
        """
        Relative Strength Index (RSI)
        Momentum oscillator (0-100)
        """
        try:
            delta = close.diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()

            rs = gain / loss
            rsi = 100 - (100 / (1 + rs))

            return rsi.fillna(50)

        except Exception as e:
            logger.error(f"Errore calcolo RSI: {e}")
            return pd.Series([50] * len(close))

    @staticmethod
    def calculate_ema(close: pd.Series, period: int) -> pd.Series:
        """
        Exponential Moving Average (EMA)
        """
        try:
            return close.ewm(span=period).mean()
        except Exception as e:
            logger.error(f"Errore calcolo EMA: {e}")
            return pd.Series([close.iloc[0]] * len(close))

    @staticmethod
    def calculate_vwap(high: pd.Series, low: pd.Series, close: pd.Series, volume: pd.Series) -> pd.Series:
        """
        Volume Weighted Average Price (VWAP)
        """
        try:
            typical_price = (high + low + close) / 3
            vwap = (typical_price * volume).cumsum() / volume.cumsum()
            return vwap.fillna(method='ffill').fillna(close.iloc[0])
        except Exception as e:
            logger.error(f"Errore calcolo VWAP: {e}")
            return pd.Series([close.iloc[0]] * len(close))

    @staticmethod
    def calculate_atr(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> pd.Series:
        """
        Average True Range (ATR)
        Misura volatilità
        """
        try:
            tr1 = high - low
            tr2 = abs(high - close.shift(1))
            tr3 = abs(low - close.shift(1))
            tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)

            atr = tr.rolling(window=period).mean()
            return atr.fillna(0.001)  # Default small ATR

        except Exception as e:
            logger.error(f"Errore calcolo ATR: {e}")
            return pd.Series([0.001] * len(close))

    @staticmethod
    def calculate_bollinger_bands(close: pd.Series, period: int = 20, std_dev: float = 2) -> Tuple[pd.Series, pd.Series, pd.Series]:
        """
        Bollinger Bands
        Returns: upper_band, middle_band, lower_band
        """
        try:
            middle_band = close.rolling(window=period).mean()
            std = close.rolling(window=period).std()

            upper_band = middle_band + (std * std_dev)
            lower_band = middle_band - (std * std_dev)

            return upper_band.fillna(middle_band), middle_band.fillna(close.iloc[0]), lower_band.fillna(middle_band)

        except Exception as e:
            logger.error(f"Errore calcolo Bollinger Bands: {e}")
            middle = pd.Series([close.iloc[0]] * len(close))
            return middle, middle, middle

    @staticmethod
    def calculate_stochastic(high: pd.Series, low: pd.Series, close: pd.Series, k_period: int = 14, d_period: int = 3) -> Tuple[pd.Series, pd.Series]:
        """
        Stochastic Oscillator
        Returns: %K, %D
        """
        try:
            lowest_low = low.rolling(window=k_period).min()
            highest_high = high.rolling(window=k_period).max()

            k_percent = 100 * ((close - lowest_low) / (highest_high - lowest_low))
            k_percent = k_percent.fillna(50)

            d_percent = k_percent.rolling(window=d_period).mean()
            d_percent = d_percent.fillna(50)

            return k_percent, d_percent

        except Exception as e:
            logger.error(f"Errore calcolo Stochastic: {e}")
            return pd.Series([50] * len(close)), pd.Series([50] * len(close))

    @staticmethod
    def calculate_macd(close: pd.Series, fast_period: int = 12, slow_period: int = 26, signal_period: int = 9) -> Tuple[pd.Series, pd.Series, pd.Series]:
        """
        MACD (Moving Average Convergence Divergence)
        Returns: macd_line, signal_line, histogram
        """
        try:
            ema_fast = close.ewm(span=fast_period).mean()
            ema_slow = close.ewm(span=slow_period).mean()

            macd_line = ema_fast - ema_slow
            signal_line = macd_line.ewm(span=signal_period).mean()
            histogram = macd_line - signal_line

            return macd_line.fillna(0), signal_line.fillna(0), histogram.fillna(0)

        except Exception as e:
            logger.error(f"Errore calcolo MACD: {e}")
            zeros = pd.Series([0] * len(close))
            return zeros, zeros, zeros

    @staticmethod
    def calculate_all_indicators(ohlc_data: pd.DataFrame, volume_data: Optional[pd.Series] = None) -> pd.DataFrame:
        """
        Calcola tutti gli indicatori tecnici principali
        Args:
            ohlc_data: DataFrame con colonne ['open', 'high', 'low', 'close']
            volume_data: Series con volumi (opzionale)
        Returns:
            DataFrame con tutti gli indicatori calcolati
        """
        try:
            if not all(col in ohlc_data.columns for col in ['high', 'low', 'close']):
                raise ValueError("OHLC data deve contenere colonne 'high', 'low', 'close'")

            high = ohlc_data['high']
            low = ohlc_data['low']
            close = ohlc_data['close']

            indicators = pd.DataFrame(index=ohlc_data.index)

            # Trend indicators
            indicators['adx_value'] = TechnicalIndicators.calculate_adx(high, low, close)
            indicators['ema_12'] = TechnicalIndicators.calculate_ema(close, 12)
            indicators['ema_21'] = TechnicalIndicators.calculate_ema(close, 21)
            indicators['ema_50'] = TechnicalIndicators.calculate_ema(close, 50)

            # VWAP (se volume disponibile)
            if volume_data is not None:
                indicators['vwap'] = TechnicalIndicators.calculate_vwap(high, low, close, volume_data)
            else:
                indicators['vwap'] = close

            # Momentum indicators
            indicators['rsi_value'] = TechnicalIndicators.calculate_rsi(close)
            stoch_k, stoch_d = TechnicalIndicators.calculate_stochastic(high, low, close)
            indicators['stoch_k'] = stoch_k
            indicators['stoch_d'] = stoch_d
            macd_line, macd_signal, macd_hist = TechnicalIndicators.calculate_macd(close)
            indicators['macd_line'] = macd_line
            indicators['macd_signal'] = macd_signal

            # Volatility indicators
            indicators['atr_value'] = TechnicalIndicators.calculate_atr(high, low, close)
            bb_upper, bb_middle, bb_lower = TechnicalIndicators.calculate_bollinger_bands(close)
            indicators['bollinger_upper'] = bb_upper
            indicators['bollinger_lower'] = bb_lower

            # Volume indicators
            if volume_data is not None:
                indicators['volume_ma'] = volume_data.rolling(window=20).mean().fillna(volume_data.mean())
            else:
                indicators['volume_ma'] = pd.Series([1.0] * len(close))

            # Price change indicators
            indicators['price_change_pct'] = close.pct_change().fillna(0) * 100
            indicators['volatility'] = indicators['atr_value'] / close * 100

            # Additional derived indicators
            indicators['ema_12_21_ratio'] = indicators['ema_12'] / indicators['ema_21']
            indicators['ema_12_21_diff'] = indicators['ema_12'] - indicators['ema_21']
            indicators['bollinger_width'] = indicators['bollinger_upper'] - indicators['bollinger_lower']
            indicators['bollinger_position'] = (close - indicators['bollinger_lower']) / indicators['bollinger_width']

            # RSI zones
            indicators['rsi_oversold'] = (indicators['rsi_value'] < 30).astype(int)
            indicators['rsi_overbought'] = (indicators['rsi_value'] > 70).astype(int)
            indicators['rsi_neutral'] = ((indicators['rsi_value'] >= 30) & (indicators['rsi_value'] <= 70)).astype(int)

            # Market regime indicators
            indicators['trend_strength'] = indicators['adx_value'] / 50  # Normalized 0-1
            indicators['trend_direction'] = np.where(
                indicators['ema_12'] > indicators['ema_21'], 1, -1
            ) * indicators['trend_strength']

            # Fill any remaining NaN values
            indicators = indicators.fillna(method='ffill').fillna(0)

            logger.info(f"Calcolati {len(indicators.columns)} indicatori tecnici")
            return indicators

        except Exception as e:
            logger.error(f"Errore calcolo indicatori: {e}")
            raise

    @staticmethod
    def get_indicator_signals(indicators: pd.DataFrame) -> Dict[str, str]:
        """
        Genera segnali base da indicatori
        Returns:
            Dict con segnali per ogni indicatore
        """
        signals = {}

        try:
            # ADX trend strength
            if 'adx_value' in indicators.columns:
                latest_adx = indicators['adx_value'].iloc[-1]
                if latest_adx > 25:
                    signals['adx'] = 'STRONG_TREND'
                else:
                    signals['adx'] = 'WEAK_TREND'

            # RSI signals
            if 'rsi_value' in indicators.columns:
                latest_rsi = indicators['rsi_value'].iloc[-1]
                if latest_rsi > 70:
                    signals['rsi'] = 'OVERBOUGHT'
                elif latest_rsi < 30:
                    signals['rsi'] = 'OVERSOLD'
                else:
                    signals['rsi'] = 'NEUTRAL'

            # EMA trend
            if all(col in indicators.columns for col in ['ema_12', 'ema_21']):
                ema_12 = indicators['ema_12'].iloc[-1]
                ema_21 = indicators['ema_21'].iloc[-1]
                if ema_12 > ema_21:
                    signals['ema_trend'] = 'BULLISH'
                else:
                    signals['ema_trend'] = 'BEARISH'

            # Stochastic signals
            if all(col in indicators.columns for col in ['stoch_k', 'stoch_d']):
                stoch_k = indicators['stoch_k'].iloc[-1]
                stoch_d = indicators['stoch_d'].iloc[-1]

                if stoch_k > stoch_d:
                    if stoch_k < 80:
                        signals['stochastic'] = 'BULLISH_CROSS'
                    else:
                        signals['stochastic'] = 'OVERBOUGHT'
                else:
                    if stoch_k > 20:
                        signals['stochastic'] = 'BEARISH_CROSS'
                    else:
                        signals['stochastic'] = 'OVERSOLD'

            # MACD signals
            if all(col in indicators.columns for col in ['macd_line', 'macd_signal']):
                macd = indicators['macd_line'].iloc[-1]
                signal = indicators['macd_signal'].iloc[-1]

                if macd > signal:
                    signals['macd'] = 'BULLISH'
                else:
                    signals['macd'] = 'BEARISH'

            # Bollinger Bands position
            if all(col in indicators.columns for col in ['bollinger_upper', 'bollinger_lower']):
                # Assuming we have current price (would need to be passed)
                # For now, use last close as reference
                bb_upper = indicators['bollinger_upper'].iloc[-1]
                bb_lower = indicators['bollinger_lower'].iloc[-1]
                bb_position = indicators.get('bollinger_position', pd.Series([0.5])).iloc[-1]

                if bb_position > 0.8:
                    signals['bollinger'] = 'UPPER_BAND'
                elif bb_position < 0.2:
                    signals['bollinger'] = 'LOWER_BAND'
                else:
                    signals['bollinger'] = 'MIDDLE_BANDS'

            return signals

        except Exception as e:
            logger.error(f"Errore generazione segnali indicatori: {e}")
            return {}