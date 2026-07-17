"""
StadiumOS AI — Domain Exceptions.

Custom exception hierarchy for domain-level error handling. These exceptions
are raised by domain entities and application services, then caught by the
global exception handler middleware in the interfaces layer and translated
into appropriate HTTP error responses.

Design Decisions:
    - All domain exceptions inherit from StadiumOSError, a single base class.
      This allows the global exception handler to catch all domain errors
      with a single except clause while preserving specific error types
      for targeted handling.
    - Each exception carries a machine-readable 'error_code' string that
      is included in API responses. Frontend clients can match on this code
      to display localized error messages without parsing human-readable text.
    - HTTP status codes are NOT defined here (that would violate Clean
      Architecture — the domain layer must not know about HTTP). Status
      code mapping is handled in the interfaces layer's error handler.
"""


class StadiumOSError(Exception):
    """
    Base exception for all StadiumOS domain errors.

    All custom exceptions in the domain layer inherit from this class,
    providing a consistent interface for error handling across the application.

    Attributes:
        message: A human-readable error description for logging and debugging.
        error_code: A machine-readable error identifier for API responses
            (e.g., "ENTITY_NOT_FOUND", "DUPLICATE_ENTRY").
    """

    def __init__(self, message: str, error_code: str = "STADIUMOS_ERROR") -> None:
        self.message = message
        self.error_code = error_code
        super().__init__(self.message)


# ---------------------------------------------------------------------------
# Entity Errors — Raised when operations on specific entities fail
# ---------------------------------------------------------------------------

class EntityNotFoundError(StadiumOSError):
    """
    Raised when a requested entity does not exist in the data store.

    Example: Attempting to fetch a volunteer by UUID that has been deleted.
    Mapped to HTTP 404 in the interfaces layer.
    """

    def __init__(self, entity_name: str, entity_id: str) -> None:
        super().__init__(
            message=f"{entity_name} with ID '{entity_id}' was not found.",
            error_code="ENTITY_NOT_FOUND",
        )
        self.entity_name = entity_name
        self.entity_id = entity_id


class DuplicateEntityError(StadiumOSError):
    """
    Raised when attempting to create an entity that violates a uniqueness constraint.

    Example: Registering a user with an email that already exists.
    Mapped to HTTP 409 (Conflict) in the interfaces layer.
    """

    def __init__(self, entity_name: str, field: str, value: str) -> None:
        super().__init__(
            message=f"{entity_name} with {field}='{value}' already exists.",
            error_code="DUPLICATE_ENTITY",
        )
        self.entity_name = entity_name
        self.field = field
        self.value = value


# ---------------------------------------------------------------------------
# Authentication & Authorization Errors
# ---------------------------------------------------------------------------

class AuthenticationError(StadiumOSError):
    """
    Raised when authentication credentials are invalid or expired.

    Example: Invalid JWT token, expired access token, wrong password.
    Mapped to HTTP 401 in the interfaces layer.
    """

    def __init__(self, message: str = "Authentication failed.") -> None:
        super().__init__(message=message, error_code="AUTHENTICATION_FAILED")


class AuthorizationError(StadiumOSError):
    """
    Raised when an authenticated user lacks the required RBAC role.

    Example: A volunteer attempting to access admin-only endpoints.
    Mapped to HTTP 403 in the interfaces layer.
    """

    def __init__(self, required_role: str, current_role: str) -> None:
        super().__init__(
            message=(
                f"Insufficient permissions. Required role: '{required_role}', "
                f"current role: '{current_role}'."
            ),
            error_code="INSUFFICIENT_PERMISSIONS",
        )
        self.required_role = required_role
        self.current_role = current_role


# ---------------------------------------------------------------------------
# Business Rule Violations
# ---------------------------------------------------------------------------

class BusinessRuleViolationError(StadiumOSError):
    """
    Raised when a business rule is violated during a domain operation.

    Example: Attempting to assign a volunteer who is currently off-duty,
    or trying to close a gate that has an active evacuation route.
    Mapped to HTTP 422 (Unprocessable Entity) in the interfaces layer.
    """

    def __init__(self, rule: str, details: str = "") -> None:
        message = f"Business rule violation: {rule}"
        if details:
            message += f" — {details}"
        super().__init__(message=message, error_code="BUSINESS_RULE_VIOLATION")
        self.rule = rule
        self.details = details


class InvalidStateTransitionError(StadiumOSError):
    """
    Raised when an entity state transition is not allowed.

    Example: Attempting to move an incident from RESOLVED back to REPORTED.
    The domain enforces strict state machines for incident and gate lifecycles.
    Mapped to HTTP 409 (Conflict) in the interfaces layer.
    """

    def __init__(
        self, entity_name: str, current_state: str, requested_state: str
    ) -> None:
        super().__init__(
            message=(
                f"Invalid state transition for {entity_name}: "
                f"'{current_state}' → '{requested_state}' is not allowed."
            ),
            error_code="INVALID_STATE_TRANSITION",
        )
        self.entity_name = entity_name
        self.current_state = current_state
        self.requested_state = requested_state


# ---------------------------------------------------------------------------
# Infrastructure Errors (wrapped as domain errors)
# ---------------------------------------------------------------------------

class ExternalServiceError(StadiumOSError):
    """
    Raised when an external service (LLM, transit API, etc.) is unavailable.

    The infrastructure layer catches raw connection errors and wraps them
    in this domain exception so that the application layer can handle
    failures without importing infrastructure-specific error types.
    Mapped to HTTP 502 (Bad Gateway) in the interfaces layer.
    """

    def __init__(self, service_name: str, details: str = "") -> None:
        message = f"External service '{service_name}' is unavailable"
        if details:
            message += f": {details}"
        super().__init__(message=message, error_code="EXTERNAL_SERVICE_ERROR")
        self.service_name = service_name
