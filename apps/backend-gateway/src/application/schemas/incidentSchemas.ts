/**
 * StadiumOS AI — Incident Validation Schemas.
 * 
 * Defines Zod validation schemas for incident reporting, updates, and dispatches.
 */

import { z } from "zod";
import { IncidentSeverity, IncidentStatus } from "../../domain/enums";

export const IncidentCreateSchema = z.object({
  incident_type: z.string().min(2).max(100),
  severity: z.nativeEnum(IncidentSeverity).default(IncidentSeverity.LOW),
  description: z.string().min(5),
  latitude: z.number().min(-90.0).max(90.0),
  longitude: z.number().min(-180.0).max(180.0),
  sector_id: z.string().uuid(),
  gate_id: z.string().uuid().nullable().optional()
});

export type IncidentCreate = z.infer<typeof IncidentCreateSchema>;

export const IncidentAssignSchema = z.object({
  volunteer_id: z.string().uuid()
});

export type IncidentAssign = z.infer<typeof IncidentAssignSchema>;

export const IncidentResolveSchema = z.object({
  resolution_notes: z.string().min(5, "Resolution notes must be at least 5 characters long.")
});

export type IncidentResolve = z.infer<typeof IncidentResolveSchema>;

export const IncidentStatusUpdateSchema = z.object({
  status: z.nativeEnum(IncidentStatus)
});

export type IncidentStatusUpdate = z.infer<typeof IncidentStatusUpdateSchema>;
