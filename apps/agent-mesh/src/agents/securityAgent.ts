/**
 * StadiumOS AI — Security & Medical Agent.
 * 
 * Assesses threat levels, emergency severity indexes, checks safety protocols (SOPs),
 * and coordinates paramedic or law enforcement triage actions.
 */

import { getLLM } from "../services/llmProvider";
import { qdrantRAG } from "../services/qdrantRAG";
import { StadiumOSGraphState } from "../state/graphState";

export async function securityAgentNode(state: StadiumOSGraphState): Promise<Partial<StadiumOSGraphState>> {
  console.log("-> Entering Security & Medical Agent Node");
  
  const llm = getLLM();
  const alert = state.telemetry_alert;

  // Query Qdrant for matching Safety SOPs
  const sopContext = await qdrantRAG.retrieveGuidelines(
    alert.description,
    "security"
  );

  const prompt = `
You are the Security & Medical Agent for StadiumOS.
Evaluate the following emergency telemetry event to assess severity levels, check SOP protocols, and compile response guidelines.

TELEMETRY EVENT:
${JSON.stringify(alert, null, 2)}

SAFETY SOP GUIDELINES:
${sopContext}

Triages the event. Respond ONLY with a JSON matching this structure:
{
  "severity_classification": "low" | "medium" | "high" | "critical",
  "requires_emergency_services": boolean,
  "sop_code_applied": string,
  "security_instructions": string,
  "confidence_score": number
}
`;

  try {
    const response = await llm.invoke([
      { role: "system", content: "You are a stadium safety officer. Always reply with raw JSON." },
      { role: "user", content: prompt }
    ]);
    
    const analysisText = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
    const jsonStart = analysisText.indexOf("{");
    const jsonEnd = analysisText.lastIndexOf("}");
    const cleanJson = jsonStart !== -1 && jsonEnd !== -1 ? analysisText.substring(jsonStart, jsonEnd + 1) : "{}";
    const parsed = JSON.parse(cleanJson);

    return {
      agent_analyses: {
        ...state.agent_analyses,
        security: analysisText
      },
      execution_log: [...state.execution_log, `Security & Medical Agent node executed. SOP Applied: ${parsed.sop_code_applied || "none"}`]
    };
  } catch (err: any) {
    console.error("Security & Medical Agent execution failed:", err.message);
    return {
      execution_log: [...state.execution_log, `Security & Medical Agent node failed: ${err.message}`]
    };
  }
}
