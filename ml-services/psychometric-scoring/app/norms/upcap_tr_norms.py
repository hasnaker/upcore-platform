"""UpCap-TR v1.0 norm store — loads JSON snapshot at import, exposes helpers.

The norm JSON is authoritative for the Python scoring path. Database-backed
norms (app.psychometric_norms) are read separately by production API callers;
this module guarantees deterministic scoring even when the DB is unreachable.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import structlog

logger = structlog.get_logger(__name__)

_NORM_FILE = Path(__file__).parent / "data" / "upcap_tr_v1_0.json"

_CACHE: dict[str, Any] | None = None


def load_upcap_tr_norms() -> dict[str, Any]:
    """Load and cache the UpCap-TR v1.0 norm bundle."""
    global _CACHE
    if _CACHE is not None:
        return _CACHE

    if not _NORM_FILE.exists():
        logger.warning("upcap_tr_norm_missing", path=str(_NORM_FILE))
        _CACHE = {
            "instrument": "upcap_tr",
            "version": "1.0",
            "validated": False,
            "overall": {},
            "sectors": {},
            "age_bands": {},
        }
        return _CACHE

    with open(_NORM_FILE, encoding="utf-8") as f:
        _CACHE = json.load(f)
    logger.info(
        "upcap_tr_norms_loaded",
        n=_CACHE.get("n", 0),
        validated=_CACHE.get("validated", False),
    )
    return _CACHE


def get_overall_norm() -> dict[str, Any]:
    return load_upcap_tr_norms().get("overall", {}) or {}


def get_sector_norm(sector: str | None) -> dict[str, Any] | None:
    if sector is None:
        return None
    sectors = load_upcap_tr_norms().get("sectors", {}) or {}
    return sectors.get(sector)


def get_age_band_norm(age_band: str | None) -> dict[str, Any] | None:
    if age_band is None:
        return None
    bands = load_upcap_tr_norms().get("age_bands", {}) or {}
    return bands.get(age_band)


def get_validation_status() -> bool:
    return bool(load_upcap_tr_norms().get("validated", False))


def get_all_sectors() -> dict[str, dict[str, Any]]:
    return load_upcap_tr_norms().get("sectors", {}) or {}


def get_all_age_bands() -> dict[str, dict[str, Any]]:
    return load_upcap_tr_norms().get("age_bands", {}) or {}
