/**
 * StadiumOS AI — Gate Management Service.
 * 
 * Orchestrates creating, reading, and transitioning gate states. Synchronizes status
 * changes to Redis cache to support fast read-model telemetry.
 */

import { v4 as uuidv4 } from "uuid";
import { IGateRepository } from "../ports/gateRepository";
import { GateCreate, GateStatusUpdate } from "../schemas/gateSchemas";
import { Gate } from "../../domain/entities/gate";
import { Coordinates } from "../../domain/valueObjects";
import { DuplicateEntityError, EntityNotFoundError } from "../../domain/exceptions";
import { CacheService } from "../../infrastructure/cache/cacheService";
import { logger } from "../../infrastructure/logging/logger";

export class GateService {
  private gateRepo: IGateRepository;
  private cacheService: CacheService;

  constructor(gateRepo: IGateRepository, cacheService: CacheService) {
    this.gateRepo = gateRepo;
    this.cacheService = cacheService;
  }

  public async createGate(sectorId: string, req: GateCreate): Promise<Gate> {
    const existing = await this.gateRepo.getByCode(req.gate_code);
    if (existing) {
      throw new DuplicateEntityError("Gate", "gate_code", req.gate_code);
    }

    const newGate = new Gate(
      uuidv4(),
      sectorId,
      req.gate_code,
      new Coordinates(req.latitude, req.longitude),
      req.status,
      req.is_bidirectional
    );

    const saved = await this.gateRepo.save(newGate);
    logger.info({ gateId: saved.id, code: saved.gate_code }, "Gate profile registered successfully");

    // Cache initial state
    await this.cacheService.set(`gate:status:${saved.gate_code}`, saved.status);

    return saved;
  }

  public async getGate(id: string): Promise<Gate> {
    const gate = await this.gateRepo.getById(id);
    if (!gate) {
      throw new EntityNotFoundError("Gate", id);
    }
    return gate;
  }

  public async listGates(sectorId: string): Promise<Gate[]> {
    return await this.gateRepo.listBySector(sectorId);
  }

  public async updateGateStatus(id: string, req: GateStatusUpdate): Promise<Gate> {
    const gate = await this.getGate(id);

    // Run transition checks inside domain entity
    gate.transitionTo(req.status);

    const saved = await this.gateRepo.save(gate);
    logger.info(
      { gateId: saved.id, code: saved.gate_code, status: saved.status, reason: req.reason },
      "Gate status updated successfully"
    );

    // Sync state change to Redis cache
    await this.cacheService.set(`gate:status:${saved.gate_code}`, saved.status);

    return saved;
  }
}
export default GateService;
