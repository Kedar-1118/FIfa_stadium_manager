"""
StadiumOS AI — Rate Limiting Configuration.

Initializes the slowapi rate limiter using the remote address key generator
and links it to Redis if available.
"""

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi.responses import JSONResponse
import structlog

from src.config import get_settings

logger = structlog.get_logger("rate_limiter")

settings = get_settings()

# Initialize the global rate limiter using the client's IP address.
# In production, slowapi connects to the Redis server for distributed tracking.
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=settings.redis_url,
    default_limits=[f"{settings.rate_limit_per_minute}/minute"],
)


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """
    Handle rate limit exceeded exceptions.

    Formats the response to match the unified system error schema (429 status code).
    """
    client_ip = get_remote_address(request)
    await logger.awarn(
        "rate_limit_exceeded",
        client_ip=client_ip,
        path=request.url.path,
        limit=exc.detail,
    )
    return JSONResponse(
        status_code=429,
        content={
            "success": False,
            "error_code": "RATE_LIMIT_EXCEEDED",
            "message": "Too many requests. Please slow down and try again later.",
            "retry_after": exc.detail,
        },
        headers={"X-RateLimit-Limit": exc.detail},
    )
