/**
 * StadiumOS AI — Health & Readiness Probes Router.
 * 
 * Exposes /health (Liveness) and /ready (Readiness) probes checking database
 * and Redis connectivity states.
 */

import { Router, Response, NextFunction } from "express";
import { prisma } from "../../../infrastructure/database/prisma";
import { getRedisClient } from "../../../infrastructure/cache/redisClient";
import { logger } from "../../../infrastructure/logging/logger";

const router = Router();

// Liveness probe (is process alive)
router.get(
  "/health",
  (req: any, res: Response) => {
    res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
  }
);

// Readiness probe (is database and cache connected)
router.get(
  "/ready",
  async (req: any, res: Response) => {
    const checks: Record<string, string> = {
      database: "down",
      cache: "down"
    };
    
    let isReady = true;

    // 1. Inspect Database
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = "up";
    } catch (err: any) {
      logger.error("Readiness check database failure:", err.message);
      isReady = false;
    }

    // 2. Inspect Redis Cache
    try {
      const redis = getRedisClient();
      const ping = await redis.ping();
      if (ping === "PONG") {
        checks.cache = "up";
      } else {
        isReady = false;
      }
    } catch (err: any) {
      logger.error("Readiness check cache failure:", err.message);
      isReady = false;
    }

    const statusCode = isReady ? 200 : 503;
    res.status(statusCode).json({
      status: isReady ? "ready" : "not_ready",
      components: checks,
      timestamp: new Date().toISOString()
    });
  }
);

export { router as healthRouter };
export default router;
