"""FastAPI exception handlers returning RFC 7807 Problem+JSON."""

from __future__ import annotations

from fastapi import Request
from fastapi.responses import JSONResponse

from app.core.exceptions import PsychometricError


async def psychometric_error_handler(
    request: Request,
    exc: PsychometricError,
) -> JSONResponse:
    """Handle PsychometricError subclasses with RFC 7807 Problem+JSON."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error_code": exc.error_code,
            "message": exc.message,
            "details": exc.details,
        },
        media_type="application/problem+json",
    )


async def generic_error_handler(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    """Catch-all handler for unhandled exceptions."""
    return JSONResponse(
        status_code=500,
        content={
            "error_code": "internal_error",
            "message": "An unexpected error occurred.",
            "details": {},
        },
        media_type="application/problem+json",
    )
