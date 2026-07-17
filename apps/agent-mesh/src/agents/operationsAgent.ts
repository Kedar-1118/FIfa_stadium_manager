/**
 * StadiumOS AI — Operations Agent (Supervisor Router).
 * 
 * Inspects graph state and returns the next routing destination or compiles
 * final recommendation signoffs.
 */

import { getLLM } from "../services/llmProvider";
import { StadiumOSGraphState } from "../state/graphState";

export async function operationsAgentNode(state: StadiumOSGraphState): Promise<Partial<StadiumOSGraphState>> {
  console.log("-> Entering Operations Agent (Supervisor) Node");
  
  const llm = getLLM();
  const alert = state.telemetry_alert;
  const trace = state.execution_log;

  const prompt = `
You are the Operations Agent (Supervisor Router) for StadiumOS.
Your role is to decide which specialist agent should analyze the current alert next, or if we are ready to output final recommendations.

SPECIALIST REGISTER:
- CrowdAgent: Handles pedestrian congestion, flow risks, heatmaps.
- TransportAgent: Handles gate state openings, bus schedules, transit cues.
- SecurityAgent: Handles triaging medical issues or safety events.
- VolunteerAgent: Coordinates geo-locating and assigning volunteers.

CURRENT INGRESS ALERT:
${JSON.stringify(alert, null, 2)}

TRACE OF COMPLETED RUNS:
${JSON.stringify(trace, null, 2)}

DECISION RULES:
- If the alert is a MEDICAL event and SecurityAgent has not run yet, route to SecurityAgent.
- If SecurityAgent has run but VolunteerAgent has not, route to VolunteerAgent.
- If the alert is CROWD_CONGESTION and CrowdAgent has not run yet, route to CrowdAgent.
- If CrowdAgent has run but TransportAgent has not, route to TransportAgent.
- If all appropriate specialists have completed analysis, route to 'end'.

Respond ONLY with a JSON matching this structure:
{
  "next_agent": "CrowdAgent" | "TransportAgent" | "SecurityAgent" | "VolunteerAgent" | "end",
  "delegation_payload": "Details to the specialist agent regarding focus."
}
`;

  try {
    const response = await llm.invoke([
      { role: "system", content: "You are the supervisor router. Always reply with raw JSON." },
      { role: "user", content: prompt }
    ]);
    
    const analysisText = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
    const jsonStart = analysisText.indexOf("{");
    const jsonEnd = analysisText.lastIndexOf("}");
    const cleanJson = jsonStart !== -1 && jsonEnd !== -1 ? analysisText.substring(jsonStart, jsonEnd + 1) : "{}";
    const parsed = JSON.parse(cleanJson);

    // Save decision to logs
    const nextNode = parsed.next_agent || "end";
    
    return {
      execution_log: [
        ...state.execution_log,
        `Supervisor route decision: next is '${nextNode}'. Payload: ${parsed.delegation_payload || "none"}`
      ]
    };
  } catch (err: any) {
    console.error("Operations Agent supervisor routing failed:", err.message);
    return {
      execution_log: [...state.execution_log, `Supervisor routing failed: ${err.message}. Defaulting to 'end'.`]
    };
  }
}
