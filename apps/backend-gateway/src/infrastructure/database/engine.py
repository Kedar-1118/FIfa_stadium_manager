"""
StadiumOS AI — Async SQLAlchemy Engine & Session Factory.

This module creates the async database engine and provides a session
factory for use with FastAPI's dependency injection system.

Design Decisions:
    - **Async Engine (asyncpg)**: All database operations are non-blocking.
      This is critical for a real-time system where a slow query must not
      block the event loop and delay WebSocket message delivery.
    - **Session-per-Request Pattern**: Each API request gets its own
      AsyncSession that is committed on success and rolled back on failure.
      This is implemented via a FastAPI dependency that yields the session.
    - **Connection Pooling**: The engine is configured with a pool to reuse
      database connections. Pool size and overflow are controlled via
      environment variables to tune for deployment scale.
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from src.config import get_settings

# ---------------------------------------------------------------------------
# Module-Level Engine (lazy initialization)
# ---------------------------------------------------------------------------
# The engine is created once at module import time. It manages a pool of
# database connections that are reused across requests.
_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def get_engine() -> AsyncEngine:
    """
    Return the singleton async SQLAlchemy engine.

    The engine is created lazily on first access to avoid import-time
    side effects in test environments where the real database URL
    may not be available.

    Returns:
        AsyncEngine: The configured async database engine.
    """
    global _engine
    if _engine is None:
        settings = get_settings()
        _engine = create_async_engine(
            url=settings.database_url,
            echo=settings.database_echo,
            pool_size=settings.database_pool_size,
            max_overflow=settings.database_max_overflow,
            # Recycle connections after 30 minutes to prevent stale connections
            # from being returned from the pool after PostgreSQL restarts.
            pool_recycle=1800,
            # Pre-ping checks connection validity before returning it from the
            # pool. Adds ~1ms latency but prevents "connection closed" errors.
            pool_pre_ping=True,
        )
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    """
    Return the singleton async session factory.

    The session factory is bound to the engine and configured to NOT
    auto-commit or auto-flush. This gives the application layer full
    control over transaction boundaries.

    Returns:
        async_sessionmaker: A factory for creating AsyncSession instances.
    """
    global _session_factory
    if _session_factory is None:
        _session_factory = async_sessionmaker(
            bind=get_engine(),
            class_=AsyncSession,
            expire_on_commit=False,  # Prevent lazy-load exceptions after commit
            autocommit=False,
            autoflush=False,
        )
    return _session_factory


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that provides a database session per request.

    This is the PRIMARY dependency used by all repository implementations.
    It yields an AsyncSession, commits on success, and rolls back on
    any exception — ensuring transactional integrity per request.

    Yields:
        AsyncSession: A scoped database session for the current request.

    Example usage in a FastAPI route::

        @router.get("/stadiums")
        async def list_stadiums(db: AsyncSession = Depends(get_db_session)):
            ...
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def dispose_engine() -> None:
    """
    Dispose the database engine and close all pooled connections.

    Called during application shutdown (in the lifespan context manager)
    to ensure clean disconnection from PostgreSQL.
    """
    global _engine, _session_factory
    if _engine is not None:
        await _engine.dispose()
        _engine = None
        _session_factory = None
