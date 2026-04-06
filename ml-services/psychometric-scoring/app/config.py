"""Application configuration (Pydantic Settings)."""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Service configuration loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # Service
    service_name: str = Field(default="psychometric-scoring")
    service_version: str = Field(default="0.1.0")
    environment: Literal["development", "staging", "production", "test"] = Field(
        default="development"
    )
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = Field(default="INFO")
    port: int = Field(default=8021)

    # Database
    database_url: str = Field(
        default="postgresql://upcore:upcore@localhost:5432/upcore_psychometrics"
    )
    db_pool_min_size: int = Field(default=2)
    db_pool_max_size: int = Field(default=10)
    db_enabled: bool = Field(default=False)

    # Redis
    redis_url: str = Field(default="redis://localhost:6379/0")
    redis_enabled: bool = Field(default=False)
    norms_cache_ttl: int = Field(default=3600)

    # Default norm versions
    default_norm_version_bat: str = Field(default="bat12-tr-provisional-v0.1")
    default_norm_version_upcap: str = Field(default="upcap-tr-v0.1")
    default_norm_version_copsoq: str = Field(default="copsoq-iii-tr-v1.0")

    # Observability
    otel_endpoint: str = Field(default="")
    sentry_dsn: str = Field(default="")

    # Data directory (JSON norm tables, items)
    data_dir: str = Field(default="data")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached settings instance."""
    return Settings()
