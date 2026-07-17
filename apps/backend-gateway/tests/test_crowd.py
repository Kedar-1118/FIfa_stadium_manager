"""
StadiumOS AI — Crowd Endpoint Tests.

Validates telemetry queries and cache integrations.
"""

import pytest
from httpx import AsyncClient


async def get_user_headers(client: AsyncClient, email: str) -> dict[str, str]:
    """Helper to generate user authentication headers."""
    await client.post(
        "/auth/register",
        json={"email": email, "password": "securepassword123", "role": "fan"},
    )
    login_resp = await client.post(
        "/auth/login",
        json={"email": email, "password": "securepassword123"},
    )
    token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_get_crowd_status_structure(client: AsyncClient) -> None:
    """Ensure retrieving crowd status returns valid structure formats."""
    headers = await get_user_headers(client, "fan_crowd@fifa.com")
    response = await client.get("/crowd/status", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "overall_occupancy_percent" in data
    assert "gates" in data
    assert isinstance(data["gates"], list)
