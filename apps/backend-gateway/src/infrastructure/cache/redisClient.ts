/**
 * StadiumOS AI — ioredis Client Connection Management.
 * 
 * Manages the Redis connection pool using ioredis.
 */

import Redis from "ioredis";
import { config } from "../../config";
import { logger } from "../logging/logger";

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    logger.info("Initializing ioredis client...");
    redisClient = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
      reconnectOnError: (err) => {
        const targetError = "READONLY";
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      }
    });

    redisClient.on("error", (err) => {
      logger.error({ error: err.message }, "Redis connection error");
    });

    redisClient.on("connect", () => {
      logger.info("Redis connected successfully.");
    });
  }
  return redisClient;
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    logger.info("Closing Redis connection client...");
    await redisClient.quit();
    redisClient = null;
  }
}
