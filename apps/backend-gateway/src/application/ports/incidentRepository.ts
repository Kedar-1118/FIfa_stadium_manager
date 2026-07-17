/**
 * StadiumOS AI — Incident Repository Port.
 * 
 * Defines the abstract interface for Incident database actions.
 */

import { Incident } from "../../domain/entities/incident";

export interface IIncidentRepository {
  getById(id: string): Promise<Incident | null>;
  listActive(limit?: number, offset?: number): Promise<Incident[]>;
  listBySector(sectorId: string): Promise<Incident[]>;
  save(incident: Incident): Promise<Incident>;
  delete(id: string): Promise<void>;
  countActive(): Promise<number>;
}
export default IIncidentRepository;
