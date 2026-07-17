"""
StadiumOS AI — Incident API Router.

Exposes REST endpoints for incident reporting, dispatching, and resolution workflows.
Includes RBAC validation checks.
"""

from typing import Annotated
from uuid import UUID
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.schemas.incident_schemas import (
    IncidentAssign,
    IncidentReport,
    IncidentResolve,
    IncidentResponse,
)
from src.application.services.incident_service import IncidentService
from src.domain.entities.user import User
from src.domain.enums import UserRole
from src.infrastructure.database.engine import get_db_session
from src.infrastructure.repositories.incident_repository import SqlIncidentRepository
from src.infrastructure.repositories.stadium_repository import SqlStadiumRepository
from src.infrastructure.repositories.volunteer_repository import SqlVolunteerRepository
from src.infrastructure.security.rbac import RequireRole, get_current_user
from src.interfaces.middleware.rate_limiter import limiter

router = APIRouter(prefix="/incidents", tags=["Incidents"])

require_operator = RequireRole(UserRole.OPERATOR)
require_volunteer = RequireRole(UserRole.VOLUNTEER)


def get_incident_service(db: AsyncSession = Depends(get_db_session)) -> IncidentService:
    i_repo = SqlIncidentRepository(db)
    s_repo = SqlStadiumRepository(db)
    v_repo = SqlVolunteerRepository(db)
    return IncidentService(i_repo, s_repo, v_repo)


@router.post(
    "",
    response_model=IncidentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Report a new stadium incident",
)
@limiter.limit("10/minute")
async def report_incident(
    req: IncidentReport,
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[IncidentService, Depends(get_incident_service)],
) -> IncidentResponse:
    """Report a new incident event (medical, security, facilities). Open to all authenticated users."""
    return await service.report_incident(current_user.id, req)


@router.get(
    "/active",
    response_model=list[IncidentResponse],
    status_code=status.HTTP_200_OK,
    summary="List all unresolved active incidents",
    dependencies=[Depends(require_operator)],
)
async def list_active_incidents(
    service: Annotated[IncidentService, Depends(get_incident_service)],
) -> list[IncidentResponse]:
    """List all open/active incidents. Restricted to Operators/Admins."""
    return await service.list_active_incidents()


@router.get(
    "/{incident_id}",
    response_model=IncidentResponse,
    status_code=status.HTTP_200_OK,
    summary="Get incident details by ID",
)
async def get_incident(
    incident_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[IncidentService, Depends(get_incident_service)],
) -> IncidentResponse:
    """Retrieve detailed information about an incident by UUID."""
    return await service.get_incident(incident_id)


@router.post(
    "/{incident_id}/assign",
    response_model=IncidentResponse,
    status_code=status.HTTP_200_OK,
    summary="Assign a volunteer to an incident",
    dependencies=[Depends(require_operator)],
)
async def assign_volunteer(
    incident_id: UUID,
    req: IncidentAssign,
    service: Annotated[IncidentService, Depends(get_incident_service)],
) -> IncidentResponse:
    """Dispatch/assign a volunteer to respond to an incident. Restricted to Operators/Admins."""
    return await service.assign_volunteer(incident_id, req.volunteer_id)


@router.post(
    "/{incident_id}/resolve",
    response_model=IncidentResponse,
    status_code=status.HTTP_200_OK,
    summary="Resolve a stadium incident",
    dependencies=[Depends(require_volunteer)],
)
async def resolve_incident(
    incident_id: UUID,
    req: IncidentResolve,
    service: Annotated[IncidentService, Depends(get_incident_service)],
) -> IncidentResponse:
    """Mark an incident as resolved with notes. Open to Volunteers, Operators, or Admins."""
    return await service.resolve_incident(incident_id, req)


@router.get(
    "/sector/{sector_id}",
    response_model=list[IncidentResponse],
    status_code=status.HTTP_200_OK,
    summary="List all incidents in a sector",
    dependencies=[Depends(require_operator)],
)
async def list_by_sector(
    sector_id: UUID,
    service: Annotated[IncidentService, Depends(get_incident_service)],
) -> list[IncidentResponse]:
    """List all incidents occurring in a specific sector. Restricted to Operators/Admins."""
    return await service.list_incidents_by_sector(sector_id)
