# Backend Gateway: Infrastructure Layer

## Why it exists
Houses the physical drivers, databases, and frameworks used to support the application layer.

## Responsibility
Provides database clients, JWT verifiers, Redis rate-limiting, and dependency injection configs.

## What classes/files belong here
- JWTTokenVerifier (implements the application token validation port)
- RedisRateLimiterRepository (persistence implementation for limit rates)
- di_container.go (dependency injection configuration wiring repositories into use cases)
