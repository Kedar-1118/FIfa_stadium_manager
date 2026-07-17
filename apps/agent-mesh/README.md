# Agent Mesh Server

## Why it exists
TypeScript/LangGraph container running the core stadium orchestration agents.

## Responsibility
Coordinates reasoning processes, handles multi-agent graphs, queries Qdrant vectors, and connects edge/cloud LLM endpoints.

## What classes/files belong here
- server.ts (Express/gRPC endpoint wrapper)
- package.json (npm dependencies like @langchain/langgraph and openai or google-genai SDKs)
- 	sconfig.json (TypeScript build configurations)
