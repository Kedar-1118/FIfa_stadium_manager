/**
 * StadiumOS AI — Incident Orchestration Service.
 * 
 * Coordinates incident reports, dispatches, resolutions, and triggers the
 * LangGraph agent mesh server for high-priority events.
 */

import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import { IIncidentRepository } from "../ports/incidentRepository";
import { IVolunteerRepository } from "../ports/volunteerRepository";
import { IStadiumRepository } from "../ports/stadiumRepository";
import { IncidentCreate, IncidentAssign, IncidentResolve, IncidentStatusUpdate } from "../schemas/incidentSchemas";
import { Incident } from "../../domain/entities/incident";
import { Coordinates } from "../../domain/valueObjects";
import { IncidentStatus, VolunteerStatus } from "../../domain/enums";
import { EntityNotFoundError, BusinessRuleViolationError } from "../../domain/exceptions";
import { config } from "../../config";
import { logger } from "../../infrastructure/logging/logger";
import { prisma } from "../../infrastructure/database/prisma";
import { getRedisClient } from "../../infrastructure/cache/redisClient";

export class IncidentService {
  private incidentRepo: IIncidentRepository;
  private volunteerRepo: IVolunteerRepository;
  private stadiumRepo: IStadiumRepository;

  constructor(
    incidentRepo: IIncidentRepository,
    volunteerRepo: IVolunteerRepository,
    stadiumRepo: IStadiumRepository
  ) {
    this.incidentRepo = incidentRepo;
    this.volunteerRepo = volunteerRepo;
    this.stadiumRepo = stadiumRepo;
  }

  public async reportIncident(reportedByUserId: string, req: IncidentCreate): Promise<Incident> {
    // Assert sector exists
    const sector = await this.stadiumRepo.getSectorById(req.sector_id);
    if (!sector) {
      throw new EntityNotFoundError("Sector", req.sector_id);
    }

    // 1. Check if the reporter is a FAN
    const reporter = await prisma.user.findUnique({ where: { id: reportedByUserId } });
    const isFan = reporter?.role === "FAN";

    const isEvacuationType = req.incident_type.toUpperCase().includes("EVACUATION") || 
                             req.description.toUpperCase().includes("EVACUATE") ||
                             req.description.toUpperCase().includes("EVACUATION");

    let isFanEvacuation = isFan && isEvacuationType;
    let descriptionPrefix = isFanEvacuation ? "[UNVERIFIED FAN EVACUATION] " : "";
    let finalSeverity = isFanEvacuation ? "CRITICAL" : req.severity;

    const newIncident = new Incident(
      uuidv4(),
      req.incident_type,
      // @ts-ignore
      finalSeverity,
      descriptionPrefix + req.description,
      new Coordinates(req.latitude, req.longitude),
      req.sector_id,
      reportedByUserId,
      req.gate_id || null
    );

    let saved = await this.incidentRepo.save(newIncident);
    logger.info({ incidentId: saved.id, type: saved.incident_type }, "Incident reported successfully");

    // 2. Perform emergency staff dispatch for fan evacuation report
    if (isFanEvacuation) {
      // Find closest AVAILABLE volunteer
      const availableVolunteers = await prisma.volunteer.findMany({
        where: { status: "AVAILABLE" }
      });

      let closestVol = null;
      let minDistance = Infinity;

      for (const vol of availableVolunteers) {
        const dx = vol.longitude - req.longitude;
        const dy = vol.latitude - req.latitude;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDistance) {
          minDistance = dist;
          closestVol = vol;
        }
      }

      const redis = getRedisClient();

      if (closestVol) {
        // Atomically assign closest volunteer to incident
        await prisma.$transaction([
          prisma.volunteer.update({
            where: { id: closestVol.id },
            data: { status: "ASSIGNED" }
          }),
          prisma.incident.update({
            where: { id: saved.id },
            data: {
              status: "ACKNOWLEDGED",
              assigned_volunteer_id: closestVol.id
            }
          })
        ]);

        // Refresh saved domain entity state
        const refreshed = await this.incidentRepo.getById(saved.id);
        if (refreshed) saved = refreshed;

        // Broadcast verification request event
        await redis.publish(
          "stadiumos:broadcast",
          JSON.stringify({
            event: "EVACUATION_VERIFICATION_DISPATCHED",
            incident_id: saved.id,
            sector_name: sector.name,
            volunteer_name: closestVol.name,
            message: `⚠️ Fan evacuation report in Sector ${sector.name}. Nearest staff member ${closestVol.name} has been dispatched for verification.`
          })
        );
        logger.info({ incidentId: saved.id, volunteerId: closestVol.id }, "Fan evacuation verification dispatched to nearest volunteer");
      } else {
        // No staff available fallback warning
        await redis.publish(
          "stadiumos:broadcast",
          JSON.stringify({
            event: "EVACUATION_PENDING_VERIFICATION",
            incident_id: saved.id,
            sector_name: sector.name,
            message: `⚠️ Fan evacuation report in Sector ${sector.name}. WARNING: No available staff nearby for automatic verification. Immediate manual dispatch required!`
          })
        );
        logger.warn({ incidentId: saved.id }, "No available staff found for auto-verification dispatch");
      }
    }

