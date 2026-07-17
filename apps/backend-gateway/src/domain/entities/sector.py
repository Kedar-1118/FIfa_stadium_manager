"""
StadiumOS AI — Sector Domain Entity.

Represents a logical subdivision of a stadium. Sectors are the primary
unit of crowd management — the Crowd Dynamics Agent reasons about
occupancy, flow rates, and congestion at the sector level.

Examples of sectors: North Stand, South Stand, VIP Lounge, Concourse A,
Media Tribune, Accessible Seating Area.
"""

from datetime import datetime
from uuid import UUID

from src.domain.value_objects import CapacityInfo, Coordinates


class Sector:
    """
    A logical subdivision of a stadium used for crowd management.

    Attributes:
        id: Unique identifier (UUID v4).
        stadium_id: Foreign key linking to the parent Stadium.
        name: Sector name (e.g., "North Stand", "VIP Lounge").
        capacity_info: Capacity thresholds for congestion alerting.
        centroid: Geographic center point of the sector for spatial queries.
        is_accessible: Whether this sector has wheelchair-accessible facilities.
        created_at: Timestamp of record creation (UTC).
        updated_at: Timestamp of last modification (UTC).
    """

    __slots__ = (
        "id",
        "stadium_id",
        "name",
        "capacity_info",
        "centroid",
        "is_accessible",
        "created_at",
        "updated_at",
    )

    def __init__(
        self,
        id: UUID,
        stadium_id: UUID,
        name: str,
        capacity_info: CapacityInfo,
        centroid: Coordinates,
        is_accessible: bool = False,
        created_at: datetime | None = None,
        updated_at: datetime | None = None,
    ) -> None:
        if not name.strip():
            raise ValueError("Sector name cannot be empty.")

        self.id = id
        self.stadium_id = stadium_id
        self.name = name.strip()
        self.capacity_info = capacity_info
        self.centroid = centroid
        self.is_accessible = is_accessible
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()

    def check_occupancy_status(self, current_count: int) -> str:
        """
        Evaluate the current occupancy against configured thresholds.

        This method is called by the Digital Twin State Manager every time
        a new crowd count is received from CCTV analytics or turnstile data.

        Args:
            current_count: The current number of people in this sector.

        Returns:
            A string status: "normal", "warning", or "critical".
        """
        if self.capacity_info.is_critical(current_count):
            return "critical"
        if self.capacity_info.is_warning(current_count):
            return "warning"
        return "normal"

    def __repr__(self) -> str:
        return (
            f"Sector(id={self.id}, name='{self.name}', "
            f"stadium_id={self.stadium_id})"
        )
