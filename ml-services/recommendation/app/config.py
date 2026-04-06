"""Service configuration via environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Recommendation service settings."""

    # Service
    SERVICE_NAME: str = "recommendation"
    SERVICE_VERSION: str = "0.1.0"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8023

    # Database (pgvector-enabled)
    DATABASE_URL: str = "postgresql://upcore:upcore@localhost:5432/upcore"
    DB_POOL_MIN: int = 2
    DB_POOL_MAX: int = 10

    # Redis
    REDIS_URL: str = "redis://localhost:6379/1"
    CACHE_TTL_SECONDS: int = 300
    EMBEDDING_CACHE_TTL: int = 86400  # 24h

    # Azure OpenAI Embeddings
    AZURE_OPENAI_ENDPOINT: str = ""
    AZURE_OPENAI_API_KEY: str = ""
    AZURE_OPENAI_API_VERSION: str = "2024-06-01"
    EMBEDDING_MODEL: str = "text-embedding-3-large"
    EMBEDDING_DIM: int = 3072
    EMBEDDING_BATCH_SIZE: int = 96

    # pgvector HNSW
    HNSW_M: int = 16
    HNSW_EF_CONSTRUCTION: int = 200
    HNSW_EF_SEARCH: int = 100

    # CBR
    CBR_TOP_K: int = 10

    # Thompson sampling
    THOMPSON_PRIOR_ALPHA: float = 1.0
    THOMPSON_PRIOR_BETA: float = 1.0
    MIN_LOCAL_OUTCOMES: int = 30

    # Ranker weights
    WEIGHT_SIMILARITY: float = 0.4
    WEIGHT_THOMPSON: float = 0.3
    WEIGHT_EVIDENCE: float = 0.2
    WEIGHT_RECENCY: float = 0.1

    # MMR diversity
    MMR_LAMBDA: float = 0.7

    model_config = {"env_prefix": "REC_", "env_file": ".env"}


settings = Settings()
