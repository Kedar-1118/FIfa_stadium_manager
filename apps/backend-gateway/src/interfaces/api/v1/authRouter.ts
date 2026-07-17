/**
 * StadiumOS AI — Authentication Routing Handlers.
 * 
 * Exposes API routes for user logins, registrations, and profile checks.
 */

import { Router, Response, NextFunction } from "express";
import { PrismaUserRepository } from "../../../infrastructure/repositories/userRepository";
import { AuthService } from "../../../application/services/authService";
import {
  RegisterRequestSchema,
  LoginRequestSchema,
  RefreshTokenRequestSchema,
} from "../../../application/schemas/authSchemas";
import { createRateLimiter } from "../../middleware/rateLimiter";
import { authenticateMiddleware, AuthenticatedRequest } from "../../../infrastructure/security/rbac";

const router = Router();
const userRepo = new PrismaUserRepository();
const authService = new AuthService(userRepo);

// Specific rate limit configurations
const registerLimiter = createRateLimiter(10, 60 * 1000);
const loginLimiter = createRateLimiter(20, 60 * 1000);
const refreshLimiter = createRateLimiter(30, 60 * 1000);

router.post(
  "/register",
  registerLimiter,
  async (req: any, res: Response, next: NextFunction) => {
    try {
      // Validate inputs using Zod
      const payload = RegisterRequestSchema.parse(req.body);
      const result = await authService.register(payload);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/login",
  loginLimiter,
  async (req: any, res: Response, next: NextFunction) => {
    try {
      const payload = LoginRequestSchema.parse(req.body);
      const result = await authService.login(payload);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/refresh",
  refreshLimiter,
  async (req: any, res: Response, next: NextFunction) => {
    try {
      const payload = RefreshTokenRequestSchema.parse(req.body);
      const result = await authService.refreshTokens(payload.refresh_token);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/me",
  authenticateMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    res.status(200).json({
      id: user.id,
      email: user.email,
      role: user.role,
      is_active: user.is_active
    });
  }
);

export { router as authRouter };
export default router;
