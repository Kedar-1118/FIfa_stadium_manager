"""
StadiumOS AI — Health & Readiness API Router.

Exposes endpoints for monitoring container status.
Used by container orchestrators (Kubernetes) to verify pod liveness and readiness.
"""

from fastapi import APIRouter, Depends, status, Response
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from src.infrastructure.database.engine import get_db_session, get_engine
from src.infrastructure.cache.redis_client import get_redis_client

router = APIRouter(tags=["Health"])
logger = structlog.get_logger("health_router")


@router.get(
    "/health",
    status_code=status.HTTP_200_OK,
    summary="Liveness Probe",
)
async def liveness_probe() -> dict[str, str]:
    """
    Verify the application process is running and responsive.
    """
    return {"status": "healthy"}


@router.get(
    "/ready",
    summary="Readiness Probe",
)
async def readiness_probe(
    response: Response,
    db: AsyncSession = Depends(get_db_session),
) -> dict[str, Any] if False else dict:
    """
    Verify the application can serve requests by checking database and cache health.

    Returns HTTP 503 if any dependency is down, signaling Kubernetes to stop
    routing traffic to this container instance.
    """
    db_healthy = False
    redis_healthy = False
    
    # 1. Test Database Session
    try:
        await db.execute(text("SELECT 1"))
        db_healthy = True
    except Exception as e:
        await logger.aerror("readiness_db_check_failed", error=str(e))

    # 2. Test Redis connection
    try:
        redis_client = get_redis_client()
        await redis_client.ping()
        redis_healthy = True
    except Exception as e:
        await logger.aerror("readiness_redis_check_failed", error=str(e))

    if not db_healthy or not redis_healthy:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {
            "status": "unavailable",
            "checks": {
                "database": "up" if db_healthy else "down",
                "redis": "up" if redis_healthy else "down",
            }
        }

    return {
        "status": "ready",
        "checks": {
            "database": "up",
            "redis": "up",
        }
    }
