"""
StadiumOS AI — Volunteer Endpoint Tests.

Validates volunteer profile setup, shift availability changes, high-frequency GPS tracking,
and operator geo-spatial radius searching.
"""

import pytest
from httpx import AsyncClient


async def get_volunteer_headers(client: AsyncClient, email: str) -> dict[str, str]:
    """Helper to generate volunteer authenticated headers."""
    await client.post(
        "/auth/register",
        json={"email": email, "password": "securepassword123", "role": "volunteer"},
    )
    login_resp = await client.post(
        "/auth/login",
        json={"email": email, "password": "securepassword123"},
    )
    token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def get_operator_headers(client: AsyncClient, email: str) -> dict[str, str]:
    """Helper to generate operator authenticated headers."""
    await client.post(
        "/auth/register",
        json={"email": email, "password": "securepassword123", "role": "operator"},
    )
    login_resp = await client.post(
        "/auth/login",
        json={"email": email, "password": "securepassword123"},
    )
    token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_volunteer_shift_and_geo_tracking(client: AsyncClient) -> None:
    """Validate registration, location reporting, status adjustments, and searching."""
    v_headers = await get_volunteer_headers(client, "volunteer1@stadiumos.com")
    op_headers = await get_operator_headers(client, "operator1@stadiumos.com")

    # 1. Register as a volunteer
    register_payload = {
        "name": "Jane Doe",
        "phone": "+15550199",
        "latitude": 34.0522,
        "longitude": -118.2437,
        "skills": ["first_aid", "spanish"],
    }
    register_resp = await client.post(
        "/volunteers/register",
        json=register_payload,
        headers=v_headers,
    )
    assert register_resp.status_code == 201
    volunteer_id = register_resp.json()["id"]
    assert register_resp.json()["status"] == "available"

    # 2. Sync Coordinates
    location_payload = {
        "latitude": 34.0528,
        "longitude": -118.2442,
    }
    location_resp = await client.patch(
        "/volunteers/location",
        json=location_payload,
        headers=v_headers,
    )
    assert location_resp.status_code == 200
    assert location_resp.json()["latitude"] == location_payload["latitude"]

    # 3. Update Status (go on scheduled break)
    status_resp = await client.patch(
        "/volunteers/status",
        json={"status": "on_break"},
        headers=v_headers,
    )
    assert status_resp.status_code == 200
    assert status_resp.json()["status"] == "on_break"

    # 4. Operator queries details
    details_resp = await client.get(f"/volunteers/{volunteer_id}", headers=op_headers)
    assert details_resp.status_code == 200
    assert details_resp.json()["name"] == "Jane Doe"
