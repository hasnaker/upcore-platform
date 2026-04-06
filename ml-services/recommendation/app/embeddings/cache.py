"""Redis cache for embedding vectors.

Caches embeddings by content hash with 24h TTL to avoid
redundant Azure OpenAI API calls.
"""

from __future__ import annotations

import hashlib
import json

import structlog

from app.config import settings

logger = structlog.get_logger()


class EmbeddingCache:
    """Redis-backed embedding cache."""

    def __init__(self, redis_client) -> None:
        self.redis = redis_client
        self.ttl = settings.EMBEDDING_CACHE_TTL

    async def get(self, text: str) -> list[float] | None:
        """Get cached embedding for text.

        Args:
            text: Input text.

        Returns:
            Cached embedding vector or None if not found.
        """
        if self.redis is None:
            return None

        key = self._cache_key(text)
        try:
            cached = await self.redis.get(key)
            if cached:
                return json.loads(cached)
        except Exception:
            pass
        return None

    async def set(self, text: str, embedding: list[float]) -> None:
        """Cache an embedding vector.

        Args:
            text: Input text (used for key derivation).
            embedding: Embedding vector to cache.
        """
        if self.redis is None:
            return

        key = self._cache_key(text)
        try:
            await self.redis.setex(key, self.ttl, json.dumps(embedding))
        except Exception:
            logger.debug("embedding_cache_set_failed", exc_info=True)

    async def invalidate(self, text: str) -> None:
        """Invalidate cached embedding for text."""
        if self.redis is None:
            return

        key = self._cache_key(text)
        try:
            await self.redis.delete(key)
        except Exception:
            pass

    @staticmethod
    def _cache_key(text: str) -> str:
        """Generate cache key from text content hash."""
        content_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]
        return f"emb:{content_hash}"
