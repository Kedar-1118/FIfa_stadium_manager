# Command Center: Zustand Store

## Why it exists
Global reactive cache optimized for high-frequency coordinate changes.

## Responsibility
Avoids react re-renders on every telemetry tick by updating canvas references directly.

## What classes/files belong here
- useTwinStore.ts (holds current gate wait times and volunteer coordinates)
- useAlertStore.ts (manages queue alerts and operator notices)
