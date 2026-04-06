"""Tests for Turkish text validation."""

from __future__ import annotations

from app.rationale.turkish_validator import (
    check_profanity,
    count_sentences_tr,
    is_valid_turkish,
)


class TestCountSentencesTr:
    def test_single_sentence(self) -> None:
        assert count_sentences_tr("Bu bir cumle.") == 1

    def test_three_sentences(self) -> None:
        text = "Ilk cumle. Ikinci cumle. Ucuncu cumle."
        assert count_sentences_tr(text) == 3

    def test_empty_string(self) -> None:
        assert count_sentences_tr("") == 0

    def test_handles_abbreviations(self) -> None:
        """Should not count 'Dr.' as a sentence terminator."""
        text = "Dr. Ahmet arastirmayi tamamladi."
        count = count_sentences_tr(text)
        assert count == 1

    def test_question_marks(self) -> None:
        text = "Ne zaman? Nerede? Neden?"
        assert count_sentences_tr(text) == 3


class TestIsValidTurkish:
    def test_turkish_characters(self) -> None:
        assert is_valid_turkish("Calisan tukenmislik riski yuksek.") is True

    def test_with_special_chars(self) -> None:
        assert is_valid_turkish("Gorusme icin bir saat ayirin.") is True

    def test_empty_not_valid(self) -> None:
        assert is_valid_turkish("") is False

    def test_whitespace_not_valid(self) -> None:
        assert is_valid_turkish("   ") is False


class TestCheckProfanity:
    def test_clean_text(self) -> None:
        assert check_profanity("Bu temiz bir metin.") is False
