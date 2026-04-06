"""Domain exceptions for psychometric scoring."""

from __future__ import annotations


class PsychometricError(Exception):
    """Base exception for the scoring service."""

    status_code: int = 500
    error_code: str = "psychometric_error"

    def __init__(self, message: str, *, details: dict[str, object] | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details or {}


class InvalidResponseError(PsychometricError):
    """Raised when responses fail validation (count, range, missing)."""

    status_code = 422
    error_code = "invalid_response"


class InstrumentNotFoundError(PsychometricError):
    """Raised when an unknown instrument id is requested."""

    status_code = 404
    error_code = "instrument_not_found"


class NormsNotLoadedError(PsychometricError):
    """Raised when norm tables are unavailable."""

    status_code = 503
    error_code = "norms_not_loaded"


class ReliabilityBelowThresholdError(PsychometricError):
    """Raised when Cronbach alpha falls below an instrument-specific threshold."""

    status_code = 409
    error_code = "reliability_below_threshold"
