/**
 * StadiumOS AI — Volunteer API Routing Handlers.
 * 
 * Exposes API routes for volunteer shift sign-ins, coordinate updates,
 * and geo-spatial searches.
 */

import { Router, Response, NextFunction } from "express";
import { PrismaVolunteerRepository } from "../../../infrastructure/repositories/volunteerRepository";
import { VolunteerService } from "../../../application/services/volunteerService";
import { CacheService } from "../../../infrastructure/cache/cacheService";
import {
  VolunteerCreateSchema,
  VolunteerLocationUpdateSchema,
  VolunteerStatusUpdateSchema,
} from "../../../application/schemas/volunteerSchemas";
import { authenticateMiddleware, requireRole, AuthenticatedRequest } from "../../../infrastructure/security/rbac";
import { UserRole } from "../../../domain/enums";

const router = Router();
const volunteerRepo = new PrismaVolunteerRepository();
const cacheService = new CacheService();
const volunteerService = new VolunteerService(volunteerRepo, cacheService);

router.post(
  "/checkin",
  authenticateMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const payload = VolunteerCreateSchema.parse(req.body);
      const result = await volunteerService.checkInVolunteer(req.user!.id, payload);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  "/:id/location",
  authenticateMiddleware,
  requireRole(UserRole.VOLUNTEER),
  async (req: any, res: Response, next: NextFunction) => {
    try {
      const payload = VolunteerLocationUpdateSchema.parse(req.body);
      const result = await volunteerService.updateLocation(req.params.id, payload);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  "/:id/status",
  authenticateMiddleware,
  requireRole(UserRole.VOLUNTEER),
  async (req: any, res: Response, next: NextFunction) => {
    try {
      const payload = VolunteerStatusUpdateSchema.parse(req.body);
      const result = await volunteerService.updateStatus(req.params.id, payload);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// Operator-only search nearby volunteers API
router.get(
  "/search/nearby",
  authenticateMiddleware,
  requireRole(UserRole.OPERATOR),
  async (req: any, res: Response, next: NextFunction) => {
    try {
      const lat = parseFloat(req.query.latitude as string);
      const lon = parseFloat(req.query.longitude as string);
      const radius = parseFloat(req.query.radius_meters as string || "500");
      const skill = req.query.required_skill as string;

      if (isNaN(lat) || isNaN(lon)) {
        return res.status(400).json({ success: false, error: "Query latitude and longitude are required numerical inputs." });
      }

      const results = await volunteerService.searchNearby(lat, lon, radius, skill);
      res.status(200).json(results);
    } catch (err) {
      next(err);
    }
  }
);

export { router as volunteerRouter };
export default router;
