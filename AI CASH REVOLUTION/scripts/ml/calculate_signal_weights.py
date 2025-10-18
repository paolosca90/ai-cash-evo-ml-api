#!/usr/bin/env python3
"""
SIGNAL WEIGHT CALCULATION
Calculates multi-factor weights for trading signals combining ML confidence,
technical quality, market conditions, and risk factors.

Weight Range: 0-100 (higher = stronger signal)
"""

import numpy as np
from typing import Dict, List, Optional

class SignalWeightCalculator:
    """
    Calculates comprehensive signal weights using multiple factors:
    1. ML Confidence (30%): Model prediction confidence
    2. Technical Quality (25%): Trend strength, momentum, volatility
    3. Market Conditions (20%): Range vs trend, liquidity, spread
    4. Multi-Timeframe Confirmation (15%): Agreement across timeframes
    5. Risk Factors (10%): Symbol volatility, drawdown, correlation
    """
    
    def __init__(self):
        self.weights = {
            'ml_confidence': 0.30,
            'technical_quality': 0.25,
            'market_conditions': 0.20,
            'mtf_confirmation': 0.15,
            'risk_factors': 0.10
        }
    
    def calculate_weight(
        self,
        ml_confidence: float,  # 0-100
        signal_direction: str,  # 'BUY' or 'SELL'
        candle_data: Dict,
        multi_tf_signals: Optional[List[Dict]] = None,
        risk_metrics: Optional[Dict] = None
    ) -> Dict:
        """
        Calculate comprehensive signal weight
        
        Returns:
            {
                'total_weight': 0-100,
                'components': {
                    'ml_confidence': 0-100,
                    'technical_quality': 0-100,
                    'market_conditions': 0-100,
                    'mtf_confirmation': 0-100,
                    'risk_factors': 0-100
                },
                'recommendation': 'STRONG_BUY' | 'BUY' | 'WEAK' | 'AVOID'
            }
        """
        
        # 1. ML Confidence Score (30%)
        ml_score = self._score_ml_confidence(ml_confidence)
        
        # 2. Technical Quality (25%)
        tech_score = self._score_technical_quality(candle_data, signal_direction)
        
        # 3. Market Conditions (20%)
        market_score = self._score_market_conditions(candle_data)
        
        # 4. Multi-Timeframe Confirmation (15%)
        mtf_score = self._score_mtf_confirmation(
            signal_direction, 
            multi_tf_signals or []
        )
        
        # 5. Risk Factors (10%)
        risk_score = self._score_risk_factors(
            candle_data.get('symbol'),
            risk_metrics or {}
        )
        
        # Calculate weighted total
        total_weight = (
            ml_score * self.weights['ml_confidence'] +
            tech_score * self.weights['technical_quality'] +
            market_score * self.weights['market_conditions'] +
            mtf_score * self.weights['mtf_confirmation'] +
            risk_score * self.weights['risk_factors']
        )
        
        # Determine recommendation
        recommendation = self._get_recommendation(total_weight)
        
        return {
            'total_weight': round(total_weight, 2),
            'components': {
                'ml_confidence': round(ml_score, 2),
                'technical_quality': round(tech_score, 2),
                'market_conditions': round(market_score, 2),
                'mtf_confirmation': round(mtf_score, 2),
                'risk_factors': round(risk_score, 2)
            },
            'recommendation': recommendation,
            'position_size_multiplier': self._get_position_multiplier(total_weight)
        }
    
    def _score_ml_confidence(self, confidence: float) -> float:
        """
        Score ML model confidence (0-100)
        - Below 50: Poor (0-40 points)
        - 50-70: Moderate (40-70 points)
        - 70-85: Good (70-90 points)
        - Above 85: Excellent (90-100 points)
        """
        if confidence < 50:
            return confidence * 0.8  # 0-40
        elif confidence < 70:
            return 40 + (confidence - 50) * 1.5  # 40-70
        elif confidence < 85:
            return 70 + (confidence - 70) * 1.33  # 70-90
        else:
            return 90 + (confidence - 85) * 0.67  # 90-100
    
    def _score_technical_quality(self, candle: Dict, direction: str) -> float:
        """
        Score technical indicator quality
        Components:
        - Trend alignment (RSI, EMA)
        - Momentum (ADX)
        - Volatility appropriateness
        """
        score = 50.0  # Neutral baseline
        
        rsi = candle.get('rsi')
        ema12 = candle.get('ema12')
        ema21 = candle.get('ema21')
        adx = candle.get('adx')
        
        # RSI alignment (±15 points)
        if rsi is not None:
            if direction == 'BUY':
                if rsi < 30:
                    score += 15  # Oversold, strong buy
                elif rsi < 50:
                    score += 10
                elif rsi > 70:
                    score -= 15  # Overbought, risky buy
            else:  # SELL
                if rsi > 70:
                    score += 15  # Overbought, strong sell
                elif rsi > 50:
                    score += 10
                elif rsi < 30:
                    score -= 15  # Oversold, risky sell
        
        # EMA trend alignment (±20 points)
        if ema12 is not None and ema21 is not None:
            ema_bullish = ema12 > ema21
            if direction == 'BUY' and ema_bullish:
                score += 20
            elif direction == 'SELL' and not ema_bullish:
                score += 20
            else:
                score -= 10  # Counter-trend
        
        # ADX momentum (±15 points)
        if adx is not None:
            if adx > 25:
                score += 15  # Strong trend
            elif adx > 20:
                score += 10
            elif adx < 15:
                score -= 10  # Weak/choppy market
        
        return max(0, min(100, score))
    
    def _score_market_conditions(self, candle: Dict) -> float:
        """
        Score market conditions favorability
        - Volatility level
        - Range vs trending
        - Time of day (if available)
        """
        score = 50.0
        
        # Calculate ATR-based volatility
        high = candle.get('high', 0)
        low = candle.get('low', 0)
        close = candle.get('close', 0)
        
        if high and low and close:
            candle_range = high - low
            volatility_pct = (candle_range / close) * 100 if close > 0 else 0
            
            # Optimal volatility: 0.05-0.15% (not too tight, not too wild)
            if 0.05 <= volatility_pct <= 0.15:
                score += 20
            elif 0.03 <= volatility_pct <= 0.20:
                score += 10
            elif volatility_pct > 0.30:
                score -= 15  # Too volatile
            elif volatility_pct < 0.02:
                score -= 10  # Too tight
        
        # Spread/liquidity proxy (granularity matters)
        granularity = candle.get('granularity', '')
        if granularity in ['M5', 'M15', 'H1']:
            score += 15  # Good liquidity timeframes
        elif granularity == 'M1':
            score -= 5  # Noisy
        elif granularity == 'H4':
            score += 10  # Less liquid but cleaner
        
        return max(0, min(100, score))
    
    def _score_mtf_confirmation(
        self, 
        direction: str, 
        multi_tf_signals: List[Dict]
    ) -> float:
        """
        Score multi-timeframe confirmation
        - Same direction on higher TF = bonus
        - Conflicting signals = penalty
        """
        if not multi_tf_signals:
            return 50.0  # Neutral if no MTF data
        
        score = 50.0
        
        # Count agreements
        agreements = sum(1 for s in multi_tf_signals if s.get('label') == direction)
        disagreements = len(multi_tf_signals) - agreements
        
        # Award points for confirmation
        score += agreements * 15
        score -= disagreements * 10
        
        # Bonus if higher timeframes agree
        higher_tf_order = ['H4', 'H1', 'M15', 'M5', 'M1']
        for signal in multi_tf_signals:
            sig_tf = signal.get('granularity', '')
            if sig_tf in higher_tf_order[:2] and signal.get('label') == direction:
                score += 10  # Bonus for H4/H1 agreement
        
        return max(0, min(100, score))
    
    def _score_risk_factors(self, symbol: str, risk_metrics: Dict) -> float:
        """
        Score risk-adjusted factors
        - Symbol volatility
        - Current drawdown
        - Correlation exposure
        """
        score = 50.0
        
        # Symbol risk tiers
        volatile_symbols = ['XAUUSD', 'GBPUSD']
        stable_symbols = ['EURUSD', 'USDCAD']
        
        if symbol in stable_symbols:
            score += 20
        elif symbol in volatile_symbols:
            score += 5  # Can trade but with caution
        
        # Account for current drawdown (if provided)
        drawdown_pct = risk_metrics.get('current_drawdown_pct', 0)
        if drawdown_pct > 10:
            score -= 20  # High drawdown, reduce risk
        elif drawdown_pct > 5:
            score -= 10
        
        # Win rate on this symbol (if available)
        symbol_win_rate = risk_metrics.get('symbol_win_rate', 50)
        if symbol_win_rate > 60:
            score += 15
        elif symbol_win_rate < 40:
            score -= 15
        
        return max(0, min(100, score))
    
    def _get_recommendation(self, total_weight: float) -> str:
        """Determine trading recommendation based on total weight"""
        if total_weight >= 75:
            return 'STRONG_BUY'
        elif total_weight >= 60:
            return 'BUY'
        elif total_weight >= 40:
            return 'WEAK'
        else:
            return 'AVOID'
    
    def _get_position_multiplier(self, total_weight: float) -> float:
        """
        Calculate position size multiplier based on signal weight
        Range: 0.25 - 2.0
        """
        if total_weight >= 80:
            return 2.0  # Double size for very strong signals
        elif total_weight >= 70:
            return 1.5
        elif total_weight >= 60:
            return 1.0  # Normal size
        elif total_weight >= 50:
            return 0.75
        elif total_weight >= 40:
            return 0.5
        else:
            return 0.25  # Minimum size for weak signals


