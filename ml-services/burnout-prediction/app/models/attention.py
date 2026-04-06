"""Multi-head attention module for LSTM output aggregation.

Applies scaled dot-product attention over LSTM hidden states
to produce a context-weighted representation.

Model type: LSTM architecture component (not used in heuristic_v0.1)
"""

from __future__ import annotations

import math

import numpy as np
import structlog

logger = structlog.get_logger()


class ScaledDotProductAttention:
    """Scaled dot-product attention (NumPy reference implementation).

    This is a reference implementation for testing and documentation.
    The production PyTorch version will use nn.MultiheadAttention.

    Attention(Q, K, V) = softmax(QK^T / sqrt(d_k)) V
    """

    def __init__(self, d_model: int, num_heads: int = 4) -> None:
        self.d_model = d_model
        self.num_heads = num_heads
        self.d_k = d_model // num_heads

        if d_model % num_heads != 0:
            raise ValueError(
                f"d_model ({d_model}) must be divisible by num_heads ({num_heads})"
            )

    def forward(
        self,
        query: np.ndarray,
        key: np.ndarray,
        value: np.ndarray,
        mask: np.ndarray | None = None,
    ) -> np.ndarray:
        """Compute multi-head attention.

        Args:
            query: Shape (batch, seq_len, d_model)
            key: Shape (batch, seq_len, d_model)
            value: Shape (batch, seq_len, d_model)
            mask: Optional attention mask

        Returns:
            Attention output of shape (batch, seq_len, d_model)
        """
        batch_size = query.shape[0]
        seq_len = query.shape[1]

        # Reshape for multi-head: (batch, heads, seq, d_k)
        q = query.reshape(batch_size, seq_len, self.num_heads, self.d_k).transpose(0, 2, 1, 3)
        k = key.reshape(batch_size, seq_len, self.num_heads, self.d_k).transpose(0, 2, 1, 3)
        v = value.reshape(batch_size, seq_len, self.num_heads, self.d_k).transpose(0, 2, 1, 3)

        # Scaled dot-product attention
        scores = np.matmul(q, k.transpose(0, 1, 3, 2)) / math.sqrt(self.d_k)

        if mask is not None:
            scores = np.where(mask == 0, -1e9, scores)

        # Softmax along last dimension
        attention_weights = self._softmax(scores)

        # Weighted sum
        context = np.matmul(attention_weights, v)

        # Reshape back: (batch, seq, d_model)
        context = context.transpose(0, 2, 1, 3).reshape(batch_size, seq_len, self.d_model)

        return context

    @staticmethod
    def _softmax(x: np.ndarray) -> np.ndarray:
        """Numerically stable softmax along last axis."""
        exp_x = np.exp(x - np.max(x, axis=-1, keepdims=True))
        return exp_x / np.sum(exp_x, axis=-1, keepdims=True)


def aggregate_with_attention(
    hidden_states: np.ndarray,
    d_model: int = 256,
    num_heads: int = 4,
) -> np.ndarray:
    """Apply self-attention over LSTM hidden states and return context vector.

    Args:
        hidden_states: Shape (batch, seq_len, d_model)
        d_model: Model dimension
        num_heads: Number of attention heads

    Returns:
        Context vector of shape (batch, d_model)
    """
    attn = ScaledDotProductAttention(d_model=d_model, num_heads=num_heads)
    attended = attn.forward(hidden_states, hidden_states, hidden_states)
    # Mean pooling over sequence dimension
    return np.mean(attended, axis=1)
