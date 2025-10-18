from __future__ import annotations

import os
from dataclasses import dataclass
from typing import List


@dataclass
class TrainingConfig:
    oanda_api_key: str
    oanda_api_url: str
    symbols: List[str]
    training_start: str
    training_end: str
    test_start: str
    test_end: str
    time_frame: str = "5min"
    risk_reward_ratio: float = 2.5
    atr_multiplier_sl: float = 1.5

    @classmethod
    def from_env(cls) -> "TrainingConfig":
        api_key = os.getenv("OANDA_API_KEY")
        if not api_key:
            raise EnvironmentError(
                "OANDA_API_KEY non configurata. Imposta la variabile d'ambiente prima di eseguire il training."
            )

        api_url = os.getenv("OANDA_API_URL", "https://api-fxpractice.oanda.com")

        symbols_env = os.getenv("TRAINING_SYMBOLS", "EURUSD,GBPUSD,USDJPY,XAUUSD")
        symbols = [s.strip().upper() for s in symbols_env.split(",") if s.strip()]

        return cls(
            oanda_api_key=api_key,
            oanda_api_url=api_url,
            symbols=symbols,
            training_start=os.getenv("TRAINING_START", "2025-06-01"),
            training_end=os.getenv("TRAINING_END", "2025-08-31"),
            test_start=os.getenv("TEST_START", "2025-09-01"),
            test_end=os.getenv("TEST_END", "2025-09-30"),
        )
