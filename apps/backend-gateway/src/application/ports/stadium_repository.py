"""
StadiumOS AI — Stadium & Sector Repository Port.

Defines the abstract interface for stadium and sector database actions.
"""

from abc import ABC, abstractmethod
from uuid import UUID

from src.domain.entities.stadium import Stadium
from src.domain.entities.sector import Sector


class StadiumRepository(ABC):
    """
    Abstract interface for managing Stadium and Sector persistence.
    """

    @abstractmethod
    async def get_by_id(self, stadium_id: UUID) -> Stadium | None:
        """Retrieve a Stadium by its UUID."""
        pass

    @abstractmethod
    async def get_by_name(self, name: str) -> Stadium | None:
        """Retrieve a Stadium by its unique name."""
        pass

    @abstractmethod
    async def list_all(self) -> list[Stadium]:
        """List all registered Stadiums."""
        pass

    @abstractmethod
    async def save(self, stadium: Stadium) -> Stadium:
        """Save a Stadium entity."""
        pass

    @abstractmethod
    async def delete(self, stadium_id: UUID) -> None:
        """Delete a Stadium entity."""
        pass

    # --- Sector persistence ports ---
    @abstractmethod
    async def get_sector_by_id(self, sector_id: UUID) -> Sector | None:
        """Retrieve a Sector by its UUID."""
        pass

    @abstractmethod
    async def list_sectors_by_stadium(self, stadium_id: UUID) -> list[Sector]:
        """List all Sectors belonging to a specific Stadium."""
        pass

    @abstractmethod
    async def save_sector(self, sector: Sector) -> Sector:
        """Save a Sector entity."""
        pass

    @abstractmethod
    async def delete_sector(self, sector_id: UUID) -> None:
        """Delete a Sector entity."""
        pass
