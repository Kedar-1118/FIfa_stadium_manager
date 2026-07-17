/**
 * StadiumOS AI — LLM Chat Model Provider.
 * 
 * Factory for creating ChatModel instances based on the selected LLM provider.
 * Includes a fallback mock LLM provider for tests and sandbox executions.
 */

import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatGoogleGenAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import { AIMessage } from "@langchain/core/messages";
import { config } from "../config";

/**
 * Mock LLM class mapping LangChain's BaseChatModel interface for sandbox testing.
 */
class SandboxMockLLM extends BaseChatModel {
  _llmType() {
    return "sandbox-mock-llm";
  }

  async _generate(messages: any[], options: any) {
    const lastMsg = messages[messages.length - 1]?.content || "";
    let content = '{"status": "ok"}';

    // Simple rule-based mock parser mimicking LLM output for test compliance
    const lastMsgStr = String(lastMsg).toLowerCase();
    if (lastMsgStr.includes("crowd")) {
      content = JSON.stringify({
        congestion_risk: "medium",
        density_estimate_per_m2: 2.1,
        recommended_flow_divert_plan: {
          source_sector_id: "00000000-0000-0000-0000-000000000000",
          target_sector_id: "00000000-0000-0000-0000-000000000000",
          divert_percentage: 20
        }
      });
    } else if (lastMsgStr.includes("security") || lastMsgStr.includes("medical")) {
      content = JSON.stringify({
        severity_classification: "medium",
        requires_emergency_services: false,
        sop_code_applied: "SOP_04_MEDICAL_EMERGENCY",
        security_instructions: "Dispatch first-aid volunteer. Call EMT ambulance only if condition worsens."
      });
    } else if (lastMsgStr.includes("volunteer")) {
      content = JSON.stringify({
        dispatched_volunteer_id: "00000000-0000-0000-0000-000000000000",
        volunteer_name: "Mock Volunteer",
        reason: "Nearest available volunteer matching First Aid skill tag."
      });
    } else if (lastMsgStr.includes("transport") || lastMsgStr.includes("gate")) {
      content = JSON.stringify({
        action: "OPEN_GATE",
        target_gate_code: "GATE_3A",
        reason: "Relieve pedestrian density build-up in East Sector."
      });
    } else if (lastMsgStr.includes("operations") || lastMsgStr.includes("supervisor")) {
      content = JSON.stringify({
        next_agent: "CrowdAgent",
        delegation_payload: "Analyze high density alert at Gate 3."
      });
    }

    return {
      generations: [
        {
          text: content,
          message: new AIMessage(content)
        }
      ]
    };
  }
}

export function getLLM(): BaseChatModel {
  // If keys are missing, automatically fall back to sandbox mock provider
  if (!config.geminiApiKey && !config.openaiApiKey) {
    console.warn("Using SandboxMockLLM due to missing API keys.");
    return new SandboxMockLLM({});
  }

  if (config.llmProvider === "openai" && config.openaiApiKey) {
    return new ChatOpenAI({
      openAIApiKey: config.openaiApiKey,
      modelName: "gpt-4o",
      temperature: 0.1
    });
  }

  // Default fallback to Google Gemini
  return new ChatGoogleGenAI({
    apiKey: config.geminiApiKey,
    modelName: "gemini-1.5-pro",
    temperature: 0.1
  });
}
