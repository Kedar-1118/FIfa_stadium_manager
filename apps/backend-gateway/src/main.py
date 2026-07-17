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

from src.config import get_settings


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Manage application startup and shutdown lifecycle.

    This async context manager runs once when the server starts and yields
    control to the application. On shutdown (or SIGTERM), it executes the
    cleanup logic after the yield.

    Startup responsibilities:
        - Initialize the async database engine and verify connectivity.
        - Initialize the Redis connection pool and verify connectivity.
        - Log the application configuration (excluding secrets).

    Shutdown responsibilities:
        - Close the database engine and drain the connection pool.
        - Close the Redis connection pool.

    Args:
        app: The FastAPI application instance (injected by the framework).

    Yields:
        None: Control is yielded to the running application between
        startup and shutdown phases.
    """
    settings = get_settings()

    # --- Startup Phase ---
    # Infrastructure initialization will be added in Modules 3 and 4
    # when the database engine and Redis client are implemented.
    import structlog

    logger = structlog.get_logger()
    await logger.ainfo(
        "application_starting",
        app_name=settings.app_name,
        app_version=settings.app_version,
        environment=settings.app_env,
        debug=settings.debug,
    )

    yield  # Application is running and serving requests

    # --- Shutdown Phase ---
    await logger.ainfo("application_shutting_down")


def create_app() -> FastAPI:
    """
    Construct and return a fully configured FastAPI application.

    This factory function assembles the application by:
        1. Loading validated settings from the environment.
        2. Creating the FastAPI instance with OpenAPI metadata.
        3. Registering CORS middleware.
        4. Mounting all versioned API routers.

    Returns:
        FastAPI: A configured, ready-to-serve application instance.
    """
    settings = get_settings()

    # -------------------------------------------------------------------------
    # 1. Create the FastAPI instance with rich OpenAPI documentation
    # -------------------------------------------------------------------------
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
        # OpenAPI metadata for documentation and client generation
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
    # 3. Register Middleware (added in Module 5)
    # -------------------------------------------------------------------------
    # Middleware registration will be added here:
    # - Request logging middleware (structlog correlation IDs)
    # - Rate limiting middleware (slowapi)
    # - Global exception handler middleware

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
