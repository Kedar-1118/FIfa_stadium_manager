# Backend Gateway: Interfaces Layer

## Why it exists
Converts external protocols (HTTP/gRPC/WebSocket) into application actions.

## Responsibility
Exposes REST controllers, decodes payloads, validates syntax, maps exceptions, and sets custom headers.

## What classes/files belong here
- AuthController (REST endpoint for logins/session starts)
- GatewayHandler (HTTP request dispatcher)
- LoggingMiddleware (auditing and diagnostic logging filters)
