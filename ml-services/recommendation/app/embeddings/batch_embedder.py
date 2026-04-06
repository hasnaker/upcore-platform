"""Batch embedding generator for intervention catalog.

Batches catalog items into chunks of 96, parallelizes async calls,
and persists embeddings to PostgreSQL.
"""

from __future__ import annotations

import structlog

from app.config import settings
from app.embeddings.azure_openai import EmbeddingClient

logger = structlog.get_logger()


class BatchEmbedder:
    """Generates and persists embeddings for catalog interventions."""

    def __init__(self, embedding_client: EmbeddingClient, pg_pool) -> None:
        self.client = embedding_client
        self.pg = pg_pool

    async def embed_catalog(self, interventions: list[dict]) -> dict:
        """Embed all interventions in the catalog.

        Args:
            interventions: List of intervention dicts with title/description.

        Returns:
            Report dict with counts and errors.
        """
        texts = [self._build_embed_text(i) for i in interventions]
        ids = [i["id"] for i in interventions]

        logger.info("batch_embedding_started", total=len(texts))

        embeddings = await self.client.embed_batch(
            texts, batch_size=settings.EMBEDDING_BATCH_SIZE
        )

        success_count = 0
        error_count = 0

        for iid, embedding in zip(ids, embeddings):
            if self.pg:
                try:
                    embedding_str = "[" + ",".join(str(v) for v in embedding) + "]"
                    await self.pg.execute(
                        """UPDATE interventions SET embedding = $1::vector
                           WHERE id = $2""",
                        embedding_str,
                        iid,
                    )
                    success_count += 1
                except Exception:
                    error_count += 1
                    logger.warning("embedding_persist_failed", intervention_id=str(iid))
            else:
                success_count += 1  # Count as success in test mode

        report = {
            "total": len(texts),
            "embedded": success_count,
            "errors": error_count,
        }

        logger.info("batch_embedding_completed", **report)
        return report

    @staticmethod
    def _build_embed_text(intervention: dict) -> str:
        """Build text representation for embedding.

        Combines bilingual title, description, and metadata.
        """
        parts = [
            intervention.get("title_tr", ""),
            intervention.get("title_en", ""),
            intervention.get("description_tr", ""),
            intervention.get("description_en", ""),
            f"evidence: {intervention.get('evidence_tier', 'C')}",
            f"drivers: {', '.join(intervention.get('target_drivers', []))}",
        ]
        return " | ".join(p for p in parts if p)
