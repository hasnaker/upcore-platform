"""Tests for cache key generation and utilities."""

from __future__ import annotations

from app.cache.redis_cache import build_cache_key


class TestBuildCacheKey:
    def test_deterministic(self) -> None:
        """Same inputs should produce same key."""
        key1 = build_cache_key("t1", "u1", "admin", {"team_id": "x"})
        key2 = build_cache_key("t1", "u1", "admin", {"team_id": "x"})
        assert key1 == key2

    def test_different_scope_different_key(self) -> None:
        """Different scopes should produce different keys."""
        key1 = build_cache_key("t1", "u1", "admin", {"team_id": "x"})
        key2 = build_cache_key("t1", "u1", "admin", {"team_id": "y"})
        assert key1 != key2

    def test_different_role_different_key(self) -> None:
        """Different roles should produce different keys."""
        key1 = build_cache_key("t1", "u1", "admin", None)
        key2 = build_cache_key("t1", "u1", "employee", None)
        assert key1 != key2

    def test_none_scope(self) -> None:
        """None scope should produce valid key."""
        key = build_cache_key("t1", "u1", "admin", None)
        assert key.startswith("actions:")
