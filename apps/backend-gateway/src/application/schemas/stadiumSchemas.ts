/**
 * StadiumOS AI — Stadium & Sector API Validation Schemas.
 * 
 * Defines Zod validation schemas for stadium and sector creation payloads.
 */

import { z } from "zod";

export const StadiumCreateSchema = z.object({
  name: z.string().min(2).max(150),
  city: z.string().min(2).max(100),
  country: z.string().min(2).max(100),
  latitude: z.number().min(-90.0).max(90.0),
  longitude: z.number().min(-180.0).max(180.0),
  total_capacity: z.number().int().positive(),
  timezone: z.string().min(2).max(50).default("UTC")
});

export type StadiumCreate = z.infer<typeof StadiumCreateSchema>;

export const SectorCreateSchema = z.object({
  name: z.string().min(2).max(100),
  max_capacity: z.number().int().positive(),
  warning_threshold_percent: z.number().min(50.0).max(100.0).default(80.0),
  critical_threshold_percent: z.number().min(70.0).max(100.0).default(95.0),
  centroid_latitude: z.number().min(-90.0).max(90.0),
  centroid_longitude: z.number().min(-180.0).max(180.0),
  is_accessible: z.boolean().default(false)
}).refine((data) => data.critical_threshold_percent > data.warning_threshold_percent, {
  message: "critical_threshold_percent must exceed warning_threshold_percent",
  path: ["critical_threshold_percent"]
});

export type SectorCreate = z.infer<typeof SectorCreateSchema>;