# Example usage
if __name__ == '__main__':
    calculator = SignalWeightCalculator()
    
    # Example signal
    candle = {
        'symbol': 'EURUSD',
        'granularity': 'M15',
        'open': 1.0850,
        'high': 1.0865,
        'low': 1.0845,
        'close': 1.0860,
        'rsi': 35,
        'ema12': 1.0855,
        'ema21': 1.0850,
        'adx': 28
    }
    
    multi_tf = [
        {'granularity': 'H1', 'label': 'BUY', 'label_confidence': 72},
        {'granularity': 'M5', 'label': 'BUY', 'label_confidence': 65}
    ]
    
    risk_metrics = {
        'current_drawdown_pct': 3,
        'symbol_win_rate': 58
    }
    
    result = calculator.calculate_weight(
        ml_confidence=68,
        signal_direction='BUY',
        candle_data=candle,
        multi_tf_signals=multi_tf,
        risk_metrics=risk_metrics
    )
    
    print("="*70)
    print("SIGNAL WEIGHT ANALYSIS")
    print("="*70)
    print(f"\n💰 Total Weight: {result['total_weight']}/100")
    print(f"📊 Recommendation: {result['recommendation']}")
    print(f"📏 Position Size Multiplier: {result['position_size_multiplier']}x")
    print(f"\n📋 Component Breakdown:")
    for component, score in result['components'].items():
        print(f"   {component}: {score}/100")
    print("="*70)
