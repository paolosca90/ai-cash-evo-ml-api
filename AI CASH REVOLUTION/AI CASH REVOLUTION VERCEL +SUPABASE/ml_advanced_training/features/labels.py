import pandas as pd


def compute_targets(df: pd.DataFrame, horizon: int = 6) -> pd.DataFrame:
    labeled = df.copy()
    labeled["future_return"] = labeled["close"].shift(-horizon) / labeled["close"] - 1.0
    labeled["future_volatility"] = labeled["future_return"].rolling(window=horizon).std()
    labeled["target"] = (labeled["future_return"] > 0).astype(int)
    labeled = labeled.dropna()
    return labeled
