"""
StadiumOS AI — Stadium & Sector Endpoint Tests.

Validates CRUD routes, input parsing, coordinate thresholds, and RBAC permissions.
"""

import pytest
from httpx import AsyncClient


async def get_auth_headers(client: AsyncClient, email: str, role: str) -> dict[str, str]:
    """Helper utility to generate authentication headers for a given role."""
    await client.post(
        "/auth/register",
        json={"email": email, "password": "securepassword123", "role": role},
    )
    login_resp = await client.post(
        "/auth/login",
        json={"email": email, "password": "securepassword123"},
    )
    token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_create_stadium_admin_success(client: AsyncClient) -> None:
    """Ensure system administrators can create stadiums."""
    headers = await get_auth_headers(client, "admin1@fifa.com", "admin")
    payload = {
        "name": "MetLife Stadium",
        "city": "East Rutherford",
        "country": "USA",
        "latitude": 40.8135,
        "longitude": -74.0744,
        "total_capacity": 82500,
        "timezone": "America/New_York",
    }
    response = await client.post("/stadiums", json=payload, headers=headers)
    assert response.status_code == 201
    assert response.json()["name"] == payload["name"]
    assert "id" in response.json()


@pytest.mark.asyncio
async def test_create_stadium_forbidden_for_fan(client: AsyncClient) -> None:
    """Ensure public spectators/fans are blocked from creating stadiums."""
    headers = await get_auth_headers(client, "fan1@fifa.com", "fan")
    payload = {
        "name": "Forbidden Stadium",
        "city": "Nowhere",
        "country": "Nowhere",
        "latitude": 0.0,
        "longitude": 0.0,
        "total_capacity": 10000,
    }
    response = await client.post("/stadiums", json=payload, headers=headers)
    assert response.status_code == 403
    assert response.json()["error_code"] == "INSUFFICIENT_PERMISSIONS"


@pytest.mark.asyncio
async def test_stadium_and_sector_lifecycle(client: AsyncClient) -> None:
    """Ensure full CRUD lifecycle of stadium and sectors succeeds."""
    admin_headers = await get_auth_headers(client, "admin2@fifa.com", "admin")
    
    # 1. Create Stadium
    stadium_payload = {
        "name": "BC Place",
        "city": "Vancouver",
        "country": "Canada",
        "latitude": 49.2767,
        "longitude": -123.1120,
        "total_capacity": 54500,
    }
    stadium_resp = await client.post("/stadiums", json=stadium_payload, headers=admin_headers)
    stadium_id = stadium_resp.json()["id"]

    # 2. Add Sector
    sector_payload = {
        "name": "North Stand A",
        "max_capacity": 5000,
        "warning_threshold_percent": 85.0,
        "critical_threshold_percent": 98.0,
        "centroid_latitude": 49.2770,
        "centroid_longitude": -123.1118,
        "is_accessible": True,
    }
    sector_resp = await client.post(
        f"/stadiums/{stadium_id}/sectors",
        json=sector_payload,
        headers=admin_headers,
    )
    assert sector_resp.status_code == 201
    sector_id = sector_resp.json()["id"]
    assert sector_resp.json()["stadium_id"] == stadium_id

    # 3. List Sectors
    list_resp = await client.get(f"/stadiums/{stadium_id}/sectors")
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 1
    assert list_resp.json()[0]["name"] == "North Stand A"

    # 4. Delete Sector
    del_sector_resp = await client.delete(f"/stadiums/sectors/{sector_id}", headers=admin_headers)
    assert del_sector_resp.status_code == 204

    # 5. Verify Sector deleted
    verify_list_resp = await client.get(f"/stadiums/{stadium_id}/sectors")
    assert len(verify_list_resp.json()) == 0
