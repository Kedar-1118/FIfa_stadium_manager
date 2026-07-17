"""
StadiumOS AI — Asynchronous Redis Client Connection Management.

This module initializes and manages the lifecycle of the async Redis connection pool.

Design Decisions:
    - **Connection Pooling**: Uses the async `redis.ConnectionPool` to reuse
      connections, avoiding the overhead of creating a new socket connection
      on every request.
    - **Graceful Shutdown**: The lifespan setup handles closing the pool and
      disconnecting all sockets cleanly.
    - **Fast/Low-Latency Options**: uses `socket_keepalive=True` and `socket_timeout`
      to prevent hangs during socket disruptions.
"""

from collections.abc import AsyncGenerator
import redis.asyncio as aioredis
import structlog

from src.config import get_settings

# Module-level connection pool & client instances
_redis_pool: aioredis.ConnectionPool | None = None
_redis_client: aioredis.Redis | None = None

logger = structlog.get_logger()


def get_redis_client() -> aioredis.Redis:
    """
    Return the singleton async Redis client instance.

    Initializes the connection pool lazily on first access.

    Returns:
        aioredis.Redis: Fully configured async Redis client.
    """
    global _redis_pool, _redis_client
    if _redis_client is None:
        settings = get_settings()
        logger.info(
            "initializing_redis_client",
            redis_url=settings.redis_url.split("@")[-1],  # Exclude passwords in logs
        )
        _redis_pool = aioredis.ConnectionPool.from_url(
            url=settings.redis_url,
            max_connections=settings.redis_max_connections,
            socket_timeout=5.0,
            socket_connect_timeout=5.0,
            socket_keepalive=True,
            retry_on_timeout=True,
            decode_responses=True,  # Automatically decodes binary responses to UTF-8 strings
        )
        _redis_client = aioredis.Redis(connection_pool=_redis_pool)
    return _redis_client


async def close_redis() -> None:
    """
    Gracefully close the Redis client and connection pool.

    Invoked on application shutdown inside main.py lifespan context manager.
    """
    global _redis_pool, _redis_client
    if _redis_client is not None:
        logger.info("closing_redis_client")
        await _redis_client.aclose()  # type: ignore[attr-defined]
        _redis_client = None
    if _redis_pool is not None:
        await _redis_pool.disconnect()
        _redis_pool = None


async def get_redis() -> AsyncGenerator[aioredis.Redis, None]:
    """
    FastAPI dependency yielding the async Redis client instance.

    Allows routing handlers to inject the Redis client.
    """
    client = get_redis_client()
    yield client
