"""
StadiumOS AI — Test Suite Package.

Test directory structure mirrors the src/ layout:
    tests/
    ├── conftest.py           # Shared fixtures (test DB, client, auth helpers)
    ├── test_auth.py          # Auth endpoint tests
    ├── test_stadiums.py      # Stadium CRUD tests
    ├── test_gates.py         # Gate management tests
    ├── test_volunteers.py    # Volunteer management tests
    ├── test_incidents.py     # Incident lifecycle tests
    ├── test_crowd.py         # Crowd telemetry read model tests
    └── test_agents.py        # Agent recommendation approval tests

Testing Strategy:
    - Unit tests use in-memory SQLite (via aiosqlite) for speed.
    - Integration tests use a real PostgreSQL container (via docker compose).
    - All tests use httpx.AsyncClient with the FastAPI TestClient.
    - Fixtures provide pre-authenticated users with specific RBAC roles.
"""
