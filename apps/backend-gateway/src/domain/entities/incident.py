"""
StadiumOS AI — Incident Domain Entity.

Represents a reported event requiring operational response during a
FIFA World Cup 2026 match. Incidents are the core domain object that
drives the multi-agent system — every incident triggers the Security &
Medical Agent to evaluate severity, find the nearest volunteer, and
recommend a response action.

Incident Types:
    - MEDICAL: Spectator health emergencies (heat exhaustion, injuries).
    - SECURITY: Unauthorized access, altercations, suspicious packages.
    - FACILITY: Infrastructure issues (broken seats, plumbing, power).
    - CROWD_CONGESTION: Automated alerts from CCTV/turnstile analytics.

Lifecycle:
    REPORTED → ACKNOWLEDGED → IN_PROGRESS → RESOLVED
                                            → ESCALATED (branch)
"""

from datetime import datetime
from uuid import UUID

from src.domain.enums import IncidentSeverity, IncidentStatus
from src.domain.exceptions import InvalidStateTransitionError
from src.domain.value_objects import Coordinates


# Valid incident status transitions.
# This state machine ensures incidents follow a controlled lifecycle.
_VALID_INCIDENT_TRANSITIONS: dict[IncidentStatus, set[IncidentStatus]] = {
    IncidentStatus.REPORTED: {IncidentStatus.ACKNOWLEDGED, IncidentStatus.ESCALATED},
    IncidentStatus.ACKNOWLEDGED: {IncidentStatus.IN_PROGRESS, IncidentStatus.ESCALATED},
    IncidentStatus.IN_PROGRESS: {IncidentStatus.RESOLVED, IncidentStatus.ESCALATED},
    IncidentStatus.RESOLVED: set(),  # Terminal state — no further transitions
    IncidentStatus.ESCALATED: {IncidentStatus.IN_PROGRESS, IncidentStatus.RESOLVED},
}


class Incident:
    """
    A reported event requiring operational response in a stadium.

    Attributes:
        id: Unique identifier (UUID v4).
        incident_type: Category of the incident (medical, security, etc.).
        severity: Urgency level determining escalation paths.
        status: Current lifecycle status.
        description: Free-text description of the incident.
        location: Geographic coordinates where the incident was reported.
        gate_id: The nearest gate to the incident location (optional).
        sector_id: The sector where the incident occurred.
        reported_by_user_id: UUID of the user who reported the incident.
        assigned_volunteer_id: UUID of the volunteer handling the incident (if assigned).
        ai_recommendation: The AI agent's recommended response action.
        resolution_notes: Notes added by the volunteer upon resolving the incident.
        created_at: Timestamp of incident creation (UTC).
        updated_at: Timestamp of last status change (UTC).
        resolved_at: Timestamp of resolution (UTC, None if unresolved).
    """

    __slots__ = (
        "id",
        "incident_type",
        "severity",
        "status",
        "description",
        "location",
        "gate_id",
        "sector_id",
        "reported_by_user_id",
        "assigned_volunteer_id",
        "ai_recommendation",
        "resolution_notes",
        "created_at",
        "updated_at",
        "resolved_at",
    )

    def __init__(
        self,
        id: UUID,
        incident_type: str,
        severity: IncidentSeverity,
        description: str,
        location: Coordinates,
        sector_id: UUID,
        reported_by_user_id: UUID,
        gate_id: UUID | None = None,
        status: IncidentStatus = IncidentStatus.REPORTED,
        assigned_volunteer_id: UUID | None = None,
        ai_recommendation: str | None = None,
        resolution_notes: str | None = None,
        created_at: datetime | None = None,
        updated_at: datetime | None = None,
        resolved_at: datetime | None = None,
    ) -> None:
        if not description.strip():
            raise ValueError("Incident description cannot be empty.")

        self.id = id
        self.incident_type = incident_type
        self.severity = severity
        self.status = status
        self.description = description.strip()
        self.location = location
        self.gate_id = gate_id
        self.sector_id = sector_id
        self.reported_by_user_id = reported_by_user_id
        self.assigned_volunteer_id = assigned_volunteer_id
        self.ai_recommendation = ai_recommendation
        self.resolution_notes = resolution_notes
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()
        self.resolved_at = resolved_at

    def transition_to(self, new_status: IncidentStatus) -> None:
        """
        Transition the incident to a new lifecycle status.

        Enforces the incident state machine defined in
        _VALID_INCIDENT_TRANSITIONS. Invalid transitions raise
        InvalidStateTransitionError.

        Args:
            new_status: The target incident status.

        Raises:
            InvalidStateTransitionError: If the transition is not allowed.
        """
        if new_status == self.status:
            return  # No-op: already in the desired state

        valid_next_states = _VALID_INCIDENT_TRANSITIONS.get(self.status, set())
        if new_status not in valid_next_states:
            raise InvalidStateTransitionError(
                entity_name="Incident",
                current_state=self.status.value,
                requested_state=new_status.value,
            )

        self.status = new_status
        self.updated_at = datetime.utcnow()

        # Record resolution timestamp when transitioning to terminal state
        if new_status == IncidentStatus.RESOLVED:
            self.resolved_at = datetime.utcnow()

    def assign_volunteer(self, volunteer_id: UUID) -> None:
        """
        Assign a volunteer to handle this incident.

        Automatically transitions the incident to ACKNOWLEDGED status
        if it was in REPORTED status.

        Args:
            volunteer_id: UUID of the volunteer being assigned.
        """
        self.assigned_volunteer_id = volunteer_id
        if self.status == IncidentStatus.REPORTED:
            self.transition_to(IncidentStatus.ACKNOWLEDGED)
        self.updated_at = datetime.utcnow()

    def resolve(self, notes: str) -> None:
        """
        Resolve the incident with resolution notes.

        Args:
            notes: Description of how the incident was resolved.

        Raises:
            InvalidStateTransitionError: If the incident cannot be resolved
                from its current state.
        """
        self.resolution_notes = notes.strip()
        self.transition_to(IncidentStatus.RESOLVED)

    def escalate(self) -> None:
        """
        Escalate the incident to a higher authority.

        Escalation is used when the assigned volunteer or operator
        determines the incident exceeds their capability (e.g., a
        medical emergency requiring paramedics rather than first aid).

        Raises:
            InvalidStateTransitionError: If escalation is not valid
                from the current state.
        """
        self.transition_to(IncidentStatus.ESCALATED)

    @property
    def is_active(self) -> bool:
        """Check if the incident is still open (not resolved)."""
        return self.status not in {IncidentStatus.RESOLVED}

    @property
    def requires_immediate_response(self) -> bool:
        """Check if the incident severity demands immediate action."""
        return self.severity in {IncidentSeverity.HIGH, IncidentSeverity.CRITICAL}

    def __repr__(self) -> str:
        return (
            f"Incident(id={self.id}, type='{self.incident_type}', "
            f"severity={self.severity.value}, status={self.status.value})"
        )
