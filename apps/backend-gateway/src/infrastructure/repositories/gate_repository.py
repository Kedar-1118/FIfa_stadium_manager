"""
StadiumOS AI — Gate Repository Adapter.

SQLAlchemy implementation of the GateRepository port.
"""

from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.ports.gate_repository import GateRepository
from src.domain.entities.gate import Gate
from src.domain.value_objects import Coordinates
from src.infrastructure.database.models.gate_model import GateModel


class SqlGateRepository(GateRepository):
    """
    SQLAlchemy implementation of the GateRepository interface.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    def _to_domain(self, model: GateModel) -> Gate:
        """Map ORM model to domain entity."""
        return Gate(
            id=model.id,
            sector_id=model.sector_id,
            gate_code=model.gate_code,
            location=Coordinates(latitude=model.latitude, longitude=model.longitude),
            status=model.status,
            is_bidirectional=model.is_bidirectional,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    async def get_by_id(self, gate_id: UUID) -> Gate | None:
        stmt = select(GateModel).where(GateModel.id == gate_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_domain(model) if model else None

    async def get_by_code(self, gate_code: str) -> Gate | None:
        stmt = select(GateModel).where(GateModel.gate_code == gate_code.upper().strip())
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_domain(model) if model else None

    async def list_by_sector(self, sector_id: UUID) -> list[Gate]:
        stmt = select(GateModel).where(GateModel.sector_id == sector_id).order_by(GateModel.gate_code)
        result = await self.session.execute(stmt)
        return [self._to_domain(m) for m in result.scalars().all()]

    async def save(self, gate: Gate) -> Gate:
        stmt = select(GateModel).where(GateModel.id == gate.id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if model:
            model.sector_id = gate.sector_id
            model.gate_code = gate.gate_code
            model.status = gate.status
            model.latitude = gate.location.latitude
            model.longitude = gate.location.longitude
            model.is_bidirectional = gate.is_bidirectional
            model.updated_at = gate.updated_at
        else:
            model = GateModel(
                id=gate.id,
                sector_id=gate.sector_id,
                gate_code=gate.gate_code,
                status=gate.status,
                latitude=gate.location.latitude,
                longitude=gate.location.longitude,
                is_bidirectional=gate.is_bidirectional,
                created_at=gate.created_at,
                updated_at=gate.updated_at,
            )
            self.session.add(model)

        await self.session.flush()
        return self._to_domain(model)

    async def delete(self, gate_id: UUID) -> None:
        stmt = select(GateModel).where(GateModel.id == gate_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        if model:
            await self.session.delete(model)
            await self.session.flush()
