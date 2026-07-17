# =============================================================================
# StadiumOS AI — Backend Gateway Dockerfile
# =============================================================================
# Multi-stage build for minimal production image size.
#
# Stage 1 (builder): Installs all Python dependencies into a virtual env.
# Stage 2 (runtime): Copies only the virtual env and source code into a
#                     slim base image, reducing the final image from ~1.2GB
#                     to ~250MB.
#
# Security Decisions:
#   - Runs as non-root user 'appuser' (UID 1000) to prevent container
#     escape attacks from gaining host-level root privileges.
#   - No dev dependencies are installed in the runtime stage.
#   - .dockerignore excludes .env, .git, __pycache__, and test files.
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Builder — Install dependencies in an isolated virtual environment
# ---------------------------------------------------------------------------
FROM python:3.12-slim AS builder

# Prevent Python from writing .pyc files and enable unbuffered stdout/stderr
# so log output appears immediately in Docker logs (critical for crash debugging).
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /build

# Install system-level build dependencies required by asyncpg and bcrypt.
# These are NOT included in the runtime image.
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Copy only the dependency manifest first to maximize Docker layer caching.
# Dependencies are re-installed ONLY when pyproject.toml changes.
COPY pyproject.toml ./

# Create a virtual environment and install production dependencies.
RUN python -m venv /opt/venv && \
    /opt/venv/bin/pip install --upgrade pip && \
    /opt/venv/bin/pip install --no-cache-dir .

# ---------------------------------------------------------------------------
# Stage 2: Runtime — Minimal image with only the app and its dependencies
# ---------------------------------------------------------------------------
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    # Add the virtual env's bin directory to PATH so 'uvicorn' is available
    PATH="/opt/venv/bin:$PATH"

# Install only the minimal runtime library required by asyncpg.
RUN apt-get update && \
    apt-get install -y --no-install-recommends libpq5 && \
    rm -rf /var/lib/apt/lists/*

# Create a non-root user for running the application.
# This is a critical security measure — even if the application has a
# remote code execution vulnerability, the attacker cannot escalate to
# host-level root privileges.
RUN groupadd --gid 1000 appuser && \
    useradd --uid 1000 --gid appuser --shell /bin/bash --create-home appuser

WORKDIR /app

# Copy the pre-built virtual environment from the builder stage.
COPY --from=builder /opt/venv /opt/venv

# Copy the application source code.
COPY src/ ./src/
COPY alembic/ ./alembic/
COPY alembic.ini ./

# Transfer ownership to the non-root user.
RUN chown -R appuser:appuser /app

# Switch to the non-root user.
USER appuser

# Expose the application port.
EXPOSE 8000

# Health check — Kubernetes probes will use /health, but this Docker-native
# health check provides visibility in `docker ps` output.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8000/health')" || exit 1

# Start the application with Uvicorn.
# --factory flag is NOT used because src.main.app is a module-level instance.
# --proxy-headers is enabled to trust X-Forwarded-For from Kong/nginx.
CMD ["uvicorn", "src.main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--proxy-headers", \
     "--forwarded-allow-ips", "*"]
