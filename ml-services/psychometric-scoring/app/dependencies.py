"""FastAPI dependency injection functions."""

from __future__ import annotations

from typing import Any

from fastapi import Header, HTTPException

from app.config import Settings, get_settings
from app.storage.pg_client import get_pg
from app.storage.redis_client import get_redis


async def get_settings_dep() -> Settings:
    """Return application settings."""
    return get_settings()


async def get_redis_dep() -> Any:
    """Return Redis client (may be None if Redis is disabled)."""
    return await get_redis()


async def get_pg_dep() -> Any:
    """Return asyncpg pool (may be None if database is disabled)."""
    return await get_pg()


async def get_current_tenant(
    x_tenant_id: str = Header(..., description="Tenant UUID"),
) -> str:
    """Extract and validate tenant ID from request header."""
    if not x_tenant_id or not x_tenant_id.strip():
        raise HTTPException(status_code=400, detail="X-Tenant-Id header is required")
    return x_tenant_id.strip()


async def require_scope(scope: str = "scoring:read") -> str:
    """Placeholder for scope-based authorization.

    In production, this would validate JWT claims against required scope.
    Currently returns the scope string for logging purposes.
    """
    return scope
