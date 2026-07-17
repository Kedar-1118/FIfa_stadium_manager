# Twin State Manager: Infrastructure Layer

## Why it exists
Implementation of external technology drivers (Kafka, Redis, TimescaleDB).

## Responsibility
Consumes partition streams, writes live states to Redis GEO hashes, and archives timeseries telemetry.

## What classes/files belong here
- KafkaConsumer (subscribes to telemetry topics)
- RedisStateRepository (updates live cache and geo indexes)
- TimescaleDBRepository (saves historical metric records)
- di_container.go (infrastructure wiring code)
