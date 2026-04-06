"""Tests for prompt template rendering."""

from __future__ import annotations

from uuid import uuid4

import pytest

from app.rationale.prompt_templates import render_prompt, templated_fallback
from app.schemas.actions import ActionCandidate, ActionType


def _make_candidate(action_type: ActionType = ActionType.SCHEDULE_1ON1) -> ActionCandidate:
    return ActionCandidate(
        action_type=action_type,
        target_id=uuid4(),
        target_name_masked="A. Y.",
        title_tr="Test",
        title_en="Test",
        severity_band="AMBER",
    )


class TestRenderPrompt:
    def test_renders_1on1_template(self) -> None:
        """1:1 template should render with variables."""
        candidate = _make_candidate(ActionType.SCHEDULE_1ON1)
        context = {
            "burnout_score": "0.58",
            "trend_description": "yukselis trendinde",
            "drivers": ["tukenmislik", "is yuku"],
            "days_since_1on1": "42",
        }
        prompt = render_prompt(candidate, context)
        assert "A. Y." in prompt
        assert "0.58" in prompt or "burnout" in prompt.lower() or "tukenmislik" in prompt.lower()

    def test_renders_all_action_types(self) -> None:
        """All action types should have valid templates."""
        for action_type in ActionType:
            candidate = _make_candidate(action_type)
            prompt = render_prompt(candidate, {})
            assert len(prompt) > 0


class TestTemplatedFallback:
    def test_all_types_have_fallback(self) -> None:
        """Every action type should have a deterministic fallback."""
        for action_type in ActionType:
            candidate = _make_candidate(action_type)
            fallback = templated_fallback(candidate)
            assert len(fallback) > 0

    def test_fallback_contains_target_name(self) -> None:
        """Fallback should reference the masked target name."""
        candidate = _make_candidate(ActionType.SCHEDULE_1ON1)
        fallback = templated_fallback(candidate)
        assert "A. Y." in fallback

    def test_fallback_is_turkish(self) -> None:
        """Fallback should be in Turkish."""
        candidate = _make_candidate(ActionType.WELLBEING_CHECKIN)
        fallback = templated_fallback(candidate)
        # Check for common Turkish words
        assert any(word in fallback.lower() for word in ["onerilmektedir", "icin", "ile"])

    def test_fallback_approximately_3_sentences(self) -> None:
        """Fallback should be approximately 3 sentences."""
        from app.rationale.turkish_validator import count_sentences_tr
        candidate = _make_candidate(ActionType.SCHEDULE_1ON1)
        fallback = templated_fallback(candidate)
        count = count_sentences_tr(fallback)
        assert 2 <= count <= 4
