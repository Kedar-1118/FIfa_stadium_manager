/**
 * StadiumOS AI — Authentication Input Schemas.
 * 
 * Defines Zod validation schemas for registration, login, and token refreshes.
 */

import { z } from "zod";
import { UserRole } from "../../domain/enums";

export const RegisterRequestSchema = z.object({
  email: z.string().email("Invalid email format."),
  password: z.string().min(8, "Password must be at least 8 characters long."),
  role: z.nativeEnum(UserRole).default(UserRole.FAN)
});

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().email("Invalid email format."),
  password: z.string()
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const RefreshTokenRequestSchema = z.object({
  refresh_token: z.string()
});

export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequestSchema>;
