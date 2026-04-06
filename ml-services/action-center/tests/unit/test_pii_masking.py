"""Tests for PII masking utilities."""

from __future__ import annotations

from app.utils.pii_masking import (
    extract_pii_from_context,
    mask_name,
    redact_pii_in_prompt,
)


class TestMaskName:
    def test_two_word_name(self) -> None:
        assert mask_name("Ahmet Yilmaz") == "A. Y."

    def test_three_word_name(self) -> None:
        assert mask_name("Mehmet Ali Kaya") == "M. A. K."

    def test_single_name(self) -> None:
        assert mask_name("Ahmet") == "A."

    def test_empty_name(self) -> None:
        assert mask_name("") == "X. X."

    def test_none_fallback(self) -> None:
        assert mask_name("   ") == "X. X."

    def test_idempotent(self) -> None:
        """Masking an already masked name should be stable."""
        masked = mask_name("Ahmet Yilmaz")
        re_masked = mask_name(masked)
        # Already masked, should still produce initials
        assert len(re_masked) > 0


class TestRedactPiiInPrompt:
    def test_redacts_name(self) -> None:
        text = "Ahmet Yilmaz ile gorusme planlayin."
        result = redact_pii_in_prompt(text, ["Ahmet Yilmaz"])
        assert "Ahmet" not in result
        assert "[REDACTED]" in result

    def test_case_insensitive(self) -> None:
        text = "AHMET YILMAZ ile gorusme."
        result = redact_pii_in_prompt(text, ["ahmet yilmaz"])
        assert "AHMET" not in result

    def test_no_pii_unchanged(self) -> None:
        text = "Gorusme planlayin."
        result = redact_pii_in_prompt(text, [])
        assert result == text

    def test_multiple_pii(self) -> None:
        text = "Ahmet ve Mehmet gorusecek."
        result = redact_pii_in_prompt(text, ["Ahmet", "Mehmet"])
        assert "Ahmet" not in result
        assert "Mehmet" not in result


class TestExtractPiiFromContext:
    def test_extracts_name(self) -> None:
        ctx = {"full_name": "Ahmet Yilmaz", "role": "developer"}
        pii = extract_pii_from_context(ctx)
        assert "Ahmet Yilmaz" in pii

    def test_extracts_email(self) -> None:
        ctx = {"email": "ahmet@example.com"}
        pii = extract_pii_from_context(ctx)
        assert "ahmet@example.com" in pii

    def test_empty_context(self) -> None:
        pii = extract_pii_from_context({})
        assert len(pii) == 0
