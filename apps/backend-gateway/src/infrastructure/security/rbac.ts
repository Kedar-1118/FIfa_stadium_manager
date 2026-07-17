/**
 * StadiumOS AI — Authentication & Role-Based Access Control Middlewares.
 * 
 * Verifies JWT session headers and asserts RBAC role levels hierarchies.
 */

import { Request, Response, NextFunction } from "express";
import { UserRole } from "../../domain/enums";
import { AuthenticationError, AuthorizationError } from "../../domain/exceptions";
import { verifyToken } from "./securityHelpers";
import { prisma } from "../database/prisma";
import { User } from "../../domain/entities/user";

export interface AuthenticatedRequest extends Request {
  user?: User;
}

/**
 * Express middleware to extract JWT Bearer token and verify User profile existence.
 */
export async function authenticateMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next(new AuthenticationError("Authorization header is missing or malformed."));
    return;
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    next(new AuthenticationError("Bearer token credentials missing."));
    return;
  }

  try {
    const payload = verifyToken(token, "access");
    const userId = payload.sub;

    if (!userId) {
      throw new AuthenticationError("Invalid access token structure.");
    }

    // Load active profile from database
    const userModel = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!userModel) {
      throw new AuthenticationError("Authenticated user account was not found.");
    }

    if (!userModel.is_active) {
      throw new AuthenticationError("Authenticated user account is deactivated.");
    }

    // Map database model to domain Entity instance
    req.user = new User(
      userModel.id,
      userModel.email,
      userModel.hashed_password,
      userModel.role as UserRole,
      userModel.is_active,
      userModel.created_at,
      userModel.updated_at
    );

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Parametric middleware factory enforcing minimum RBAC authorization level.
 */
export function requireRole(requiredRole: UserRole) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AuthenticationError("User session context is unauthenticated."));
      return;
    }

    if (!req.user.hasPermission(requiredRole)) {
      next(new AuthorizationError(requiredRole, req.user.role));
      return;
    }

    next();
  };
}
