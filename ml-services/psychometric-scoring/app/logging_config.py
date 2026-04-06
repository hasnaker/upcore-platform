"""Logging configuration re-export.

The manifest specifies app/logging_config.py, while the actual
implementation lives in app/core/logging.py. This module re-exports.
"""

from app.core.logging import configure_logging, get_logger

__all__ = ["configure_logging", "get_logger"]
