# StadiumOS AI — Unified Monorepo Platform Walkthrough

We have successfully designed and built the complete **StadiumOS AI** monorepo workspace for FIFA World Cup 2026 stadium operations, consisting of three independent, decoupled microservices.

---

## 1. Unified Monorepo Architecture

```
stadiumos-dir/
├── apps/
│   ├── backend-gateway/         # TS Express API Gateway
│   │   ├── prisma/              # schema.prisma DDL models (Prisma ORM)
│   │   ├── src/                 # Controllers, services, and middlewares
│   │   └── Dockerfile
│   │
│   ├── agent-mesh/              # TS LangGraph AI Orchestrator
│   │   ├── src/                 # Operations, Crowd, Security, Transport, and Volunteer agent nodes
│   │   └── Dockerfile
│   │
│   └── command-center/          # React Vite Tailwind Web Dashboard
│       ├── src/
│       │   ├── store/uiStore.ts # Zustand UI preferences store
│       │   ├── services/api.ts  # Axios client configuration
│       │   ├── components/      # Accessible layouts & ProtectedRoutes
│       │   └── pages/           # Login, Overview, DigitalTwinMap, IncidentTriage, GateControls, VolunteerRegistry
│       └── Dockerfile
│
└── apps/backend-gateway/docker-compose.yml # Main orchestration compose file
```

---

## 2. Platform Component Highlights

### 2.1 Web Dashboard (React, Vite, Tailwind, Shadcn UI)
- **Real-Time Digital Twin Map (`DigitalTwinMap.tsx`)**: Integrates vectors detailing stadium sector polygon overlays. Connects to the **AI Decision Support Sidebar** to stream LangGraph agent recommendations, evaluate RCS confidence scores, and authorize gate status overrides directly.
- **Incident Triage Board (`IncidentTriage.tsx`)**: Visualizes reported alerts. Features detailed inspectors sidebars querying nearby volunteer matching tables (`/volunteers/search/nearby`) and coordinates dispatches.
- **Evacuation Override Modal (`Overview.tsx`)**: Implements confirm-action gates forcing operators to type `EVACUATE` to authorize emergency evacuations.
- **WCAG AA Accessibility**: Implements full keyboard navigation tabIndex tags, focus rings, semantic layouts, and HSL style configurations for dark mode swaps.

### 2.2 Express API Gateway (TypeScript Node)
- **Database Persistence**: Employs Prisma Client singletons querying PostgreSQL.
- **Telemetry Cache**: ioredis pooling geo spatial searches (`geoadd`/`georadius`) mapping volunteers.
- **WebSockets Manager**: Real-time broadcasts upgrade router at `/ws?token=...` notifying client displays.
- **Middlewares**: Custom request correlation IDs, distributed rate limiting, and global error mappings.

### 2.3 Agent Mesh Orchestrator (TypeScript LangGraph)
- **Supervisor Routing**: Orchestrates reasoning cycles. Routing conditional links map to specialists:
  - **Crowd Agent**: Ingress bottlenecks.
  - **Transport Agent**: Transit scheduling & gate operations.
  - **Security Agent**: Threat triaging.
  - **Volunteer Agent**: Geolocation allocations.
- **Mock Failover Adapters**: Integrates `SandboxMockLLM` and offline RAG SOP pages, ensuring local execution stability without API key blocks.

---

## 3. Launching the Platform

### 1. Database migrations
Sync your PostgreSQL schema using Prisma:
```bash
cd apps/backend-gateway
npx prisma migrate dev --name init
```

### 2. Boot all services
Run the docker-compose orchestrator from `apps/backend-gateway`:
```bash
docker compose up -d --build
```
Once booted, the following services are live:
- **React Command Center Dashboard**: [http://localhost:3000](http://localhost:3000) (Login: use registered operator accounts)
- **NodeJS Gateway API**: [http://localhost:8000](http://localhost:8000) (API Docs: `/docs`)
- **Agent Mesh Health probe**: [http://localhost:8001/health](http://localhost:8001/health)
