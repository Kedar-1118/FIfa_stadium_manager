"""
StadiumOS AI — User ORM Model.

Maps the User domain entity to the 'users' PostgreSQL table.
Handles email uniqueness constraints and role storage.
"""

import uuid

from sqlalchemy import Boolean, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.domain.enums import UserRole
from src.infrastructure.database.base import Base, TimestampMixin, UUIDMixin


class UserModel(Base, UUIDMixin, TimestampMixin):
    """
    SQLAlchemy ORM model for the 'users' table.

    Columns:
        id: UUID v4 primary key.
        email: Unique email address used as login identifier.
        hashed_password: Bcrypt hash of the user's password.
        role: RBAC role (admin, operator, volunteer, fan).
        is_active: Whether the account is active (soft-delete flag).
    """

    __tablename__ = "users"

    email: Mapped[str] = mapped_column(
        String(320),  # RFC 5321 max email length
        unique=True,
        nullable=False,
        index=True,
        doc="User's email address. Must be unique across the system.",
    )
    hashed_password: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
        doc="Bcrypt-hashed password. Never exposed in API responses.",
    )
    role: Mapped[UserRole] = mapped_column(
        SAEnum(UserRole, name="user_role", create_constraint=True),
        nullable=False,
        default=UserRole.FAN,
        doc="RBAC role determining endpoint access permissions.",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        doc="Account status. Inactive accounts cannot authenticate.",
    )

    # --- Relationships ---
    # A user may be linked to a volunteer profile (1:1 optional)
    volunteer: Mapped["VolunteerModel | None"] = relationship(
        "VolunteerModel",
        back_populates="user",
        uselist=False,
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<UserModel(id={self.id}, email='{self.email}', role='{self.role.value}')>"
