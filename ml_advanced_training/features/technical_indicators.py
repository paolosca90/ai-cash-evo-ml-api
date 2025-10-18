import pandas as pd
import pandas_ta as ta


def compute_indicators(df: pd.DataFrame) -> pd.DataFrame:
    enriched = df.copy()
    enriched["rsi"] = ta.rsi(enriched["close"], length=14)
    enriched["ema_fast"] = ta.ema(enriched["close"], length=12)
    enriched["ema_slow"] = ta.ema(enriched["close"], length=26)
    enriched["ema_cross"] = enriched["ema_fast"] - enriched["ema_slow"]
    enriched["atr"] = ta.atr(enriched["high"], enriched["low"], enriched["close"], length=14)
    bbands = ta.bbands(enriched["close"], length=20, std=2)
    enriched["bb_high"] = bbands[f"BBU_20_2.0"]
    enriched["bb_low"] = bbands[f"BBL_20_2.0"]
    enriched["bb_width"] = bbands[f"BBB_20_2.0"]
    enriched["roc"] = ta.roc(enriched["close"], length=10)
    enriched["willr"] = ta.willr(enriched["high"], enriched["low"], enriched["close"], length=14)
    stoch = ta.stoch(enriched["high"], enriched["low"], enriched["close"])
    enriched["stoch_k"] = stoch.iloc[:, 0]
    enriched["stoch_d"] = stoch.iloc[:, 1]
    enriched["tema"] = ta.tema(enriched["close"], length=21)
    ppo = ta.ppo(enriched["close"], fast=12, slow=26)
    enriched["ppo"] = ppo.iloc[:, 0]
    enriched["ppo_signal"] = ppo.iloc[:, 1]
    enriched["tsi"] = ta.tsi(enriched["close"], long=25, short=13)

    enriched = enriched.dropna()

    return enriched
