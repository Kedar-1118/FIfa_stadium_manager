"""
StadiumOS AI — Health & Readiness Endpoint Tests.

Validates application liveness and dependency readiness checking probes.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_liveness_probe(client: AsyncClient) -> None:
    """Ensure liveness check returns 200 healthy status."""
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


@pytest.mark.asyncio
async def test_readiness_probe(client: AsyncClient) -> None:
    """Ensure readiness check returns 200 ready status if dependencies are connected."""
    response = await client.get("/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert data["checks"]["database"] == "up"
    assert data["checks"]["redis"] == "up"
