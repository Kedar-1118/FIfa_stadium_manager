"""
StadiumOS AI — Gate Repository Port.

Defines the abstract interface for Gate entity persistence operations.
"""

from abc import ABC, abstractmethod
from uuid import UUID

from src.domain.entities.gate import Gate


class GateRepository(ABC):
    """
    Abstract interface for managing Gate persistence.
    """

    @abstractmethod
    async def get_by_id(self, gate_id: UUID) -> Gate | None:
        """Retrieve a Gate by its UUID."""
        pass

    @abstractmethod
    async def get_by_code(self, gate_code: str) -> Gate | None:
        """Retrieve a Gate by its unique gate code."""
        pass

    @abstractmethod
    async def list_by_sector(self, sector_id: UUID) -> list[Gate]:
        """List all Gates belonging to a specific stadium sector."""
        pass

    @abstractmethod
    async def save(self, gate: Gate) -> Gate:
        """Save (insert or update) a Gate entity."""
        pass

    @abstractmethod
    async def delete(self, gate_id: UUID) -> None:
        """Delete a Gate by its UUID."""
        pass
