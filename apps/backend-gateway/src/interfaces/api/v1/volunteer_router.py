"""
StadiumOS AI — Volunteer API Router.

Exposes REST endpoints for volunteer registration, coordinates synchronization,
status transitions, and geo-spatial searching.
"""

from typing import Annotated
from uuid import UUID
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.schemas.volunteer_schemas import (
    VolunteerLocationUpdate,
    VolunteerRegister,
    VolunteerResponse,
    VolunteerStatusUpdate,
)
from src.application.services.volunteer_service import VolunteerService
from src.domain.entities.user import User
from src.domain.enums import UserRole
from src.domain.exceptions import AuthenticationError
from src.infrastructure.database.engine import get_db_session
from src.infrastructure.repositories.stadium_repository import SqlStadiumRepository
from src.infrastructure.repositories.volunteer_repository import SqlVolunteerRepository
from src.infrastructure.security.rbac import RequireRole, get_current_user
from src.interfaces.middleware.rate_limiter import limiter

router = APIRouter(prefix="/volunteers", tags=["Volunteers"])

require_operator = RequireRole(UserRole.OPERATOR)
require_volunteer = RequireRole(UserRole.VOLUNTEER)


def get_volunteer_service(db: AsyncSession = Depends(get_db_session)) -> VolunteerService:
    v_repo = SqlVolunteerRepository(db)
    stadium_repo = SqlStadiumRepository(db)
    return VolunteerService(v_repo, stadium_repo)


@router.post(
    "/register",
    response_model=VolunteerResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register as a volunteer",
    dependencies=[Depends(require_volunteer)],
)
@limiter.limit("5/minute")
async def register_volunteer(
    req: VolunteerRegister,
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[VolunteerService, Depends(get_volunteer_service)],
) -> VolunteerResponse:
    """Create a volunteer profile linked to the authenticated user account."""
    return await service.register_volunteer(current_user.id, req)


@router.patch(
    "/location",
    response_model=VolunteerResponse,
    status_code=status.HTTP_200_OK,
    summary="Sync GPS coordinates",
    dependencies=[Depends(require_volunteer)],
)
@limiter.limit("60/minute")
async def update_location(
    req: VolunteerLocationUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[VolunteerService, Depends(get_volunteer_service)],
    db: AsyncSession = Depends(get_db_session),
) -> VolunteerResponse:
    """Update volunteer's GPS coordinates. Ingested from mobile client."""
    v_repo = SqlVolunteerRepository(db)
    volunteer = await v_repo.get_by_user_id(current_user.id)
    if not volunteer:
        raise AuthenticationError("No volunteer profile linked to this user account.")
        
    return await service.update_location(volunteer.id, req)


@router.patch(
    "/status",
    response_model=VolunteerResponse,
    status_code=status.HTTP_200_OK,
    summary="Update availability status",
    dependencies=[Depends(require_volunteer)],
)
async def update_status(
    req: VolunteerStatusUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[VolunteerService, Depends(get_volunteer_service)],
    db: AsyncSession = Depends(get_db_session),
) -> VolunteerResponse:
    """Update volunteer's operational shift status (e.g. available, on break)."""
    v_repo = SqlVolunteerRepository(db)
    volunteer = await v_repo.get_by_user_id(current_user.id)
    if not volunteer:
        raise AuthenticationError("No volunteer profile linked to this user account.")

    return await service.update_status(volunteer.id, req)


@router.get(
    "/search/nearby",
    response_model=list[dict],
    status_code=status.HTTP_200_OK,
    summary="Search for volunteers in radius",
    dependencies=[Depends(require_operator)],
)
async def search_nearby(
    longitude: float = Query(..., ge=-180.0, le=180.0),
    latitude: float = Query(..., ge=-90.0, le=90.0),
    radius_meters: float = Query(..., gt=0.0, le=50000.0),
    service: Annotated[VolunteerService, Depends(get_volunteer_service)],
) -> list[dict]:
    """
    Search for available volunteers within a specified radius (in meters).
    
    Restricted to Operators/Admins.
    """
    return await service.search_nearby_volunteers(longitude, latitude, radius_meters)


@router.get(
    "/sector/{sector_id}",
    response_model=list[VolunteerResponse],
    status_code=status.HTTP_200_OK,
    summary="List volunteers in a sector",
    dependencies=[Depends(require_operator)],
)
async def list_by_sector(
    sector_id: UUID,
    service: Annotated[VolunteerService, Depends(get_volunteer_service)],
) -> list[VolunteerResponse]:
    """Retrieve all volunteers currently assigned to a sector."""
    return await service.list_volunteers_by_sector(sector_id)


@router.get(
    "/{volunteer_id}",
    response_model=VolunteerResponse,
    status_code=status.HTTP_200_OK,
    summary="Get volunteer profile details",
)
async def get_volunteer(
    volunteer_id: UUID,
    service: Annotated[VolunteerService, Depends(get_volunteer_service)],
) -> VolunteerResponse:
    """Get volunteer profile info by UUID."""
    return await service.get_volunteer(volunteer_id)

