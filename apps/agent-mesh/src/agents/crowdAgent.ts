/**
 * StadiumOS AI — Crowd Dynamics Agent.
 * 
 * Analyzes turnstile ingress rates, crowd density estimates, and triggers
 * crowd flow redirection recommendations.
 */

import { getLLM } from "../services/llmProvider";
import { qdrantRAG } from "../services/qdrantRAG";
import { StadiumOSGraphState } from "../state/graphState";

export async function crowdAgentNode(state: StadiumOSGraphState): Promise<Partial<StadiumOSGraphState>> {
  console.log("-> Entering Crowd Dynamics Agent Node");
  
  const llm = getLLM();
  const alert = state.telemetry_alert;
  const twin = state.digital_twin_snapshot;

  // Retrieve relevant SOP guidelines using RAG
  const sopContext = await qdrantRAG.retrieveGuidelines(
    alert.description,
    "evacuation"
  );

  const prompt = `
You are the Crowd Dynamics Agent for StadiumOS.
Analyze the following stadium telemetry alert and digital twin state to detect congestion risk and generate flow diversion recommendations.

TELEMETRY ALERT:
${JSON.stringify(alert, null, 2)}

DIGITAL TWIN STATUS:
${JSON.stringify(twin, null, 2)}

SOP EVACUATION/FLOW GUIDELINES:
${sopContext}

Analyze the data and recommend flow redirection plans. You must respond ONLY with a JSON matching this structure:
{
  "congestion_risk": "low" | "medium" | "high" | "critical",
  "density_estimate_per_m2": number,
  "recommended_flow_divert_plan": {
    "source_sector_id": "uuid_string",
    "target_sector_id": "uuid_string",
    "divert_percentage": number
  }
}
`;

  try {
    const response = await llm.invoke([
      { role: "system", content: "You are a crowd analysis system. Always reply with raw JSON." },
      { role: "user", content: prompt }
    ]);
    
    const analysisText = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
    // Parse LLM JSON output cleanly
    const jsonStart = analysisText.indexOf("{");
    const jsonEnd = analysisText.lastIndexOf("}");
    const cleanJson = jsonStart !== -1 && jsonEnd !== -1 ? analysisText.substring(jsonStart, jsonEnd + 1) : "{}";
    const parsed = JSON.parse(cleanJson);

    // Append recommendation to state
    const newRecommendations = [...state.proposed_recommendations];
    if (parsed.recommended_flow_divert_plan) {
      newRecommendations.push({
        id: `rec_crowd_${Date.now()}`,
        agent_name: "Crowd Dynamics Agent",
        action_type: "REROUTE_CROWD",
        description: `Divert ${parsed.recommended_flow_divert_plan.divert_percentage}% flow from sector ${parsed.recommended_flow_divert_plan.source_sector_id} to sector ${parsed.recommended_flow_divert_plan.target_sector_id} due to detected ${parsed.congestion_risk} congestion risk.`,
        target_entity_id: parsed.recommended_flow_divert_plan.source_sector_id,
        confidence_score: 0.90
      });
    }

    return {
      agent_analyses: {
        ...state.agent_analyses,
        crowd: analysisText
      },
      proposed_recommendations: newRecommendations,
      execution_log: [...state.execution_log, "Crowd Dynamics Agent node executed successfully."]
    };
  } catch (err: any) {
    console.error("Crowd Dynamics Agent execution failed:", err.message);
    return {
      execution_log: [...state.execution_log, `Crowd Dynamics Agent node failed: ${err.message}`]
    };
  }
}
