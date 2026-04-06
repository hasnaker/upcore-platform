"""Custom exception types for burnout prediction service."""


class BurnoutServiceError(Exception):
    """Base exception for burnout prediction service."""


class ModelNotLoadedError(BurnoutServiceError):
    """Raised when no model is loaded for inference."""

    def __init__(self, model_version: str | None = None) -> None:
        msg = "No model loaded for inference"
        if model_version:
            msg = f"Model version '{model_version}' not found or not loaded"
        super().__init__(msg)


class FairnessGateFailedError(BurnoutServiceError):
    """Raised when model fails fairness gate during promotion."""

    def __init__(self, max_diff: float, tolerance: float) -> None:
        super().__init__(
            f"Fairness gate failed: demographic parity diff {max_diff:.4f} "
            f"exceeds tolerance {tolerance:.4f}"
        )
        self.max_diff = max_diff
        self.tolerance = tolerance


class CalibrationGateFailedError(BurnoutServiceError):
    """Raised when model fails calibration gate during promotion."""

    def __init__(self, ece: float, target: float) -> None:
        super().__init__(
            f"Calibration gate failed: ECE {ece:.4f} exceeds target {target:.4f}"
        )
        self.ece = ece
        self.target = target


class InsufficientDataError(BurnoutServiceError):
    """Raised when there is not enough data for prediction or training."""

    def __init__(self, required: int, available: int) -> None:
        super().__init__(
            f"Insufficient data: required {required} timesteps, got {available}"
        )
        self.required = required
        self.available = available


class InvalidHorizonError(BurnoutServiceError):
    """Raised when an invalid prediction horizon is requested."""

    def __init__(self, horizons: list[int]) -> None:
        super().__init__(
            f"Invalid horizons: {horizons}. Allowed values: [30, 60, 90]"
        )
