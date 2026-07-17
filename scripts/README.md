# Utilities and Scripts

## Why it exists
Seeding, setup, migration, and diagnostic scripts.

## Responsibility
Runs database setup, builds synthetic event data, and measures microservice performance.

## What classes/files belong here
- db_migration.sql (seeding database schema updates)
- seed_data.py (inserts initial sectors and gate coordinates)
- simulate_load.sh (emits synthetic Kafka events)
