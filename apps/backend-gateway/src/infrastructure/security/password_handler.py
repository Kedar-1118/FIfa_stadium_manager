"""
StadiumOS AI — Password Hashing Utilities.

Handles secure password hashing and verification using the bcrypt algorithm.
"""

import bcrypt


def hash_password(password: str) -> str:
    """
    Hash a plaintext password using bcrypt.

    Generates a secure salt and returns the decoded string hash.

    Args:
        password: Raw password string.

    Returns:
        str: Bcrypt hash.
    """
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:
    """
    Verify a plaintext password against a stored bcrypt hash.

    Args:
        password: Raw password input.
        hashed_password: Stored bcrypt hash.

    Returns:
        bool: True if verification succeeds.
    """
    return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))
