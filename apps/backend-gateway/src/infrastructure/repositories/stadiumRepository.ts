/**
 * StadiumOS AI — Stadium & Sector Repository Adapter.
 * 
 * Implements IStadiumRepository using Prisma Client.
 */

import { IStadiumRepository } from "../../application/ports/stadiumRepository";
import { Stadium } from "../../domain/entities/stadium";
import { Sector } from "../../domain/entities/sector";
import { Coordinates, CapacityInfo } from "../../domain/valueObjects";
import { prisma } from "../database/prisma";
import {
  Stadium as PrismaStadiumModel,
  Sector as PrismaSectorModel,
} from "@prisma/client";

export class PrismaStadiumRepository implements IStadiumRepository {
  private _stadiumToDomain(model: PrismaStadiumModel): Stadium {
    return new Stadium(
      model.id,
      model.name,
      model.city,
      model.country,
      new Coordinates(model.latitude, model.longitude),
      model.total_capacity,
      model.timezone,
      model.created_at,
      model.updated_at
    );
  }

  private _sectorToDomain(model: PrismaSectorModel): Sector {
    return new Sector(
      model.id,
      model.stadium_id,
      model.name,
      new CapacityInfo(
        model.max_capacity,
        model.warning_threshold_percent,
        model.critical_threshold_percent
      ),
      new Coordinates(model.centroid_latitude, model.centroid_longitude),
      model.is_accessible,
      model.created_at,
      model.updated_at
    );
  }

  // --- Stadiums ---

  public async getById(id: string): Promise<Stadium | null> {
    const model = await prisma.stadium.findUnique({
      where: { id }
    });
    return model ? this._stadiumToDomain(model) : null;
  }

  public async getByName(name: string): Promise<Stadium | null> {
    const model = await prisma.stadium.findUnique({
      where: { name: name.trim() }
    });
    return model ? this._stadiumToDomain(model) : null;
  }

  public async listAll(): Promise<Stadium[]> {
    const models = await prisma.stadium.findMany({
      orderBy: { name: "asc" }
    });
    return models.map((m) => this._stadiumToDomain(m));
  }

  public async save(stadium: Stadium): Promise<Stadium> {
    const data = {
      name: stadium.name,
      city: stadium.city,
      country: stadium.country,
      latitude: stadium.location.latitude,
      longitude: stadium.location.longitude,
      total_capacity: stadium.total_capacity,
      timezone: stadium.timezone,
      updated_at: stadium.updated_at
    };

    const model = await prisma.stadium.upsert({
      where: { id: stadium.id },
      update: data,
      create: {
        id: stadium.id,
        ...data,
        created_at: stadium.created_at
      }
    });

    return this._stadiumToDomain(model);
  }

  public async delete(id: string): Promise<void> {
    await prisma.stadium.delete({
      where: { id }
    });
  }

  // --- Sectors ---

  public async getSectorById(id: string): Promise<Sector | null> {
    const model = await prisma.sector.findUnique({
      where: { id }
    });
    return model ? this._sectorToDomain(model) : null;
  }

  public async listSectorsByStadium(stadiumId: string): Promise<Sector[]> {
    const models = await prisma.sector.findMany({
      where: { stadium_id: stadiumId },
      orderBy: { name: "asc" }
    });
    return models.map((m) => this._sectorToDomain(m));
  }

  public async saveSector(sector: Sector): Promise<Sector> {
    const data = {
      stadium_id: sector.stadium_id,
      name: sector.name,
      max_capacity: sector.capacity_info.maxCapacity,
      warning_threshold_percent: sector.capacity_info.warningThresholdPercent,
      critical_threshold_percent: sector.capacity_info.criticalThresholdPercent,
      centroid_latitude: sector.centroid.latitude,
      centroid_longitude: sector.centroid.longitude,
      is_accessible: sector.is_accessible,
      updated_at: sector.updated_at
    };

    const model = await prisma.sector.upsert({
      where: { id: sector.id },
      update: data,
      create: {
        id: sector.id,
        ...data,
        created_at: sector.created_at
      }
    });

    return this._sectorToDomain(model);
  }

  public async deleteSector(id: string): Promise<void> {
    await prisma.sector.delete({
      where: { id }
    });
  }
}
export default PrismaStadiumRepository;
