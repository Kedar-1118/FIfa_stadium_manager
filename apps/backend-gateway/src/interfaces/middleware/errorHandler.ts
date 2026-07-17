/**
 * StadiumOS AI — Global Exception Handler Middleware.
 * 
 * Maps domain, validation, and system exceptions to standard JSONResponse objects.
 */

import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { logger } from "../../infrastructure/logging/logger";
import {
  StadiumOSError,
  EntityNotFoundError,
  DuplicateEntityError,
  AuthenticationError,
  AuthorizationError,
  BusinessRuleViolationError,
  InvalidStateTransitionError,
  ExternalServiceError,
} from "../../domain/exceptions";

export function errorHandlerMiddleware(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const reqId = (req as any).requestId || "none";
  
  // 1. Handle Zod input validation exceptions
  if (err instanceof z.ZodError) {
    const details = err.errors.map((e) => ({
      field: e.path.join(" -> "),
      type: e.code,
      message: e.message
    }));

    logger.warn({ reqId, errorsCount: details.length }, "Request validation failed");
    res.status(422).json({
      success: false,
      error_code: "VALIDATION_FAILED",
      message: "Input validation failed. Please check the fields specified.",
      details
    });
    return;
  }

  // 2. Handle Custom Domain Exceptions
  if (err instanceof StadiumOSError) {
    let statusCode = 400;

    if (err instanceof EntityNotFoundError) {
      statusCode = 404;
    } else if (err instanceof DuplicateEntityError) {
      statusCode = 409;
    } else if (err instanceof AuthenticationError) {
      statusCode = 401;
    } else if (err instanceof AuthorizationError) {
      statusCode = 403;
    } else if (err instanceof BusinessRuleViolationError) {
      statusCode = 422;
    } else if (err instanceof InvalidStateTransitionError) {
      statusCode = 409;
    } else if (err instanceof ExternalServiceError) {
      statusCode = 502;
    }

    logger.warn(
      { reqId, errorCode: err.errorCode, statusCode },
      `Domain exception occurred: ${err.message}`
    );

    res.status(statusCode).json({
      success: false,
      error_code: err.errorCode,
      message: err.message
    });
    return;
  }

  // 3. Fallback for unhandled server exceptions
  logger.error(
    { reqId, error: err.message, stack: err.stack },
    "Unhandled server error encountered"
  );

  res.status(500).json({
    success: false,
    error_code: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred on the server. Please contact support."
  });
}
