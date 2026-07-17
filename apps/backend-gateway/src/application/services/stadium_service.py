"""
StadiumOS AI — Stadium & Sector Services.

Coordinates use cases involving stadium profiles and sector boundaries.
"""

import uuid
import structlog

from src.application.ports.stadium_repository import StadiumRepository
from src.application.schemas.stadium_schemas import (
    SectorCreate,
    SectorResponse,
    StadiumCreate,
    StadiumResponse,
)
from src.domain.entities.sector import Sector
from src.domain.entities.stadium import Stadium
from src.domain.value_objects import CapacityInfo, Coordinates
from src.domain.exceptions import DuplicateEntityError, EntityNotFoundError

logger = structlog.get_logger("stadium_service")


class StadiumService:
    """
    Coordinates CRUD operations for Stadiums and Sectors.
    """

    def __init__(self, repo: StadiumRepository) -> None:
        self.repo = repo

    async def create_stadium(self, req: StadiumCreate) -> StadiumResponse:
        existing = await self.repo.get_by_name(req.name)
        if existing:
            raise DuplicateEntityError("Stadium", "name", req.name)

        new_stadium = Stadium(
            id=uuid.uuid4(),
            name=req.name,
            city=req.city,
            country=req.country,
            location=Coordinates(latitude=req.latitude, longitude=req.longitude),
            total_capacity=req.total_capacity,
            timezone=req.timezone,
        )

        saved = await self.repo.save(new_stadium)
        await logger.ainfo("stadium_created", stadium_id=str(saved.id), name=saved.name)
        
        # Return mapper model validation
        return StadiumResponse(
            id=saved.id,
            name=saved.name,
            city=saved.city,
            country=saved.country,
            latitude=saved.location.latitude,
            longitude=saved.location.longitude,
            total_capacity=saved.total_capacity,
            timezone=saved.timezone,
        )

    async def get_stadium(self, stadium_id: uuid.UUID) -> StadiumResponse:
        stadium = await self.repo.get_by_id(stadium_id)
        if not stadium:
            raise EntityNotFoundError("Stadium", str(stadium_id))

        return StadiumResponse(
            id=stadium.id,
            name=stadium.name,
            city=stadium.city,
            country=stadium.country,
            latitude=stadium.location.latitude,
            longitude=stadium.location.longitude,
            total_capacity=stadium.total_capacity,
            timezone=stadium.timezone,
        )

    async def list_stadiums(self) -> list[StadiumResponse]:
        stadiums = await self.repo.list_all()
        return [
            StadiumResponse(
                id=s.id,
                name=s.name,
                city=s.city,
                country=s.country,
                latitude=s.location.latitude,
                longitude=s.location.longitude,
                total_capacity=s.total_capacity,
                timezone=s.timezone,
            )
            for s in stadiums
        ]

    async def delete_stadium(self, stadium_id: uuid.UUID) -> None:
        stadium = await self.repo.get_by_id(stadium_id)
        if not stadium:
            raise EntityNotFoundError("Stadium", str(stadium_id))

        await self.repo.delete(stadium_id)
        await logger.ainfo("stadium_deleted", stadium_id=str(stadium_id))

    # --- Sector Actions ---

    async def create_sector(self, stadium_id: uuid.UUID, req: SectorCreate) -> SectorResponse:
        # Verify stadium exists
        stadium = await self.repo.get_by_id(stadium_id)
        if not stadium:
            raise EntityNotFoundError("Stadium", str(stadium_id))

        # Verify duplicate sector name in this stadium
        sectors = await self.repo.list_sectors_by_stadium(stadium_id)
        if any(sec.name.lower() == req.name.lower() for sec in sectors):
            raise DuplicateEntityError("Sector", "name", req.name)

        new_sector = Sector(
            id=uuid.uuid4(),
            stadium_id=stadium_id,
            name=req.name,
            capacity_info=CapacityInfo(
                max_capacity=req.max_capacity,
                warning_threshold_percent=req.warning_threshold_percent,
                critical_threshold_percent=req.critical_threshold_percent,
            ),
            centroid=Coordinates(latitude=req.centroid_latitude, longitude=req.centroid_longitude),
            is_accessible=req.is_accessible,
        )

        saved = await self.repo.save_sector(new_sector)
        await logger.ainfo("sector_created", sector_id=str(saved.id), name=saved.name, stadium_id=str(stadium_id))

        return SectorResponse(
            id=saved.id,
            stadium_id=saved.stadium_id,
            name=saved.name,
            max_capacity=saved.capacity_info.max_capacity,
            warning_threshold_percent=saved.capacity_info.warning_threshold_percent,
            critical_threshold_percent=saved.capacity_info.critical_threshold_percent,
            centroid_latitude=saved.centroid.latitude,
            centroid_longitude=saved.centroid.longitude,
            is_accessible=saved.is_accessible,
        )

    async def list_sectors(self, stadium_id: uuid.UUID) -> list[SectorResponse]:
        stadium = await self.repo.get_by_id(stadium_id)
        if not stadium:
            raise EntityNotFoundError("Stadium", str(stadium_id))

        sectors = await self.repo.list_sectors_by_stadium(stadium_id)
        return [
            SectorResponse(
                id=s.id,
                stadium_id=s.stadium_id,
                name=s.name,
                max_capacity=s.capacity_info.max_capacity,
                warning_threshold_percent=s.capacity_info.warning_threshold_percent,
                critical_threshold_percent=s.capacity_info.critical_threshold_percent,
                centroid_latitude=s.centroid.latitude,
                centroid_longitude=s.centroid.longitude,
                is_accessible=s.is_accessible,
            )
            for s in sectors
        ]

    async def delete_sector(self, sector_id: uuid.UUID) -> None:
        sector = await self.repo.get_sector_by_id(sector_id)
        if not sector:
            raise EntityNotFoundError("Sector", str(sector_id))

        await self.repo.delete_sector(sector_id)
        await logger.ainfo("sector_deleted", sector_id=str(sector_id))
