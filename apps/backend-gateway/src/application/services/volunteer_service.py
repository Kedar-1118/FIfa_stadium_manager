"""
StadiumOS AI — Volunteer Services.

Coordinates use cases involving volunteer profiles, active shifts status tracking,
GPS coordinates ingestion, and Redis geo-spatial matching for emergency response.
"""

import uuid
import structlog

from src.application.ports.volunteer_repository import VolunteerRepository
from src.application.ports.stadium_repository import StadiumRepository
from src.application.schemas.volunteer_schemas import (
    VolunteerLocationUpdate,
    VolunteerRegister,
    VolunteerResponse,
    VolunteerStatusUpdate,
)
from src.domain.entities.volunteer import Volunteer
from src.domain.enums import VolunteerStatus
from src.domain.value_objects import Coordinates
from src.domain.exceptions import DuplicateEntityError, EntityNotFoundError
from src.infrastructure.cache.cache_service import CacheService

logger = structlog.get_logger("volunteer_service")


class VolunteerService:
    """
    Coordinates CRUD operations and spatial searches for Volunteers.
    """

    def __init__(
        self,
        volunteer_repo: VolunteerRepository,
        stadium_repo: StadiumRepository,
        cache_service: CacheService | None = None,
    ) -> None:
        self.volunteer_repo = volunteer_repo
        self.stadium_repo = stadium_repo
        self.cache = cache_service or CacheService()
        self.geo_key = "volunteers:locations"

    async def register_volunteer(self, user_id: uuid.UUID, req: VolunteerRegister) -> VolunteerResponse:
        # Check if user already has a volunteer profile
        existing = await self.volunteer_repo.get_by_user_id(user_id)
        if existing:
            raise DuplicateEntityError("Volunteer", "user_id", str(user_id))

        # Check sector if provided
        if req.assigned_sector_id:
            sector = await self.stadium_repo.get_sector_by_id(req.assigned_sector_id)
            if not sector:
                raise EntityNotFoundError("Sector", str(req.assigned_sector_id))

        new_volunteer = Volunteer(
            id=uuid.uuid4(),
            user_id=user_id,
            name=req.name,
            phone=req.phone,
            current_location=Coordinates(latitude=req.latitude, longitude=req.longitude),
            assigned_sector_id=req.assigned_sector_id,
            status=VolunteerStatus.AVAILABLE,  # Default to available on registration
            skills=req.skills,
        )

        saved = await self.volunteer_repo.save(new_volunteer)
        await logger.ainfo("volunteer_profile_registered", volunteer_id=str(saved.id), user_id=str(user_id))

        # Add to Redis geo index
        await self.cache.geo_add(
            key=self.geo_key,
            member=str(saved.id),
            longitude=saved.current_location.longitude,
            latitude=saved.current_location.latitude,
        )

        return self._to_response(saved)

    async def update_location(self, volunteer_id: uuid.UUID, req: VolunteerLocationUpdate) -> VolunteerResponse:
        volunteer = await self.volunteer_repo.get_by_id(volunteer_id)
        if not volunteer:
            raise EntityNotFoundError("Volunteer", str(volunteer_id))

        new_coords = Coordinates(latitude=req.latitude, longitude=req.longitude)
        volunteer.update_location(new_coords)

        saved = await self.volunteer_repo.save(volunteer)
        
        # Sync to Redis geo index (only if available or assigned)
        if saved.status in {VolunteerStatus.AVAILABLE, VolunteerStatus.ASSIGNED}:
            await self.cache.geo_add(
                key=self.geo_key,
                member=str(saved.id),
                longitude=saved.current_location.longitude,
                latitude=saved.current_location.latitude,
            )
        
        return self._to_response(saved)

    async def update_status(self, volunteer_id: uuid.UUID, req: VolunteerStatusUpdate) -> VolunteerResponse:
        volunteer = await self.volunteer_repo.get_by_id(volunteer_id)
        if not volunteer:
            raise EntityNotFoundError("Volunteer", str(volunteer_id))

        from datetime import datetime

        old_status = volunteer.status
        volunteer.status = req.status
        volunteer.updated_at = datetime.utcnow()

        saved = await self.volunteer_repo.save(volunteer)
        await logger.ainfo(
            "volunteer_status_updated",
            volunteer_id=str(saved.id),
            old_status=old_status.value,
            new_status=saved.status.value,
        )

        # Sync Redis geo spatial index based on availability
        if saved.status in {VolunteerStatus.AVAILABLE, VolunteerStatus.ASSIGNED}:
            await self.cache.geo_add(
                key=self.geo_key,
                member=str(saved.id),
                longitude=saved.current_location.longitude,
                latitude=saved.current_location.latitude,
            )
        else:
            # Remove from geo index so they won't get dispatched for new incidents
            await self.cache.geo_remove(self.geo_key, str(saved.id))

        return self._to_response(saved)

    async def get_volunteer(self, volunteer_id: uuid.UUID) -> VolunteerResponse:
        v = await self.volunteer_repo.get_by_id(volunteer_id)
        if not v:
            raise EntityNotFoundError("Volunteer", str(volunteer_id))
        return self._to_response(v)

    async def list_volunteers_by_sector(self, sector_id: uuid.UUID) -> list[VolunteerResponse]:
        volunteers = await self.volunteer_repo.list_by_sector(sector_id)
        return [self._to_response(v) for v in volunteers]

    async def search_nearby_volunteers(
        self, longitude: float, latitude: float, radius_meters: float
    ) -> list[dict]:
        """
        Query Redis geo index to locate volunteers near coordinates.
        
        Returns:
            List of dict matching geo-search schema.
        """
        raw_matches = await self.cache.geo_search_radius(
            key=self.geo_key,
            longitude=longitude,
            latitude=latitude,
            radius_meters=radius_meters,
        )
        
        matches = []
        for match in raw_matches:
            v_id = uuid.UUID(match["member"])
            # Load basic profile details from DB
            v = await self.volunteer_repo.get_by_id(v_id)
            if v:
                matches.append({
                    "volunteer_id": str(v.id),
                    "name": v.name,
                    "phone": v.phone,
                    "status": v.status.value,
                    "skills": v.skills,
                    "distance_meters": match["distance_meters"],
                    "latitude": match["latitude"],
                    "longitude": match["longitude"],
                })
        return matches

    def _to_response(self, v: Volunteer) -> VolunteerResponse:
        return VolunteerResponse(
            id=v.id,
            user_id=v.user_id,
            name=v.name,
            phone=v.phone,
            status=v.status,
            latitude=v.current_location.latitude,
            longitude=v.current_location.longitude,
            assigned_sector_id=v.assigned_sector_id,
            skills=v.skills,
        )
