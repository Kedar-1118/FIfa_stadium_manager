"""
StadiumOS AI — Authentication Endpoint Tests.

Validates registration, login, JWT exchange, profile retrieval, and RBAC errors.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_user_success(client: AsyncClient) -> None:
    """Ensure a user can register successfully with valid inputs."""
    payload = {
        "email": "volunteer1@fifaworldcup.com",
        "password": "securepassword123",
        "role": "volunteer",
    }
    response = await client.post("/auth/register", json=payload)
    
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == payload["email"]
    assert data["role"] == "volunteer"
    assert data["is_active"] is True
    assert "id" in data


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient) -> None:
    """Ensure registering an existing email returns 409 Conflict."""
    payload = {
        "email": "duplicate@fifaworldcup.com",
        "password": "securepassword123",
        "role": "fan",
    }
    # First registration
    await client.post("/auth/register", json=payload)
    
    # Second registration with same email
    response = await client.post("/auth/register", json=payload)
    
    assert response.status_code == 409
    data = response.json()
    assert data["error_code"] == "DUPLICATE_ENTITY"


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient) -> None:
    """Ensure logging in with correct credentials returns token pair."""
    register_payload = {
        "email": "login_test@fifaworldcup.com",
        "password": "securepassword123",
        "role": "operator",
    }
    await client.post("/auth/register", json=register_payload)

    login_payload = {
        "email": "login_test@fifaworldcup.com",
        "password": "securepassword123",
    }
    response = await client.post("/auth/login", json=login_payload)
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == register_payload["email"]


@pytest.mark.asyncio
async def test_login_invalid_password(client: AsyncClient) -> None:
    """Ensure login fails with 401 when password matches incorrectly."""
    register_payload = {
        "email": "wrong_pass@fifaworldcup.com",
        "password": "securepassword123",
    }
    await client.post("/auth/register", json=register_payload)

    login_payload = {
        "email": "wrong_pass@fifaworldcup.com",
        "password": "wrongpassword",
    }
    response = await client.post("/auth/login", json=login_payload)
    
    assert response.status_code == 401
    data = response.json()
    assert data["error_code"] == "AUTHENTICATION_FAILED"


@pytest.mark.asyncio
async def test_get_me_success(client: AsyncClient) -> None:
    """Ensure /me profile route returns active user entity if Bearer token validated."""
    register_payload = {
        "email": "profile_test@fifaworldcup.com",
        "password": "securepassword123",
        "role": "admin",
    }
    await client.post("/auth/register", json=register_payload)

    login_payload = {
        "email": "profile_test@fifaworldcup.com",
        "password": "securepassword123",
    }
    login_response = await client.post("/auth/login", json=login_payload)
    access_token = login_response.json()["access_token"]

    headers = {"Authorization": f"Bearer {access_token}"}
    response = await client.get("/auth/me", headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == register_payload["email"]
    assert data["role"] == "admin"


@pytest.mark.asyncio
async def test_get_me_unauthorized(client: AsyncClient) -> None:
    """Ensure fetching profile without authorization header returns 401."""
    response = await client.get("/auth/me")
    assert response.status_code == 401
    assert response.json()["error_code"] == "AUTHENTICATION_FAILED"
