/**
 * StadiumOS AI — Central Configuration Module.
 * 
 * Validates and parses environment variables on boot using Zod to ensure type-safe settings
 * (equivalent to Pydantic BaseSettings in Python).
 */

import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

// Load environment variables from local .env
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Define Zod validation schema for environmental settings
const ConfigSchema = z.object({
  appName: z.string().default("StadiumOS AI Gateway"),
  nodeEnv: z.enum(["development", "production", "test"]).default("development"),
  port: z.coerce.number().default(8000),
  
  // Database & Cache Connections
  databaseUrl: z.string().url(),
  redisUrl: z.string().url(),
  
  // Security
  jwtSecretKey: z.string().min(32, "JWT_SECRET_KEY must be at least 32 characters long."),
  jwtAccessExpireMinutes: z.coerce.number().default(60),
  jwtRefreshExpireDays: z.coerce.number().default(7),
  
  // Rate Limiting
  rateLimitPerMinute: z.coerce.number().default(120),
  
  // Service-to-Service Secret Authentication
  agentMeshUrl: z.string().url().default("http://localhost:8001/api/v1/agents"),
  internalServiceKey: z.string().default("gateway-agent-secret-handshake"),
  
  // Logger settings
  logLevel: z.enum(["debug", "info", "warn", "error"]).default("info"),
  logFormat: z.enum(["console", "json"]).default("console")
});

export type Config = z.infer<typeof ConfigSchema>;

let validatedConfig: Config;

try {
  validatedConfig = ConfigSchema.parse({
    appName: process.env.APP_NAME,
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
    databaseUrl: process.env.DATABASE_URL || "postgresql://stadiumos:stadiumos_secret@localhost:5432/stadiumos_db?schema=public",
    redisUrl: process.env.REDIS_URL || "redis://localhost:6379/0",
    jwtSecretKey: process.env.JWT_SECRET_KEY || "dev-only-insecure-key-change-in-production-minimum-32-chars",
    jwtAccessExpireMinutes: process.env.JWT_ACCESS_TOKEN_EXPIRE_MINUTES,
    jwtRefreshExpireDays: process.env.JWT_REFRESH_TOKEN_EXPIRE_DAYS,
    rateLimitPerMinute: process.env.RATE_LIMIT_PER_MINUTE,
    agentMeshUrl: process.env.AGENT_MESH_URL,
    internalServiceKey: process.env.INTERNAL_SERVICE_KEY,
    logLevel: process.env.LOG_LEVEL,
    logFormat: process.env.LOG_FORMAT
  });
} catch (err: any) {
  if (err instanceof z.ZodError) {
    console.error("Configuration validation failed:");
    err.errors.forEach((e) => {
      console.error(` - Field '${e.path.join(".")}': ${e.message}`);
    });
  } else {
    console.error("Unexpected error parsing configuration:", err);
  }
  process.exit(1);
}

if (validatedConfig.nodeEnv === "production" && 
    validatedConfig.jwtSecretKey.includes("dev-only-insecure-key")) {
  console.error("FATAL SECURITY BREACH: Default insecure JWT secret key cannot be used in production.");
  process.exit(1);
}

export const config = validatedConfig;
