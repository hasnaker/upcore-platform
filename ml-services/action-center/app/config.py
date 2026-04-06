"""Service configuration via environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Action center service settings."""

    # Service
    SERVICE_NAME: str = "action-center"
    SERVICE_VERSION: str = "0.1.0"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8024

    # Database
    DATABASE_URL: str = "postgresql://upcore:upcore@localhost:5432/upcore"
    DB_POOL_MIN: int = 2
    DB_POOL_MAX: int = 10

    # Redis
    REDIS_URL: str = "redis://localhost:6379/2"
    CACHE_TTL_SECONDS: int = 1800  # 30 minutes

    # Action limits (Miller's cognitive load)
    MAX_ACTIONS: int = 5

    # Azure OpenAI for rationale generation
    AZURE_OPENAI_ENDPOINT: str = ""
    AZURE_OPENAI_API_KEY: str = ""
    AZURE_OPENAI_API_VERSION: str = "2024-06-01"
    LLM_MODEL: str = "gpt-4o"
    LLM_TEMPERATURE: float = 0.2
    LLM_MAX_TOKENS: int = 180

    # Upstream services
    BURNOUT_SERVICE_URL: str = "http://localhost:8022"
    RECOMMENDATION_SERVICE_URL: str = "http://localhost:8023"

    # Safety
    SAFETY_GUARD_STRICT: bool = True

    # Circuit breaker
    CB_FAILURE_THRESHOLD: int = 5
    CB_RECOVERY_TIMEOUT: int = 30

    model_config = {"env_prefix": "ACTION_", "env_file": ".env"}


settings = Settings()
