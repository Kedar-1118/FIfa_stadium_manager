/**
 * StadiumOS AI — Volunteer Domain Entity.
 * 
 * Represents volunteer profile tracking and dispatch status controls.
 */

import { VolunteerStatus } from "../enums";
import { Coordinates } from "../valueObjects";
import { BusinessRuleViolationError } from "../exceptions";

export class Volunteer {
  public readonly id: string;
  public readonly user_id: string;
  public readonly name: string;
  public readonly phone: string;
  public status: VolunteerStatus;
  public current_location: Coordinates;
  public readonly assigned_sector_id: string | null;
  public readonly skills: string[];
  public readonly created_at: Date;
  public updatedAt: Date;

  constructor(
    id: string,
    user_id: string,
    name: string,
    phone: string,
    current_location: Coordinates,
    assigned_sector_id: string | null = null,
    status: VolunteerStatus = VolunteerStatus.AVAILABLE,
    skills: string[] = [],
    created_at: Date = new Date(),
    updatedAt: Date = new Date()
  ) {
    if (!name.trim()) {
      throw new BusinessRuleViolationError("Volunteer name cannot be empty.");
    }

    this.id = id;
    this.user_id = user_id;
    this.name = name.trim();
    this.phone = phone.trim();
    this.status = status;
    this.current_location = current_location;
    this.assigned_sector_id = assigned_sector_id;
    this.skills = skills;
    this.created_at = created_at;
    this.updatedAt = updatedAt;
  }

  public assignToIncident(): void {
    if (this.status !== VolunteerStatus.AVAILABLE) {
      throw new BusinessRuleViolationError(
        "Volunteer must be AVAILABLE to accept an assignment",
        `Current status is '${this.status}'.`
      );
    }
    this.status = VolunteerStatus.ASSIGNED;
    this.updatedAt = new Date();
  }

  public releaseFromIncident(): void {
    this.status = VolunteerStatus.AVAILABLE;
    this.updatedAt = new Date();
  }

  public updateLocation(newLocation: Coordinates): void {
    this.current_location = newLocation;
    this.updatedAt = new Date();
  }

  public get isAvailable(): boolean {
    return this.status === VolunteerStatus.AVAILABLE;
  }

  public hasSkill(skillName: string): boolean {
    return this.skills.some((s) => s.toLowerCase() === skillName.toLowerCase());
  }
}
