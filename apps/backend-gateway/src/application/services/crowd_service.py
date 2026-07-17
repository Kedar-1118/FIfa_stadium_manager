"""
StadiumOS AI — Crowd Services.

Coordinates use cases involving crowd telemetry aggregation, fetching metrics from
the active Redis twin cache, and providing structured read models.
"""

from datetime import datetime, timezone
import structlog

from src.application.ports.gate_repository import GateRepository
from src.application.ports.stadium_repository import StadiumRepository
from src.application.schemas.crowd_schemas import CrowdStatusResponse, GateStatusTelemetry
from src.infrastructure.cache.cache_service import CacheService

logger = structlog.get_logger("crowd_service")


class CrowdService:
    """
    Coordinates read-model queries for crowd and gate telemetry.
    """

    def __init__(
        self,
        stadium_repo: StadiumRepository,
        gate_repo: GateRepository,
        cache_service: CacheService | None = None,
    ) -> None:
        self.stadium_repo = stadium_repo
        self.gate_repo = gate_repo
        self.cache = cache_service or CacheService()

    async def get_crowd_status(self) -> CrowdStatusResponse:
        """
        Synthesize the active crowd state from Redis cache keys and database profiles.
        """
        # Fetch occupancy from Redis cache (fallback to 0.0)
        occupancy_raw = await self.cache.get("stadium:occupancy:percent")
        occupancy = float(occupancy_raw) if occupancy_raw else 0.0

        # Load all stadiums to list gates (or fetch directly)
        stadiums = await self.stadium_repo.list_all()
        
        telemetry_gates = []
        for stadium in stadiums:
            sectors = await self.stadium_repo.list_sectors_by_stadium(stadium.id)
            for sector in sectors:
                gates = await self.gate_repo.list_by_sector(sector.id)
                for gate in gates:
                    # Query Redis cache for real-time turnstile telemetry
                    status_raw = await self.cache.get(f"gate:{gate.id}:status")
                    status = status_raw if status_raw else gate.status.value

                    flow_raw = await self.cache.get(f"gate:{gate.id}:flow_rate")
                    flow_rate = int(flow_raw) if flow_raw else 0

                    wait_raw = await self.cache.get(f"gate:{gate.id}:wait_time")
                    wait_time = int(wait_raw) if wait_raw else 0

                    alarms_raw = await self.cache.get_json(f"gate:{gate.id}:alarms")
                    alarms = alarms_raw if isinstance(alarms_raw, list) else []

                    telemetry_gates.append(
                        GateStatusTelemetry(
                            gate_id=gate.id,
                            gate_code=gate.gate_code,
                            status=status,
                            current_flow_rate_per_min=flow_rate,
                            average_wait_time_seconds=wait_time,
                            active_alarms=alarms,
                        )
                    )

        return CrowdStatusResponse(
            timestamp=datetime.now(timezone.utc),
            overall_occupancy_percent=occupancy,
            gates=telemetry_gates,
        )
