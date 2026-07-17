# Digital Twin State Manager

## Why it exists
High-performance Go worker processing streaming IoT data to maintain the real-time Digital Twin state.

## Responsibility
Consumes turnstile counters, CCTV analytics, and transit updates from Kafka, updates the active Redis cache, and logs events.

## What classes/files belong here
- main.go (worker entry point)
- Dockerfile (container specification)
