/**
 * StadiumOS AI — LangGraph Shared State Definitions.
 * 
 * Configures the Zod validation schemas and TypeScript types representing
 * the global shared state container updated by agents during reasoning cycles.
 */

import { z } from "zod";

// Zod schema for telemetry alerts triggers
export const TelemetryAlertSchema = z.object({
  source: z.string(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  description: z.string(),
  timestamp: z.string().datetime()
});

export type TelemetryAlert = z.infer<typeof TelemetryAlertSchema>;

// Zod schema for gate profiles telemetry snapshots
export const GateStatusTelemetrySchema = z.object({
  gate_id: z.string().uuid(),
  gate_code: z.string(),
  status: z.string(),
  flow_rate_per_min: z.number().int().nonnegative(),
  wait_time_seconds: z.number().int().nonnegative()
});

export type GateStatusTelemetry = z.infer<typeof GateStatusTelemetrySchema>;

// Zod schema representing the active Digital Twin state snapshot
export const DigitalTwinSnapshotSchema = z.object({
  overall_occupancy_percent: z.number().min(0.0).max(100.0),
  active_incidents_count: z.number().int().nonnegative(),
  gate_status: z.array(GateStatusTelemetrySchema)
});

export type DigitalTwinSnapshot = z.infer<typeof DigitalTwinSnapshotSchema>;

// Zod schema representing recommendations proposed by specialist agents
export const ProposedRecommendationSchema = z.object({
  id: z.string(),
  agent_name: z.string(),
  action_type: z.string(), // e.g. 'OPEN_GATE', 'REROUTE_CROWD'
  description: z.string(),
  target_entity_id: z.string().uuid(),
  confidence_score: z.number().min(0.0).max(1.0)
});

export type ProposedRecommendation = z.infer<typeof ProposedRecommendationSchema>;

// Zod schema mapping the final Orchestrator shared graph state
export const StadiumOSGraphStateSchema = z.object({
  incident_id: z.string().uuid(),
  stadium_id: z.string().uuid(),
  telemetry_alert: TelemetryAlertSchema,
  digital_twin_snapshot: DigitalTwinSnapshotSchema,
  agent_analyses: z.object({
    crowd: z.string().default(""),
    transport: z.string().default(""),
    security: z.string().default(""),
    volunteer: z.string().default("")
  }).default({}),
  proposed_recommendations: z.array(ProposedRecommendationSchema).default([]),
  execution_log: z.array(z.string()).default([])
});

export type StadiumOSGraphState = z.infer<typeof StadiumOSGraphStateSchema>;
