"""Burnout LSTM retraining pipeline.

Inputs  : parquet snapshot of last 12 months BAT/COPSOQ features + event sequences
Outputs : TensorFlow saved_model + metrics log + Azure ML run artifacts

Run: `python train_burnout.py --snapshot s3://.../raw.parquet --out /ml/out`
"""
from __future__ import annotations

import argparse
import json
import logging
import os
from datetime import datetime

import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger("burnout-train")


def build_features(df: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
    """Expand BAT/COPSOQ columns + last-6-month overtime sequence into a 3D tensor.

    Shape: (N, timesteps=6, features=12). Label: 1 = burnout risk >=0.75 within 90 days.
    """
    required = [
        "bat_exhaustion", "bat_cynicism", "bat_efficacy", "bat_overall",
        "copsoq_workload", "copsoq_conflict", "copsoq_support",
        "uwes_vigor", "uwes_dedication", "uwes_absorption",
        "overtime_ytd_hours", "leave_days_used",
    ]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Missing columns: {missing}")

    X = df[required].fillna(0).to_numpy(dtype=np.float32)
    y = (df["risk_90d"] >= 0.75).astype(int).to_numpy()

    # Simple windowing: each row becomes a 6-step synthetic sequence by
    # replicating the snapshot. Real deployment reads the event_sequence
    # column (JSON[] of last N measurements) and stacks them.
    X_seq = np.repeat(X[:, np.newaxis, :], 6, axis=1)
    return X_seq, y


def train_lstm(x_train, y_train, x_val, y_val, epochs: int = 50) -> "tf.keras.Model":
    """Compile + fit a small LSTM. Imported lazily so the module imports fast."""
    import tensorflow as tf  # noqa: WPS433

    model = tf.keras.Sequential([
        tf.keras.layers.Input(shape=x_train.shape[1:]),
        tf.keras.layers.LSTM(32, return_sequences=False),
        tf.keras.layers.Dropout(0.3),
        tf.keras.layers.Dense(16, activation="relu"),
        tf.keras.layers.Dense(1, activation="sigmoid"),
    ])
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss="binary_crossentropy",
        metrics=["AUC", "accuracy"],
    )
    cb = [
        tf.keras.callbacks.EarlyStopping(patience=5, restore_best_weights=True, monitor="val_auc", mode="max"),
        tf.keras.callbacks.ReduceLROnPlateau(patience=3, factor=0.5, monitor="val_loss"),
    ]
    model.fit(
        x_train, y_train,
        validation_data=(x_val, y_val),
        epochs=epochs, batch_size=64, callbacks=cb, verbose=2,
    )
    return model


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--snapshot", required=True, help="Parquet path (s3/abfs/local)")
    parser.add_argument("--out", required=True, help="Model output directory")
    parser.add_argument("--epochs", type=int, default=50)
    args = parser.parse_args()

    logger.info("Loading snapshot: %s", args.snapshot)
    df = pd.read_parquet(args.snapshot)
    logger.info("Rows: %d", len(df))

    X, y = build_features(df)
    x_train, x_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    logger.info("Train=%d, Val=%d, pos_ratio_train=%.3f", len(x_train), len(x_val), y_train.mean())

    model = train_lstm(x_train, y_train, x_val, y_val, epochs=args.epochs)
    probs = model.predict(x_val).flatten()
    auc = roc_auc_score(y_val, probs)
    logger.info("Final AUC: %.4f", auc)

    os.makedirs(args.out, exist_ok=True)
    model.save(os.path.join(args.out, "burnout_lstm.keras"))

    metrics = {
        "auc": float(auc),
        "n_train": int(len(x_train)),
        "n_val": int(len(x_val)),
        "trained_at": datetime.utcnow().isoformat(),
    }
    with open(os.path.join(args.out, "metrics.json"), "w") as f:
        json.dump(metrics, f, indent=2)

    logger.info("Saved model + metrics to %s", args.out)

    # Acceptance gate: block canary promotion when AUC drops below threshold.
    if auc < 0.75:
        raise SystemExit(f"AUC {auc:.3f} below threshold 0.75 — skipping deploy")


if __name__ == "__main__":
    main()
