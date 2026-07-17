"""
StadiumOS AI — Gate Endpoint Tests.

Validates gate registration, operational status changes, and state transitions.
"""

import pytest
from httpx import AsyncClient


async def get_admin_headers(client: AsyncClient, email: str) -> dict[str, str]:
    """Helper to generate admin authentication headers."""
    await client.post(
        "/auth/register",
        json={"email": email, "password": "securepassword123", "role": "admin"},
    )
    login_resp = await client.post(
        "/auth/login",
        json={"email": email, "password": "securepassword123"},
    )
    token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def get_operator_headers(client: AsyncClient, email: str) -> dict[str, str]:
    """Helper to generate operator authentication headers."""
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
async def test_gate_lifecycle_and_transitions(client: AsyncClient) -> None:
    """Validate gate registration, valid state transitions, and invalid state transitions."""
    admin_headers = await get_admin_headers(client, "admin_gate@fifa.com")
    op_headers = await get_operator_headers(client, "operator_gate@fifa.com")

    # 1. Create Stadium & Sector to link gates
    stadium_resp = await client.post(
        "/stadiums",
        json={
            "name": "Stadium for Gates",
            "city": "Dallas",
            "country": "USA",
            "latitude": 32.7473,
            "longitude": -97.0945,
            "total_capacity": 80000,
        },
        headers=admin_headers,
    )
    stadium_id = stadium_resp.json()["id"]

    sector_resp = await client.post(
        f"/stadiums/{stadium_id}/sectors",
        json={
            "name": "East Concourse",
            "max_capacity": 10000,
            "centroid_latitude": 32.7475,
            "centroid_longitude": -97.0940,
        },
        headers=admin_headers,
    )
    sector_id = sector_resp.json()["id"]

    # 2. Register Gate
    gate_payload = {
        "gate_code": "GATE_5X",
        "latitude": 32.7476,
        "longitude": -97.0939,
        "is_bidirectional": True,
    }
    gate_resp = await client.post(
        f"/stadiums/sectors/{sector_id}/gates",
        json=gate_payload,
        headers=admin_headers,
    )
    assert gate_resp.status_code == 201
    gate_id = gate_resp.json()["id"]
    assert gate_resp.json()["status"] == "closed"  # Defaults to closed

    # 3. List Gates
    list_resp = await client.get(f"/stadiums/sectors/{sector_id}/gates")
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 1

    # 4. Valid Transition (Closed -> Open)
    transition1 = await client.patch(
        f"/gates/{gate_id}/status",
        json={"status": "open"},
        headers=op_headers,
    )
    assert transition1.status_code == 200
    assert transition1.json()["status"] == "open"

    # 5. Invalid Transition (Open -> Restricted is valid, but Open -> Open is noop, Open -> Closed is valid, Maintenance -> Congested is invalid)
    # Put to Maintenance first (Open -> Maintenance is valid)
    await client.patch(
        f"/gates/{gate_id}/status",
        json={"status": "maintenance"},
        headers=op_headers,
    )
    # Maintenance -> Congested is invalid (State machine rule check)
    invalid_transition = await client.patch(
        f"/gates/{gate_id}/status",
        json={"status": "congested"},
        headers=op_headers,
    )
    assert invalid_transition.status_code == 409
    assert invalid_transition.json()["error_code"] == "INVALID_STATE_TRANSITION"

    # 6. Delete Gate
    del_resp = await client.delete(f"/gates/{gate_id}", headers=admin_headers)
    assert del_resp.status_code == 204
