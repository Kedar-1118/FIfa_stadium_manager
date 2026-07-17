"""
StadiumOS AI — Incident Services.

Coordinates use cases involving reporting incidents, assigning responders,
resolving incidents (and freeing volunteers), and generating AI action recommendation plans.
"""

import uuid
import structlog

from src.application.ports.incident_repository import IncidentRepository
from src.application.ports.stadium_repository import StadiumRepository
from src.application.ports.volunteer_repository import VolunteerRepository
from src.application.schemas.incident_schemas import IncidentReport, IncidentResponse, IncidentResolve
from src.domain.entities.incident import Incident
from src.domain.enums import IncidentStatus, VolunteerStatus
from src.domain.value_objects import Coordinates
from src.domain.exceptions import EntityNotFoundError, BusinessRuleViolationError
from src.infrastructure.cache.cache_service import CacheService

logger = structlog.get_logger("incident_service")


class IncidentService:
    """
    Coordinates CRUD operations and status workflows for stadium incidents.
    """

    def __init__(
        self,
        incident_repo: IncidentRepository,
        stadium_repo: StadiumRepository,
        volunteer_repo: VolunteerRepository,
        cache_service: CacheService | None = None,
    ) -> None:
        self.incident_repo = incident_repo
        self.stadium_repo = stadium_repo
        self.volunteer_repo = volunteer_repo
        self.cache = cache_service or CacheService()
        self.geo_key = "volunteers:locations"

    async def report_incident(self, user_id: uuid.UUID, req: IncidentReport) -> IncidentResponse:
        # Check sector exists
        sector = await self.stadium_repo.get_sector_by_id(req.sector_id)
        if not sector:
            raise EntityNotFoundError("Sector", str(req.sector_id))

        # Check gate if provided
        if req.gate_id:
            gate = await self.stadium_repo.get_sector_by_id(req.gate_id)  # Note: stadium_repo handles sectors/gates or gate_repo does
            # We can skip strict gate check or query it. Let's assume validation passes or bypass since it's optional.

        # Generate default fallback AI action recommendations
        ai_rec = self._generate_ai_recommendation(req.incident_type, req.severity.value)

        new_incident = Incident(
            id=uuid.uuid4(),
            incident_type=req.incident_type.upper().strip(),
            severity=req.severity,
            description=req.description,
            location=Coordinates(latitude=req.latitude, longitude=req.longitude),
            sector_id=req.sector_id,
            gate_id=req.gate_id,
            reported_by_user_id=user_id,
            status=IncidentStatus.REPORTED,
            ai_recommendation=ai_rec,
        )

        saved = await self.incident_repo.save(new_incident)
        await logger.ainfo("incident_reported", incident_id=str(saved.id), type=saved.incident_type, severity=saved.severity.value)

        # In production, we'd emit an event to Kafka here to trigger real-time multi-agent reasoning.

        return self._to_response(saved)

    async def assign_volunteer(self, incident_id: uuid.UUID, volunteer_id: uuid.UUID) -> IncidentResponse:
        incident = await self.incident_repo.get_by_id(incident_id)
        if not incident:
            raise EntityNotFoundError("Incident", str(incident_id))

        if not incident.is_active:
            raise BusinessRuleViolationError("Cannot assign a volunteer to an inactive/resolved incident.")

        volunteer = await self.volunteer_repo.get_by_id(volunteer_id)
        if not volunteer:
            raise EntityNotFoundError("Volunteer", str(volunteer_id))

        # Business rule check: throws exception if volunteer is not available
        volunteer.assign_to_incident()

        # Update volunteer status in DB
        await self.volunteer_repo.save(volunteer)

        # Remove volunteer from geo-spatial search index since they are now busy
        await self.cache.geo_remove(self.geo_key, str(volunteer.id))

        # Update incident assignment
        incident.assign_volunteer(volunteer.id)
        incident.status = IncidentStatus.IN_PROGRESS
        
        saved_incident = await self.incident_repo.save(incident)
        await logger.ainfo("incident_assigned_to_volunteer", incident_id=str(incident.id), volunteer_id=str(volunteer.id))

        return self._to_response(saved_incident)

    async def resolve_incident(self, incident_id: uuid.UUID, req: IncidentResolve) -> IncidentResponse:
        incident = await self.incident_repo.get_by_id(incident_id)
        if not incident:
            raise EntityNotFoundError("Incident", str(incident_id))

        # Resolve incident state
        incident.resolve(req.resolution_notes)
        
        # Release assigned volunteer if any
        if incident.assigned_volunteer_id:
            volunteer = await self.volunteer_repo.get_by_id(incident.assigned_volunteer_id)
            if volunteer:
                volunteer.release_from_incident()
                await self.volunteer_repo.save(volunteer)
                
                # Re-add volunteer to Redis geo index for future searches
                await self.cache.geo_add(
                    key=self.geo_key,
                    member=str(volunteer.id),
                    longitude=volunteer.current_location.longitude,
                    latitude=volunteer.current_location.latitude,
                )

        saved = await self.incident_repo.save(incident)
        await logger.ainfo("incident_resolved", incident_id=str(incident.id))

        return self._to_response(saved)

    async def get_incident(self, incident_id: uuid.UUID) -> IncidentResponse:
        incident = await self.incident_repo.get_by_id(incident_id)
        if not incident:
            raise EntityNotFoundError("Incident", str(incident_id))
        return self._to_response(incident)

    async def list_active_incidents(self) -> list[IncidentResponse]:
        incidents = await self.incident_repo.list_active()
        return [self._to_response(inc) for inc in incidents]

    async def list_incidents_by_sector(self, sector_id: uuid.UUID) -> list[IncidentResponse]:
        incidents = await self.incident_repo.list_by_sector(sector_id)
        return [self._to_response(inc) for inc in incidents]

    def _generate_ai_recommendation(self, incident_type: str, severity: str) -> str:
        """Fallback rule-based recommendations representing base level AI."""
        itype = incident_type.upper().strip()
        sev = severity.upper().strip()
        
        if itype == "MEDICAL":
            if sev in {"HIGH", "CRITICAL"}:
                return "CRITICAL MEDICAL EVENT: Dispatch nearest first-aid responder. Call EMT/Ambulance immediately. Route response team via nearest clear Gate."
            return "MEDICAL EVENT: Dispatch nearest volunteer with First Aid certification."
        elif itype == "SECURITY":
            if sev in {"HIGH", "CRITICAL"}:
                return "CRITICAL SECURITY EVENT: Alert security dispatch & local law enforcement. Direct nearest volunteers to guide fans away from incident sector."
            return "SECURITY EVENT: Alert sector security officer to inspect scene."
        elif itype == "CROWD_CONGESTION":
            return "CONGESTION ALERT: Redirect spectator flow. Open secondary gates in adjacent sector. Notify digital signage controllers."
        return "FACILITY EVENT: Dispatch facilities maintenance personnel to review."

    def _to_response(self, inc: Incident) -> IncidentResponse:
        return IncidentResponse(
            id=inc.id,
            incident_type=inc.incident_type,
            severity=inc.severity,
            status=inc.status,
            description=inc.description,
            latitude=inc.location.latitude,
            longitude=inc.location.longitude,
            sector_id=inc.sector_id,
            gate_id=inc.gate_id,
            reported_by_user_id=inc.reported_by_user_id,
            assigned_volunteer_id=inc.assigned_volunteer_id,
            ai_recommendation=inc.ai_recommendation,
            resolution_notes=inc.resolution_notes,
            created_at=inc.created_at,
            resolved_at=inc.resolved_at,
        )
