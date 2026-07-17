"""
StadiumOS AI — Crowd Status Schemas.

Validation and serialization DTO schemas for Crowd Telemetry read-model endpoints.
"""

from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field


class GateStatusTelemetry(BaseModel):
    """Real-time telemetry read model representing status of an ingress gate."""

    gate_id: UUID
    gate_code: str
    status: str = Field(..., description="Active operational status (e.g. OPEN, CLOSED, CONGESTED).")
    current_flow_rate_per_min: int = Field(default=0, description="Spectators per minute entering the venue.")
    average_wait_time_seconds: int = Field(default=0, description="Average estimated queuing wait time.")
    active_alarms: list[str] = Field(default_factory=list, description="Active anomaly alerts (e.g. ['HIGH_DENSITY_WARNING']).")


class CrowdStatusResponse(BaseModel):
    """Real-time crowd state overview representation."""

    timestamp: datetime
    overall_occupancy_percent: float = Field(..., ge=0.0, le=100.0, description="Overall stadium occupancy.")
    gates: list[GateStatusTelemetry] = Field(default_factory=list)
