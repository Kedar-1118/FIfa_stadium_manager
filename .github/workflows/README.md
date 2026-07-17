# GitHub CI/CD Workflows

## Why it exists
Automates testing, security scanning, image compilation, and deployment pipelines.

## Responsibility
Triggers integration tests, evaluates agent graph compliance using Ragas, compiles Docker images, and syncs Kubernetes Helm charts.

## What classes/files belong here
- ci-backend.yml (Go tests, formatting, linting)
- ci-agents.yml (TypeScript linting, agent simulation runs)
- cd-kubernetes.yml (ArgoCD webhook or Helm deployments)
