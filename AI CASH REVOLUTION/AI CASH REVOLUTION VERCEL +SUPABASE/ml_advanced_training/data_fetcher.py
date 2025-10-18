from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Dict, List

import pandas as pd
import requests

from config import TrainingConfig

logger = logging.getLogger(__name__)


def _symbol_to_instrument(symbol: str) -> str:
    clean = symbol.replace("/", "").upper()
    if len(clean) == 6:
        return f"{clean[:3]}_{clean[3:]}"
    return clean


def _format_iso(dt: datetime) -> str:
    return dt.replace(microsecond=0).isoformat().replace("+00:00", "Z")


class OandaClient:
    def __init__(self, api_key: str, base_url: str) -> None:
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")

    def fetch_candles(
        self,
        symbol: str,
        start_date: str,
        end_date: str,
        granularity: str = "M5",
        chunk_days: int = 30,
    ) -> pd.DataFrame:
        instrument = _symbol_to_instrument(symbol)
        url = f"{self.base_url}/v3/instruments/{instrument}/candles"

        start_dt = datetime.fromisoformat(f"{start_date}T00:00:00+00:00")
        end_dt = datetime.fromisoformat(f"{end_date}T23:59:59+00:00")

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Accept-Datetime-Format": "RFC3339",
        }

        frames: List[pd.DataFrame] = []
        current_start = start_dt

        while current_start <= end_dt:
            current_end = min(current_start + timedelta(days=chunk_days - 1, hours=23, minutes=59, seconds=59), end_dt)

            params = {
                "price": "M",
                "granularity": granularity,
                "from": _format_iso(current_start),
                "to": _format_iso(current_end),
                "includeFirst": "true",
            }

            logger.info(
                "Scarico dati OANDA per %s (%s - %s)",
                symbol,
                params["from"],
                params["to"],
            )

            response = requests.get(url, headers=headers, params=params, timeout=30)
            response.raise_for_status()
            payload = response.json()
            candles = payload.get("candles", [])

            if not candles:
                current_start = current_end + timedelta(seconds=1)
                continue

            records = []
            for candle in candles:
                if not candle.get("complete", False):
                    continue
                mid = candle.get("mid", {})
                records.append(
                    {
                        "timestamp": pd.to_datetime(candle["time"], utc=True),
                        "open": float(mid.get("o", 0.0)),
                        "high": float(mid.get("h", 0.0)),
                        "low": float(mid.get("l", 0.0)),
                        "close": float(mid.get("c", 0.0)),
                        "volume": float(candle.get("volume", 0.0)),
                    }
                )

            if records:
                frame = pd.DataFrame(records).set_index("timestamp").sort_index()
                frames.append(frame)

            current_start = current_end + timedelta(seconds=1)

        if not frames:
            raise ValueError(f"Nessun dato trovato per {symbol}")

        df = pd.concat(frames).sort_index()
        df = df[~df.index.duplicated(keep="last")]
        return df


def load_datasets(config: TrainingConfig) -> Dict[str, Dict[str, pd.DataFrame]]:
    client = OandaClient(config.oanda_api_key, config.oanda_api_url)
    datasets: Dict[str, Dict[str, pd.DataFrame]] = {}

    for symbol in config.symbols:
        train_df = client.fetch_candles(symbol, config.training_start, config.training_end)
        test_df = client.fetch_candles(symbol, config.test_start, config.test_end)
        datasets[symbol] = {"train": train_df, "test": test_df}

    return datasets
