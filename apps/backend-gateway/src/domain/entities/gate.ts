/**
 * StadiumOS AI — Gate Domain Entity.
 * 
 * Represents a physical entrance/exit gate with state transition checks.
 */

import { GateStatus } from "../enums";
import { Coordinates } from "../valueObjects";
import { InvalidStateTransitionError, BusinessRuleViolationError } from "../exceptions";

const VALID_GATE_TRANSITIONS: Record<GateStatus, Set<GateStatus>> = {
  [GateStatus.OPEN]: new Set([GateStatus.CLOSED, GateStatus.RESTRICTED, GateStatus.CONGESTED, GateStatus.MAINTENANCE]),
  [GateStatus.CLOSED]: new Set([GateStatus.OPEN, GateStatus.MAINTENANCE]),
  [GateStatus.RESTRICTED]: new Set([GateStatus.OPEN, GateStatus.CLOSED]),
  [GateStatus.CONGESTED]: new Set([GateStatus.OPEN, GateStatus.RESTRICTED, GateStatus.CLOSED]),
  [GateStatus.MAINTENANCE]: new Set([GateStatus.CLOSED, GateStatus.OPEN])
};

export class Gate {
  public readonly id: string;
  public readonly sector_id: string;
  public readonly gate_code: string;
  public status: GateStatus;
  public readonly location: Coordinates;
  public readonly is_bidirectional: boolean;
  public readonly created_at: Date;
  public updatedAt: Date;

  constructor(
    id: string,
    sector_id: string,
    gate_code: string,
    location: Coordinates,
    status: GateStatus = GateStatus.CLOSED,
    is_bidirectional: boolean = true,
    created_at: Date = new Date(),
    updatedAt: Date = new Date()
  ) {
    if (!gate_code.trim()) {
      throw new BusinessRuleViolationError("Gate code cannot be empty.");
    }

    this.id = id;
    this.sector_id = sector_id;
    this.gate_code = gate_code.trim().toUpperCase();
    this.status = status;
    this.location = location;
    this.is_bidirectional = is_bidirectional;
    this.created_at = created_at;
    this.updatedAt = updatedAt;
  }

  public transitionTo(newStatus: GateStatus): void {
    if (newStatus === this.status) return;

    const validNextStates = VALID_GATE_TRANSITIONS[this.status];
    if (!validNextStates || !validNextStates.has(newStatus)) {
      throw new InvalidStateTransitionError("Gate", this.status, newStatus);
    }

    this.status = newStatus;
    this.updatedAt = new Date();
  }

  public get isOperational(): boolean {
    return (
      this.status === GateStatus.OPEN ||
      this.status === GateStatus.RESTRICTED ||
      this.status === GateStatus.CONGESTED
    );
  }
}
