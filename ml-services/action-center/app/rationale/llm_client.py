"""Azure OpenAI client for rationale generation with circuit breaker.

Generates 3-sentence Turkish rationales for each action.
Falls back to deterministic templates when LLM is unavailable.
"""

from __future__ import annotations

import time

import structlog
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import settings

logger = structlog.get_logger()


class CircuitBreaker:
    """Simple circuit breaker for LLM calls."""

    def __init__(self, failure_threshold: int = 5, recovery_timeout: int = 30) -> None:
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.last_failure_time = 0.0
        self.state = "closed"  # closed, open, half-open

    def record_failure(self) -> None:
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.failure_threshold:
            self.state = "open"
            logger.warning("circuit_breaker_opened", failures=self.failure_count)

    def record_success(self) -> None:
        self.failure_count = 0
        self.state = "closed"

    def can_proceed(self) -> bool:
        if self.state == "closed":
            return True
        if self.state == "open":
            elapsed = time.time() - self.last_failure_time
            if elapsed >= self.recovery_timeout:
                self.state = "half-open"
                return True
            return False
        # half-open: allow one request
        return True


class RationaleClient:
    """Azure OpenAI rationale generation client."""

    def __init__(self) -> None:
        self._client = None
        self._initialized = False
        self._circuit_breaker = CircuitBreaker(
            failure_threshold=settings.CB_FAILURE_THRESHOLD,
            recovery_timeout=settings.CB_RECOVERY_TIMEOUT,
        )

    async def initialize(self) -> None:
        if not settings.AZURE_OPENAI_ENDPOINT or not settings.AZURE_OPENAI_API_KEY:
            logger.warning("azure_openai_not_configured_for_rationale")
            return

        try:
            from openai import AsyncAzureOpenAI
            self._client = AsyncAzureOpenAI(
                azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
                api_key=settings.AZURE_OPENAI_API_KEY,
                api_version=settings.AZURE_OPENAI_API_VERSION,
            )
            self._initialized = True
        except ImportError:
            logger.warning("openai_package_not_installed")

    async def generate_rationale(self, prompt: str) -> str:
        """Generate rationale via LLM with circuit breaker.

        Falls back to deterministic template on failure.
        """
        if not self._initialized or not self._circuit_breaker.can_proceed():
            return ""  # Caller should use fallback

        try:
            result = await self._retryable_call(prompt)
            self._circuit_breaker.record_success()
            return result
        except Exception as exc:
            self._circuit_breaker.record_failure()
            logger.error("rationale_generation_failed", error=str(exc))
            return ""

    async def generate_batch(self, prompts: list[str]) -> list[str]:
        """Generate rationales for multiple actions.

        Falls back to empty strings for failed items.
        """
        results: list[str] = []
        for prompt in prompts:
            result = await self.generate_rationale(prompt)
            results.append(result)
        return results

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        reraise=True,
    )
    async def _retryable_call(self, prompt: str) -> str:
        """Call Azure OpenAI with retry."""
        response = await self._client.chat.completions.create(
            model=settings.LLM_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=settings.LLM_TEMPERATURE,
            max_tokens=settings.LLM_MAX_TOKENS,
        )
        return response.choices[0].message.content or ""
