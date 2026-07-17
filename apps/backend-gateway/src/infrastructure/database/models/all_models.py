"""
StadiumOS AI — Unified ORM Imports.

This module imports all ORM models to ensure they are registered with the
SQLAlchemy Declarative Base metadata. Alembic imports this module in its
env.py to auto-generate migrations accurately.
"""

from src.infrastructure.database.base import Base
from src.infrastructure.database.models.gate_model import GateModel
from src.infrastructure.database.models.incident_model import IncidentModel
from src.infrastructure.database.models.sector_model import SectorModel
from src.infrastructure.database.models.stadium_model import StadiumModel
from src.infrastructure.database.models.user_model import UserModel
from src.infrastructure.database.models.volunteer_model import VolunteerModel

__all__ = [
    "Base",
    "UserModel",
    "StadiumModel",
    "SectorModel",
    "GateModel",
    "VolunteerModel",
    "IncidentModel",
]
