# StadiumOS AI — Port to TypeScript & Express NodeJS

We have successfully ported the complete **stadium-gateway** backend from Python/FastAPI to **TypeScript NodeJS (Express, Prisma ORM, Zod, ioredis, Pino, Jest)**. The codebase preserves the Clean Architecture directory layout and domain rule boundaries 1-to-1.

---

## 1. Directory Registry & Clean Architecture

The ported gateway structure:

```
apps/backend-gateway/
├── prisma/
│   └── schema.prisma          # Database DDL models, keys, and cascades (Prisma ORM)
├── package.json               # NodeJS dependencies & scripts
├── tsconfig.json              # TS target and paths configuration
├── Dockerfile                 # Multi-stage compile configuration
├── docker-compose.yml         # Dev orchestration
├── src/
│   ├── config.ts              # Zod settings validator (fails fast on config issues)
│   ├── server.ts              # Server bootstrap and WS mounting
│   ├── domain/                # Enterprise business rules
│   │   ├── enums.ts           # Capitalized categorical enums
│   │   ├── exceptions.ts      # Custom error classes (mapped 1-to-1)
│   │   ├── valueObjects.ts    # Coordinates, capacity warnings
│   │   └── entities/          # Pure entity classes (User, Gate, Volunteer, etc.)
│   ├── application/           # ports, schemas, services
│   │   ├── ports/             # IUserRepository, IIncidentRepository interfaces
│   │   ├── schemas/           # Zod body validation DTO schemas
│   │   └── services/          # AuthService, IncidentService, GateService, etc.
│   ├── infrastructure/        # Framework adapters
│   │   ├── database/          # PrismaClient client singleton
│   │   ├── cache/             # ioredis connection pool and CacheService methods
│   │   ├── logging/           # Pino structured JSON logger config
│   │   ├── repositories/      # PrismaUserRepository, PrismaIncidentRepository, etc.
│   │   └── security/          # jwt_handler, bcrypt verification, and RBAC guards
│   └── interfaces/            # API Delivery & Middlewares
│       ├── api/v1/            # Express versioned routers
│       └── middleware/        # requestLogging, errorHandler, rateLimiter
```

---

## 2. Ported Technology Map

| Python FastAPI Gateway | TypeScript NodeJS Port | Description |
| :--- | :--- | :--- |
| **SQLAlchemy + SQLModel** | **Prisma ORM** | Highly-typed model declarations with auto-generated clients. |
| **Alembic** | **Prisma Migrations** | Schema syncs via auto-generated database migration scripts. |
| **Pydantic Settings & Base** | **Zod** | Run-time body parsing validations and schema parsing. |
| **redis.asyncio** | **ioredis** | Connection pools supporting geospatial search and Redis geo indexes. |
| **structlog** | **Pino Logger** | High-performance JSON logging lines tracking correlation IDs. |
| **jose** | **jsonwebtoken** | Token signatures checks for accesses and refreshes. |
| **slowapi** | **express-rate-limit** | Custom rate limiting endpoints using Redis stores. |
| **pytest + httpx** | **Jest + Supertest** | Clean test validations of routes, schemas, and guards. |

---

## 3. Quick-Start Orchestration & Migrations

### 1. Run database migrations
Ensure your local PostgreSQL database is up, and trigger Prisma to create tables:
```bash
cd apps/backend-gateway
# Initialize Prisma Client and sync migrations
npx prisma migrate dev --name init
```

### 2. Boot the development servers
To start the hot-reloaded development stack (database, cache, gateway API, and agent mesh):
```bash
docker compose up -d --build
```
Once up:
* **NodeJS Gateway API**: [http://localhost:8000](http://localhost:8000)
* **Agent Mesh Routing health check**: [http://localhost:8001/health](http://localhost:8001/health)
* **Interactive Prisma Database Viewer**: `npx prisma studio` (launches database dashboard locally)
