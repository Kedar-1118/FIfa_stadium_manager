/**
 * StadiumOS AI — Volunteer Repository Port.
 * 
 * Defines the abstract interface for Volunteer database actions.
 */

import { Volunteer } from "../../domain/entities/volunteer";

export interface IVolunteerRepository {
  getById(id: string): Promise<Volunteer | null>;
  getByUserId(userId: string): Promise<Volunteer | null>;
  listActive(): Promise<Volunteer[]>;
  save(volunteer: Volunteer): Promise<Volunteer>;
  delete(id: string): Promise<void>;
}
export default IVolunteerRepository;
