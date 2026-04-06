"""Custom exceptions for action center service."""


class ActionCenterError(Exception):
    """Base exception."""


class LLMUnavailableError(ActionCenterError):
    """Azure OpenAI LLM is unavailable after retries."""


class SafetyGuardBlockedError(ActionCenterError):
    """LLM output blocked by safety guard."""

    def __init__(self, issues: list[str]) -> None:
        super().__init__(f"Safety guard blocked: {', '.join(issues)}")
        self.issues = issues


class RoleNotAuthorizedError(ActionCenterError):
    """User role is not authorized for this action."""

    def __init__(self, role: str, action: str) -> None:
        super().__init__(f"Role '{role}' is not authorized for action '{action}'")
