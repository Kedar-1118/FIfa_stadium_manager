"""
StadiumOS AI — Stadium ORM Model.

Maps the Stadium domain entity to the 'stadiums' PostgreSQL table.
Stores venue metadata and geographic coordinates.
"""

from sqlalchemy import Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.infrastructure.database.base import Base, TimestampMixin, UUIDMixin


class StadiumModel(Base, UUIDMixin, TimestampMixin):
    """
    SQLAlchemy ORM model for the 'stadiums' table.

    Columns:
        id: UUID v4 primary key.
        name: Official venue name (unique).
        city: Host city.
        country: Host country.
        latitude/longitude: Geographic coordinates of the stadium center.
        total_capacity: Maximum spectator capacity.
        timezone: IANA timezone string for localizing schedules.
    """

    __tablename__ = "stadiums"

    name: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
        doc="Official venue name (e.g., 'MetLife Stadium').",
    )
    city: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        doc="Host city (e.g., 'East Rutherford, NJ').",
    )
    country: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        doc="Host country (e.g., 'United States').",
    )
    latitude: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        doc="WGS84 latitude of the stadium center point.",
    )
    longitude: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        doc="WGS84 longitude of the stadium center point.",
    )
    total_capacity: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        doc="Maximum spectator capacity of the entire venue.",
    )
    timezone: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="UTC",
        doc="IANA timezone string (e.g., 'America/New_York').",
    )

    # --- Relationships ---
    sectors: Mapped[list["SectorModel"]] = relationship(
        "SectorModel",
        back_populates="stadium",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<StadiumModel(id={self.id}, name='{self.name}')>"
