/**
 * StadiumOS AI — Gate Repository Port.
 * 
 * Defines the abstract interface for physical Gate database actions.
 */

import { Gate } from "../../domain/entities/gate";

export interface IGateRepository {
  getById(id: string): Promise<Gate | null>;
  getByCode(code: string): Promise<Gate | null>;
  listBySector(sectorId: string): Promise<Gate[]>;
  save(gate: Gate): Promise<Gate>;
  delete(id: string): Promise<void>;
}
export default IGateRepository;
