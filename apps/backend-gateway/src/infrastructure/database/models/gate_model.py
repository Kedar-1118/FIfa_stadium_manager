"""
StadiumOS AI — Gate ORM Model.

Maps the Gate domain entity to the 'gates' PostgreSQL table.
Maintains individual entry/exit gate statuses.
"""

import uuid
from sqlalchemy import Boolean, Float, ForeignKey, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.domain.enums import GateStatus
from src.infrastructure.database.base import Base, TimestampMixin, UUIDMixin


class GateModel(Base, UUIDMixin, TimestampMixin):
    """
    SQLAlchemy ORM model for the 'gates' table.

    Columns:
        id: UUID v4 primary key.
        sector_id: Foreign key to the parent Sector.
        gate_code: Unique code representing the gate (e.g., 'GATE_3A').
        status: GateStatus enum (OPEN, CLOSED, RESTRICTED, CONGESTED, MAINTENANCE).
        latitude: Geographic latitude of the gate location.
        longitude: Geographic longitude of the gate location.
        is_bidirectional: True if the gate supports ingress and egress.
    """

    __tablename__ = "gates"

    sector_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("sectors.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Reference to the parent Sector.",
    )
    gate_code: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        unique=True,
        index=True,
        doc="Unique human-readable gate code (e.g., 'GATE_3A').",
    )
    status: Mapped[GateStatus] = mapped_column(
        SAEnum(GateStatus, name="gate_status", create_constraint=True),
        nullable=False,
        default=GateStatus.CLOSED,
        doc="Gate status representing accessibility status.",
    )
    latitude: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        doc="Gate WGS84 latitude coordinate.",
    )
    longitude: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        doc="Gate WGS84 longitude coordinate.",
    )
    is_bidirectional: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        doc="True if the gate supports dual entry and exit flow.",
    )

    # --- Relationships ---
    sector: Mapped["SectorModel"] = relationship(
        "SectorModel",
        back_populates="gates",
    )
    incidents: Mapped[list["IncidentModel"]] = relationship(
        "IncidentModel",
        back_populates="gate",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<GateModel(id={self.id}, gate_code='{self.gate_code}', status='{self.status.value}')>"
