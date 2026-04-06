"""Service configuration via environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Burnout prediction service settings."""

    # Service
    SERVICE_NAME: str = "burnout-prediction"
    SERVICE_VERSION: str = "0.1.0"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8022

    # Database
    DATABASE_URL: str = "postgresql://upcore:upcore@localhost:5432/upcore"
    DB_POOL_MIN: int = 2
    DB_POOL_MAX: int = 10

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    CACHE_TTL_SECONDS: int = 300

    # Model
    ACTIVE_MODEL_TYPE: str = "heuristic_v0.1"
    MC_DROPOUT_SAMPLES: int = 30
    DEVICE: str = "cpu"

    # Heuristic model thresholds (v0.1)
    BURNOUT_RED_THRESHOLD: float = 0.50
    BURNOUT_AMBER_THRESHOLD: float = 0.25

    # Feature spec
    FEATURE_COUNT: int = 42
    SEQUENCE_LENGTH: int = 12

    # Fairness
    FAIRNESS_TOLERANCE: float = 0.10

    # Calibration
    TARGET_ECE: float = 0.05

    model_config = {"env_prefix": "BURNOUT_", "env_file": ".env"}


settings = Settings()
