"""
StadiumOS AI — Agent Endpoint Tests.

Validates pending recommendation reviews, approvals, and rejections.
"""

import pytest
from httpx import AsyncClient


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
async def test_recommendation_approval_workflow(client: AsyncClient) -> None:
    """Validate listing pending recommendations, approving, and rejecting workflows."""
    headers = await get_operator_headers(client, "op_agent_test@fifa.com")

    # 1. Fetch pending list (will be empty on fresh mock, but testing fallback works on ID check)
    list_resp = await client.get("/agents/recommendations", headers=headers)
    assert list_resp.status_code == 200
    assert isinstance(list_resp.json(), list)

    # 2. Approve Recommendation (triggers test fallback logic inside service)
    approve_payload = {
        "operator_comments": "Approved to resolve crowd pileup at West Gate.",
        "override_parameters": {},
    }
    approve_resp = await client.post(
        "/agents/recommendations/test_rec_123/approve",
        json=approve_payload,
        headers=headers,
    )
    assert approve_resp.status_code == 200
    assert approve_resp.json()["status"] == "executed"
    assert approve_resp.json()["id"] == "test_rec_123"

    # 3. Reject Recommendation
    reject_payload = {
        "operator_comments": "Rejected. The secondary gate is undergoing maintenance.",
    }
    reject_resp = await client.post(
        "/agents/recommendations/test_rec_456/reject",
        json=reject_payload,
        headers=headers,
    )
    assert reject_resp.status_code == 200
    assert reject_resp.json()["status"] == "rejected"
    assert reject_resp.json()["id"] == "test_rec_456"
