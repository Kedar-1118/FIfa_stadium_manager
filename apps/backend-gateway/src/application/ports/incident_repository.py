"""
StadiumOS AI — Incident Repository Port.

Defines the abstract interface for Incident entity persistence.
"""

from abc import ABC, abstractmethod
from uuid import UUID

from src.domain.entities.incident import Incident


class IncidentRepository(ABC):
    """
    Abstract interface for managing Incident persistence.
    """

    @abstractmethod
    async def get_by_id(self, incident_id: UUID) -> Incident | None:
        """Retrieve an Incident by its UUID."""
        pass

    @abstractmethod
    async def list_active(self) -> list[Incident]:
        """List all unresolved Incidents."""
        pass

    @abstractmethod
    async def list_by_sector(self, sector_id: UUID) -> list[Incident]:
        """List all Incidents belonging to a specific Sector."""
        pass

    @abstractmethod
    async def list_by_assigned_volunteer(self, volunteer_id: UUID) -> list[Incident]:
        """List all Incidents assigned to a specific Volunteer."""
        pass

    @abstractmethod
    async def save(self, incident: Incident) -> Incident:
        """Save (insert or update) an Incident entity."""
        pass

    @abstractmethod
    async def delete(self, incident_id: UUID) -> None:
        """Delete an Incident by its UUID."""
        pass
