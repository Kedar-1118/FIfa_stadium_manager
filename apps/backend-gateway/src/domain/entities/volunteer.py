"""
StadiumOS AI — Volunteer Domain Entity.

Represents a field staff member assigned to stadium operations during
FIFA World Cup 2026 matches. Volunteers are the human responders that
the Security & Medical Agent dispatches to handle incidents.

The Digital Twin tracks volunteer positions in real-time via Redis
GEOADD, enabling the agent mesh to find the nearest available volunteer
to any incident location using GEORADIUS queries.
"""

from datetime import datetime
from uuid import UUID

from src.domain.enums import VolunteerStatus
from src.domain.exceptions import BusinessRuleViolationError
from src.domain.value_objects import Coordinates


class Volunteer:
    """
    A field staff member assigned to stadium operations.

    Attributes:
        id: Unique identifier (UUID v4).
        user_id: Foreign key linking to the associated User account.
        name: Display name of the volunteer.
        phone: Contact phone number for emergency communications.
        status: Current availability status (available, assigned, etc.).
        current_location: Last known geographic coordinates (from mobile app GPS).
        assigned_sector_id: The sector this volunteer is responsible for.
            Can be None if the volunteer is a roaming responder.
        skills: List of skill tags (e.g., ["first_aid", "multilingual_spanish"]).
            Used by the agent mesh to match volunteers to incident types.
        created_at: Timestamp of record creation (UTC).
        updated_at: Timestamp of last modification (UTC).
    """

    __slots__ = (
        "id",
        "user_id",
        "name",
        "phone",
        "status",
        "current_location",
        "assigned_sector_id",
        "skills",
        "created_at",
        "updated_at",
    )

    def __init__(
        self,
        id: UUID,
        user_id: UUID,
        name: str,
        phone: str,
        current_location: Coordinates,
        assigned_sector_id: UUID | None = None,
        status: VolunteerStatus = VolunteerStatus.AVAILABLE,
        skills: list[str] | None = None,
        created_at: datetime | None = None,
        updated_at: datetime | None = None,
    ) -> None:
        if not name.strip():
            raise ValueError("Volunteer name cannot be empty.")

        self.id = id
        self.user_id = user_id
        self.name = name.strip()
        self.phone = phone
        self.status = status
        self.current_location = current_location
        self.assigned_sector_id = assigned_sector_id
        self.skills = skills or []
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()

    def assign_to_incident(self) -> None:
        """
        Mark this volunteer as assigned to an active incident.

        Business Rule: Only volunteers with AVAILABLE status can be
        assigned to incidents. Attempting to assign an on-break or
        already-assigned volunteer raises a BusinessRuleViolationError.

        Raises:
            BusinessRuleViolationError: If the volunteer is not available.
        """
        if self.status != VolunteerStatus.AVAILABLE:
            raise BusinessRuleViolationError(
                rule="Volunteer must be AVAILABLE to accept an assignment",
                details=f"Current status is '{self.status.value}'.",
            )
        self.status = VolunteerStatus.ASSIGNED
        self.updated_at = datetime.utcnow()

    def release_from_incident(self) -> None:
        """
        Mark this volunteer as available after completing an incident response.

        This method transitions the volunteer from ASSIGNED back to AVAILABLE,
        making them eligible for new dispatch assignments.
        """
        self.status = VolunteerStatus.AVAILABLE
        self.updated_at = datetime.utcnow()

    def update_location(self, new_location: Coordinates) -> None:
        """
        Update the volunteer's last known geographic coordinates.

        Called periodically by the mobile app (every 10 seconds) to keep
        the Redis spatial index current. The infrastructure layer syncs
        this update to Redis GEOADD after the database write.

        Args:
            new_location: The volunteer's updated GPS coordinates.
        """
        self.current_location = new_location
        self.updated_at = datetime.utcnow()

    @property
    def is_available(self) -> bool:
        """Check if the volunteer can accept new assignments."""
        return self.status == VolunteerStatus.AVAILABLE

    def has_skill(self, skill: str) -> bool:
        """
        Check if the volunteer possesses a specific skill.

        Args:
            skill: The skill tag to check (e.g., "first_aid").

        Returns:
            True if the volunteer has the specified skill.
        """
        return skill.lower() in [s.lower() for s in self.skills]

    def __repr__(self) -> str:
        return (
            f"Volunteer(id={self.id}, name='{self.name}', "
            f"status={self.status.value})"
        )
