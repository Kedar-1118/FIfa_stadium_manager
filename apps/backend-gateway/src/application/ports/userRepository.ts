/**
 * StadiumOS AI — User Repository Port.
 * 
 * Defines the abstract interface for User database actions.
 */

import { User } from "../../domain/entities/user";

export interface IUserRepository {
  getById(id: string): Promise<User | null>;
  getByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<User>;
  delete(id: string): Promise<void>;
}
