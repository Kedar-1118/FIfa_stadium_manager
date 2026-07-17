"""
StadiumOS AI — Authentication Service.

Coordinates user authentication, registrations, password matching, and JWT creation.
"""

import uuid
import structlog

from src.application.ports.user_repository import UserRepository
from src.application.schemas.auth_schemas import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from src.domain.entities.user import User
from src.domain.exceptions import AuthenticationError, DuplicateEntityError
from src.infrastructure.security.jwt_handler import (
    create_access_token,
    create_refresh_token,
    verify_token,
)
from src.infrastructure.security.password_handler import hash_password, verify_password

logger = structlog.get_logger("auth_service")


class AuthService:
    """
    Orchestrates authentication use cases.
    """

    def __init__(self, user_repo: UserRepository) -> None:
        self.user_repo = user_repo

    async def register(self, req: RegisterRequest) -> UserResponse:
        """
        Register a new user in the system.

        Raises:
            DuplicateEntityError: If email is already registered.
        """
        existing = await self.user_repo.get_by_email(req.email)
        if existing:
            raise DuplicateEntityError(entity_name="User", field="email", value=req.email)

        hashed = hash_password(req.password)
        new_user = User(
            id=uuid.uuid4(),
            email=req.email.lower().strip(),
            hashed_password=hashed,
            role=req.role,
            is_active=True,
        )

        saved_user = await self.user_repo.save(new_user)
        await logger.ainfo("user_registered", user_id=str(saved_user.id), role=saved_user.role.value)

        return UserResponse.model_validate(saved_user)

    async def login(self, req: LoginRequest) -> TokenResponse:
        """
        Authenticate user credentials and issue token pair.

        Raises:
            AuthenticationError: On wrong credentials or inactive user.
        """
        user = await self.user_repo.get_by_email(req.email)
        if not user:
            raise AuthenticationError("Invalid email or password.")

        if not user.is_active:
            raise AuthenticationError("User account is deactivated.")

        if not verify_password(req.password, user.hashed_password):
            raise AuthenticationError("Invalid email or password.")

        # Generate tokens
        access = create_access_token(user_id=str(user.id), role=user.role.value)
        refresh = create_refresh_token(user_id=str(user.id))

        await logger.ainfo("user_logged_in", user_id=str(user.id))

        return TokenResponse(
            access_token=access,
            refresh_token=refresh,
            token_type="bearer",
            user=UserResponse.model_validate(user),
        )

    async def refresh_tokens(self, refresh_token: str) -> TokenResponse:
        """
        Refresh credentials using a long-lived refresh token.

        Raises:
            AuthenticationError: On expired/malformed refresh token or inactive user.
        """
        # Validates token type and expiry
        payload = verify_token(refresh_token, expected_type="refresh")
        user_id_str = payload.get("sub")
        if not user_id_str:
            raise AuthenticationError("Invalid refresh token claims.")

        user = await self.user_repo.get_by_id(uuid.UUID(user_id_str))
        if not user or not user.is_active:
            raise AuthenticationError("Associated user account is deactivated or missing.")

        # Generate fresh tokens
        access = create_access_token(user_id=str(user.id), role=user.role.value)
        new_refresh = create_refresh_token(user_id=str(user.id))

        await logger.ainfo("tokens_refreshed", user_id=str(user.id))

        return TokenResponse(
            access_token=access,
            refresh_token=new_refresh,
            token_type="bearer",
            user=UserResponse.model_validate(user),
        )
