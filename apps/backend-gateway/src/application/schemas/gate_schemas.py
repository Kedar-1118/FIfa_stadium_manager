"""
StadiumOS AI — Gate API Pydantic Schemas.

Validation and serialization DTO schemas for Gate API endpoints.
"""

from uuid import UUID
from pydantic import BaseModel, Field

from src.domain.enums import GateStatus


class GateCreate(BaseModel):
    """Payload to create a new gate."""

    gate_code: str = Field(..., min_length=2, max_length=50, description="Gate identification code (e.g. 'GATE_1A').")
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    is_bidirectional: bool = Field(default=True)


class GateStatusUpdate(BaseModel):
    """Payload to update a gate's operational status."""

    status: GateStatus = Field(..., description="Target status (OPEN, CLOSED, RESTRICTED, CONGESTED, MAINTENANCE).")


class GateResponse(BaseModel):
    """Serialized gate data."""

    id: UUID
    sector_id: UUID
    gate_code: str
    status: GateStatus
    latitude: float
    longitude: float
    is_bidirectional: bool

    class Config:
        from_attributes = True
