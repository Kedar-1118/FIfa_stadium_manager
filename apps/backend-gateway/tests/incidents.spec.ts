/**
 * StadiumOS AI — Incident Triage API Integration tests.
 * 
 * Verifies incident reports, volunteer assignments allocations, and closing resolutions.
 */

import request from "supertest";
import { jest } from "@jest/globals";
import server from "../src/server";
import { prisma } from "../src/infrastructure/database/prisma";
import { createAccessToken } from "../src/infrastructure/security/securityHelpers";
import { IncidentStatus, VolunteerStatus } from "../src/domain/enums";

describe("Incidents API Endpoints - Integration Tests", () => {
  const fanToken = createAccessToken("fan-user-id", "FAN");
  const operatorToken = createAccessToken("op-user-id", "OPERATOR");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/v1/incidents", () => {
    it("should allow a authenticated fan to submit an incident report", async () => {
      // Mock loading fan user profile during auth checks
      jest.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: "fan-user-id",
        role: "FAN",
        is_active: true
      } as any);

      // Mock loading target sector
      jest.spyOn(prisma.sector, "findUnique").mockResolvedValue({
        id: "sec-1",
        stadium_id: "stad-1",
        name: "North stand"
      } as any);

      // Mock DB upsert
      jest.spyOn(prisma.incident, "upsert").mockResolvedValue({
        id: "incident-uuid-1",
        incident_type: "MEDICAL",
        severity: "LOW",
        description: "Fan reported minor heatstroke case near gate A.",
        status: IncidentStatus.REPORTED,
        latitude: 32.0,
        longitude: -97.0,
        sector_id: "sec-1",
        reported_by_user_id: "fan-user-id"
      } as any);

      const res = await request(server)
        .post("/api/v1/incidents")
        .set("Authorization", `Bearer ${fanToken}`)
        .send({
          incident_type: "MEDICAL",
          severity: "LOW",
          description: "Fan reported minor heatstroke case near gate A.",
          latitude: 32.0,
          longitude: -97.0,
          sector_id: "sec-1"
        });

      expect(res.status).toBe(201);
      expect(res.body.incident_type).toBe("MEDICAL");
      expect(res.body.status).toBe("REPORTED");
    });
  });

  describe("POST /api/v1/incidents/:id/assign", () => {
    it("should allow an OPERATOR to dispatch a volunteer and update status", async () => {
      const mockIncidentId = "incident-1";
      const mockVolunteerId = "vol-1";

      jest.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: "op-user-id",
        role: "OPERATOR",
        is_active: true
      } as any);

      // Mock incident lookup
      jest.spyOn(prisma.incident, "findUnique").mockResolvedValue({
        id: mockIncidentId,
        incident_type: "MEDICAL",
        severity: "LOW",
        status: IncidentStatus.REPORTED,
        description: "Heatstroke",
        latitude: 32.0,
        longitude: -97.0,
        sector_id: "sec-1",
        reported_by_user_id: "fan-1",
        assigned_volunteer_id: null
      } as any);

      // Mock volunteer lookup
      jest.spyOn(prisma.volunteer, "findUnique").mockResolvedValue({
        id: mockVolunteerId,
        user_id: "user-vol-1",
        name: "Sarah Connor",
        status: VolunteerStatus.AVAILABLE,
        latitude: 32.0,
        longitude: -97.0,
        assigned_sector_id: null,
        skills: ["first_aid"]
      } as any);

      // Mock volunteer save
      const mockVolSave = jest.spyOn(prisma.volunteer, "upsert").mockResolvedValue({
        id: mockVolunteerId,
        status: VolunteerStatus.ASSIGNED
      } as any);

      // Mock incident save
      const mockIncidentSave = jest.spyOn(prisma.incident, "upsert").mockResolvedValue({
        id: mockIncidentId,
        status: IncidentStatus.ACKNOWLEDGED,
        assigned_volunteer_id: mockVolunteerId
      } as any);

      const res = await request(server)
        .post(`/api/v1/incidents/${mockIncidentId}/assign`)
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({
          volunteer_id: mockVolunteerId
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ACKNOWLEDGED");
      expect(res.body.assigned_volunteer_id).toBe(mockVolunteerId);
      
      // Assert volunteer status was updated to ASSIGNED
      expect(mockVolSave).toHaveBeenCalled();
      expect(mockIncidentSave).toHaveBeenCalled();
    });
  });
});
