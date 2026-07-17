"""
StadiumOS AI — User Repository Adapter.

Implements the UserRepository port using SQLAlchemy async sessions.
"""

from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.ports.user_repository import UserRepository
from src.domain.entities.user import User
from src.infrastructure.database.models.user_model import UserModel


class SqlUserRepository(UserRepository):
    """
    SQLAlchemy implementation of the UserRepository interface.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    def _to_domain(self, model: UserModel) -> User:
        """Map ORM model to domain entity."""
        return User(
            id=model.id,
            email=model.email,
            hashed_password=model.hashed_password,
            role=model.role,
            is_active=model.is_active,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    async def get_by_id(self, user_id: UUID) -> User | None:
        stmt = select(UserModel).where(UserModel.id == user_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_domain(model) if model else None

    async def get_by_email(self, email: str) -> User | None:
        stmt = select(UserModel).where(UserModel.email == email.lower().strip())
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_domain(model) if model else None

    async def save(self, user: User) -> User:
        # Check if the user already exists in the database
        stmt = select(UserModel).where(UserModel.id == user.id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if model:
            # Update existing record values
            model.email = user.email.lower().strip()
            model.hashed_password = user.hashed_password
            model.role = user.role
            model.is_active = user.is_active
            model.updated_at = user.updated_at
        else:
            # Create a new record
            model = UserModel(
                id=user.id,
                email=user.email.lower().strip(),
                hashed_password=user.hashed_password,
                role=user.role,
                is_active=user.is_active,
                created_at=user.created_at,
                updated_at=user.updated_at,
            )
            self.session.add(model)

        await self.session.flush()  # Save changes to DB without committing transaction yet
        return self._to_domain(model)

    async def delete(self, user_id: UUID) -> None:
        stmt = select(UserModel).where(UserModel.id == user_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        if model:
            await self.session.delete(model)
            await self.session.flush()
        return None

