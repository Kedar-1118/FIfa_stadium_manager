/**
 * StadiumOS AI — Stadium Domain Entity.
 * 
 * Represents a physical FIFA World Cup 2026 venue.
 */

import { Coordinates } from "../valueObjects";
import { BusinessRuleViolationError } from "../exceptions";

export class Stadium {
  public readonly id: string;
  public readonly name: string;
  public readonly city: string;
  public readonly country: string;
  public readonly location: Coordinates;
  public readonly total_capacity: number;
  public readonly timezone: string;
  public readonly created_at: Date;
  public readonly updated_at: Date;

  constructor(
    id: string,
    name: string,
    city: string,
    country: string,
    location: Coordinates,
    total_capacity: number,
    timezone: string = "UTC",
    created_at: Date = new Date(),
    updated_at: Date = new Date()
  ) {
    if (!name.trim()) {
      throw new BusinessRuleViolationError("Stadium name cannot be empty.");
    }
    if (total_capacity <= 0) {
      throw new BusinessRuleViolationError("total_capacity must be a positive integer.");
    }

    this.id = id;
    this.name = name.trim();
    this.city = city.trim();
    this.country = country.trim();
    this.location = location;
    this.total_capacity = total_capacity;
    this.timezone = timezone;
    this.created_at = created_at;
    this.updated_at = updated_at;
  }
}
