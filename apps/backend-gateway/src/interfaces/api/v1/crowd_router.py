"""
StadiumOS AI — Crowd API Router.

Exposes read-model endpoints for crowd density and gate turnstile status checks.
"""

from typing import Annotated
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.schemas.crowd_schemas import CrowdStatusResponse
from src.application.services.crowd_service import CrowdService
from src.infrastructure.database.engine import get_db_session
from src.infrastructure.repositories.gate_repository import SqlGateRepository
from src.infrastructure.repositories.stadium_repository import SqlStadiumRepository
from src.infrastructure.security.rbac import get_current_user
from src.domain.entities.user import User

router = APIRouter(prefix="/crowd", tags=["Crowd"])


def get_crowd_service(db: AsyncSession = Depends(get_db_session)) -> CrowdService:
    stadium_repo = SqlStadiumRepository(db)
    gate_repo = SqlGateRepository(db)
    return CrowdService(stadium_repo, gate_repo)


@router.get(
    "/status",
    response_model=CrowdStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Get real-time crowd and gate telemetry status",
)
async def get_crowd_status(
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[CrowdService, Depends(get_crowd_service)],
) -> CrowdStatusResponse:
    """Retrieve real-time occupancy and turnstile queue metrics. Open to all authenticated users."""
    return await service.get_crowd_status()
