"""PII masking utilities for action center.

Masks employee names to "A. Y." format before sending to LLM.
Reveals original names only on the server-side response.
"""

from __future__ import annotations

import re

import structlog

logger = structlog.get_logger()


def mask_name(full_name: str) -> str:
    """Mask a full name to initial format.

    "Ahmet Yilmaz" -> "A. Y."
    "Mehmet Ali Kaya" -> "M. A. K."

    Args:
        full_name: Full name string.

    Returns:
        Masked name with initials.
    """
    if not full_name or not full_name.strip():
        return "X. X."

    parts = full_name.strip().split()
    initials = [f"{p[0].upper()}." for p in parts if p]

    return " ".join(initials) if initials else "X. X."


def redact_pii_in_prompt(
    text: str,
    pii_list: list[str],
) -> str:
    """Redact known PII strings from a prompt before sending to LLM.

    Args:
        text: Prompt text.
        pii_list: List of known PII strings (names, emails, etc.)

    Returns:
        Text with PII replaced by [REDACTED].
    """
    redacted = text

    for pii in pii_list:
        if pii and len(pii) > 1:
            # Case-insensitive replacement
            pattern = re.compile(re.escape(pii), re.IGNORECASE)
            redacted = pattern.sub("[REDACTED]", redacted)

    return redacted


def extract_pii_from_context(context: dict) -> list[str]:
    """Extract PII strings from action context for redaction.

    Args:
        context: Action context dict.

    Returns:
        List of PII strings to redact.
    """
    pii_items: list[str] = []

    for key in ("full_name", "name", "email", "phone"):
        value = context.get(key)
        if value and isinstance(value, str):
            pii_items.append(value)

    return pii_items
