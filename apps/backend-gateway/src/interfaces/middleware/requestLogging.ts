/**
 * StadiumOS AI — Request Logging Middleware.
 * 
 * Intercepts requests to inject correlation transaction IDs, log route entries,
 * and track request latency durations.
 */

import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../../infrastructure/logging/logger";

export interface LoggedRequest extends Request {
  requestId?: string;
  startTime?: [number, number];
}

export function requestLoggingMiddleware(
  req: LoggedRequest,
  res: Response,
  next: NextFunction
): void {
  // Extract or generate unique request ID
  const requestId = (req.headers["x-request-id"] as string) || uuidv4();
  req.requestId = requestId;
  req.startTime = process.hrtime();

  // Attach request ID to response header
  res.setHeader("X-Request-ID", requestId);

  const clientIp = req.ip || req.socket.remoteAddress || "unknown";

  // Bind trace info to local logger context
  const childLogger = logger.child({
    requestId,
    method: req.method,
    path: req.url,
    clientIp
  });

  childLogger.info("Request started");

  res.on("finish", () => {
    const elapsed = process.hrtime(req.startTime);
    // Convert hrtime to duration in milliseconds
    const durationMs = (elapsed[0] * 1000 + elapsed[1] / 1e6).toFixed(2);
    
    childLogger.info(
      {
        statusCode: res.statusCode,
        durationMs: parseFloat(durationMs)
      },
      "Request completed"
    );
  });

  next();
}
