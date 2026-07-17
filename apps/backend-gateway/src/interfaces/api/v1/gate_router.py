"""
StadiumOS AI — Gate API Router.

Exposes REST endpoints for managing gates and updating gate statuses.
Includes RBAC validation policies.
"""

from typing import Annotated
from uuid import UUID
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.schemas.gate_schemas import GateCreate, GateResponse, GateStatusUpdate
from src.application.services.gate_service import GateService
from src.domain.enums import UserRole
from src.infrastructure.database.engine import get_db_session
from src.infrastructure.repositories.gate_repository import SqlGateRepository
from src.infrastructure.repositories.stadium_repository import SqlStadiumRepository
from src.infrastructure.security.rbac import RequireRole
from src.interfaces.middleware.rate_limiter import limiter

router = APIRouter(tags=["Gates"])

require_admin = RequireRole(UserRole.ADMIN)
require_operator = RequireRole(UserRole.OPERATOR)


def get_gate_service(db: AsyncSession = Depends(get_db_session)) -> GateService:
    gate_repo = SqlGateRepository(db)
    stadium_repo = SqlStadiumRepository(db)
    return GateService(gate_repo, stadium_repo)


@router.post(
    "/stadiums/sectors/{sector_id}/gates",
    response_model=GateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new gate inside a sector",
    dependencies=[Depends(require_admin)],
)
@limiter.limit("15/minute")
async def create_gate(
    sector_id: UUID,
    req: GateCreate,
    service: Annotated[GateService, Depends(get_gate_service)],
) -> GateResponse:
    """Create a new sector gate. Restricted to Admins."""
    return await service.create_gate(sector_id, req)


@router.get(
    "/stadiums/sectors/{sector_id}/gates",
    response_model=list[GateResponse],
    status_code=status.HTTP_200_OK,
    summary="List all gates in a sector",
)
async def list_gates(
    sector_id: UUID,
    service: Annotated[GateService, Depends(get_gate_service)],
) -> list[GateResponse]:
    """Retrieve all gates belonging to a specific sector."""
    return await service.list_gates(sector_id)


@router.get(
    "/gates/{gate_id}",
    response_model=GateResponse,
    status_code=status.HTTP_200_OK,
    summary="Get gate details by ID",
)
async def get_gate(
    gate_id: UUID,
    service: Annotated[GateService, Depends(get_gate_service)],
) -> GateResponse:
    """Retrieve detailed metadata for a gate by UUID."""
    return await service.get_gate(gate_id)


@router.patch(
    "/gates/{gate_id}/status",
    response_model=GateResponse,
    status_code=status.HTTP_200_OK,
    summary="Update gate operational status",
    dependencies=[Depends(require_operator)],
)
@limiter.limit("30/minute")
async def update_gate_status(
    gate_id: UUID,
    req: GateStatusUpdate,
    service: Annotated[GateService, Depends(get_gate_service)],
) -> GateResponse:
    """
    Transition gate operational status (OPEN, CLOSED, etc.).
    
    Enforces state machine logic. Restricted to Operators or Admins.
    """
    return await service.update_gate_status(gate_id, req)


@router.delete(
    "/gates/{gate_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a gate",
    dependencies=[Depends(require_admin)],
)
async def delete_gate(
    gate_id: UUID,
    service: Annotated[GateService, Depends(get_gate_service)],
) -> None:
    """Delete a gate by ID. Restricted to Admins."""
    await service.delete_gate(gate_id)
