"""
StadiumOS AI — Gate Management Services.

Coordinates use cases involving gates, including state machine status transitions,
Redis status synchronization, and telemetry update triggers.
"""

import uuid
import structlog

from src.application.ports.gate_repository import GateRepository
from src.application.ports.stadium_repository import StadiumRepository
from src.application.schemas.gate_schemas import GateCreate, GateResponse, GateStatusUpdate
from src.domain.entities.gate import Gate
from src.domain.value_objects import Coordinates
from src.domain.exceptions import DuplicateEntityError, EntityNotFoundError
from src.infrastructure.cache.cache_service import CacheService

logger = structlog.get_logger("gate_service")


class GateService:
    """
    Coordinates CRUD and state updates for gates.
    """

    def __init__(
        self,
        gate_repo: GateRepository,
        stadium_repo: StadiumRepository,
        cache_service: CacheService | None = None,
    ) -> None:
        self.gate_repo = gate_repo
        self.stadium_repo = stadium_repo
        self.cache = cache_service or CacheService()

    async def create_gate(self, sector_id: uuid.UUID, req: GateCreate) -> GateResponse:
        # Verify sector exists
        sector = await self.stadium_repo.get_sector_by_id(sector_id)
        if not sector:
            raise EntityNotFoundError("Sector", str(sector_id))

        # Check duplicate gate code
        existing = await self.gate_repo.get_by_code(req.gate_code)
        if existing:
            raise DuplicateEntityError("Gate", "gate_code", req.gate_code)

        new_gate = Gate(
            id=uuid.uuid4(),
            sector_id=sector_id,
            gate_code=req.gate_code,
            location=Coordinates(latitude=req.latitude, longitude=req.longitude),
            is_bidirectional=req.is_bidirectional,
        )

        saved = await self.gate_repo.save(new_gate)
        await logger.ainfo("gate_created", gate_id=str(saved.id), gate_code=saved.gate_code)

        # Sync initial state to Redis cache
        await self.cache.set(f"gate:{saved.id}:status", saved.status.value)

        return GateResponse(
            id=saved.id,
            sector_id=saved.sector_id,
            gate_code=saved.gate_code,
            status=saved.status,
            latitude=saved.location.latitude,
            longitude=saved.location.longitude,
            is_bidirectional=saved.is_bidirectional,
        )

    async def list_gates(self, sector_id: uuid.UUID) -> list[GateResponse]:
        sector = await self.stadium_repo.get_sector_by_id(sector_id)
        if not sector:
            raise EntityNotFoundError("Sector", str(sector_id))

        gates = await self.gate_repo.list_by_sector(sector_id)
        return [
            GateResponse(
                id=g.id,
                sector_id=g.sector_id,
                gate_code=g.gate_code,
                status=g.status,
                latitude=g.location.latitude,
                longitude=g.location.longitude,
                is_bidirectional=g.is_bidirectional,
            )
            for g in gates
        ]

    async def get_gate(self, gate_id: uuid.UUID) -> GateResponse:
        gate = await self.gate_repo.get_by_id(gate_id)
        if not gate:
            raise EntityNotFoundError("Gate", str(gate_id))

        return GateResponse(
            id=gate.id,
            sector_id=gate.sector_id,
            gate_code=gate.gate_code,
            status=gate.status,
            latitude=gate.location.latitude,
            longitude=gate.location.longitude,
            is_bidirectional=gate.is_bidirectional,
        )

    async def update_gate_status(self, gate_id: uuid.UUID, req: GateStatusUpdate) -> GateResponse:
        gate = await self.gate_repo.get_by_id(gate_id)
        if not gate:
            raise EntityNotFoundError("Gate", str(gate_id))

        old_status = gate.status
        # Transition with state machine validation
        gate.transition_to(req.status)
        
        saved = await self.gate_repo.save(gate)
        await logger.ainfo(
            "gate_status_updated",
            gate_id=str(saved.id),
            gate_code=saved.gate_code,
            old_status=old_status.value,
            new_status=saved.status.value,
        )

        # Sync state update to Redis cache (read model for Digital Twin)
        await self.cache.set(f"gate:{saved.id}:status", saved.status.value)

        # In Module 13 we will add a WebSocket broadcast trigger here to notify
        # the dashboard operators and fans immediately about the gate status change.

        return GateResponse(
            id=saved.id,
            sector_id=saved.sector_id,
            gate_code=saved.gate_code,
            status=saved.status,
            latitude=saved.location.latitude,
            longitude=saved.location.longitude,
            is_bidirectional=saved.is_bidirectional,
        )

    async def delete_gate(self, gate_id: uuid.UUID) -> None:
        gate = await self.gate_repo.get_by_id(gate_id)
        if not gate:
            raise EntityNotFoundError("Gate", str(gate_id))

        await self.gate_repo.delete(gate_id)
        await self.cache.delete(f"gate:{gate_id}:status")
        await logger.ainfo("gate_deleted", gate_id=str(gate_id))

