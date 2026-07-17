/**
 * StadiumOS AI — Domain Enumerations.
 * 
 * Defines categorical enums used across domain boundary logic.
 */

export enum UserRole {
  ADMIN = "ADMIN",
  OPERATOR = "OPERATOR",
  VOLUNTEER = "VOLUNTEER",
  FAN = "FAN"
}

export enum IncidentSeverity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL"
}

export enum IncidentStatus {
  REPORTED = "REPORTED",
  ACKNOWLEDGED = "ACKNOWLEDGED",
  IN_PROGRESS = "IN_PROGRESS",
  RESOLVED = "RESOLVED",
  ESCALATED = "ESCALATED"
}

export enum GateStatus {
  OPEN = "OPEN",
  CLOSED = "CLOSED",
  RESTRICTED = "RESTRICTED",
  CONGESTED = "CONGESTED",
  MAINTENANCE = "MAINTENANCE"
}

export enum VolunteerStatus {
  AVAILABLE = "AVAILABLE",
  ASSIGNED = "ASSIGNED",
  ON_BREAK = "ON_BREAK",
  OFF_DUTY = "OFF_DUTY"
}

export enum RecommendationStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  EXECUTED = "EXECUTED",
  EXPIRED = "EXPIRED"
}
