/**
 * StadiumOS AI — Authentication API Integration Tests.
 * 
 * Asserts registration schemas, login token signatures, and schema errors.
 */

import request from "supertest";
import { jest } from "@jest/globals";
import server from "../src/server";
import { prisma } from "../src/infrastructure/database/prisma";
import { hashPassword } from "../src/infrastructure/security/securityHelpers";
import { UserRole } from "../src/domain/enums";

describe("Auth API Endpoints - Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/v1/auth/register", () => {
    it("should register a new system operator successfully", async () => {
      // Mock unique email check
      jest.spyOn(prisma.user, "findUnique").mockResolvedValue(null);
      // Mock db commit upsert
      jest.spyOn(prisma.user, "upsert").mockResolvedValue({
        id: "user-uuid-1",
        email: "operator@stadiumos.com",
        hashed_password: "hashed_password_val",
        role: "OPERATOR",
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      } as any);

      const res = await request(server)
        .post("/api/v1/auth/register")
        .send({
          email: "operator@stadiumos.com",
          password: "SuperSecretPassword123",
          role: UserRole.OPERATOR
        });

      expect(res.status).toBe(201);
      expect(res.body.email).toBe("operator@stadiumos.com");
      expect(res.body.role).toBe("OPERATOR");
    });

    it("should reject registering with a malformed email structure (Zod Validation)", async () => {
      const res = await request(server)
        .post("/api/v1/auth/register")
        .send({
          email: "malformed-email",
          password: "password123"
        });

      expect(res.status).toBe(422); // Unprocessable Entity
      expect(res.body.error_code).toBe("VALIDATION_FAILED");
    });
  });

  describe("POST /api/v1/auth/login", () => {
    it("should authenticate operator and yield JWT access tokens", async () => {
      const plainPassword = "SuperSecretPassword123";
      const hashed = await hashPassword(plainPassword);

      // Mock user lookup match
      jest.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: "user-uuid-1",
        email: "operator@stadiumos.com",
        hashed_password: hashed,
        role: "OPERATOR",
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      } as any);

      const res = await request(server)
        .post("/api/v1/auth/login")
        .send({
          email: "operator@stadiumos.com",
          password: plainPassword
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("access_token");
      expect(res.body.token_type).toBe("bearer");
      expect(res.body.user.role).toBe("OPERATOR");
    });

    it("should fail authentication on incorrect password matching", async () => {
      const hashed = await hashPassword("correct-password");

      jest.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: "user-uuid-1",
        email: "operator@stadiumos.com",
        hashed_password: hashed,
        role: "OPERATOR",
        is_active: true
      } as any);

      const res = await request(server)
        .post("/api/v1/auth/login")
        .send({
          email: "operator@stadiumos.com",
          password: "wrong-password"
        });

      expect(res.status).toBe(401);
      expect(res.body.error_code).toBe("AUTHENTICATION_FAILED");
    });
  });
});
