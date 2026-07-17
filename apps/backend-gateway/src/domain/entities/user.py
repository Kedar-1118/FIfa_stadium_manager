"""
StadiumOS AI — User Domain Entity.

Represents an authenticated system user. Users are assigned a single RBAC
role that determines their access level across the platform:
    - ADMIN: Full system control (FIFA operations team).
    - OPERATOR: Command center staff (approve AI recommendations).
    - VOLUNTEER: Field staff (report/resolve incidents).
    - FAN: Public spectators (read-only navigation and transit info).

Design Decision:
    The User entity stores only identity and authorization data. It does
    NOT store profile information (phone, bio, avatar) — that belongs in
    a separate UserProfile entity if needed. This keeps the auth-critical
    entity lean and reduces the blast radius of data leaks.
"""

from datetime import datetime
from uuid import UUID

from src.domain.enums import UserRole


class User:
    """
    An authenticated user in the StadiumOS platform.

    Attributes:
        id: Unique identifier (UUID v4).
        email: The user's email address (used as login identifier).
        hashed_password: Bcrypt-hashed password. Never stored or returned in plaintext.
        role: The user's RBAC role determining endpoint access.
        is_active: Whether the user account is active. Deactivated users
            cannot authenticate even with valid credentials.
        created_at: Timestamp of account creation (UTC).
        updated_at: Timestamp of last account modification (UTC).
    """

    __slots__ = (
        "id",
        "email",
        "hashed_password",
        "role",
        "is_active",
        "created_at",
        "updated_at",
    )

    def __init__(
        self,
        id: UUID,
        email: str,
        hashed_password: str,
        role: UserRole = UserRole.FAN,
        is_active: bool = True,
        created_at: datetime | None = None,
        updated_at: datetime | None = None,
    ) -> None:
        self.id = id
        self.email = email
        self.hashed_password = hashed_password
        self.role = role
        self.is_active = is_active
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()

    def has_permission(self, required_role: UserRole) -> bool:
        """
        Check if this user's role satisfies the required role level.

        The role hierarchy is: ADMIN > OPERATOR > VOLUNTEER > FAN.
        A user with a higher role has all permissions of lower roles.

        Args:
            required_role: The minimum role needed for the operation.

        Returns:
            True if the user's role is equal to or higher than required_role.
        """
        role_hierarchy: dict[UserRole, int] = {
            UserRole.FAN: 0,
            UserRole.VOLUNTEER: 1,
            UserRole.OPERATOR: 2,
            UserRole.ADMIN: 3,
        }
        return role_hierarchy[self.role] >= role_hierarchy[required_role]

    def deactivate(self) -> None:
        """
        Deactivate the user account.

        Deactivated users cannot authenticate. This is a soft-delete
        mechanism — the user record remains in the database for audit
        purposes but all access is revoked.
        """
        self.is_active = False
        self.updated_at = datetime.utcnow()

    def __repr__(self) -> str:
        return f"User(id={self.id}, email={self.email}, role={self.role.value})"
