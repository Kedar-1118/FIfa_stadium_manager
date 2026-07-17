"""
StadiumOS AI — Incident Endpoint Tests.

Validates reporting incidents, dispatcher assignment constraints, resolution updates,
and verification rules.
"""

import pytest
from httpx import AsyncClient


async def get_volunteer_client_headers(client: AsyncClient, email: str) -> dict[str, str]:
    """Helper to generate volunteer headers."""
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


async def get_operator_client_headers(client: AsyncClient, email: str) -> dict[str, str]:
    """Helper to generate operator headers."""
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
async def test_incident_lifecycle(client: AsyncClient) -> None:
    """Validate full reporting, volunteer assignment dispatch, and resolution workflows."""
    v_headers = await get_volunteer_client_headers(client, "vol_inc@stadiumos.com")
    op_headers = await get_operator_client_headers(client, "op_inc@stadiumos.com")

    # 1. Setup Stadium & Sector
    stadium_resp = await client.post(
        "/stadiums",
        json={
            "name": "Incident Test Arena",
            "city": "Seattle",
            "country": "USA",
            "latitude": 47.5952,
            "longitude": -122.3316,
            "total_capacity": 65000,
        },
        headers=op_headers,  # admin setup fallback: op has permission or we can use admin. Let's use op_headers since admin is not strictly needed for test setups depending on configs. Wait, stadium write needs Admin. Let's register as admin.
    )
    # Re-register email as admin to pass write auth
    admin_headers = await get_volunteer_client_headers(client, "admin_inc@stadiumos.com")
    # Change user role to admin in DB or just register admin:
    await client.post(
        "/auth/register",
        json={"email": "admin_real@stadiumos.com", "password": "securepassword123", "role": "admin"},
    )
    admin_login = await client.post(
        "/auth/login",
        json={"email": "admin_real@stadiumos.com", "password": "securepassword123"},
    )
    real_admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

    # Create stadium
    st_resp = await client.post(
        "/stadiums",
        json={
            "name": "Incident Arena",
            "city": "Seattle",
            "country": "USA",
            "latitude": 47.5952,
            "longitude": -122.3316,
            "total_capacity": 65000,
        },
        headers=real_admin_headers,
    )
    stadium_id = st_resp.json()["id"]

    # Create Sector
    sec_resp = await client.post(
        f"/stadiums/{stadium_id}/sectors",
        json={
            "name": "West Gate Concourse",
            "max_capacity": 5000,
            "centroid_latitude": 47.5955,
            "centroid_longitude": -122.3310,
        },
        headers=real_admin_headers,
    )
    sector_id = sec_resp.json()["id"]

    # 2. Register Volunteer
    v_profile_resp = await client.post(
        "/volunteers/register",
        json={
            "name": "John Dispatch",
            "phone": "+12345678",
            "latitude": 47.5956,
            "longitude": -122.3309,
            "assigned_sector_id": sector_id,
            "skills": ["first_aid"],
        },
        headers=v_headers,
    )
    volunteer_id = v_profile_resp.json()["id"]

    # 3. Report Incident
    incident_payload = {
        "incident_type": "MEDICAL",
        "severity": "medium",
        "description": "Spectator fell down stairs in Sector B.",
        "latitude": 47.5957,
        "longitude": -122.3308,
        "sector_id": sector_id,
    }
    incident_resp = await client.post(
        "/incidents",
        json=incident_payload,
        headers=v_headers,
    )
    assert incident_resp.status_code == 201
    incident_id = incident_resp.json()["id"]
    assert incident_resp.json()["status"] == "reported"
    assert "MEDICAL EVENT" in incident_resp.json()["ai_recommendation"]

    # 4. Dispatch/Assign Volunteer to Incident
    assign_resp = await client.post(
        f"/incidents/{incident_id}/assign",
        json={"volunteer_id": volunteer_id},
        headers=op_headers,
    )
    assert assign_resp.status_code == 200
    assert assign_resp.json()["status"] == "in_progress"
    assert assign_resp.json()["assigned_volunteer_id"] == volunteer_id

    # Verify volunteer status transitioned to ASSIGNED
    v_details_resp = await client.get(f"/volunteers/{volunteer_id}", headers=op_headers)
    assert v_details_resp.json()["status"] == "assigned"

    # 5. Resolve Incident
    resolve_resp = await client.post(
        f"/incidents/{incident_id}/resolve",
        json={"resolution_notes": "First aid applied. Spectator escorted to medical center."},
        headers=v_headers,
    )
    assert resolve_resp.status_code == 200
    assert resolve_resp.json()["status"] == "resolved"
    assert resolve_resp.json()["resolved_at"] is not None

    # Verify volunteer released to AVAILABLE
    v_released_resp = await client.get(f"/volunteers/{volunteer_id}", headers=op_headers)
    assert v_released_resp.json()["status"] == "available"

