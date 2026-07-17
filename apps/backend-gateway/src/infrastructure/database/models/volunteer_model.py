"""
StadiumOS AI — Volunteer ORM Model.

Maps the Volunteer domain entity to the 'volunteers' PostgreSQL table.
Includes contact details, active availability, skills array, and current coordinates.
"""

import uuid
from sqlalchemy import Float, ForeignKey, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import ARRAY, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.domain.enums import VolunteerStatus
from src.infrastructure.database.base import Base, TimestampMixin, UUIDMixin


class VolunteerModel(Base, UUIDMixin, TimestampMixin):
    """
    SQLAlchemy ORM model for the 'volunteers' table.

    Columns:
        id: UUID v4 primary key.
        user_id: Foreign key to the associated UserModel (1:1).
        name: Name of the volunteer.
        phone: Active contact number.
        status: VolunteerStatus availability enum.
        latitude: Geographic latitude of the volunteer's current GPS location.
        longitude: Geographic longitude of the volunteer's current GPS location.
        assigned_sector_id: Reference to the assigned SectorModel (optional).
        skills: List of skill tags/languages stored as a PostgreSQL array.
    """

    __tablename__ = "volunteers"

    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
        doc="Reference to the associated User account.",
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        doc="Volunteer display name.",
    )
    phone: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        doc="Volunteer contact number.",
    )
    status: Mapped[VolunteerStatus] = mapped_column(
        SAEnum(VolunteerStatus, name="volunteer_status", create_constraint=True),
        nullable=False,
        default=VolunteerStatus.OFF_DUTY,
        doc="Volunteer availability status.",
    )
    latitude: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        doc="Volunteer current GPS latitude.",
    )
    longitude: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        doc="Volunteer current GPS longitude.",
    )
    assigned_sector_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("sectors.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        doc="Reference to the assigned stadium sector, or null.",
    )
    skills: Mapped[list[str]] = mapped_column(
        ARRAY(String),
        nullable=False,
        default=list,
        doc="Skills or languages possessed by this volunteer.",
    )

    # --- Relationships ---
    user: Mapped["UserModel"] = relationship(
        "UserModel",
        back_populates="volunteer",
    )
    assigned_sector: Mapped["SectorModel | None"] = relationship(
        "SectorModel",
        back_populates="volunteers",
    )
    assigned_incidents: Mapped[list["IncidentModel"]] = relationship(
        "IncidentModel",
        back_populates="assigned_volunteer",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<VolunteerModel(id={self.id}, name='{self.name}', status='{self.status.value}')>"
