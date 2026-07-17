/**
 * StadiumOS AI — Prisma Database Adapter.
 * 
 * Provides the single cached PrismaClient database adapter connection singleton.
 */

import { PrismaClient } from "@prisma/client";
import { config } from "../../config";

// Singleton PrismaClient instance
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: config.databaseUrl
    }
  },
  log: config.logLevel === "debug" ? ["query", "info", "warn", "error"] : ["error"]
});

export default prisma;
export { prisma };
