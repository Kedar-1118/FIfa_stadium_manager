/**
 * StadiumOS AI — Agent Mesh REST API Server.
 * 
 * Exposes Express endpoints for executing LangGraph multi-agent reasoning graphs.
 */

import express, { Request, Response } from "express";
import cors from "cors";
import { config } from "./config";
import { orchestratorGraph } from "./graphs/orchestrator";
import { toolService } from "./services/toolService";
import { StadiumOSGraphState } from "./state/graphState";

const app = express();

app.use(cors());
app.use(express.json());

// Readiness probe for orchestration mesh
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "healthy", service: config.appName });
});

/**
 * Execute Multi-Agent Graph reasoning.
 * 
 * Receives the incident context, fetches the latest digital twin state,
 * runs the LangGraph supervisor-specialist pipeline, and returns the final recommendations.
 */
app.post("/api/v1/agents/reason", async (req: Request, res: Response) => {
  const { incident_id, stadium_id, incident_type, severity, description } = req.body;

  if (!incident_id || !stadium_id || !incident_type || !severity) {
    return res.status(400).json({
      success: false,
      error: "Missing required parameters: incident_id, stadium_id, incident_type, severity."
    });
  }

  console.log(`Executing reasoning graph for incident ${incident_id} at stadium ${stadium_id}`);

  try {
    // 1. Fetch current Digital Twin State telemetry snapshot
    const twinSnapshot = await toolService.getDigitalTwinState(stadium_id);

    // 2. Initialize Graph State
    const initialState: StadiumOSGraphState = {
      incident_id,
      stadium_id,
      telemetry_alert: {
        source: "CCTV_TURNSTILE_ANALYTICS",
        severity: severity.toLowerCase(),
        description: description || `Incident reported: ${incident_type}`,
        timestamp: new Date().toISOString()
      },
      digital_twin_snapshot: twinSnapshot,
      agent_analyses: {
        crowd: "",
        transport: "",
        security: "",
        volunteer: ""
      },
      proposed_recommendations: [],
      execution_log: [`Reasoning triggered. Incident type: ${incident_type}`]
    };

    // 3. Invoke Compiled LangGraph Orchestrator Graph
    const finalState = await orchestratorGraph.invoke(initialState, {
      recursionLimit: 25 // Prevent infinite supervisor routing loops
    });

    console.log(`Reasoning completed. Generated ${finalState.proposed_recommendations.length} recommendations.`);

    return res.status(200).json({
      success: true,
      incident_id,
      analyses: finalState.agent_analyses,
      recommendations: finalState.proposed_recommendations,
      logs: finalState.execution_log
    });
  } catch (err: any) {
    console.error("Error executing agent reasoning graph:", err.message);
    return res.status(500).json({
      success: false,
      error: "Orchestration graph execution failed.",
      details: err.message
    });
  }
});

// Start Express server
const server = app.listen(config.port, () => {
  console.log(`${config.appName} v${config.appVersion} running on port ${config.port}`);
});

export default server;
