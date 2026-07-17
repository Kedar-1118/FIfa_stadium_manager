"""
StadiumOS AI — Volunteer Repository Adapter.

SQLAlchemy implementation of the VolunteerRepository port.
"""

from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.ports.volunteer_repository import VolunteerRepository
from src.domain.entities.volunteer import Volunteer
from src.domain.enums import VolunteerStatus
from src.domain.value_objects import Coordinates
from src.infrastructure.database.models.volunteer_model import VolunteerModel


class SqlVolunteerRepository(VolunteerRepository):
    """
    SQLAlchemy implementation of the VolunteerRepository interface.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    def _to_domain(self, model: VolunteerModel) -> Volunteer:
        """Map ORM model to domain entity."""
        return Volunteer(
            id=model.id,
            user_id=model.user_id,
            name=model.name,
            phone=model.phone,
            current_location=Coordinates(latitude=model.latitude, longitude=model.longitude),
            assigned_sector_id=model.assigned_sector_id,
            status=model.status,
            skills=model.skills,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    async def get_by_id(self, volunteer_id: UUID) -> Volunteer | None:
        stmt = select(VolunteerModel).where(VolunteerModel.id == volunteer_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_domain(model) if model else None

    async def get_by_user_id(self, user_id: UUID) -> Volunteer | None:
        stmt = select(VolunteerModel).where(VolunteerModel.user_id == user_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_domain(model) if model else None

    async def list_by_sector(self, sector_id: UUID) -> list[Volunteer]:
        stmt = select(VolunteerModel).where(VolunteerModel.assigned_sector_id == sector_id).order_by(VolunteerModel.name)
        result = await self.session.execute(stmt)
        return [self._to_domain(m) for m in result.scalars().all()]

    async def list_available_by_sector(self, sector_id: UUID) -> list[Volunteer]:
        stmt = select(VolunteerModel).where(
            VolunteerModel.assigned_sector_id == sector_id,
            VolunteerModel.status == VolunteerStatus.AVAILABLE,
        ).order_by(VolunteerModel.name)
        result = await self.session.execute(stmt)
        return [self._to_domain(m) for m in result.scalars().all()]

    async def save(self, volunteer: Volunteer) -> Volunteer:
        stmt = select(VolunteerModel).where(VolunteerModel.id == volunteer.id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if model:
            model.user_id = volunteer.user_id
            model.name = volunteer.name
            model.phone = volunteer.phone
            model.status = volunteer.status
            model.latitude = volunteer.current_location.latitude
            model.longitude = volunteer.current_location.longitude
            model.assigned_sector_id = volunteer.assigned_sector_id
            model.skills = volunteer.skills
            model.updated_at = volunteer.updated_at
        else:
            model = VolunteerModel(
                id=volunteer.id,
                user_id=volunteer.user_id,
                name=volunteer.name,
                phone=volunteer.phone,
                status=volunteer.status,
                latitude=volunteer.current_location.latitude,
                longitude=volunteer.current_location.longitude,
                assigned_sector_id=volunteer.assigned_sector_id,
                skills=volunteer.skills,
                created_at=volunteer.created_at,
                updated_at=volunteer.updated_at,
            )
            self.session.add(model)

        await self.session.flush()
        return self._to_domain(model)

    async def delete(self, volunteer_id: UUID) -> None:
        stmt = select(VolunteerModel).where(VolunteerModel.id == volunteer_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        if model:
            await self.session.delete(model)
            await self.session.flush()
