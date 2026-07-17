/**
 * StadiumOS AI — Stadium & Sector Management Service.
 * 
 * Orchestrates creating, reading, and verifying stadium venues and sectors.
 */

import { v4 as uuidv4 } from "uuid";
import { IStadiumRepository } from "../ports/stadiumRepository";
import { StadiumCreate, SectorCreate } from "../schemas/stadiumSchemas";
import { Stadium } from "../../domain/entities/stadium";
import { Sector } from "../../domain/entities/sector";
import { Coordinates, CapacityInfo } from "../../domain/valueObjects";
import { DuplicateEntityError, EntityNotFoundError } from "../../domain/exceptions";
import { logger } from "../../infrastructure/logging/logger";

export class StadiumService {
  private stadiumRepo: IStadiumRepository;

  constructor(stadiumRepo: IStadiumRepository) {
    this.stadiumRepo = stadiumRepo;
  }

  public async createStadium(req: StadiumCreate): Promise<Stadium> {
    const existing = await this.stadiumRepo.getByName(req.name);
    if (existing) {
      throw new DuplicateEntityError("Stadium", "name", req.name);
    }

    const newStadium = new Stadium(
      uuidv4(),
      req.name,
      req.city,
      req.country,
      new Coordinates(req.latitude, req.longitude),
      req.total_capacity,
      req.timezone
    );

    const saved = await this.stadiumRepo.save(newStadium);
    logger.info({ stadiumId: saved.id, name: saved.name }, "Stadium venue created successfully");
    return saved;
  }

  public async getStadium(id: string): Promise<Stadium> {
    const stadium = await this.stadiumRepo.getById(id);
    if (!stadium) {
      throw new EntityNotFoundError("Stadium", id);
    }
    return stadium;
  }

  public async listStadiums(): Promise<Stadium[]> {
    return await this.stadiumRepo.listAll();
  }

  public async createSector(stadiumId: string, req: SectorCreate): Promise<Sector> {
    // Assert stadium exists
    await this.getStadium(stadiumId);

    const newSector = new Sector(
      uuidv4(),
      stadiumId,
      req.name,
      new CapacityInfo(req.max_capacity, req.warning_threshold_percent, req.critical_threshold_percent),
      new Coordinates(req.centroid_latitude, req.centroid_longitude),
      req.is_accessible
    );

    const saved = await this.stadiumRepo.saveSector(newSector);
    logger.info({ sectorId: saved.id, name: saved.name }, "Stadium sector created successfully");
    return saved;
  }

  public async getSector(id: string): Promise<Sector> {
    const sector = await this.stadiumRepo.getSectorById(id);
    if (!sector) {
      throw new EntityNotFoundError("Sector", id);
    }
    return sector;
  }

  public async listSectors(stadiumId: string): Promise<Sector[]> {
    await this.getStadium(stadiumId);
    return await this.stadiumRepo.listSectorsByStadium(stadiumId);
  }
}
export default StadiumService;
