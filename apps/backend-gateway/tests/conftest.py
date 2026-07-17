"""
StadiumOS AI — Shared Test Fixtures.

This module provides pytest fixtures that are automatically available to all
test modules. Fixtures handle:
    - Creating a test FastAPI application with overridden dependencies.
    - Providing an async HTTP client (httpx.AsyncClient) for endpoint testing.
    - Setting up and tearing down a test database per test session.

Design Decisions:
    - We use httpx.AsyncClient instead of FastAPI's TestClient because
      our entire stack is async. TestClient wraps calls in sync, which
      can mask real async bugs (e.g., unawaited coroutines).
    - Each test function gets a fresh database transaction that is rolled
      back after the test, ensuring complete test isolation without the
      overhead of recreating tables for every test.
"""

import pytest
from httpx import ASGITransport, AsyncClient

from src.main import create_app


@pytest.fixture(scope="session")
def app():
    """
    Create a FastAPI application instance for the entire test session.

    The app is created once and reused across all tests. Dependency
    overrides (e.g., swapping the production database session for a
    test database session) are applied here.

    Yields:
        FastAPI: The configured test application.
    """
    # Create a fresh app instance using the factory pattern.
    # This ensures tests use a clean app without any module-level state.
    test_app = create_app()

    # Dependency overrides will be registered here in Module 3
    # when the database session fixture is implemented.

    yield test_app

    # Cleanup: clear any dependency overrides to prevent state leakage.
    test_app.dependency_overrides.clear()


@pytest.fixture
async def client(app):
    """
    Provide an async HTTP client connected to the test application.

    This fixture creates an httpx.AsyncClient that sends requests directly
    to the ASGI application in-process (no actual network I/O), making
    tests fast and deterministic.

    Args:
        app: The test FastAPI application (injected by the 'app' fixture).

    Yields:
        AsyncClient: An HTTP client for making test requests.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://testserver",
        headers={"Content-Type": "application/json"},
    ) as test_client:
        yield test_client
