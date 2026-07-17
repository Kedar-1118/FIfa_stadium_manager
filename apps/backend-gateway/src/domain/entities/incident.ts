/**
 * StadiumOS AI — Incident Domain Entity.
 * 
 * Represents active incidents with state transitions and assignment updates.
 */

import { IncidentSeverity, IncidentStatus } from "../enums";
import { Coordinates } from "../valueObjects";
import { InvalidStateTransitionError, BusinessRuleViolationError } from "../exceptions";

const VALID_INCIDENT_TRANSITIONS: Record<IncidentStatus, Set<IncidentStatus>> = {
  [IncidentStatus.REPORTED]: new Set([IncidentStatus.ACKNOWLEDGED, IncidentStatus.ESCALATED]),
  [IncidentStatus.ACKNOWLEDGED]: new Set([IncidentStatus.IN_PROGRESS, IncidentStatus.ESCALATED]),
  [IncidentStatus.IN_PROGRESS]: new Set([IncidentStatus.RESOLVED, IncidentStatus.ESCALATED]),
  [IncidentStatus.RESOLVED]: new Set(), // Terminal
  [IncidentStatus.ESCALATED]: new Set([IncidentStatus.IN_PROGRESS, IncidentStatus.RESOLVED])
};

export class Incident {
  public readonly id: string;
  public readonly incident_type: string;
  public readonly severity: IncidentSeverity;
  public status: IncidentStatus;
  public readonly description: string;
  public readonly location: Coordinates;
  public readonly sector_id: string;
  public readonly gate_id: string | null;
  public readonly reported_by_user_id: string;
  public assigned_volunteer_id: string | null;
  public readonly ai_recommendation: string | null;
  public resolution_notes: string | null;
  public resolved_at: Date | null;
  public readonly created_at: Date;
  public updatedAt: Date;

  constructor(
    id: string,
    incident_type: string,
    severity: IncidentSeverity,
    description: string,
    location: Coordinates,
    sector_id: string,
    reported_by_user_id: string,
    gate_id: string | null = null,
    status: IncidentStatus = IncidentStatus.REPORTED,
    assigned_volunteer_id: string | null = null,
    ai_recommendation: string | null = null,
    resolution_notes: string | null = null,
    resolved_at: Date | null = null,
    created_at: Date = new Date(),
    updatedAt: Date = new Date()
  ) {
    if (!description.trim()) {
      throw new BusinessRuleViolationError("Incident description cannot be empty.");
    }

    this.id = id;
    this.incident_type = incident_type;
    this.severity = severity;
    this.status = status;
    this.description = description.trim();
    this.location = location;
    this.sector_id = sector_id;
    this.gate_id = gate_id;
    this.reported_by_user_id = reported_by_user_id;
    this.assigned_volunteer_id = assigned_volunteer_id;
    this.ai_recommendation = ai_recommendation;
    this.resolution_notes = resolution_notes;
    this.resolved_at = resolved_at;
    this.created_at = created_at;
    this.updatedAt = updatedAt;
  }

  public transitionTo(newStatus: IncidentStatus): void {
    if (newStatus === this.status) return;

    const validNextStates = VALID_INCIDENT_TRANSITIONS[this.status];
    if (!validNextStates || !validNextStates.has(newStatus)) {
      throw new InvalidStateTransitionError("Incident", this.status, newStatus);
    }

    this.status = newStatus;
    this.updatedAt = new Date();

    if (newStatus === IncidentStatus.RESOLVED) {
      this.resolved_at = new Date();
    }
  }

  public assignVolunteer(volunteerId: string): void {
    this.assigned_volunteer_id = volunteerId;
    if (this.status === IncidentStatus.REPORTED) {
      this.transitionTo(IncidentStatus.ACKNOWLEDGED);
    }
    this.updatedAt = new Date();
  }

  public resolve(notes: string): void {
    this.resolution_notes = notes.trim();
    this.transitionTo(IncidentStatus.RESOLVED);
  }

  public escalate(): void {
    this.transitionTo(IncidentStatus.ESCALATED);
  }

  public get isActive(): boolean {
    return this.status !== IncidentStatus.RESOLVED;
  }

  public get requiresImmediateResponse(): boolean {
    return (
      this.severity === IncidentSeverity.HIGH ||
      this.severity === IncidentSeverity.CRITICAL
    );
  }
}
