"""
StadiumOS AI — Volunteer Repository Port.

Defines the abstract interface for Volunteer entity database actions.
"""

from abc import ABC, abstractmethod
from uuid import UUID

from src.domain.entities.volunteer import Volunteer


class VolunteerRepository(ABC):
    """
    Abstract interface for managing Volunteer persistence.
    """

    @abstractmethod
    async def get_by_id(self, volunteer_id: UUID) -> Volunteer | None:
        """Retrieve a Volunteer by their UUID."""
        pass

    @abstractmethod
    async def get_by_user_id(self, user_id: UUID) -> Volunteer | None:
        """Retrieve a Volunteer by their associated User UUID."""
        pass

    @abstractmethod
    async def list_by_sector(self, sector_id: UUID) -> list[Volunteer]:
        """List all Volunteers assigned to a specific stadium sector."""
        pass

    @abstractmethod
    async def list_available_by_sector(self, sector_id: UUID) -> list[Volunteer]:
        """List all AVAILABLE Volunteers in a specific stadium sector."""
        pass

    @abstractmethod
    async def save(self, volunteer: Volunteer) -> Volunteer:
        """Save (insert or update) a Volunteer entity."""
        pass

    @abstractmethod
    async def delete(self, volunteer_id: UUID) -> None:
        """Delete a Volunteer by their UUID."""
        pass
