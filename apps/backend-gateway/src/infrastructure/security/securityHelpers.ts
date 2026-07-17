/**
 * StadiumOS AI — Security Helpers.
 * 
 * Implements bcrypt password hashing and JSON Web Token (JWT) signatures validations.
 */

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../../config";
import { AuthenticationError } from "../../domain/exceptions";
import { logger } from "../logging/logger";

/**
 * Hash a password using bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
}

/**
 * Verify a password against a stored bcrypt hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

/**
 * Generate a short-lived JWT Access Token.
 */
export function createAccessToken(userId: string, role: string): string {
  const expire = Math.floor(Date.now() / 1000) + config.jwtAccessExpireMinutes * 60;
  const payload = {
    sub: userId,
    role,
    type: "access",
    exp: expire
  };
  return jwt.sign(payload, config.jwtSecretKey);
}

/**
 * Generate a long-lived JWT Refresh Token.
 */
export function createRefreshToken(userId: string): string {
  const expire = Math.floor(Date.now() / 1000) + config.jwtRefreshExpireDays * 24 * 60 * 60;
  const payload = {
    sub: userId,
    type: "refresh",
    exp: expire
  };
  return jwt.sign(payload, config.jwtSecretKey);
}

/**
 * Decode and validate a JSON Web Token.
 */
export function verifyToken(token: string, expectedType: "access" | "refresh"): any {
  try {
    const payload = jwt.verify(token, config.jwtSecretKey, {
      algorithms: ["HS256"]
    }) as any;
    
    if (payload.type !== expectedType) {
      throw new AuthenticationError("Invalid token type mapping.");
    }
    
    return payload;
  } catch (err: any) {
    logger.warn(`Token verification failed: ${err.message}`);
    throw new AuthenticationError("Invalid or expired authentication token.");
  }
}
