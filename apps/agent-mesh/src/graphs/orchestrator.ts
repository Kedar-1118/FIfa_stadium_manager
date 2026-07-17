/**
 * StadiumOS AI — LangGraph Orchestrator.
 * 
 * Sets up the LangGraph StateGraph mapping specialist agents, configuring
 * conditional routing flows, and compiling the runnable pipeline.
 */

import { StateGraph, Annotation } from "@langchain/langgraph";
import { crowdAgentNode } from "../agents/crowdAgent";
import { transportAgentNode } from "../agents/transportAgent";
import { securityAgentNode } from "../agents/securityAgent";
import { volunteerAgentNode } from "../agents/volunteerAgent";
import { operationsAgentNode } from "../agents/operationsAgent";
import {
  ProposedRecommendation,
  TelemetryAlert,
  DigitalTwinSnapshot,
  StadiumOSGraphState,
} from "../state/graphState";

// Define the LangGraph channels and merge/reducer policies
const GraphStateAnnotation = Annotation.Root<StadiumOSGraphState>({
  incident_id: {
    reducer: (oldVal, newVal) => newVal,
    default: () => ""
  },
  stadium_id: {
    reducer: (oldVal, newVal) => newVal,
    default: () => ""
  },
  telemetry_alert: {
    reducer: (oldVal, newVal) => newVal,
    default: () => ({} as TelemetryAlert)
  },
  digital_twin_snapshot: {
    reducer: (oldVal, newVal) => newVal,
    default: () => ({} as DigitalTwinSnapshot)
  },
  agent_analyses: {
    reducer: (oldVal, newVal) => ({ ...oldVal, ...newVal }),
    default: () => ({ crowd: "", transport: "", security: "", volunteer: "" })
  },
  proposed_recommendations: {
    reducer: (oldVal, newVal) => oldVal.concat(newVal),
    default: () => []
  },
  execution_log: {
    reducer: (oldVal, newVal) => oldVal.concat(newVal),
    default: () => []
  }
});

/**
 * Conditional router determining the next graph node to execute.
 * 
 * Inspects the last log line inside execution_log to extract supervisor routing.
 */
function routeNext(state: typeof GraphStateAnnotation.State): string {
  const logs = state.execution_log || [];
  if (logs.length === 0) return "operations";

  const lastLog = logs[logs.length - 1] || "";
  
  if (lastLog.includes("next is 'CrowdAgent'")) {
    return "crowd";
  }
  if (lastLog.includes("next is 'TransportAgent'")) {
    return "transport";
  }
  if (lastLog.includes("next is 'SecurityAgent'")) {
    return "security";
  }
  if (lastLog.includes("next is 'VolunteerAgent'")) {
    return "volunteer";
  }
  
  // Default fallback if supervisor completes or errors
  return "end";
}

// Build the LangGraph StateGraph
const workflow = new StateGraph(GraphStateAnnotation)
  // 1. Add agent nodes
  .addNode("operations", operationsAgentNode)
  .addNode("crowd", crowdAgentNode)
  .addNode("transport", transportAgentNode)
  .addNode("security", securityAgentNode)
  .addNode("volunteer", volunteerAgentNode)

  // 2. Configure entry point
  .setEntryPoint("operations")

  // 3. Specialist nodes always route back to the supervisor Operations Agent
  .addEdge("crowd", "operations")
  .addEdge("transport", "operations")
  .addEdge("security", "operations")
  .addEdge("volunteer", "operations")

  // 4. Configure conditional transitions exiting Operations Agent node
  .addConditionalEdges(
    "operations",
    routeNext,
    {
      crowd: "crowd",
      transport: "transport",
      security: "security",
      volunteer: "volunteer",
      end: "__end__"
    }
  );

// Compile the LangGraph graph
export const orchestratorGraph = workflow.compile();
