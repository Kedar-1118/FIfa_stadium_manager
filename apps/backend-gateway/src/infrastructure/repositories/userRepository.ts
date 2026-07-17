/**
 * StadiumOS AI — User Repository Adapter.
 * 
 * Implements IUserRepository using Prisma Client.
 */

import { IUserRepository } from "../../application/ports/userRepository";
import { User } from "../../domain/entities/user";
import { UserRole } from "../../domain/enums";
import { prisma } from "../database/prisma";
import { User as PrismaUserModel } from "@prisma/client";

export class PrismaUserRepository implements IUserRepository {
  private _toDomain(model: PrismaUserModel): User {
    return new User(
      model.id,
      model.email,
      model.hashed_password,
      model.role as UserRole,
      model.is_active,
      model.created_at,
      model.updated_at
    );
  }

  public async getById(id: string): Promise<User | null> {
    const model = await prisma.user.findUnique({
      where: { id }
    });
    return model ? this._toDomain(model) : null;
  }

  public async getByEmail(email: string): Promise<User | null> {
    const model = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });
    return model ? this._toDomain(model) : null;
  }

  public async save(user: User): Promise<User> {
    const data = {
      email: user.email.toLowerCase().trim(),
      hashed_password: user.hashedPassword,
      role: user.role,
      is_active: user.is_active,
      updated_at: user.updated_at
    };

    const model = await prisma.user.upsert({
      where: { id: user.id },
      update: data,
      create: {
        id: user.id,
        ...data,
        created_at: user.created_at
      }
    });

    return this._toDomain(model);
  }

  public async delete(id: string): Promise<void> {
    await prisma.user.delete({
      where: { id }
    });
  }
}
export default PrismaUserRepository;
