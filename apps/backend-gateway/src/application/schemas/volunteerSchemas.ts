/**
 * StadiumOS AI — Volunteer Validation Schemas.
 * 
 * Defines Zod schemas for volunteer check-ins and status/location tracking.
 */

import { z } from "zod";
import { VolunteerStatus } from "../../domain/enums";

export const VolunteerCreateSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().min(8).max(30),
  skills: z.array(z.string()).default([]),
  assigned_sector_id: z.string().uuid().nullable().optional(),
  latitude: z.number().min(-90.0).max(90.0).default(0.0),
  longitude: z.number().min(-180.0).max(180.0).default(0.0)
});

export type VolunteerCreate = z.infer<typeof VolunteerCreateSchema>;

export const VolunteerLocationUpdateSchema = z.object({
  latitude: z.number().min(-90.0).max(90.0),
  longitude: z.number().min(-180.0).max(180.0)
});

export type VolunteerLocationUpdate = z.infer<typeof VolunteerLocationUpdateSchema>;

export const VolunteerStatusUpdateSchema = z.object({
  status: z.nativeEnum(VolunteerStatus)
});

export type VolunteerStatusUpdate = z.infer<typeof VolunteerStatusUpdateSchema>;
