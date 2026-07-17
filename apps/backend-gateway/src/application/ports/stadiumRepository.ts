/**
 * StadiumOS AI — Stadium & Sector Repository Port.
 * 
 * Defines the abstract interface for Stadium and Sector persistence.
 */

import { Stadium } from "../../domain/entities/stadium";
import { Sector } from "../../domain/entities/sector";

export interface IStadiumRepository {
  getById(id: string): Promise<Stadium | null>;
  getByName(name: string): Promise<Stadium | null>;
  listAll(): Promise<Stadium[]>;
  save(stadium: Stadium): Promise<Stadium>;
  delete(id: string): Promise<void>;

  // Sectors
  getSectorById(id: string): Promise<Sector | null>;
  listSectorsByStadium(stadiumId: string): Promise<Sector[]>;
  saveSector(sector: Sector): Promise<Sector>;
  deleteSector(id: string): Promise<void>;
}
export default IStadiumRepository;
