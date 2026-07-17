"""
StadiumOS AI — JWT Token Manager.

Creates and verifies JSON Web Tokens for authentication.
"""

from datetime import datetime, timedelta, timezone
from typing import Any
from jose import JWTError, jwt
import structlog

from src.config import get_settings
from src.domain.exceptions import AuthenticationError

logger = structlog.get_logger("jwt_handler")
settings = get_settings()


def create_access_token(user_id: str, role: str) -> str:
    """
    Generate a short-lived JWT access token.

    Args:
        user_id: Unique user identifier (UUID string).
        role: RBAC role of the user (e.g. 'operator').

    Returns:
        str: Encoded JWT string.
    """
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_access_token_expire_minutes)
    payload = {
        "sub": user_id,
        "role": role,
        "type": "access",
        "exp": expire,
    }
    encoded_jwt = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return encoded_jwt


def create_refresh_token(user_id: str) -> str:
    """
    Generate a long-lived JWT refresh token.

    Args:
        user_id: Unique user identifier (UUID string).

    Returns:
        str: Encoded JWT string.
    """
    expire = datetime.now(timezone.utc) + timedelta(days=settings.jwt_refresh_token_expire_days)
    payload = {
        "sub": user_id,
        "type": "refresh",
        "exp": expire,
    }
    encoded_jwt = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return encoded_jwt


def verify_token(token: str, expected_type: str = "access") -> dict[str, Any]:
    """
    Decode and validate a JWT token.

    Enforces expiration check, signature check, and token type validation.

    Args:
        token: Raw token string.
        expected_type: Expected 'type' claim ('access' or 'refresh').

    Returns:
        dict: Decoded claims payload.

    Raises:
        AuthenticationError: If signature check fails, type mismatches, or token has expired.
    """
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        
        # Verify token type (access vs refresh)
        token_type = payload.get("type")
        if token_type != expected_type:
            raise AuthenticationError("Invalid token type mapping.")
            
        return payload
    except JWTError as e:
        logger.warn("token_verification_failed", error=str(e))
        raise AuthenticationError("Invalid or expired authentication token.")
