"""
StadiumOS AI — Incident Repository Adapter.

SQLAlchemy implementation of the IncidentRepository port.
"""

from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.ports.incident_repository import IncidentRepository
from src.domain.entities.incident import Incident
from src.domain.value_objects import Coordinates
from src.infrastructure.database.models.incident_model import IncidentModel


class SqlIncidentRepository(IncidentRepository):
    """
    SQLAlchemy implementation of the IncidentRepository interface.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    def _to_domain(self, model: IncidentModel) -> Incident:
        """Map ORM model to domain entity."""
        return Incident(
            id=model.id,
            incident_type=model.incident_type,
            severity=model.severity,
            status=model.status,
            description=model.description,
            location=Coordinates(latitude=model.latitude, longitude=model.longitude),
            sector_id=model.sector_id,
            gate_id=model.gate_id,
            reported_by_user_id=model.reported_by_user_id,
            assigned_volunteer_id=model.assigned_volunteer_id,
            ai_recommendation=model.ai_recommendation,
            resolution_notes=model.resolution_notes,
            created_at=model.created_at,
            updated_at=model.updated_at,
            resolved_at=model.resolved_at,
        )

    async def get_by_id(self, incident_id: UUID) -> Incident | None:
        stmt = select(IncidentModel).where(IncidentModel.id == incident_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_domain(model) if model else None

    async def list_active(self) -> list[Incident]:
        stmt = select(IncidentModel).where(IncidentModel.resolved_at.is_(None)).order_by(IncidentModel.created_at.desc())
        result = await self.session.execute(stmt)
        return [self._to_domain(m) for m in result.scalars().all()]

    async def list_by_sector(self, sector_id: UUID) -> list[Incident]:
        stmt = select(IncidentModel).where(IncidentModel.sector_id == sector_id).order_by(IncidentModel.created_at.desc())
        result = await self.session.execute(stmt)
        return [self._to_domain(m) for m in result.scalars().all()]

    async def list_by_assigned_volunteer(self, volunteer_id: UUID) -> list[Incident]:
        stmt = select(IncidentModel).where(IncidentModel.assigned_volunteer_id == volunteer_id).order_by(IncidentModel.created_at.desc())
        result = await self.session.execute(stmt)
        return [self._to_domain(m) for m in result.scalars().all()]

    async def save(self, incident: Incident) -> Incident:
        stmt = select(IncidentModel).where(IncidentModel.id == incident.id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if model:
            model.incident_type = incident.incident_type
            model.severity = incident.severity
            model.status = incident.status
            model.description = incident.description
            model.latitude = incident.location.latitude
            model.longitude = incident.location.longitude
            model.sector_id = incident.sector_id
            model.gate_id = incident.gate_id
            model.reported_by_user_id = incident.reported_by_user_id
            model.assigned_volunteer_id = incident.assigned_volunteer_id
            model.ai_recommendation = incident.ai_recommendation
            model.resolution_notes = incident.resolution_notes
            model.updated_at = incident.updated_at
            model.resolved_at = incident.resolved_at
        else:
            model = IncidentModel(
                id=incident.id,
                incident_type=incident.incident_type,
                severity=incident.severity,
                status=incident.status,
                description=incident.description,
                latitude=incident.location.latitude,
                longitude=incident.location.longitude,
                sector_id=incident.sector_id,
                gate_id=incident.gate_id,
                reported_by_user_id=incident.reported_by_user_id,
                assigned_volunteer_id=incident.assigned_volunteer_id,
                ai_recommendation=incident.ai_recommendation,
                resolution_notes=incident.resolution_notes,
                created_at=incident.created_at,
                updated_at=incident.updated_at,
                resolved_at=incident.resolved_at,
            )
            self.session.add(model)

        await self.session.flush()
        return self._to_domain(model)

    async def delete(self, incident_id: UUID) -> None:
        stmt = select(IncidentModel).where(IncidentModel.id == incident_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        if model:
            await self.session.delete(model)
            await self.session.flush()
