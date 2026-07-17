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

    const newIncident = new Incident(
      uuidv4(),
      req.incident_type,
      req.severity,
      req.description,
      new Coordinates(req.latitude, req.longitude),
      req.sector_id,
      reportedByUserId,
      req.gate_id || null
    );

    const saved = await this.incidentRepo.save(newIncident);
    logger.info({ incidentId: saved.id, type: saved.incident_type }, "Incident reported successfully");

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

  public async listActiveIncidents(): Promise<Incident[]> {
    return await this.incidentRepo.listActive();
  }

  public async assignVolunteer(id: string, req: IncidentAssign): Promise<Incident> {
    const incident = await this.getIncident(id);
    const volunteer = await this.volunteerRepo.getById(req.volunteer_id);

    if (!volunteer) {
      throw new EntityNotFoundError("Volunteer", req.volunteer_id);
    }

    // Allocate volunteer status check
    volunteer.assignToIncident();
    await this.volunteerRepo.save(volunteer);

    // Link volunteer to incident
    incident.assignVolunteer(volunteer.id);
    
    const saved = await this.incidentRepo.save(incident);
    logger.info({ incidentId: saved.id, volunteerId: volunteer.id }, "Volunteer assigned to incident successfully");
    return saved;
  }

  public async resolveIncident(id: string, req: IncidentResolve): Promise<Incident> {
    const incident = await this.getIncident(id);
    
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
      
      const response = await axios.post(`${config.agentMeshUrl}/reason`, {
        incident_id: incident.id,
        stadium_id: stadiumId,
        incident_type: incident.incident_type,
        severity: incident.severity,
        description: incident.description
      }, {
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Service-Key": config.internalServiceKey
        },
        timeout: 10000 // 10 seconds limit
      });

      const data = response.data;
      if (data && data.success && data.recommendations) {
        // Save recommendations to incident entity
        const recText = JSON.stringify(data.recommendations);
        const freshIncident = await this.getIncident(incident.id);
        // Overwrite recommendation text field directly
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

  /**
   * Rule-based fallback recommendations generator.
   */
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
