"""
StadiumOS AI — Incident ORM Model.

Maps the Incident domain entity to the 'incidents' PostgreSQL table.
Includes references to gates, sectors, reporters, assignees, and AI-recommended actions.
"""

import uuid
from datetime import datetime
from sqlalchemy import DateTime, Float, ForeignKey, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.domain.enums import IncidentSeverity, IncidentStatus
from src.infrastructure.database.base import Base, TimestampMixin, UUIDMixin


class IncidentModel(Base, UUIDMixin, TimestampMixin):
    """
    SQLAlchemy ORM model for the 'incidents' table.

    Columns:
        id: UUID v4 primary key.
        incident_type: Category of the incident (e.g., 'MEDICAL', 'SECURITY').
        severity: IncidentSeverity level (LOW, MEDIUM, HIGH, CRITICAL).
        status: IncidentStatus state.
        description: Description of the incident.
        latitude: Geographic latitude coordinate of the incident.
        longitude: Geographic longitude coordinate of the incident.
        sector_id: Reference to the Sector where the incident is located.
        gate_id: Reference to the nearest Gate (optional).
        reported_by_user_id: Reference to the User who reported the incident.
        assigned_volunteer_id: Reference to the Volunteer assigned to the incident (optional).
        ai_recommendation: Multi-agent recommended action text.
        resolution_notes: Notes explaining the resolution of the incident.
        resolved_at: Timestamp representing when the incident was marked resolved.
    """

    __tablename__ = "incidents"

    incident_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        doc="Type of the incident (e.g. MEDICAL, SECURITY).",
    )
    severity: Mapped[IncidentSeverity] = mapped_column(
        SAEnum(IncidentSeverity, name="incident_severity", create_constraint=True),
        nullable=False,
        default=IncidentSeverity.LOW,
        index=True,
        doc="Incident severity level.",
    )
    status: Mapped[IncidentStatus] = mapped_column(
        SAEnum(IncidentStatus, name="incident_status", create_constraint=True),
        nullable=False,
        default=IncidentStatus.REPORTED,
        index=True,
        doc="Incident workflow status.",
    )
    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        doc="Description of the event.",
    )
    latitude: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        doc="WGS84 latitude coordinate of the incident.",
    )
    longitude: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        doc="WGS84 longitude coordinate of the incident.",
    )
    sector_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("sectors.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        doc="Reference to the sector where the incident took place.",
    )
    gate_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("gates.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        doc="Reference to the nearest gate.",
    )
    reported_by_user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        doc="Reference to the reporting User.",
    )
    assigned_volunteer_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("volunteers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        doc="Reference to the assigned volunteer.",
    )
    ai_recommendation: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        doc="Generated action plan recommended by AI.",
    )
    resolution_notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        doc="Notes regarding resolution details.",
    )
    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        doc="Timestamp of incident resolution.",
    )

    # --- Relationships ---
    sector: Mapped["SectorModel"] = relationship(
        "SectorModel",
        back_populates="incidents",
    )
    gate: Mapped["GateModel | None"] = relationship(
        "GateModel",
        back_populates="incidents",
    )
    reported_by: relationship = relationship(
        "UserModel",
        foreign_keys=[reported_by_user_id],
    )
    assigned_volunteer: Mapped["VolunteerModel | None"] = relationship(
        "VolunteerModel",
        back_populates="assigned_incidents",
    )

    def __repr__(self) -> str:
        return f"<IncidentModel(id={self.id}, type='{self.incident_type}', severity='{self.severity.value}', status='{self.status.value}')>"
