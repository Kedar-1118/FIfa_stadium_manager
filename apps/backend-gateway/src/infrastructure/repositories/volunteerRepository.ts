/**
 * StadiumOS AI — Volunteer Repository Adapter.
 * 
 * Implements IVolunteerRepository using Prisma Client.
 */

import { IVolunteerRepository } from "../../application/ports/volunteerRepository";
import { Volunteer } from "../../domain/entities/volunteer";
import { VolunteerStatus } from "../../domain/enums";
import { Coordinates } from "../../domain/valueObjects";
import { prisma } from "../database/prisma";
import { Volunteer as PrismaVolunteerModel } from "@prisma/client";

export class PrismaVolunteerRepository implements IVolunteerRepository {
  private _toDomain(model: PrismaVolunteerModel): Volunteer {
    return new Volunteer(
      model.id,
      model.user_id,
      model.name,
      model.phone,
      new Coordinates(model.latitude, model.longitude),
      model.assigned_sector_id,
      model.status as VolunteerStatus,
      model.skills,
      model.created_at,
      model.updated_at
    );
  }

  public async getById(id: string): Promise<Volunteer | null> {
    const model = await prisma.volunteer.findUnique({
      where: { id }
    });
    return model ? this._toDomain(model) : null;
  }

  public async getByUserId(userId: string): Promise<Volunteer | null> {
    const model = await prisma.volunteer.findUnique({
      where: { user_id: userId }
    });
    return model ? this._toDomain(model) : null;
  }

  public async listActive(): Promise<Volunteer[]> {
    const models = await prisma.volunteer.findMany({
      where: {
        status: {
          in: [VolunteerStatus.AVAILABLE, VolunteerStatus.ASSIGNED]
        }
      },
      orderBy: { name: "asc" }
    });
    return models.map((m) => this._toDomain(m));
  }

  public async save(volunteer: Volunteer): Promise<Volunteer> {
    const data = {
      user_id: volunteer.user_id,
      name: volunteer.name,
      phone: volunteer.phone,
      status: volunteer.status,
      latitude: volunteer.current_location.latitude,
      longitude: volunteer.current_location.longitude,
      assigned_sector_id: volunteer.assigned_sector_id,
      skills: volunteer.skills,
      updated_at: volunteer.updatedAt
    };

    const model = await prisma.volunteer.upsert({
      where: { id: volunteer.id },
      update: data,
      create: {
        id: volunteer.id,
        ...data,
        created_at: volunteer.created_at
      }
    });

    return this._toDomain(model);
  }

  public async delete(id: string): Promise<void> {
    await prisma.volunteer.delete({
      where: { id }
    });
  }
}
export default PrismaVolunteerRepository;
