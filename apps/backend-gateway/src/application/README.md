# Backend Gateway: Application Layer

## Why it exists
Contains use cases and ports (interfaces) mapping user inputs to business operations.

## Responsibility
Implements authentication logic, checks user scopes, validates API key freshness, and manages user sessions.

## What classes/files belong here
- AuthenticateUserUseCase (validates OAuth assertions and signs JWTs)
- ValidateTokenUseCase (verifies session tokens)
- GatewayPorts (defines outbound interfaces for token caching / databases)
