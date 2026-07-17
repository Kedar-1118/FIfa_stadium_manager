/**
 * StadiumOS AI — Gate Controls API Integration & RBAC tests.
 * 
 * Verifies that role guards block unauthenticated logins, and that status
 * updates sync to Prisma DB and the Redis cache.
 */

import request from "supertest";
import { jest } from "@jest/globals";
import server from "../src/server";
import { prisma } from "../src/infrastructure/database/prisma";
import { createAccessToken } from "../src/infrastructure/security/securityHelpers";
import { getRedisClient } from "../src/infrastructure/cache/redisClient";
import { GateStatus } from "../src/domain/enums";

describe("Gates API Endpoints - Integration Tests", () => {
  const adminToken = createAccessToken("admin-user-id", "ADMIN");
  const operatorToken = createAccessToken("op-user-id", "OPERATOR");
  const fanToken = createAccessToken("fan-user-id", "FAN");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("PATCH /api/v1/gates/:id/status", () => {
    it("should allow an OPERATOR to override gate status and sync to cache", async () => {
      const mockGateId = "00000000-0000-0000-0000-000000000001";
      
      // Mock loading the user profile during auth checks
      jest.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: "op-user-id",
        email: "operator@stadiumos.com",
        hashed_password: "hash",
        role: "OPERATOR",
        is_active: true
      } as any);

      // Mock loading the gate profile from DB
      jest.spyOn(prisma.gate, "findUnique").mockResolvedValue({
        id: mockGateId,
        sector_id: "sec-1",
        gate_code: "GATE_3A",
        status: GateStatus.CLOSED,
        latitude: 32.0,
        longitude: -97.0,
        is_bidirectional: true
      } as any);

      // Mock DB upsert
      jest.spyOn(prisma.gate, "upsert").mockResolvedValue({
        id: mockGateId,
        gate_code: "GATE_3A",
        status: GateStatus.OPEN
      } as any);

      const redis = getRedisClient();

      const res = await request(server)
        .patch(`/api/v1/gates/${mockGateId}/status`)
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({
          status: GateStatus.OPEN,
          reason: "Relieving heavy pedestrian congestion in Sector B." // Valid > 10 chars reason
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("OPEN");
      
      // Verify Redis cache synch command was invoked
      expect(redis.set).toHaveBeenCalledWith("gate:status:GATE_3A", "OPEN");
    });

    it("should deny access to FAN roles attempting overrides (RBAC Guard Check)", async () => {
      // Mock load FAN profile during auth checks
      jest.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: "fan-user-id",
        email: "fan@stadiumos.com",
        role: "FAN",
        is_active: true
      } as any);

      const res = await request(server)
        .patch("/api/v1/gates/some-id/status")
        .set("Authorization", `Bearer ${fanToken}`)
        .send({
          status: GateStatus.OPEN,
          reason: "Relieving congestion."
        });

      expect(res.status).toBe(403);
      expect(res.body.error_code).toBe("INSUFFICIENT_PERMISSIONS");
    });

    it("should reject updates with short reason explanations (Zod schema fail)", async () => {
      jest.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: "op-user-id",
        role: "OPERATOR",
        is_active: true
      } as any);

      const res = await request(server)
        .patch("/api/v1/gates/some-id/status")
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({
          status: GateStatus.OPEN,
          reason: "Too short" // Less than 10 characters
        });

      expect(res.status).toBe(422);
      expect(res.body.error_code).toBe("VALIDATION_FAILED");
    });
  });
});
