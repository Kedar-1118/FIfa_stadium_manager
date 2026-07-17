"""
StadiumOS AI — Structured Logging Configuration.

This module initializes and configures the `structlog` library for uniform,
structured logging across the application.

Design Decisions:
    - **JSON in Production, Console in Dev**: Uses settings.log_format to output
      standard JSON lines in production (which log collectors like Grafana Loki/ELK
      can index efficiently) and readable colored text in development.
    - **Request Correlation**: Integrates processors to automatically attach
      correlation IDs (X-Request-ID) to log entries, enabling traceability across
      microservices.
    - **Standard library integration**: Directs basic python logging to flow through
      structlog, ensuring third-party library logs (like uvicorn or sqlalchemy)
      are structured consistently.
"""

import logging
import sys
import structlog
from structlog.types import Processor

from src.config import get_settings


def configure_logging() -> None:
    """
    Configure global logging settings for python logging and structlog.

    Sets up the processors stack and standard library logger redirects.
    """
    settings = get_settings()
    log_level = getattr(logging, settings.log_level.upper(), logging.INFO)

    # Core logging processors chain
    processors: list[Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]

    if settings.log_format == "json":
        # Format as JSON key-value lines for cloud log processors
        processors.append(structlog.processors.JSONRenderer())
    else:
        # User-friendly colored terminal logs for local development
        processors.append(
            structlog.dev.ConsoleRenderer(
                colors=True,
                force_colors=True,
            )
        )

    structlog.configure(
        processors=processors,
        logger_factory=structlog.BytesLoggerFactory()
        if settings.log_format == "json"
        else structlog.WriteLoggerFactory(),
        wrapper_class=structlog.make_filtering_bound_logger(log_level),
        cache_logger_on_first_use=True,
    )

    # Redirect standard library logging to structlog handlers
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        structlog.stdlib.ProcessorFormatter(
            processor=structlog.processors.JSONRenderer()
            if settings.log_format == "json"
            else structlog.dev.ConsoleRenderer(colors=True)
        )
    )

    root_logger = logging.getLogger()
    # Remove existing default logging handlers to avoid double printing logs
    for h in root_logger.handlers[:]:
        root_logger.removeHandler(h)
        
    root_logger.addHandler(handler)
    root_logger.setLevel(log_level)

    # Silence verbose logs from third-party libraries unless in DEBUG environment
    silence_level = logging.WARNING if not settings.debug else logging.INFO
    logging.getLogger("uvicorn.access").setLevel(silence_level)
    logging.getLogger("uvicorn.error").setLevel(silence_level)
    logging.getLogger("sqlalchemy.engine").setLevel(silence_level)
