/**
 * StadiumOS AI — Express Rate Limiting Middleware.
 * 
 * Configures express-rate-limit utilizing Redis as distributed store cache,
 * with standard in-memory store fallback.
 */

import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { config } from "../../config";
import { getRedisClient } from "../../infrastructure/cache/redisClient";
import { logger } from "../../infrastructure/logging/logger";

let redisAvailable = false;

try {
  getRedisClient();
  redisAvailable = true;
} catch (err: any) {
  logger.warn("Redis client uninitialized. Falling back to local in-memory rate-limit store:", err.message);
}

let storeCounter = 0;

function createStore() {
  if (!redisAvailable) return undefined;
  try {
    const redis = getRedisClient();
    storeCounter++;
    return new RedisStore({
      // @ts-ignore
      sendCommand: (...args: string[]) => redis.call(args[0], ...args.slice(1)),
      prefix: `rl:${storeCounter}:`
    });
  } catch {
    return undefined;
  }
}

export function createRateLimiter(limitCount: number = config.rateLimitPerMinute, windowMs: number = 60 * 1000) {
  return rateLimit({
    windowMs,
    max: limitCount,
    standardHeaders: true,
    legacyHeaders: false,
    store: createStore(),
    handler: (req, res) => {
      logger.warn({ ip: req.ip, path: req.url }, "Rate limit threshold breached");
      res.status(429).json({
        success: false,
        error_code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests. Please slow down and try again later."
      });
    }
  });
}

// Default system rate limiter
export const defaultRateLimiter = createRateLimiter();
