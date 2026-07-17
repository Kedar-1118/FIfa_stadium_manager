"""
StadiumOS AI — Shared Test Fixtures.

Provides clean async database and Redis mocks to enable rapid, offline test execution.
"""

from collections.abc import AsyncGenerator
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from src.infrastructure.database.base import Base
from src.infrastructure.database.engine import get_db_session
from src.infrastructure.cache.redis_client import get_redis
from src.main import create_app

# Use in-memory SQLite for testing to bypass postgres infrastructure dependency
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

# Create testing SQLAlchemy engine
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

# Async session factory for tests
TestSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class MockRedis:
    """Mock Redis client storing items in memory for clean testing isolation."""

    def __init__(self) -> None:
        self.data: dict[str, str] = {}

    async def get(self, key: str) -> str | None:
        return self.data.get(key)

    async def set(self, key: str, value: str, ex: int | None = None) -> bool:
        self.data[key] = str(value)
        return True

    async def delete(self, key: str) -> int:
        if key in self.data:
            del self.data[key]
            return 1
        return 0

    async def exists(self, key: str) -> int:
        return 1 if key in self.data else 0

    async def ping(self) -> bool:
        return True

    async def geoadd(self, key: str, values: tuple) -> int:
        # Mock geoadd
        return 1

    async def zrem(self, key: str, member: str) -> int:
        return 1

    async def georadius(self, *args, **kwargs) -> list:
        return []


@pytest.fixture(scope="session")
def anyio_backend() -> str:
    """Specify backend loop for pytest-asyncio."""
    return "asyncio"


@pytest.fixture(scope="session", autouse=True)
async def setup_test_db() -> AsyncGenerator[None, None]:
    """
    Initialize SQLite database tables before executing tests.
    """
    # Create tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield

    # Clean up tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await test_engine.dispose()


@pytest.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Provide an isolated test database session.

    Rolls back any modifications made during the test.
    """
    async with TestSessionLocal() as session:
        try:
            yield session
        finally:
            await session.rollback()


@pytest.fixture(scope="session")
def app():
    """
    Create a FastAPI application instance with session-level mocked infrastructure.
    """
    test_app = create_app()
    yield test_app
    test_app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def override_dependencies(app, db_session):
    """
    Inject dependencies to override postgres and redis with memory mocks.
    """
    # 1. Override Database session injection
    async def _get_test_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db_session] = _get_test_db

    # 2. Override Redis injection
    mock_redis = MockRedis()
    async def _get_mock_redis() -> AsyncGenerator[MockRedis, None]:
        yield mock_redis

    app.dependency_overrides[get_redis] = _get_mock_redis

    yield

    # Clean overrides after each test
    app.dependency_overrides.pop(get_db_session, None)
    app.dependency_overrides.pop(get_redis, None)


@pytest.fixture
async def client(app):
    """
    Provide an async HTTP client connected to the test application.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://testserver",
        headers={"Content-Type": "application/json"},
    ) as test_client:
        yield test_client

