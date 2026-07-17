/**
 * StadiumOS AI — Stadium & Sector API Routing Handlers.
 * 
 * Exposes API routes for managing stadium profiles and sub-sectors.
 */

import { Router, Response, NextFunction } from "express";
import { PrismaStadiumRepository } from "../../../infrastructure/repositories/stadiumRepository";
import { StadiumService } from "../../../application/services/stadiumService";
import { StadiumCreateSchema, SectorCreateSchema } from "../../../application/schemas/stadiumSchemas";
import { authenticateMiddleware, requireRole } from "../../../infrastructure/security/rbac";
import { UserRole } from "../../../domain/enums";

const router = Router();
const stadiumRepo = new PrismaStadiumRepository();
const stadiumService = new StadiumService(stadiumRepo);

router.post(
  "/",
  authenticateMiddleware,
  requireRole(UserRole.ADMIN),
  async (req: any, res: Response, next: NextFunction) => {
    try {
      const payload = StadiumCreateSchema.parse(req.body);
      const result = await stadiumService.createStadium(payload);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/",
  async (req: any, res: Response, next: NextFunction) => {
    try {
      const list = await stadiumService.listStadiums();
      res.status(200).json(list);
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/:id",
  async (req: any, res: Response, next: NextFunction) => {
    try {
      const stadium = await stadiumService.getStadium(req.params.id);
      res.status(200).json(stadium);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/:id/sectors",
  authenticateMiddleware,
  requireRole(UserRole.OPERATOR),
  async (req: any, res: Response, next: NextFunction) => {
    try {
      const payload = SectorCreateSchema.parse(req.body);
      const result = await stadiumService.createSector(req.params.id, payload);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/:id/sectors",
  async (req: any, res: Response, next: NextFunction) => {
    try {
      const sectors = await stadiumService.listSectors(req.params.id);
      res.status(200).json(sectors);
    } catch (err) {
      next(err);
    }
  }
);

export { router as stadiumRouter };
export default router;
