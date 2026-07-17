/**
 * StadiumOS AI — Incident Repository Adapter.
 * 
 * Implements IIncidentRepository using Prisma Client.
 */

import { IIncidentRepository } from "../../application/ports/incidentRepository";
import { Incident } from "../../domain/entities/incident";
import { IncidentSeverity, IncidentStatus } from "../../domain/enums";
import { Coordinates } from "../../domain/valueObjects";
import { prisma } from "../database/prisma";
import { Incident as PrismaIncidentModel } from "@prisma/client";

export class PrismaIncidentRepository implements IIncidentRepository {
  private _toDomain(model: PrismaIncidentModel): Incident {
    return new Incident(
      model.id,
      model.incident_type,
      model.severity as IncidentSeverity,
      model.description,
      new Coordinates(model.latitude, model.longitude),
      model.sector_id,
      model.reported_by_user_id,
      model.gate_id,
      model.status as IncidentStatus,
      model.assigned_volunteer_id,
      model.ai_recommendation,
      model.resolution_notes,
      model.resolved_at || null,
      model.created_at,
      model.updated_at
    );
  }

  public async getById(id: string): Promise<Incident | null> {
    const model = await prisma.incident.findUnique({
      where: { id }
    });
    return model ? this._toDomain(model) : null;
  }

  public async listActive(limit?: number, offset?: number): Promise<Incident[]> {
    const models = await prisma.incident.findMany({
      where: {
        status: {
          not: IncidentStatus.RESOLVED
        }
      },
      take: limit,
      skip: offset,
      orderBy: { created_at: "desc" }
    });
    return models.map((m) => this._toDomain(m));
  }

  public async listBySector(sectorId: string): Promise<Incident[]> {
    const models = await prisma.incident.findMany({
      where: { sector_id: sectorId },
      orderBy: { created_at: "desc" }
    });
    return models.map((m) => this._toDomain(m));
  }

  public async save(incident: Incident): Promise<Incident> {
    const data = {
      incident_type: incident.incident_type,
      severity: incident.severity,
      status: incident.status,
      description: incident.description,
      latitude: incident.location.latitude,
      longitude: incident.location.longitude,
      sector_id: incident.sector_id,
      gate_id: incident.gate_id,
      reported_by_user_id: incident.reported_by_user_id,
      assigned_volunteer_id: incident.assigned_volunteer_id,
      ai_recommendation: incident.ai_recommendation,
      resolution_notes: incident.resolution_notes,
      resolved_at: incident.resolved_at,
      updated_at: incident.updatedAt
    };

    const model = await prisma.incident.upsert({
      where: { id: incident.id },
      update: data,
      create: {
        id: incident.id,
        ...data,
        created_at: incident.created_at
      }
    });

    return this._toDomain(model);
  }

  public async delete(id: string): Promise<void> {
    await prisma.incident.delete({
      where: { id }
    });
  }

  public async countActive(): Promise<number> {
    return await prisma.incident.count({
      where: {
        status: {
          not: IncidentStatus.RESOLVED
        }
      }
    });
  }
}
export default PrismaIncidentRepository;
