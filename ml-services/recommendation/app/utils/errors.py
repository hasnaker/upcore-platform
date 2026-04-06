"""Custom exceptions for recommendation service."""


class RecommendationServiceError(Exception):
    """Base exception."""


class EmbeddingFailureError(RecommendationServiceError):
    """Azure OpenAI embedding call failed after retries."""


class CatalogEmptyError(RecommendationServiceError):
    """No interventions in catalog."""


class PosteriorNotFoundError(RecommendationServiceError):
    """Posterior not found for intervention-segment pair."""
