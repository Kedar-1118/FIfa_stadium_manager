# Backend Gateway

## Why it exists
The primary ingress point for external clients (fans, volunteers, and command dashboards).

## Responsibility
API authentication, rate-limiting, gRPC/HTTP proxying, request sanitation, and TLS termination.

## What classes/files belong here
- main.go (gateway server entry point)
- Dockerfile (production packaging definition)
- config.yaml (routing mappings and rate limit settings)
