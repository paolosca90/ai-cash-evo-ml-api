from __future__ import annotations

import json
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple

import joblib
import pandas as pd
from dotenv import load_dotenv
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
from sklearn.model_selection import GridSearchCV
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from config import TrainingConfig
from data_fetcher import load_datasets
from features.labels import compute_targets
from features.technical_indicators import compute_indicators

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
)
logger = logging.getLogger("ml_training")

BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"
OUTPUTS_DIR = BASE_DIR / "outputs"
REPORTS_DIR = BASE_DIR / "reports"

for directory in (MODELS_DIR, OUTPUTS_DIR, REPORTS_DIR):
    directory.mkdir(parents=True, exist_ok=True)


def prepare_symbol_dataset(df: pd.DataFrame, symbol: str) -> pd.DataFrame:
    features = compute_indicators(df)
    labeled = compute_targets(features)
    labeled["symbol"] = symbol
    return labeled


def assemble_datasets(datasets: Dict[str, Dict[str, pd.DataFrame]]) -> Tuple[pd.DataFrame, pd.DataFrame]:
    train_frames: List[pd.DataFrame] = []
    test_frames: List[pd.DataFrame] = []

    for symbol, splits in datasets.items():
        train_frames.append(prepare_symbol_dataset(splits["train"], symbol))
        test_frames.append(prepare_symbol_dataset(splits["test"], symbol))

    train_df = pd.concat(train_frames).reset_index(drop=True)
    test_df = pd.concat(test_frames).reset_index(drop=True)

    return train_df, test_df


def build_pipeline(hidden_layer_sizes: Tuple[int, ...]) -> Pipeline:
    mlp = MLPClassifier(
        hidden_layer_sizes=hidden_layer_sizes,
        activation="relu",
        solver="adam",
        learning_rate_init=0.001,
        max_iter=400,
        random_state=42,
        n_iter_no_change=20,
    )

    return Pipeline([
        ("scaler", StandardScaler()),
        ("classifier", mlp),
    ])


def select_feature_columns(df: pd.DataFrame) -> List[str]:
    exclude = {"target", "future_return", "future_volatility", "symbol"}
    return [col for col in df.columns if col not in exclude]


def compute_weights(test_df: pd.DataFrame, prob_column: str = "probability") -> Dict[str, float]:
    grouped = test_df.groupby("symbol")[prob_column].mean()
    positive = grouped.clip(lower=0)
    total = positive.sum()
    if total == 0:
        return {symbol: 1.0 / len(grouped) for symbol in grouped.index}
    normalized = positive / total
    return normalized.round(4).to_dict()


def save_outputs(
    pipeline: Pipeline,
    feature_columns: List[str],
    metrics: Dict[str, float],
    classification_rep: str,
    confusion: List[List[int]],
    weights: Dict[str, float],
) -> None:
    timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")

    model_path = MODELS_DIR / f"mlp_model_{timestamp}.joblib"
    report_path = REPORTS_DIR / f"classification_report_{timestamp}.txt"
    confusion_path = REPORTS_DIR / f"confusion_matrix_{timestamp}.json"
    metrics_path = OUTPUTS_DIR / f"metrics_{timestamp}.json"
    weights_path = OUTPUTS_DIR / f"weights_{timestamp}.json"

    joblib.dump({
        "pipeline": pipeline,
        "feature_columns": feature_columns,
    }, model_path)
    report_path.write_text(classification_rep, encoding="utf-8")
    confusion_path.write_text(json.dumps(confusion, indent=2), encoding="utf-8")
    metrics_path.write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    weights_path.write_text(json.dumps(weights, indent=2), encoding="utf-8")

    logger.info("Model salvato in %s", model_path)
    logger.info("Metriche salvate in %s", metrics_path)
    logger.info("Pesi normalizzati salvati in %s", weights_path)


def run_training() -> None:
    load_env()
    config = TrainingConfig.from_env()
    logger.info("Config caricata: %s", config)

    datasets = load_datasets(config)
    train_df, test_df = assemble_datasets(datasets)

    feature_columns = select_feature_columns(train_df)
    X_train = train_df[feature_columns]
    y_train = train_df["target"]
    X_test = test_df[feature_columns]
    y_test = test_df["target"]

    grid = GridSearchCV(
        estimator=build_pipeline((128, 64)),
        param_grid={
            "classifier__hidden_layer_sizes": [(256, 128), (128, 64), (64, 32)],
            "classifier__alpha": [0.0005, 0.001, 0.005],
        },
        scoring="roc_auc",
        n_jobs=-1,
        cv=3,
        verbose=1,
    )

    grid.fit(X_train, y_train)
    best_pipeline: Pipeline = grid.best_estimator_
    logger.info("Migliori parametri: %s", grid.best_params_)

    y_proba = best_pipeline.predict_proba(X_test)[:, 1]
    y_pred = (y_proba > 0.5).astype(int)

    auc = roc_auc_score(y_test, y_proba)
    report = classification_report(y_test, y_pred)
    conf_matrix = confusion_matrix(y_test, y_pred).tolist()

    metrics = {
        "roc_auc": auc,
        "best_params": grid.best_params_,
        "best_score_cv": grid.best_score_,
    }

    test_df = test_df.copy()
    test_df["probability"] = y_proba
    weights = compute_weights(test_df)

    save_outputs(best_pipeline, feature_columns, metrics, report, conf_matrix, weights)

    logger.info("Training completato. ROC_AUC: %.4f", auc)
    logger.info("Pesi suggeriti: %s", weights)


def load_env() -> None:
    env_path = BASE_DIR / ".env"
    if env_path.exists():
        load_dotenv(env_path)
        logger.info("Variabili ambiente caricate da %s", env_path)
    else:
        load_dotenv()
    return None


if __name__ == "__main__":
    run_training()
