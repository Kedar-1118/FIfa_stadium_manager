# Twin State Manager: Application Layer

## Why it exists
Orchestrates updates to the Digital Twin and evaluates threshold alerts.

## Responsibility
Consumes sensor inputs, updates coordinates, computes running average wait times, and triggers anomaly detection pipelines.

## What classes/files belong here
- UpdateGateStateUseCase (updates flow rates and detects congestion patterns)
- EvaluateAnomalyUseCase (triggers alerts when thresholds are violated)
- TwinStatePorts (defines database and cache interfaces)
