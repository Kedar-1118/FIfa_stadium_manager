"""
StadiumOS AI — Authentication & Role-Based Access Control Dependencies.

FastAPI security dependencies to extract user context from JWT tokens and enforce
RBAC requirements on endpoint access.
"""

from typing import Annotated
from uuid import UUID
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.enums import UserRole
from src.domain.exceptions import AuthenticationError, AuthorizationError
from src.infrastructure.database.engine import get_db_session
from src.infrastructure.repositories.user_repository import SqlUserRepository
from src.infrastructure.security.jwt_handler import verify_token
from src.domain.entities.user import User

security_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security_scheme)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> User:
    """
    Extract the Bearer JWT token from request headers, verify it, and load
    the associated user entity.

    Raises:
        AuthenticationError: If token is missing, invalid, or expired.
    """
    if not credentials:
        raise AuthenticationError("Authorization header is missing.")

    token = credentials.credentials
    # Validates access signature and exp
    payload = verify_token(token, expected_type="access")
    
    user_id_str = payload.get("sub")
    if not user_id_str:
        raise AuthenticationError("Invalid access token structure.")

    user_repo = SqlUserRepository(db)
    user = await user_repo.get_by_id(UUID(user_id_str))
    if not user:
        raise AuthenticationError("Authenticated user account was not found.")

    if not user.is_active:
        raise AuthenticationError("Authenticated user account is deactivated.")

    return user


class RequireRole:
    """
    Dependency that restricts endpoint access to users possessing a minimum RBAC role level.

    The hierarchy is checked using User.has_permission(role).
    """

    def __init__(self, required_role: UserRole) -> None:
        self.required_role = required_role

    def __call__(self, current_user: Annotated[User, Depends(get_current_user)]) -> User:
        """
        Evaluate user permissions.

        Raises:
            AuthorizationError: If the user's role is below the required role level.
        """
        if not current_user.has_permission(self.required_role):
            raise AuthorizationError(
                required_role=self.required_role.value,
                current_role=current_user.role.value,
            )
        return current_user
