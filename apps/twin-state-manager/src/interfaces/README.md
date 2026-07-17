# Twin State Manager: Interfaces Layer

## Why it exists
Binds incoming event sources directly to use cases.

## Responsibility
Maps raw byte strings from Kafka payloads into application DTOs and handles broker-specific error policies.

## What classes/files belong here
- KafkaEventController (parses telemetry and triggers updates)
- HealthCheckHandler (local endpoint for container status)
