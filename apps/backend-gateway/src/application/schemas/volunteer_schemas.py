"""
StadiumOS AI — Volunteer Pydantic Schemas.

Validation and serialization DTO schemas for Volunteer management API endpoints.
"""

from uuid import UUID
from pydantic import BaseModel, Field

from src.domain.enums import VolunteerStatus


class VolunteerRegister(BaseModel):
    """Payload to register a new volunteer profile linked to current user."""

    name: str = Field(..., min_length=2, max_length=150, description="Volunteer full display name.")
    phone: str = Field(..., min_length=5, max_length=30, description="Contact phone number.")
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    assigned_sector_id: UUID | None = Field(default=None, description="Optional starting assigned sector.")
    skills: list[str] = Field(default_factory=list, description="Skill badges or spoken languages (e.g. ['first_aid']).")


class VolunteerLocationUpdate(BaseModel):
    """Payload to update volunteer geo-coordinates from mobile GPS."""

    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)


class VolunteerStatusUpdate(BaseModel):
    """Payload to transition volunteer availability status."""

    status: VolunteerStatus = Field(..., description="Target status (AVAILABLE, ASSIGNED, ON_BREAK, OFF_DUTY).")


class VolunteerResponse(BaseModel):
    """Serialized volunteer profile data."""

    id: UUID
    user_id: UUID
    name: str
    phone: str
    status: VolunteerStatus
    latitude: float
    longitude: float
    assigned_sector_id: UUID | None
    skills: list[str]

    class Config:
        from_attributes = True
