"""
StadiumOS AI — Agent Recommendations Pydantic Schemas.

Validation and serialization DTO schemas for multi-agent recommendation reviews.
"""

from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field

from src.domain.enums import RecommendationStatus


class RecommendationApproveRequest(BaseModel):
    """Payload to approve a pending recommendation."""

    operator_comments: str = Field(..., min_length=2, description="Comments or reasons for approval.")
    override_parameters: dict = Field(default_factory=dict, description="Custom parameters overriding defaults.")


class RecommendationRejectRequest(BaseModel):
    """Payload to reject a pending recommendation."""

    operator_comments: str = Field(..., min_length=5, description="Required justification comments for rejection.")


class RecommendationResponse(BaseModel):
    """Details representing an active AI recommendation."""

    id: str = Field(..., description="Unique recommendation ID (UUID or generated key).")
    agent_name: str = Field(..., description="The generating Agent name (e.g. 'Crowd Dynamics Agent').")
    action_type: str = Field(..., description="Action target operation (e.g. 'OPEN_GATE', 'REROUTE_CROWD').")
    description: str = Field(..., description="Detailed text explaining the reasoning and action.")
    status: RecommendationStatus = Field(..., description="Workflow status (PENDING, APPROVED, REJECTED, EXECUTED, EXPIRED).")
    target_entity_id: UUID = Field(..., description="Affected target ID reference.")
    created_at: datetime
