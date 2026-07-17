"""
StadiumOS AI — FastAPI Application Factory.

This module creates and configures the FastAPI application instance using
the factory pattern. It is the single entry point for the backend gateway.

Design Decisions:
    - **Lifespan Context Manager**: We use FastAPI's lifespan protocol (not
      the deprecated @app.on_event) to manage startup/shutdown of shared
      resources like the database engine and Redis connection pool. This
      ensures deterministic cleanup even if the server receives SIGTERM.
    - **App Factory Pattern**: The create_app() function returns a fully
      configured FastAPI instance. This pattern is essential for testing —
      test fixtures can call create_app() with overridden dependencies
      without polluting the module-level application state.
    - **Versioned API Prefix**: All routers are mounted under /api/v1/
      to support future breaking API changes without disrupting existing
      clients. The v1 prefix is baked into each router, not the app mount,
      to keep OpenAPI docs clean.
"""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded

from src.config import get_settings
from src.infrastructure.logging.logger import configure_logging
from src.infrastructure.database.engine import get_engine, dispose_engine
from src.infrastructure.cache.redis_client import get_redis_client, close_redis
from src.interfaces.middleware.request_logging import RequestLoggingMiddleware
from src.interfaces.middleware.error_handler import register_error_handlers
from src.interfaces.middleware.rate_limiter import limiter, rate_limit_exceeded_handler

# Run structured logging setup immediately on server boot
configure_logging()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Manage application startup and shutdown lifecycle.
    """
    settings = get_settings()
    import structlog
    logger = structlog.get_logger("lifespan")

    # --- Startup Phase ---
    await logger.ainfo(
        "application_starting",
        app_name=settings.app_name,
        app_version=settings.app_version,
        environment=settings.app_env,
        debug=settings.debug,
    )

    # 1. Verify PostgreSQL Database connectivity
    try:
        engine = get_engine()
        # Run a simple ping query
        from sqlalchemy import text
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        await logger.ainfo("database_connected_successfully")
    except Exception as e:
        await logger.acritical("database_connection_failed", error=str(e))
        raise e

    # 2. Verify Redis Connectivity
    try:
        redis_client = get_redis_client()
        await redis_client.ping()
        await logger.ainfo("redis_connected_successfully")
    except Exception as e:
        await logger.acritical("redis_connection_failed", error=str(e))
        raise e

    yield  # Application is running and serving requests

    # --- Shutdown Phase ---
    await logger.ainfo("application_shutting_down")
    # Drain database pools
    await dispose_engine()
    # Close Redis client connections
    await close_redis()
    await logger.ainfo("application_shutdown_completed")


def create_app() -> FastAPI:
    """
    Construct and return a fully configured FastAPI application.
    """
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description=(
            "StadiumOS AI Backend Gateway — A GenAI-powered platform for real-time "
            "stadium operations, crowd management, incident response, and agent-based "
            "decision support during FIFA World Cup 2026."
        ),
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
        openapi_url="/openapi.json" if not settings.is_production else None,
        lifespan=lifespan,
        openapi_tags=[
            {
                "name": "Auth",
                "description": "Authentication and authorization: login, register, token refresh.",
            },
            {
                "name": "Stadiums",
                "description": "Stadium and sector CRUD operations.",
            },
            {
                "name": "Gates",
                "description": "Gate management within stadium sectors.",
            },
            {
                "name": "Volunteers",
                "description": "Volunteer registration, assignment, and geolocation tracking.",
            },
            {
                "name": "Incidents",
                "description": "Incident reporting, assignment, and resolution lifecycle.",
            },
            {
                "name": "Crowd",
                "description": "Real-time crowd density, gate flow rates, and congestion status.",
            },
            {
                "name": "Agents",
                "description": "AI agent recommendation review and approval workflows.",
            },
            {
                "name": "Health",
                "description": "Service health and readiness probes for Kubernetes.",
            },
        ],
    )

    # Attach the slowapi limiter to the application state
    app.state.limiter = limiter

    # Add slowapi's RateLimitExceeded custom exception handler
    app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

    # -------------------------------------------------------------------------
    # 2. Register CORS Middleware
    # -------------------------------------------------------------------------
    # CORS must be the outermost middleware so preflight OPTIONS requests are
    # handled before any authentication or rate limiting middleware runs.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        # Expose custom headers so frontend JS can read them
        expose_headers=["X-Request-ID", "X-RateLimit-Remaining"],
    )

    # -------------------------------------------------------------------------
    # 3. Register Middleware
    # -------------------------------------------------------------------------
    # Register request logging middleware
    app.add_middleware(RequestLoggingMiddleware)

    # Register global exception handlers
    register_error_handlers(app)

    # -------------------------------------------------------------------------
    # 4. Mount API Routers (added incrementally in Modules 6-14)
    # -------------------------------------------------------------------------
    # Router registration will be added here as each module is implemented:
    # - /api/v1/auth      (Module 6)
    # - /api/v1/stadiums   (Module 7)
    # - /api/v1/gates      (Module 8)
    # - /api/v1/volunteers (Module 9)
    # - /api/v1/incidents  (Module 10)
    # - /api/v1/crowd      (Module 11)
    # - /api/v1/agents     (Module 12)
    # - /ws                (Module 13)
    # - /health, /ready    (Module 14)

    return app


# ---------------------------------------------------------------------------
# Module-level application instance
# ---------------------------------------------------------------------------
# Uvicorn references this instance via the command:
#   uvicorn src.main:app --host 0.0.0.0 --port 8000
# The create_app() factory is called once at import time.
app = create_app()
