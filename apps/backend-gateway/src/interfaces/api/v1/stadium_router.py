"""
StadiumOS AI — Stadium & Sector API Router.

Exposes REST endpoints for managing stadiums and sectors.
Supports RBAC permissions checks (Admin only for modifications).
"""

from typing import Annotated
from uuid import UUID
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.schemas.stadium_schemas import (
    SectorCreate,
    SectorResponse,
    StadiumCreate,
    StadiumResponse,
)
from src.application.services.stadium_service import StadiumService
from src.domain.enums import UserRole
from src.infrastructure.database.engine import get_db_session
from src.infrastructure.repositories.stadium_repository import SqlStadiumRepository
from src.infrastructure.security.rbac import RequireRole
from src.interfaces.middleware.rate_limiter import limiter

router = APIRouter(prefix="/stadiums", tags=["Stadiums"])

# RBAC dependencies
require_admin = RequireRole(UserRole.ADMIN)
require_operator = RequireRole(UserRole.OPERATOR)


def get_stadium_service(db: AsyncSession = Depends(get_db_session)) -> StadiumService:
    repo = SqlStadiumRepository(db)
    return StadiumService(repo)


@router.post(
    "",
    response_model=StadiumResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new stadium",
    dependencies=[Depends(require_admin)],
)
@limiter.limit("10/minute")
async def create_stadium(
    req: StadiumCreate,
    service: Annotated[StadiumService, Depends(get_stadium_service)],
) -> StadiumResponse:
    """Create a new stadium venue. Restricted to Admins."""
    return await service.create_stadium(req)


@router.get(
    "",
    response_model=list[StadiumResponse],
    status_code=status.HTTP_200_OK,
    summary="List all stadiums",
)
async def list_stadiums(
    service: Annotated[StadiumService, Depends(get_stadium_service)],
) -> list[StadiumResponse]:
    """Retrieve all registered stadiums. Publicly readable."""
    return await service.list_stadiums()


@router.get(
    "/{stadium_id}",
    response_model=StadiumResponse,
    status_code=status.HTTP_200_OK,
    summary="Get stadium details by ID",
)
async def get_stadium(
    stadium_id: UUID,
    service: Annotated[StadiumService, Depends(get_stadium_service)],
) -> StadiumResponse:
    """Retrieve detailed metadata for a stadium by UUID."""
    return await service.get_stadium(stadium_id)


@router.delete(
    "/{stadium_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a stadium",
    dependencies=[Depends(require_admin)],
)
async def delete_stadium(
    stadium_id: UUID,
    service: Annotated[StadiumService, Depends(get_stadium_service)],
) -> None:
    """Delete a stadium and its child sectors. Restricted to Admins."""
    await service.delete_stadium(stadium_id)


# --- Sector Routes ---

@router.post(
    "/{stadium_id}/sectors",
    response_model=SectorResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a sector within a stadium",
    dependencies=[Depends(require_admin)],
)
@limiter.limit("15/minute")
async def create_sector(
    stadium_id: UUID,
    req: SectorCreate,
    service: Annotated[StadiumService, Depends(get_stadium_service)],
) -> SectorResponse:
    """Create a sector inside a stadium. Restricted to Admins."""
    return await service.create_sector(stadium_id, req)


@router.get(
    "/{stadium_id}/sectors",
    response_model=list[SectorResponse],
    status_code=status.HTTP_200_OK,
    summary="List all sectors within a stadium",
)
async def list_sectors(
    stadium_id: UUID,
    service: Annotated[StadiumService, Depends(get_stadium_service)],
) -> list[SectorResponse]:
    """List sectors mapped inside a specific stadium."""
    return await service.list_sectors(stadium_id)


@router.delete(
    "/sectors/{sector_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a sector",
    dependencies=[Depends(require_admin)],
)
async def delete_sector(
    sector_id: UUID,
    service: Annotated[StadiumService, Depends(get_stadium_service)],
) -> None:
    """Delete a stadium sector. Restricted to Admins."""
    await service.delete_sector(sector_id)
