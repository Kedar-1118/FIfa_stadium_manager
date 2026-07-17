"""
StadiumOS AI — Request Logging Middleware.

Intercepts requests to log route info, compute execution time, and inject
unique request IDs for transaction tracing.
"""

import time
import uuid
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
import structlog


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware that attaches trace contexts and monitors request metrics.

    Steps:
        1. Extracts or generates a trace identifier ('X-Request-ID').
        2. Binds trace details into structlog's thread-local/coroutine-local context vars.
        3. Measures processing latency.
        4. Logs start and completion events.
        5. Returns the request ID header to the client.
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Extract existing Request ID from header or generate a new UUID
        request_id = request.headers.get("x-request-id")
        if not request_id:
            request_id = str(uuid.uuid4())

        # Bind the request context for all log statements executed during this request
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            client_ip=request.client.host if request.client else "unknown",
        )

        logger = structlog.get_logger("request_tracker")
        start_time = time.perf_counter()

        await logger.ainfo("request_started")

        try:
            response = await call_next(request)
        except Exception as exc:
            duration = (time.perf_counter() - start_time) * 1000
            await logger.aerror(
                "request_failed",
                duration_ms=round(duration, 2),
                error=str(exc),
                exc_info=True,
            )
            # Re-raise so the global exception handler can translate it into a JSON response
            raise exc

        duration = (time.perf_counter() - start_time) * 1000
        
        # Log request completion with duration and status code
        await logger.ainfo(
            "request_completed",
            status_code=response.status_code,
            duration_ms=round(duration, 2),
        )

        # Attach request ID to response headers for debugging tracking
        response.headers["X-Request-ID"] = request_id
        return response
