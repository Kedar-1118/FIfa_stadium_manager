/**
 * StadiumOS AI — Volunteer Agent.
 * 
 * Invokes the FindNearbyVolunteers database tool, matches volunteer skills with
 * incident requirements, and formulates dispatch recommendations.
 */

import { getLLM } from "../services/llmProvider";
import { toolService } from "../services/toolService";
import { StadiumOSGraphState } from "../state/graphState";

export async function volunteerAgentNode(state: StadiumOSGraphState): Promise<Partial<StadiumOSGraphState>> {
  console.log("-> Entering Volunteer Agent Node");
  
  const llm = getLLM();
  const alert = state.telemetry_alert;
  const incidentId = state.incident_id;

  // Retrieve latitude/longitude of incident. If missing, default to center.
  // In our schema, we can mock or query these coordinates. Let's look at the alert or generic coordinate
  const lat = 40.8135; 
  const lon = -74.0744;

  // 1. Invoke REST tool query to locate volunteers near coordinates range
  const skill = alert.description.toLowerCase().includes("medical") ? "first_aid" : undefined;
  const nearbyVolunteers = await toolService.findNearbyVolunteers(lat, lon, 1000, skill);

  const prompt = `
You are the Volunteer Agent.
Match the following incident description to the list of nearby available volunteers. Select the best candidate based on distance and skills.

INCIDENT:
${alert.description}
REQUIRED SKILL: ${skill || "none"}

NEARBY VOLUNTEERS FOUND:
${JSON.stringify(nearbyVolunteers, null, 2)}

Formulate a dispatch proposal. You must respond ONLY with a JSON matching this structure:
{
  "dispatched_volunteer_id": "uuid_string",
  "volunteer_name": string,
  "reason": string,
  "confidence_score": number
}
`;

  try {
    // If no volunteers were found, return fallback noop directly
    if (nearbyVolunteers.length === 0) {
      return {
        agent_analyses: {
          ...state.agent_analyses,
          volunteer: "No available volunteers located in search radius."
        },
        execution_log: [...state.execution_log, "Volunteer Agent node: No available volunteers found."]
      };
    }

    const response = await llm.invoke([
      { role: "system", content: "You are a volunteer dispatch controller. Always reply with raw JSON." },
      { role: "user", content: prompt }
    ]);
    
    const analysisText = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
    const jsonStart = analysisText.indexOf("{");
    const jsonEnd = analysisText.lastIndexOf("}");
    const cleanJson = jsonStart !== -1 && jsonEnd !== -1 ? analysisText.substring(jsonStart, jsonEnd + 1) : "{}";
    const parsed = JSON.parse(cleanJson);

    const newRecommendations = [...state.proposed_recommendations];
    if (parsed.dispatched_volunteer_id) {
      newRecommendations.push({
        id: `rec_volunteer_${Date.now()}`,
        agent_name: "Volunteer Agent",
        action_type: "DISPATCH_VOLUNTEER",
        description: `Dispatch volunteer ${parsed.volunteer_name} to incident coordinates. Reason: ${parsed.reason}`,
        target_entity_id: parsed.dispatched_volunteer_id,
        confidence_score: parsed.confidence_score || 0.90
      });
    }

    return {
      agent_analyses: {
        ...state.agent_analyses,
        volunteer: analysisText
      },
      proposed_recommendations: newRecommendations,
      execution_log: [...state.execution_log, `Volunteer Agent node completed. Dispatch target: ${parsed.volunteer_name || "none"}`]
    };
  } catch (err: any) {
    console.error("Volunteer Agent execution failed:", err.message);
    return {
      execution_log: [...state.execution_log, `Volunteer Agent node failed: ${err.message}`]
    };
  }
}
