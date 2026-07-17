# StadiumOS AI — Single EC2 Instance Deployment Guide

This guide details step-by-step instructions to deploy the entire StadiumOS AI monorepo (API gateway, LangGraph agent mesh, and React command center web dashboard) on a single **AWS EC2 Instance** (Ubuntu 22.04 LTS recommended, `t3.medium` or larger to handle LLM orchestrations).

---

## 1. AWS EC2 Security Groups Setup

Configure your EC2 instance's security group to permit incoming connections on these ports:

| Protocol | Port Range | Source | Purpose |
| :--- | :--- | :--- | :--- |
| **TCP** | `22` | My IP | SSH access secure keys management. |
| **TCP** | `80` | `0.0.0.0/0` | HTTP traffic (Dashboard client). |
| **TCP** | `443` | `0.0.0.0/0` | HTTPS traffic (SSL encrypted). |

---

## 2. Docker & Compose Installation on Ubuntu EC2

SSH into your EC2 instance and execute the following installation commands:

```bash
# Update package repositories
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Set up the repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine & Compose
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Allow running docker commands without sudo
sudo usermod -aG docker $USER
newgrp docker
```

---

## 3. Production Environment Checklist (`.env`)

Create a `.env` file in the project root on your EC2 instance:

```env
NODE_ENV=production
APP_NAME=StadiumOS-AI

# Core API Gateway DB & Cache configurations
DATABASE_URL=postgresql://stadiumos:stadiumos_secret@postgres:5432/stadiumos_db?schema=public
REDIS_URL=redis://redis:6379/0

# Production JWT Secret Keys (Must change from dev fallbacks!)
JWT_SECRET_KEY=stadiumos_super_secure_prod_jwt_secret_key_minimum_32_chars
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# Agent Mesh Communication Handshake credentials
AGENT_MESH_URL=http://agent-mesh:8001
INTERNAL_SERVICE_KEY=gateway-agent-secret-handshake

# LLM Providers Keys (Replace with your keys)
LLM_PROVIDER=google
GEMINI_API_KEY=AIzaSyYourGeminiKeyHere
OPENAI_API_KEY=sk-proj-YourOpenAIPriorityKeyHere
```

---

## 4. Production Docker Compose (`docker-compose.prod.yml`)

Create `docker-compose.prod.yml` in the project root to orchestrate all services on a single internal docker network:

```yaml
version: '3.8'

services:
  # 1. PostgreSQL Database Instance
  postgres:
    image: postgres:15-alpine
    container_name: stadiumos-postgres-prod
    restart: unless-stopped
    environment:
      POSTGRES_USER: stadiumos
      POSTGRES_PASSWORD: stadiumos_secret
      POSTGRES_DB: stadiumos_db
    volumes:
      - postgres_prod_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U stadiumos -d stadiumos_db"]
      interval: 5s
      timeout: 5s
      retries: 5

  # 2. Redis Telemetry Cache
  redis:
    image: redis:7-alpine
    container_name: stadiumos-redis-prod
    restart: unless-stopped
    command: redis-server --save 60 1 --loglevel warning
    volumes:
      - redis_prod_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  # 3. Node Express API Gateway Service
  api:
    build:
      context: ./apps/backend-gateway
      dockerfile: Dockerfile
    container_name: stadiumos-api-prod
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://stadiumos:stadiumos_secret@postgres:5432/stadiumos_db?schema=public
      REDIS_URL: redis://redis:6379/0
      PORT: 8000
      JWT_SECRET_KEY: stadiumos_super_secure_prod_jwt_secret_key_minimum_32_chars
      AGENT_MESH_URL: http://agent-mesh:8001
      INTERNAL_SERVICE_KEY: gateway-agent-secret-handshake
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  # 4. LangGraph Agent Mesh Service
  agent-mesh:
    build:
      context: ./apps/agent-mesh
      dockerfile: Dockerfile
    container_name: stadiumos-agent-mesh-prod
    restart: unless-stopped
    environment:
      PORT: 8001
      BACKEND_API_URL: http://api:8000/api/v1
      INTERNAL_SERVICE_KEY: gateway-agent-secret-handshake
      LLM_PROVIDER: google
      GEMINI_API_KEY: AIzaSyYourGeminiKeyHere
    depends_on:
      redis:
        condition: service_healthy

  # 5. React Web Dashboard (Served via Nginx Natively)
  command-center:
    build:
      context: ./apps/command-center
      dockerfile: Dockerfile
    container_name: stadiumos-command-center-prod
    restart: unless-stopped
    ports:
      - "80:80" # Expose public HTTP port directly
    depends_on:
      - api

volumes:
  postgres_prod_data:
  redis_prod_data:
```

---

## 5. Booting the Application

Run the docker-compose deployment script:

```bash
# Sync prisma migrations on postgres container context before starting
docker compose -f docker-compose.prod.yml run --rm api npx prisma migrate deploy

# Build and start all platform services in the background
docker compose -f docker-compose.prod.yml up -d --build
```

Your system is now live!
- **Command Center Dashboard**: Access it via `http://<your-ec2-public-ip>`
- **API Gateway Docs**: Access it via `http://<your-ec2-public-ip>:8000/docs`
