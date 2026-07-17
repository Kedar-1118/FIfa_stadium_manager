/**
 * StadiumOS AI — Gate Repository Adapter.
 * 
 * Implements IGateRepository using Prisma Client.
 */

import { IGateRepository } from "../../application/ports/gateRepository";
import { Gate } from "../../domain/entities/gate";
import { GateStatus } from "../../domain/enums";
import { Coordinates } from "../../domain/valueObjects";
import { prisma } from "../database/prisma";
import { Gate as PrismaGateModel } from "@prisma/client";

export class PrismaGateRepository implements IGateRepository {
  private _toDomain(model: PrismaGateModel): Gate {
    return new Gate(
      model.id,
      model.sector_id,
      model.gate_code,
      new Coordinates(model.latitude, model.longitude),
      model.status as GateStatus,
      model.is_bidirectional,
      model.created_at,
      model.updated_at
    );
  }

  public async getById(id: string): Promise<Gate | null> {
    const model = await prisma.gate.findUnique({
      where: { id }
    });
    return model ? this._toDomain(model) : null;
  }

  public async getByCode(code: string): Promise<Gate | null> {
    const model = await prisma.gate.findUnique({
      where: { gate_code: code.trim().toUpperCase() }
    });
    return model ? this._toDomain(model) : null;
  }

  public async listBySector(sectorId: string): Promise<Gate[]> {
    const models = await prisma.gate.findMany({
      where: { sector_id: sectorId },
      orderBy: { gate_code: "asc" }
    });
    return models.map((m) => this._toDomain(m));
  }

  public async save(gate: Gate): Promise<Gate> {
    const data = {
      sector_id: gate.sector_id,
      gate_code: gate.gate_code,
      status: gate.status,
      latitude: gate.location.latitude,
      longitude: gate.location.longitude,
      is_bidirectional: gate.is_bidirectional,
      updated_at: gate.updatedAt
    };

    const model = await prisma.gate.upsert({
      where: { id: gate.id },
      update: data,
      create: {
        id: gate.id,
        ...data,
        created_at: gate.created_at
      }
    });

    return this._toDomain(model);
  }

  public async delete(id: string): Promise<void> {
    await prisma.gate.delete({
      where: { id }
    });
  }
}
export default PrismaGateRepository;
