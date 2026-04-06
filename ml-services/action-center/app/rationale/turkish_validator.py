"""Turkish text quality assurance for LLM outputs.

Simple heuristics for validating Turkish text quality,
sentence counting, and profanity filtering.
"""

from __future__ import annotations

import re

# Turkish sentence terminators
SENTENCE_TERMINATORS = re.compile(r"[.!?]+")

# Turkish character set (beyond ASCII)
TURKISH_CHARS = set("çÇğĞıİöÖşŞüÜ")

# Simple profanity filter (minimal set)
PROFANITY_SET: set[str] = set()  # Empty for now, populated from config in production


def count_sentences_tr(text: str) -> int:
    """Count sentences in Turkish text.

    Uses punctuation-based heuristic. Handles abbreviations
    like "Dr.", "Prof." etc.

    Args:
        text: Turkish text.

    Returns:
        Approximate sentence count.
    """
    if not text.strip():
        return 0

    # Remove common Turkish abbreviations that contain periods
    cleaned = text
    for abbrev in ["Dr.", "Prof.", "Doç.", "vb.", "vs.", "bkz."]:
        cleaned = cleaned.replace(abbrev, abbrev.replace(".", ""))

    # Count sentence terminators
    sentences = SENTENCE_TERMINATORS.split(cleaned)
    # Filter out empty strings
    sentences = [s.strip() for s in sentences if s.strip()]

    return len(sentences)


def is_valid_turkish(text: str) -> bool:
    """Check if text appears to be valid Turkish.

    Heuristic: text should contain at least one Turkish-specific
    character or be pure ASCII with Turkish grammar patterns.

    Args:
        text: Text to validate.

    Returns:
        True if text appears to be Turkish.
    """
    if not text.strip():
        return False

    # Check for Turkish-specific characters
    has_turkish_chars = any(c in TURKISH_CHARS for c in text)
    if has_turkish_chars:
        return True

    # Fallback: check for common Turkish words
    common_words = {"bir", "ve", "ile", "icin", "bu", "da", "de", "mi", "ne", "gibi"}
    words = set(text.lower().split())
    turkish_word_count = len(words & common_words)

    return turkish_word_count >= 2


def check_profanity(text: str) -> bool:
    """Check for profanity in text.

    Returns:
        True if profanity detected.
    """
    if not PROFANITY_SET:
        return False

    text_lower = text.lower()
    for word in PROFANITY_SET:
        if word in text_lower:
            return True
    return False
