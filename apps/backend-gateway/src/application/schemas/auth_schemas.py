"""
StadiumOS AI — Authentication Pydantic Schemas.

Defines schemas for JWT-based auth flows (registration, login, refresh).
"""

from uuid import UUID
from pydantic import BaseModel, EmailStr, Field

from src.domain.enums import UserRole


class RegisterRequest(BaseModel):
    """Payload for registering a new system user account."""

    email: EmailStr = Field(
        ...,
        description="User email address used as login ID.",
        examples=["operator1@fifaworldcup.com"],
    )
    password: str = Field(
        ...,
        min_length=8,
        max_length=64,
        description="Plaintext password, minimum 8 characters.",
        examples=["P@ssw0rd123"],
    )
    role: UserRole = Field(
        default=UserRole.FAN,
        description="Initial RBAC role assigned to the user.",
    )


class LoginRequest(BaseModel):
    """Payload containing credentials to log in."""

    email: EmailStr = Field(
        ...,
        description="Login email address.",
        examples=["operator1@fifaworldcup.com"],
    )
    password: str = Field(
        ...,
        description="Plaintext password.",
        examples=["P@ssw0rd123"],
    )


class UserResponse(BaseModel):
    """Serialized representation of a user profile."""

    id: UUID = Field(..., description="Unique identifier (UUID v4).")
    email: EmailStr = Field(..., description="User's registered email address.")
    role: UserRole = Field(..., description="Active RBAC user role.")
    is_active: bool = Field(..., description="True if account is active.")

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """Auth response returning generated token pairs."""

    access_token: str = Field(..., description="JWT access token.")
    refresh_token: str = Field(..., description="JWT refresh token.")
    token_type: str = Field(default="bearer", description="Token schema type.")
    user: UserResponse = Field(..., description="Authenticated user info.")


class RefreshTokenRequest(BaseModel):
    """Payload carrying refresh token to generate fresh access tokens."""

    refresh_token: str = Field(..., description="Valid JSON Web Refresh Token.")
