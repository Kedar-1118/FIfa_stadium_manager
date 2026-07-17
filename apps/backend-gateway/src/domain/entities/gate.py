"""
StadiumOS AI — Gate Domain Entity.

Represents a physical entry/exit point within a stadium sector. Gates are
the primary unit for crowd flow measurement — turnstile sensors report
ingress/egress rates per gate, which the Digital Twin aggregates to compute
sector-level occupancy.

The Transport & Gate Agent recommends opening, closing, or restricting gates
based on real-time flow analysis. All gate status changes require operator
approval via the human-in-the-loop workflow.
"""

from datetime import datetime
from uuid import UUID

from src.domain.enums import GateStatus
from src.domain.exceptions import InvalidStateTransitionError
from src.domain.value_objects import Coordinates


# Valid gate status transitions.
# This is a domain business rule — gates cannot jump between arbitrary states.
# For example, a gate in MAINTENANCE cannot go directly to CONGESTED.
_VALID_GATE_TRANSITIONS: dict[GateStatus, set[GateStatus]] = {
    GateStatus.OPEN: {GateStatus.CLOSED, GateStatus.RESTRICTED, GateStatus.CONGESTED, GateStatus.MAINTENANCE},
    GateStatus.CLOSED: {GateStatus.OPEN, GateStatus.MAINTENANCE},
    GateStatus.RESTRICTED: {GateStatus.OPEN, GateStatus.CLOSED},
    GateStatus.CONGESTED: {GateStatus.OPEN, GateStatus.RESTRICTED, GateStatus.CLOSED},
    GateStatus.MAINTENANCE: {GateStatus.CLOSED, GateStatus.OPEN},
}


class Gate:
    """
    A physical entry/exit point within a stadium sector.

    Attributes:
        id: Unique identifier (UUID v4).
        sector_id: Foreign key linking to the parent Sector.
        gate_code: Human-readable gate identifier (e.g., "GATE_3A").
        status: Current operational status of the gate.
        location: Geographic coordinates of the gate for spatial queries.
        is_bidirectional: Whether the gate supports both entry and exit.
            Unidirectional gates are common for VIP/media areas.
        created_at: Timestamp of record creation (UTC).
        updated_at: Timestamp of last modification (UTC).
    """

    __slots__ = (
        "id",
        "sector_id",
        "gate_code",
        "status",
        "location",
        "is_bidirectional",
        "created_at",
        "updated_at",
    )

    def __init__(
        self,
        id: UUID,
        sector_id: UUID,
        gate_code: str,
        location: Coordinates,
        status: GateStatus = GateStatus.CLOSED,
        is_bidirectional: bool = True,
        created_at: datetime | None = None,
        updated_at: datetime | None = None,
    ) -> None:
        if not gate_code.strip():
            raise ValueError("Gate code cannot be empty.")

        self.id = id
        self.sector_id = sector_id
        self.gate_code = gate_code.strip().upper()
        self.status = status
        self.location = location
        self.is_bidirectional = is_bidirectional
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()

    def transition_to(self, new_status: GateStatus) -> None:
        """
        Transition the gate to a new operational status.

        This method enforces the gate state machine defined in
        _VALID_GATE_TRANSITIONS. Invalid transitions raise an
        InvalidStateTransitionError that the interfaces layer
        translates to HTTP 409.

        Args:
            new_status: The target gate status.

        Raises:
            InvalidStateTransitionError: If the transition is not allowed
                by the gate state machine.
        """
        if new_status == self.status:
            return  # No-op: already in the desired state

        valid_next_states = _VALID_GATE_TRANSITIONS.get(self.status, set())
        if new_status not in valid_next_states:
            raise InvalidStateTransitionError(
                entity_name="Gate",
                current_state=self.status.value,
                requested_state=new_status.value,
            )

        self.status = new_status
        self.updated_at = datetime.utcnow()

    @property
    def is_operational(self) -> bool:
        """Check if the gate is currently allowing any traffic flow."""
        return self.status in {GateStatus.OPEN, GateStatus.RESTRICTED, GateStatus.CONGESTED}

    def __repr__(self) -> str:
        return (
            f"Gate(id={self.id}, code='{self.gate_code}', "
            f"status={self.status.value})"
        )
