/**
 * StadiumOS AI — Volunteer Service.
 * 
 * Coordinates volunteer location updates, status shifts, and geo-spatial searches.
 * Syncs volunteer coordinates to Redis geo spatial indexes to support real-time triage searches.
 */

import { v4 as uuidv4 } from "uuid";
import { IVolunteerRepository } from "../ports/volunteerRepository";
import { VolunteerCreate, VolunteerLocationUpdate, VolunteerStatusUpdate } from "../schemas/volunteerSchemas";
import { Volunteer } from "../../domain/entities/volunteer";
import { VolunteerStatus } from "../../domain/enums";
import { Coordinates } from "../../domain/valueObjects";
import { EntityNotFoundError, BusinessRuleViolationError } from "../../domain/exceptions";
import { CacheService } from "../../infrastructure/cache/cacheService";
import { logger } from "../../infrastructure/logging/logger";

export class VolunteerService {
  private volunteerRepo: IVolunteerRepository;
  private cacheService: CacheService;
  private geoIndexKey = "volunteers:locations";

  constructor(volunteerRepo: IVolunteerRepository, cacheService: CacheService) {
    this.volunteerRepo = volunteerRepo;
    this.cacheService = cacheService;
  }

  public async checkInVolunteer(userId: string, req: VolunteerCreate): Promise<Volunteer> {
    const existing = await this.volunteerRepo.getByUserId(userId);
    if (existing) {
      throw new BusinessRuleViolationError("Volunteer check-in failed", "This user is already checked in as a volunteer.");
    }

    const newVolunteer = new Volunteer(
      uuidv4(),
      userId,
      req.name,
      req.phone,
      new Coordinates(req.latitude, req.longitude),
      req.assigned_sector_id || null,
      VolunteerStatus.AVAILABLE,
      req.skills
    );

    const saved = await this.volunteerRepo.save(newVolunteer);
    logger.info({ volunteerId: saved.id, name: saved.name }, "Volunteer checked in successfully");

    // Sync active coordinates to Redis spatial index
    await this.cacheService.geoAdd(this.geoIndexKey, saved.id, saved.current_location.longitude, saved.current_location.latitude);

    return saved;
  }

  public async getVolunteer(id: string): Promise<Volunteer> {
    const volunteer = await this.volunteerRepo.getById(id);
    if (!volunteer) {
      throw new EntityNotFoundError("Volunteer", id);
    }
    return volunteer;
  }

  public async updateLocation(id: string, req: VolunteerLocationUpdate): Promise<Volunteer> {
    const volunteer = await this.getVolunteer(id);
    const coords = new Coordinates(req.latitude, req.longitude);

    volunteer.updateLocation(coords);
    const saved = await this.volunteerRepo.save(volunteer);

    // Sync active coordinates to Redis spatial index if available/assigned
    if (saved.status === VolunteerStatus.AVAILABLE || saved.status === VolunteerStatus.ASSIGNED) {
      await this.cacheService.geoAdd(this.geoIndexKey, saved.id, coords.longitude, coords.latitude);
    }

    return saved;
  }

  public async updateStatus(id: string, req: VolunteerStatusUpdate): Promise<Volunteer> {
    const volunteer = await this.getVolunteer(id);
    
    volunteer.status = req.status;
    const saved = await this.volunteerRepo.save(volunteer);
    logger.info({ volunteerId: saved.id, status: saved.status }, "Volunteer status updated");

    // Manage Redis spatial index membership based on shifts status
    if (saved.status === VolunteerStatus.AVAILABLE || saved.status === VolunteerStatus.ASSIGNED) {
      await this.cacheService.geoAdd(
        this.geoIndexKey,
        saved.id,
        saved.current_location.longitude,
        saved.current_location.latitude
      );
    } else {
      // Remove from geo search when off-duty or on break
      await this.cacheService.geoRemove(this.geoIndexKey, saved.id);
    }

    return saved;
  }

  public async searchNearby(
    latitude: number,
    longitude: number,
    radiusMeters: number,
    requiredSkill?: string
  ): Promise<any[]> {
    // 1. Fetch closest matches list from Redis spatial index
    const geoMatches = await this.cacheService.geoSearchRadius(
      this.geoIndexKey,
      longitude,
      latitude,
      radiusMeters
    );

    if (geoMatches.length === 0) return [];

    const results: any[] = [];

    // 2. Fetch full profiles from database
    for (const match of geoMatches) {
      const vol = await this.volunteerRepo.getById(match.member);
      if (vol) {
        // Apply optional skill tag filter
        if (requiredSkill && !vol.hasSkill(requiredSkill)) {
          continue;
        }
        results.push({
          id: vol.id,
          name: vol.name,
          status: vol.status,
          distance_meters: match.distanceMeters,
          latitude: vol.current_location.latitude,
          longitude: vol.current_location.longitude,
          skills: vol.skills
        });
      }
    }

    return results;
  }
}
export default VolunteerService;
