"""
StadiumOS AI — SQLAlchemy Declarative Base & Common Mixins.

This module defines the ORM base class and reusable mixins that provide
common columns (UUID primary keys, timestamps) to all database models.

Design Decisions:
    - **UUID v4 Primary Keys**: UUIDs are used instead of auto-incrementing
      integers to support distributed ID generation. In a multi-region
      deployment (FIFA venues across 3 countries), auto-increment IDs
      would require centralized coordination. UUIDs are generated client-side
      with zero coordination.
    - **Server-Side Timestamps**: created_at and updated_at use
      server_default with PostgreSQL's now() function rather than Python's
      datetime.utcnow(). This ensures timestamps are consistent even if
      application servers have clock drift.
    - **Mapped Column Typing**: SQLAlchemy 2.0's Mapped[] type annotations
      are used to provide full mypy/IDE type safety on ORM models.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """
    SQLAlchemy declarative base for all ORM models.

    All ORM models in the infrastructure layer inherit from this base.
    It provides the metadata registry and mapping configuration that
    SQLAlchemy uses to generate DDL and manage the ORM identity map.
    """

    pass


class UUIDMixin:
    """
    Mixin providing a UUID v4 primary key column.

    Every table in StadiumOS uses a UUID primary key to support
    distributed ID generation across multi-region deployments.
    The default is generated in Python (not the database) to allow
    the application to know the ID before the INSERT round-trip.
    """

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        doc="Unique identifier (UUID v4) for this record.",
    )


class TimestampMixin:
    """
    Mixin providing created_at and updated_at timestamp columns.

    Timestamps use PostgreSQL's server-side now() function via
    server_default to ensure consistency regardless of application
    server clock accuracy.

    The updated_at column uses onupdate=func.now() to automatically
    refresh on every UPDATE statement without manual intervention.
    """

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        doc="Timestamp of record creation (server-side UTC).",
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        doc="Timestamp of last modification (auto-updated on every write).",
    )
