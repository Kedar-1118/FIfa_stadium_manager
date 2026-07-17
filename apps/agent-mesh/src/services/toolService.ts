/**
 * StadiumOS AI — Tool Integration Client (Adapters).
 * 
 * Implements concrete integrations calling the backend API gateway to fetch
 * and modify stadium database and caching states (Inversion of Control).
 */

import axios, { AxiosInstance } from "axios";
import { config } from "../config";
import { DigitalTwinSnapshot, GateStatusTelemetry } from "../state/graphState";

class ToolService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.backendApiUrl,
      headers: {
        "Content-Type": "application/json",
        // Internal service token to bypass public API gateway rate limits & auth checks
        "X-Internal-Service-Key": process.env.INTERNAL_SERVICE_KEY || "gateway-agent-secret-handshake"
      },
      timeout: 5000 // 5 seconds
    });
  }

  /**
   * Fetch real-time digital twin metrics.
   */
  public async getDigitalTwinState(stadiumId: string): Promise<DigitalTwinSnapshot> {
    try {
      // Direct call to read-model telemetry status endpoint
      const response = await this.client.get("/crowd/status");
      const data = response.json ? response.json() : response.data;

      return {
        overall_occupancy_percent: data.overall_occupancy_percent || 0.0,
        active_incidents_count: data.active_incidents_count || 0,
        gate_status: (data.gates || []).map((g: any) => ({
          gate_id: g.gate_id,
          gate_code: g.gate_code,
          status: g.status,
          flow_rate_per_min: g.current_flow_rate_per_min || 0,
          wait_time_seconds: g.average_wait_time_seconds || 0
        }))
      };
    } catch (err: any) {
      console.error(`Failed to retrieve digital twin state for stadium ${stadiumId}:`, err.message);
      // Return safe fallback mockup values
      return {
        overall_occupancy_percent: 0.0,
        active_incidents_count: 0,
        gate_status: []
      };
    }
  }

  /**
   * Search for nearby volunteers matching skills requirements.
   */
  public async findNearbyVolunteers(
    latitude: number,
    longitude: number,
    radiusMeters: number,
    requiredSkill?: string
  ): Promise<any[]> {
    try {
      const response = await this.client.get("/volunteers/search/nearby", {
        params: {
          latitude,
          longitude,
          radius_meters: radiusMeters,
          required_skill: requiredSkill
        }
      });
      return response.data || [];
    } catch (err: any) {
      console.error("Failed to lookup nearby volunteers:", err.message);
      return [];
    }
  }

  /**
   * Dispatch a volunteer to a reported incident.
   */
  public async assignVolunteer(incidentId: string, volunteerId: string): Promise<boolean> {
    try {
      await this.client.post(`/incidents/${incidentId}/assign`, {
        volunteer_id: volunteerId
      });
      return true;
    } catch (err: any) {
      console.error(`Failed to assign volunteer ${volunteerId} to incident ${incidentId}:`, err.message);
      return false;
    }
  }

  /**
   * Trigger physical signage redirect or update gate status.
   */
  public async updateGateStatus(gateId: string, status: string, reason: string): Promise<boolean> {
    try {
      await this.client.patch(`/gates/${gateId}/status`, {
        status: status.toLowerCase(),
        reason
      });
      return true;
    } catch (err: any) {
      console.error(`Failed to update gate ${gateId} status to ${status}:`, err.message);
      return false;
    }
  }
}

export const toolService = new ToolService();
