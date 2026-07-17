"""
StadiumOS AI — Agent Recommendations API Router.

Exposes REST endpoints for operators to review, approve, or reject recommendations.
Enforces Operator RBAC guards.
"""

from typing import Annotated
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.schemas.agent_schemas import (
    RecommendationApproveRequest,
    RecommendationRejectRequest,
    RecommendationResponse,
)
from src.application.services.agent_service import AgentService
from src.application.services.gate_service import GateService
from src.domain.enums import UserRole
from src.infrastructure.database.engine import get_db_session
from src.infrastructure.repositories.gate_repository import SqlGateRepository
from src.infrastructure.repositories.stadium_repository import SqlStadiumRepository
from src.infrastructure.security.rbac import RequireRole
from src.interfaces.middleware.rate_limiter import limiter

router = APIRouter(prefix="/agents", tags=["Agents"])

require_operator = RequireRole(UserRole.OPERATOR)


def get_agent_service(db: AsyncSession = Depends(get_db_session)) -> AgentService:
    gate_repo = SqlGateRepository(db)
    stadium_repo = SqlStadiumRepository(db)
    gate_service = GateService(gate_repo, stadium_repo)
    return AgentService(gate_service)


@router.get(
    "/recommendations",
    response_model=list[RecommendationResponse],
    status_code=status.HTTP_200_OK,
    summary="List pending AI recommendations",
    dependencies=[Depends(require_operator)],
)
async def list_pending_recommendations(
    service: Annotated[AgentService, Depends(get_agent_service)],
) -> list[RecommendationResponse]:
    """Retrieve all pending recommendations from the AI agent mesh. Restricted to Operators/Admins."""
    return await service.list_pending_recommendations()


@router.post(
    "/recommendations/{rec_id}/approve",
    response_model=RecommendationResponse,
    status_code=status.HTTP_200_OK,
    summary="Approve and execute recommendation",
    dependencies=[Depends(require_operator)],
)
@limiter.limit("15/minute")
async def approve_recommendation(
    rec_id: str,
    req: RecommendationApproveRequest,
    service: Annotated[AgentService, Depends(get_agent_service)],
) -> RecommendationResponse:
    """Approve a recommendation, triggering automatic state updates. Restricted to Operators/Admins."""
    return await service.approve_recommendation(rec_id, req)


@router.post(
    "/recommendations/{rec_id}/reject",
    response_model=RecommendationResponse,
    status_code=status.HTTP_200_OK,
    summary="Reject recommendation",
    dependencies=[Depends(require_operator)],
)
async def reject_recommendation(
    rec_id: str,
    req: RecommendationRejectRequest,
    service: Annotated[AgentService, Depends(get_agent_service)],
) -> RecommendationResponse:
    """Reject a recommendation with documented feedback. Restricted to Operators/Admins."""
    return await service.reject_recommendation(rec_id, req)

