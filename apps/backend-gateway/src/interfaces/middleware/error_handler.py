"""
StadiumOS AI — Global Error Handler.

Registers global exception handlers to capture system, validation, and domain
exceptions, transforming them into clean, structured, and consistent JSON responses.
"""

from typing import Any
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
import structlog
from starlette.exceptions import HTTPException as StarletteHTTPException

from src.domain.exceptions import (
    AuthenticationError,
    AuthorizationError,
    BusinessRuleViolationError,
    DuplicateEntityError,
    EntityNotFoundError,
    ExternalServiceError,
    InvalidStateTransitionError,
    StadiumOSError,
)

logger = structlog.get_logger("error_handler")


async def stadiumos_exception_handler(request: Request, exc: StadiumOSError) -> JSONResponse:
    """
    Handle domain exceptions raised by core entities and services.

    Maps domain exceptions to standard HTTP status codes.
    """
    status_code = 400
    
    if isinstance(exc, EntityNotFoundError):
        status_code = 404
    elif isinstance(exc, DuplicateEntityError):
        status_code = 409
    elif isinstance(exc, AuthenticationError):
        status_code = 401
    elif isinstance(exc, AuthorizationError):
        status_code = 403
    elif isinstance(exc, BusinessRuleViolationError):
        status_code = 422
    elif isinstance(exc, InvalidStateTransitionError):
        status_code = 409
    elif isinstance(exc, ExternalServiceError):
        status_code = 502

    await logger.awarn(
        "domain_exception_occurred",
        error_code=exc.error_code,
        message=exc.message,
        status_code=status_code,
    )

    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "error_code": exc.error_code,
            "message": exc.message,
        },
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """
    Handle Pydantic validation exceptions.

    Formats detailed errors into a clear, client-friendly error array.
    """
    errors = []
    for error in exc.errors():
        # Clean up path description
        loc = " -> ".join(str(p) for p in error["loc"] if p != "body")
        errors.append({
            "field": loc,
            "type": error["type"],
            "message": error["msg"],
        })

    await logger.awarn(
        "request_validation_failed",
        errors_count=len(errors),
        status_code=422,
    )

    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error_code": "VALIDATION_FAILED",
            "message": "Input validation failed. Please check the fields specified.",
            "details": errors,
        },
    )


async def starlette_http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Handle standard Starlette/FastAPI HTTPExceptions (e.g. 404 route not found)."""
    await logger.awarn(
        "http_exception_occurred",
        status_code=exc.status_code,
        detail=exc.detail,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error_code": f"HTTP_{exc.status_code}",
            "message": exc.detail,
        },
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Catch-all handler for unhandled server exceptions.

    Logs full traceback stack traces and returns a generic 500 error, hiding
    internal systems logs/details from public/client consumers.
    """
    await logger.aerror(
        "unhandled_server_error",
        error_type=exc.__class__.__name__,
        error=str(exc),
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error_code": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected error occurred on the server. Please contact support.",
        },
    )


def register_error_handlers(app: FastAPI) -> None:
    """
    Register all exception handlers to the FastAPI application instance.

    Args:
        app: The FastAPI application instance.
    """
    app.add_exception_handler(StadiumOSError, stadiumos_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(StarletteHTTPException, starlette_http_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)
