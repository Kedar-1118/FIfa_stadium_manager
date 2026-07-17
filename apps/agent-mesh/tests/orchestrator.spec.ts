/**
 * StadiumOS AI — Agent Mesh LangGraph Routing Integration tests.
 * 
 * Invokes the state orchestrator and asserts specialist node execution traces
 * and recommendation formatting.
 */

import { jest } from "@jest/globals";
import { compileGraph } from "../src/graphs/orchestrator";

// Mock out the LLM provider to bypass Google/OpenAI live API keys requirements
jest.mock("../src/services/llmProvider", () => {
  return {
    generateJSON: jest.fn(async (prompt: string) => {
      // Mocked operations planner response matching schemas
      return {
        agent_name: "Crowd Specialist Agent",
        action_type: "OPEN_GATE",
        target_entity_id: "gate-3a-uuid",
        description: "Open Gate 3A to relieve ingress bottleneck in North tribune.",
        confidence_score: 0.94,
        routing_target: "FINISH"
      };
    })
  };
});

// Mock tool service to prevent external gateway requests
jest.mock("../src/services/toolService", () => {
  return {
    toolService: {
      getGates: jest.fn(async () => []),
      getVolunteersNear: jest.fn(async () => []),
      getSectors: jest.fn(async () => [])
    }
  };
});

describe("AI Agent Mesh - Graph Routing Orchestrator Tests", () => {
  it("should compile and execute state graphs routing crowd bottleneck alerts", async () => {
    const graph = compileGraph();

    const initialState = {
      incident_id: "inc-12345",
      stadium_id: "stad-9999",
      incident_type: "CROWD_BOTTLENECK",
      severity: "HIGH",
      description: "Severe crowd congestion building up at Sector 3 entry turnstiles.",
      // Graph state properties
      agent_analyses: {},
      proposed_recommendations: [],
      execution_path: []
    };

    // Invoke compiled LangGraph instance
    const finalState = await graph.invoke(initialState);

    expect(finalState).toBeDefined();
    expect(finalState.execution_path).toContain("operationsAgent");
    expect(finalState.proposed_recommendations.length).toBeGreaterThan(0);
    
    const recommendation = finalState.proposed_recommendations[0];
    expect(recommendation.action_type).toBe("OPEN_GATE");
    expect(recommendation.confidence_score).toBe(0.94);
    expect(recommendation.description).toContain("Gate 3A");
  });
});
