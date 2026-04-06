"""Reusable validation functions for psychometric instruments."""

from __future__ import annotations

from app.core.exceptions import InvalidResponseError


def validate_likert_range(
    value: int,
    min_val: int = 1,
    max_val: int = 5,
    item_key: str = "",
) -> int:
    """Validate that a response value is within Likert scale bounds."""
    if not min_val <= value <= max_val:
        raise InvalidResponseError(
            f"Item {item_key} value {value} outside range [{min_val}, {max_val}].",
            details={"item": item_key, "value": value, "min": min_val, "max": max_val},
        )
    return value


def validate_item_count(
    responses: dict[str, int],
    expected_keys: tuple[str, ...] | list[str] | frozenset[str],
    instrument: str = "",
    allow_missing: int = 0,
) -> None:
    """Validate that the correct number of items are present.

    Args:
        responses: The response dict to validate.
        expected_keys: Complete set of expected item keys.
        instrument: Instrument name for error messages.
        allow_missing: Number of missing items allowed (for imputation).

    Raises:
        InvalidResponseError: When too many items are missing or extra keys present.
    """
    expected = set(expected_keys)
    provided = set(responses.keys())
    extra = provided - expected
    missing = expected - provided

    if extra:
        raise InvalidResponseError(
            f"Unexpected {instrument} item keys: {sorted(extra)}",
            details={"extra_keys": sorted(extra), "instrument": instrument},
        )

    if len(missing) > allow_missing:
        raise InvalidResponseError(
            f"Too many missing {instrument} items: {len(missing)} (max allowed: {allow_missing}). "
            f"Missing: {sorted(missing)}",
            details={
                "missing_keys": sorted(missing),
                "count": len(missing),
                "max_allowed": allow_missing,
                "instrument": instrument,
            },
        )


def validate_tenant_scope(tenant_id: str | None) -> str:
    """Validate that a tenant ID is provided and non-empty."""
    if not tenant_id or not tenant_id.strip():
        raise InvalidResponseError(
            "tenant_id is required and must be non-empty.",
            details={"field": "tenant_id"},
        )
    return tenant_id.strip()
