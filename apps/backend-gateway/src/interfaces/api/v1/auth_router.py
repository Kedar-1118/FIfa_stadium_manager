"""
StadiumOS AI — Authentication Routing Handlers.

Exposes public and protected endpoints for registering accounts, logging in,
refreshing JWTs, and fetching current session profile.
"""

from typing import Annotated
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.schemas.auth_schemas import (
    LoginRequest,
    RefreshTokenRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from src.application.services.auth_service import AuthService
from src.domain.entities.user import User
from src.infrastructure.database.engine import get_db_session
from src.infrastructure.repositories.user_repository import SqlUserRepository
from src.infrastructure.security.rbac import get_current_user
from src.interfaces.middleware.rate_limiter import limiter

router = APIRouter(prefix="/auth", tags=["Auth"])


def get_auth_service(db: AsyncSession = Depends(get_db_session)) -> AuthService:
    """Dependency provider injecting the AuthService initialized with UserRepository."""
    user_repo = SqlUserRepository(db)
    return AuthService(user_repo)


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
@limiter.limit("10/minute")
async def register(
    req: RegisterRequest,
    service: Annotated[AuthService, Depends(get_auth_service)],
) -> UserResponse:
    """
    Create a new user credentials record.
    
    Defaults to 'fan' access level.
    """
    return await service.register(req)


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Authenticate credentials and issue JWT pair",
)
@limiter.limit("20/minute")
async def login(
    req: LoginRequest,
    service: Annotated[AuthService, Depends(get_auth_service)],
) -> TokenResponse:
    """Validate credentials and returns access_token + refresh_token."""
    return await service.login(req)


@router.post(
    "/refresh",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Refresh active session token pairs",
)
@limiter.limit("30/minute")
async def refresh(
    req: RefreshTokenRequest,
    service: Annotated[AuthService, Depends(get_auth_service)],
) -> TokenResponse:
    """Exchange a valid refresh token for a new set of token credentials."""
    return await service.refresh_tokens(req.refresh_token)


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Fetch current session profile info",
)
async def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
) -> UserResponse:
    """Retrieve logged-in user identity payload details."""
    return UserResponse.model_validate(current_user)
