"""
StadiumOS AI — Application Configuration Module.

Centralizes all environment-based configuration using Pydantic Settings.
This module is the SINGLE SOURCE OF TRUTH for every configurable parameter
in the backend gateway. All values are loaded from environment variables
(or a .env file) with strong type validation and sensible defaults.

Design Decisions:
    - Pydantic Settings v2 is used instead of raw os.getenv() to guarantee
      type safety at startup. A misconfigured DATABASE_URL will fail fast
      with a clear validation error rather than silently producing None.
    - The Settings class is instantiated once via @lru_cache to prevent
      redundant .env file reads on every dependency injection resolution.
    - Secrets (JWT_SECRET_KEY, DATABASE_URL) have no defaults, forcing
      explicit configuration in every environment — preventing accidental
      deployment with insecure fallback values.
"""

from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Immutable, validated application settings loaded from environment variables.

    Attributes are grouped by subsystem for readability. Every attribute
    includes a Field(...) descriptor with a human-readable description
    that appears in logs and debugging output.
    """

    # -------------------------------------------------------------------------
    # Application Identity
    # -------------------------------------------------------------------------
    app_name: str = Field(
        default="StadiumOS AI Gateway",
        description="Human-readable service name used in OpenAPI docs and log output.",
    )
    app_version: str = Field(
        default="1.0.0",
        description="Semantic version of the backend gateway service.",
    )
    app_env: Literal["development", "staging", "production"] = Field(
        default="development",
        description="Deployment environment. Controls debug mode and log verbosity.",
    )
    debug: bool = Field(
        default=False,
        description="Enable debug mode. MUST be False in production.",
    )

    # -------------------------------------------------------------------------
    # Server Configuration
    # -------------------------------------------------------------------------
    host: str = Field(
        default="0.0.0.0",
        description="Bind address for the Uvicorn server.",
    )
    port: int = Field(
        default=8000,
        ge=1,
        le=65535,
        description="Port number for the Uvicorn server.",
    )
    workers: int = Field(
        default=1,
        ge=1,
        le=32,
        description="Number of Uvicorn worker processes. Set >1 only in production.",
    )
    allowed_origins: list[str] = Field(
        default=["http://localhost:3000", "http://localhost:5173"],
        description="CORS allowed origins. Comma-separated in the environment variable.",
    )

    # -------------------------------------------------------------------------
    # PostgreSQL Database
    # -------------------------------------------------------------------------
    database_url: str = Field(
        ...,  # Required — no default, forces explicit configuration
        description="Async PostgreSQL connection string (postgresql+asyncpg://...).",
    )
    database_pool_size: int = Field(
        default=20,
        ge=5,
        le=100,
        description="SQLAlchemy connection pool size.",
    )
    database_max_overflow: int = Field(
        default=10,
        ge=0,
        le=50,
        description="Max overflow connections beyond pool_size.",
    )
    database_echo: bool = Field(
        default=False,
        description="Echo all SQL statements to stdout. Use only for debugging.",
    )

    # -------------------------------------------------------------------------
    # Redis Cache
    # -------------------------------------------------------------------------
    redis_url: str = Field(
        default="redis://localhost:6379/0",
        description="Redis connection URL.",
    )
    redis_max_connections: int = Field(
        default=50,
        ge=10,
        le=500,
        description="Maximum connections in the Redis connection pool.",
    )

    # -------------------------------------------------------------------------
    # JWT Authentication
    # -------------------------------------------------------------------------
    jwt_secret_key: str = Field(
        ...,  # Required — forces explicit secret configuration
        min_length=32,
        description="Secret key for signing JWT tokens. Must be at least 32 characters.",
    )
    jwt_algorithm: str = Field(
        default="HS256",
        description="Algorithm used for JWT token signing.",
    )
    jwt_access_token_expire_minutes: int = Field(
        default=30,
        ge=5,
        le=1440,
        description="Access token expiration time in minutes.",
    )
    jwt_refresh_token_expire_days: int = Field(
        default=7,
        ge=1,
        le=30,
        description="Refresh token expiration time in days.",
    )

    # -------------------------------------------------------------------------
    # Rate Limiting
    # -------------------------------------------------------------------------
    rate_limit_per_minute: int = Field(
        default=60,
        ge=10,
        le=1000,
        description="Maximum API requests per minute per client IP.",
    )

    # -------------------------------------------------------------------------
    # Logging
    # -------------------------------------------------------------------------
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = Field(
        default="INFO",
        description="Minimum log level for structured logging output.",
    )
    log_format: Literal["json", "console"] = Field(
        default="json",
        description="Log output format. 'json' for production, 'console' for development.",
    )

    # -------------------------------------------------------------------------
    # Pydantic Settings Configuration
    # -------------------------------------------------------------------------
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        # Allow comma-separated strings to be parsed as lists (e.g., ALLOWED_ORIGINS)
        env_parse_none_str="None",
    )

    # -------------------------------------------------------------------------
    # Validators
    # -------------------------------------------------------------------------
    @field_validator("database_url")
    @classmethod
    def validate_database_url(cls, value: str) -> str:
        """Ensure the database URL uses the async asyncpg driver."""
        if not value.startswith("postgresql+asyncpg://"):
            raise ValueError(
                "DATABASE_URL must use the async driver: "
                "postgresql+asyncpg://user:pass@host:port/dbname"
            )
        return value

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def parse_allowed_origins(cls, value: str | list[str]) -> list[str]:
        """Parse comma-separated ALLOWED_ORIGINS string into a list."""
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    # -------------------------------------------------------------------------
    # Computed Properties
    # -------------------------------------------------------------------------
    @property
    def is_production(self) -> bool:
        """Check if the application is running in production mode."""
        return self.app_env == "production"

    @property
    def is_development(self) -> bool:
        """Check if the application is running in development mode."""
        return self.app_env == "development"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """
    Return a cached, singleton Settings instance.

    Using @lru_cache ensures the .env file is read exactly once during the
    application lifecycle, and the same validated Settings object is reused
    across all dependency injection calls.

    Returns:
        Settings: The validated application settings.

    Raises:
        pydantic.ValidationError: If required environment variables are
            missing or have invalid values. This causes a fast startup
            failure with a clear error message.
    """
    return Settings()