    // Trigger AI Agent Mesh asynchronously if severity requires it
    if (saved.requiresImmediateResponse) {
      this.triggerAgentMeshReasoning(saved, sector.stadium_id);
    }

    return saved;
  }

  public async getIncident(id: string): Promise<Incident> {
    const incident = await this.incidentRepo.getById(id);
    if (!incident) {
      throw new EntityNotFoundError("Incident", id);
    }
    return incident;
  }

  public async listActiveIncidents(limit?: number, offset?: number): Promise<Incident[]> {
    return await this.incidentRepo.listActive(limit, offset);
  }

  public async assignVolunteer(id: string, req: IncidentAssign): Promise<Incident> {
    const incident = await this.getIncident(id);
    const volunteer = await this.volunteerRepo.getById(req.volunteer_id);

    if (!volunteer) {
      throw new EntityNotFoundError("Volunteer", req.volunteer_id);
    }

    volunteer.assignToIncident();
    incident.assignVolunteer(volunteer.id);
    
    const saved = await prisma.$transaction(async (tx) => {
      await tx.volunteer.update({
        where: { id: volunteer.id },
        data: { status: "ASSIGNED" }
      });
      const model = await tx.incident.update({
        where: { id: incident.id },
        data: {
          status: "ACKNOWLEDGED",
          assigned_volunteer_id: volunteer.id
        }
      });
      return model;
    });

    const domainIncident = await this.incidentRepo.getById(saved.id);
    if (!domainIncident) throw new Error("Failed to load incident after transaction commit.");
    
    logger.info({ incidentId: domainIncident.id, volunteerId: volunteer.id }, "Volunteer assigned atomically");
    return domainIncident;
  }

  public async resolveIncident(id: string, req: IncidentResolve): Promise<Incident> {
    const incident = await this.getIncident(id);
    
    // Check if we are verifying an unverified fan evacuation report
    const isUnverifiedEvacuation = incident.description.startsWith("[UNVERIFIED FAN EVACUATION]");
    let volunteerName = "Staff Operations";

    if (incident.assigned_volunteer_id) {
      const vol = await prisma.volunteer.findUnique({ where: { id: incident.assigned_volunteer_id } });
      if (vol) {
        volunteerName = vol.name;
      }
    }

    if (isUnverifiedEvacuation) {
      // Evacuation is verified and resolved/acknowledged!
      incident.description = incident.description.replace("[UNVERIFIED FAN EVACUATION]", `[VERIFIED FAN EVACUATION BY STAFF: ${volunteerName}]`);
      
      // 1. Open all gates in the affected sector
      await prisma.gate.updateMany({
        where: { sector_id: incident.sector_id },
        data: { status: "OPEN" }
      });

      // Sync updated gate status to Redis
      const sectorGates = await prisma.gate.findMany({ where: { sector_id: incident.sector_id } });
      const redis = getRedisClient();
      for (const gate of sectorGates) {
        await redis.set(`gate:status:${gate.gate_code}`, "OPEN");
      }

      // Fetch sector details for message
      const sector = await this.stadiumRepo.getSectorById(incident.sector_id);
      const sectorName = sector ? sector.name : incident.sector_id;

      // 2. Publish evacuation alarm verified alert
      await redis.publish(
        "stadiumos:broadcast",
        JSON.stringify({
          event: "EVACUATION_ALARM_VERIFIED",
          incident_id: incident.id,
          sector_name: sectorName,
          message: `🚨 CRITICAL: EVACUATION ALARM VERIFIED by staff member ${volunteerName} in Sector ${sectorName}! Directing all gates to OPEN immediately. Authorities notified.`
        })
      );
      logger.info({ incidentId: incident.id }, "Evacuation incident verified by staff. Sector gates automatically set to OPEN.");
    }

    incident.resolve(req.resolution_notes);

    // Free volunteer status if linked
    if (incident.assigned_volunteer_id) {
      const volunteer = await this.volunteerRepo.getById(incident.assigned_volunteer_id);
      if (volunteer) {
        volunteer.releaseFromIncident();
        await this.volunteerRepo.save(volunteer);
      }
    }

    const saved = await this.incidentRepo.save(incident);
    logger.info({ incidentId: saved.id }, "Incident resolved successfully");
    return saved;
  }

  public async updateIncidentStatus(id: string, req: IncidentStatusUpdate): Promise<Incident> {
    const incident = await this.getIncident(id);
    
    // Check if we are verifying an unverified fan evacuation report (acknowledging or in_progress status update)
    const isUnverifiedEvacuation = incident.description.startsWith("[UNVERIFIED FAN EVACUATION]");
    const isVerifyingStatus = req.status === "IN_PROGRESS" || req.status === "RESOLVED";

    if (isUnverifiedEvacuation && isVerifyingStatus) {
      let volunteerName = "Staff Operations";
      if (incident.assigned_volunteer_id) {
        const vol = await prisma.volunteer.findUnique({ where: { id: incident.assigned_volunteer_id } });
        if (vol) {
          volunteerName = vol.name;
        }
      }

      // Evacuation verified!
      incident.description = incident.description.replace("[UNVERIFIED FAN EVACUATION]", `[VERIFIED FAN EVACUATION BY STAFF: ${volunteerName}]`);
      
      // 1. Open all gates in the affected sector
      await prisma.gate.updateMany({
        where: { sector_id: incident.sector_id },
        data: { status: "OPEN" }
      });

      // Sync updated gate status to Redis
      const sectorGates = await prisma.gate.findMany({ where: { sector_id: incident.sector_id } });
      const redis = getRedisClient();
      for (const gate of sectorGates) {
        await redis.set(`gate:status:${gate.gate_code}`, "OPEN");
      }

      const sector = await this.stadiumRepo.getSectorById(incident.sector_id);
      const sectorName = sector ? sector.name : incident.sector_id;

      // 2. Publish evacuation alarm verified alert
      await redis.publish(
        "stadiumos:broadcast",
        JSON.stringify({
          event: "EVACUATION_ALARM_VERIFIED",
          incident_id: incident.id,
          sector_name: sectorName,
          message: `🚨 CRITICAL: EVACUATION ALARM VERIFIED by staff member ${volunteerName} in Sector ${sectorName}! Directing all gates to OPEN immediately. Authorities notified.`
        })
      );
      logger.info({ incidentId: incident.id }, "Evacuation incident status verified by staff. Sector gates set to OPEN.");
    }

    incident.transitionTo(req.status);
    return await this.incidentRepo.save(incident);
  }

  /**
   * Triggers the external LangGraph agent-mesh server asynchronously.
   * Employs local failsafe defaults if the server is offline or errors.
   */
  private async triggerAgentMeshReasoning(incident: Incident, stadiumId: string): Promise<void> {
    try {
      logger.info({ incidentId: incident.id }, "Triggering LangGraph agent reasoning cycle...");

      // Sanitization: Strip systemic keywords to prevent prompt jailbreaks
      const sanitizedDesc = incident.description
        .replace(/ignore previous/gi, "")
        .replace(/system override/gi, "")
        .replace(/<system_prompt>|<\/system_prompt>/gi, "")
        .trim();
      
      const response = await axios.post(`${config.agentMeshUrl}/reason`, {
        incident_id: incident.id,
        stadium_id: stadiumId,
        incident_type: incident.incident_type,
        severity: incident.severity,
        description: sanitizedDesc
      }, {
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Service-Key": config.internalServiceKey
        },
        timeout: 10000 // 10 seconds limit
      });

      const data = response.data;
      if (data && data.success && data.recommendations) {
        const recText = JSON.stringify(data.recommendations);
        const freshIncident = await this.getIncident(incident.id);
        // @ts-ignore
        freshIncident.ai_recommendation = recText;
        await this.incidentRepo.save(freshIncident);
        logger.info({ incidentId: incident.id }, "AI Recommendations saved from agent mesh.");
      }
    } catch (err: any) {
      logger.warn(`Agent mesh server unreachable, applying rule-based recommendation fallback: ${err.message}`);
      
      const fallbackRec = this.getRuleBasedRecommendationFallback(incident);
      const freshIncident = await this.getIncident(incident.id);
      // @ts-ignore
      freshIncident.ai_recommendation = JSON.stringify(fallbackRec);
      await this.incidentRepo.save(freshIncident);
    }
  }

  private getRuleBasedRecommendationFallback(incident: Incident): any[] {
    const recs: any[] = [];
    const isMedical = incident.incident_type.toLowerCase().includes("medical") || incident.description.toLowerCase().includes("medical");
    
    if (isMedical) {
      recs.push({
        id: `fallback_medical_${Date.now()}`,
        agent_name: "Operations Engine Fallback",
        action_type: "DISPATCH_VOLUNTEER",
        description: "Verify closest available volunteer with first_aid skills and assign coordinates.",
        target_entity_id: incident.id,
        confidence_score: 0.65
      });
    } else {
      recs.push({
        id: `fallback_general_${Date.now()}`,
        agent_name: "Operations Engine Fallback",
        action_type: "ALERT_OPERATORS",
        description: "Operator alert: High severity incident reported. Monitor adjacent CCTVs and establish perimeter.",
        target_entity_id: incident.id,
        confidence_score: 0.60
      });
    }
    return recs;
  }
}
export default IncidentService;
