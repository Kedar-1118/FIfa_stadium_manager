"""
StadiumOS AI — Stadium & Sector Pydantic Schemas.

Validation and serialization DTO schemas for Stadium and Sector API endpoints.
"""

from uuid import UUID
from pydantic import BaseModel, Field, field_validator


class SectorCreate(BaseModel):
    """Payload to create a new stadium sector."""

    name: str = Field(..., min_length=2, max_length=100, description="Sector name (e.g. 'North Stand').")
    max_capacity: int = Field(..., gt=0, description="Max safe capacity.")
    warning_threshold_percent: float = Field(default=80.0, ge=50.0, le=100.0)
    critical_threshold_percent: float = Field(default=95.0, ge=70.0, le=100.0)
    centroid_latitude: float = Field(..., ge=-90.0, le=90.0)
    centroid_longitude: float = Field(..., ge=-180.0, le=180.0)
    is_accessible: bool = Field(default=False)

    @field_validator("critical_threshold_percent")
    @classmethod
    def validate_thresholds(cls, val: float, info: object) -> float:
        warning = info.data.get("warning_threshold_percent", 80.0)  # type: ignore[union-attr]
        if val <= warning:
            raise ValueError("Critical threshold must exceed warning threshold.")
        return val


class SectorResponse(BaseModel):
    """Serialized stadium sector data."""

    id: UUID
    stadium_id: UUID
    name: str
    max_capacity: int
    warning_threshold_percent: float
    critical_threshold_percent: float
    centroid_latitude: float
    centroid_longitude: float
    is_accessible: bool

    class Config:
        from_attributes = True


class StadiumCreate(BaseModel):
    """Payload to create a new stadium venue."""

    name: str = Field(..., min_length=2, max_length=150)
    city: str = Field(..., min_length=2, max_length=100)
    country: str = Field(..., min_length=2, max_length=100)
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    total_capacity: int = Field(..., gt=0)
    timezone: str = Field(default="UTC", min_length=2, max_length=50)


class StadiumResponse(BaseModel):
    """Serialized stadium data."""

    id: UUID
    name: str
    city: str
    country: str
    latitude: float
    longitude: float
    total_capacity: int
    timezone: str

    class Config:
        from_attributes = True

