/**
 * StadiumOS AI — Incident API Routing Handlers.
 * 
 * Exposes API routes for reporting, assigning, and resolving safety and medical incidents.
 */

import { Router, Response, NextFunction } from "express";
import { PrismaIncidentRepository } from "../../../infrastructure/repositories/incidentRepository";
import { PrismaVolunteerRepository } from "../../../infrastructure/repositories/volunteerRepository";
import { PrismaStadiumRepository } from "../../../infrastructure/repositories/stadiumRepository";
import { IncidentService } from "../../../application/services/incidentService";
import {
  IncidentCreateSchema,
  IncidentAssignSchema,
  IncidentResolveSchema,
  IncidentStatusUpdateSchema,
} from "../../../application/schemas/incidentSchemas";
import { authenticateMiddleware, requireRole, AuthenticatedRequest } from "../../../infrastructure/security/rbac";
import { UserRole } from "../../../domain/enums";

const router = Router();
const incidentRepo = new PrismaIncidentRepository();
const volunteerRepo = new PrismaVolunteerRepository();
const stadiumRepo = new PrismaStadiumRepository();
const incidentService = new IncidentService(incidentRepo, volunteerRepo, stadiumRepo);

router.post(
  "/",
  authenticateMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const payload = IncidentCreateSchema.parse(req.body);
      const result = await incidentService.reportIncident(req.user!.id, payload);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/",
  authenticateMiddleware,
  requireRole(UserRole.OPERATOR),
  async (req: any, res: Response, next: NextFunction) => {
    try {
      const list = await incidentService.listActiveIncidents();
      res.status(200).json(list);
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/:id",
  authenticateMiddleware,
  requireRole(UserRole.OPERATOR),
  async (req: any, res: Response, next: NextFunction) => {
    try {
      const incident = await incidentService.getIncident(req.params.id);
      res.status(200).json(incident);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/:id/assign",
  authenticateMiddleware,
  requireRole(UserRole.OPERATOR),
  async (req: any, res: Response, next: NextFunction) => {
    try {
      const payload = IncidentAssignSchema.parse(req.body);
      const result = await incidentService.assignVolunteer(req.params.id, payload);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/:id/resolve",
  authenticateMiddleware,
  requireRole(UserRole.OPERATOR),
  async (req: any, res: Response, next: NextFunction) => {
    try {
      const payload = IncidentResolveSchema.parse(req.body);
      const result = await incidentService.resolveIncident(req.params.id, payload);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  "/:id/status",
  authenticateMiddleware,
  requireRole(UserRole.OPERATOR),
  async (req: any, res: Response, next: NextFunction) => {
    try {
      const payload = IncidentStatusUpdateSchema.parse(req.body);
      const result = await incidentService.updateIncidentStatus(req.params.id, payload);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

export { router as incidentRouter };
export default incidentRouter;
