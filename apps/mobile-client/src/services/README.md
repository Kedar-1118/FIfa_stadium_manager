# Mobile Client: Network Services

## Why it exists
Manages backend integrations, GPS feeds, and offline synchronization.

## Responsibility
Listens to local GPS sensors, posts rest events, and handles disconnected tasks.

## What classes/files belong here
- ApiGatewayClient.ts (REST integration for core gateway queries)
- LocationTracker.ts (tracks volunteer coordinates)
- OfflineSyncManager.ts (stores logs locally until connectivity resumes)
