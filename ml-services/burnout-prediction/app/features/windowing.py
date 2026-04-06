"""Sliding window construction for LSTM input.

Converts per-employee longitudinal feature frames into fixed-length
windows of shape (seq_len=12, features=42) for model input.
"""

from __future__ import annotations

import numpy as np
import structlog

from app.features.feature_spec import FEATURE_COUNT

logger = structlog.get_logger()

DEFAULT_SEQ_LEN = 12  # 12 timesteps x biweekly = ~6 months lookback


def build_windows(
    data: np.ndarray,
    seq_len: int = DEFAULT_SEQ_LEN,
    stride: int = 1,
) -> np.ndarray:
    """Build sliding windows from a 2D feature array.

    Args:
        data: Array of shape (timesteps, features).
        seq_len: Window length (default 12).
        stride: Step size between windows (default 1).

    Returns:
        Array of shape (n_windows, seq_len, features).
    """
    if data.ndim != 2:
        raise ValueError(f"Expected 2D array, got {data.ndim}D")

    n_timesteps, n_features = data.shape

    if n_features != FEATURE_COUNT:
        logger.warning(
            "feature_count_mismatch",
            expected=FEATURE_COUNT,
            actual=n_features,
        )

    if n_timesteps < seq_len:
        padded = pad_short_window(data, seq_len)
        return padded[np.newaxis, :, :]

    n_windows = (n_timesteps - seq_len) // stride + 1
    windows = np.zeros((n_windows, seq_len, n_features), dtype=np.float32)

    for i in range(n_windows):
        start = i * stride
        windows[i] = data[start : start + seq_len]

    return windows


def pad_short_window(data: np.ndarray, seq_len: int = DEFAULT_SEQ_LEN) -> np.ndarray:
    """Pad a short sequence to the required length by repeating the first row.

    This avoids introducing arbitrary values while maintaining temporal
    structure for the model.

    Args:
        data: Array of shape (timesteps, features) where timesteps < seq_len.
        seq_len: Target sequence length.

    Returns:
        Array of shape (seq_len, features).
    """
    n_timesteps, n_features = data.shape

    if n_timesteps >= seq_len:
        return data[-seq_len:]

    pad_length = seq_len - n_timesteps
    # Repeat the first (oldest) observation for padding
    pad = np.tile(data[0:1], (pad_length, 1))
    padded = np.concatenate([pad, data], axis=0)

    logger.debug(
        "padded_short_window",
        original_len=n_timesteps,
        padded_len=seq_len,
        pad_count=pad_length,
    )

    return padded


def build_single_window(features_list: list[dict[str, float]], feature_names: list[str]) -> np.ndarray:
    """Build a single window from a list of feature dicts.

    Args:
        features_list: List of feature dicts, one per timestep (oldest first).
        feature_names: Ordered list of feature names.

    Returns:
        Array of shape (seq_len, features).
    """
    n_timesteps = len(features_list)
    n_features = len(feature_names)
    data = np.zeros((n_timesteps, n_features), dtype=np.float32)

    for t, feat_dict in enumerate(features_list):
        for f_idx, f_name in enumerate(feature_names):
            data[t, f_idx] = feat_dict.get(f_name, 0.0)

    if n_timesteps < DEFAULT_SEQ_LEN:
        return pad_short_window(data, DEFAULT_SEQ_LEN)

    return data[-DEFAULT_SEQ_LEN:]
