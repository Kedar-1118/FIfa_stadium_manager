/**
 * StadiumOS AI — Gate API Routing Handlers.
 * 
 * Exposes API routes for configuring entrance/exit gates and modifying their statuses.
 */

import { Router, Response, NextFunction } from "express";
import { PrismaGateRepository } from "../../../infrastructure/repositories/gateRepository";
import { GateService } from "../../../application/services/gateService";
import { CacheService } from "../../../infrastructure/cache/cacheService";
import { GateCreateSchema, GateStatusUpdateSchema } from "../../../application/schemas/gateSchemas";
import { authenticateMiddleware, requireRole } from "../../../infrastructure/security/rbac";
import { UserRole } from "../../../domain/enums";

const router = Router();
const gateRepo = new PrismaGateRepository();
const cacheService = new CacheService();
const gateService = new GateService(gateRepo, cacheService);

// 1. Create Gate inside sector (decoding target sectorId path param)
router.post(
  "/sectors/:sectorId/gates",
  authenticateMiddleware,
  requireRole(UserRole.OPERATOR),
  async (req: any, res: Response, next: NextFunction) => {
    try {
      const payload = GateCreateSchema.parse(req.body);
      const result = await gateService.createGate(req.params.sectorId, payload);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// 2. List gates within a sector
router.get(
  "/sectors/:sectorId/gates",
  async (req: any, res: Response, next: NextFunction) => {
    try {
      const list = await gateService.listGates(req.params.sectorId);
      res.status(200).json(list);
    } catch (err) {
      next(err);
    }
  }
);

// 3. Update Gate status (direct PATCH)
router.patch(
  "/:id/status",
  authenticateMiddleware,
  requireRole(UserRole.OPERATOR),
  async (req: any, res: Response, next: NextFunction) => {
    try {
      const payload = GateStatusUpdateSchema.parse(req.body);
      const result = await gateService.updateGateStatus(req.params.id, payload);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

export { router as gateRouter };
export default gateRouter;
