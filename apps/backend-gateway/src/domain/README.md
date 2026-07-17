# Backend Gateway: Domain Layer

## Why it exists
Represents the core business entities and rules of the gateway domain, adhering to Clean Architecture principles.

## Responsibility
Defines critical business schemas, security scopes, and enterprise models, free from any framework/database dependencies.

## What classes/files belong here
- User / Role (user identities and security levels)
- TokenClaim (security credentials parsed from requests)
- RateLimitRule (business invariants regarding ingress throttling)
