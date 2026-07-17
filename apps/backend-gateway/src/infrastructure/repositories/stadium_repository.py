"""
StadiumOS AI — Stadium & Sector Repository Adapter.

SQLAlchemy implementation of the StadiumRepository port.
"""

from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.ports.stadium_repository import StadiumRepository
from src.domain.entities.sector import Sector
from src.domain.entities.stadium import Stadium
from src.domain.value_objects import CapacityInfo, Coordinates
from src.infrastructure.database.models.sector_model import SectorModel
from src.infrastructure.database.models.stadium_model import StadiumModel


class SqlStadiumRepository(StadiumRepository):
    """
    SQLAlchemy implementation of the StadiumRepository interface.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    def _stadium_to_domain(self, model: StadiumModel) -> Stadium:
        """Map Stadium ORM model to domain entity."""
        return Stadium(
            id=model.id,
            name=model.name,
            city=model.city,
            country=model.country,
            location=Coordinates(latitude=model.latitude, longitude=model.longitude),
            total_capacity=model.total_capacity,
            timezone=model.timezone,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    def _sector_to_domain(self, model: SectorModel) -> Sector:
        """Map Sector ORM model to domain entity."""
        return Sector(
            id=model.id,
            stadium_id=model.stadium_id,
            name=model.name,
            capacity_info=CapacityInfo(
                max_capacity=model.max_capacity,
                warning_threshold_percent=model.warning_threshold_percent,
                critical_threshold_percent=model.critical_threshold_percent,
            ),
            centroid=Coordinates(latitude=model.centroid_latitude, longitude=model.centroid_longitude),
            is_accessible=model.is_accessible,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    # --- Stadium Actions ---

    async def get_by_id(self, stadium_id: UUID) -> Stadium | None:
        stmt = select(StadiumModel).where(StadiumModel.id == stadium_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._stadium_to_domain(model) if model else None

    async def get_by_name(self, name: str) -> Stadium | None:
        stmt = select(StadiumModel).where(StadiumModel.name == name.strip())
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._stadium_to_domain(model) if model else None

    async def list_all(self) -> list[Stadium]:
        stmt = select(StadiumModel).order_by(StadiumModel.name)
        result = await self.session.execute(stmt)
        return [self._stadium_to_domain(m) for m in result.scalars().all()]

    async def save(self, stadium: Stadium) -> Stadium:
        stmt = select(StadiumModel).where(StadiumModel.id == stadium.id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if model:
            model.name = stadium.name
            model.city = stadium.city
            model.country = stadium.country
            model.latitude = stadium.location.latitude
            model.longitude = stadium.location.longitude
            model.total_capacity = stadium.total_capacity
            model.timezone = stadium.timezone
            model.updated_at = stadium.updated_at
        else:
            model = StadiumModel(
                id=stadium.id,
                name=stadium.name,
                city=stadium.city,
                country=stadium.country,
                latitude=stadium.location.latitude,
                longitude=stadium.location.longitude,
                total_capacity=stadium.total_capacity,
                timezone=stadium.timezone,
                created_at=stadium.created_at,
                updated_at=stadium.updated_at,
            )
            self.session.add(model)

        await self.session.flush()
        return self._stadium_to_domain(model)

    async def delete(self, stadium_id: UUID) -> None:
        stmt = select(StadiumModel).where(StadiumModel.id == stadium_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        if model:
            await self.session.delete(model)
            await self.session.flush()

    # --- Sector Actions ---

    async def get_sector_by_id(self, sector_id: UUID) -> Sector | None:
        stmt = select(SectorModel).where(SectorModel.id == sector_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._sector_to_domain(model) if model else None

    async def list_sectors_by_stadium(self, stadium_id: UUID) -> list[Sector]:
        stmt = select(SectorModel).where(SectorModel.stadium_id == stadium_id).order_by(SectorModel.name)
        result = await self.session.execute(stmt)
        return [self._sector_to_domain(m) for m in result.scalars().all()]

    async def save_sector(self, sector: Sector) -> Sector:
        stmt = select(SectorModel).where(SectorModel.id == sector.id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if model:
            model.name = sector.name
            model.max_capacity = sector.capacity_info.max_capacity
            model.warning_threshold_percent = sector.capacity_info.warning_threshold_percent
            model.critical_threshold_percent = sector.capacity_info.critical_threshold_percent
            model.centroid_latitude = sector.centroid.latitude
            model.centroid_longitude = sector.centroid.longitude
            model.is_accessible = sector.is_accessible
            model.updated_at = sector.updated_at
        else:
            model = SectorModel(
                id=sector.id,
                stadium_id=sector.stadium_id,
                name=sector.name,
                max_capacity=sector.capacity_info.max_capacity,
                warning_threshold_percent=sector.capacity_info.warning_threshold_percent,
                critical_threshold_percent=sector.capacity_info.critical_threshold_percent,
                centroid_latitude=sector.centroid.latitude,
                centroid_longitude=sector.centroid.longitude,
                is_accessible=sector.is_accessible,
                created_at=sector.created_at,
                updated_at=sector.updated_at,
            )
            self.session.add(model)

        await self.session.flush()
        return self._sector_to_domain(model)

    async def delete_sector(self, sector_id: UUID) -> None:
        stmt = select(SectorModel).where(SectorModel.id == sector_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        if model:
            await self.session.delete(model)
            await self.session.flush()
