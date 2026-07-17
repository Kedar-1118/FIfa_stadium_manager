/**
 * StadiumOS AI — Agent Mesh Settings Configuration.
 * 
 * Centralizes config variable parsing from environmental parameters.
 */

import dotenv from "dotenv";
import path from "path";

// Load environment variables from root or local .env file
dotenv.config({ path: path.resolve(__dirname, "../.env") });

export const config = {
  appName: process.env.APP_NAME || "StadiumOS Agent Mesh",
  appVersion: "1.0.0",
  port: parseInt(process.env.PORT || "8001", 10),
  
  // URL to invoke database operations inside backend-gateway
  backendApiUrl: process.env.BACKEND_API_URL || "http://localhost:8000/api/v1",
  
  // Vector DB settings
  qdrantUrl: process.env.QDRANT_URL || "http://localhost:6333",
  
  // LLM keys
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  
  // Selected LLM Provider: 'google' or 'openai'
  llmProvider: (process.env.LLM_PROVIDER || "google").toLowerCase() as "google" | "openai"
};

// Validate that at least one API key is present for reasoning
if (!config.geminiApiKey && !config.openaiApiKey) {
  console.warn(
    "WARNING: Neither GEMINI_API_KEY nor OPENAI_API_KEY is configured. " +
    "Agent execution will fail unless edge vLLM models or mock providers are set."
  );
}
