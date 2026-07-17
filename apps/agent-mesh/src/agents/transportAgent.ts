/**
 * StadiumOS AI — Transport & Gate Agent.
 * 
 * Analyzes traffic bottlenecks, gate flow capacities, and triggers
 * gate status transitions and external transit schedules coordination.
 */

import { getLLM } from "../services/llmProvider";
import { StadiumOSGraphState } from "../state/graphState";

export async function transportAgentNode(state: StadiumOSGraphState): Promise<Partial<StadiumOSGraphState>> {
  console.log("-> Entering Transport & Gate Agent Node");
  
  const llm = getLLM();
  const alert = state.telemetry_alert;
  const twin = state.digital_twin_snapshot;

  const prompt = `
You are the Transport & Gate Agent for StadiumOS.
Evaluate the current gate occupancy rates, queue wait times, and municipal transit telemetry to recommend gate openings, closures, or transit scheduling overrides.

TELEMETRY ALERT:
${JSON.stringify(alert, null, 2)}

DIGITAL TWIN STATUS:
${JSON.stringify(twin, null, 2)}

Evaluate the data and recommend gate state adjustments. You must respond ONLY with a JSON matching this structure:
{
  "action": "OPEN_GATE" | "CLOSE_GATE" | "NONE",
  "target_gate_code": string,
  "target_gate_id": "uuid_string",
  "reason": string,
  "confidence_score": number
}
`;

  try {
    const response = await llm.invoke([
      { role: "system", content: "You are a stadium logistics parser. Always reply with raw JSON." },
      { role: "user", content: prompt }
    ]);
    
    const analysisText = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
    const jsonStart = analysisText.indexOf("{");
    const jsonEnd = analysisText.lastIndexOf("}");
    const cleanJson = jsonStart !== -1 && jsonEnd !== -1 ? analysisText.substring(jsonStart, jsonEnd + 1) : "{}";
    const parsed = JSON.parse(cleanJson);

    const newRecommendations = [...state.proposed_recommendations];
    if (parsed.action && parsed.action !== "NONE" && parsed.target_gate_id) {
      newRecommendations.push({
        id: `rec_transport_${Date.now()}`,
        agent_name: "Transport & Gate Agent",
        action_type: parsed.action,
        description: parsed.reason,
        target_entity_id: parsed.target_gate_id,
        confidence_score: parsed.confidence_score || 0.85
      });
    }

    return {
      agent_analyses: {
        ...state.agent_analyses,
        transport: analysisText
      },
      proposed_recommendations: newRecommendations,
      execution_log: [...state.execution_log, "Transport & Gate Agent node executed successfully."]
    };
  } catch (err: any) {
    console.error("Transport & Gate Agent execution failed:", err.message);
    return {
      execution_log: [...state.execution_log, `Transport & Gate Agent node failed: ${err.message}`]
    };
  }
}
