"""
StadiumOS AI — Stadium Domain Entity.

Represents a physical FIFA World Cup 2026 venue. Each stadium contains
multiple sectors, which in turn contain gates and turnstiles. The stadium
is the top-level aggregate root for venue-related operations.

Design Decision:
    Stadium uses the Aggregate Root pattern. All modifications to child
    entities (sectors, gates) should be coordinated through the stadium
    to enforce cross-sector business rules (e.g., total capacity validation,
    coordinated gate closures during evacuations).
"""

from datetime import datetime
from uuid import UUID

from src.domain.value_objects import Coordinates


class Stadium:
    """
    A physical venue hosting FIFA World Cup 2026 matches.

    Attributes:
        id: Unique identifier (UUID v4).
        name: Official venue name (e.g., "MetLife Stadium").
        city: Host city (e.g., "East Rutherford, NJ").
        country: Host country (e.g., "United States").
        location: Geographic coordinates of the stadium center point.
        total_capacity: Maximum spectator capacity of the entire venue.
        timezone: IANA timezone string (e.g., "America/New_York") for
            localizing match times and shift schedules.
        created_at: Timestamp of record creation (UTC).
        updated_at: Timestamp of last modification (UTC).
    """

    __slots__ = (
        "id",
        "name",
        "city",
        "country",
        "location",
        "total_capacity",
        "timezone",
        "created_at",
        "updated_at",
    )

    def __init__(
        self,
        id: UUID,
        name: str,
        city: str,
        country: str,
        location: Coordinates,
        total_capacity: int,
        timezone: str = "UTC",
        created_at: datetime | None = None,
        updated_at: datetime | None = None,
    ) -> None:
        if total_capacity <= 0:
            raise ValueError("total_capacity must be a positive integer.")
        if not name.strip():
            raise ValueError("Stadium name cannot be empty.")

        self.id = id
        self.name = name.strip()
        self.city = city.strip()
        self.country = country.strip()
        self.location = location
        self.total_capacity = total_capacity
        self.timezone = timezone
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()

    def __repr__(self) -> str:
        return (
            f"Stadium(id={self.id}, name='{self.name}', "
            f"city='{self.city}', capacity={self.total_capacity})"
        )
