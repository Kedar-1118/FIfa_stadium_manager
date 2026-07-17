/**
 * StadiumOS AI — Domain Custom Exception Hierarchy.
 * 
 * Provides unified, typed errors with machine-readable error codes.
 */

export class StadiumOSError extends Error {
  public readonly errorCode: string;

  constructor(message: string, errorCode: string = "STADIUMOS_ERROR") {
    super(message);
    this.errorCode = errorCode;
    // Restore prototype chain
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class EntityNotFoundError extends StadiumOSError {
  constructor(entityName: string, entityId: string) {
    super(`${entityName} with ID '${entityId}' was not found.`, "ENTITY_NOT_FOUND");
  }
}

export class DuplicateEntityError extends StadiumOSError {
  constructor(entityName: string, field: string, value: string) {
    super(`${entityName} with ${field}='${value}' already exists.`, "DUPLICATE_ENTITY");
  }
}

export class AuthenticationError extends StadiumOSError {
  constructor(message: string = "Authentication failed.") {
    super(message, "AUTHENTICATION_FAILED");
  }
}

export class AuthorizationError extends StadiumOSError {
  constructor(requiredRole: string, currentRole: string) {
    super(
      `Insufficient permissions. Required role: '${requiredRole}', current role: '${currentRole}'.`,
      "INSUFFICIENT_PERMISSIONS"
    );
  }
}

export class BusinessRuleViolationError extends StadiumOSError {
  constructor(rule: string, details?: string) {
    super(`Business rule violation: ${rule}${details ? ` — ${details}` : ""}`, "BUSINESS_RULE_VIOLATION");
  }
}

export class InvalidStateTransitionError extends StadiumOSError {
  constructor(entityName: string, currentState: string, requestedState: string) {
    super(
      `Invalid state transition for ${entityName}: '${currentState}' → '${requestedState}' is not allowed.`,
      "INVALID_STATE_TRANSITION"
    );
  }
}

export class ExternalServiceError extends StadiumOSError {
  constructor(serviceName: string, details?: string) {
    super(`External service '${serviceName}' is unavailable${details ? `: ${details}` : ""}`, "EXTERNAL_SERVICE_ERROR");
  }
}
