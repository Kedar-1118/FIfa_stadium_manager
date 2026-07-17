"""
StadiumOS AI — Sector ORM Model.

Maps the Sector domain entity to the 'sectors' PostgreSQL table.
Stores capacity thresholds and sector dimensions.
"""

import uuid
from sqlalchemy import Boolean, Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.infrastructure.database.base import Base, TimestampMixin, UUIDMixin


class SectorModel(Base, UUIDMixin, TimestampMixin):
    """
    SQLAlchemy ORM model for the 'sectors' table.

    Columns:
        id: UUID v4 primary key.
        stadium_id: Foreign key to the parent Stadium.
        name: Sector name (unique within the stadium).
        max_capacity: Maximum occupant capacity.
        warning_threshold_percent: Occupancy threshold percent for warning trigger.
        critical_threshold_percent: Occupancy threshold percent for critical action.
        centroid_latitude: Sector center point latitude.
        centroid_longitude: Sector center point longitude.
        is_accessible: Accessible seating availability flag.
    """

    __tablename__ = "sectors"

    stadium_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("stadiums.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Reference to the parent Stadium.",
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        doc="Sector name (e.g., 'North Stand').",
    )
    max_capacity: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        doc="Maximum safe capacity for this sector.",
    )
    warning_threshold_percent: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=80.0,
        doc="Warning alert percentage threshold.",
    )
    critical_threshold_percent: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=95.0,
        doc="Critical action percentage threshold.",
    )
    centroid_latitude: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        doc="Sector centroid latitude.",
    )
    centroid_longitude: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        doc="Sector centroid longitude.",
    )
    is_accessible: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        doc="True if the sector offers wheelchair-accessible seating.",
    )

    # --- Relationships ---
    stadium: Mapped["StadiumModel"] = relationship(
        "StadiumModel",
        back_populates="sectors",
    )
    gates: Mapped[list["GateModel"]] = relationship(
        "GateModel",
        back_populates="sector",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    volunteers: Mapped[list["VolunteerModel"]] = relationship(
        "VolunteerModel",
        back_populates="assigned_sector",
        lazy="selectin",
    )
    incidents: Mapped[list["IncidentModel"]] = relationship(
        "IncidentModel",
        back_populates="sector",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<SectorModel(id={self.id}, name='{self.name}', stadium_id={self.stadium_id})>"
