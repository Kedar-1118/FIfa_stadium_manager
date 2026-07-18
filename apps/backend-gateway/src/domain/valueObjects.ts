/**
 * StadiumOS AI — Domain Value Objects.
 * 
 * Immutable value objects representing geographic dimensions, capacity bounds,
 * and polygon boundaries.
 */

import { BusinessRuleViolationError } from "./exceptions";

export class Coordinates {
  public readonly latitude: number;
  public readonly longitude: number;

  constructor(latitude: number, longitude: number) {
    if (latitude < -90.0 || latitude > 90.0) {
      throw new BusinessRuleViolationError("Latitude must be between -90.0 and 90.0.");
    }
    if (longitude < -180.0 || longitude > 180.0) {
      throw new BusinessRuleViolationError("Longitude must be between -180.0 and 180.0.");
    }
    this.latitude = latitude;
    this.longitude = longitude;
  }

  /**
   * Return coordinates in Redis GEOADD order: longitude, latitude.
   */
  public toRedisArgs(): [number, number] {
    return [this.longitude, this.latitude];
  }

  public equals(other: Coordinates): boolean {
    return this.latitude === other.latitude && this.longitude === other.longitude;
  }
}

export class SectorBoundary {
  public readonly vertices: readonly Coordinates[];

  constructor(vertices: Coordinates[]) {
    if (vertices.length < 4) {
      throw new BusinessRuleViolationError("Polygon boundary must contain at least 4 coordinates.");
    }
    // Validate closed polygon (first vertex == last vertex)
    const first = vertices[0];
    const last = vertices[vertices.length - 1];
    if (!first || !last || !first.equals(last)) {
      throw new BusinessRuleViolationError("Polygon must be closed: the first and last coordinates must match.");
    }
    this.vertices = Object.freeze([...vertices]);
  }
}

export class CapacityInfo {
  public readonly maxCapacity: number;
  public readonly warningThresholdPercent: number;
  public readonly criticalThresholdPercent: number;

  constructor(
    maxCapacity: number,
    warningThresholdPercent: number = 80.0,
    criticalThresholdPercent: number = 95.0
  ) {
    if (maxCapacity <= 0) {
      throw new BusinessRuleViolationError("maxCapacity must be a positive integer.");
    }
    if (warningThresholdPercent < 50.0 || warningThresholdPercent > 100.0) {
      throw new BusinessRuleViolationError("warningThresholdPercent must be between 50.0 and 100.0.");
    }
    if (criticalThresholdPercent < 70.0 || criticalThresholdPercent > 100.0) {
      throw new BusinessRuleViolationError("criticalThresholdPercent must be between 70.0 and 100.0.");
    }
    if (criticalThresholdPercent <= warningThresholdPercent) {
      throw new BusinessRuleViolationError("criticalThresholdPercent must exceed warningThresholdPercent.");
    }
    this.maxCapacity = maxCapacity;
    this.warningThresholdPercent = warningThresholdPercent;
    this.criticalThresholdPercent = criticalThresholdPercent;
  }

  public isWarning(currentOccupancy: number): boolean {
    return (currentOccupancy / this.maxCapacity) * 100.0 >= this.warningThresholdPercent;
  }

  public isCritical(currentOccupancy: number): boolean {
    return (currentOccupancy / this.maxCapacity) * 100.0 >= this.criticalThresholdPercent;
  }
}
