/**
 * StadiumOS AI Gateway — Server Bootstrap.
 * 
 * Configures express servers, registers middleware handlers, wires versioned
 * routers, and mounts the WebSocket upgraded server gateway.
 */

import http from "http";
import express from "express";
import cors from "cors";
import { config } from "./config";
import { logger } from "./infrastructure/logging/logger";
import { requestLoggingMiddleware } from "./interfaces/middleware/requestLogging";
import { errorHandlerMiddleware } from "./interfaces/middleware/errorHandler";
import { defaultRateLimiter } from "./interfaces/middleware/rateLimiter";
import { wsConnectionManager } from "./interfaces/api/v1/websocketRouter";
import { prisma } from "./infrastructure/database/prisma";
import { hashPassword } from "./infrastructure/security/securityHelpers";

// Versioned routers imports
import { authRouter } from "./interfaces/api/v1/authRouter";
import { stadiumRouter } from "./interfaces/api/v1/stadiumRouter";
import { gateRouter } from "./interfaces/api/v1/gateRouter";
import { volunteerRouter } from "./interfaces/api/v1/volunteerRouter";
import { incidentRouter } from "./interfaces/api/v1/incidentRouter";
import { crowdRouter } from "./interfaces/api/v1/crowdRouter";
import { agentRouter } from "./interfaces/api/v1/agentRouter";
import { healthRouter } from "./interfaces/api/v1/healthRouter";

import compression from "compression";

const app = express();
const server = http.createServer(app);

// 1. Cross-Cutting Concerns & Security Headers
app.use(compression()); // Compress all payloads
app.use(cors());
app.use(express.json());
app.use(requestLoggingMiddleware);
app.use(defaultRateLimiter);

// 2. Register Health Probes (unrestricted liveness/readiness)
app.use("/", healthRouter);

// 3. Register Versioned Router Endpoints
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/stadiums", stadiumRouter);
app.use("/api/v1/gates", gateRouter);
app.use("/api/v1/volunteers", volunteerRouter);
app.use("/api/v1/incidents", incidentRouter);
app.use("/api/v1/crowd", crowdRouter);
app.use("/api/v1/agents", agentRouter);

// 4. Global Error Catching Middleware (MUST be declared last)
app.use(errorHandlerMiddleware);

// 5. Initialize Upgraded WebSocket Gateway on Server Instance
wsConnectionManager.initialize(server);

// Start server listening
server.listen(config.port, () => {
  logger.info(`${config.appName} listening on port ${config.port} in ${config.nodeEnv} mode`);
  
  // Auto-seed default credentials
  (async () => {
    const adminEmail = "admin@stadiumos.com";
    const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!existing) {
      const hashedPassword = await hashPassword("password123");
      await prisma.user.create({
        data: {
          email: adminEmail,
          hashed_password: hashedPassword,
          role: "ADMIN",
          is_active: true
        }
      });
      logger.info(`Default administrator user seeded: ${adminEmail} / password123`);
    }
  })().catch(err => logger.error("Startup seeding failed:", err));
});

export default server;
