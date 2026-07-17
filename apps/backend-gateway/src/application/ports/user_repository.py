"""
StadiumOS AI — User Repository Port.

Defines the abstract interface for user database actions. In Clean Architecture,
application services interact with this abstract interface rather than database-specific mappers.
"""

from abc import ABC, abstractmethod
from uuid import UUID

from src.domain.entities.user import User


class UserRepository(ABC):
    """
    Abstract interface for managing User persistence.
    """

    @abstractmethod
    async def get_by_id(self, user_id: UUID) -> User | None:
        """Retrieve a User by their unique identifier (UUID)."""
        pass

    @abstractmethod
    async def get_by_email(self, email: str) -> User | None:
        """Retrieve a User by their unique email address."""
        pass

    @abstractmethod
    async def save(self, user: User) -> User:
        """Save (insert or update) a User entity in the persistent store."""
        pass

    @abstractmethod
    async def delete(self, user_id: UUID) -> None:
        """Permanently delete a User from persistence."""
        pass

