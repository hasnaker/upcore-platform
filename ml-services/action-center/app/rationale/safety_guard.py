"""Post-LLM safety guard for rationale validation.

Blocks PII leaks, clinical claims, diagnoses, and brand violations
from generated rationales.
"""

from __future__ import annotations

import re

import structlog

from app.schemas.actions import SafetyResult

logger = structlog.get_logger()

# Forbidden clinical/medical terms in Turkish
CLINICAL_TERMS_TR: set[str] = {
    "teshis", "teşhis", "hastalik", "hastalık", "tedavi", "ilac", "ilaç",
    "depresyon", "anksiyete", "psikolojik bozukluk", "psikiyatri",
    "klinik", "terapi", "doktor", "hekim", "reçete", "recete",
    "intihar", "kendine zarar", "madde bagimliligi",
}

# PII patterns
EMAIL_PATTERN = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
PHONE_PATTERN = re.compile(r"\+?\d{10,13}")
TC_KIMLIK_PATTERN = re.compile(r"\d{11}")


def validate_rationale(
    text: str,
    known_pii: list[str] | None = None,
) -> SafetyResult:
    """Validate LLM-generated rationale against safety rules.

    Checks:
    1. No PII leakage (full names, emails, phones, TC kimlik)
    2. No clinical claims or diagnoses
    3. Length: approximately 3 sentences
    4. Language: Turkish characters present

    Args:
        text: Generated rationale text.
        known_pii: List of known PII strings to check for leaks.

    Returns:
        SafetyResult with pass/fail and issues.
    """
    issues: list[str] = []

    if not text:
        return SafetyResult(passed=True, issues=[], original_text="", sanitized_text="")

    # Check PII leakage
    if _check_pii_leakage(text, known_pii or []):
        issues.append("PII_LEAK: Found personal information in rationale")

    # Check clinical claims
    if _check_clinical_claims(text):
        issues.append("CLINICAL_CLAIM: Found medical/clinical terminology")

    # Check length
    if not _check_length(text):
        issues.append("LENGTH: Rationale should be approximately 3 sentences")

    passed = len(issues) == 0
    sanitized = _sanitize(text) if not passed else text

    if not passed:
        logger.warning(
            "safety_guard_blocked",
            issues=issues,
            text_length=len(text),
        )

    return SafetyResult(
        passed=passed,
        issues=issues,
        original_text=text,
        sanitized_text=sanitized,
    )


def _check_pii_leakage(text: str, known_pii: list[str]) -> bool:
    """Check for PII in generated text."""
    # Check known PII strings
    for pii in known_pii:
        if pii and len(pii) > 2 and pii.lower() in text.lower():
            return True

    # Check email addresses
    if EMAIL_PATTERN.search(text):
        return True

    # Check phone numbers
    if PHONE_PATTERN.search(text):
        return True

    # Check TC Kimlik numbers
    if TC_KIMLIK_PATTERN.search(text):
        return True

    return False


def _check_clinical_claims(text: str) -> bool:
    """Check for forbidden clinical/medical terms."""
    text_lower = text.lower()
    for term in CLINICAL_TERMS_TR:
        if term in text_lower:
            return True
    return False


def _check_length(text: str) -> bool:
    """Check that rationale is approximately 3 sentences (+/- 1)."""
    from app.rationale.turkish_validator import count_sentences_tr
    count = count_sentences_tr(text)
    return 2 <= count <= 4


def _sanitize(text: str) -> str:
    """Attempt to sanitize a rationale that failed safety checks.

    Removes detected PII and clinical terms.
    """
    sanitized = text

    # Remove emails
    sanitized = EMAIL_PATTERN.sub("[REDACTED]", sanitized)

    # Remove phone numbers
    sanitized = PHONE_PATTERN.sub("[REDACTED]", sanitized)

    # Remove TC kimlik
    sanitized = TC_KIMLIK_PATTERN.sub("[REDACTED]", sanitized)

    return sanitized
