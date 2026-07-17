# Agent Mesh: Services Layer

## Why it exists
Internal clients wrapping cognitive API endpoints and data stores.

## Responsibility
Queries LLM routers, pulls vectors from Qdrant, reads Redis twin data, and schedules push notifications.

## What classes/files belong here
- LLMClient.ts (connects edge vLLM/Gemini APIs)
- QdrantSearchClient.ts (performs vector semantic lookups)
- NotificationService.ts (posts commands back to Kafka)
