/**
 * StadiumOS AI — Pino Structured Logger.
 * 
 * Provides unified, structured JSON logger configs.
 */

import pino from "pino";
import { config } from "../../config";

// Setup transport for pretty console output in development
const transport = config.logFormat === "console"
  ? {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "UTC:yyyy-mm-dd HH:MM:ss.l",
        ignore: "pid,hostname"
      }
    }
  : undefined;

export const logger = pino({
  level: config.logLevel,
  transport
});

export default logger;
