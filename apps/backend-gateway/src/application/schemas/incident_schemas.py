"""
StadiumOS AI — Incident API Pydantic Schemas.

Validation and serialization DTO schemas for Incident endpoints.
"""

from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field

from src.domain.enums import IncidentSeverity, IncidentStatus


class IncidentReport(BaseModel):
    """Payload to report a new incident."""

    incident_type: str = Field(..., min_length=2, max_length=100, description="Type of incident (e.g. 'MEDICAL', 'SECURITY').")
    severity: IncidentSeverity = Field(..., description="Severity level (LOW, MEDIUM, HIGH, CRITICAL).")
    description: str = Field(..., min_length=5, description="Free-text incident description details.")
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    sector_id: UUID = Field(..., description="Sector ID where the event occurred.")
    gate_id: UUID | None = Field(default=None, description="Optional closest sector gate reference.")


class IncidentAssign(BaseModel):
    """Payload to assign a volunteer to handle an active incident."""

    volunteer_id: UUID = Field(..., description="UUID of volunteer to be dispatched.")


class IncidentResolve(BaseModel):
    """Payload to close/resolve an incident."""

    resolution_notes: str = Field(..., min_length=5, description="Notes documenting actions taken to resolve the incident.")


class IncidentResponse(BaseModel):
    """Serialized representation of a reported incident."""

    id: UUID
    incident_type: str
    severity: IncidentSeverity
    status: IncidentStatus
    description: str
    latitude: float
    longitude: float
    sector_id: UUID
    gate_id: UUID | None
    reported_by_user_id: UUID
    assigned_volunteer_id: UUID | None
    ai_recommendation: str | None
    resolution_notes: str | None
    created_at: datetime
    resolved_at: datetime | None

    class Config:
        from_attributes = True
