/**
 * StadiumOS AI — Sector Domain Entity.
 * 
 * Represents a logical sub-sector of a stadium venue.
 */

import { Coordinates, CapacityInfo } from "../valueObjects";
import { BusinessRuleViolationError } from "../exceptions";

export class Sector {
  public readonly id: string;
  public readonly stadium_id: string;
  public readonly name: string;
  public readonly capacity_info: CapacityInfo;
  public readonly centroid: Coordinates;
  public readonly is_accessible: boolean;
  public readonly created_at: Date;
  public readonly updated_at: Date;

  constructor(
    id: string,
    stadium_id: string,
    name: string,
    capacity_info: CapacityInfo,
    centroid: Coordinates,
    is_accessible: boolean = false,
    created_at: Date = new Date(),
    updated_at: Date = new Date()
  ) {
    if (!name.trim()) {
      throw new BusinessRuleViolationError("Sector name cannot be empty.");
    }

    this.id = id;
    this.stadium_id = stadium_id;
    this.name = name.trim();
    this.capacity_info = capacity_info;
    this.centroid = centroid;
    this.is_accessible = is_accessible;
    this.created_at = created_at;
    this.updated_at = updated_at;
  }

  public checkOccupancyStatus(currentCount: number): "normal" | "warning" | "critical" {
    if (this.capacity_info.isCritical(currentCount)) {
      return "critical";
    }
    if (this.capacity_info.isWarning(currentCount)) {
      return "warning";
    }
    return "normal";
  }
}
