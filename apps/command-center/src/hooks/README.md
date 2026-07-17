# Command Center: React Hooks

## Why it exists
Provides reactive hooks separating visual controls from raw socket state.

## Responsibility
Handles telemetry loops, parses incoming incident states, and manages custom themes.

## What classes/files belong here
- useWebSocket.ts (syncs state updates dynamically)
- useTelemetry.ts (hooks components to stream changes)
- useIncidents.ts (fetches active security incidents)
