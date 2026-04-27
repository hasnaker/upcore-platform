"""Azure OpenAI embeddings client with retry and backoff.

Uses text-embedding-3-large (3072 dims) for both intervention catalog
embeddings and employee profile query embeddings.
"""

from __future__ import annotations

import structlog
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import settings

logger = structlog.get_logger()


class EmbeddingClient:
    """Azure OpenAI embedding client with batching and retry."""

    def __init__(self) -> None:
        self._client = None
        self._initialized = False

    async def initialize(self) -> None:
        """Initialize the OpenAI client."""
        if not settings.AZURE_OPENAI_ENDPOINT or not settings.AZURE_OPENAI_API_KEY:
            logger.warning("azure_openai_not_configured")
            return

        try:
            from openai import AsyncAzureOpenAI

            self._client = AsyncAzureOpenAI(
                azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
                api_key=settings.AZURE_OPENAI_API_KEY,
                api_version=settings.AZURE_OPENAI_API_VERSION,
            )
            self._initialized = True
            logger.info("azure_openai_client_initialized")
        except ImportError:
            logger.warning("openai_package_not_installed")

    async def embed_text(self, text: str) -> list[float]:
        """Embed a single text string.

        Args:
            text: Text to embed.

        Returns:
            Embedding vector of dimension EMBEDDING_DIM.
        """
        if not self._initialized or self._client is None:
            return self._zero_embedding()

        try:
            return await self._retryable_embed([text])
        except Exception as exc:
            logger.error("embedding_failed", text_length=len(text), error=str(exc))
            return self._zero_embedding()

    async def embed_batch(
        self,
        texts: list[str],
        batch_size: int | None = None,
    ) -> list[list[float]]:
        """Embed multiple texts in batches.

        Args:
            texts: List of texts to embed.
            batch_size: Batch size (default from config).

        Returns:
            List of embedding vectors.
        """
        if not self._initialized or self._client is None:
            return [self._zero_embedding() for _ in texts]

        if batch_size is None:
            batch_size = settings.EMBEDDING_BATCH_SIZE

        all_embeddings: list[list[float]] = []

        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            try:
                batch_embeddings = await self._retryable_embed(batch)
                if isinstance(batch_embeddings[0], list):
                    all_embeddings.extend(batch_embeddings)
                else:
                    all_embeddings.append(batch_embeddings)
            except Exception as exc:
                logger.error(
                    "batch_embedding_failed",
                    batch_start=i,
                    batch_size=len(batch),
                    error=str(exc),
                )
                all_embeddings.extend([self._zero_embedding() for _ in batch])

        return all_embeddings

    @retry(
        stop=stop_after_attempt(5),
        wait=wait_exponential(multiplier=1, min=1, max=30),
        reraise=True,
    )
    async def _retryable_embed(self, texts: list[str]) -> list[float] | list[list[float]]:
        """Embed with retry on transient failures."""
        response = await self._client.embeddings.create(
            input=texts,
            model=settings.EMBEDDING_MODEL,
        )

        if len(texts) == 1:
            return response.data[0].embedding
        return [item.embedding for item in response.data]

    def _zero_embedding(self) -> list[float]:
        """Return zero embedding vector."""
        return [0.0] * settings.EMBEDDING_DIM
