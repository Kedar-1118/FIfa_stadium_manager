/**
 * StadiumOS AI — Gate Validation Schemas.
 * 
 * Defines Zod schemas for gate creation and state modifications.
 */

import { z } from "zod";
import { GateStatus } from "../../domain/enums";

export const GateCreateSchema = z.object({
  gate_code: z.string().min(2).max(50),
  latitude: z.number().min(-90.0).max(90.0),
  longitude: z.number().min(-180.0).max(180.0),
  status: z.nativeEnum(GateStatus).default(GateStatus.CLOSED),
  is_bidirectional: z.boolean().default(true)
});

export type GateCreate = z.infer<typeof GateCreateSchema>;

export const GateStatusUpdateSchema = z.object({
  status: z.nativeEnum(GateStatus),
  reason: z.string().min(10, "A detailed operational reason (minimum 10 characters) is required.")
});

export type GateStatusUpdate = z.infer<typeof GateStatusUpdateSchema>;
