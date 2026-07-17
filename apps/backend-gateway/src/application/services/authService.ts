/**
 * StadiumOS AI — Authentication Service.
 * 
 * Coordinates registration logic, password matching, and JWT token signatures.
 */

import { v4 as uuidv4 } from "uuid";
import { IUserRepository } from "../ports/userRepository";
import { RegisterRequest, LoginRequest } from "../schemas/authSchemas";
import { User } from "../../domain/entities/user";
import { DuplicateEntityError, AuthenticationError } from "../../domain/exceptions";
import {
  hashPassword,
  verifyPassword,
  createAccessToken,
  createRefreshToken,
  verifyToken,
} from "../../infrastructure/security/securityHelpers";
import { logger } from "../../infrastructure/logging/logger";

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: {
    id: string;
    email: string;
    role: string;
    is_active: boolean;
  };
}

export class AuthService {
  private userRepo: IUserRepository;

  constructor(userRepo: IUserRepository) {
    this.userRepo = userRepo;
  }

  public async register(req: RegisterRequest): Promise<any> {
    const existing = await this.userRepo.getByEmail(req.email);
    if (existing) {
      throw new DuplicateEntityError("User", "email", req.email);
    }

    const hashed = await hashPassword(req.password);
    const newUser = new User(
      uuidv4(),
      req.email.toLowerCase().trim(),
      hashed,
      req.role,
      true
    );

    const saved = await this.userRepo.save(newUser);
    logger.info({ userId: saved.id, role: saved.role }, "User registered successfully");

    return {
      id: saved.id,
      email: saved.email,
      role: saved.role,
      is_active: saved.is_active
    };
  }

  public async login(req: LoginRequest): Promise<TokenResponse> {
    const user = await this.userRepo.getByEmail(req.email);
    if (!user) {
      throw new AuthenticationError("Invalid email or password.");
    }

    if (!user.is_active) {
      throw new AuthenticationError("User account is deactivated.");
    }

    const isMatch = await verifyPassword(req.password, user.hashedPassword);
    if (!isMatch) {
      throw new AuthenticationError("Invalid email or password.");
    }

    const access = createAccessToken(user.id, user.role);
    const refresh = createRefreshToken(user.id);

    logger.info({ userId: user.id }, "User logged in successfully");

    return {
      access_token: access,
      refresh_token: refresh,
      token_type: "bearer",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        is_active: user.is_active
      }
    };
  }

  public async refreshTokens(refreshToken: string): Promise<TokenResponse> {
    const payload = verifyToken(refreshToken, "refresh");
    const userId = payload.sub;

    if (!userId) {
      throw new AuthenticationError("Invalid refresh token claims.");
    }

    const user = await this.userRepo.getById(userId);
    if (!user || !user.is_active) {
      throw new AuthenticationError("Associated user account is deactivated or missing.");
    }

    const newAccess = createAccessToken(user.id, user.role);
    const newRefresh = createRefreshToken(user.id);

    logger.info({ userId: user.id }, "Token pair refreshed successfully");

    return {
      access_token: newAccess,
      refresh_token: newRefresh,
      token_type: "bearer",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        is_active: user.is_active
      }
    };
  }
}
