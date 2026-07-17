# Agent Tools: Source Code

## Why it exists
Custom class implementations for tools.

## Responsibility
Connects agents directly to Qdrant databases, TimescaleDB, or IoT gateways.

## What classes/files belong here
- QdrantSearchTool.ts (scans SOP files matching context queries)
- DbAccessTool.ts (queries database info)
- IotSignageControllerTool.ts (updates physical signs in sectors)
